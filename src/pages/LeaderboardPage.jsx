import { useEffect, useState } from 'react';
import { getOwnProfile, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useProgress } from '../hooks/useProgress';

/**
 * Clasament — live din view-ul leaderboard când Supabase e activ,
 * altfel afișează doar scorul local (placeholder).
 */
export default function LeaderboardPage({ onBack }) {
  const { xp, streak, level } = useProgress();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [privateProfile, setPrivateProfile] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('xp', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) setErr(error.message);
      else setRows(data ?? []);

      try {
        const profile = await getOwnProfile();
        if (!cancelled) setPrivateProfile(profile?.visibility === 'private');
      } catch {
        /* fără sesiune */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">CLASAMENT</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        <div className="bg-signa-50 rounded-2xl p-4 border border-signa-200/60">
          <p className="text-signa-700 text-xs font-bold uppercase tracking-wider mb-1">Tu (local)</p>
          <p className="text-ink-900 font-black text-lg">Nivel {level} · {xp} XP · 🔥 {streak}</p>
        </div>

        {privateProfile && (
          <p className="text-ink-500 text-sm leading-relaxed px-1">
            Profilul tău e privat — nu apari în clasament. Îl poți face public din Profil.
          </p>
        )}

        {!isSupabaseConfigured && (
          <p className="text-ink-500 text-sm leading-relaxed px-1">
            Clasamentul între jucători apare după ce echipa configurează Supabase
            (vezi <code className="text-ink-700">.env.example</code>).
          </p>
        )}

        {err && <p className="text-red-500 text-xs">{err}</p>}

        {rows.map((r, i) => (
          <div key={r.id} className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3">
            <span className="w-8 text-ink-400 font-bold text-sm tabular-nums">#{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-ink-900 font-semibold text-sm truncate">{r.display_name || 'Jucător'}</p>
              <p className="text-ink-400 text-xs">🔥 {r.streak}</p>
            </div>
            <span className="text-signa-600 font-bold text-sm tabular-nums">{r.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
