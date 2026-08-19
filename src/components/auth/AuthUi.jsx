import { useState } from 'react';

/** Piese UI pentru Profil — aliniate la HomePage / LeaderboardPage. */

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

export function AuthField({ label, hint, error, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-ink-700 text-sm font-semibold">{label}</span>
      {children}
      {error && <span className="block text-red-600 text-xs">{error}</span>}
      {!error && hint && <span className="block text-ink-400 text-xs leading-relaxed">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full bg-white border rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-signa-400';

export function AuthInput({ className = '', error, ...props }) {
  return (
    <input
      className={`${inputBase} ${error ? 'border-red-300' : 'border-ink-900/[0.08]'} ${className}`}
      {...props}
    />
  );
}

export function PasswordInput({ value, onChange, placeholder, autoComplete, error, hint }) {
  const [show, setShow] = useState(false);
  return (
    <AuthField label="Parolă" hint={hint} error={error}>
      <div className="relative">
        <AuthInput
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          error={error}
          className="pr-14"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 text-xs font-medium"
          aria-label={show ? 'Ascunde parola' : 'Arată parola'}
        >
          {show ? 'Ascunde' : 'Arată'}
        </button>
      </div>
    </AuthField>
  );
}

export function PasswordStrength({ password }) {
  if (!password || password.length >= 8) return null;
  return <p className="text-ink-400 text-xs">Minim 8 caractere.</p>;
}

export function AuthTabs({ mode, onChange, disabled }) {
  const tabs = [
    { id: 'login', label: 'Intră' },
    { id: 'signup', label: 'Cont nou' },
  ];
  return (
    <div className="flex gap-5 border-b border-ink-900/[0.06]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(t.id)}
          className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            mode === t.id
              ? 'text-ink-900 border-signa-500'
              : 'text-ink-400 border-transparent hover:text-ink-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({ children, disabled, onClick, type = 'button' }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full py-[15px] rounded-2xl bg-signa-500 text-white font-bold text-sm shadow-button
        active:scale-[0.97] transition-transform duration-100 disabled:opacity-50 disabled:active:scale-100"
    >
      {children}
    </button>
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

export function AvatarBadge({ firstName, lastName, username, size = 'lg' }) {
  const initials = [firstName, lastName]
    .map((s) => (s || '').trim()[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (username || '?')[0].toUpperCase();
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-xs';
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
