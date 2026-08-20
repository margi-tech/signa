-- Signa — bucket „avatars" pentru poze de profil (US #23 / Faza 5)
-- Lipeste tot fișierul în SQL Editor, DUPĂ ce bucket-ul „avatars" există (vezi
-- docs/supabase-setup.md §6 — bucket-ul se creează manual din Storage UI,
-- create_bucket nu e disponibil din SQL Editor pe planul free).
--
-- Reguli: oricine poate CITI (poze de profil publice, ca restul profilului
-- public), dar un user poate scrie DOAR în propriul folder (`{user_id}/...`).

drop policy if exists "Avatarele sunt publice" on storage.objects;
create policy "Avatarele sunt publice"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Userul își încarcă propriul avatar" on storage.objects;
create policy "Userul își încarcă propriul avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Userul își actualizează propriul avatar" on storage.objects;
create policy "Userul își actualizează propriul avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Userul își șterge propriul avatar" on storage.objects;
create policy "Userul își șterge propriul avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
