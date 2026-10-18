-- Contenu de la page d'accueil modifiable par l'administrateur. Non destructif.
create table if not exists site_content (key text primary key, value jsonb not null, updated_at timestamptz default now(), updated_by uuid references profiles(id));
alter table site_content enable row level security;
create policy sc_read on site_content for select using (true);
create policy sc_admin on site_content for all using (is_admin()) with check (is_admin());
create or replace function touch_content() returns trigger language plpgsql as $$ begin new.updated_at=now(); new.updated_by=auth.uid(); return new; end $$;
drop trigger if exists sc_touch on site_content;
create trigger sc_touch before insert or update on site_content for each row execute function touch_content();
