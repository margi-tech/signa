import { useEffect, useState } from 'react';
import { getOwnProfile, isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Numele, inițialele și poziția în clasament — datele decorative de care
 * au nevoie shell-ul și paginile. Se cer o singură dată, din shell, ca să
 * nu facă fiecare ecran aceleași două interogări la fiecare navigare.
 */
export function useProfileSummary(xp, userId) {
  const [firstName, setFirstName] = useState('');
  const [initials, setInitials] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [role, setRole] = useState('user');
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  // Crește când profilul se schimbă din ecranul Profil, ca sidebar-ul să ia
  // poza și numele noi fără reîncărcarea paginii.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || userId === null) {
      setLoading(false);
      return undefined;
    }
    if (!userId) return undefined;
    let cancelled = false;
    setLoading(true);
    getOwnProfile()
      .then((p) => {
        if (cancelled || !p) return;
        setFirstName((p.first_name ?? '').trim());
        setAvatarUrl(p.avatar_url ?? null);
        setRole(p.role === 'admin' ? 'admin' : 'user');
        const ini = [p.first_name, p.last_name]
          .map((s) => (s || '').trim()[0])
          .filter(Boolean).join('').toUpperCase()
          .slice(0, 2);
        setInitials(ini || (p.username ?? '?')[0].toUpperCase());
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey, userId]);

  // Poziția în clasament — două count-uri ieftine pe view-ul `leaderboard`.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const ahead = await supabase.from('leaderboard')
          .select('*', { count: 'exact', head: true }).gt('xp', xp);
        const all = await supabase.from('leaderboard')
          .select('*', { count: 'exact', head: true });
        if (cancelled || ahead.error || all.error) return;
        setRank({ place: (ahead.count ?? 0) + 1, total: all.count ?? 0 });
      } catch { /* fără sesiune / offline */ }
    })();
    return () => { cancelled = true; };
  }, [xp]);

  return {
    firstName,
    initials,
    avatarUrl,
    role,
    loading,
    rank,
    refresh: () => setReloadKey((k) => k + 1),
  };
}
