/* ─────────────────────────────────────────────────────────────────
   HomePage — temă luminoasă, streak, nivel, acces rapid la provocări
───────────────────────────────────────────────────────────────── */

import { useProgress } from '../hooks/useProgress';

function HandHero() {
  const fingers = [
    [30, 148, 10, 74],
    [52, 138, 46, 28],
    [78, 134, 78, 12],
    [104, 138, 112, 28],
    [122, 144, 136, 62],
  ];

  return (
    <div className="relative animate-float">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-44 h-44 bg-signa-400/25 rounded-full blur-3xl" />
      </div>
      <svg viewBox="0 0 160 190" width="140" height="166" className="relative overflow-visible">
        <rect x="20" y="132" width="118" height="46" rx="23"
          fill="#FFFFFF" stroke="rgba(16,185,129,0.18)" strokeWidth="2" />
        {fingers.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" />
        ))}
        {fingers.map(([, , x2, y2], i) => (
          <circle key={`halo-${i}`} cx={x2} cy={y2} r="15"
            fill="rgba(52,211,153,0.18)" className="animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }} />
        ))}
        {fingers.map(([, , x2, y2], i) => (
          <circle key={`tip-${i}`} cx={x2} cy={y2} r="7" fill="#10b981"
            className="animate-pulse" style={{ animationDelay: `${i * 180}ms` }} />
        ))}
      </svg>
    </div>
  );
}

export default function HomePage({
  onLessons, onStart, onCollect, onTrain, onSpell, onReview, onDiagnostic, onProfile, onLeaderboard,
}) {
  const { xp, streak, level, xpIntoLevel, xpNeeded, soundEnabled, setSoundEnabled } = useProgress();
  const pct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      <header className="flex items-center justify-between px-6 pt-5 flex-shrink-0">
        <button
          onClick={onProfile}
          className="text-ink-900 font-black text-lg tracking-[0.15em] hover:text-signa-600 transition-colors"
          aria-label="Deschide profilul"
        >
          SIGNA
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-ink-500"
            aria-label={soundEnabled ? 'Oprește sunetul' : 'Pornește sunetul'}
            title={soundEnabled ? 'Sunet pornit' : 'Sunet oprit'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 rounded-full px-2.5 py-1
              text-[11px] font-bold shadow-card" title="Zile consecutive">
              <span aria-hidden>🔥</span> {streak}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-card
            text-ink-600 text-[11px] font-bold tabular-nums">
            Nv. {level} · {xp} XP
          </div>
        </div>
      </header>

      {/* bară nivel */}
      <div className="px-6 pt-3 flex-shrink-0">
        <div className="h-1.5 bg-ink-900/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-signa-500 rounded-full transition-all" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 py-2">
        <HandHero />
      </div>

      <div className="flex-shrink-0 px-6 pb-8">
        <p className="text-signa-600 text-[11px] font-bold tracking-[0.2em] uppercase mb-2">
          Limba Semnelor Române
        </p>
        <h1 className="text-[2.15rem] font-black leading-[1.1] tracking-tight mb-5">
          <span className="text-ink-900">Faci un semn.</span><br />
          <span className="text-signa-500">Camera îl înțelege.</span>
        </h1>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onLessons}
            className="w-full py-[17px] bg-signa-500 text-white font-bold text-[15px] rounded-2xl
                       active:scale-[0.97] transition-transform duration-100 shadow-button"
          >
            Începe lecțiile
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onSpell}
              className="py-[14px] bg-white text-ink-700 font-semibold text-sm rounded-2xl
                         border border-ink-900/[0.06] shadow-card active:scale-[0.97] transition-all"
            >
              Scrie cuvântul
            </button>
            <button
              onClick={onStart}
              className="py-[14px] bg-white text-ink-700 font-semibold text-sm rounded-2xl
                         border border-ink-900/[0.06] shadow-card active:scale-[0.97] transition-all"
            >
              Antrenament
            </button>
          </div>

          <button
            onClick={onReview}
            className="w-full py-3 text-ink-600 hover:text-ink-900 font-medium text-sm transition-colors"
          >
            Repetiție spațiată
          </button>

          <div className="flex justify-center gap-5 pt-1">
            <button onClick={onCollect} className="py-1 text-ink-400 hover:text-ink-600 text-xs font-medium">
              Colectare
            </button>
            <button onClick={onTrain} className="py-1 text-ink-400 hover:text-ink-600 text-xs font-medium">
              Antrenare
            </button>
            <button onClick={onDiagnostic} className="py-1 text-ink-400 hover:text-ink-600 text-xs font-medium">
              Diagnostic
            </button>
            <button onClick={onLeaderboard} className="py-1 text-ink-400 hover:text-ink-600 text-xs font-medium">
              Clasament
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
