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
