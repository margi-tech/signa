import { useState, useEffect } from 'react';
import {
  followUser,
  unfollowUser,
  checkFollowStatus,
  checkFriendshipStatus,
  isSupabaseConfigured,
} from '../lib/supabase';

export default function FollowButton({ userId, onStatusChange }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadStatus();
  }, [userId]);

  async function loadStatus() {
    try {
      const [following, friendship] = await Promise.all([
        checkFollowStatus(userId),
        checkFriendshipStatus(userId),
      ]);
      setIsFollowing(following);
      setIsFriend(friendship);
    } catch (err) {
      console.error('Error loading follow status:', err);
    }
  }

  async function handleClick() {
    if (!isSupabaseConfigured) {
      alert('Social features require Supabase setup');
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        setIsFollowing(false);
      } else {
        await followUser(userId);
        setIsFollowing(true);
      }

      const isFriendsNow = await checkFriendshipStatus(userId);
      setIsFriend(isFriendsNow);

      onStatusChange?.({ isFollowing: !isFollowing, isFriend: isFriendsNow });
    } catch (err) {
      console.error('Follow action failed:', err);
      alert('Action failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupabaseConfigured) return null;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        isFriend
          ? 'bg-signa-400 text-white'
          : isFollowing
            ? 'bg-gray-300 text-ink-900'
            : 'bg-signa-200 text-signa-900 hover:bg-signa-300'
      } disabled:opacity-50`}
    >
      {isFriend ? (
        <>👥 Prieten</>
      ) : isFollowing ? (
        <>Urmărești</>
      ) : (
        <>+ Urmărește</>
      )}
    </button>
  );
}
