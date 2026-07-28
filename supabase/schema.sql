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
