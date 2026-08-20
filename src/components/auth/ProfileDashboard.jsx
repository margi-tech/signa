import { useState } from 'react';
import {
  isUsernameTaken,
  supabase,
  updateOwnProfile,
} from '../../lib/supabase';
import {
  validateName,
  validateUsername,
} from '../../utils/username';
import { useCountUp } from '../../hooks/useCountUp';
import {
  AuthField,
  AuthInput,
  RippleButton,
  SettingsSwitch,
} from './AuthUi';

function formatMemberSince(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

const LEVEL_NAMES = ['Începător', 'Explorator', 'Vorbitor', 'Fluent', 'Maestru'];

function levelName(level) {
  return LEVEL_NAMES[Math.min(Math.max(level - 1, 0), LEVEL_NAMES.length - 1)];
}

function initialsOf(firstName, lastName, username) {
  return [firstName, lastName]
    .map((s) => (s || '').trim()[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (username || '?')[0].toUpperCase();
}

/** Un tile din rândul de statistici — cifra mare (contor animat), eticheta mică dedesubt. */
function StatTile({ value, sub, label, shortLabel, tone, countDelay = 300, className = '' }) {
  const shown = useCountUp(value, { delay: countDelay });
  return (
    <div className={`rounded-2xl border p-[14px_16px] text-center lg:text-left ${tone} ${className}`}>
      <p className="font-black text-[19px] lg:text-[24px] leading-none tabular-nums">
        {shown}
        {sub && <span className="text-ink-400 text-[13px] lg:text-[16px] font-black">{sub}</span>}
      </p>
      <p className="text-[9.5px] lg:text-[10.5px] font-extrabold uppercase tracking-[.1em] opacity-60 mt-1.5 whitespace-nowrap">
        <span className="lg:hidden">{shortLabel || label}</span>
        <span className="hidden lg:inline">{label}</span>
      </p>
    </div>
  );
}

/** Icon inline generic pentru cardurile din coloana dreaptă. */
function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px]">
      <path d="M17.5 19a4.5 4.5 0 0 0 .3-8.99A6 6 0 0 0 6.1 10.2A4 4 0 0 0 6.5 19h11Z" />
    </svg>
  );
}

function CameraIcon({ className = 'w-[14px] h-[14px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14.5 4h-5L8 6H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-4l-1.5-2Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

/**
 * Profil conectat: identitate, setări, sync, logout.
 */
export default function ProfileDashboard({
  user,
  profile,
  xp,
  streak,
  level,
  completedLessonsCount = 0,
  totalLessonsCount = 0,
  xpIntoLevel = 0,
  xpNeeded = 0,
  firstName,
  lastName,
  username,
  visibility,
  avatarUrl,
  onAvatarChange,
  onFirstName,
  onLastName,
  onUsername,
  onVisibility,
  busy,
  onBusy,
  onMessage,
  onSync,
  onSignOut,
}) {
  const [lastSynced, setLastSynced] = useState(null);
  const memberSince = formatMemberSince(profile?.created_at);
  const levelPct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;
  const isAdmin = profile?.role === 'admin';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Jucător';
  const initials = initialsOf(firstName, lastName, username);
  const isPublic = visibility === 'public';
  const xpIntoLevelShown = useCountUp(xpIntoLevel, { delay: 250, duration: 800 });

  const run = async (fn) => {
    onBusy(true);
    onMessage(null);
    try {
      await fn();
    } catch (err) {
      onMessage({ tone: 'error', text: err.message || 'Eroare' });
    } finally {
      onBusy(false);
    }
  };

  const resetForm = () => {
    onFirstName(profile?.first_name ?? '');
    onLastName(profile?.last_name ?? '');
    onUsername(profile?.username ?? '');
    onVisibility(profile?.visibility === 'private' ? 'private' : 'public');
  };

  const save = () => run(async () => {
    const nameErr = validateName(firstName, 'Prenumele') || validateName(lastName, 'Numele');
    if (nameErr) throw new Error(nameErr);
    const userErr = validateUsername(username);
    if (userErr) throw new Error(userErr);
    if (await isUsernameTaken(username.trim(), user.id)) {
      throw new Error('Username-ul e deja luat.');
    }
    await updateOwnProfile({
      firstName,
      lastName,
      username: username.trim(),
      visibility,
    });
    onMessage({ tone: 'success', text: 'Profil salvat.' });
  });

  const sync = () => run(async () => {
    await onSync();
    setLastSynced(new Date());
  });

  const signOut = () => run(async () => {
    await supabase.auth.signOut();
    onMessage({ tone: 'info', text: 'Te-ai deconectat.' });
    onSignOut();
  });

  return (
    <div className="space-y-[18px]">
      {/* Banner profil */}
      <div className="sg-up rounded-[20px] bg-white border border-ink-900/[0.06] shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] overflow-hidden">
        <div
          data-sg-banner
          className="sg-up delay-100 relative overflow-hidden bg-[linear-gradient(120deg,#064e3b,#065f46_55%,#047857)] px-5 pt-[22px] pb-[60px] md:px-[30px] md:pt-[26px] md:pb-[74px]"
        >
          <span
            aria-hidden
            data-sg-glow
            className="absolute -top-[140px] -right-[60px] w-[340px] h-[340px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)',
              filter: 'blur(48px)',
            }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.13em] text-emerald-100/70 mb-1.5 md:mb-2">
                Nivelul {level} · {levelName(level)}
              </p>
              <h1 className="text-[22px] md:text-[30px] font-black text-white tracking-[-.02em] leading-tight truncate">
                {displayName}
              </h1>
              <p className="mt-1 md:mt-1.5 text-cream/[.66] text-[12.5px] md:text-[14px] font-semibold truncate">
                @{username}
                <span className="hidden md:inline"> · {user.email}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="rounded-full bg-white/[.14] border border-white/20 text-emerald-100 text-[10.5px] md:text-[11.5px] font-extrabold px-2.5 md:px-3 py-[5px] md:py-[7px] uppercase tracking-[.04em]"
                title={isPublic ? 'Apari în clasament' : 'Profil ascuns din clasament'}
              >
                {isPublic ? 'Public' : 'Privat'}
                {isAdmin ? ' · Admin' : ''}
              </span>
              <label
                className="hidden md:flex cursor-pointer items-center gap-2 rounded-xl border bg-white/[.12] border-white/[.22] text-white px-[14px] py-2 text-[12.5px] font-bold transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-soft active:scale-[.96]"
                title="Schimbă poza de profil"
              >
                Schimbă poza
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={busy || !onAvatarChange}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file || !onAvatarChange) return;
                    run(async () => {
                      await onAvatarChange(file);
                      onMessage({ tone: 'success', text: 'Poză de profil actualizată.' });
                    });
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="sg-up delay-200 px-5 pb-5 md:px-[30px] md:pb-6 grid grid-cols-[auto_1fr] gap-4 md:gap-[26px] items-end">
          <label
            className="sg-popin delay-300 relative -mt-[38px] md:-mt-[46px] flex-shrink-0 cursor-pointer group"
            title="Schimbă poza de profil"
          >
            <span
              aria-hidden
              className="absolute -inset-[6px] rounded-[34px] border-2 border-signa-500/30 pointer-events-none"
            />
            <div className="w-20 h-20 md:w-[104px] md:h-[104px] rounded-[24px] md:rounded-[28px] bg-signa-100 border-4 border-white shadow-[0_10px_24px_rgba(46,42,36,.16)] md:shadow-[0_12px_30px_rgba(46,42,36,.16)] flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-[1.035] hover:-rotate-[1.5deg]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[24px] md:text-[30px] font-black text-signa-900">{initials}</span>
              )}
            </div>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 w-7 h-7 md:w-[30px] md:h-[30px] rounded-full bg-white shadow-[0_3px_10px_rgba(46,42,36,.18)] flex items-center justify-center text-ink-700 group-hover:bg-signa-500 group-hover:text-white transition-colors"
            >
              <CameraIcon />
            </span>
            <span className="sr-only">Schimbă poza de profil</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only md:hidden"
              disabled={busy || !onAvatarChange}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file || !onAvatarChange) return;
                run(async () => {
                  await onAvatarChange(file);
                  onMessage({ tone: 'success', text: 'Poză de profil actualizată.' });
                });
              }}
            />
          </label>

          <div className="pt-3 md:pt-5 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5 md:mb-2">
              <span className="text-[12.5px] md:text-[13px] font-extrabold text-ink-900">
                Progres spre Nivelul {level + 1}
              </span>
              <span className="text-[11px] md:text-[12px] font-extrabold text-ink-500 tabular-nums">
                {xpIntoLevelShown} / {xpNeeded} XP
              </span>
            </div>
            <div className="h-[9px] md:h-[10px] rounded-full bg-ink-900/[.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-signa-400 to-signa-600 transition-[width] duration-500"
                style={{ width: `${levelPct * 100}%`, transformOrigin: 'left' }}
              />
            </div>

            <div className="grid grid-cols-3 gap-[9px] md:gap-3 mt-4 md:mt-5">
              <StatTile
                value={xp}
                label="XP total"
                shortLabel="XP"
                tone="bg-signa-50 border-signa-500/[.14] text-signa-900"
                countDelay={380}
                className="sg-up delay-400"
              />
              <StatTile
                value={streak}
                label="Zile la rând"
                shortLabel="Zile"
                tone="bg-amber-50 border-amber-600/[.14] text-amber-700"
                countDelay={450}
                className="sg-up delay-500"
              />
              <StatTile
                value={completedLessonsCount}
                sub={totalLessonsCount > 0 ? `/${totalLessonsCount}` : ''}
                label="Lecții"
                shortLabel="Lecții"
                tone="bg-[#FAF8F4] border-ink-900/[.07] text-ink-900"
                countDelay={520}
                className="sg-up delay-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid gap-[18px] items-start lg:grid-cols-[1.55fr_1fr]">
        {/* Date profil */}
        <div className="sg-up delay-600 rounded-[20px] bg-white border border-ink-900/[0.06] shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-5 md:p-[26px_28px]">
          <p className="text-[17px] font-black text-ink-900">Date profil</p>
          <p className="text-[13px] text-ink-500 mt-1">Numele apare în clasament și pe certificate.</p>

          <div className="mt-5 flex flex-col gap-[14px] md:grid md:grid-cols-2 md:gap-4">
            <AuthField label="Prenume">
              <AuthInput value={firstName} onChange={(e) => onFirstName(e.target.value)} autoComplete="given-name" />
            </AuthField>
            <AuthField label="Nume">
              <AuthInput value={lastName} onChange={(e) => onLastName(e.target.value)} autoComplete="family-name" />
            </AuthField>
          </div>

          <div className="mt-[14px] md:mt-4">
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

          <div className="border-t border-ink-900/[0.06] pt-5 mt-5">
            <SettingsSwitch
              label="Apare în clasament"
              description={isPublic ? 'Alți jucători te pot vedea în listă.' : 'Profil ascuns — progresul rămâne salvat.'}
              checked={isPublic}
              onChange={(on) => onVisibility(on ? 'public' : 'private')}
              disabled={busy}
            />
          </div>

          <div className="border-t border-ink-900/[0.06] pt-[18px] mt-5 flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-end">
            <RippleButton
              type="button"
              disabled={busy}
              onClick={resetForm}
              className="hidden md:inline-flex items-center rounded-xl px-2 text-ink-500 hover:text-ink-900 font-bold text-[14px] disabled:opacity-50"
            >
              Anulează
            </RippleButton>
            <RippleButton
              type="button"
              disabled={busy}
              onClick={save}
              className="w-full md:w-auto rounded-2xl px-[26px] py-[15px] md:py-[13px] text-[14.5px] font-extrabold text-white bg-gradient-to-b from-signa-500 to-signa-600 shadow-[0_8px_20px_rgba(16,185,129,.26)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(16,185,129,.34)] disabled:opacity-50 disabled:translate-y-0"
            >
              {busy ? 'Se salvează…' : 'Salvează modificările'}
            </RippleButton>
          </div>
        </div>

        {/* Coloana dreapta */}
        <div className="flex flex-col gap-[18px]">
          <div className="sg-up delay-700 rounded-[20px] bg-white border border-ink-900/[0.06] shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="w-[38px] h-[38px] flex-shrink-0 rounded-xl bg-signa-50 text-signa-600 flex items-center justify-center">
                <CloudIcon />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-black text-ink-900">Progres cloud</p>
                <p className="text-[12.5px] text-ink-500 mt-1 leading-relaxed">
                  Sincronizat automat. Local: {xp} XP.
                </p>
              </div>
            </div>
            <div className="border-t border-ink-900/[0.06] mt-4 pt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-[7px] text-[12.5px] font-bold text-signa-600">
                <span className="w-[7px] h-[7px] rounded-full bg-signa-500 flex-shrink-0" />
                {lastSynced ? `Acum ${Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 60000))} min` : 'Nesincronizat'}
              </span>
              <RippleButton
                type="button"
                disabled={busy}
                onClick={sync}
                className="rounded-xl border border-ink-900/10 bg-white px-4 py-2 text-[12.5px] font-bold text-ink-700 transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-soft disabled:opacity-50"
              >
                <span className="md:hidden">Sync</span>
                <span className="hidden md:inline">Sincronizează</span>
              </RippleButton>
            </div>
          </div>

          <div className="sg-up delay-800 rounded-[20px] bg-white border border-ink-900/[0.06] shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-5 md:p-6">
            <p className="text-[15px] font-black text-ink-900">
              {memberSince ? `Membru din ${memberSince}` : 'Membru Signa'}
            </p>
            <p className="text-[12.5px] text-ink-500 mt-1 leading-relaxed">
              Camera și semnele rămân pe dispozitiv.
            </p>
          </div>

          <div className="sg-up delay-800 rounded-[20px] border border-red-600/[.16] bg-red-600/[.03] p-[18px_20px] md:p-[22px_24px]">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.13em] text-red-600/[.65] mb-2.5">
              Zonă sensibilă
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12.5px] text-ink-500 leading-relaxed">
                Te deconectezi de pe acest dispozitiv. Progresul rămâne salvat în cloud.
              </p>
              <RippleButton
                type="button"
                disabled={busy}
                onClick={signOut}
                className="flex-shrink-0 rounded-2xl border border-red-600/[.22] text-red-600 bg-transparent px-5 py-[11px] font-bold text-[13.5px] transition-colors hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50"
              >
                <span className="md:hidden">Ieși</span>
                <span className="hidden md:inline">Deconectare</span>
              </RippleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
