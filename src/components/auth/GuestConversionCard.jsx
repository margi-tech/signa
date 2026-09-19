import { useEffect, useRef, useState } from 'react';
import { AuthInput, LockIcon, MailIcon, MessageBanner } from './AuthUi';
import { ArrowIcon, ChartIcon, RepeatIcon, UserIcon, UsersIcon } from '../icons.jsx';
import { useCountUp } from '../../hooks/useCountUp';
import { useAuthForm } from './useAuthForm';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/** Inelul de XP are r=48, deci circumferința 302. */
const RING_C = 302;

const PERKS = [
  { icon: ChartIcon, label: 'Locul în clasament', delay: '.56s' },
  { icon: UsersIcon, label: 'Prieteni și urmăriri', delay: '.64s' },
  { icon: RepeatIcon, label: 'Progres sincronizat', delay: '.72s' },
  { icon: UserIcon, label: 'Poză și nume', delay: '.8s' },
];

/** Plăcuțele LSR din colțul panoului verde — pur decorative. */
const TILES = [
  { letter: 'A', size: 48, radius: 16, font: 21, top: 14, right: 18, rot: -8, dur: '7.5s', delay: '0s' },
  { letter: 'B', size: 36, radius: 12, font: 16, top: 70, right: 74, rot: 10, dur: '9.5s', delay: '.8s' },
];

/** Regulile de putere a parolei din handoff — separate de PasswordStrength. */
function strengthOf(password) {
  if (!password) return { width: '0%', bar: 'bg-amber-500', label: 'Minim 8 caractere' };
  if (password.length < 8) return { width: '33%', bar: 'bg-amber-500', label: 'Minim 8 caractere' };
  if (/[^\p{L}]/u.test(password)) return { width: '100%', bar: 'bg-signa-600', label: 'Puternică' };
  return { width: '68%', bar: 'bg-signa-400', label: 'Bună' };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-[13.5px] font-bold text-ink-700 mb-1.5">{label}</span>
      {children}
      {error
        ? <span className="block text-[12px] font-semibold text-red-600 mt-1.5">{error}</span>
        : hint && <span className="block text-[12px] text-ink-400 mt-1.5">{hint}</span>}
    </label>
  );
}

/**
 * Cardul de conversie al invitatului: panoul verde cu progresul local lângă
 * formularul de cont. Layout nou peste fluxul existent — câmpurile, validările
 * și submit-ul vin din `useAuthForm`, la fel ca în AuthPanel.
 *
 * `afterAuth` rămâne gol intenționat: conversia progresului o face handler-ul
 * de `SIGNED_IN` din useProgress, iar un al doilea scriitor ar putea salva
 * progresul contului în slate-ul de invitat (vezi docs/guest-mode.md §6.1).
 */
export default function GuestConversionCard({
  xp, level, xpIntoLevel, xpNeeded, lessonsCount, onExitGuest,
}) {
  const [mode, setMode] = useState('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const {
    email, setEmail,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    username, setUsername,
    fieldErrors,
    submitLogin, submitSignup,
  } = useAuthForm({
    onBusy: setBusy,
    onMessage: setBanner,
    afterAuth: async () => {},
    requireConfirm: false,
  });

  const signup = mode === 'signup';
  const xpShown = useCountUp(xp, { duration: 1400, delay: 0 });
  const pct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;
  const ringTo = Math.round(RING_C * (1 - pct));
  const strength = strengthOf(password);
  const lessonsLabel = plural(lessonsCount, 'lecție', 'lecții');

  /* Indicatorul de tab își ia lățimea și poziția din DOM — etichetele au
     lungimi diferite, iar Nunito se încarcă după primul cadru. */
  const tabRefs = { signup: useRef(null), login: useRef(null) };
  const [tab, setTab] = useState({ w: 0, x: 0 });
  useEffect(() => {
    const measure = () => {
      const el = tabRefs[mode].current;
      if (el) setTab({ w: el.offsetWidth, x: el.offsetLeft });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mode]);

  return (
    <div>
      <p
        className="text-[12px] font-extrabold uppercase tracking-[.22em] text-ink-400"
        style={{ animation: `sg-fade-up .7s ${EASE} both` }}
      >
        Profil · Modul invitat
      </p>
      <h1
        className="mt-1.5 text-[1.9rem] lg:text-[2.4rem] font-black text-ink-900 tracking-[-.02em] leading-[1.1]"
        style={{ animation: `sg-fade-up .8s ${EASE} .06s both` }}
      >
        Ai deja{' '}
        <span className="relative whitespace-nowrap tabular-nums">
          {xp} XP
          <span
            aria-hidden
            className="absolute left-0 right-0 bottom-[2px] h-[7px] rounded bg-signa-400/50 sg-underline"
            style={{ transformOrigin: 'left', animationDelay: '.9s', animationDuration: '.9s' }}
          />
        </span>{' '}
        de mutat pe cont.
      </h1>
      <p
        className="mt-2 max-w-[520px] text-[14px] font-semibold text-ink-500 leading-[1.5]"
        style={{ animation: `sg-fade-up .8s ${EASE} .14s both` }}
      >
        Creează contul și lecțiile strânse pe acest dispozitiv se mută singure.
        Nu pierzi nimic — seria de zile pornește odată cu contul.
      </p>

      <div
        className="mt-6 grid grid-cols-1 lg:grid-cols-[352px_1fr] rounded-[26px] overflow-hidden
          border border-ink-900/[.07] shadow-[0_18px_50px_rgba(46,42,36,.12)]"
        style={{ animation: `sg-fade-up .9s ${EASE} .2s both` }}
      >
        {/* ── Panoul verde: cine ești și ce ai de mutat ───────────────── */}
        <div className="relative overflow-hidden px-7 py-[30px]
          bg-[linear-gradient(160deg,#064e3b,#065f46_52%,#059669)]">
          <span
            aria-hidden
            className="absolute -top-[120px] -right-[120px] w-[360px] h-[360px] rounded-full blur-[50px] sg-aurora-a"
            style={{ background: 'radial-gradient(circle, rgba(52,211,153,.55) 0%, transparent 70%)' }}
          />
          <span
            aria-hidden
            className="absolute -bottom-[88px] -left-[68px] w-[300px] h-[300px] rounded-full blur-[46px] sg-aurora-b"
            style={{ background: 'radial-gradient(circle, rgba(255,251,243,.22) 0%, transparent 70%)' }}
          />
          <span
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
          {TILES.map((t) => (
            <span
              key={t.letter}
              aria-hidden
              className="absolute flex items-center justify-center font-black text-signa-100
                bg-white/10 border border-white/[.18] backdrop-blur-[6px] sg-float"
              style={{
                top: t.top,
                right: t.right,
                width: t.size,
                height: t.size,
                borderRadius: t.radius,
                fontSize: t.font,
                '--r': `${t.rot}deg`,
                animationDuration: t.dur,
                animationDelay: t.delay,
              }}
            >
              {t.letter}
            </span>
          ))}

          <div className="relative flex flex-col h-full">
            <div
              className="flex items-center gap-3"
              style={{ animation: `sg-fade-right .7s ${EASE} .3s both` }}
            >
              <span
                className="relative w-14 h-14 flex-none"
                style={{ animation: 'sg-pop-avatar .78s cubic-bezier(.34,1.5,.64,1) .34s both' }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-signa-400/70"
                  style={{ animation: `sg-pulse-ring 3.4s ${EASE} infinite` }}
                />
                <span className="absolute inset-0 rounded-full bg-white/[.14] flex items-center
                  justify-center text-signa-100">
                  <UserIcon width="26" height="26" />
                </span>
              </span>
              <span>
                <span className="block text-white font-black text-[19px] tracking-[-.01em]">Invitat</span>
                <span className="block mt-0.5 text-[12.5px] font-bold text-[rgba(255,251,243,.66)]">
                  Progres doar pe acest dispozitiv
                </span>
              </span>
            </div>

            <div
              className="mt-[26px] flex items-center gap-[18px]"
              style={{ animation: `sg-fade-up .8s ${EASE} .42s both` }}
            >
              <span className="relative w-[104px] h-[104px] flex-none">
                <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
                  <circle cx="52" cy="52" r="48" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="8" />
                  <circle
                    cx="52" cy="52" r="48" fill="none" stroke="#34d399" strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringTo}
                    style={{
                      '--sg-ring-from': RING_C,
                      '--sg-ring-to': ringTo,
                      animation: `sg-ring-draw 1.4s ${EASE} .6s both`,
                    }}
                  />
                </svg>
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-white font-black text-2xl leading-none tabular-nums">{xpShown}</span>
                  <span className="mt-[3px] text-[10.5px] font-extrabold tracking-[.14em] text-[rgba(255,251,243,.6)]">
                    XP
                  </span>
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-white font-black text-[15px]">Nivel {level}</span>
                <span className="block mt-[3px] text-[12.5px] font-bold text-[rgba(255,251,243,.66)] tabular-nums">
                  {lessonsLabel} pregătite pentru transfer
                </span>
                <span className="flex gap-[5px] mt-2.5">
                  {[0, 1, 2, 3].map((i) => {
                    const filled = i < Math.round(pct * 4);
                    return (
                      <span
                        key={i}
                        className={`w-[26px] h-[5px] rounded-full ${filled ? 'bg-signa-400 sg-underline' : 'bg-white/20'}`}
                        style={filled
                          ? { transformOrigin: 'left', animationDuration: '.5s', animationDelay: `${0.9 + i * 0.1}s` }
                          : undefined}
                      />
                    );
                  })}
                </span>
              </span>
            </div>

            <div aria-hidden className="mt-7 h-px bg-white/[.14]" />

            <p
              className="mt-[18px] mb-3 text-[10.5px] font-extrabold uppercase tracking-[.18em] text-[rgba(209,250,229,.72)]"
              style={{ animation: 'sg-fade-in .6s ease-out .5s both' }}
            >
              Se deblochează cu contul
            </p>
            <ul className="flex flex-col gap-[9px]">
              {PERKS.map(({ icon: Icon, label, delay }) => (
                <li
                  key={label}
                  className="flex items-center gap-[11px] px-3 py-2.5 rounded-[14px]
                    bg-white/10 border border-white/[.16] hover:bg-white/20 hover:translate-x-1
                    transition-[background-color,transform] duration-300"
                  style={{
                    animation: `sg-fade-up .7s ${EASE} ${delay} both`,
                    transitionTimingFunction: EASE,
                  }}
                >
                  <span className="flex text-signa-400"><Icon width="17" height="17" /></span>
                  <span className="text-white font-extrabold text-[13px]">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Panoul alb: formularul ──────────────────────────────────── */}
        <div className="bg-white px-8 pt-[30px] pb-8">
          <div className="relative flex gap-[22px] border-b border-ink-900/[.06]">
            {[
              { key: 'signup', label: 'Cont nou' },
              { key: 'login', label: 'Am deja cont' },
            ].map(({ key, label }) => (
              <button
                key={key}
                ref={tabRefs[key]}
                type="button"
                onClick={() => setMode(key)}
                className={`flex-none whitespace-nowrap pb-[11px] text-[14px] font-bold
                  transition-colors duration-200 ease-out
                  ${mode === key ? 'text-ink-900' : 'text-ink-400'}`}
              >
                {label}
              </button>
            ))}
            <span
              aria-hidden
              className="absolute bottom-0 left-0 h-0.5 bg-signa-500"
              style={{
                width: tab.w,
                transform: `translateX(${tab.x}px)`,
                transition: `transform .42s ${EASE}, width .42s ${EASE}`,
              }}
            />
          </div>

          <h2 className="mt-[22px] text-[27px] font-black text-ink-900 tracking-[-.02em] leading-[1.15]">
            {signup ? 'Creează-ți contul' : 'Bine ai revenit'}
          </h2>
          <p className="mt-1.5 text-[14px] font-semibold text-ink-500 leading-[1.5]">
            {signup
              ? 'Un minut, și progresul de invitat devine al contului tău.'
              : 'Intră în cont — progresul de invitat se mută automat.'}
          </p>

          <div className="mt-5 flex flex-col gap-3.5">
            <div
              className="overflow-hidden"
              aria-hidden={!signup}
              style={{
                maxHeight: signup ? 232 : 0,
                opacity: signup ? 1 : 0,
                pointerEvents: signup ? 'auto' : 'none',
                transition: `max-height .5s ${EASE}, opacity .35s ease-out`,
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prenume" error={fieldErrors.firstName}>
                  <AuthInput
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Maria"
                    autoComplete="given-name"
                    error={fieldErrors.firstName}
                  />
                </Field>
                <Field label="Nume" error={fieldErrors.lastName}>
                  <AuthInput
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Popescu"
                    autoComplete="family-name"
                    error={fieldErrors.lastName}
                  />
                </Field>
              </div>
              <div className="mt-3.5">
                <Field
                  label="Username"
                  hint="Așa te vor găsi prietenii în Signa."
                  error={fieldErrors.username}
                >
                  <AuthInput
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="maria.pop"
                    autoComplete="username"
                    error={fieldErrors.username}
                  />
                </Field>
              </div>
            </div>

            <Field label="Email" error={fieldErrors.email}>
              <AuthInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@gmail.com"
                autoComplete="email"
                error={fieldErrors.email}
                icon={<MailIcon />}
              />
            </Field>

            <Field label="Parolă" error={fieldErrors.password}>
              <span className="relative block">
                <AuthInput
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  error={fieldErrors.password}
                  icon={<LockIcon />}
                  className="!pr-[74px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-extrabold
                    text-ink-400 hover:text-ink-700 transition-colors"
                >
                  {showPassword ? 'Ascunde' : 'Arată'}
                </button>
              </span>
              <span
                className="block overflow-hidden"
                style={{
                  maxHeight: password ? 42 : 0,
                  opacity: password ? 1 : 0,
                  transition: `max-height .35s ${EASE}, opacity .3s ease-out`,
                }}
              >
                <span className="block h-[5px] rounded-full bg-ink-900/[.08] mt-2 overflow-hidden">
                  <span
                    className={`block h-full rounded-full ${strength.bar}`}
                    style={{
                      width: strength.width,
                      transition: `width .45s ${EASE}, background-color .3s ease-out`,
                    }}
                  />
                </span>
                <span className="block text-[12px] text-ink-400 mt-[5px]">{strength.label}</span>
              </span>
            </Field>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={signup ? submitSignup : submitLogin}
            className="relative overflow-hidden w-full mt-5 rounded-[18px] py-[18px] text-[15.5px]
              font-extrabold text-white bg-[linear-gradient(180deg,#10b981,#059669)]
              shadow-[0_10px_24px_rgba(16,185,129,.3)] disabled:opacity-60
              transition-[transform,box-shadow] duration-[160ms] ease-out
              hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,185,129,.38)]
              active:scale-[.985] disabled:hover:translate-y-0"
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-[38%]"
              style={{
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)',
                animation: 'sg-sheen 3.6s cubic-bezier(.4,0,.2,1) infinite',
              }}
            />
            <span className="relative flex items-center justify-center gap-2.5">
              {busy
                ? (signup ? 'Se creează…' : 'Se conectează…')
                : (signup ? 'Creează cont' : 'Intră în cont')}
              <ArrowIcon width="18" height="18" />
            </span>
          </button>

          {banner && <div className="mt-3.5"><MessageBanner tone={banner.tone}>{banner.text}</MessageBanner></div>}

          <div className="mt-3.5 flex items-center gap-2.5 px-3.5 py-3 rounded-[14px]
            bg-signa-50 border border-signa-500/[.18]">
            <span className="flex flex-none text-[#047857]"><RepeatIcon width="17" height="17" /></span>
            <span className="text-[12.5px] font-bold text-[#065f46] leading-[1.45] tabular-nums">
              {lessonsLabel} și {xp} XP se mută pe cont imediat după conectare.
            </span>
          </div>

          <div className="mt-[22px] pt-[18px] border-t border-ink-900/[.06] flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onExitGuest}
              className="w-full py-3 rounded-2xl text-[13.5px] font-bold border border-ink-900/[.08]
                bg-white text-ink-700 hover:bg-cream-100 transition-colors duration-200 ease-out
                disabled:opacity-50"
            >
              Ieși din modul invitat
            </button>
            <p className="mt-0.5 text-center text-[12px] font-semibold text-ink-400">
              Progresul rămâne pe dispozitiv — poți reveni oricând.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
