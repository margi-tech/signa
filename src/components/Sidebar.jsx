import { useEffect, useRef, useState } from 'react';
import {
  BookIcon, CamIcon, ChartIcon, DownloadIcon, HandIcon, HomeIcon,
  PulseIcon, TrendIcon, UserIcon,
} from './icons.jsx';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/** Poziția fiecărui ecran în meniu — dă și direcția tranziției. */
export const PAGE_ORDER = {
  home: 0, lessons: 1, camera: 2, leaderboard: 3, profile: 4,
};

const NAV_STEP = 52; // 48px înălțime item + 4px gap

/** Pastila colorată din dreptul fiecărui capitol. */
const CHAPTER_COLORS = {
  ch1: '#10b981',
  ch2: '#4f46e5',
  ch3: '#2563eb',
  ch4: '#b45309',
  ch5: '#be185d',
  ch6: '#0d9488',
  ch7: '#7c3aed',
  ch8: '#e11d48',
};

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

function ToolButton({ icon: Icon, label, onClick, delay }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={anim('sg-fade-in', 0.5, delay, 'both', 'ease-out')}
      className="group flex items-center gap-[11px] text-left px-[14px] py-2.5 rounded-[11px]
        text-[13.5px] font-medium text-ink-400 hover:text-ink-700 hover:bg-ink-900/[.04]
        transition-[color,background-color] duration-[180ms] ease-out"
    >
      <span
        className="flex transition-transform duration-[260ms] group-hover:scale-[1.16]"
        style={{ transitionTimingFunction: EASE }}
      >
        <Icon className="w-4 h-4" />
      </span>
      {label}
    </button>
  );
}

/**
 * Sidebar-ul persistent al shell-ului: nu se remontează la navigare, ca
 * tranziția de conținut să curgă fără să clipească meniul. Cardul de nivel
 * și uneltele se strâng pe Lecții, ca să facă loc listei de capitole.
 */
export default function Sidebar({
  page, onNavigate,
  chapters, selectedChapterId, onSelectChapter, starsFor,
  level, xpIntoLevel, xpNeeded, totalLessonsCount, rank,
  firstName, initials, avatarUrl, streak,
  onCollect, onTrain, onDiagnostic, onReferinte, isAdmin = false,
}) {
  const onLessons = page === 'lessons';
  const levelPct = xpNeeded > 0 ? Math.min(xpIntoLevel / xpNeeded, 1) : 0;
  const streakLabel = `${streak} ${streak === 1 ? 'zi' : 'zile'}`;

  // Bara de nivel pornește de la 0% ca tranziția de lățime să aibă ce anima.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Liquid glass care urmărește cursorul prin nav. */
  const [glass, setGlass] = useState({ y: null, stretch: 1, vis: false, warp: false });
  const lastPos = useRef({ y: null, t: 0 });
  const warpTimer = useRef(null);
  const settleTimer = useRef(null);
  useEffect(() => () => { clearTimeout(warpTimer.current); clearTimeout(settleTimer.current); }, []);

  const navPos = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(r.height - 48, e.clientY - r.top - 24));
  };

  // La intrare sare direct sub cursor (fără tranziție), ca să nu alunece
  // din poziția în care a rămas data trecută.
  const onNavEnter = (e) => {
    const y = navPos(e);
    lastPos.current = { y: null, t: 0 };
    clearTimeout(warpTimer.current);
    warpTimer.current = setTimeout(() => setGlass((g) => ({ ...g, warp: false })), 40);
    setGlass({ y, vis: true, warp: true, stretch: 1 });
  };

  // Capsula se întinde după viteza cursorului și se relaxează la oprire.
  const onNavMove = (e) => {
    const y = navPos(e);
    const now = performance.now();
    const last = lastPos.current;
    const v = last.y != null && now > last.t ? Math.abs(y - last.y) / (now - last.t) : 0;
    lastPos.current = { y, t: now };
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setGlass((g) => ({ ...g, stretch: 1 })), 120);
    setGlass((g) => ({ ...g, y, vis: true, stretch: Math.min(1.16, 1 + v * 0.05) }));
  };

  const onNavLeave = () => {
    lastPos.current = { y: null, t: 0 };
    clearTimeout(settleTimer.current);
    clearTimeout(warpTimer.current);
    setGlass((g) => ({ ...g, vis: false, stretch: 1 }));
  };

  const squeeze = 1 - (glass.stretch - 1) * 0.55;
  const glassStyle = glass.y === null
    ? { opacity: 0, transform: 'translateY(0px) scale(1,.86)', transition: 'opacity .2s ease-out' }
    : glass.vis
      ? {
        opacity: 1,
        transform: `translateY(${glass.y.toFixed(1)}px) scale(${squeeze.toFixed(3)},${glass.stretch.toFixed(3)})`,
        transition: glass.warp
          ? 'opacity .18s ease-out'
          : `transform .34s ${EASE}, opacity .18s ease-out`,
      }
      // Dispare pe loc, unde a ieșit cursorul — doar opacity + o mică strângere.
      : {
        opacity: 0,
        transform: `translateY(${glass.y.toFixed(1)}px) scale(.97,.9)`,
        transition: `opacity .26s ease-out, transform .26s ${EASE}`,
      };

  const navItems = [
    { icon: HomeIcon, label: 'Acasă', page: 'home' },
    {
      icon: BookIcon,
      label: 'Lecții',
      page: 'lessons',
      badge: (
        <span className="text-[11px] font-extrabold text-ink-500 bg-ink-900/[.05] rounded-full px-[9px] py-[3px] tabular-nums">
          {totalLessonsCount}
        </span>
      ),
    },
    {
      icon: CamIcon,
      label: 'Cameră',
      page: 'camera',
      badge: (
        <span aria-hidden className="relative w-[7px] h-[7px] flex-none" title="Camera disponibilă">
          <span className="absolute inset-0 rounded-full bg-signa-500" />
          <span className="absolute -inset-1 rounded-full border-[1.5px] border-signa-500/55 sg-dot-ring" />
        </span>
      ),
    },
    {
      icon: ChartIcon,
      label: 'Clasament',
      page: 'leaderboard',
      badge: rank ? (
        <span className="text-[11px] font-extrabold text-amber-700 bg-[#FFF7E8] rounded-full px-[9px] py-[3px] tabular-nums">
          #{rank.place}
        </span>
      ) : null,
    },
    { icon: UserIcon, label: 'Profil', page: 'profile' },
  ];

  const activeIndex = PAGE_ORDER[page] ?? 0;
  const pillStyle = {
    transform: `translateY(${activeIndex * NAV_STEP}px)`,
    transition: `transform .42s ${EASE}`,
  };

  return (
    <aside
      style={anim('sg-fade-right', 0.65, 0)}
      className="hidden lg:flex flex-col bg-[#FFFDF9] border-r border-ink-900/[.07] px-5 pt-[26px] pb-6 overflow-y-auto scrollbar-hide"
    >
      <div className="flex items-center gap-3 px-2 pb-[30px]">
        <span className="relative w-[38px] h-[38px] flex-none">
          <span
            aria-hidden
            className="absolute inset-0 rounded-[11px] border-2 border-signa-500/55"
            style={{ animation: `sg-pulse-ring 3.6s ${EASE} infinite` }}
          />
          <img src="/icon.svg" alt="" className="w-[38px] h-[38px] rounded-[11px] block" />
        </span>
        <span className="font-black text-[17px] tracking-[.17em] text-ink-900">SIGNA</span>
      </div>

      <div>
        <p
          style={anim('sg-fade-in', 0.5, 0.18, 'both', 'ease-out')}
          className="px-[14px] mb-2.5 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#C4BAA9]"
        >
          Meniu
        </p>

        <nav
          className="relative flex flex-col gap-1"
          onMouseEnter={onNavEnter}
          onMouseMove={onNavMove}
          onMouseLeave={onNavLeave}
        >
          {/* Pilula elementului activ + bara de accent — gliseaza odata cu ecranul */}
          <span
            aria-hidden
            className="absolute left-0 right-0 top-0 h-12 rounded-[14px]
              bg-[linear-gradient(90deg,#E4F5EC,#EFFAF4)] shadow-[inset_0_0_0_1px_rgba(16,185,129,.12)]"
            style={pillStyle}
          />
          <span
            aria-hidden
            className="absolute left-0 top-[14px] w-[3px] h-5 rounded-sm bg-signa-500"
            style={pillStyle}
          />

          {/* Capsula de sticlă lichidă — peste pilulă, sub butoane */}
          <span
            aria-hidden
            className="absolute left-0 right-0 top-0 h-12 rounded-2xl pointer-events-none origin-center"
            style={{
              background: 'rgba(255,255,255,.42)',
              backdropFilter: 'blur(9px) saturate(190%)',
              WebkitBackdropFilter: 'blur(9px) saturate(190%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.95), inset 0 -1px 0 rgba(46,42,36,.05),'
                + ' inset 0 0 0 1px rgba(255,255,255,.55), 0 6px 18px rgba(46,42,36,.07)',
              ...glassStyle,
            }}
          >
            <span
              className="absolute left-[9%] right-[9%] top-px h-[42%]"
              style={{
                borderRadius: '14px 14px 60% 60% / 14px 14px 100% 100%',
                background: 'linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0))',
              }}
            />
            <span
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(100deg,rgba(255,255,255,.28),transparent 42%,transparent 62%,rgba(255,255,255,.22))',
              }}
            />
          </span>

          {navItems.map(({ icon: Icon, label, page: target, badge }) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(target)}
              className={`group relative flex items-center gap-[13px] h-12 px-[14px] rounded-[14px] text-[15px]
                transition-colors duration-200 ease-out
                ${page === target ? 'text-signa-600 font-bold' : 'text-ink-600 font-semibold hover:text-ink-900'}`}
            >
              <span
                className="flex transition-transform duration-[280ms] group-hover:scale-[1.14]"
                style={{ transitionTimingFunction: EASE }}
              >
                <Icon width="19" height="19" />
              </span>
              {badge ? <span className="mr-auto">{label}</span> : label}
              {badge}
            </button>
          ))}
        </nav>
      </div>

      {/* Lista de capitole — se desface doar pe Lecții */}
      <div
        className="overflow-hidden"
        style={{
          transition: `max-height .5s ${EASE}, opacity .34s ease-out, margin-top .5s ${EASE}`,
          // 420, nu 340 cât cerea designul: cele 8 capitole reale ocupă 380px,
          // iar la 340 ultimul rămânea tăiat.
          ...(onLessons
            ? { maxHeight: 420, opacity: 1, marginTop: 22 }
            : { maxHeight: 0, opacity: 0, marginTop: 0, pointerEvents: 'none' }),
        }}
      >
        <div className="border-t border-ink-900/[.07] pt-[18px] flex flex-col gap-0.5">
          <p className="px-[14px] mb-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#C4BAA9]">
            Capitole
          </p>
          {chapters.map((ch) => {
            const stars = ch.lessons.reduce((s, l) => s + starsFor(l.id), 0);
            const selected = ch.id === selectedChapterId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelectChapter(ch.id)}
                className={`flex items-center gap-2.5 px-[14px] py-2.5 rounded-[11px] text-[13.5px] text-left
                  transition-colors duration-[160ms] ease-out flex-shrink-0
                  ${selected
                  ? 'bg-cream-200 text-ink-900 font-extrabold'
                  : 'text-ink-600 font-bold hover:bg-ink-900/[.03]'}`}
              >
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-[3px] flex-shrink-0"
                  style={{ background: CHAPTER_COLORS[ch.id] ?? '#10b981' }}
                />
                <span className="flex-1 truncate">{ch.title}</span>
                <span className={`text-[11px] tabular-nums ${selected ? 'text-ink-500' : 'text-ink-400'}`}>
                  {stars}/{ch.lessons.length * 3}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card de nivel — se strânge pe Lecții */}
      <div
        style={{
          ...anim('sg-fade-up', 0.6, 0.42),
          transition: `max-height .45s ${EASE}, opacity .3s ease-out, margin-top .45s ${EASE}, padding .45s ${EASE}`,
          ...(onLessons
            ? {
              maxHeight: 0,
              opacity: 0,
              marginTop: 0,
              paddingTop: 0,
              paddingBottom: 0,
              borderWidth: 0,
              pointerEvents: 'none',
            }
            : { maxHeight: 120, opacity: 1 }),
        }}
        className="mt-[26px] bg-[#FBF7F0] border border-ink-900/[.06] rounded-[18px] p-4 overflow-hidden"
      >
        <div className="flex items-baseline justify-between mb-[9px]">
          <span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">Nivel {level}</span>
          <span className="text-[11px] font-extrabold text-[#C4BAA9]">Nv. {level + 1}</span>
        </div>
        <div className="relative h-1.5 rounded-full bg-ink-900/[.07] overflow-hidden">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#10b981)]"
            style={{ width: `${(grown ? levelPct : 0) * 100}%`, transition: `width 1.3s ${EASE} .7s` }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-[34%]"
            style={{
              background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent)',
              animation: 'sg-sheen 4.2s cubic-bezier(.4,0,.2,1) 2s infinite',
            }}
          />
        </div>
        <p className="mt-2.5 text-xs font-bold text-ink-500 tabular-nums">
          {xpIntoLevel} <span className="text-[#C4BAA9]">/ {xpNeeded} XP</span>
        </p>
      </div>

      <div className="mt-auto pt-[22px]">
        {/* Unelte — se strâng pe Lecții; rândul de profil rămâne mereu vizibil */}
        <div
          className="flex flex-col gap-0.5 overflow-hidden"
          style={{
            transition: `max-height .45s ${EASE}, opacity .3s ease-out`,
            ...(onLessons
              ? { maxHeight: 0, opacity: 0, pointerEvents: 'none' }
              : { maxHeight: 200, opacity: 1 }),
          }}
        >
          <p
            style={anim('sg-fade-in', 0.5, 0.46, 'both', 'ease-out')}
            className="px-[14px] mb-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#C4BAA9]"
          >
            Unelte
          </p>
          {isAdmin && (
            <>
              <ToolButton icon={DownloadIcon} label="Colectare date" onClick={onCollect} delay={0.5} />
              <ToolButton icon={TrendIcon} label="Antrenare model" onClick={onTrain} delay={0.56} />
              <ToolButton icon={PulseIcon} label="Diagnostic" onClick={onDiagnostic} delay={0.62} />
            </>
          )}
          {onReferinte && (
            <ToolButton icon={HandIcon} label="Referințe LSR" onClick={onReferinte} delay={0.68} />
          )}
        </div>

        <div
          style={anim('sg-fade-up', 0.6, 0.68)}
          className="mt-3.5 pt-4 border-t border-ink-900/[.07] flex items-center gap-[11px]"
        >
          <span className="flex items-center justify-center w-[34px] h-[34px] flex-none rounded-[11px]
            bg-signa-500 text-white text-sm font-black overflow-hidden">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : (initials || firstName[0] || 'S').toUpperCase()}
          </span>
          <span className="min-w-0 flex flex-col">
            <span className="text-[13.5px] font-extrabold text-ink-900 leading-tight truncate">
              {firstName || 'Jucător'}
            </span>
            <span className="text-[11.5px] font-semibold text-ink-400 leading-tight tabular-nums">
              {streakLabel} la rând
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}
