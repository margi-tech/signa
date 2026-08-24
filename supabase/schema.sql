-- Signa — schema inițială Supabase (Faza 5)
-- Rulează în SQL Editor după proiectul tău. Activează RLS pe toate tabelele.
-- NU stoca landmarks / imagini / video aici.

-- Profil public (1:1 cu auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profilul e vizibil public"
  on public.profiles for select using (true);

create policy "Utilizatorul își editează profilul"
  on public.profiles for update using (auth.uid() = id);

create policy "Utilizatorul își creează profilul"
  on public.profiles for insert with check (auth.uid() = id);

-- Progres per utilizator (XP, streak, stele lecții)
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0,
  streak int not null default 0,
  last_practice_date date,
  lessons jsonb not null default '{}'::jsonb,
  letter_mastery jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Progresul e privat (read own)"
  on public.progress for select using (auth.uid() = user_id);

create policy "Progresul e privat (write own)"
  on public.progress for insert with check (auth.uid() = user_id);

create policy "Progresul e privat (update own)"
  on public.progress for update using (auth.uid() = user_id);

-- Clasament (view pe XP — fără date biometrice)
create or replace view public.leaderboard as
  select
    p.id,
    p.display_name,
    coalesce(pr.xp, 0) as xp,
    coalesce(pr.streak, 0) as streak
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id
  order by xp desc;

-- Relații sociale: follow/friendship
create table if not exists public.follows (
  id bigserial primary key,
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

create index idx_follows_follower on public.follows(follower_id);
create index idx_follows_following on public.follows(following_id);

alter table public.follows enable row level security;

create policy "Toți pot vedea urmăriri"
  on public.follows for select using (true);

create policy "Utilizatorul poate urma/nu urmări"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Utilizatorul poate anula urmare"
  on public.follows for delete using (auth.uid() = follower_id);

create or replace view public.user_directory as
  select p.id, p.display_name, p.avatar_url, p.created_at,
    coalesce(pr.streak, 0) as streak
  from public.profiles p
  left join public.progress pr on pr.user_id = p.id;

-- Compute friendships: reciprocal follows
create or replace view public.friendships as
  select
    least(f1.follower_id, f1.following_id) as user_id_1,
    greatest(f1.follower_id, f1.following_id) as user_id_2,
    min(f1.created_at) as since
  from public.follows f1
  join public.follows f2
    on f1.follower_id = f2.following_id
    and f1.following_id = f2.follower_id
  group by user_id_1, user_id_2;

-- Trigger: la signup creează profil + progress gol
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  insert into public.progress (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
