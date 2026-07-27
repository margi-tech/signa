/* ─────────────────────────────────────────────────────────────────
   HomePage v4 — temă luminoasă și prietenoasă (Duolingo-style)
───────────────────────────────────────────────────────────────── */

/* ── Mâna principală (hero) ─────────────────────────────────────── */
function HandHero() {
  const fingers = [
    [30,  148, 10,  74],
    [52,  138, 46,  28],
    [78,  134, 78,  12],
    [104, 138, 112, 28],
    [122, 144, 136, 62],
  ];

  return (
    <div className="relative animate-float">
      {/* Glow difuz cald în spate */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-44 h-44 bg-signa-400/25 rounded-full blur-3xl" />
      </div>

      <svg viewBox="0 0 160 190" width="160" height="190" className="relative overflow-visible">
        {/* Palma */}
        <rect x="20" y="132" width="118" height="46" rx="23"
          fill="#FFFFFF"
          stroke="rgba(16,185,129,0.18)"
          strokeWidth="2"
        />

        {/* Degete — linii groase, calde */}
        {fingers.map(([x1,y1,x2,y2], i) => (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#FFFFFF"
            strokeWidth="15"
            strokeLinecap="round"
          />
        ))}

        {/* Halo vârf */}
        {fingers.map(([,, x2, y2], i) => (
          <circle key={`halo-${i}`} cx={x2} cy={y2} r="15"
            fill="rgba(52,211,153,0.18)"
            className="animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}

        {/* Dot vârf */}
        {fingers.map(([,, x2, y2], i) => (
          <circle key={`tip-${i}`} cx={x2} cy={y2} r="7"
            fill="#10b981"
            className="animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}

        {/* Contur fiecare deget */}
        {fingers.map(([x1,y1,x2,y2], i) => (
          <line key={`inner-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(16,185,129,0.14)"
            strokeWidth="15"
            strokeLinecap="round"
            fill="none"
            style={{ mixBlendMode: 'multiply' }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Separator cu punct ─────────────────────────────────────────── */
function Dot() {
  return <span className="inline-block w-1 h-1 rounded-full bg-ink-400 mx-3 align-middle" />;
}

/* ── Pagina ───────────────────────────────────────────────────── */
export default function HomePage({ onLessons, onStart, onCollect, onTrain }) {
  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">

      {/* Linie de brand sus */}
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 pt-5 flex-shrink-0">
        <span className="text-ink-900 font-black text-lg tracking-[0.15em]">SIGNA</span>
        <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-card
          text-ink-500 text-[11px] tracking-widest uppercase font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-signa-500 animate-pulse" />
          Beta
        </div>
      </header>

      {/* ── Ilustrație centrală ── */}
      <div className="flex-1 flex items-center justify-center">
        <HandHero />
      </div>

      {/* ── Conținut text + butoane ── */}
      <div className="flex-shrink-0 px-6 pb-10">

        {/* Label */}
        <p className="text-signa-600 text-[11px] font-bold tracking-[0.2em] uppercase mb-3">
          Limba Semnelor Române
        </p>

        {/* Titlu */}
        <h1 className="text-[2.5rem] font-black leading-[1.1] tracking-tight mb-4">
          <span className="text-ink-900">Faci un semn.</span><br />
          <span className="text-signa-500">Camera îl înțelege.</span>
        </h1>

        {/* Stats inline */}
        <p className="text-ink-500 text-sm mb-7 flex items-center flex-wrap gap-y-1">
          <span className="text-ink-700 font-bold">21</span>
          <span className="ml-1">puncte / mână</span>
          <Dot />
          <span className="text-ink-700 font-bold">100%</span>
          <span className="ml-1">offline</span>
          <Dot />
          <span className="text-ink-700 font-bold">31</span>
          <span className="ml-1">litere LSR</span>
        </p>

        {/* Butoane */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onLessons}
            className="w-full py-[17px] bg-signa-500 text-white font-bold text-[15px] rounded-2xl
                       active:scale-[0.97] transition-transform duration-100
                       shadow-button"
          >
            Începe lecțiile
          </button>

          <button
            onClick={onStart}
            className="w-full py-[15px] bg-white text-ink-700 font-semibold text-sm rounded-2xl
                       border border-ink-900/[0.06] shadow-card
                       hover:border-signa-500/30 hover:text-ink-900
                       active:scale-[0.97] transition-all duration-150"
          >
            Antrenament liber
          </button>

          <div className="flex justify-center gap-6">
            <button
              onClick={onCollect}
              className="py-2 text-ink-500 hover:text-ink-700 font-medium text-xs
                         transition-colors duration-150"
            >
              Colectare date
            </button>
            <button
              onClick={onTrain}
              className="py-2 text-ink-500 hover:text-ink-700 font-medium text-xs
                         transition-colors duration-150"
            >
              Antrenare model
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
