import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/* Paleta cadrului final din clipul de prezentare. Totul e inline: e o
   identitate de brand, arată la fel în tema deschisă și în cea întunecată
   (postcss/signa-theme.js nu atinge stilurile inline). */
const STAGE_BG = 'radial-gradient(ellipse 75% 70% at 50% 45%, #0f4b3b 0%, #08382b 52%, #04231b 100%)';
const DISC_BG = 'radial-gradient(circle at 34% 28%, #3a937a 0%, #17654f 38%, #0d4a3a 72%, #0a3f31 100%)';
const RING = '#34d399';
const LOGO_GLOW = 'drop-shadow(0 0 1px #34d399) drop-shadow(0 0 7px rgba(52,211,153,.7))';

/* Cercul din viewBox 100×100 — r=48 lasă loc grosimii și strălucirii. */
const R = 48;
const CIRC = 2 * Math.PI * R;

/**
 * Sigla în discul verde, înconjurată de inel — semnul de final din clip.
 *
 * `ring`:
 *  - `spin`  — un arc care se rotește pe cerc (încărcare);
 *  - `draw`  — inelul se desenează o dată, ca în clip (bun venit);
 *  - `full`  — inel complet, static.
 */
export function LogoOrb({ size = 168, ring = 'spin', delay = 0 }) {
  const stroke = Math.max(1.4, 220 / size);
  return (
    <span className="relative block flex-none" style={{ width: size, height: size }}>
      {/* Halou verde în spatele discului */}
      <span
        aria-hidden
        className="absolute -inset-[18%] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,.32), transparent 66%)',
          animation: 'sg-ring-glow 3.2s ease-in-out infinite',
        }}
      />
      <span
        className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: DISC_BG,
          boxShadow: '0 18px 50px rgba(0,0,0,.35), inset 0 0 0 1px rgba(110,231,183,.18)',
        }}
      >
        {/* Reflexia sticloasă din stânga-sus */}
        <span
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '6%', left: '10%', width: '58%', height: '44%',
            background: 'radial-gradient(ellipse at 40% 40%, rgba(255,255,255,.16), transparent 70%)',
          }}
        />
        <img
          src="/logo.png"
          alt=""
          draggable={false}
          className="relative h-[62%] w-auto select-none"
          style={{ filter: LOGO_GLOW }}
        />
      </span>

      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{
          transform: 'rotate(-90deg)',
          filter: 'drop-shadow(0 0 3px rgba(52,211,153,.75))',
        }}
      >
        {ring === 'spin' ? (
          <>
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(52,211,153,.22)" strokeWidth={stroke} />
            <g style={{ transformOrigin: '50px 50px', animation: 'sg-spin 1.15s linear infinite' }}>
              <circle
                cx="50" cy="50" r={R} fill="none" stroke={RING} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${CIRC * 0.28} ${CIRC}`}
              />
            </g>
          </>
        ) : (
          <circle
            cx="50" cy="50" r={R} fill="none" stroke={RING} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={CIRC}
            style={ring === 'draw' ? {
              '--sg-ring-from': String(CIRC),
              '--sg-ring-to': '0',
              animation: `sg-ring-draw 1.5s ${EASE} ${delay}s both`,
            } : undefined}
          />
        )}
      </svg>
    </span>
  );
}

function Signature({ style }) {
  return (
    <p
      className="text-[13px] font-extrabold tracking-[.2em] text-white/85 whitespace-nowrap"
      style={style}
    >
      SIGNA <span className="mx-2 text-white/40">|</span>
      <span className="font-bold tracking-[.06em] normal-case">signa-lsr.online</span>
    </p>
  );
}

/**
 * Ecranul de încărcare pe tot ecranul — cadrul final din clip, cu un arc care
 * se rotește pe inel. `index.html` are o copie statică (`.sg-boot`), afișată
 * cât se descarcă JS-ul.
 */
export default function SplashScreen({ label = 'Se încarcă…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="h-full relative overflow-hidden flex flex-col items-center justify-center gap-8"
      style={{ background: STAGE_BG }}
    >
      <span style={{ animation: `sg-scale-in .6s ${EASE} both` }}>
        <LogoOrb size={168} ring="spin" />
      </span>
      <div className="flex flex-col items-center gap-2" style={{ animation: `sg-fade-up .7s ${EASE} .15s both` }}>
        <Signature />
        <span className="text-[12.5px] font-bold text-white/55">{label}</span>
      </div>
    </div>
  );
}

/**
 * Varianta compactă, pentru încărcări în interiorul unui ecran (camera,
 * profilul). `tone="dark"` = text deschis, pe fundal închis.
 */
export function BrandLoader({ label = 'Se încarcă…', tone = 'light', size = 72 }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4">
      <LogoOrb size={size} ring="spin" />
      <p className={`text-[13px] font-bold ${tone === 'dark' ? 'text-white/75' : 'text-ink-500'}`}>{label}</p>
    </div>
  );
}

const INTRO_MS = 4300;

/**
 * Animația de bun venit după crearea contului — ultimul cadru din clip:
 * discul apare, inelul se desenează, semnătura urcă, apoi totul se stinge.
 * Click/tastă = sari peste.
 */
export function WelcomeIntro({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), INTRO_MS - 650);
    const done = setTimeout(onDone, INTRO_MS);
    const skip = () => onDone();
    window.addEventListener('keydown', skip);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);

  return createPortal(
    <div
      role="dialog"
      aria-label="Bine ai venit în Signa"
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-9 cursor-pointer"
      style={{
        background: STAGE_BG,
        opacity: leaving ? 0 : 1,
        transition: 'opacity .65s ease',
        animation: 'sg-fade-in .5s ease both',
      }}
    >
      <span style={{ animation: `sg-scale-in .9s ${EASE} .15s both` }}>
        <LogoOrb size={220} ring="draw" delay={0.45} />
      </span>
      <Signature style={{ animation: `sg-fade-up .8s ${EASE} 1.55s both` }} />
    </div>,
    document.body,
  );
}
