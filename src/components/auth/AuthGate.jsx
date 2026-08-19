import { useState } from 'react';
import AuthPanel from './AuthPanel';
import { MessageBanner } from './AuthUi';

const LEARNERS = [
  { initials: 'MP', bg: 'bg-signa-500', text: 'text-white' },
  { initials: 'AD', bg: 'bg-signa-400', text: 'text-signa-900' },
  { initials: 'IR', bg: 'bg-signa-100', text: 'text-signa-900' },
];

/** Coloana de brand — doar desktop, pur decorativă. */
function BrandColumn() {
  return (
    <div
      className="hidden md:flex flex-col justify-between relative overflow-hidden p-12 lg:p-[52px]
        bg-gradient-to-br from-signa-900 via-[#065f46] to-signa-600"
    >
      <div
        aria-hidden
        className="absolute -top-[120px] -right-[120px] w-[420px] h-[420px] rounded-full blur-[50px] animate-glow"
        style={{ background: 'radial-gradient(circle, rgba(52,211,153,.55) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-[88px] -left-[68px] w-[320px] h-[320px] rounded-full blur-[46px]"
        style={{ background: 'radial-gradient(circle, rgba(255,251,243,.22) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-center gap-3">
        <img src="/icon.svg" alt="" className="w-10 h-10 rounded-xl" />
        <span className="text-white font-black text-[17px] tracking-[.16em]">SIGNA</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-white font-black text-[42px] leading-[1.12] tracking-[-.02em]">
          Învață Limba Semnelor Române, semn cu semn.
        </h2>
        <p className="mt-5 text-[16px] leading-relaxed text-cream/70">
          Camera și semnele rămân pe dispozitivul tău. În cloud salvăm doar profilul și progresul.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          {['Recunoaștere în timp real', 'Lecții + progres'].map((pill) => (
            <span
              key={pill}
              className="rounded-full px-3.5 py-2 text-[12.5px] font-bold text-signa-100
                bg-white/[0.12] border border-white/[0.18]"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex">
          {LEARNERS.map((a, i) => (
            <span
              key={a.initials}
              className={`w-[30px] h-[30px] rounded-full border-2 border-signa-900 flex items-center
                justify-center text-[10px] font-black ${a.bg} ${a.text} ${i > 0 ? '-ml-2.5' : ''}`}
            >
              {a.initials}
            </span>
          ))}
        </div>
        <span className="text-[13px] text-cream/60">
          Peste 1.200 de semne exersate săptămâna asta
        </span>
      </div>
    </div>
  );
}

/**
 * Ecran full-screen de autentificare — blocat până la login/signup.
 * Desktop: split-screen brand + formular. Mobil: doar formularul.
 */
export default function AuthGate() {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

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
