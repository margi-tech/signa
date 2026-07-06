/* ─────────────────────────────────────────────────────────────────
   HomePage v3 — ilustrație centrală, layout echilibrat pe înălțime
───────────────────────────────────────────────────────────────── */

/* ── Mâna principală (hero) ─────────────────────────────────────── */
function HandHero() {
  // Fiecare deget: [x_baza, y_baza, x_varf, y_varf]
  const fingers = [
    [30,  148, 10,  74],   // degetul mare
    [52,  138, 46,  28],   // arătătorul
    [78,  134, 78,  12],   // mijlociul (cel mai înalt)
    [104, 138, 112, 28],   // inelarul
    [122, 144, 136, 62],   // micul deget
  ];

  return (
    <div className="relative animate-float">
      {/* Glow difuz în spate */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 bg-signa-500/15 rounded-full blur-3xl" />
      </div>

      <svg viewBox="0 0 160 190" width="148" height="176" className="relative overflow-visible">
        {/* Palma */}
        <rect x="20" y="132" width="118" height="46" rx="23"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1.5"
        />

        {/* Degete — linii groase cu capete rotunjite */}
        {fingers.map(([x1,y1,x2,y2], i) => (
          <line key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.13)"
            strokeWidth="13"
            strokeLinecap="round"
          />
        ))}

        {/* Halo vârf */}
        {fingers.map(([,, x2, y2], i) => (
          <circle key={`halo-${i}`} cx={x2} cy={y2} r="14"
            fill="rgba(52,211,153,0.1)"
            className="animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}

        {/* Dot vârf */}
        {fingers.map(([,, x2, y2], i) => (
          <circle key={`tip-${i}`} cx={x2} cy={y2} r="7"
            fill="#34d399"
            className="animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}

        {/* Contur interior fiecare deget (linie mai subțire + mai vizibilă) */}
        {fingers.map(([x1,y1,x2,y2], i) => (
          <line key={`inner-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="9"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Separator cu punct ─────────────────────────────────────────── */
function Dot() {
  return <span className="inline-block w-1 h-1 rounded-full bg-slate-700 mx-3 align-middle" />;
}

/* ── Pagina ───────────────────────────────────────────────────── */
export default function HomePage({ onLessons, onStart, onCollect, onTrain }) {
  return (
    <div className="h-full bg-[#070b10] flex flex-col overflow-hidden">

      {/* Linie de brand sus */}
      <div className="h-[2px] bg-gradient-to-r from-signa-500 via-signa-400/30 to-transparent flex-shrink-0" />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 pt-5 flex-shrink-0">
        <span className="text-white font-black text-lg tracking-[0.2em]">SIGNA</span>
        <div className="flex items-center gap-1.5 text-slate-600 text-[11px] tracking-widest uppercase">
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
        <p className="text-slate-600 text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
          Limba Semnelor Române
        </p>

        {/* Titlu */}
        <h1 className="text-[2.6rem] font-black leading-[1.1] tracking-tight mb-4">
          <span className="text-white">Faci un semn.</span><br />
          <span className="text-signa-400">Camera îl înțelege.</span>
        </h1>

        {/* Stats inline */}
        <p className="text-slate-600 text-sm mb-7 flex items-center flex-wrap gap-y-1">
          <span className="text-slate-400 font-semibold">21</span>
          <span className="ml-1">puncte / mână</span>
          <Dot />
          <span className="text-slate-400 font-semibold">100%</span>
          <span className="ml-1">offline</span>
          <Dot />
          <span className="text-slate-400 font-semibold">31</span>
          <span className="ml-1">litere LSR</span>
        </p>

        {/* Butoane */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onLessons}
            className="w-full py-[17px] bg-signa-500 text-white font-bold text-[15px] rounded-2xl
                       active:scale-[0.97] transition-transform duration-100
                       shadow-[0_8px_32px_rgba(16,185,129,0.22)]"
          >
            Începe lecțiile
          </button>

          <button
            onClick={onStart}
            className="w-full py-[15px] text-white/80 font-semibold text-sm rounded-2xl
                       border border-white/10 hover:border-white/25 hover:text-white
                       active:scale-[0.97] transition-all duration-150"
          >
            Antrenament liber
          </button>

          <div className="flex justify-center gap-6">
            <button
              onClick={onCollect}
              className="py-2 text-slate-600 hover:text-slate-400 font-medium text-xs
                         transition-colors duration-150"
            >
              Colectare date
            </button>
            <button
              onClick={onTrain}
              className="py-2 text-slate-600 hover:text-slate-400 font-medium text-xs
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
