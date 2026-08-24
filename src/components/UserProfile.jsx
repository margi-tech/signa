import { useEffect, useState } from 'react';
import {
  getDirectoryProfile,
  getFriends,
  getSessionUser,
  isSupabaseConfigured,
} from '../lib/supabase';
import FollowButton from './FollowButton';
import FriendsList from './FriendsList';
import { memberSinceLabel, playerLevel } from '../utils/playerMeta';
import { useCountUp } from '../hooks/useCountUp';

const EASE = 'cubic-bezier(.22,1,.36,1)';

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

const initialsOf = (name) => (name || '?')
  .trim().split(/\s+/).map((w) => w[0]).filter(Boolean)
  .join('').toUpperCase()
  .slice(0, 2) || '?';

function Stat({ value, label, delay, accent }) {
  const shown = useCountUp(Number(value) || 0, { duration: 900, delay: 280 + delay * 1000 });
  return (
    <div
      style={anim('sg-fade-up', 0.6, delay, 'backwards')}
      className="rounded-[18px] bg-white border border-ink-900/[.05] px-4 py-3.5
        shadow-[0_6px_20px_rgba(46,42,36,.05)]"
    >
      <p className={`text-[20px] font-black tabular-nums leading-none ${accent || 'text-ink-900'}`}>
        {shown.toLocaleString('ro-RO')}
      </p>
      <p className="mt-1.5 text-[10.5px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        {label}
      </p>
    </div>
  );
}

/** Profilul public al altui jucător, cu statisticile lui și lista de prieteni. */
export default function UserProfile({ userId, onBack, onSelect, onError }) {
  const [profile, setProfile] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [isOwn, setIsOwn] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setBusy(false);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    Promise.all([
      getDirectoryProfile(userId),
      getFriends(userId),
      getSessionUser(),
    ])
      .then(([data, friends, user]) => {
        if (cancelled) return;
        setProfile(data);
        setFriendCount(friends.length);
        setIsOwn(user?.id === userId);
      })
      .catch((err) => { if (!cancelled) onError?.(err.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [userId, onError]);

  if (busy) {
    return <p className="text-[13px] font-semibold text-ink-400">Se încarcă…</p>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[13px] font-semibold text-ink-400">
          Profilul nu a fost găsit — poate e privat.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-ink-900/[.09] bg-white px-3.5 py-2
              text-[12.5px] font-extrabold text-ink-700 hover:border-signa-500 hover:text-signa-600"
          >
            Înapoi
          </button>
        )}
      </div>
    );
  }

  const since = memberSinceLabel(profile.created_at);
  const level = playerLevel(profile.xp);
  const firstName = (profile.display_name || 'Jucător').split(/\s+/)[0];
  const streak = profile.streak ?? 0;

  return (
    <div className="flex flex-col gap-[18px]">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={anim('sg-fade-right', 0.45, 0, 'backwards')}
          className="self-start rounded-full border border-ink-900/[.09] bg-white px-3.5 py-2
            text-[12.5px] font-extrabold text-ink-700 transition-[color,border-color,transform]
            duration-[160ms] ease-out hover:border-signa-500 hover:text-signa-600 hover:-translate-y-px"
        >
          ← Înapoi
        </button>
      )}

      <div
        style={anim('sg-fade-up', 0.7, 0.06)}
        className="relative overflow-hidden rounded-[22px] lg:rounded-[26px] px-7 py-7 lg:px-8 lg:py-[30px]
          bg-[linear-gradient(135deg,#064e3b,#065f46_52%,#047857)]
          shadow-[0_18px_38px_rgba(6,78,59,.24)]"
      >
        <span
          aria-hidden
          className="absolute -top-[140px] -right-[60px] w-[320px] h-[320px] rounded-full pointer-events-none sg-aurora-a"
          style={{
            background: 'radial-gradient(circle, rgba(52,211,153,.48), transparent 70%)',
            filter: 'blur(48px)',
          }}
        />
        <span
          aria-hidden
          className="absolute -bottom-[100px] left-[16%] w-[240px] h-[240px] rounded-full pointer-events-none sg-aurora-b"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,.16), transparent 72%)',
            filter: 'blur(50px)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[34%] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)',
            animation: 'sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.2s infinite',
          }}
        />

        <div className="relative flex items-center gap-5">
          <span className="relative w-[68px] h-[68px] flex-none">
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full border-2 border-white/40 pointer-events-none sg-pulse-ring"
            />
            <span
              style={anim('sg-scale-in', 0.55, 0.18, 'backwards')}
              className="relative w-full h-full rounded-full bg-signa-400 text-signa-900
                flex items-center justify-center font-black text-[22px] overflow-hidden
                shadow-[0_10px_24px_rgba(4,44,32,.28)]"
            >
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : initialsOf(profile.display_name)}
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <p
              style={anim('sg-fade-right', 0.5, 0.22)}
              className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-emerald-100/70"
            >
              Nivel {level}
            </p>
            <h2
              style={anim('sg-fade-up', 0.6, 0.28)}
              className="mt-1 text-[22px] lg:text-[26px] font-black text-white truncate"
            >
              {profile.display_name || 'Jucător'}
            </h2>
            <p
              style={anim('sg-fade-up', 0.55, 0.34)}
              className="mt-1 text-[13px] font-semibold text-cream/65"
            >
              {since ? `Membru din ${since}` : 'Jucător Signa'}
            </p>
          </div>

          {!isOwn && <FollowButton userId={userId} onError={onError} onDark />}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Stat value={level} label="Nivel" delay={0.36} accent="text-signa-900" />
        <Stat value={profile.xp ?? 0} label="XP" delay={0.44} />
        <Stat value={streak} label={streak === 1 ? 'Zi la rând' : 'Zile la rând'} delay={0.52} accent="text-amber-700" />
        <Stat value={friendCount} label={friendCount === 1 ? 'Prieten' : 'Prieteni'} delay={0.6} />
      </div>

      <div>
        <p
          style={anim('sg-fade-right', 0.5, 0.5)}
          className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
        >
          Prietenii lui {firstName}
        </p>
        <FriendsList userId={userId} onSelect={onSelect} onError={onError} />
      </div>
    </div>
  );
}
