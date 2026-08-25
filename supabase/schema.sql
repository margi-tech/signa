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
  with check (auth.uid() = id and role = 'user');

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

-- Câmpurile care alimentează clasamentul se schimbă numai din funcția
-- `record_lesson_completion`, nu din payload-uri construite în browser.
create or replace function public.protect_progress_scores()
returns trigger
language plpgsql
as $$
begin
  if current_setting('signa.server_progress', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.xp := 0;
      new.streak := 0;
      new.last_practice_date := null;
      new.lessons := '{}'::jsonb;
    else
      new.xp := old.xp;
      new.streak := old.streak;
      new.last_practice_date := old.last_practice_date;
      new.lessons := old.lessons;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_progress_scores on public.progress;
create trigger protect_progress_scores
  before insert or update on public.progress
  for each row execute function public.protect_progress_scores();

create table if not exists public.lesson_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  practice_date date not null default current_date,
  stars int not null check (stars between 0 and 3),
  xp_awarded int not null check (xp_awarded >= 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id, practice_date)
);

alter table public.lesson_completions enable row level security;

drop policy if exists "Completările sunt private" on public.lesson_completions;
create policy "Completările sunt private"
  on public.lesson_completions for select
  using (auth.uid() = user_id);

revoke all on public.lesson_completions from anon, authenticated;
grant select on public.lesson_completions to authenticated;

create or replace function public.record_lesson_completion(
  p_lesson_id text,
  p_stars int,
  p_xp int
)
returns public.progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_max_xp int;
  v_award int := 0;
  v_exists boolean;
  v_old_stars int := 0;
  v_result public.progress;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_stars not between 0 and 3 then
    raise exception 'Invalid stars';
  end if;

  v_max_xp := case p_lesson_id
    when '1.1' then 60 when '1.2' then 60 when '1.3' then 60
    when '1.4' then 60 when '1.5' then 60 when '2.1' then 70
    when '3.1' then 110 when '3.2' then 110 when '3.3' then 40
    when '4.1' then 60 when '4.2' then 60
    when '5.1' then 60 when '5.2' then 70 when '6.1' then 60
    when '7.1' then 60 when '8.1' then 60 when '8.2' then 60
    when 'review' then 90
    else null
  end;
  if v_max_xp is null or p_xp < 0 or p_xp > v_max_xp then
    raise exception 'Invalid lesson reward';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':' || p_lesson_id || ':' || current_date::text, 0)
  );

  select exists (
    select 1 from public.lesson_completions
    where user_id = v_user_id
      and lesson_id = p_lesson_id
      and practice_date = current_date
  ) into v_exists;

  if not v_exists then
    v_award := p_xp;
    insert into public.lesson_completions (
      user_id, lesson_id, practice_date, stars, xp_awarded
    ) values (
      v_user_id, p_lesson_id, current_date, p_stars, v_award
    );
  else
    update public.lesson_completions
    set stars = greatest(stars, p_stars), completed_at = now()
    where user_id = v_user_id
      and lesson_id = p_lesson_id
      and practice_date = current_date;
  end if;

  perform set_config('signa.server_progress', 'on', true);
  insert into public.progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select coalesce((lessons -> p_lesson_id ->> 'stars')::int, 0)
  into v_old_stars
  from public.progress
  where user_id = v_user_id;

  update public.progress
  set
    xp = xp + v_award,
    streak = case
      when last_practice_date = current_date then streak
      when last_practice_date = current_date - 1 then streak + 1
      else 1
    end,
    last_practice_date = current_date,
    lessons = jsonb_set(
      lessons,
      array[p_lesson_id],
      jsonb_build_object(
        'stars', greatest(v_old_stars, p_stars),
        'completedAt', now(),
        'lastAwardDate', current_date
      ),
      true
    ),
    updated_at = now()
  where user_id = v_user_id
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.record_lesson_completion(text, int, int) from public;
grant execute on function public.record_lesson_completion(text, int, int) to authenticated;

-- ─── Protecție role / id din client ─────────────────────────────────────────
-- Table Editor (rol postgres) poate schimba role. Clientul authenticated nu.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.id := auth.uid();
    else
      new.role := old.role;
      new.id := old.id;
    end if;
    if new.avatar_url is not null and new.avatar_url !~ (
      '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/'
      || new.id::text
      || '/avatar\.(jpg|png|webp)(\?v=[0-9]+)?$'
    ) then
      raise exception 'Invalid avatar URL';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
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

-- Profilul complet (nume real + rol) este disponibil numai proprietarului.
-- Tabela `profiles` nu mai este citibilă direct din client.
create or replace function public.get_own_profile()
returns setof public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.profiles
  where id = auth.uid();
$$;

revoke all on function public.get_own_profile() from public;
grant execute on function public.get_own_profile() to authenticated;

create or replace function public.profile_is_public(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and visibility = 'public'
  );
$$;

revoke all on function public.profile_is_public(uuid) from public;
grant execute on function public.profile_is_public(uuid) to authenticated;

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
create view public.leaderboard with (security_invoker = false) as
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
grant select, insert on public.progress to authenticated;
revoke update on public.progress from authenticated;
grant update (user_id, letter_mastery, updated_at)
  on public.progress to authenticated;

-- Profilurile publice se citesc numai prin view-urile cu allowlist de coloane.
-- Profilul complet propriu se citește prin `get_own_profile()`.
revoke all on public.profiles from anon, authenticated;
grant select (id) on public.profiles to authenticated;
grant update (
  first_name, last_name, username, display_name, avatar_url, visibility
) on public.profiles to authenticated;

-- Anon vede doar view-urile publice; progress rămâne inaccesibil direct.
revoke all on public.progress from anon;
revoke delete on public.progress from anon, authenticated;

-- ─── social: follows / prieteni ─────────────────────────────────────────────
-- Prietenia nu se stochează: e derivată din urmăriri reciproce (view-ul
-- `friendships`). Așa nu există stare de „cerere în așteptare" de întreținut.

create table if not exists public.follows (
  id bigserial primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_following on public.follows(following_id);

alter table public.follows enable row level security;

drop policy if exists "Toți pot vedea urmăririle" on public.follows;
drop policy if exists "Relații proprii sau între profile publice" on public.follows;
create policy "Relații proprii sau între profile publice"
  on public.follows for select
  using (
    auth.uid() = follower_id
    or auth.uid() = following_id
    or (
      public.profile_is_public(follower_id)
      and public.profile_is_public(following_id)
    )
  );

drop policy if exists "Urmărești doar în numele tău" on public.follows;
create policy "Urmărești doar în numele tău"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and public.profile_is_public(following_id)
  );

drop policy if exists "Anulezi doar propria urmărire" on public.follows;
create policy "Anulezi doar propria urmărire"
  on public.follows for delete using (auth.uid() = follower_id);

-- Directorul public de utilizatori — pentru căutare și listele de prieteni.
-- Filtrează pe `visibility`, la fel ca `leaderboard`: un profil privat nu apare
-- în căutare. Fără email, fără nume real, fără date de progres în afară de streak.
drop view if exists public.user_directory;
create view public.user_directory with (security_invoker = false) as
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.first_name), ''),
      p.username,
      'Jucător'
    ) as display_name,
    p.avatar_url,
    p.created_at,
    coalesce(pr.streak, 0) as streak
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id
  where p.visibility = 'public';

comment on view public.user_directory is
  'Director public pentru căutare/prieteni. Doar profile publice.';

-- Prietenie = urmărire reciprocă. Perechea e normalizată (least/greatest),
-- deci fiecare relație apare o singură dată, nu de două ori.
drop view if exists public.friendships;
create view public.friendships with (security_invoker = false) as
  select
    least(f1.follower_id, f1.following_id)    as user_id_1,
    greatest(f1.follower_id, f1.following_id) as user_id_2,
    min(f1.created_at)                        as since
  from public.follows f1
  join public.follows f2
    on f1.follower_id = f2.following_id
   and f1.following_id = f2.follower_id
  join public.profiles p1 on p1.id = f1.follower_id
  join public.profiles p2 on p2.id = f1.following_id
  where
    auth.uid() in (f1.follower_id, f1.following_id)
    or (p1.visibility = 'public' and p2.visibility = 'public')
  group by 1, 2;

comment on view public.friendships is
  'Prietenii = urmăriri reciproce. Derivat, nu stocat.';

grant select on public.user_directory to anon, authenticated;
grant select on public.friendships to authenticated;
grant select, insert, delete on public.follows to authenticated;
revoke update on public.follows from anon, authenticated;
-- bigserial își ia id-ul din secvență; fără USAGE, insert-ul pică cu
-- „permission denied for sequence follows_id_seq" deși tabela e permisă.
grant usage, select on sequence public.follows_id_seq to authenticated;

-- Ștergere GDPR: funcția poate șterge exclusiv utilizatorul sesiunii curente.
-- Cascade-urile curăță profile/progress/follows; avatarul se șterge explicit.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = v_user_id::text;

  delete from auth.users where id = v_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
