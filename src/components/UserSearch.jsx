import { useEffect, useState } from 'react';
import { searchUsers, isSupabaseConfigured } from '../lib/supabase';
import UserRow from './UserRow';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;
const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (name, dur, delay = 0) =>
  ({ animation: `${name} ${dur}s ${EASE} ${delay}s both` });

/** Căutare de utilizatori după nume, cu debounce. */
export default function UserSearch({ onSelect, onError }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!isSupabaseConfigured || q.length < MIN_QUERY) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    const id = setTimeout(() => {
      searchUsers(q)
        .then((users) => { if (!cancelled) setResults(users); })
        .catch((err) => { if (!cancelled) onError?.(err.message); })
        .finally(() => { if (!cancelled) setBusy(false); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(id); };
  }, [query, onError]);

  const q = query.trim();

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block">
        <span className="sr-only">Caută utilizatori</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Caută după nume…"
          className="w-full rounded-2xl border border-ink-900/[.09] bg-[#FDFCF9] px-5 py-3.5
            text-[15px] font-semibold text-ink-900 placeholder:text-ink-400 placeholder:font-medium
            outline-none transition-[border-color,box-shadow,background] duration-[180ms] ease-out
            hover:bg-white focus:bg-white focus:border-signa-500 focus:ring-4 focus:ring-signa-500/[.14]"
        />
      </label>
      <p className="text-[12px] font-semibold text-ink-400">
        Minim {MIN_QUERY} litere. Profilele private nu apar.
      </p>

      {q.length > 0 && q.length < MIN_QUERY && (
        <p style={anim('sg-fade-in', 0.35)} className="text-[13px] font-semibold text-ink-400">
          Scrie măcar {MIN_QUERY} caractere.
        </p>
      )}

      {busy && q.length >= MIN_QUERY && (
        <p className="text-[13px] font-semibold text-ink-400">Se caută…</p>
      )}

      {!busy && q.length >= MIN_QUERY && results.length === 0 && (
        <p style={anim('sg-fade-up', 0.45)} className="text-[13px] font-semibold text-ink-400">
          Niciun jucător cu numele ăsta.
        </p>
      )}

      {results.length > 0 && (
        <div
          style={anim('sg-fade-up', 0.5, 0.08)}
          className="rounded-[18px] border border-ink-900/[.06] overflow-hidden"
        >
          {results.map((user, i) => (
            <UserRow
              key={user.id}
              user={user}
              onSelect={onSelect}
              onError={onError}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}
    </div>
  );
}
