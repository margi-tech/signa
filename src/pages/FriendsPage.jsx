import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import UserSearch from '../components/UserSearch';
import FriendsList from '../components/FriendsList';
import UserProfile from '../components/UserProfile';

export default function FriendsPage({ onBack }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [tab, setTab] = useState('search'); // 'search' | 'friends'
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUserId(user?.id);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-ink-900">👥 Prieteni</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-ink-200 text-ink-900 rounded-lg hover:bg-ink-300 transition"
          >
            ← Înapoi
          </button>
        </div>

        {!isSupabaseConfigured ? (
          <div className="p-6 bg-cream-100 border border-cream-300 rounded-lg">
            <h2 className="font-semibold text-ink-900 mb-2">
              🔐 Autentificare necesară
            </h2>
            <p className="text-ink-700">
              Funcția de prieteni necesită Supabase setup. Vezi ROADMAP.md
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 border-b border-cream-300">
              <button
                onClick={() => setTab('search')}
                className={`px-4 py-3 font-semibold transition ${
                  tab === 'search'
                    ? 'text-signa-400 border-b-2 border-signa-400'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                🔍 Caută
              </button>
              <button
                onClick={() => setTab('friends')}
                className={`px-4 py-3 font-semibold transition ${
                  tab === 'friends'
                    ? 'text-signa-400 border-b-2 border-signa-400'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                👥 Prietenii mei
              </button>
            </div>

            <div className="bg-white p-6 rounded-lg border border-cream-200 shadow-sm">
              {tab === 'search' ? (
                <div>
                  <p className="text-sm text-ink-600 mb-4">
                    Caută și urmărește utilizatori. Când vă urmăriți reciproc, deveniti prieteni! 🤝
                  </p>
                  <UserSearch onSelect={setSelectedUserId} />
                </div>
              ) : (
                <div>
                  {currentUserId ? (
                    <FriendsList userId={currentUserId} onSelect={setSelectedUserId} />
                  ) : (
                    <p className="text-center text-ink-600">Se încarcă...</p>
                  )}
                </div>
              )}
            </div>

            {selectedUserId && (
              <div className="mt-6 bg-white p-6 rounded-lg border border-cream-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-ink-900">Profil public</h2>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(null)}
                    className="text-sm text-ink-600 hover:text-ink-900"
                  >
                    Închide
                  </button>
                </div>
                <UserProfile userId={selectedUserId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
