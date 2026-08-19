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

select user_id, xp, streak, updated_at
from public.progress;
