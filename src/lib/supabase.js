/**
 * Client Supabase — activ doar dacă VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY există.
 * Fără chei, aplicația rămâne 100% offline (localStorage).
 *
 * GDPR: sincronizăm DOAR progres/XP/streak/profil — niciodată landmarks, imagini, video.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabase = isSupabaseConfigured
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getSessionUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function getOwnProfile() {
  if (!supabase) return null;
  const user = await getSessionUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, username, display_name, avatar_url, visibility, role, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Nu trimite `role` — trigger-ul SQL îl protejează oricum. */
export async function updateOwnProfile({ firstName, lastName, username, visibility }) {
  if (!supabase) return;
  const user = await getSessionUser();
  if (!user) throw new Error('Nu ești conectat.');
  const first_name = String(firstName ?? '').trim();
  const last_name = String(lastName ?? '').trim();
  const display_name = [first_name, last_name].filter(Boolean).join(' ') || username;
  const { error } = await supabase
    .from('profiles')
    .update({
      first_name,
      last_name,
      username,
      visibility,
      display_name,
    })
    .eq('id', user.id);
  if (error) throw error;
}

/** Bucket public pentru pozele de profil (vezi `docs/supabase-setup.md` §6). */
const AVATAR_BUCKET = 'avatars';
/** Poze mici — un profil nu are nevoie de mai mult, și limitează abuzul de storage. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Încarcă poza de profil în Storage și salvează URL-ul public pe `profiles.avatar_url`.
 * Un singur fișier per user (`{userId}/avatar`) — reupload-ul suprascrie, fără resturi.
 */
export async function uploadAvatar(file) {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  if (!file) throw new Error('Alege o imagine.');
  if (!file.type?.startsWith('image/')) throw new Error('Fișierul trebuie să fie o imagine.');
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Imaginea trebuie să fie sub 2 MB.');

  const user = await getSessionUser();
  if (!user) throw new Error('Nu ești conectat.');

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  // Cache-bust: același path la reupload ar păstra vechea imagine în cache-ul browserului.
  const avatar_url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url })
    .eq('id', user.id);
  if (error) throw error;

  return avatar_url;
}

export async function isUsernameTaken(username, exceptUserId = null) {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('username_taken', {
    p_username: username,
  });
  if (error) throw error;
  if (!data) return false;
  if (!exceptUserId) return Boolean(data);
  const { data: own } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', exceptUserId)
    .maybeSingle();
  if (own?.username && own.username.toLowerCase() === String(username).toLowerCase()) {
    return false;
  }
  return Boolean(data);
}

/** Link de resetare parolă — necesită redirect URL configurat în Supabase. */
export async function requestPasswordReset(email) {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}
