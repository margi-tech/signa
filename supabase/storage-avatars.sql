-- Signa — bucket „avatars" pentru poze de profil (US #23 / Faza 5)
-- Lipeste tot fișierul în SQL Editor, DUPĂ ce bucket-ul „avatars" există (vezi
-- docs/supabase-setup.md §6 — bucket-ul se creează manual din Storage UI,
-- create_bucket nu e disponibil din SQL Editor pe planul free).
--
-- Bucket-ul rămâne public pentru URL-urile imaginilor, dar API-ul Storage nu
-- permite listarea tuturor obiectelor. Un user scrie doar în propriul folder.

drop policy if exists "Avatarele sunt publice" on storage.objects;
drop policy if exists "Userul își vede propriile obiecte" on storage.objects;
create policy "Userul își vede propriile obiecte"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

update storage.buckets
set
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- Fișierele vechi de alt tip (ex. SVG) NU se mai pot șterge de aici: Supabase
-- blochează orice `delete from storage.objects` din SQL (storage.protect_delete)
-- și pică tot scriptul. Dacă apar, șterge-le din Storage UI sau prin Storage API.
-- Update-ul de mai jos le scoate oricum din profiluri.

update public.profiles
set avatar_url = null
where avatar_url is not null
  and lower(split_part(avatar_url, '?', 1)) !~ '\.(jpe?g|png|webp)$';

drop policy if exists "Userul își încarcă propriul avatar" on storage.objects;
create policy "Userul își încarcă propriul avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Userul își actualizează propriul avatar" on storage.objects;
create policy "Userul își actualizează propriul avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Userul își șterge propriul avatar" on storage.objects;
create policy "Userul își șterge propriul avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
