import { useEffect, useRef, useState } from 'react';
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
import { MessageBanner, RippleButton, SectionCard } from '../components/auth/AuthUi';

/**
 * Profil / autentificare — funcțional doar cu VITE_SUPABASE_* setate.
 * Fără chei: arată starea locală (XP, streak) și instrucțiuni.
 */
export default function ProfilePage({ onBack }) {
  const {
    xp, streak, level, xpIntoLevel, xpNeeded,
    completedLessonsCount, totalLessonsCount, persist, syncNow,
  } = useProgress();
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
  const scrollRef = useRef(null);
  const stickyRef = useRef(null);

  const handleScroll = (e) => {
    const y = e.currentTarget.scrollTop;
    const el = e.currentTarget;
    const banner = el.querySelector('[data-sg-banner]');
    const glow = el.querySelector('[data-sg-glow]');
    if (banner) {
      banner.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
      banner.style.opacity = String(1 - Math.min(y / 190, 1) * 0.85);
    }
    if (glow) {
      glow.style.transform = `translate3d(${-y * 0.14}px, ${y * 0.36}px, 0)`;
    }
    const sticky = stickyRef.current;
    if (sticky) {
      const show = y > 130;
      sticky.style.opacity = show ? '1' : '0';
      sticky.style.transform = show ? 'translateY(0)' : 'translateY(-100%)';
      sticky.style.pointerEvents = show ? 'auto' : 'none';
    }
  };

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

  const stickyName = [firstName, lastName].filter(Boolean).join(' ') || username || 'Jucător';
  const stickyInitials = ([firstName, lastName].map((s) => (s || '').trim()[0]).filter(Boolean).join('')
    .toUpperCase().slice(0, 2)) || (username || '?')[0]?.toUpperCase() || '?';

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden relative">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0 relative z-10" />

      {/* Fundal ambiental — două halouri difuze care plutesc lent, în spatele conținutului. */}
      <span
        aria-hidden
        className="absolute top-[6%] left-[-8%] w-[420px] h-[420px] rounded-full pointer-events-none sg-drift"
        style={{
          background: 'radial-gradient(circle, rgba(52,211,153,.22), transparent 70%)',
          filter: 'blur(65px)',
          animationDuration: '14s',
        }}
      />
      <span
        aria-hidden
        className="absolute bottom-[4%] right-[-6%] w-[380px] h-[380px] rounded-full pointer-events-none sg-drift"
        style={{
          background: 'radial-gradient(circle, rgba(255,239,209,.55), transparent 70%)',
          filter: 'blur(70px)',
          animationDuration: '18s',
          animationDirection: 'reverse',
        }}
      />

      {/* Bară sticky compactă — apare după ~130px de scroll, cu avatar mic + nume + XP. */}
      {user && (
        <div
          ref={stickyRef}
          aria-hidden
          className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 md:px-8 py-3 bg-white/80 backdrop-blur border-b border-ink-900/[0.06]"
          style={{
            opacity: 0,
            transform: 'translateY(-100%)',
            pointerEvents: 'none',
            transition: 'opacity .34s cubic-bezier(.22,1,.36,1), transform .34s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-signa-100 text-signa-900 font-black text-[13px] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : stickyInitials}
          </div>
          <span className="text-ink-900 font-extrabold text-[13.5px] truncate">{stickyName}</span>
          <span className="text-ink-400 text-[12px] font-bold tabular-nums ml-auto flex-shrink-0">{xp} XP</span>
        </div>
      )}

      {/* max-w-[1180px]: pe desktop bannerul + cele două coloane au loc să respire,
          pe mobil containerul e lățimea ecranului. */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
        <div className="max-w-[1180px] mx-auto px-4 pt-4 pb-8 md:px-8 md:pt-6 md:pb-10">
        <div className="flex items-center justify-between mb-4 md:mb-[22px]">
          <RippleButton
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-white px-4 py-2 text-[13px] font-bold text-ink-700 transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-soft"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]">
              <path d="M14 6l-6 6 6 6" />
            </svg>
            Înapoi
          </RippleButton>
          <span className="text-[10.5px] font-extrabold uppercase tracking-[.13em] text-ink-400">Profil</span>
          <span className="w-[92px]" aria-hidden />
        </div>

        <div className="space-y-3">
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
            xpIntoLevel={xpIntoLevel}
            xpNeeded={xpNeeded}
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
      </div>
    </div>
  );
}
