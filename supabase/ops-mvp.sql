-- Signa — operațiuni MVP (rulează o dată în SQL Editor, ca owner).
-- NU pune parole aici. NU trimite rezultatul pe chat public.

-- 1) Contul de test revine public (apare în clasament) și e admin.
update public.profiles
set
  visibility = 'public',
  role = 'admin',
  display_name = coalesce(
    nullif(trim(concat_ws(' ', first_name, last_name)), ''),
    username,
    display_name
  )
where lower(username) = 'davidutz';

-- 2) Verificare
select username, first_name, last_name, role, visibility, created_at
from public.profiles
order by created_at;

-- 3) Dataset colaborativ — invită colectori/antrenori (NU le da role=admin).
-- Rulează întâi supabase/dataset-collab.sql (sau schema.sql actualizat).
-- Exemplu: înlocuiește username-urile.

-- insert into public.dataset_members (user_id, can_collect, can_train, granted_by)
-- select p.id, true, false, g.id
-- from public.profiles p
-- cross join public.profiles g
-- where lower(p.username) in ('alice', 'bob')
--   and lower(g.username) = 'davidutz'
-- on conflict (user_id) do update
--   set can_collect = excluded.can_collect,
--       can_train = excluded.can_train,
--       granted_by = excluded.granted_by;
