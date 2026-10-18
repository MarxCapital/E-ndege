-- Gestion des agents. Les inscriptions publiques créent TOUJOURS des clients (le rôle n'est jamais lu depuis les métadonnées).
alter table profiles add column if not exists email text;
update profiles p set email=u.email from auth.users u where u.id=p.id and p.email is null;
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,full_name,email,role) values(new.id,new.raw_user_meta_data->>'full_name',new.email,'customer') on conflict do nothing; return new; end $$;
create or replace function revoke_agent(p_user uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update profiles set role='customer' where id=p_user and role='agent';
  if not found then raise exception 'not an agent'; end if;
  insert into audit_log(actor,action,target) values(auth.uid(),'agent_revoque',p_user::text);
end $$;
revoke execute on function revoke_agent(uuid) from public,anon;
grant execute on function revoke_agent(uuid) to authenticated;
