import { useState } from 'react';

/** Piese UI pentru Auth + Profil — aliniate la HomePage / LeaderboardPage. */

export function MessageBanner({ tone = 'info', children }) {
  const styles = {
    success: 'bg-signa-50 border-signa-200/60 text-signa-800',
    error: 'text-red-600',
    info: 'text-ink-600',
    warn: 'bg-amber-50 border-amber-200/60 text-amber-900',
  };
  if (tone === 'error' || tone === 'info') {
    return <p className={`text-sm leading-relaxed px-1 ${styles[tone]}`}>{children}</p>;
  }
  return (
    <p className={`text-sm leading-relaxed rounded-2xl border px-4 py-3 ${styles[tone]}`}>
      {children}
    </p>
  );
}

/* ── Iconițe input (inline, fără librării) ─────────────────────────── */

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#A69C8D',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="m3.5 6.5 7.6 5.6a1.5 1.5 0 0 0 1.8 0l7.6-5.6" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="10.5" width="16" height="10.5" rx="3" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </svg>
  );
}

/** `action` = slot aliniat dreapta pe linia label-ului (ex. „Ai uitat parola?”). */
export function AuthField({ label, hint, error, action, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between gap-3">
        <span className="text-ink-700 text-sm font-semibold">{label}</span>
        {action}
      </span>
      {children}
      {error && <span className="block text-red-600 text-xs">{error}</span>}
      {!error && hint && <span className="block text-ink-400 text-xs leading-relaxed">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full bg-white border rounded-2xl text-[15px] font-semibold text-ink-900 placeholder:text-ink-400 '
  + 'placeholder:font-medium focus:outline-none focus:border-signa-500 focus:ring-4 focus:ring-signa-500/[0.14] '
  + 'focus:-translate-y-px transition-[border-color,box-shadow,transform] duration-[180ms] ease-out';

/** `icon` opțional — fără el, padding-ul rămâne cel clasic (folosit în Profil). */
export function AuthInput({ className = '', error, icon, ...props }) {
  const pad = icon ? 'py-4 md:py-[15px] pl-[46px] pr-4' : 'py-4 md:py-[15px] px-4';
  const border = error
    ? 'border-red-300'
    : 'border-[rgba(46,42,36,.10)] hover:border-[rgba(46,42,36,.18)]';
  const field = <input className={`${inputBase} ${pad} ${border} ${className}`} {...props} />;
  if (!icon) return field;
  return (
    <span className="relative block">
      <span className="absolute left-[15px] top-1/2 -translate-y-1/2 flex pointer-events-none">
        {icon}
      </span>
      {field}
    </span>
  );
}

export function PasswordInput({
  value, onChange, placeholder, autoComplete, error, hint, action,
}) {
  const [show, setShow] = useState(false);
  return (
    <AuthField label="Parolă" hint={hint} error={error} action={action}>
      <div className="relative">
        <AuthInput
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          error={error}
          icon={<LockIcon />}
          className="pr-[74px]"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 text-xs font-bold"
          aria-label={show ? 'Ascunde parola' : 'Arată parola'}
        >
          {show ? 'Ascunde' : 'Arată'}
        </button>
      </div>
    </AuthField>
  );
}

/** Nivelele barei de parolă — lățime + culoare + etichetă. */
function strengthLevel(password) {
  if (password.length < 8) return { width: '33%', color: '#f59e0b', label: 'Minim 8 caractere' };
  if (/[^\p{L}]/u.test(password)) return { width: '100%', color: '#059669', label: 'Puternică' };
  return { width: '68%', color: '#34d399', label: 'Bună' };
}

export function PasswordStrength({ password }) {
  const open = Boolean(password);
  const level = strengthLevel(password || '');
  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: open ? 34 : 0,
        opacity: open ? 1 : 0,
        transition: 'max-height .35s cubic-bezier(.22,1,.36,1), opacity .3s ease-out',
      }}
    >
      <div className="pt-1.5 space-y-1">
        <div className="h-[5px] rounded-full bg-ink-900/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: open ? level.width : '0%',
              backgroundColor: level.color,
              transition: 'width .45s cubic-bezier(.22,1,.36,1), background-color .3s ease-out',
            }}
          />
        </div>
        <p className="text-ink-400 text-xs">{level.label}</p>
      </div>
    </div>
  );
}

/** Indicatorul glisează între taburi în loc să fie un border per tab. */
const TAB_INDICATOR = {
  login:  { width: 42, x: 0  },
  signup: { width: 72, x: 64 },
};

export function AuthTabs({ mode, onChange, disabled }) {
  const tabs = [
    { id: 'login', label: 'Intră' },
    { id: 'signup', label: 'Cont nou' },
  ];
  const indicator = TAB_INDICATOR[mode] ?? TAB_INDICATOR.login;
  return (
    <div className="relative flex gap-[22px] border-b border-ink-900/[0.06]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t.id)}
          className={`pb-[11px] text-sm font-semibold transition-colors ${
            mode === t.id ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600'
          }`}
        >
          {t.label}
        </button>
      ))}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] bg-signa-500"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.x}px)`,
          transition: 'transform .42s cubic-bezier(.22,1,.36,1), width .42s cubic-bezier(.22,1,.36,1)',
        }}
      />
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick, type = 'button', busy = false }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="relative overflow-hidden w-full rounded-2xl py-[17px] font-extrabold text-[15px] text-white
        bg-gradient-to-b from-signa-500 to-signa-600 shadow-[0_10px_24px_rgba(16,185,129,.30)]
        transition-[transform,box-shadow] duration-[160ms] ease-out
        hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,185,129,.38)]
        active:scale-[.985] active:translate-y-0
        disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100
        disabled:hover:shadow-[0_10px_24px_rgba(16,185,129,.30)]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[38%] sg-sheen pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)',
        }}
      />
      <span className="relative flex items-center justify-center gap-2.5">
        {busy && (
          <span
            aria-hidden
            className="w-[15px] h-[15px] rounded-full border-2 border-white/35 border-t-white sg-spin"
          />
        )}
        {children}
      </span>
    </button>
  );
}

export function OrSeparator({ label = 'SAU' }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-1 h-px bg-ink-900/[0.09]" />
      <span className="text-[11.5px] font-bold tracking-[.1em] text-ink-400">{label}</span>
      <span className="flex-1 h-px bg-ink-900/[0.09]" />
    </div>
  );
}

function SocialButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-[13px] bg-white
        border border-ink-900/10 font-bold text-[13.5px] text-ink-700
        transition-[transform,box-shadow] duration-[160ms] ease-out
        hover:-translate-y-px hover:shadow-soft active:translate-y-0 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SocialButtons({ onProvider, disabled }) {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:gap-3">
      <SocialButton onClick={() => onProvider('google')} disabled={disabled}>
        <span className="font-black text-[15px] text-[#4285F4]">G</span>
        Google
      </SocialButton>
      <SocialButton onClick={() => onProvider('apple')} disabled={disabled}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85-.7 0-1.85-.83-3.05-.8-1.55.02-3 .9-3.8 2.3-1.63 2.83-.42 7 1.17 9.3.78 1.12 1.7 2.38 2.9 2.34 1.17-.05 1.61-.76 3.02-.76 1.4 0 1.8.76 3.03.73 1.25-.02 2.04-1.14 2.8-2.27.88-1.3 1.24-2.56 1.26-2.62-.03-.01-2.42-.93-2.43-3.77zM14.1 5.9c.64-.78 1.07-1.86.95-2.94-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.85 1.03.08 2.07-.52 2.71-1.29z" />
        </svg>
        Apple
      </SocialButton>
    </div>
  );
}

export function SecondaryButton({ children, disabled, onClick, variant = 'default' }) {
  const v = variant === 'danger'
    ? 'text-red-600 hover:bg-red-50/80 border-red-100'
    : 'text-ink-700 hover:bg-cream-100 border-ink-900/[0.06]';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-3 rounded-2xl font-semibold text-sm border bg-white shadow-card transition-colors disabled:opacity-50 ${v}`}
    >
      {children}
    </button>
  );
}

export function AvatarBadge({ firstName, lastName, username, avatarUrl, size = 'lg' }) {
  const initials = [firstName, lastName]
    .map((s) => (s || '').trim()[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (username || '?')[0].toUpperCase();
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-xs';
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${dim} rounded-full object-cover flex-shrink-0 bg-signa-100`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-signa-500 text-white font-bold flex items-center justify-center flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

export function SectionCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function SettingsSwitch({ checked, onChange, disabled, label, description }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-ink-900 text-sm font-semibold">{label}</p>
        {description && (
          <p className="text-ink-500 text-xs mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-[3.25rem] flex-shrink-0 rounded-full p-0.5 transition-colors duration-200 disabled:opacity-50 ${
          checked ? 'bg-signa-500' : 'bg-ink-900/12'
        }`}
      >
        <span
          aria-hidden
          className={`block h-7 w-7 rounded-full bg-white shadow-[0_1px_3px_rgba(46,42,36,0.18)] transition-transform duration-200 ease-out ${
            checked ? 'translate-x-[1.25rem]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
