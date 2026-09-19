import { useEffect, useRef, useState } from 'react';
import { AuthInput, LockIcon, MailIcon, MessageBanner } from './AuthUi';
import { ArrowIcon, ChartIcon, RepeatIcon, UserIcon, UsersIcon } from '../icons.jsx';
import { useCountUp } from '../../hooks/useCountUp';
import { useAuthForm } from './useAuthForm';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const POP = 'cubic-bezier(.34,1.5,.64,1)';

/** Inelul de nivel: r=30 ⇒ circumferință 189. */
const RING_C = 189;

const EMAIL_ID = 'guest-email';

const PERKS = [
  { icon: ChartIcon, label: 'Clasament', delay: '.72s' },
  { icon: UsersIcon, label: 'Prieteni', delay: '.78s' },
  { icon: RepeatIcon, label: 'Progres sincronizat', delay: '.84s' },
  { icon: UserIcon, label: 'Poză și nume', delay: '.9s' },
];

/** Regulile de putere a parolei din handoff — separate de PasswordStrength. */
function strengthOf(password) {
  if (!password) return { width: '0%', bar: 'bg-amber-500', label: 'Minim 8 caractere' };
  if (password.length < 8) return { width: '33%', bar: 'bg-amber-500', label: 'Minim 8 caractere' };
  if (/[^\p{L}]/u.test(password)) return { width: '100%', bar: 'bg-signa-600', label: 'Puternică' };
  return { width: '68%', bar: 'bg-signa-400', label: 'Bună' };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const anim = (name, dur, delay = 0, ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s both` });

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

/** Chip alb pe verde — același limbaj ca pastilele de pe Acasă. */
function Perk({ icon: Icon, label, delay }) {
  return (
    <span
      className="flex items-center gap-[9px] px-[17px] py-[11px] rounded-xl text-[13.5px] font-bold
        text-[#ECFDF5] bg-white/10 border border-white/[.15]
        hover:bg-white/20 hover:-translate-y-0.5 transition-[background-color,transform] duration-[280ms]"
      style={{ ...anim('sg-pop', 0.5, parseFloat(delay)), transitionTimingFunction: EASE }}
    >
      <Icon width="16" height="16" />
      {label}
    </span>
  );
}

/**
 * Ecranul de invitat: hero verde pe toată lățimea, cu rândul alb de sub el —
 * același limbaj ca pagina Acasă (gradient 125deg + grilă 1.55fr/1fr).
 *
 * Câmpurile, validările și submit-ul vin din `useAuthForm`, la fel ca în
 * AuthPanel. `afterAuth` rămâne gol intenționat: conversia progresului o face
 * handler-ul de `SIGNED_IN` din useProgress, iar un al doilea scriitor ar putea
 * salva progresul contului în slate-ul de invitat (vezi docs/guest-mode.md §6.1).
 */
export default function GuestConversionCard({
  xp, level, xpIntoLevel, xpNeeded, lessonsCount, totalLessons, onExitGuest,
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
  const strength = strengthOf(password);
  const lessonsLabel = plural(lessonsCount, 'lecție', 'lecții');
  const pct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;
  const ringTo = Math.round(RING_C * (1 - pct));
  const xpToNext = Math.max(xpNeeded - xpIntoLevel, 0);
  const lessonsPct = totalLessons > 0 ? Math.min(lessonsCount / totalLessons, 1) : 0;

  /* Butoanele din hero nu fac submit: comută modul și trimit cursorul în
     formularul de mai jos, ca omul să nu-l caute singur. */
  const goMode = (next) => {
    setMode(next);
    requestAnimationFrame(() => document.getElementById(EMAIL_ID)?.focus());
  };

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
      {/* ── Antetul de pagină ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <p
            className="text-[12px] font-extrabold uppercase tracking-[.22em] text-ink-400"
            style={anim('sg-fade-right', 0.6, 0.08)}
          >
            Profil · Modul invitat
          </p>
          <h1
            className="mt-2 text-[2rem] lg:text-[2.6rem] font-black text-ink-900
              tracking-[-.025em] leading-[1.1] text-pretty"
            style={anim('sg-fade-up', 0.7, 0.16)}
          >
            Ai deja{' '}
            <span className="relative whitespace-nowrap tabular-nums">
              {xp} XP
              <span
                aria-hidden
                className="absolute left-0 right-1.5 bottom-1 h-2 rounded bg-signa-400/[.32] sg-underline"
                style={{ transformOrigin: 'left', animationDuration: '.9s', animationDelay: '.9s' }}
              />
            </span>{' '}
            de mutat pe cont.
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-none pt-1.5">
          <span
            className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-full text-[13px] font-extrabold
              bg-cream-100 border border-amber-500/[.18] text-[#b45309]"
            style={anim('sg-scale-in', 0.5, 0.2)}
          >
            <LockIcon size={13} />
            Doar pe acest dispozitiv
          </span>
          <span
            className="px-[17px] py-[9px] rounded-full text-[13px] font-extrabold tabular-nums
              bg-white border border-ink-900/[.08] text-ink-700"
            style={anim('sg-scale-in', 0.5, 0.28)}
          >
            Nv. {level} · {xp} XP
          </span>
        </div>
      </div>

      {/* ── Heroul verde ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden mt-[26px] rounded-3xl lg:rounded-[26px]
          p-[22px] lg:p-[34px_36px] shadow-[0_20px_48px_rgba(8,74,52,.24)]
          bg-[linear-gradient(125deg,#0f7d59_0%,#0b6446_58%,#075237_100%)]"
        style={anim('sg-fade-up', 0.75, 0.34)}
      >
        <span
          aria-hidden
          className="absolute -top-[90px] -right-10 w-[300px] h-[300px] rounded-full blur-[46px]
            pointer-events-none sg-aurora-a"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)' }}
        />
        <span
          aria-hidden
          className="absolute -bottom-[110px] left-1/5 w-[280px] h-[280px] rounded-full blur-[50px]
            pointer-events-none sg-aurora-b"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,.18), transparent 72%)' }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[34%] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)',
            animation: 'sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.6s infinite',
          }}
        />

        <div className="relative flex items-start justify-between gap-7">
          <div className="min-w-0">
            <p
              className="mb-3 text-[11.5px] font-extrabold uppercase tracking-[.2em] text-[rgba(209,250,229,.85)]"
              style={anim('sg-fade-right', 0.6, 0.5)}
            >
              Progres local · gata de transfer
            </p>
            <div className="flex items-center gap-3.5" style={anim('sg-fade-up', 0.7, 0.56)}>
              <span
                className="relative w-[52px] h-[52px] flex-none"
                style={anim('sg-pop-avatar', 0.78, 0.6, POP)}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-signa-400/70"
                  style={{ animation: `sg-pulse-ring 3.4s ${EASE} infinite` }}
                />
                <span className="absolute inset-0 rounded-full bg-white/[.14] flex items-center
                  justify-center text-signa-100">
                  <UserIcon width="24" height="24" />
                </span>
              </span>
              <span className="min-w-0">
                <h2 className="text-white text-[1.7rem] lg:text-[2.05rem] font-black tracking-[-.02em] leading-[1.08]">
                  Invitat
                </h2>
                <p className="mt-1 text-[13.5px] font-bold text-[rgba(209,250,229,.66)] tabular-nums">
                  {lessonsLabel} · {xp} XP · încă {xpToNext} XP până la Nv. {level + 1}
                </p>
              </span>
            </div>
          </div>

          <span
            className="hidden sm:flex flex-col items-center gap-2 flex-none"
            style={anim('sg-pop', 0.6, 0.66, POP)}
          >
            <span className="relative w-[78px] h-[78px]">
              <span
                aria-hidden
                className="absolute -inset-1.5 rounded-full blur-[14px] bg-signa-400/[.35]"
                style={{ animation: 'sg-ring-glow 3.4s ease-in-out infinite' }}
              />
              <svg width="78" height="78" viewBox="0 0 78 78" className="relative block -rotate-90">
                <circle cx="39" cy="39" r="30" fill="rgba(255,255,255,.10)" />
                <circle
                  cx="39" cy="39" r="30" fill="none" stroke="#34d399" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={ringTo}
                  style={{
                    '--sg-ring-from': RING_C,
                    '--sg-ring-to': ringTo,
                    animation: `sg-ring-draw 1.3s ${EASE} .7s both`,
                  }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white
                text-[16px] font-black tabular-nums">
                {Math.round(pct * 100)}%
              </span>
            </span>
            <span className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-[rgba(209,250,229,.7)]">
              Spre Nv. {level + 1}
            </span>
          </span>
        </div>

        <p
          className="relative mt-[26px] mb-3 text-[10.5px] font-extrabold uppercase
            tracking-[.2em] text-[rgba(209,250,229,.72)]"
          style={{ animation: 'sg-fade-in .6s ease-out .66s both' }}
        >
          Se deblochează cu contul
        </p>
        <div className="relative flex flex-wrap gap-2.5 mb-[26px]">
          {PERKS.map((p) => <Perk key={p.label} {...p} />)}
        </div>

        <div aria-hidden className="relative h-px bg-white/[.14] mb-[22px]" />

        <div className="relative flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => goMode('signup')}
            className="relative overflow-hidden flex items-center gap-2.5 px-7 py-[17px] rounded-[15px]
              bg-white text-[#0b6446] text-[15px] font-extrabold
              shadow-[0_10px_24px_rgba(4,44,32,.22)]
              transition-[transform,box-shadow] duration-[160ms] ease-out
              hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(4,44,32,.28)] active:scale-[.97]"
            style={anim('sg-fade-up', 0.6, 1)}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-2/5 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg,transparent,rgba(11,100,70,.1),transparent)',
                animation: 'sg-sheen 4.5s cubic-bezier(.4,0,.2,1) 2s infinite',
              }}
            />
            <span className="relative">Creează cont</span>
            <span className="relative flex" style={{ animation: 'sg-arrow 1.8s ease-in-out infinite' }}>
              <ArrowIcon width="16" height="16" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => goMode('login')}
            className="px-[26px] py-[17px] rounded-[15px] text-[15px] font-extrabold text-white
              bg-white/[.12] border border-white/[.16]
              transition-[transform,background-color] duration-[160ms] ease-out
              hover:-translate-y-0.5 hover:bg-white/20 active:scale-[.97]"
            style={anim('sg-fade-up', 0.6, 1.06)}
          >
            Am deja cont
          </button>
        </div>
      </div>

      {/* ── Rândul alb ─────────────────────────────────────────────── */}
      <div className="mt-[22px] grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[22px] items-start">

        <div
          className="bg-white border border-ink-900/[.05] rounded-[26px] px-8 pt-[30px] pb-8
            shadow-[0_10px_30px_rgba(46,42,36,.06)]"
          style={anim('sg-fade-up', 0.75, 0.44)}
        >
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email" error={fieldErrors.email}>
                <AuthInput
                  id={EMAIL_ID}
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
              </Field>
            </div>

            <div
              className="overflow-hidden"
              style={{
                maxHeight: password ? 42 : 0,
                opacity: password ? 1 : 0,
                transition: `max-height .35s ${EASE}, opacity .3s ease-out`,
              }}
            >
              <div className="h-[5px] rounded-full bg-ink-900/[.08] overflow-hidden">
                <div
                  className={`h-full rounded-full ${strength.bar}`}
                  style={{
                    width: strength.width,
                    transition: `width .45s ${EASE}, background-color .3s ease-out`,
                  }}
                />
              </div>
              <p className="mt-[5px] text-[12px] text-ink-400">{strength.label}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={signup ? submitSignup : submitLogin}
            className="relative overflow-hidden w-full mt-5 rounded-2xl py-[17px] text-[15px]
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

          {banner && <div className="mt-3"><MessageBanner tone={banner.tone}>{banner.text}</MessageBanner></div>}

          <p className="mt-3 text-center text-[12.5px] font-semibold text-ink-400">
            Progresul rămâne pe dispozitiv — poți reveni oricând.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          <div
            className="bg-white border border-ink-900/[.05] rounded-[26px] px-7 py-[30px]
              shadow-[0_10px_30px_rgba(46,42,36,.06)]"
            style={anim('sg-fade-up', 0.75, 0.52)}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-ink-400">
              Ce se mută pe cont
            </p>
            <div className="mt-[18px] grid grid-cols-2 gap-[18px]">
              <div>
                <p className="text-[23px] font-black text-ink-900 leading-none tabular-nums">{xpShown}</p>
                <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                  XP strâns
                </p>
              </div>
              <div>
                <p className="text-[23px] font-black text-ink-900 leading-none tabular-nums">
                  {lessonsCount}<span className="text-[16px] text-ink-400">/{totalLessons}</span>
                </p>
                <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                  Lecții făcute
                </p>
              </div>
            </div>
            <div className="mt-[18px] h-1.5 rounded-full bg-ink-900/[.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#10b981)] sg-underline"
                style={{
                  width: `${lessonsPct * 100}%`,
                  transformOrigin: 'left',
                  animationDuration: '1s',
                  animationDelay: '.8s',
                }}
              />
            </div>
            <div aria-hidden className="h-px bg-ink-900/[.07] mt-5 mb-[18px]" />
            <div className="flex items-start gap-[11px]">
              <span className="flex items-center justify-center w-[30px] h-[30px] flex-none
                rounded-[10px] bg-signa-100 text-[#047857]">
                <RepeatIcon width="16" height="16" />
              </span>
              <p className="text-[13px] font-bold text-ink-700 leading-[1.5]">
                Transferul e automat, la prima conectare. Seria de zile pornește odată cu contul.
              </p>
            </div>
          </div>

          <div
            className="bg-white border border-ink-900/[.05] rounded-[26px] px-7 pt-6 pb-[26px]
              shadow-[0_10px_30px_rgba(46,42,36,.06)]"
            style={anim('sg-fade-up', 0.75, 0.6)}
          >
            <p className="text-[15px] font-black text-ink-900">Nu acum?</p>
            <p className="mt-[5px] text-[13px] font-semibold text-ink-500 leading-[1.5]">
              Poți continua ca invitat — camera și semnele rămân pe dispozitiv.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={onExitGuest}
              className="w-full mt-3.5 py-[13px] rounded-[15px] text-[13.5px] font-bold
                border border-ink-900/[.08] bg-white text-ink-700
                hover:bg-cream-100 hover:-translate-y-px disabled:opacity-50
                transition-[background-color,transform] duration-200 ease-out"
            >
              Ieși din modul invitat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
