import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import FollowButton from './FollowButton';
import FriendsList from './FriendsList';

export default function UserProfile({ userId }) {
  const [profile, setProfile] = useState(null);
  const [isOwn, setIsOwn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadProfile();
    checkIfOwn();
  }, [userId]);

  async function loadProfile() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function checkIfOwn() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsOwn(user?.id === userId);
    } catch (err) {
      console.error('Failed to check auth:', err);
    }
  }

  if (isLoading) {
    return <div className="p-4 text-center text-ink-600">Se încarcă...</div>;
  }

  if (!profile) {
    return <div className="p-4 text-center text-ink-600">Profilul nu a fost găsit</div>;
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-cream-50 rounded-lg border border-cream-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-ink-900">
                {profile.display_name}
              </h1>
              <p className="text-sm text-ink-600 mt-1">
                Utilizator din {new Date(profile.created_at).toLocaleDateString('ro-RO')}
              </p>
            </div>
          </div>

          {!isOwn && isSupabaseConfigured && (
            <FollowButton userId={userId} onStatusChange={loadProfile} />
          )}
        </div>

        <button
          onClick={() => setShowFriends(!showFriends)}
          className="mt-4 px-4 py-2 bg-signa-200 text-signa-900 rounded-lg hover:bg-signa-300 transition"
        >
          👥 Prieteni
        </button>
      </div>

      {showFriends && <FriendsList userId={userId} />}
    </div>
  );
}
