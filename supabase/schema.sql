-- Signa — schema MVP (US #22 / Faza 5)
-- Lipeste tot fișierul în SQL Editor (proiect gol sau re-rulare idempotentă).
--
-- Ce stocăm: profil (nume, prenume, username, rol, vizibilitate) + progres (XP, streak, stele, mastery).
-- Ce NU stocăm: parolă (e în auth.users), email duplicat, landmarks, imagini, video, dataset-uri.
-- Parola nu are ce căuta în public.profiles — hash-ul e treaba Supabase Auth.

-- ─── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text,
  display_name text,
  avatar_url text,
  role text not null default 'user',
  visibility text not null default 'public',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists role text,
  add column if not exists visibility text,
  add column if not exists created_at timestamptz;

alter table public.profiles
  alter column role set default 'user',
  alter column visibility set default 'public',
  alter column created_at set default now();

update public.profiles set role = 'user' where role is null;
update public.profiles set visibility = 'public' where visibility is null;

alter table public.profiles
  alter column role set not null,
  alter column visibility set not null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'admin'));

alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check
  check (visibility in ('public', 'private'));

drop index if exists public.profiles_username_lower_idx;
create unique index profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

comment on table public.profiles is
  'Profil 1:1 cu auth.users. Fără parolă, fără email duplicat, fără date biometrice.';

-- ─── progress ───────────────────────────────────────────────────────────────
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0,
  streak int not null default 0,
  last_practice_date date,
  lessons jsonb not null default '{}'::jsonb,
  letter_mastery jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.progress is
  'XP, streak, stele lecții, mastery litere. Privat per user. Niciodată landmarks.';

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "Profilul e vizibil public" on public.profiles;
drop policy if exists "Profil public sau propriu" on public.profiles;
drop policy if exists "Utilizatorul își editează profilul" on public.profiles;
drop policy if exists "Utilizatorul își creează profilul" on public.profiles;
drop policy if exists "Progresul e privat (read own)" on public.progress;
drop policy if exists "Progresul e privat (write own)" on public.progress;
drop policy if exists "Progresul e privat (update own)" on public.progress;

-- Vizibil: profilurile public + propriul rând (inclusiv dacă e private).
create policy "Profil public sau propriu"
  on public.profiles for select
  using (visibility = 'public' or auth.uid() = id);

create policy "Utilizatorul își creează profilul"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Utilizatorul își editează profilul"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Progresul e privat (read own)"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Progresul e privat (write own)"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Progresul e privat (update own)"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Protecție role / id din client ─────────────────────────────────────────
-- Table Editor (rol postgres) poate schimba role. Clientul authenticated nu.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    new.role := old.role;
    new.id := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ─── Username ocupat (trece peste RLS — nu expune altceva) ──────────────────
create or replace function public.username_taken(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where username is not null
      and lower(username) = lower(trim(p_username))
  );
$$;

revoke all on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;

-- ─── Trigger signup: profil + progress gol ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text;
  v_last text;
  v_username text;
  v_display text;
  v_base text;
  v_try text;
  v_n int := 0;
begin
  v_first := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  v_last := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  v_base := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');

  if v_base is null then
    v_base := split_part(new.email, '@', 1);
  end if;

  v_base := lower(regexp_replace(v_base, '[^a-zA-Z0-9._]', '', 'g'));
  if char_length(v_base) < 3 then
    v_base := v_base || 'user';
  end if;
  if char_length(v_base) > 20 then
    v_base := left(v_base, 20);
  end if;

  v_try := v_base;
  while exists (select 1 from public.profiles where lower(username) = v_try) loop
    v_n := v_n + 1;
    v_try := left(v_base, greatest(1, 20 - char_length(v_n::text))) || v_n::text;
    if v_n > 50 then
      v_try := null;
      exit;
    end if;
  end loop;
  v_username := v_try;

  v_display := coalesce(v_first, v_username, split_part(new.email, '@', 1));

  insert into public.profiles (id, first_name, last_name, username, display_name, role, visibility)
  values (new.id, v_first, v_last, v_username, v_display, 'user', 'public')
  on conflict (id) do nothing;

  insert into public.progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Clasament ──────────────────────────────────────────────────────────────
-- security_definer (implicit): expune DOAR id / nume / xp / streak pentru
-- profile public. security_invoker ar aplica RLS pe progress ⇒ anon/alții
-- n-ar vedea XP-ul (progress e privat). Coloanele din view sunt allowlist-ul.
drop view if exists public.leaderboard;
create view public.leaderboard as
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.first_name), ''),
      p.username,
      'Jucător'
    ) as display_name,
    coalesce(pr.xp, 0) as xp,
    coalesce(pr.streak, 0) as streak
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id
  where p.visibility = 'public'
  order by coalesce(pr.xp, 0) desc;

comment on view public.leaderboard is
  'Clasament all-time. Doar profile public. Fără email, fără parolă, fără lessons jsonb.';

grant usage on schema public to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.progress to authenticated;
grant select on public.profiles to anon;

-- Anon citește profilele publice (RLS) ca să poată randa clasamentul;
-- progress rămâne inaccesibil direct (doar prin view-ul definer).
revoke all on public.progress from anon;
revoke delete on public.profiles from anon, authenticated;
revoke delete on public.progress from anon, authenticated;
