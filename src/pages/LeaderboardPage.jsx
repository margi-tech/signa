import { useEffect, useMemo, useState } from 'react';
import { getOwnProfile, getSessionUser, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useProgress } from '../hooks/useProgress';

const EASE = 'cubic-bezier(.22,1,.36,1)';

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

/** Culorile medaliilor, pe locuri (index 0 = locul 1). */
const MEDALS = ['#F5C451', '#CBD5E1', '#D6A57C'];

/** Înălțimea coloanei de podium, pe locuri. */
const PODIUM_H = [214, 172, 146];

/** Ordinea vizuală a coloanelor: locul 2 la stânga, 1 la mijloc, 3 la dreapta. */
const PODIUM_ORDER = [1, 0, 2];

/** XP mediu pe lecție — pentru estimarea „câte lecții până la locul de deasupra”. */
const XP_PER_LESSON = 30;

const initialsOf = (name) => (name || '?')
  .trim().split(/\s+/).map((w) => w[0]).filter(Boolean)
  .join('').toUpperCase()
  .slice(0, 2) || '?';

const firstNameOf = (name) => (name || 'Jucător').trim().split(/\s+/)[0];

/**
 * Clasament — live din view-ul `leaderboard` când Supabase e activ,
 * altfel afișează doar scorul local.
 */
export default function LeaderboardPage() {
  const { xp, streak } = useProgress();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [privateProfile, setPrivateProfile] = useState(false);
  const [meId, setMeId] = useState(null);
  const [scope, setScope] = useState('all');

  // Podiumul și barele repornesc la fiecare intrare pe ecran și la schimbarea
  // filtrului — de aceea `on` trece prin false înainte de true.
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(false);
    const id = setTimeout(() => setOn(true), 90);
    return () => clearTimeout(id);
  }, [scope]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('xp', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error) setErr(error.message);
      else setRows(data ?? []);

      try {
        const [profile, user] = await Promise.all([getOwnProfile(), getSessionUser()]);
        if (cancelled) return;
        setPrivateProfile(profile?.visibility === 'private');
        setMeId(user?.id ?? null);
      } catch {
        /* fără sesiune */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const podium = rows.slice(0, 3);
  const totalXp = useMemo(() => rows.reduce((s, r) => s + (r.xp ?? 0), 0), [rows]);
  const topXp = rows[0]?.xp ?? 0;

  const myIndex = meId ? rows.findIndex((r) => r.id === meId) : -1;
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const myXp = me?.xp ?? xp;
  const ahead = myIndex > 0 ? rows[myIndex - 1] : null;
  const xpToNext = ahead ? Math.max(ahead.xp - myXp, 0) : 0;
  const lessonsToNext = Math.max(Math.ceil(xpToNext / XP_PER_LESSON), 1);

  return (
    <div className="min-h-full flex flex-col gap-[22px]
      px-5 pt-5 pb-8 lg:px-11 lg:pt-[34px] lg:pb-11
      bg-[radial-gradient(110%_45%_at_50%_0%,#F3FBF6_0%,#FFFBF3_62%)]
      lg:bg-[radial-gradient(ellipse_70%_50%_at_85%_0%,#FFFDF7,#FBF6ED)]">

      {/* 1 · Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <p
            style={anim('sg-fade-right', 0.6, 0.06)}
            className="text-[10.5px] lg:text-xs font-extrabold uppercase tracking-[.14em] lg:tracking-[.22em] text-ink-400"
          >
            Clasament · Din totdeauna
          </p>
          <h1
            style={anim('sg-fade-up', 0.7, 0.14)}
            className="mt-1.5 lg:mt-2 text-[29px] lg:text-[2.6rem] font-black text-ink-900
              tracking-[-.02em] lg:tracking-[-.025em] leading-tight lg:leading-[1.1] text-pretty"
          >
            Cine e în față
          </h1>
          <p
            style={anim('sg-fade-up', 0.7, 0.2)}
            className="mt-1 text-[13.5px] font-semibold text-ink-500 tabular-nums"
          >
            {rows.length} {rows.length === 1 ? 'jucător' : 'jucători'} · {totalXp} XP adunați
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            disabled
            title="Schema nu ține istoric de XP pe săptămână — vezi nota din cod."
            style={anim('sg-scale-in', 0.5, 0.22)}
            className="rounded-full px-3.5 py-2 text-[12.5px] font-extrabold border bg-white
              border-ink-900/[.09] text-ink-700 opacity-50 cursor-not-allowed"
          >
            Săptămâna
          </button>
          <button
            type="button"
            onClick={() => setScope('all')}
            style={anim('sg-scale-in', 0.5, 0.29)}
            className={`rounded-full px-3.5 py-2 text-[12.5px] font-extrabold border
              transition-[color,background-color,border-color,transform] duration-[160ms] ease-out
              ${scope === 'all'
              ? 'bg-ink-900 border-ink-900 text-white'
              : 'bg-white border-ink-900/[.09] text-ink-700 hover:border-signa-500 hover:text-signa-600 hover:-translate-y-px'}`}
          >
            Din totdeauna
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <p className="text-ink-500 text-sm leading-relaxed">
          Clasamentul între jucători apare după ce echipa configurează Supabase
          (vezi <code className="text-ink-700">.env.example</code>).
        </p>
      )}
      {err && <p className="text-red-500 text-[13px] font-semibold">{err}</p>}
      {privateProfile && (
        <p className="text-ink-500 text-[13px] leading-relaxed">
          Profilul tău e privat — nu apari în clasament. Îl poți face public din Profil.
        </p>
      )}

      {/* 2 · Podium + poziția ta */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[18px] items-stretch">
        <div
          style={anim('sg-fade-up', 0.75, 0.3)}
          className="relative overflow-hidden rounded-3xl lg:rounded-[26px] px-[34px] pt-[30px]
            bg-[linear-gradient(135deg,#064e3b,#065f46_52%,#047857)]
            shadow-[0_18px_38px_rgba(6,78,59,.24)] lg:shadow-[0_20px_48px_rgba(8,74,52,.24)]"
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
            className="absolute -bottom-[110px] left-[20%] w-[280px] h-[280px] rounded-full pointer-events-none sg-aurora-b"
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
              animation: 'sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.6s infinite',
            }}
          />

          {podium.length > 0 ? (
            <div className="relative grid grid-cols-[1fr_1.12fr_1fr] items-end h-[290px]">
              {PODIUM_ORDER.map((place) => {
                const row = podium[place];
                if (!row) return <div key={place} />;
                const isMe = row.id === meId;
                const size = place === 0 ? 62 : 54;
                return (
                  <div key={place} className="flex flex-col items-center justify-end h-full">
                    <div
                      className="flex flex-col items-center"
                      style={anim('sg-fade-up', 0.6, 0.72 + place * 0.09)}
                    >
                      {place === 0 && (
                        <span
                          aria-hidden
                          className="text-[22px] leading-none mb-1"
                          style={{ animation: 'sg-crown 2.6s ease-in-out infinite' }}
                        >
                          👑
                        </span>
                      )}
                      <span className="relative flex-none" style={{ width: size, height: size }}>
                        {place === 0 && (
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full border-2 border-white/45"
                            style={{ animation: `sg-pulse-ring 3s ${EASE} 1.4s infinite` }}
                          />
                        )}
                        <span
                          className="w-full h-full rounded-full flex items-center justify-center
                            font-black text-signa-900 transition-transform duration-[220ms] ease-out
                            hover:-translate-y-[3px] hover:scale-105"
                          style={{
                            background: MEDALS[place],
                            fontSize: place === 0 ? 22 : 19,
                            boxShadow: '0 10px 24px rgba(4,44,32,.28)',
                          }}
                        >
                          {initialsOf(row.display_name)}
                        </span>
                      </span>
                      <span className="mt-2 text-[13.5px] font-extrabold text-white truncate max-w-[9rem]">
                        {isMe ? 'Tu' : firstNameOf(row.display_name)}
                      </span>
                      <span className="text-[12px] font-bold text-cream/65 tabular-nums">
                        {row.xp} XP
                      </span>
                    </div>

                    <div
                      className="w-full mt-3 rounded-t-2xl bg-white/[.14] border-x border-t border-white/[.16]"
                      style={{
                        height: PODIUM_H[place],
                        transformOrigin: 'bottom',
                        transform: `scaleY(${on ? 1 : 0})`,
                        transition: `transform .8s ${EASE} ${0.5 + place * 0.11}s`,
                      }}
                    >
                      <span className="block pt-3 text-center text-[15px] font-black text-white/70 tabular-nums">
                        #{place + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative h-[290px] flex items-center justify-center">
              <p className="text-[13.5px] font-semibold text-cream/65">
                Încă nu e nimeni în clasament.
              </p>
            </div>
          )}
        </div>

        {/* Poziția ta */}
        <div className="bg-white border border-ink-900/[.05] rounded-[22px] lg:rounded-[26px]
          shadow-[0_10px_30px_rgba(46,42,36,.06)]
          px-6 py-[22px] lg:px-8 lg:py-[30px] flex flex-col justify-between gap-4">
          <div>
            <p
              style={anim('sg-fade-right', 0.6, 0.54)}
              className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
            >
              Poziția ta
            </p>
            <p style={anim('sg-fade-up', 0.6, 0.6)} className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[38px] font-black text-ink-900 leading-none tabular-nums">
                {myIndex >= 0 ? `#${myIndex + 1}` : '—'}
              </span>
              <span className="text-[15px] font-bold text-ink-400 tabular-nums">
                din {rows.length}
              </span>
            </p>

            <div className="relative mt-3.5 h-[9px] rounded-full bg-ink-900/[.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-signa-400 to-signa-600"
                style={{
                  width: `${on && topXp > 0 ? Math.min((myXp / topXp) * 100, 100) : 0}%`,
                  transition: `width 1.2s ${EASE} .7s`,
                }}
              />
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 w-[34%] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)',
                  animation: 'sg-sheen 4.2s cubic-bezier(.4,0,.2,1) 2s infinite',
                }}
              />
            </div>

            <p
              style={anim('sg-fade-in', 0.5, 0.8, 'both', 'ease-out')}
              className="mt-2.5 text-[12px] font-bold text-ink-500 tabular-nums"
            >
              {ahead
                ? `${xpToNext} XP până la locul ${myIndex}`
                : myIndex === 0 ? 'Ești pe primul loc.' : 'Intră în clasament ca să vezi decalajul.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-ink-900/[.06] pt-[18px]">
            <div style={anim('sg-fade-up', 0.6, 0.72)}>
              <p className="text-[19px] lg:text-[23px] font-black text-signa-900 leading-none tabular-nums">
                {myXp}
              </p>
              <p className="mt-1.5 lg:mt-[5px] text-[9.5px] lg:text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                XP total
              </p>
            </div>
            <div style={anim('sg-fade-up', 0.6, 0.8)}>
              <p className="text-[19px] lg:text-[23px] font-black text-amber-700 leading-none tabular-nums flex items-center gap-1.5">
                <span aria-hidden style={{ animation: 'sg-flame 1.9s ease-in-out infinite' }}>🔥</span>
                {me?.streak ?? streak}
              </p>
              <p className="mt-1.5 lg:mt-[5px] text-[9.5px] lg:text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                Zile la rând
              </p>
            </div>
          </div>

          {ahead && (
            <div className="rounded-[14px] bg-[#E9F7F0] border border-signa-500/[.14] px-3.5 py-3">
              <p className="text-[12px] font-bold text-signa-900 leading-relaxed">
                {lessonsToNext === 1
                  ? 'Încă o lecție și treci de locul următor.'
                  : `Încă ${lessonsToNext} lecții și treci de locul următor.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3 · Lista completă */}
      {rows.length > 0 && (
        <div className="bg-white border border-ink-900/[.05] rounded-[22px] overflow-hidden
          shadow-[0_6px_20px_rgba(46,42,36,.05)]">
          {rows.map((row, i) => {
            const isMe = row.id === meId;
            const medal = i < 3 ? MEDALS[i] : null;
            return (
              <div
                key={row.id}
                style={{
                  ...anim('sg-row-in', 0.5, 0.5 + i * 0.05),
                  ...(isMe ? { boxShadow: 'inset 3px 0 0 #10b981' } : null),
                }}
                className={`group grid grid-cols-[52px_40px_1fr_auto_auto] items-center gap-4
                  px-6 py-3.5 transition-[background-color,transform] duration-[220ms] ease-out
                  hover:bg-[#FBF7F0] hover:translate-x-[3px]
                  ${i > 0 ? 'border-t border-ink-900/[.05]' : ''}
                  ${isMe ? 'bg-[#F3FAF6]' : ''}`}
              >
                <span
                  className="text-[15px] font-black tabular-nums"
                  style={medal
                    ? { color: medal, filter: 'saturate(.9) brightness(.82)' }
                    : { color: '#A69C8D' }}
                >
                  #{i + 1}
                </span>

                <span
                  className="w-10 h-10 rounded-[13px] bg-signa-50 text-signa-600 flex items-center
                    justify-center font-black text-[13px] transition-transform duration-[220ms] ease-out
                    group-hover:scale-[1.08] group-hover:-rotate-[5deg]"
                >
                  {initialsOf(row.display_name)}
                </span>

                <span className="min-w-0 text-[14px] font-extrabold text-ink-900 truncate">
                  {row.display_name || 'Jucător'}
                  {isMe && <span className="text-ink-400 font-bold"> (tu)</span>}
                </span>

                <span
                  className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 tabular-nums
                    ${row.streak >= 7
                    ? 'bg-[#FFF7E8] text-amber-700'
                    : 'bg-ink-900/[.05] text-ink-500'}`}
                >
                  {row.streak >= 7 ? '🔥 ' : ''}{row.streak ?? 0}
                </span>

                <span className="text-[14px] font-black text-signa-900 tabular-nums w-[72px] text-right">
                  {row.xp} XP
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
