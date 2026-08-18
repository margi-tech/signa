import { useEffect, useState } from 'react';
import {
  getOwnProfile,
  isSupabaseConfigured,
  isUsernameTaken,
  supabase,
  updateOwnProfile,
} from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';
import { useProgress } from '../hooks/useProgress';
import { pullAndMergeProgress, pushProgress } from '../hooks/useProgressSync';
import { validateName, validatePassword, validateUsername, validateEmail } from '../utils/username';

const inputClass =
  'w-full bg-cream-50 border border-ink-900/10 rounded-xl px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400';

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-ink-500 text-[11px] font-bold tracking-wide uppercase">{label}</span>
      {children}
      {hint && <span className="block text-ink-400 text-[11px] leading-relaxed">{hint}</span>}
    </label>
  );
}

/**
 * Profil / autentificare — funcțional doar cu VITE_SUPABASE_* setate.
 * Fără chei: arată starea locală (XP, streak) și instrucțiuni.
 */
export default function ProfilePage({ onBack }) {
  const { xp, streak, level, persist, syncNow } = useProgress();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setVisibility('public');
      return undefined;
    }
    let cancelled = false;
    getOwnProfile()
      .then((profile) => {
        if (cancelled || !profile) return;
        setFirstName(profile.first_name ?? '');
        setLastName(profile.last_name ?? '');
        setUsername(profile.username ?? '');
        setVisibility(profile.visibility === 'private' ? 'private' : 'public');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const run = async (fn) => {
    setBusy(true);
    setMsg('');
    try {
      await fn();
    } catch (err) {
      setMsg(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const afterAuth = async () => {
    try {
      const merged = await pullAndMergeProgress();
      if (merged) persist(merged);
      await pushProgress(merged ?? undefined);
    } catch {
      /* sync best-effort */
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
            Ghid: <code>docs/supabase-setup.md</code>.
          </div>
        ) : user ? (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-ink-900 font-semibold text-sm">Conectat</p>
            <p className="text-ink-500 text-xs break-all">{user.email}</p>

            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="prenume"
              autoComplete="given-name"
              className={inputClass}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="nume"
              autoComplete="family-name"
              className={inputClass}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
              className={inputClass}
            />

            <label className="flex items-center justify-between gap-3 py-1">
              <span className="text-ink-700 text-sm">
                Profil {visibility === 'public' ? 'public' : 'privat'}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setVisibility((v) => (v === 'public' ? 'private' : 'public'))}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  visibility === 'public' ? 'bg-signa-500' : 'bg-ink-200'
                }`}
                aria-pressed={visibility === 'public'}
                aria-label="Comută vizibilitatea profilului"
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    visibility === 'public' ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
            <p className="text-ink-400 text-[11px] leading-relaxed">
              {visibility === 'public'
                ? 'Apari în clasament cu prenumele / username-ul.'
                : 'Nu apari în clasament. Progresul rămâne salvat în cont.'}
            </p>

            <button
              disabled={busy}
              onClick={() => run(async () => {
                const nameErr = validateName(firstName, 'Prenumele') || validateName(lastName, 'Numele');
                if (nameErr) throw new Error(nameErr);
                const userErr = validateUsername(username);
                if (userErr) throw new Error(userErr);
                if (await isUsernameTaken(username.trim(), user.id)) {
                  throw new Error('Username-ul e deja luat.');
                }
                await updateOwnProfile({
                  firstName,
                  lastName,
                  username: username.trim(),
                  visibility,
                });
                setMsg('Profil salvat.');
              })}
              className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button disabled:opacity-60"
            >
              Salvează profilul
            </button>
            <button
              disabled={busy}
              onClick={() => run(async () => {
                await syncNow();
                setMsg('Progres sincronizat (merge max XP/stele).');
              })}
              className="w-full py-3 rounded-xl bg-cream-100 text-ink-700 font-semibold text-sm disabled:opacity-60"
            >
              Sincronizează progresul
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => supabase.auth.signOut())}
              className="w-full py-3 rounded-xl bg-cream-100 text-ink-700 font-semibold text-sm disabled:opacity-60"
            >
              Deconectare
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-ink-900 font-semibold text-sm">
              {mode === 'signup' ? 'Creează cont' : 'Autentificare'}
            </p>

            {mode === 'signup' && (
              <>
                <Field label="Prenume">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Maria"
                    autoComplete="given-name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Nume">
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Popescu"
                    autoComplete="family-name"
                    className={inputClass}
                  />
                </Field>
                <Field label="Username" hint="3–20 caractere: litere, cifre, punct sau underscore. Fără spații.">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="maria.pop"
                    autoComplete="username"
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            <Field
              label="Email"
              hint={mode === 'signup'
                ? 'Forma nume@domeniu.com (Gmail, Yahoo, etc.). Un email = un cont. Nu e nevoie de confirmare în demo.'
                : null}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@gmail.com"
                autoComplete="email"
                className={inputClass}
              />
            </Field>
            <Field
              label="Parolă"
              hint={mode === 'signup' ? 'Minim 8 caractere.' : null}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className={inputClass}
              />
            </Field>

            {mode === 'login' ? (
              <button
                disabled={busy}
                onClick={() => run(async () => {
                  const emailErr = validateEmail(email);
                  if (emailErr) throw new Error(emailErr);
                  const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim().toLowerCase(),
                    password,
                  });
                  if (error) throw error;
                  await afterAuth();
                })}
                className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button disabled:opacity-60"
              >
                Intră în cont
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => run(async () => {
                  const nameErr = validateName(firstName, 'Prenumele') || validateName(lastName, 'Numele');
                  if (nameErr) throw new Error(nameErr);
                  const userErr = validateUsername(username);
                  if (userErr) throw new Error(userErr);
                  const passErr = validatePassword(password);
                  if (passErr) throw new Error(passErr);
                  const emailErr = validateEmail(email);
                  if (emailErr) throw new Error(emailErr);
                  if (await isUsernameTaken(username.trim())) {
                    throw new Error('Username-ul e deja luat.');
                  }
                  const { data, error } = await supabase.auth.signUp({
                    email: email.trim().toLowerCase(),
                    password,
                    options: {
                      data: {
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        username: username.trim(),
                      },
                    },
                  });
                  if (error) throw error;
                  if (data.session) {
                    await afterAuth();
                    setMsg('Cont creat. Progresul se sincronizează în cloud.');
                  } else {
                    setMsg('Verifică emailul pentru confirmare, apoi revino să te conectezi.');
                  }
                })}
                className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button disabled:opacity-60"
              >
                Creează cont
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode((m) => (m === 'login' ? 'signup' : 'login'));
                setMsg('');
              }}
              className="w-full py-2 text-ink-500 hover:text-ink-800 text-sm font-medium"
            >
              {mode === 'login' ? 'Nu ai cont? Creează unul' : 'Ai deja cont? Intră'}
            </button>
          </div>
        )}

        {msg && <p className="text-center text-sm text-ink-600">{msg}</p>}
      </div>
    </div>
  );
}
