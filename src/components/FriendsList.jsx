import { useState, useEffect } from 'react';
import { getFriends, isSupabaseConfigured } from '../lib/supabase';
import FollowButton from './FollowButton';

export default function FriendsList({ userId, compact = false, onSelect }) {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    loadFriends();
  }, [userId]);

  async function loadFriends() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFriends(userId);
      setFriends(data);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="p-4 bg-cream-100 border border-cream-300 rounded-lg">
        <p className="text-sm text-ink-600">Friends feature requires authentication</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <p className="text-ink-600">Se încarcă...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
        <p className="text-sm text-red-900">Error: {error}</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-4 text-center text-ink-600">
        <p>🤝 Niciun prieten încă</p>
        <p className="text-sm mt-1">Urmărește oameni și primești follow înapoi!</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between gap-3 p-3 bg-cream-50 rounded-lg border border-cream-200 hover:border-signa-300 transition"
        >
          <button
            type="button"
            onClick={() => onSelect?.(friend.id)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            {friend.avatar_url ? (
              <img
                src={friend.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-signa-200 text-signa-900 flex items-center justify-center font-bold">
                {(friend.display_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-medium text-ink-900 truncate">{friend.display_name || 'Utilizator'}</p>
              <p className="text-xs text-ink-600">
                🔥 {friend.streak || 0} zile · înscris din{' '}
                {friend.created_at
                  ? new Date(friend.created_at).toLocaleDateString('ro-RO')
                  : '—'}
              </p>
            </div>
          </button>
          <FollowButton userId={friend.id} onStatusChange={loadFriends} />
        </div>
      ))}
    </div>
  );
}
