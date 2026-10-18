-- E-NDEGE — schéma initial (Supabase / Postgres). À exécuter dans l'éditeur SQL. Non destructif.
create extension if not exists pgcrypto;
create type app_role as enum ('customer','agent','admin');
create type req_status as enum ('created','awaiting_payment','paid','processing','ticketed','failed','expired','refund_pending','refunded');
create type pay_status as enum ('pending','succeeded','failed','cancelled','expired','refund_requested','refund_pending','refunded');

create table profiles (id uuid primary key references auth.users on delete cascade, full_name text, phone text, role app_role not null default 'customer', created_at timestamptz default now());
create table settings (key text primary key, value jsonb not null);
insert into settings values ('service_fee','{"amount":40,"currency":"USD","per_ticket":true}') on conflict do nothing;
create table bookings (
  id uuid primary key default gen_random_uuid(), reference text unique not null, user_id uuid references profiles(id),
  status req_status not null default 'created', is_demo boolean not null default false, idempotency_key text unique,
  offer jsonb not null, offer_source text, offer_fetched_at timestamptz,
  ticket_price numeric(12,2), service_fee numeric(12,2), payment_fee numeric(12,2) default 0, currency char(3) not null,
  provider_ticket_ref text, created_at timestamptz default now());
create table passengers (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings on delete cascade, first_name text, last_name text, birth_date date, kind text);
create table payments (id uuid primary key default gen_random_uuid(), booking_id uuid references bookings, method text, status pay_status default 'pending', amount numeric(12,2), currency char(3), provider_ref text, recorded_by uuid references profiles(id), created_at timestamptz default now());
create table booking_history (id bigserial primary key, booking_id uuid references bookings on delete cascade, from_status req_status, to_status req_status, actor uuid, at timestamptz default now());
create table audit_log (id bigserial primary key, actor uuid, action text, target text, at timestamptz default now());

create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id=auth.uid() and role in ('agent','admin')) $$;
create function is_admin() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;

alter table profiles enable row level security; alter table settings enable row level security; alter table bookings enable row level security;
alter table passengers enable row level security; alter table payments enable row level security; alter table booking_history enable row level security; alter table audit_log enable row level security;

create policy p_self on profiles for select using (id=auth.uid() or is_staff());
create policy p_upd on profiles for update using (id=auth.uid()) with check (id=auth.uid() and role=(select role from profiles where id=auth.uid()));
create policy s_read on settings for select using (true);
create policy s_admin on settings for all using (is_admin()) with check (is_admin());
create policy b_own on bookings for select using (user_id=auth.uid() or is_staff());
create policy b_ins on bookings for insert with check (user_id=auth.uid() and status='created');
create policy pa_own on passengers for select using (exists(select 1 from bookings b where b.id=booking_id and (b.user_id=auth.uid() or is_staff())));
create policy pa_ins on passengers for insert with check (exists(select 1 from bookings b where b.id=booking_id and b.user_id=auth.uid()));
create policy pay_own on payments for select using (exists(select 1 from bookings b where b.id=booking_id and (b.user_id=auth.uid() or is_staff())));
create policy h_own on booking_history for select using (exists(select 1 from bookings b where b.id=booking_id and (b.user_id=auth.uid() or is_staff())));
create policy a_admin on audit_log for select using (is_admin());
-- Aucune politique update/delete sur bookings/payments : les changements passent par la fonction ci-dessous.

create function change_status(p_booking uuid, p_to req_status) returns void language plpgsql security definer as $$
declare cur req_status; ok boolean;
begin
  if not is_staff() then raise exception 'forbidden'; end if;
  select status into cur from bookings where id=p_booking for update;
  ok := (cur,p_to) in (('created','awaiting_payment'),('created','expired'),('created','failed'),('awaiting_payment','paid'),('awaiting_payment','expired'),('awaiting_payment','failed'),
    ('paid','processing'),('paid','refund_pending'),('processing','ticketed'),('processing','failed'),('processing','refund_pending'),('failed','refund_pending'),('refund_pending','refunded'));
  if not ok then raise exception 'transition interdite'; end if;
  update bookings set status=p_to where id=p_booking;
  insert into booking_history(booking_id,from_status,to_status,actor) values(p_booking,cur,p_to,auth.uid());
  insert into audit_log(actor,action,target) values(auth.uid(),'status:'||p_to,p_booking::text);
end $$;
-- Premier admin : update profiles set role='admin' where id='<uuid>'; (depuis la console, jamais depuis le client)
