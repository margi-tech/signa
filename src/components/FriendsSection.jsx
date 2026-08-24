import { useCallback, useEffect, useState } from 'react';
import {
  getFollowers,
  getFollowing,
  getFriends,
  getSessionUser,
  isSupabaseConfigured,
} from '../lib/supabase';
import UserSearch from './UserSearch';
import FriendsList from './FriendsList';
import UserProfile from './UserProfile';
import { useCountUp } from '../hooks/useCountUp';

const EASE = 'cubic-bezier(.22,1,.36,1)';

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

const TABS = [
  { id: 'friends', label: 'Prietenii mei' },
  { id: 'requests', label: 'Cereri' },
  { id: 'search', label: 'Caută' },
];

function CountChip({ value, label, delay, onClick, active }) {
  const shown = useCountUp(value, { duration: 800, delay: delay * 1000 + 220 });
  return (
    <button
      type="button"
      onClick={onClick}
      style={anim('sg-fade-up', 0.55, delay, 'backwards')}
      className={`rounded-[16px] border px-3.5 py-3 text-left transition-transform duration-[160ms] ease-out
        hover:-translate-y-px
        ${active
          ? 'bg-signa-50 border-signa-500/[.22] ring-2 ring-signa-500/30'
          : 'bg-[#FBF7F0] border-ink-900/[.06]'}`}
    >
      <p className="text-[20px] font-black leading-none tabular-nums text-ink-900">{shown}</p>
      <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-ink-400">
        {label}
      </p>
    </button>
  );
}

/**
 * Cercul de prieteni — listă, cereri, căutare. Folosit pe Profil.
 */
export default function FriendsSection({ userId: userIdProp } = {}) {
  const [meId, setMeId] = useState(userIdProp ?? null);
  const [tab, setTab] = useState('friends');
  const [selectedId, setSelectedId] = useState(null);
  const [err, setErr] = useState('');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [requests, setRequests] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (userIdProp) {
      setMeId(userIdProp);
      return undefined;
    }
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    getSessionUser()
      .then((user) => { if (!cancelled) setMeId(user?.id ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userIdProp]);

  useEffect(() => {
    if (!meId) return undefined;
    let cancelled = false;
    Promise.all([getFriends(meId), getFollowing(meId), getFollowers(meId)])
      .then(([friendList, following, followers]) => {
        if (cancelled) return;
        const friendIds = new Set(friendList.map((u) => u.id));
        const followingIds = new Set(following.map((u) => u.id));
        setFriends(friendList);
        setPending(following.filter((u) => !friendIds.has(u.id)));
        setRequests(followers.filter((u) => !followingIds.has(u.id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [meId, tab, selectedId, tick]);

  const onError = useCallback((message) => setErr(message || 'Ceva n-a mers.'), []);
  const openProfile = useCallback((id) => { setErr(''); setSelectedId(id); }, []);
  const goSearch = useCallback(() => { setSelectedId(null); setTab('search'); }, []);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const requestCount = requests.length;

  return (
    <div
      style={anim('sg-fade-up', 0.7, 0.18)}
      className="rounded-[20px] lg:rounded-[22px] bg-white border border-ink-900/[0.06]
        shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_24px_rgba(46,42,36,.045)]
        p-5 md:p-[26px_28px] flex flex-col gap-[18px]"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <p
            style={anim('sg-fade-right', 0.55, 0.22)}
            className="text-[10.5px] font-extrabold uppercase tracking-[.13em] text-ink-400"
          >
            Social · Urmăriri reciproce
          </p>
          <h2
            style={anim('sg-fade-up', 0.6, 0.28)}
            className="mt-1 text-[17px] md:text-[19px] font-black text-ink-900"
          >
            Prieteni
          </h2>
          <p
            style={anim('sg-fade-up', 0.55, 0.34)}
            className="mt-1 text-[13px] font-semibold text-ink-500 leading-relaxed"
          >
            Urmărește pe cineva — când te urmărește înapoi, deveniți prieteni.
          </p>
        </div>

        {!selectedId && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setErr(''); }}
                style={anim('sg-scale-in', 0.45, 0.32 + i * 0.06, 'backwards')}
                className={`rounded-full px-3.5 py-2 text-[12.5px] font-extrabold border inline-flex items-center
                  transition-[color,background-color,border-color,transform] duration-[160ms] ease-out
                  ${tab === t.id
                    ? 'bg-ink-900 border-ink-900 text-white'
                    : 'bg-white border-ink-900/[.09] text-ink-700 hover:border-signa-500 hover:text-signa-600 hover:-translate-y-px'}`}
              >
                {t.label}
                {t.id === 'requests' && requestCount > 0 && (
                  <span className={`ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center
                    rounded-full text-[10px] font-black tabular-nums
                    ${tab === t.id ? 'bg-white/20 text-white' : 'bg-signa-500 text-white'}`}>
                    {requestCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {err && <p className="text-red-500 text-[13px] font-semibold">{err}</p>}

      {!selectedId && tab !== 'search' && (
        <div className="grid grid-cols-3 gap-2.5">
          <CountChip
            value={friends.length}
            label="Prieteni"
            delay={0.38}
            active={tab === 'friends'}
            onClick={() => setTab('friends')}
          />
          <CountChip
            value={requestCount}
            label="Cereri"
            delay={0.46}
            active={tab === 'requests'}
            onClick={() => setTab('requests')}
          />
          <CountChip
            value={pending.length}
            label="Îi urmărești"
            delay={0.54}
            active={tab === 'friends'}
            onClick={() => setTab('friends')}
          />
        </div>
      )}

      <div className="relative">
        {selectedId ? (
          <UserProfile
            userId={selectedId}
            onBack={() => setSelectedId(null)}
            onSelect={openProfile}
            onError={onError}
          />
        ) : tab === 'search' ? (
          <UserSearch onSelect={openProfile} onError={onError} />
        ) : tab === 'requests' ? (
          <FriendsList
            userId={meId}
            mode="requests"
            onSelect={openProfile}
            onError={onError}
            onChanged={refresh}
            onFindFriends={goSearch}
          />
        ) : (
          <FriendsList
            userId={meId}
            includeFollowing
            onSelect={openProfile}
            onError={onError}
            onChanged={refresh}
            onFindFriends={goSearch}
          />
        )}
      </div>
    </div>
  );
}
