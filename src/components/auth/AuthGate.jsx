import { useEffect, useState } from 'react';
import AuthPanel from './AuthPanel';
import { MessageBanner } from './AuthUi';

const LEARNERS = [
  { initials: 'MP', bg: 'bg-signa-500', text: 'text-white' },
  { initials: 'AD', bg: 'bg-signa-400', text: 'text-signa-900' },
  { initials: 'IR', bg: 'bg-signa-100', text: 'text-signa-900' },
];

/** Plăcuțe LSR care plutesc în spatele textului — pur decorative. */
const TILES = [
  { letter: 'A', size: 64, top: '12%', left: '66%', rot: -8,  dur: '7.5s',  delay: '0s'   },
  { letter: 'B', size: 48, top: '30%', left: '84%', rot: 10,  dur: '9.5s',  delay: '.8s'  },
  { letter: 'C', size: 56, top: '58%', left: '72%', rot: 5,   dur: '8.5s',  delay: '1.6s' },
  { letter: 'D', size: 40, top: '74%', left: '86%', rot: -12, dur: '11s',   delay: '.4s'  },
  { letter: 'E', size: 36, top: '46%', left: '58%', rot: 14,  dur: '10s',   delay: '2.2s' },
];

const SIGNS_TOTAL = 1200;

/** Count-up 0 → 1200. Pornește de la valoarea finală ca să nu rămână pe 0. */
function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
      else setValue(target);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/** Coloana de brand — doar desktop, pur decorativă. */
function BrandColumn() {
  const signs = useCountUp(SIGNS_TOTAL);

  return (
    <div
      className="hidden md:flex flex-col justify-between relative overflow-hidden p-12 lg:p-[52px]
        bg-gradient-to-br from-signa-900 via-[#065f46] to-signa-600"
    >
      <div
        aria-hidden
        className="absolute -top-[120px] -right-[120px] w-[420px] h-[420px] rounded-full blur-[50px] sg-aurora-a"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,.55) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-[88px] -left-[68px] w-[320px] h-[320px] rounded-full blur-[46px] sg-aurora-b"
        style={{ background: 'radial-gradient(circle, rgba(255,251,243,.22) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute top-[34%] left-[38%] w-[300px] h-[300px] rounded-full blur-[58px] sg-aurora-c"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,.5) 0%, transparent 72%)' }}
      />

      <div
        aria-hidden
        className="absolute inset-0 opacity-[.16]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),'
            + 'linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 60% 40%, #000, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 60% 40%, #000, transparent 75%)',
        }}
      />

      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {TILES.map((t) => (
          <div
            key={t.letter}
            className="absolute flex items-center justify-center rounded-[20px] font-black text-signa-100
              bg-white/10 border border-white/[.18] backdrop-blur-[6px]
              shadow-[0_18px_40px_rgba(4,44,32,.28)] sg-float"
            style={{
              top: t.top,
              left: t.left,
              width: t.size,
              height: t.size,
              fontSize: Math.round(t.size * 0.44),
              '--r': `${t.rot}deg`,
              animationDuration: t.dur,
              animationDelay: t.delay,
            }}
          >
            {t.letter}
          </div>
        ))}
      </div>

      <div className="relative flex items-center gap-3 sg-fade-right">
        <div className="relative w-10 h-10 flex-shrink-0">
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl border-2 border-signa-400/70 sg-pulse-ring"
          />
          <img src="/icon.svg" alt="" className="w-10 h-10 rounded-xl" />
        </div>
        <span className="text-white font-black text-[17px] tracking-[.16em]">SIGNA</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-white font-black text-[42px] leading-[1.12] tracking-[-.02em]">
          <span className="block sg-fade-up" style={{ animationDelay: '.1s' }}>Învață Limba</span>
          <span className="block sg-fade-up" style={{ animationDelay: '.22s' }}>Semnelor Române,</span>
          <span
            className="inline-block relative whitespace-nowrap sg-fade-up"
            style={{ animationDelay: '.34s' }}
          >
            semn cu semn.
            <span
              aria-hidden
              className="absolute left-0 right-0 bottom-[2px] h-[6px] rounded sg-underline"
              style={{ background: 'rgba(52,211,153,.55)' }}
            />
          </span>
        </h2>
        <p
          className="mt-5 text-[16px] leading-relaxed text-cream/70 sg-fade-up"
          style={{ animationDelay: '.5s' }}
        >
          Camera și semnele rămân pe dispozitivul tău. În cloud salvăm doar profilul și progresul.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <span
            className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-bold text-signa-100
              bg-white/[0.12] border border-white/[0.18] sg-fade-up transition-[background-color,transform]
              duration-300 hover:bg-white/20 hover:-translate-y-0.5"
            style={{ animationDelay: '.62s' }}
          >
            <span aria-hidden className="w-[7px] h-[7px] rounded-full bg-signa-400 sg-dot-ring" />
            Recunoaștere în timp real
          </span>
          <span
            className="rounded-full px-3.5 py-2 text-[12.5px] font-bold text-signa-100
              bg-white/[0.12] border border-white/[0.18] sg-fade-up transition-[background-color,transform]
              duration-300 hover:bg-white/20 hover:-translate-y-0.5"
            style={{ animationDelay: '.72s' }}
          >
            Lecții + progres
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-3 sg-fade-up" style={{ animationDelay: '.85s' }}>
        <div className="flex">
          {LEARNERS.map((a, i) => (
            <span
              key={a.initials}
              className={`w-[30px] h-[30px] rounded-full border-2 border-signa-900 flex items-center
                justify-center text-[10px] font-black transition-transform duration-[250ms]
                hover:-translate-y-1 ${a.bg} ${a.text} ${i > 0 ? '-ml-2.5' : ''}`}
            >
              {a.initials}
            </span>
          ))}
        </div>
        <span className="text-[13px] text-cream/60">
          Peste {signs.toLocaleString('ro-RO')} de semne exersate săptămâna asta
        </span>
      </div>
    </div>
  );
}

/**
 * Ecran full-screen de autentificare — blocat până la login/signup.
 * Desktop: split-screen brand + formular. Mobil: doar formularul.
 */
export default function AuthGate({ initialMode = 'login', onRecoveryComplete }) {
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div
        className="h-[3px] flex-shrink-0 sg-topbar"
        style={{
          backgroundImage:
            'linear-gradient(90deg, #34d399, rgba(16,185,129,.4), transparent,'
            + ' #34d399, rgba(16,185,129,.4), transparent)',
        }}
      />

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.05fr_1fr]">
        <BrandColumn />

        <div className="flex flex-col justify-center overflow-y-auto scrollbar-hide bg-cream px-5 py-8 md:px-10">
          <div className="w-full max-w-[390px] mx-auto space-y-5">
            <div className="md:hidden text-center space-y-2">
              <img src="/icon.svg" alt="" className="w-[60px] h-[60px] rounded-2xl mx-auto" />
              <div>
                <h1 className="text-ink-900 font-black text-2xl tracking-tight">SIGNA</h1>
                <p className="text-ink-500 text-sm mt-0.5">Limba Semnelor Române</p>
              </div>
            </div>

            {banner && <MessageBanner tone={banner.tone}>{banner.text}</MessageBanner>}

            <AuthPanel
              mode={mode}
              onModeChange={setMode}
              busy={busy}
              onBusy={setBusy}
              onMessage={setBanner}
              afterAuth={async () => {}}
              onRecoveryComplete={onRecoveryComplete}
            />

            <p className="md:hidden text-center text-ink-400 text-[12.5px] leading-relaxed px-2">
              Camera și semnele rămân pe dispozitiv. În cloud salvăm doar profilul și progresul.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
