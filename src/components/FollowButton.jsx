import { useState, useEffect } from 'react';
import {
  followUser,
  unfollowUser,
  checkFollowStatus,
  checkFriendshipStatus,
  isSupabaseConfigured,
} from '../lib/supabase';

/**
 * Buton de urmărire cu trei stări: neurmărit → urmărești → prieten.
 * „Prieten" apare doar când urmărirea e reciprocă (view-ul `friendships`).
 */
export default function FollowButton({ userId, idleLabel, onStatusChange, onError, onDark = false }) {
  const [following, setFollowing] = useState(false);
  const [friend, setFriend] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return undefined;
    let cancelled = false;
    Promise.all([checkFollowStatus(userId), checkFriendshipStatus(userId)])
      .then(([isFollowing, isFriend]) => {
        if (cancelled) return;
        setFollowing(isFollowing);
        setFriend(isFriend);
      })
      .catch(() => { /* starea rămâne pe fals — butonul e tot utilizabil */ });
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (following) await unfollowUser(userId);
      else await followUser(userId);

      const next = !following;
      setFollowing(next);
      // Prietenia se recalculează pe server — o recitim, nu o deducem.
      const isFriend = await checkFriendshipStatus(userId);
      setFriend(isFriend);
      onStatusChange?.({ following: next, friend: isFriend });
    } catch (err) {
      onError?.(err.message || 'Nu am putut actualiza urmărirea.');
    } finally {
      setBusy(false);
    }
  };

  if (!isSupabaseConfigured) return null;

  const tone = onDark
    ? friend
      ? 'bg-white border-white text-signa-900'
      : following
        ? 'bg-white/15 border-white/40 text-white hover:bg-white/25'
        : 'bg-white border-white text-signa-900'
    : friend
      ? 'bg-signa-500 border-signa-500 text-white'
      : following
        ? 'bg-white border-ink-900/[.09] text-ink-700 hover:border-signa-500 hover:text-signa-600'
        : 'bg-ink-900 border-ink-900 text-white';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`flex-none rounded-full border px-3.5 py-2 text-[12.5px] font-extrabold
        transition-[color,background-color,border-color,transform,box-shadow] duration-[160ms] ease-out
        hover:-translate-y-px disabled:opacity-50 disabled:translate-y-0 ${tone}`}
    >
      {friend ? 'Prieteni' : following ? 'Urmărești' : (idleLabel ?? 'Urmărește')}
    </button>
  );
}
