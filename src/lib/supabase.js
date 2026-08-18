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

/**
 * Urmărire social — follow/unfollow + friendship (reciprocal follows)
 */

export async function followUser(targetUserId) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, following_id: targetUserId });

  if (error) throw error;
}

export async function unfollowUser(targetUserId) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) throw error;
}

export async function getFollowing(userId) {
  if (!supabase) return [];
  
  const { data: follows, error: err1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (err1) throw err1;
  if (!follows || follows.length === 0) return [];

  const userIds = follows.map(f => f.following_id);
  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  if (err2) throw err2;
  return profiles || [];
}

export async function getFollowers(userId) {
  if (!supabase) return [];

  const { data: follows, error: err1 } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);

  if (err1) throw err1;
  if (!follows || follows.length === 0) return [];

  const userIds = follows.map(f => f.follower_id);
  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  if (err2) throw err2;
  return profiles || [];
}

export async function checkFollowStatus(targetUserId) {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('id', { count: 'exact' })
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) throw error;
  return (data?.length || 0) > 0;
}

export async function checkFriendshipStatus(targetUserId) {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const userId = user.id;
  const user1 = userId < targetUserId ? userId : targetUserId;
  const user2 = userId < targetUserId ? targetUserId : userId;

  const { data, error } = await supabase
    .from('friendships')
    .select('user_id_1')
    .eq('user_id_1', user1)
    .eq('user_id_2', user2)
    .single();

  if (error?.code === 'PGRST116') return false; // No row found
  if (error) throw error;
  return !!data;
}

export async function getFriends(userId) {
  if (!supabase) return [];

  const { data: friendships, error: err1 } = await supabase
    .from('friendships')
    .select('user_id_1, user_id_2, since')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

  if (err1) throw err1;
  if (!friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f => 
    f.user_id_1 === userId ? f.user_id_2 : f.user_id_1
  );

  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', friendIds);

  if (err2) throw err2;

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  
  return friendships.map(f => {
    const otherId = f.user_id_1 === userId ? f.user_id_2 : f.user_id_1;
    return { ...profileMap.get(otherId), since: f.since };
  });
}

export async function searchUsers(query) {
  if (!supabase) return [];
  if (query.length < 2) return [];

  const { data: { user } } = await supabase.auth.getUser();

  let q = supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${query}%`)
    .limit(20);

  if (user) {
    q = q.neq('id', user.id);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
