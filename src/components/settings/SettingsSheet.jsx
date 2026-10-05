import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePreferences } from '../../hooks/usePreferences';
import { useProgress } from '../../hooks/useProgress';
import { TEXT_SCALES } from '../../lib/preferences';
import {
  AutoThemeIcon, CloseIcon, GearIcon, MoonIcon, SoundIcon, SunIcon, TextSizeIcon,
} from '../icons';
import {
  AuthField, AuthInput, MessageBanner, RippleButton, SettingsSwitch,
} from '../auth/AuthUi';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (name, dur, delay = 0, fill = 'both') =>
  ({ animation: `${name} ${dur}s ${EASE} ${delay}s ${fill}` });

/* Mini-ecranele din cardurile de temă au culori fixe (inline, deci neatinse de
   tema întunecată): trebuie să arate tema respectivă, nu pe cea curentă. */
const SWATCH = {
  light: { bg: '#FFFBF3', card: '#FFFFFF', line: '#2E2A24', soft: '#E9E2D6' },
  dark: { bg: '#171512', card: '#221F1B', line: '#F3EEE6', soft: '#3A352E' },
};

const THEME_OPTIONS = [
  { id: 'light', label: 'Luminos', Icon: SunIcon },
  { id: 'dark', label: 'Întunecat', Icon: MoonIcon },
  { id: 'system', label: 'Automat', Icon: AutoThemeIcon },
];

const TEXT_LABELS = {
  0.9: 'Mic',
  1: 'Normal',
  1.15: 'Mare',
  1.3: 'Foarte mare',
};

function MiniScreen({ tone }) {
  const c = SWATCH[tone];
  return (
    <span className="absolute inset-0 p-2 flex flex-col gap-1.5" style={{ background: c.bg }}>
      <span className="h-[5px] w-[46%] rounded-full" style={{ background: c.line, opacity: 0.85 }} />
      <span className="flex-1 rounded-[8px] p-1.5 flex flex-col gap-1" style={{ background: c.card }}>
        <span className="h-[4px] w-[70%] rounded-full" style={{ background: c.soft }} />
        <span className="h-[4px] w-[52%] rounded-full" style={{ background: c.soft }} />
        <span className="mt-auto h-[7px] w-[40%] rounded-full bg-[linear-gradient(90deg,#10b981,#34d399)]" />
      </span>
    </span>
  );
}

function ThemePreview({ id }) {
  return (
    <span
      aria-hidden
      className="relative block h-[74px] rounded-[14px] overflow-hidden border border-ink-900/[.08]"
    >
      {id === 'system' ? (
        <>
          <MiniScreen tone="light" />
          <span className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
            <MiniScreen tone="dark" />
          </span>
        </>
      ) : <MiniScreen tone={id} />}
    </span>
  );
}

function Section({ eyebrow, title, icon: Icon, delay, children }) {
  return (
    <section
      style={anim('sg-fade-up', 0.55, delay, 'backwards')}
      className="rounded-[22px] bg-white border border-ink-900/[.06]
        shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-[18px] md:p-5"
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <span className="w-9 h-9 rounded-xl bg-signa-50 text-signa-600 flex items-center justify-center flex-none">
            <Icon className="w-[18px] h-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">{eyebrow}</p>
          <p className="text-[15px] font-black text-ink-900 leading-tight">{title}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Butonul-roată din antetul Profilului. */
export function SettingsButton({ onClick, className = '', style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-label="Deschide setările"
      title="Setări"
      className={`group w-[42px] h-[42px] flex-none rounded-full bg-white border border-ink-900/[.07]
        text-ink-600 shadow-card flex items-center justify-center
        transition-[transform,box-shadow,color] duration-[180ms] ease-out
        hover:text-ink-900 hover:-translate-y-px hover:shadow-soft active:scale-95 ${className}`}
    >
      <GearIcon
        className="w-[19px] h-[19px] transition-transform duration-500 group-hover:rotate-90"
        style={{ transitionTimingFunction: EASE }}
      />
    </button>
  );
}

/**
 * Panoul de setări: aspect (temă, mărime text), sunet și — pentru un cont —
 * tot ce se poate edita la profil. Pe mobil e foaie de jos, pe desktop sertar
 * în dreapta.
 *
 * Se randează prin portal în `<body>`: `<main>`-ul shell-ului are `transform`
 * (tranziția între ecrane), iar asta ar face `position: fixed` relativ la el.
 *
 * `account` lipsește pentru invitat / fără cont — atunci rămân doar
 * preferințele dispozitivului.
 */
export default function SettingsSheet({ open, onClose, account = null }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const {
    theme, resolvedTheme, textScale, setTheme, setTextScale,
  } = usePreferences();
  const { soundEnabled, setSoundEnabled } = useProgress();

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        style={anim('sg-fade-in', 0.3)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={anim('sg-fade-up', 0.45)}
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[26px]
          md:inset-y-3 md:right-3 md:left-auto md:bottom-3 md:max-h-none md:w-[460px] md:rounded-[26px]
          bg-cream shadow-[0_-12px_40px_rgba(0,0,0,.18)] md:shadow-[0_24px_60px_rgba(0,0,0,.22)]
          flex flex-col overflow-hidden"
      >
        {/* Mâner de foaie — doar pe mobil. */}
        <span aria-hidden className="md:hidden mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-ink-900/[.14]" />

        <header className="flex-none flex items-center justify-between gap-3 px-5 pt-3 pb-3 md:px-6 md:pt-6">
          <div className="min-w-0">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.22em] text-ink-400">Profil</p>
            <h2 id={titleId} className="text-[26px] font-black text-ink-900 tracking-[-.02em] leading-tight">
              Setări
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Închide setările"
            className="w-10 h-10 rounded-full bg-white border border-ink-900/[.07] text-ink-600
              flex items-center justify-center transition-[transform,color] duration-150
              hover:text-ink-900 hover:rotate-90 active:scale-95"
            style={{ transitionTimingFunction: EASE }}
          >
            <CloseIcon className="w-[16px] h-[16px]" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide px-4 pb-6 md:px-6 flex flex-col gap-3.5">
          {account?.message && (
            <MessageBanner tone={account.message.tone}>{account.message.text}</MessageBanner>
          )}

          <Section eyebrow="Aspect" title="Tema aplicației" icon={resolvedTheme === 'dark' ? MoonIcon : SunIcon} delay={0.06}>
            <div role="radiogroup" aria-label="Tema aplicației" className="grid grid-cols-3 gap-2.5">
              {THEME_OPTIONS.map(({ id, label, Icon }) => {
                const on = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => setTheme(id)}
                    className={`rounded-[18px] p-1.5 pb-2.5 text-left border-2 transition-[border-color,box-shadow,transform]
                      duration-200 active:scale-[.97] ${on
                        ? 'border-signa-500 shadow-[0_0_0_4px_rgba(16,185,129,.14)]'
                        : 'border-transparent hover:border-ink-900/[.1]'}`}
                  >
                    <ThemePreview id={id} />
                    <span className={`mt-2 px-1 flex items-center gap-1.5 text-[13px] font-extrabold
                      ${on ? 'text-signa-600' : 'text-ink-700'}`}
                    >
                      <Icon className="w-[14px] h-[14px] flex-none" />
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[12.5px] font-semibold text-ink-500 leading-relaxed">
              {theme === 'system'
                ? `Automat urmează setarea telefonului — acum e ${resolvedTheme === 'dark' ? 'întunecat' : 'luminos'}.`
                : 'Rămâne așa indiferent de setarea telefonului.'}
            </p>
          </Section>

          <Section eyebrow="Lizibilitate" title="Mărimea textului" icon={TextSizeIcon} delay={0.12}>
            <div role="radiogroup" aria-label="Mărimea textului" className="grid grid-cols-4 gap-2">
              {TEXT_SCALES.map((scale) => {
                const on = textScale === scale;
                return (
                  <button
                    key={scale}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={TEXT_LABELS[scale]}
                    onClick={() => setTextScale(scale)}
                    className={`h-[64px] rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5
                      transition-[border-color,background-color,box-shadow,transform] duration-200 active:scale-[.96]
                      ${on
                        ? 'border-signa-500 bg-signa-50 text-signa-900 shadow-[0_0_0_4px_rgba(16,185,129,.14)]'
                        : 'border-ink-900/[.07] bg-[#FDFCF9] text-ink-700 hover:border-ink-900/[.14]'}`}
                  >
                    {/* Mărime fixă (inline): arată pașii, nu se scalează cu ei. */}
                    <span className="font-black leading-none" style={{ fontSize: Math.round(17 * scale) }}>Aa</span>
                    <span className="font-extrabold" style={{ fontSize: 10.5 }}>{Math.round(scale * 100)}%</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3.5 rounded-2xl bg-[#FBF7F0] border border-ink-900/[.05] px-4 py-3.5">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                Previzualizare · {TEXT_LABELS[textScale]}
              </p>
              <p className="mt-1.5 text-[15px] font-black text-ink-900 leading-snug">Litera A</p>
              <p className="mt-0.5 text-[13px] font-semibold text-ink-500 leading-relaxed">
                Pumnul strâns, cu degetul mare lipit pe lateral.
              </p>
            </div>
          </Section>

          <Section eyebrow="Feedback" title="Sunet" icon={(p) => <SoundIcon on={soundEnabled} {...p} />} delay={0.18}>
            <SettingsSwitch
              label="Sunete"
              description="Efecte la răspuns corect și la finalul lecției."
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
          </Section>

          {account ? <AccountSections account={account} /> : (
            <p
              style={anim('sg-fade-up', 0.55, 0.24, 'backwards')}
              className="px-1 text-[12.5px] font-semibold text-ink-400 leading-relaxed"
            >
              Tema și mărimea textului se păstrează pe acest dispozitiv. Cu un cont poți
              edita aici și profilul.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AccountSections({ account }) {
  const {
    user, username, firstName, lastName, initials, avatarUrl, isPublic, busy, syncing, lastSynced,
    onPickAvatar, onFirstName, onLastName, onUsername, onVisibility, onSave, onSync, onSignOut, onDelete,
  } = account;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState('');

  return (
    <>
      <Section eyebrow="Cont" title="Cum apari în Signa" delay={0.24}>
        <label className="group flex items-center gap-3.5 cursor-pointer">
          <span className="relative w-[56px] h-[56px] flex-none rounded-full bg-signa-400 text-signa-900 dark:text-signa-900
            flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.04]"
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-[19px] font-black">{initials}</span>}
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-extrabold text-ink-900">Poza de profil</span>
            <span className="block text-[12.5px] font-semibold text-signa-600 group-hover:underline">Schimbă poza</span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={onPickAvatar}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <AuthField label="Prenume">
            <AuthInput value={firstName} onChange={(e) => onFirstName(e.target.value)} autoComplete="given-name" />
          </AuthField>
          <AuthField label="Nume">
            <AuthInput value={lastName} onChange={(e) => onLastName(e.target.value)} autoComplete="family-name" />
          </AuthField>
        </div>
        <div className="mt-3">
          <AuthField label="Username" hint="3–20 caractere, litere mici și cifre.">
            <span className="relative block">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-bold pointer-events-none">@</span>
              <AuthInput
                className="pl-[34px]"
                value={username}
                onChange={(e) => onUsername(e.target.value)}
                autoComplete="username"
              />
            </span>
          </AuthField>
        </div>

        <div className="border-t border-ink-900/[.06] pt-4 mt-4">
          <SettingsSwitch
            label="Apare în clasament"
            description={isPublic ? 'Alți jucători te pot vedea în listă.' : 'Profil ascuns — progresul rămâne salvat.'}
            checked={isPublic}
            onChange={(on) => onVisibility(on ? 'public' : 'private')}
            disabled={busy}
          />
        </div>

        <RippleButton
          type="button"
          disabled={busy}
          onClick={onSave}
          className="mt-4 w-full rounded-2xl px-5 py-[14px] text-[14.5px] font-extrabold text-white
            bg-gradient-to-b from-signa-500 to-signa-600 shadow-[0_8px_20px_rgba(16,185,129,.26)]
            hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
        >
          {busy ? 'Se salvează…' : 'Salvează profilul'}
        </RippleButton>
      </Section>

      <Section eyebrow="Progres" title="Sincronizare cloud" delay={0.3}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-ink-500 leading-relaxed">
            {lastSynced
              ? `Sincronizat acum ${Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 60000))} min.`
              : 'Se sincronizează automat. Forțează dacă ai fost offline.'}
          </p>
          <RippleButton
            type="button"
            disabled={busy}
            onClick={onSync}
            className="flex-none flex items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 py-2
              text-[12.5px] font-bold text-ink-700 hover:shadow-soft disabled:opacity-50"
          >
            {syncing && (
              <span
                aria-hidden
                className="w-[13px] h-[13px] rounded-full border-2 border-ink-900/15 flex-shrink-0 sg-spin"
                style={{ borderTopColor: '#10b981' }}
              />
            )}
            {syncing ? 'Se sincronizează…' : 'Sincronizează'}
          </RippleButton>
        </div>
      </Section>

      <section
        style={anim('sg-fade-up', 0.55, 0.36, 'backwards')}
        className="rounded-[22px] border border-red-600/[.16] bg-red-600/[.03] p-[18px] md:p-5"
      >
        <p className="text-[10.5px] font-extrabold uppercase tracking-[.13em] text-red-600/[.65] mb-2.5">
          Zonă sensibilă
        </p>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-ink-500 leading-relaxed">
            Te deconectezi de pe acest dispozitiv ({user.email}).
          </p>
          <RippleButton
            type="button"
            disabled={busy}
            onClick={onSignOut}
            className="flex-shrink-0 rounded-2xl border border-red-600/[.22] text-red-600 bg-transparent
              px-4 py-[10px] font-bold text-[13px] hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50"
          >
            Deconectare
          </RippleButton>
        </div>

        <div className="mt-4 border-t border-red-600/[.12] pt-4">
          {!deleteOpen ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
              className="text-[12.5px] font-bold text-red-600/75 hover:text-red-600 disabled:opacity-50"
            >
              Șterge definitiv contul
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-[12.5px] text-ink-600 leading-relaxed">
                Se șterg profilul, progresul, relațiile sociale și avatarul din cont.
                Datasetul local nu este șters. Scrie <strong>{username}</strong> pentru confirmare.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="off"
                  placeholder={username}
                  className="min-w-0 flex-1 rounded-xl border border-red-600/20 bg-white px-3 py-2
                    text-[13px] font-semibold text-ink-900 outline-none focus:border-red-600/50"
                />
                <RippleButton
                  type="button"
                  disabled={busy || confirm.trim() !== username}
                  onClick={() => onDelete(confirm)}
                  className="rounded-xl bg-red-600 px-4 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  Șterge contul
                </RippleButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setDeleteOpen(false); setConfirm(''); }}
                  className="px-3 py-2 text-[12.5px] font-bold text-ink-500"
                >
                  Renunță
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
