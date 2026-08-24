import { useEffect, useState } from 'react';
import {
  getFriends,
  getFollowing,
  getIncomingRequests,
  isSupabaseConfigured,
} from '../lib/supabase';
import UserRow from './UserRow';
import { UsersIcon } from './icons';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (name, dur, delay = 0) =>
  ({ animation: `${name} ${dur}s ${EASE} ${delay}s both` });

const sinceLabel = (iso) => {
  if (!iso) return null;
  try {
    return `Prieteni din ${new Date(iso).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}`;
  } catch {
    return null;
  }
};

function PeopleCard({ people, subtitleOf, followLabel, onSelect, onStatusChange, onError }) {
  return (
    <div className="rounded-[18px] border border-ink-900/[.06] overflow-hidden">
      {people.map((person, i) => (
        <UserRow
          key={person.id}
          user={person}
          subtitle={subtitleOf?.(person)}
          followLabel={followLabel}
          onSelect={onSelect}
          onStatusChange={onStatusChange}
          onError={onError}
          delay={i * 0.04}
        />
      ))}
    </div>
  );
}

function EmptyNote({ title, body, action, onAction }) {
  return (
    <div
      style={anim('sg-fade-up', 0.6, 0.08)}
      className="relative overflow-hidden rounded-[18px] bg-[#FBF7F0] border border-ink-900/[.05]
        px-6 py-8 text-center"
    >
      <span
        aria-hidden
        className="absolute -top-[80px] -right-[40px] w-[200px] h-[200px] rounded-full pointer-events-none sg-aurora-a"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,.16), transparent 70%)',
          filter: 'blur(36px)',
        }}
      />
      <span
        style={anim('sg-scale-in', 0.5, 0.12)}
        className="relative mx-auto mb-4 w-12 h-12 rounded-2xl bg-signa-50 text-signa-600
          flex items-center justify-center"
      >
        <UsersIcon className="w-6 h-6" />
      </span>
      <p className="relative text-[15px] font-extrabold text-ink-900">{title}</p>
      <p className="relative mt-1.5 text-[13px] font-semibold text-ink-500 leading-relaxed max-w-sm mx-auto">
        {body}
      </p>
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="relative mt-4 rounded-full bg-ink-900 text-white px-4 py-2 text-[12.5px] font-extrabold
            transition-transform duration-[160ms] ease-out hover:-translate-y-px"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * Liste sociale. `mode`:
 *  - friends — prieteni reciproci; cu includeFollowing și pe cine urmărești tu
 *  - requests — cine te urmărește, fără follow înapoi (cereri)
 */
export default function FriendsList({
  userId,
  mode = 'friends',
  includeFollowing = false,
  onSelect,
  onError,
  onChanged,
  onFindFriends,
}) {
  const [friends, setFriends] = useState([]);
  const [following, setFollowing] = useState([]);
  const [requests, setRequests] = useState([]);
  const [busy, setBusy] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      setBusy(false);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);

    const load = mode === 'requests'
      ? getIncomingRequests(userId).then((incoming) => {
        if (cancelled) return;
        setRequests(incoming);
        setFriends([]);
        setFollowing([]);
      })
      : Promise.all([
        getFriends(userId),
        includeFollowing ? getFollowing(userId) : Promise.resolve([]),
      ]).then(([friendData, followingData]) => {
        if (cancelled) return;
        setFriends(friendData);
        setFollowing(followingData ?? []);
        setRequests([]);
      });

    load
      .catch((err) => { if (!cancelled) onError?.(err.message); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [userId, includeFollowing, mode, onError, tick]);

  const reload = () => {
    setTick((n) => n + 1);
    onChanged?.();
  };

  if (busy) {
    return <p className="text-[13px] font-semibold text-ink-400">Se încarcă…</p>;
  }

  if (mode === 'requests') {
    if (requests.length === 0) {
      return (
        <EmptyNote
          title="Nicio cerere"
          body="Când cineva te urmărește, apare aici. Urmărește-l înapoi ca să deveniți prieteni."
          action={onFindFriends ? 'Caută jucători' : null}
          onAction={onFindFriends}
        />
      );
    }
    return (
      <section>
        <p
          style={anim('sg-fade-right', 0.5, 0.04)}
          className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
        >
          Te urmăresc
        </p>
        <p
          style={anim('sg-fade-up', 0.5, 0.1)}
          className="mb-3 text-[13px] font-semibold text-ink-500"
        >
          Acceptă urmărindu-i înapoi. Atunci deveniți prieteni.
        </p>
        <PeopleCard
          people={requests}
          subtitleOf={() => 'Vrea să fii prieten'}
          followLabel="Acceptă"
          onSelect={onSelect}
          onStatusChange={reload}
          onError={onError}
        />
      </section>
    );
  }

  const friendIds = new Set(friends.map((f) => f.id));
  const pending = following.filter((u) => !friendIds.has(u.id));
  const empty = friends.length === 0 && pending.length === 0;

  if (empty) {
    return (
      <EmptyNote
        title={includeFollowing ? 'Cercul e gol deocamdată' : 'Niciun prieten de arătat'}
        body={includeFollowing
          ? 'Caută un jucător și urmărește-l. Când te urmărește și el înapoi, deveniți prieteni.'
          : 'Profilul ăsta n-are încă urmăriri reciproce.'}
        action={includeFollowing && onFindFriends ? 'Caută prieteni' : null}
        onAction={onFindFriends}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {friends.length > 0 && (
        <section>
          {includeFollowing && pending.length > 0 && (
            <p
              style={anim('sg-fade-right', 0.5, 0.04)}
              className="mb-3 text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
            >
              Prieteni
            </p>
          )}
          <PeopleCard
            people={friends}
            subtitleOf={(p) => sinceLabel(p.since)}
            onSelect={onSelect}
            onStatusChange={reload}
            onError={onError}
          />
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <p
            style={anim('sg-fade-right', 0.5, 0.08)}
            className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
          >
            Îi urmărești
          </p>
          <p
            style={anim('sg-fade-up', 0.5, 0.12)}
            className="mb-3 text-[13px] font-semibold text-ink-500"
          >
            Deveniți prieteni când te urmăresc înapoi.
          </p>
          <PeopleCard
            people={pending}
            subtitleOf={() => 'Așteaptă urmărirea înapoi'}
            onSelect={onSelect}
            onStatusChange={reload}
            onError={onError}
          />
        </section>
      )}
    </div>
  );
}
