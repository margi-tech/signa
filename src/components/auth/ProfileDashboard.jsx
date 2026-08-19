import {
  isUsernameTaken,
  supabase,
  updateOwnProfile,
} from '../../lib/supabase';
import {
  validateName,
  validateUsername,
} from '../../utils/username';
import {
  AuthField,
  AuthInput,
  AvatarBadge,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
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

/**
 * Profil conectat: identitate, setări, sync, logout.
 */
export default function ProfileDashboard({
  user,
  profile,
  xp,
  streak,
  level,
  firstName,
  lastName,
  username,
  visibility,
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
  const memberSince = formatMemberSince(profile?.created_at);
  const isAdmin = profile?.role === 'admin';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Jucător';

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

  return (
    <div className="space-y-3">
      <SectionCard className="p-4">
        <div className="flex items-center gap-3">
          <AvatarBadge firstName={firstName} lastName={lastName} username={username} />
          <div className="flex-1 min-w-0">
            <p className="text-ink-900 font-bold truncate">{displayName}</p>
            {username && <p className="text-ink-500 text-sm truncate">@{username}</p>}
            <p className="text-ink-400 text-xs truncate mt-0.5">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="bg-cream-100 text-ink-600 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums">
            Nv. {level} · {xp} XP
          </span>
          {streak > 0 && (
            <span className="bg-amber-50 text-amber-700 rounded-full px-2.5 py-1 text-[11px] font-bold">
              {streak} zile
            </span>
          )}
          <span className="text-ink-400 text-[11px] font-medium">
            {visibility === 'public' ? 'Public' : 'Privat'}
            {isAdmin ? ' · Admin' : ''}
          </span>
        </div>
        {memberSince && (
          <p className="text-ink-400 text-xs mt-2">Membru din {memberSince}</p>
        )}
      </SectionCard>

      <SectionCard className="p-5 space-y-4">
        <p className="text-ink-900 font-semibold text-sm">Date profil</p>

        <div className="grid grid-cols-2 gap-3">
          <AuthField label="Prenume">
            <AuthInput value={firstName} onChange={(e) => onFirstName(e.target.value)} autoComplete="given-name" />
          </AuthField>
          <AuthField label="Nume">
            <AuthInput value={lastName} onChange={(e) => onLastName(e.target.value)} autoComplete="family-name" />
          </AuthField>
        </div>
        <AuthField label="Username">
          <AuthInput value={username} onChange={(e) => onUsername(e.target.value)} autoComplete="username" />
        </AuthField>

        <div className="border-t border-ink-900/[0.06] pt-4">
          <SettingsSwitch
            label="Apare în clasament"
            description={
              visibility === 'public'
                ? 'Alți jucători te pot vedea în listă.'
                : 'Profil ascuns — progresul rămâne salvat.'
            }
            checked={visibility === 'public'}
            onChange={(on) => onVisibility(on ? 'public' : 'private')}
            disabled={busy}
          />
        </div>

        <PrimaryButton
          disabled={busy}
          onClick={() => run(async () => {
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
          })}
        >
          {busy ? 'Se salvează…' : 'Salvează'}
        </PrimaryButton>
      </SectionCard>

      <SectionCard className="p-5 space-y-3">
        <div>
          <p className="text-ink-900 font-semibold text-sm">Progres cloud</p>
          <p className="text-ink-500 text-xs mt-0.5 leading-relaxed">
            XP și stele se sincronizează automat. Local: {xp} XP.
          </p>
        </div>
        <SecondaryButton disabled={busy} onClick={() => run(onSync)}>
          Sincronizează acum
        </SecondaryButton>
      </SectionCard>

      <SecondaryButton
        variant="danger"
        disabled={busy}
        onClick={() => run(async () => {
          await supabase.auth.signOut();
          onMessage({ tone: 'info', text: 'Te-ai deconectat.' });
          onSignOut();
        })}
      >
        Deconectare
      </SecondaryButton>
    </div>
  );
}
