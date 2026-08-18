import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useProgress } from '../hooks/useProgress';
import { pullAndMergeProgress, pushProgress } from '../hooks/useProgressSync';
import FriendsList from '../components/FriendsList';

/**
 * Profil / autentificare — funcțional doar cu VITE_SUPABASE_* setate.
 * Fără chei: arată starea locală (XP, streak) și instrucțiuni.
 */
export default function ProfilePage({ onBack }) {
  const { xp, streak, level } = useProgress();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const run = async (fn) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
    } catch (err) {
      setMsg(err.message || 'Eroare');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">PROFIL</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-ink-400 text-[10px] font-bold tracking-[0.18em] uppercase mb-2">Progres local</p>
          <p className="text-ink-900 font-black text-2xl">Nivel {level}</p>
          <p className="text-ink-600 text-sm mt-1">{xp} XP · 🔥 {streak} zile</p>
          <p className="text-ink-400 text-[11px] mt-3 leading-relaxed">
            Progresul e salvat pe dispozitiv. Contul cloud sincronizează doar XP/stele — niciodată camera sau landmarks.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-900 leading-relaxed">
            Supabase nu e configurat. Copiază <code>.env.example</code> → <code>.env.local</code>,
            pune URL + anon key, rulează <code>supabase/schema.sql</code>.
          </div>
        ) : user ? (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-ink-900 font-semibold text-sm">Conectat</p>
            <p className="text-ink-500 text-xs break-all">{user.email}</p>
            <button
              disabled={busy}
              onClick={() => run(() => supabase.auth.signOut())}
              className="w-full py-3 rounded-xl bg-cream-100 text-ink-700 font-semibold text-sm"
            >
              Deconectare
            </button>
            <button
              disabled={busy}
              onClick={() => run(async () => {
                await pullAndMergeProgress();
                await pushProgress();
                setMsg('Progres sincronizat (merge max XP/stele). Reîncarcă pentru UI.');
              })}
              className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button"
            >
              Sincronizează progresul
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-ink-900 font-semibold text-sm">Autentificare</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              className="w-full bg-cream-50 border border-ink-900/10 rounded-xl px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="parolă"
              className="w-full bg-cream-50 border border-ink-900/10 rounded-xl px-3 py-2.5 text-sm"
            />
            <button
              disabled={busy}
              onClick={() => run(async () => {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
              })}
              className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button"
            >
              Intră în cont
            </button>
            <button
              disabled={busy}
              onClick={() => run(async () => {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg('Verifică emailul pentru confirmare (dacă e activată).');
              })}
              className="w-full py-3 rounded-xl bg-cream-100 text-ink-700 font-semibold text-sm"
            >
              Creează cont
            </button>
          </div>
        )}

        {msg && <p className="text-center text-sm text-ink-600">{msg}</p>}

        {user && isSupabaseConfigured && (
          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-ink-900 font-semibold text-sm mb-4">Prietenii mei</p>
            <FriendsList userId={user.id} compact={true} />
          </div>
        )}
      </div>
    </div>
  );
}
