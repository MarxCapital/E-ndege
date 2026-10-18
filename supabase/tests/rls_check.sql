-- Vérifie comptes, rôles et RLS. À coller dans l'éditeur SQL Supabase.
-- Le résultat s'affiche dans un message d'erreur VOLONTAIRE (tout est annulé, rien n'est conservé).
begin;
create function zz_try(q text) returns boolean language plpgsql as $$ begin execute q; return true; exception when others then return false; end $$;
create function zz_cnt(q text) returns int language plpgsql as $$ declare n int; begin execute q into n; return n; end $$;
create function zz_ok(l text, c boolean) returns text language sql as $$ select case when c then 'OK     ' else 'ECHEC  ' end || l || E'\n' $$;
create function zz_as(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claims', json_build_object('sub',u,'role','authenticated')::text, true); set local role authenticated; end $$;
do $$
declare a uuid:='00000000-0000-0000-0000-0000000000a1'; b uuid:='00000000-0000-0000-0000-0000000000b2'; ag uuid:='00000000-0000-0000-0000-0000000000c3'; ad uuid:='00000000-0000-0000-0000-0000000000d4'; ref text; bid uuid; o text:='';
begin
  insert into auth.users(id,email,aud,role) select x,x::text||'@t.local','authenticated','authenticated' from unnest(array[a,b,ag,ad]) x;
  update profiles set role='agent' where id=ag; update profiles set role='admin' where id=ad;
  o := o || zz_ok('trigger : un profil client est créé à l''inscription', zz_cnt('select count(*) from profiles where role=''customer''')>=2);
  perform zz_as(a); ref := create_booking('{"from":"BJM","to":"NBO","lang":"fr"}','[{"kind":"adult","first_name":"A","last_name":"A"}]','k1'); select id into bid from bookings where reference=ref;
  o := o || zz_ok('client A voit sa demande', zz_cnt('select count(*) from bookings')=1);
  o := o || zz_ok('client A : insertion directe refusée', not zz_try($q$insert into bookings(reference,user_id,offer,currency) values('X','00000000-0000-0000-0000-0000000000a1','{}','USD')$q$));
  o := o || zz_ok('client A : ne peut pas se donner le rôle admin', not zz_try($q$update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1'$q$));
  o := o || zz_ok('client A : change_status refusé', not zz_try(format('select change_status(%L,%L)',bid,'expired')));
  o := o || zz_ok('client A : set_quote refusé', not zz_try(format('select set_quote(%L,1)',bid)));
  perform zz_as(b);
  o := o || zz_ok('client B ne voit ni demande, ni passagers, ni historique, ni profil de A', zz_cnt('select (select count(*) from bookings)+(select count(*) from passengers)+(select count(*) from booking_history)+(select count(*) from profiles where id='''||a||''')')=0);
  perform zz_as(ag);
  o := o || zz_ok('agent voit les demandes', zz_cnt('select count(*) from bookings')>=1);
  o := o || zz_ok('agent : fixe le tarif', zz_try(format('select set_quote(%L,100)',bid)));
  o := o || zz_ok('agent : enregistre le paiement au bureau', zz_try(format('select record_office_payment(%L)',bid)));
  o := o || zz_ok('agent : ne peut pas modifier le contenu du site', not zz_try($q$insert into site_content(key,value) values('t','{}')$q$));
  o := o || zz_ok('agent : ne voit pas le journal d''audit', zz_cnt('select count(*) from audit_log')=0);
  perform zz_as(ad);
  o := o || zz_ok('admin : modifie le contenu du site', zz_try($q$insert into site_content(key,value) values('t','{}')$q$));
  o := o || zz_ok('admin : voit le journal d''audit', zz_cnt('select count(*) from audit_log')>=1);
  perform zz_as(a); o := o || zz_ok('client : revoke_agent refusé', not zz_try(format('select revoke_agent(%L)',ag)));
  perform zz_as(ag); o := o || zz_ok('agent : revoke_agent refusé', not zz_try(format('select revoke_agent(%L)',ag)));
  perform zz_as(ad); o := o || zz_ok('admin : retire les droits d''un agent', zz_try(format('select revoke_agent(%L)',ag)));
  perform zz_as(ag); o := o || zz_ok('ancien agent : ne voit plus les demandes des autres', zz_cnt('select count(*) from bookings')=0);
  set local role anon;
  o := o || zz_ok('visiteur non connecté : create_booking refusé', not zz_try($q$select create_booking('{}','[]','z')$q$));
  raise exception E'\nRÉSULTATS (volontairement en erreur, tout est annulé) :\n%', o;
end $$;
