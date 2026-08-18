import { useState, useCallback } from 'react';
import { searchUsers, isSupabaseConfigured } from '../lib/supabase';
import FollowButton from './FollowButton';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async (q) => {
    setQuery(q);
    if (!isSupabaseConfigured) return;

    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const users = await searchUsers(q);
      setResults(users);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="p-4 bg-cream-100 border border-cream-300 rounded-lg">
        <p className="text-sm text-ink-600">Search requires authentication</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Caută utilizatori..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-signa-400 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="animate-spin h-5 w-5 text-signa-400">⟳</div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-sm text-red-900">Error: {error}</p>
        </div>
      )}

      <div className="space-y-3">
        {results.length === 0 && query.length >= 2 && !isLoading && (
          <p className="text-center text-ink-600 py-4">Niciun rezultat</p>
        )}

        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-cream-50 rounded-lg border border-cream-200 hover:border-signa-300 transition"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <p className="font-medium text-ink-900 truncate">{user.display_name}</p>
            </div>
            <FollowButton userId={user.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
