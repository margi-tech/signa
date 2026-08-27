-- Signa — schema MVP (US #22 / Faza 5)
-- Lipeste tot fișierul în SQL Editor (proiect gol sau re-rulare idempotentă).
--
-- Ce stocăm: profil (nume, prenume, username, rol, vizibilitate) + progres (XP, streak, stele, mastery)
--   + dataset de antrenare ca vectori numerici normalizați (199 / 30×199), fără media.
-- Ce NU stocăm: parolă (e în auth.users), email duplicat, imagini, video, cadre brute de cameră.
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

-- Signa — dataset colaborativ (vectori normalizați, fără imagini/video).
-- Rulează în SQL Editor pe proiectul live DUPĂ schema.sql.
-- Idempotent. Contract: VECTOR_SIZE 199, SEQ_FRAMES 30, normalize v2.

-- ─── Membri (capabilități, nu rol global) ──────────────────────────────────
create table if not exists public.dataset_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_collect boolean not null default false,
  can_train boolean not null default false,
  can_publish boolean not null default false,
  consented_at timestamptz,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.dataset_members enable row level security;

drop policy if exists "Membru își vede rândul" on public.dataset_members;
create policy "Membru își vede rândul"
  on public.dataset_members for select
  using (auth.uid() = user_id);

revoke all on public.dataset_members from anon, authenticated;
grant select on public.dataset_members to authenticated;

-- ─── Loturi ────────────────────────────────────────────────────────────────
create table if not exists public.dataset_batches (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  label text not null,
  kind text not null check (kind in ('static', 'sequence')),
  normalize_version smallint not null default 2,
  samples jsonb not null,
  sample_count int not null,
  client_batch_id text not null,
  created_at timestamptz not null default now(),
  unique (contributor_id, client_batch_id)
);

create index if not exists dataset_batches_label_idx
  on public.dataset_batches (label);
create index if not exists dataset_batches_contributor_idx
  on public.dataset_batches (contributor_id, created_at desc);
create index if not exists dataset_batches_created_idx
  on public.dataset_batches (created_at, id);

alter table public.dataset_batches enable row level security;

drop policy if exists "Colectorul își vede loturile" on public.dataset_batches;
create policy "Colectorul își vede loturile"
  on public.dataset_batches for select
  using (auth.uid() = contributor_id);

revoke all on public.dataset_batches from anon, authenticated;
grant select on public.dataset_batches to authenticated;

comment on table public.dataset_batches is
  'Exemple de antrenare: doar vectori normalizați (199 sau 30×199). Fără imagini.';

-- ─── Validare contract v2 ──────────────────────────────────────────────────
create or replace function public.is_dataset_vector(p jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) = 199
    and not exists (
      select 1
      from jsonb_array_elements(p) as e
      where jsonb_typeof(e) is distinct from 'number'
    );
$$;

create or replace function public.is_dataset_sequence(p jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(p) = 'array'
    and jsonb_array_length(p) = 30
    and not exists (
      select 1
      from jsonb_array_elements(p) as frame
      where not public.is_dataset_vector(frame)
    );
$$;

create or replace function public.dataset_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.dataset_has_capability(p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.dataset_members%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;
  if public.dataset_is_admin() then
    return true;
  end if;
  select * into v_row from public.dataset_members where user_id = auth.uid();
  if not found then
    return false;
  end if;
  if p_capability = 'collect' then
    return v_row.can_collect;
  elsif p_capability = 'train' then
    return v_row.can_train;
  elsif p_capability = 'publish' then
    return v_row.can_publish;
  end if;
  return false;
end;
$$;

revoke all on function public.dataset_is_admin() from public;
revoke all on function public.dataset_has_capability(text) from public;
grant execute on function public.dataset_is_admin() to authenticated;
grant execute on function public.dataset_has_capability(text) to authenticated;

-- ─── Acces + consimțământ ──────────────────────────────────────────────────
create or replace function public.get_dataset_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin boolean := public.dataset_is_admin();
  v_row public.dataset_members%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select * into v_row from public.dataset_members where user_id = auth.uid();
  return jsonb_build_object(
    'can_collect', v_admin or coalesce(v_row.can_collect, false),
    'can_train', v_admin or coalesce(v_row.can_train, false),
    'can_publish', v_admin or coalesce(v_row.can_publish, false),
    'consented', v_row.consented_at is not null or v_admin
  );
end;
$$;

create or replace function public.consent_dataset_upload()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.dataset_has_capability('collect') then
    raise exception 'Not a dataset collector';
  end if;

  insert into public.dataset_members (user_id, can_collect, consented_at)
  values (auth.uid(), true, now())
  on conflict (user_id) do update
    set consented_at = coalesce(public.dataset_members.consented_at, now());

  return public.get_dataset_access();
end;
$$;

revoke all on function public.get_dataset_access() from public;
revoke all on function public.consent_dataset_upload() from public;
grant execute on function public.get_dataset_access() to authenticated;
grant execute on function public.consent_dataset_upload() to authenticated;

-- ─── Append lot ────────────────────────────────────────────────────────────
create or replace function public.append_dataset_batch(
  p_label text,
  p_kind text,
  p_samples jsonb,
  p_client_batch_id text,
  p_session_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := trim(p_label);
  v_count int;
  v_recent int;
  v_id uuid;
  v_sample jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.dataset_has_capability('collect') then
    raise exception 'Not a dataset collector';
  end if;
  if not public.dataset_is_admin() then
    if not exists (
      select 1 from public.dataset_members
      where user_id = auth.uid() and consented_at is not null
    ) then
      raise exception 'Consent required';
    end if;
  end if;

  if v_label is null or v_label = '' or char_length(v_label) > 40 then
    raise exception 'Invalid label';
  end if;
  if p_kind is distinct from 'static' and p_kind is distinct from 'sequence' then
    raise exception 'Invalid kind';
  end if;
  if p_client_batch_id is null or char_length(p_client_batch_id) < 8
     or char_length(p_client_batch_id) > 80 then
    raise exception 'Invalid client batch id';
  end if;
  if p_session_id is null then
    raise exception 'Invalid session id';
  end if;
  if jsonb_typeof(p_samples) is distinct from 'array' then
    raise exception 'Samples must be an array';
  end if;

  v_count := jsonb_array_length(p_samples);
  if v_count < 1 or v_count > 80 then
    raise exception 'Batch size out of range';
  end if;

  select count(*) into v_recent
  from public.dataset_batches
  where contributor_id = auth.uid()
    and created_at > now() - interval '1 minute';
  if v_recent >= 40 then
    raise exception 'Rate limited';
  end if;

  for v_sample in select value from jsonb_array_elements(p_samples)
  loop
    if p_kind = 'static' then
      if not public.is_dataset_vector(v_sample) then
        raise exception 'Invalid static vector';
      end if;
    else
      if not public.is_dataset_sequence(v_sample) then
        raise exception 'Invalid sequence';
      end if;
    end if;
  end loop;

  insert into public.dataset_batches (
    contributor_id, session_id, label, kind, normalize_version,
    samples, sample_count, client_batch_id
  ) values (
    auth.uid(), p_session_id, v_label, p_kind, 2,
    p_samples, v_count, p_client_batch_id
  )
  on conflict (contributor_id, client_batch_id) do update
    set sample_count = public.dataset_batches.sample_count
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_dataset_batch(text, text, jsonb, text, uuid) from public;
grant execute on function public.append_dataset_batch(text, text, jsonb, text, uuid) to authenticated;

-- ─── Inventar ──────────────────────────────────────────────────────────────
create or replace function public.list_dataset_inventory()
returns table (
  label text,
  kind text,
  sample_count bigint,
  own_count bigint,
  contributor_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.label,
    b.kind,
    sum(b.sample_count)::bigint as sample_count,
    sum(b.sample_count) filter (where b.contributor_id = auth.uid())::bigint as own_count,
    count(distinct b.contributor_id)::bigint as contributor_count
  from public.dataset_batches b
  where public.dataset_has_capability('collect')
     or public.dataset_has_capability('train')
  group by b.label, b.kind
  order by b.label, b.kind;
$$;

revoke all on function public.list_dataset_inventory() from public;
grant execute on function public.list_dataset_inventory() to authenticated;

-- ─── Paginare loturi pentru antrenare ──────────────────────────────────────
create or replace function public.fetch_dataset_batches(
  p_after_created timestamptz default null,
  p_after_id uuid default null,
  p_limit int default 40
)
returns table (
  id uuid,
  contributor_id uuid,
  session_id uuid,
  label text,
  kind text,
  samples jsonb,
  sample_count int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 40), 1), 80);
begin
  if not public.dataset_has_capability('train') then
    raise exception 'Not a dataset trainer';
  end if;

  return query
  select
    b.id, b.contributor_id, b.session_id, b.label, b.kind,
    b.samples, b.sample_count, b.created_at
  from public.dataset_batches b
  where (
    p_after_created is null
    or (b.created_at, b.id) > (p_after_created, p_after_id)
  )
  order by b.created_at, b.id
  limit v_limit;
end;
$$;

revoke all on function public.fetch_dataset_batches(timestamptz, uuid, int) from public;
grant execute on function public.fetch_dataset_batches(timestamptz, uuid, int) to authenticated;
