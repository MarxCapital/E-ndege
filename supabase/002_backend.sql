-- À exécuter APRÈS 001 (schema.sql renommé ou collé avant). Non destructif.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name') on conflict do nothing; return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
insert into profiles(id) select id from auth.users on conflict do nothing;

create policy a_ins on audit_log for insert with check (is_admin());

create or replace function create_booking(p_trip jsonb,p_pax jsonb,p_key text) returns text language plpgsql security definer set search_path=public as $$
declare f jsonb; n int; ref text; bid uuid; fee numeric; r text; p jsonb;
begin
  if auth.uid() is null then raise exception 'auth'; end if;
  select reference into r from bookings where idempotency_key=p_key and user_id=auth.uid();
  if r is not null then return r; end if;
  if jsonb_array_length(p_pax) not between 1 and 14 then raise exception 'passagers'; end if;
  select value into f from settings where key='service_fee';
  select count(*) into n from jsonb_array_elements(p_pax) x where x->>'kind'<>'infant';
  fee := case when (f->>'per_ticket')::boolean then (f->>'amount')::numeric*n else (f->>'amount')::numeric end;
  ref := 'END-'||upper(substr(md5(gen_random_uuid()::text),1,8));
  insert into bookings(reference,user_id,offer,offer_source,service_fee,currency,idempotency_key)
    values(ref,auth.uid(),p_trip,'demande_client',fee,f->>'currency',p_key) returning id into bid;
  for p in select value from jsonb_array_elements(p_pax) loop
    insert into passengers(booking_id,first_name,last_name,birth_date,kind) values(bid,left(p->>'first_name',80),left(p->>'last_name',80),nullif(p->>'birth_date','')::date,p->>'kind');
  end loop;
  insert into booking_history(booking_id,from_status,to_status,actor) values(bid,null,'created',auth.uid());
  return ref;
end $$;

create or replace function set_quote(p_booking uuid,p_price numeric) returns void language plpgsql security definer set search_path=public as $$
declare st req_status;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if p_price<=0 then raise exception 'prix'; end if;
  select status into st from bookings where id=p_booking;
  if st not in ('created','awaiting_payment') then raise exception 'statut'; end if;
  update bookings set ticket_price=p_price where id=p_booking;
  if st='created' then perform change_status(p_booking,'awaiting_payment'); end if;
  insert into audit_log(actor,action,target) values(auth.uid(),'quote:'||p_price,p_booking::text);
end $$;

create or replace function record_office_payment(p_booking uuid) returns void language plpgsql security definer set search_path=public as $$
declare b bookings;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select * into b from bookings where id=p_booking for update;
  if b.status<>'awaiting_payment' or b.ticket_price is null then raise exception 'statut'; end if;
  insert into payments(booking_id,method,status,amount,currency,recorded_by) values(b.id,'bureau','succeeded',b.ticket_price+coalesce(b.service_fee,0)+coalesce(b.payment_fee,0),b.currency,auth.uid());
  perform change_status(p_booking,'paid');
end $$;

create or replace function mark_ticketed(p_booking uuid,p_ref text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  if length(trim(coalesce(p_ref,'')))<4 then raise exception 'référence fournisseur requise'; end if;
  update bookings set provider_ticket_ref=trim(p_ref) where id=p_booking and status='processing';
  if not found then raise exception 'statut'; end if;
  perform change_status(p_booking,'ticketed');
end $$;

revoke execute on function create_booking,set_quote,record_office_payment,mark_ticketed,change_status from public,anon;
grant execute on function create_booking,set_quote,record_office_payment,mark_ticketed,change_status to authenticated;
