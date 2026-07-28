import { useMemo, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import { LESSONS } from '../data/lessons';

/**
 * Recapitulare spațiată — litere deja văzute, prioritizate după rate/vârstă.
 * Dacă nu există mastery, propune litere din lecțiile completate.
 */
export default function ReviewPage({ onBack, onStartReview }) {
  const { reviewLetters, letterMastery, starsFor } = useProgress();
  const [selected, setSelected] = useState(() => new Set());

  const fallback = useMemo(() => {
    const done = LESSONS.filter((l) => starsFor(l.id) > 0).flatMap((l) => l.letters);
    return [...new Set(done)].slice(0, 8);
  }, [starsFor]);

  const letters = reviewLetters.length ? reviewLetters : fallback;

  const toggle = (l) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(l)) next.delete(l);
      else next.add(l);
      return next;
    });
  };

  const pick = selected.size ? [...selected] : letters.slice(0, 5);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">REPETIȚIE</h1>
        <div className="w-16" />
      </header>

      <div className="px-5 pb-3">
        <p className="text-ink-500 text-sm leading-relaxed">
          Litere pe care merită să le repeți — pe baza practicii recente.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-6">
        {!letters.length ? (
          <div className="bg-white rounded-2xl shadow-card p-6 text-center">
            <p className="text-ink-600 text-sm">Finalizează o lecție ca să ai litere de repetat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {letters.map((l) => {
              const m = letterMastery[l];
              const rate = m?.attempts ? Math.round((m.correct / m.attempts) * 100) : null;
              const active = selected.has(l);
              return (
                <button
                  key={l}
                  onClick={() => toggle(l)}
                  className={`rounded-2xl p-3 text-center transition-all
                    ${active ? 'bg-signa-500 text-white shadow-button' : 'bg-white shadow-card text-ink-900'}`}
                >
                  <span className="font-black text-xl block">{l}</span>
                  {rate !== null && (
                    <span className={`text-[10px] ${active ? 'text-white/80' : 'text-ink-400'}`}>{rate}%</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 px-5 pb-10">
        <button
          disabled={!pick.length}
          onClick={() => onStartReview(pick)}
          className="w-full py-[17px] bg-signa-500 text-white font-bold rounded-2xl shadow-button
            disabled:opacity-40 active:scale-[0.97] transition-transform"
        >
          Repetă {pick.length || 0} litere
        </button>
      </div>
    </div>
  );
}
