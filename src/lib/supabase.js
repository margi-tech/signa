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

/* ── Social: follow / prieteni ─────────────────────────────────────
   Prietenia e derivată, nu stocată: doi utilizatori sunt prieteni când
   se urmăresc reciproc. View-ul `friendships` face join-ul, iar perechea
   e normalizată (least/greatest), deci se caută mereu cu user_id_1 < user_id_2. */

/** Câmpurile publice de profil folosite în listele sociale. */
const DIRECTORY_FIELDS = 'id, display_name, avatar_url, created_at, streak';

/** Normalizează perechea, ca să se potrivească cu ordinea din view. */
function friendshipPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function followUser(targetUserId) {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  const user = await getSessionUser();
  if (!user) throw new Error('Nu ești conectat.');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function unfollowUser(targetUserId) {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  const user = await getSessionUser();
  if (!user) throw new Error('Nu ești conectat.');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);
  if (error) throw error;
}

/** Adaugă XP din clasament — user_directory nu expune progress.xp. */
async function withScores(profiles) {
  if (!profiles?.length) return profiles ?? [];
  const { data, error } = await supabase
    .from('leaderboard')
    .select('id, xp, streak')
    .in('id', profiles.map((p) => p.id));
  if (error) return profiles;
  const byId = new Map((data ?? []).map((row) => [row.id, row]));
  return profiles.map((p) => {
    const score = byId.get(p.id);
    return {
      ...p,
      xp: score?.xp ?? 0,
      streak: p.streak ?? score?.streak ?? 0,
    };
  });
}

/** Profilele pentru o listă de id-uri, din directorul public + XP. */
async function profilesByIds(ids) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('user_directory')
    .select(DIRECTORY_FIELDS)
    .in('id', ids);
  if (error) throw error;
  return withScores(data ?? []);
}

/** Profil public + XP, pentru cardul de pe Prieteni. */
export async function getDirectoryProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('user_directory')
    .select(DIRECTORY_FIELDS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [enriched] = await withScores([data]);
  return enriched;
}

/** Te urmăresc, dar tu încă nu i-ai urmărit — cereri de prietenie. */
export async function getIncomingRequests(userId) {
  const [followers, following] = await Promise.all([
    getFollowers(userId),
    getFollowing(userId),
  ]);
  const followingIds = new Set(following.map((u) => u.id));
  return followers.filter((u) => !followingIds.has(u.id));
}

export async function getFollowing(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw error;
  return profilesByIds((data ?? []).map((f) => f.following_id));
}

export async function getFollowers(userId) {
  if (!supabase || !userId) return [];
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);
  if (error) throw error;
  return profilesByIds((data ?? []).map((f) => f.follower_id));
}

export async function checkFollowStatus(targetUserId) {
  if (!supabase) return false;
  const user = await getSessionUser();
  if (!user) return false;

  // `head` + `count`: nu avem nevoie de rând, doar dacă există.
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function checkFriendshipStatus(targetUserId) {
  if (!supabase) return false;
  const user = await getSessionUser();
  if (!user) return false;

  const [a, b] = friendshipPair(user.id, targetUserId);
  const { data, error } = await supabase
    .from('friendships')
    .select('user_id_1')
    .eq('user_id_1', a)
    .eq('user_id_2', b)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

/** Prietenii unui utilizator, cu data de când sunt prieteni. */
export async function getFriends(userId) {
  if (!supabase || !userId) return [];
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('user_id_1, user_id_2, since')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);
  if (error) throw error;
  if (!friendships?.length) return [];

  const otherOf = (f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);
  const profiles = await profilesByIds(friendships.map(otherOf));
  const byId = new Map(profiles.map((p) => [p.id, p]));

  return friendships
    .map((f) => {
      const profile = byId.get(otherOf(f));
      // Profil dispărut (șters sau devenit privat) — sărim peste, nu randăm gol.
      return profile ? { ...profile, since: f.since } : null;
    })
    .filter(Boolean);
}

/** Căutare după nume; sub 2 caractere nu interoghează deloc. */
export async function searchUsers(query) {
  if (!supabase) return [];
  const q = String(query ?? '').trim();
  if (q.length < 2) return [];

  const user = await getSessionUser();
  let req = supabase
    .from('user_directory')
    .select(DIRECTORY_FIELDS)
    .ilike('display_name', `%${q}%`)
    .limit(20);
  if (user) req = req.neq('id', user.id);

  const { data, error } = await req;
  if (error) throw error;
  return withScores(data ?? []);
}
