import { useEffect, useState } from 'react';
import {
  getOwnProfile,
  isSupabaseConfigured,
  supabase,
  uploadAvatar,
} from '../lib/supabase';
import { useProgress } from '../hooks/useProgress';
import { pullAndMergeProgress, pushProgress } from '../hooks/useProgressSync';
import AuthPanel from '../components/auth/AuthPanel';
import ProfileDashboard from '../components/auth/ProfileDashboard';
import { MessageBanner, SectionCard } from '../components/auth/AuthUi';

/**
 * Profil / autentificare — funcțional doar cu VITE_SUPABASE_* setate.
 * Fără chei: arată starea locală (XP, streak) și instrucțiuni.
 */
export default function ProfilePage({ onBack }) {
  const { xp, streak, level, completedLessonsCount, totalLessonsCount, persist, syncNow } = useProgress();
  const [authMode, setAuthMode] = useState('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setAuthMode('login');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setVisibility('public');
      setProfile(null);
      setAvatarUrl(null);
      return undefined;
    }
    let cancelled = false;
    getOwnProfile()
      .then((p) => {
        if (cancelled || !p) return;
        setProfile(p);
        setFirstName(p.first_name ?? '');
        setLastName(p.last_name ?? '');
        setUsername(p.username ?? '');
        setVisibility(p.visibility === 'private' ? 'private' : 'public');
        setAvatarUrl(p.avatar_url ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const afterAuth = async () => {
    const merged = await pullAndMergeProgress();
    if (merged) persist(merged);
    await pushProgress(merged ?? undefined);
    const p = await getOwnProfile();
    if (p) setProfile(p);
  };

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">PROFIL</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-3 scrollbar-hide">
        {!user && (
          <div className="bg-signa-50 rounded-2xl p-4 border border-signa-200/60">
            <p className="text-signa-700 text-xs font-bold uppercase tracking-wider mb-1">Progres local</p>
            <p className="text-ink-900 font-black text-lg">Nivel {level} · {xp} XP</p>
            {streak > 0 && <p className="text-ink-500 text-sm mt-0.5">{streak} zile consecutive</p>}
          </div>
        )}

        {banner && (
          <MessageBanner tone={banner.tone}>{banner.text}</MessageBanner>
        )}

        {!isSupabaseConfigured ? (
          <p className="text-ink-500 text-sm leading-relaxed px-1">
            Supabase nu e configurat. Copiază <code className="text-ink-700">.env.example</code> →{' '}
            <code className="text-ink-700">.env.local</code>, pune URL + anon key, rulează{' '}
            <code className="text-ink-700">supabase/schema.sql</code>.
          </p>
        ) : authLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-ink-900/10 border-t-signa-500 animate-spin" />
          </div>
        ) : user ? (
          <ProfileDashboard
            user={user}
            profile={profile}
            xp={xp}
            streak={streak}
            level={level}
            completedLessonsCount={completedLessonsCount}
            totalLessonsCount={totalLessonsCount}
            firstName={firstName}
            lastName={lastName}
            username={username}
            visibility={visibility}
            avatarUrl={avatarUrl}
            onAvatarChange={async (file) => {
              const url = await uploadAvatar(file);
              setAvatarUrl(url);
            }}
            onFirstName={setFirstName}
            onLastName={setLastName}
            onUsername={setUsername}
            onVisibility={setVisibility}
            busy={busy}
            onBusy={setBusy}
            onMessage={setBanner}
            onSync={async () => {
              await syncNow();
              setBanner({ tone: 'success', text: 'Progres sincronizat.' });
            }}
            onSignOut={() => {
              setFirstName('');
              setLastName('');
              setUsername('');
            }}
          />
        ) : (
          <>
            <p className="text-ink-500 text-sm leading-relaxed px-1">
              Conectează-te ca să salvezi progresul în cloud și să apari în clasament.
              Camera și semnele rămân pe dispozitiv.
            </p>
            <SectionCard>
              <AuthPanel
                mode={authMode}
                onModeChange={setAuthMode}
                busy={busy}
                onBusy={setBusy}
                onMessage={setBanner}
                afterAuth={afterAuth}
              />
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}
