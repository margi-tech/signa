import { useEffect, useMemo, useState } from 'react';
import {
  deleteOwnAccount,
  isUsernameTaken,
  supabase,
  updateOwnProfile,
} from '../../lib/supabase';
import {
  validateName,
  validateUsername,
} from '../../utils/username';
import { useCountUp } from '../../hooks/useCountUp';
import { clearPendingLessonCompletions } from '../../hooks/useProgressSync';
import { LESSONS } from '../../data/lessons';
import { FlameIcon, HandIcon } from '../icons';
import FriendsSection from '../FriendsSection';
import {
  AuthField,
  AuthInput,
  RippleButton,
  SettingsSwitch,
} from './AuthUi';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const motion = (name, dur, delay = 0, fill = 'both') =>
  ({ animation: `${name} ${dur}s ${EASE} ${delay}s ${fill}` });

/** Același inel ca obiectivul zilei de pe Acasă — `sg-ring-draw` e calibrat pe r=34. */
const RING_R = 34;
const RING_LEN = 2 * Math.PI * RING_R;

const LEVEL_NAMES = ['Începător', 'Explorator', 'Vorbitor', 'Fluent', 'Maestru'];
const LEVEL_LINES = [
  'Primul semn e cel mai greu. Urmează restul.',
  'Alfabetul începe să stea în mână.',
  'Vorbești deja cu mâinile — ține ritmul.',
  'Ești aproape fluent. Cercul se uită la tine.',
  'Maestru. Semnele tale au greutate.',
];

const ALPHABET = LESSONS.filter((l) => l.id < 3).flatMap((l) => l.letters);

function formatMemberSince(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

function levelName(level) {
  return LEVEL_NAMES[Math.min(Math.max(level - 1, 0), LEVEL_NAMES.length - 1)];
}

function levelLine(level) {
  return LEVEL_LINES[Math.min(Math.max(level - 1, 0), LEVEL_LINES.length - 1)];
}

function initialsOf(firstName, lastName, username) {
  return [firstName, lastName]
    .map((s) => (s || '').trim()[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || (username || '?')[0].toUpperCase();
}

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

function MosaicCard({ delay, tone, className = '', children }) {
  return (
    <div
      style={motion('sg-fade-up', 0.65, delay, 'backwards')}
      className={`relative overflow-hidden rounded-[22px] border p-5 md:p-6
        transition-transform duration-[160ms] ease-out hover:-translate-y-px
        ${tone} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Profil conectat: carte de jucător, alfabet, prieteni, setări.
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
  letterMastery = {},
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
  const [syncing, setSyncing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [barOn, setBarOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setBarOn(true), 90);
    return () => clearTimeout(id);
  }, []);

  const memberSince = formatMemberSince(profile?.created_at);
  const levelPct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;
  const isAdmin = profile?.role === 'admin';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Jucător';
  const givenName = (firstName || '').trim() || displayName.split(/\s+/)[0];
  const initials = initialsOf(firstName, lastName, username);
  const isPublic = visibility === 'public';
  const xpIntoLevelShown = useCountUp(xpIntoLevel, { duration: 850, delay: 260 });
  const xpShown = useCountUp(xp, { duration: 950, delay: 280 });
  const streakShown = useCountUp(streak, { duration: 700, delay: 340 });
  const lessonsShown = useCountUp(completedLessonsCount, { duration: 800, delay: 400 });

  const mastered = useMemo(() => {
    const set = new Set();
    Object.entries(letterMastery ?? {}).forEach(([letter, entry]) => {
      if ((entry?.correct ?? 0) >= 1) set.add(letter);
    });
    return set;
  }, [letterMastery]);
  const masteredCount = ALPHABET.filter((ch) => mastered.has(ch)).length;

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

  const sync = () => {
    if (syncing) return;
    setSyncing(true);
    run(async () => {
      try {
        await onSync();
        setLastSynced(new Date());
      } finally {
        setSyncing(false);
      }
    });
  };

  const signOut = () => run(async () => {
    clearPendingLessonCompletions();
    await supabase.auth.signOut();
    onMessage({ tone: 'info', text: 'Te-ai deconectat.' });
    onSignOut();
  });

  const deleteAccount = () => run(async () => {
    if (deleteConfirm.trim() !== username) {
      throw new Error('Scrie username-ul exact pentru a confirma ștergerea.');
    }
    await deleteOwnAccount();
    onSignOut();
  });

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onAvatarChange) return;
    run(async () => {
      await onAvatarChange(file);
      onMessage({ tone: 'success', text: 'Poză de profil actualizată.' });
    });
  };

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <p
            style={motion('sg-fade-right', 0.6, 0.06)}
            className="text-[10.5px] lg:text-xs font-extrabold uppercase tracking-[.14em] lg:tracking-[.22em] text-ink-400"
          >
            Profil · Nivelul {level} · {levelName(level)}
          </p>
          <h1
            style={motion('sg-fade-up', 0.7, 0.14)}
            className="mt-1.5 lg:mt-2 text-[29px] lg:text-[2.6rem] font-black text-ink-900
              tracking-[-.02em] lg:tracking-[-.025em] leading-tight lg:leading-[1.1] text-pretty"
          >
            <span className="relative inline-block">
              {givenName}.
              <span
                aria-hidden
                className="absolute left-0 right-1.5 bottom-1 h-2 rounded sg-underline bg-signa-400/[.32]"
              />
            </span>
            {' '}Asta ești tu.
          </h1>
          <p
            style={motion('sg-fade-up', 0.65, 0.22)}
            className="mt-1.5 text-[13.5px] font-semibold text-ink-500"
          >
            {levelLine(level)}
          </p>
        </div>

        {streak > 0 && (
          <span
            style={motion('sg-scale-in', 0.5, 0.24, 'backwards')}
            className="self-start lg:self-auto flex items-center gap-[7px] bg-[#FFF7E8] border border-amber-500/[.18]
              text-amber-700 rounded-full px-[15px] py-[9px] text-[13px] font-extrabold tabular-nums"
          >
            <FlameIcon
              className="w-[13px] h-[13px]"
              style={{ animation: 'sg-flame 1.9s ease-in-out infinite' }}
            />
            {streak} {streak === 1 ? 'zi la rând' : 'zile la rând'}
          </span>
        )}
      </div>

      <div
        style={motion('sg-fade-up', 0.75, 0.2)}
        className="relative overflow-hidden rounded-[26px]
          bg-[linear-gradient(125deg,#0f7d59_0%,#0b6446_58%,#075237_100%)]
          shadow-[0_20px_48px_rgba(8,74,52,.24)]"
      >
        <span aria-hidden data-sg-banner className="absolute inset-0 pointer-events-none" />
        <span
          aria-hidden
          data-sg-glow
          className="absolute -top-[120px] -right-[70px] w-[300px] h-[300px] rounded-full pointer-events-none sg-aurora-a"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)',
            filter: 'blur(46px)',
          }}
        />
        <span
          aria-hidden
          className="absolute -bottom-[110px] left-[18%] w-[280px] h-[280px] rounded-full pointer-events-none sg-aurora-b"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,.18), transparent 72%)',
            filter: 'blur(50px)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[34%] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)',
            animation: 'sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.4s infinite',
          }}
        />
        <span
          aria-hidden
          className="hidden lg:flex absolute top-8 right-[36%] text-white/10 pointer-events-none"
          style={{ animation: 'sg-float-y 4.6s ease-in-out infinite' }}
        >
          <HandIcon className="w-16 h-16" />
        </span>

        <div className="relative px-5 pt-6 pb-6 md:px-8 md:pt-8 md:pb-8
          grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-center">
          <div className="flex items-center gap-4 md:gap-6 min-w-0">
            <label className="relative flex-shrink-0 cursor-pointer group" title="Schimbă poza de profil">
              <span
                aria-hidden
                className="absolute -inset-1.5 rounded-full border-2 border-white/40 pointer-events-none sg-pulse-ring"
              />
              <span className="sg-popin relative block">
                <span className="relative w-[88px] h-[88px] md:w-[108px] md:h-[108px] rounded-full
                  bg-signa-400 text-signa-900 flex items-center justify-center overflow-hidden
                  shadow-[0_12px_28px_rgba(4,44,32,.28)]
                  transition-transform duration-[220ms] ease-out
                  group-hover:scale-[1.04] group-hover:-rotate-[4deg]">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[28px] md:text-[34px] font-black">{initials}</span>}
                </span>
              </span>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 w-8 h-8 rounded-full bg-white text-ink-700
                  shadow-[0_4px_12px_rgba(4,44,32,.22)] flex items-center justify-center
                  group-hover:bg-signa-500 group-hover:text-white transition-colors"
              >
                <CameraIcon />
              </span>
              <span className="sr-only">Schimbă poza de profil</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy || !onAvatarChange}
                onChange={pickAvatar}
              />
            </label>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  style={motion('sg-scale-in', 0.5, 0.32, 'backwards')}
                  className="rounded-full bg-white/[.14] border border-white/20 text-emerald-50
                    text-[10.5px] font-extrabold px-2.5 py-1 uppercase tracking-[.08em]"
                >
                  {levelName(level)}
                </span>
                <span
                  style={motion('sg-scale-in', 0.5, 0.38, 'backwards')}
                  className="rounded-full bg-white/[.1] border border-white/15 text-emerald-100/85
                    text-[10.5px] font-extrabold px-2.5 py-1 uppercase tracking-[.06em]"
                >
                  {isPublic ? 'În clasament' : 'Profil privat'}
                  {isAdmin ? ' · Admin' : ''}
                </span>
              </div>
              <h2
                style={motion('sg-fade-up', 0.65, 0.34)}
                className="mt-2 text-[24px] md:text-[32px] font-black text-white tracking-[-.02em] leading-tight truncate"
              >
                {displayName}
              </h2>
              <p
                style={motion('sg-fade-up', 0.6, 0.4)}
                className="mt-1 text-[13px] md:text-[14.5px] font-semibold text-cream/70 truncate"
              >
                {username ? `@${username}` : user.email}
                {memberSince ? ` · din ${memberSince}` : ''}
              </p>
            </div>
          </div>

          <div
            style={motion('sg-scale-in', 0.6, 0.42, 'backwards')}
            className="relative w-[88px] h-[88px] md:w-[104px] md:h-[104px] flex-none mx-auto lg:mx-0"
          >
            <div
              aria-hidden
              className="absolute -inset-1.5 rounded-full"
              style={{
                background: 'rgba(52,211,153,.35)',
                filter: 'blur(14px)',
                animation: 'sg-ring-glow 3.4s ease-in-out infinite',
              }}
            />
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 88 88"
              className="relative block"
              style={{ transform: 'rotate(-90deg)' }}
              aria-hidden
            >
              <circle cx="44" cy="44" r={RING_R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="7" />
              <circle
                cx="44" cy="44" r={RING_R} fill="none" stroke="#34d399" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={RING_LEN}
                style={{
                  '--sg-ring-to': String(RING_LEN * (1 - (barOn ? levelPct : 0))),
                  animation: `sg-ring-draw 1.5s ${EASE} .7s both`,
                }}
              />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] md:text-[26px] font-black text-white leading-none tabular-nums">
                {level}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[.14em] text-emerald-100/70">
                nivel
              </span>
            </span>
          </div>
        </div>

        <div className="relative px-5 pb-5 md:px-8 md:pb-7">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[12.5px] font-extrabold text-emerald-50/90">
              Spre nivelul {level + 1}
            </span>
            <span className="text-[11.5px] font-extrabold text-emerald-100/70 tabular-nums">
              {xpIntoLevelShown} / {xpNeeded} XP
            </span>
          </div>
          <div className="relative h-[10px] rounded-full bg-black/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#6ee7b7,#34d399)]"
              style={{
                width: `${(barOn ? levelPct : 0) * 100}%`,
                transition: `width 1.2s ${EASE} .5s`,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 w-[34%] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent)',
                animation: 'sg-sheen 4.2s cubic-bezier(.4,0,.2,1) 1.8s infinite',
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[.9fr_.9fr_1.3fr] gap-3.5">
        <MosaicCard delay={0.36} tone="bg-[#FFF7E8] border-amber-600/[.14]">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-amber-800/70">Focul tău</p>
          <p className="mt-2 flex items-end gap-2">
            <span className="text-[36px] font-black leading-none tabular-nums text-amber-800">{streakShown}</span>
            <FlameIcon
              className="w-6 h-6 text-amber-600 mb-1"
              style={{ animation: 'sg-flame 1.9s ease-in-out infinite' }}
            />
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-amber-800/70">
            {streak === 0
              ? 'Aprinde-l cu o lecție azi.'
              : streak === 1
                ? 'Prima zi. Mâine contează dublu.'
                : 'Zile la rând — nu-l stinge.'}
          </p>
        </MosaicCard>

        <MosaicCard delay={0.44} tone="bg-signa-50 border-signa-500/[.16]">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-signa-900/70">Drumul</p>
          <p className="mt-2 text-[36px] font-black leading-none tabular-nums text-signa-900">
            {lessonsShown}
            <span className="text-[16px] font-bold text-signa-900/50">/{totalLessonsCount}</span>
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-signa-900/65">
            {xpShown} XP adunați
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-signa-900/[.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-signa-500"
              style={{
                width: `${totalLessonsCount ? (completedLessonsCount / totalLessonsCount) * 100 : 0}%`,
                transition: `width 1.1s ${EASE} .6s`,
              }}
            />
          </div>
        </MosaicCard>

        <MosaicCard delay={0.52} tone="bg-white border-ink-900/[.06]" className="md:col-span-2 lg:col-span-1">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">Alfabetul tău</p>
            <p className="text-[12px] font-extrabold tabular-nums text-ink-500">
              {masteredCount}/{ALPHABET.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {ALPHABET.map((ch, i) => {
              const on = mastered.has(ch);
              return (
                <span
                  key={ch}
                  style={motion('sg-pop', 0.4, 0.55 + i * 0.025, 'backwards')}
                  title={on ? `${ch} — validat` : `${ch} — încă nevalidat`}
                  className={`w-8 h-8 rounded-[10px] text-[12.5px] font-black flex items-center justify-center border
                    ${on
                      ? 'bg-signa-50 border-signa-500/25 text-signa-900'
                      : 'bg-[#FBF7F0] border-ink-900/[.06] text-ink-400/70'}`}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        </MosaicCard>
      </div>

      <FriendsSection userId={user.id} />

      <div className="grid gap-[18px] items-start lg:grid-cols-[1.55fr_1fr]">
        <div
          style={motion('sg-fade-up', 0.7, 0.48)}
          className="rounded-[22px] bg-white border border-ink-900/[0.06]
            shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)]
            p-5 md:p-[26px_28px]"
        >
          <p
            style={motion('sg-fade-right', 0.5, 0.52)}
            className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
          >
            Atelier
          </p>
          <p className="mt-1 text-[17px] font-black text-ink-900">Cum apari în Signa</p>
          <p className="text-[13px] text-ink-500 mt-1">Numele ăsta e pe clasament și pe certificate.</p>

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
              className="relative overflow-hidden w-full md:w-auto rounded-2xl px-[26px] py-[15px] md:py-[13px]
                text-[14.5px] font-extrabold text-white bg-gradient-to-b from-signa-500 to-signa-600
                shadow-[0_8px_20px_rgba(16,185,129,.26)] transition-[transform,box-shadow] duration-150
                hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(16,185,129,.34)] disabled:opacity-50 disabled:translate-y-0"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[38%] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)',
                  animation: 'sg-sheen 3.6s cubic-bezier(.4,0,.2,1) 1.8s infinite',
                }}
              />
              <span className="relative">{busy ? 'Se salvează…' : 'Salvează modificările'}</span>
            </RippleButton>
          </div>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div
            style={motion('sg-fade-up', 0.7, 0.56)}
            className="rounded-[22px] bg-white border border-ink-900/[0.06]
              shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-5 md:p-6"
          >
            <div className="group flex items-start gap-3">
              <span
                className="w-[38px] h-[38px] flex-shrink-0 rounded-xl bg-signa-50 text-signa-600 flex items-center justify-center
                  transition-transform duration-[280ms] group-hover:scale-[1.08] group-hover:-rotate-6"
                style={{ transitionTimingFunction: EASE }}
              >
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
                <span aria-hidden className="relative w-[7px] h-[7px] flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-signa-500" />
                  <span className="absolute -inset-1 rounded-full border-[1.5px] border-signa-500/55 sg-dot-ring" />
                </span>
                {lastSynced
                  ? `Acum ${Math.max(0, Math.round((Date.now() - lastSynced.getTime()) / 60000))} min`
                  : 'Nesincronizat'}
              </span>
              <RippleButton
                type="button"
                disabled={busy}
                onClick={sync}
                className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 py-2
                  text-[12.5px] font-bold text-ink-700 transition-[transform,box-shadow] duration-150
                  hover:-translate-y-px hover:shadow-soft disabled:opacity-50"
              >
                {syncing && (
                  <span
                    aria-hidden
                    className="w-[13px] h-[13px] rounded-full border-2 border-ink-900/15 flex-shrink-0 sg-spin"
                    style={{ borderTopColor: '#10b981' }}
                  />
                )}
                {syncing ? 'Se sincronizează…' : (
                  <>
                    <span className="md:hidden">Sync</span>
                    <span className="hidden md:inline">Sincronizează</span>
                  </>
                )}
              </RippleButton>
            </div>
          </div>

          <div
            style={motion('sg-fade-up', 0.7, 0.64)}
            className="rounded-[22px] bg-white border border-ink-900/[0.06]
              shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)] p-5 md:p-6"
          >
            <p className="text-[15px] font-black text-ink-900">
              {memberSince ? `Membru din ${memberSince}` : 'Membru Signa'}
            </p>
            <p className="text-[12.5px] text-ink-500 mt-1 leading-relaxed">
              Camera și semnele rămân pe dispozitiv. Cloud-ul ține doar progresul.
            </p>
          </div>

          <div
            style={motion('sg-fade-up', 0.7, 0.72)}
            className="rounded-[22px] border border-red-600/[.16] bg-red-600/[.03] p-[18px_20px] md:p-[22px_24px]"
          >
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
                className="flex-shrink-0 rounded-2xl border border-red-600/[.22] text-red-600 bg-transparent
                  px-5 py-[11px] font-bold text-[13.5px]
                  transition-[color,background-color,border-color,transform] duration-150
                  hover:bg-red-600 hover:border-red-600 hover:text-white hover:-translate-y-0.5 disabled:opacity-50"
              >
                <span className="md:hidden">Ieși</span>
                <span className="hidden md:inline">Deconectare</span>
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
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      autoComplete="off"
                      placeholder={username}
                      className="min-w-0 flex-1 rounded-xl border border-red-600/20 bg-white px-3 py-2
                        text-[13px] font-semibold text-ink-900 outline-none focus:border-red-600/50"
                    />
                    <RippleButton
                      type="button"
                      disabled={busy || deleteConfirm.trim() !== username}
                      onClick={deleteAccount}
                      className="rounded-xl bg-red-600 px-4 py-2 text-[12.5px] font-bold text-white
                        disabled:opacity-40"
                    >
                      Șterge contul
                    </RippleButton>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteConfirm('');
                      }}
                      className="px-3 py-2 text-[12.5px] font-bold text-ink-500"
                    >
                      Renunță
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
