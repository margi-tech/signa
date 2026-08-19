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
    .select('id, first_name, last_name, username, display_name, visibility, role, created_at')
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
