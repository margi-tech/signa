import BrandMark from './BrandMark.jsx';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/* Plăcuța rămâne albă și pe tema întunecată: pe verdele de brand arată ca
   iconița aplicației, nu ca un card. Stil inline → neatins de signa-theme. */
const WHITE_TILE = { background: 'linear-gradient(150deg,#ffffff 20%,#ecfdf5)' };

/** Sigla în inelul care pulsează — nucleul comun al ecranelor de încărcare. */
function RingedMark({ size, radius, light = true }) {
  const ring = light ? 'border-white/45' : 'border-signa-500/55';
  return (
    <span className="relative flex-none" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className={`absolute inset-0 border-2 ${ring}`}
        style={{ borderRadius: radius, animation: `sg-pulse-ring 2.6s ${EASE} infinite` }}
      />
      <span
        aria-hidden
        className={`absolute inset-0 border-2 ${ring}`}
        style={{ borderRadius: radius, animation: `sg-pulse-ring 2.6s ${EASE} 1.3s infinite` }}
      />
      <BrandMark
        className="relative w-full h-full shadow-[0_18px_40px_rgba(4,44,32,.35)]"
        style={{ ...WHITE_TILE, borderRadius: radius }}
      />
    </span>
  );
}

/**
 * Ecranul verde de brand cu sigla încercuită — același gradient ca pagina de
 * login. Folosit oriunde aplicația așteaptă ceva pe tot ecranul (sesiunea la
 * pornire, accesul la unelte). `index.html` are o copie statică a lui, afișată
 * înainte să pornească React-ul.
 */
export default function SplashScreen({ label = 'Se încarcă…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="h-full relative overflow-hidden flex flex-col items-center justify-center gap-7
        bg-[linear-gradient(135deg,#064e3b,#065f46_55%,#059669)]"
    >
      <span
        aria-hidden
        className="absolute -top-[140px] -right-[120px] w-[440px] h-[440px] rounded-full blur-[56px] sg-aurora-a"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,.55) 0%, transparent 70%)' }}
      />
      <span
        aria-hidden
        className="absolute -bottom-[110px] -left-[90px] w-[360px] h-[360px] rounded-full blur-[50px] sg-aurora-b"
        style={{ background: 'radial-gradient(circle, rgba(255,251,243,.2) 0%, transparent 70%)' }}
      />

      <span className="relative" style={{ animation: `sg-scale-in .6s ${EASE} both` }}>
        <RingedMark size={104} radius={30} />
      </span>

      <div className="relative flex flex-col items-center gap-3" style={{ animation: `sg-fade-up .7s ${EASE} .12s both` }}>
        <span className="text-white font-black text-[22px] tracking-[.32em] pl-[.32em]">SIGNA</span>
        <span className="relative w-[120px] h-[4px] rounded-full bg-white/[.16] overflow-hidden">
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[45%] rounded-full bg-[#6ee7b7]"
            style={{ animation: 'sg-sheen 1.4s cubic-bezier(.4,0,.2,1) infinite' }}
          />
        </span>
        <span className="text-[13px] font-bold text-white/70">{label}</span>
      </div>
    </div>
  );
}

/**
 * Varianta compactă — sigla încercuită + text, pentru încărcări în interiorul
 * unui ecran (detectoarele camerei, profilul). `tone="dark"` pe fundal închis.
 */
export function BrandLoader({ label = 'Se încarcă…', tone = 'light', size = 64 }) {
  const dark = tone === 'dark';
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4">
      <RingedMark size={size} radius={Math.round(size * 0.29)} light={dark} />
      <p className={`text-[13px] font-bold ${dark ? 'text-white/75' : 'text-ink-500'}`}>{label}</p>
    </div>
  );
}
