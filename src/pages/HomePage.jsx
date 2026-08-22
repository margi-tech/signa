/* ─────────────────────────────────────────────────────────────────
   HomePage — ecran de reluare: „continuă unde ai rămas”, nu meniu
───────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';
import {
  ArrowIcon, BarsIcon, BookIcon, CamIcon, FlameIcon, HomeIcon,
  LinesIcon, RepeatIcon, SoundIcon, UserIcon,
} from '../components/icons.jsx';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/* ── Utilitare ─────────────────────────────────────────────────── */

/** Numără de la 0 la `target` cu ease-out cubic. */
function useCountUp(target, duration = 1200, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    let timer;
    const run = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        setValue(Math.round(target * (1 - (1 - p) ** 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    setValue(0);
    if (delay) timer = setTimeout(run, delay);
    else run();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [target, duration, delay]);
  return value;
}

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

/* ── Piese ─────────────────────────────────────────────────────── */

/** Inel de progres (mobil) — conic-gradient cu disc interior. */
function Ring({ size, inner, pct, fill, track, innerClass, children }) {
  return (
    <div
      className="flex-none rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${fill} 0turn ${pct}turn, ${track} ${pct}turn 1turn)`,
      }}
    >
      <div
        className={`rounded-full flex flex-col items-center justify-center ${innerClass}`}
        style={{ width: inner, height: inner }}
      >
        {children}
      </div>
    </div>
  );
}

/* Clase complete per tentă — Tailwind nu vede numele construite dinamic. */
const TILE_TONES = {
  signa: { chip: 'bg-signa-50 text-signa-600', border: 'hover:border-signa-500/[.26]' },
  blue: { chip: 'bg-[#E8F1FD] text-blue-600', border: 'hover:border-blue-500/[.26]' },
  amber: { chip: 'bg-[#FDF3E3] text-amber-600', border: 'hover:border-amber-500/[.28]' },
  violet: { chip: 'bg-[#F1ECFB] text-violet-600', border: 'hover:border-violet-500/[.26]' },
};

/** Tile de acțiune — pastilă icon colorată + titlu + subtitlu. */
function Tile({ icon: Icon, tone, title, subtitle, onClick, spin = false, delay = 0 }) {
  const t = TILE_TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      style={anim('sg-fade-up', 0.65, delay)}
      className={`group text-left bg-white border border-ink-900/[.05] rounded-[20px] lg:rounded-[22px] p-4 lg:p-6
        shadow-[0_6px_20px_rgba(46,42,36,.05)]
        transition-[transform,box-shadow,border-color] duration-[220ms] ease-out
        hover:-translate-y-[5px] hover:shadow-[0_18px_36px_rgba(46,42,36,.10)] ${t.border}
        active:-translate-y-px active:scale-[.99]`}
    >
      <span
        className={`flex items-center justify-center w-[34px] h-[34px] lg:w-11 lg:h-11 rounded-xl lg:rounded-[13px] ${t.chip}
          ${spin ? 'transition-transform duration-[400ms] group-hover:rotate-[-150deg]'
        : 'transition-transform duration-[280ms] group-hover:scale-110 group-hover:-rotate-6'}`}
        style={{ transitionTimingFunction: EASE }}
      >
        <Icon className="w-[17px] h-[17px] lg:w-5 lg:h-5" />
      </span>
      <p className="mt-[11px] lg:mt-[18px] text-[14px] lg:text-base font-extrabold text-ink-900">{title}</p>
      <p className="mt-[3px] lg:mt-[5px] text-[11.5px] lg:text-[13.5px] font-medium text-ink-500">{subtitle}</p>
    </button>
  );
}

/** Element din bara de jos (mobil) — minim 44px zonă de tap. */
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 min-h-[44px] px-2 text-[10px] font-extrabold
        transition-colors duration-[160ms] ${active ? 'text-signa-600' : 'text-ink-400 hover:text-signa-600'}`}
    >
      <Icon className="w-5 h-5" strokeWidth="2.1" />
      {label}
    </button>
  );
}

/* ── Pagina ────────────────────────────────────────────────────── */

const DAILY_GOAL = 5;
const RING_LEN = 214; // ≈ 2πr, r = 34

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomePage({
  onLessons, onStart, onSpell, onReview, onProfile, onLeaderboard, onOpenLesson,
  firstName = '', initials = '', rank = null,
}) {
  const {
    xp, streak, level, completedLessonsCount, totalLessonsCount,
    reviewLetters, letterMastery, starsFor, isUnlocked, soundEnabled, setSoundEnabled,
  } = useProgress();

  // Prima lecție deblocată și nefăcută; altfel ultima în care ai stele.
  const nextLesson = useMemo(() => {
    const fresh = LESSONS.find((l) => isUnlocked(l.id) && starsFor(l.id) === 0);
    if (fresh) return fresh;
    const done = [...LESSONS].reverse().find((l) => starsFor(l.id) > 0);
    return done ?? LESSONS[0];
  }, [isUnlocked, starsFor]);

  // Literele validate din lecție = cele exersate corect măcar o dată.
  const validated = useMemo(
    () => new Set(nextLesson.letters.filter((ch) => (letterMastery[ch]?.correct ?? 0) > 0)),
    [nextLesson, letterMastery],
  );
  const pct = nextLesson.letters.length ? validated.size / nextLesson.letters.length : 0;

  // Titlul cardului: teaser-ul lecției doar dacă e scurt — cele lungi sunt
  // note tehnice („necesită modelul GRU”) și ar îneca cardul. Altfel etichetă
  // scurtă după conținut: numere, cuvinte-semn sau litere după `type`.
  const lessonSubtitle = useMemo(() => {
    const teaser = (nextLesson.teaser ?? '').trim();
    if (teaser && teaser.length <= 28) return teaser;
    const isNumbers = nextLesson.letters.every((ch) => /^\d+$/.test(ch));
    if (isNumbers) return 'Numere';
    const isWords = nextLesson.letters.some((ch) => ch.length > 1 && !/^\d+$/.test(ch));
    if (isWords) return 'Cuvinte-semn';
    return nextLesson.type === 'dynamic' ? 'Litere cu mișcare' : 'Litere fără mișcare';
  }, [nextLesson]);

  // Semne exersate azi — pentru inelul „obiectivul zilei”.
  const signsToday = useMemo(() => {
    const today = todayKey();
    return Object.values(letterMastery)
      .filter((m) => (m?.lastAt ?? '').slice(0, 10) === today).length;
  }, [letterMastery]);
  const goalDone = Math.min(signsToday, DAILY_GOAL);
  const goalLeft = DAILY_GOAL - goalDone;
  const goalPct = goalDone / DAILY_GOAL;

  // Cifrele de pe desktop urcă de la 0 la intrare.
  const xpCount = useCountUp(xp, 1300);
  const goalCount = useCountUp(goalDone, 1500, 700);
  const doneCount = useCountUp(completedLessonsCount, 1200, 800);

  // Inelul lecției pornește gol, ca tranziția de dashoffset să aibă ce anima.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  /* Val de ridicare peste plăcuțele „De revăzut azi”. */
  const [tileHover, setTileHover] = useState(null);
  const tileStyle = (i) => {
    if (tileHover === null || i < tileHover) return { transform: 'translateY(0)', transitionDelay: '0ms' };
    const d = i - tileHover;
    const lift = Math.max(3, 14 - d * 2.4);
    return {
      transform: `translateY(-${lift}px)`,
      transitionDelay: `${d * 52}ms`,
      boxShadow: d === 0
        ? '0 12px 24px rgba(46,42,36,.13)'
        : `0 ${Math.max(3, 9 - d)}px ${Math.max(8, 18 - d * 2)}px rgba(46,42,36,.08)`,
      borderColor: d === 0 ? 'rgba(16,185,129,.34)' : undefined,
    };
  };

  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = firstName ? `Bine ai revenit, ${firstName}.` : 'Bine ai revenit.';
  const greetingWords = greeting.split(' ');
  const rankLabel = rank ? `Locul ${rank.place} din ${rank.total}` : 'Vezi clasamentul';
  const openLesson = () => (onOpenLesson ? onOpenLesson(nextLesson.id) : onLessons());
  const streakLabel = `${streak} ${streak === 1 ? 'zi' : 'zile'}`;

  // Cipurile lecției — max 6 vizibile, restul rezumate.
  const chips = nextLesson.letters.slice(0, 6);
  const chipsRest = nextLesson.letters.length - chips.length;

  const tiles = (
    <>
      <Tile icon={LinesIcon} tone="signa" title="Scrie cuvântul" subtitle="Literă cu literă" onClick={onSpell} delay={0.62} />
      <Tile icon={CamIcon} tone="blue" title="Antrenament" subtitle="Camera liberă" onClick={onStart} delay={0.7} />
      <Tile
        icon={RepeatIcon} tone="amber" title="Repetiție" spin
        subtitle={`${reviewLetters.length} litere de revăzut`} onClick={onReview} delay={0.78}
      />
      <Tile icon={BarsIcon} tone="violet" title="Clasament" subtitle={rankLabel} onClick={onLeaderboard} delay={0.86} />
    </>
  );

  const reviewChips = reviewLetters.slice(0, 6);
  const reviewRest = reviewLetters.length - reviewChips.length;

  return (
    <div className="min-h-full flex flex-col
      bg-[radial-gradient(110%_45%_at_50%_0%,#F3FBF6_0%,#FFFBF3_62%)]
      lg:bg-[radial-gradient(ellipse_70%_50%_at_85%_0%,#FFFDF7,#FBF6ED)]">

          {/* Header mobil */}
          <header className="lg:hidden flex items-center justify-between px-5 pt-2">
            <div className="flex items-center gap-2.5">
              <img src="/icon.svg" alt="" className="w-[30px] h-[30px] rounded-[9px] block" />
              <span className="font-black text-[15px] tracking-[.16em] text-ink-900">SIGNA</span>
            </div>
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <span
                  className="flex items-center gap-[5px] bg-amber-50 border border-amber-600/[.16] text-amber-700
                    rounded-full px-[11px] py-1.5 text-[12px] font-extrabold tabular-nums"
                  title="Zile consecutive"
                >
                  <FlameIcon className="w-[13px] h-[13px]" />
                  {streak}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-ink-400
                  hover:text-ink-700 transition-colors duration-[160ms]"
                aria-label={soundEnabled ? 'Oprește sunetul' : 'Pornește sunetul'}
                title={soundEnabled ? 'Sunet pornit' : 'Sunet oprit'}
              >
                <SoundIcon on={soundEnabled} className="w-[18px] h-[18px]" />
              </button>
              <button
                type="button"
                onClick={onProfile}
                className="w-[34px] h-[34px] rounded-xl bg-signa-100 text-signa-900 font-black text-[12.5px]
                  flex items-center justify-center transition-transform duration-[160ms] active:scale-95"
                aria-label="Deschide profilul"
              >
                {initials || <UserIcon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Salut */}
          <div className="px-5 pt-[22px] lg:px-11 lg:pt-[34px] lg:flex lg:items-start lg:justify-between lg:gap-6">
            <div>
              <p
                style={anim('sg-fade-right', 0.6, 0.08)}
                className="text-[10.5px] lg:text-xs font-extrabold uppercase tracking-[.14em] lg:tracking-[.22em] text-ink-400"
              >
                {today}
              </p>
              <h1 className="mt-[7px] lg:mt-2 text-[26px] lg:text-[2.6rem] font-black text-ink-900
                tracking-[-.02em] lg:tracking-[-.025em] leading-[1.15] lg:leading-[1.1] text-pretty">
                {greetingWords.map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className="inline-block relative"
                    style={anim('sg-fade-up', 0.7, 0.16 + i * 0.08)}
                  >
                    {word}
                    {i === greetingWords.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-0 right-1.5 bottom-1 h-2 rounded sg-underline bg-signa-400/[.32]"
                      />
                    )}
                    {i < greetingWords.length - 1 && ' '}
                  </span>
                ))}
              </h1>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 flex-none pt-1.5">
              {streak > 0 && (
                <span
                  style={anim('sg-scale-in', 0.5, 0.2)}
                  className="flex items-center gap-[7px] bg-[#FFF7E8] border border-amber-500/[.18] text-amber-700
                    rounded-full px-[15px] py-[9px] text-[13px] font-extrabold tabular-nums"
                  title="Zile consecutive"
                >
                  <FlameIcon
                    className="w-[13px] h-[13px]"
                    style={{ animation: 'sg-flame 1.9s ease-in-out infinite' }}
                  />
                  {streakLabel}
                </span>
              )}
              <span
                style={anim('sg-scale-in', 0.5, 0.28)}
                className="bg-white border border-ink-900/[.08] rounded-full px-[17px] py-[9px]
                  text-[13px] font-extrabold text-ink-700 tabular-nums"
              >
                Nv. {level} · {xpCount} XP
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={anim('sg-scale-in', 0.5, 0.36)}
                className="w-[38px] h-[38px] rounded-full bg-white border border-ink-900/[.08]
                  flex items-center justify-center text-ink-700
                  transition-[transform,box-shadow] duration-[220ms] ease-out
                  hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_6px_16px_rgba(46,42,36,.10)]
                  active:scale-90"
                aria-label={soundEnabled ? 'Oprește sunetul' : 'Pornește sunetul'}
                title={soundEnabled ? 'Sunet pornit' : 'Sunet oprit'}
              >
                <SoundIcon
                  on={soundEnabled}
                  width="19"
                  height="19"
                  style={{
                    transition: `transform .3s ${EASE}, opacity .2s ease-out`,
                    transform: soundEnabled ? 'scale(1)' : 'scale(.86)',
                    opacity: soundEnabled ? 1 : 0.55,
                  }}
                />
              </button>
            </div>
          </div>

          {/* Rând principal: „Continuă” + obiectivul zilei (desktop) */}
          <div className="px-5 pt-[18px] lg:px-11 lg:pt-[26px] lg:grid lg:grid-cols-[1.55fr_1fr] lg:gap-[22px] lg:items-start">
            <div
              style={anim('sg-fade-up', 0.75, 0.34)}
              className="relative overflow-hidden rounded-3xl lg:rounded-[26px] p-[22px] lg:p-[34px_36px]
                bg-[linear-gradient(140deg,#064e3b,#065f46_52%,#047857)]
                lg:bg-[linear-gradient(125deg,#0f7d59_0%,#0b6446_58%,#075237_100%)]
                shadow-[0_18px_38px_rgba(6,78,59,.28)] lg:shadow-[0_20px_48px_rgba(8,74,52,.24)]"
            >
              <span
                aria-hidden
                className="absolute -top-[120px] -right-[70px] lg:-top-[90px] lg:-right-10 w-[280px] h-[280px]
                  lg:w-[300px] lg:h-[300px] rounded-full pointer-events-none sg-aurora-a"
                style={{
                  background: 'radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)',
                  filter: 'blur(46px)',
                }}
              />
              <span
                aria-hidden
                className="hidden lg:block absolute -bottom-[110px] left-[20%] w-[280px] h-[280px]
                  rounded-full pointer-events-none sg-aurora-b"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,.18), transparent 72%)',
                  filter: 'blur(50px)',
                }}
              />
              <span
                aria-hidden
                className="hidden lg:block absolute inset-y-0 left-0 w-[34%] pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)',
                  animation: 'sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.6s infinite',
                }}
              />

              <div className="relative flex items-start justify-between gap-3.5 lg:gap-6">
                <div className="min-w-0">
                  <p
                    style={anim('sg-fade-right', 0.6, 0.5)}
                    className="text-[10.5px] lg:text-[11.5px] font-extrabold uppercase tracking-[.14em]
                      lg:tracking-[.2em] text-emerald-100/70 lg:text-emerald-100/85 truncate lg:mb-3"
                  >
                    Continuă · {nextLesson.title}
                  </p>
                  <h2
                    style={anim('sg-fade-up', 0.7, 0.56)}
                    className="mt-2 lg:mt-0 lg:mb-2 text-[21px] lg:text-[2.5rem] font-black text-white
                      tracking-[-.01em] lg:tracking-[-.02em] leading-[1.2] lg:leading-[1.06] text-pretty"
                  >
                    {lessonSubtitle}
                  </h2>
                  <p
                    style={anim('sg-fade-up', 0.7, 0.62)}
                    className="hidden lg:block text-[15px] font-semibold text-emerald-100/70 tabular-nums"
                  >
                    {validated.size} din {nextLesson.letters.length} litere validate
                  </p>
                </div>

                {/* Inel mobil */}
                <div className="lg:hidden">
                  <Ring
                    size={58} inner={44} pct={pct}
                    fill="#34d399" track="rgba(255,255,255,.16)" innerClass="bg-signa-900"
                  >
                    <span className="text-[12.5px] font-black text-white tabular-nums">{Math.round(pct * 100)}%</span>
                  </Ring>
                </div>

                {/* Inel desktop — punctat rotativ când lecția n-a fost începută */}
                <div className="hidden lg:block relative w-[78px] h-[78px] flex-none" style={anim('sg-pop', 0.6, 0.66)}>
                  <svg width="78" height="78" viewBox="0 0 78 78" className="block" aria-hidden>
                    <circle cx="39" cy="39" r="30" fill="rgba(255,255,255,.10)" />
                    {pct === 0 ? (
                      <circle
                        cx="39" cy="39" r="30" fill="none" stroke="rgba(52,211,153,.45)"
                        strokeWidth="3" strokeLinecap="round" strokeDasharray="8 12"
                        style={{ transformOrigin: '39px 39px', animation: 'sg-spin 12s linear infinite' }}
                      />
                    ) : (
                      <circle
                        cx="39" cy="39" r="30" fill="none" stroke="#34d399"
                        strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - (grown ? pct : 0))}
                        style={{
                          transformOrigin: '39px 39px',
                          transform: 'rotate(-90deg)',
                          transition: `stroke-dashoffset 1.3s ${EASE} .7s`,
                        }}
                      />
                    )}
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-base font-black text-white tabular-nums">
                    {Math.round(pct * 100)}%
                  </span>
                </div>
              </div>

              {/* Cipurile lecției */}
              <div className="relative flex gap-[7px] lg:flex-wrap lg:gap-[11px] mt-4 lg:mt-7 lg:mb-[26px]">
                {chips.map((ch, i) => {
                  const isValid = validated.has(ch);
                  // Pista de lumină rulează doar când nimic nu e validat — altfel
                  // ar spăla diferența dintre literele făcute și cele rămase.
                  const cue = pct === 0 ? `, sg-chip-cue 5s ease-in-out ${1.6 + i * 0.15}s infinite` : '';
                  return (
                    <span
                      key={ch}
                      style={{ animation: `sg-pop .5s ${EASE} ${0.7 + i * 0.06}s both${cue}` }}
                      className={`flex-1 min-w-0 truncate text-center py-[9px] lg:flex-none lg:py-[14px] lg:px-[26px]
                        rounded-[11px] lg:rounded-[13px] font-black lg:font-bold text-[14px] lg:text-[15px] border ${
                        isValid
                          ? 'bg-white/[.14] border-white/[.16] text-white'
                          : 'bg-white/[.07] lg:bg-white/[.12] border-white/10 lg:border-white/[.14] text-cream/45 lg:text-[#ECFDF5]'
                      }`}
                    >
                      {ch}
                    </span>
                  );
                })}
                {chipsRest > 0 && (
                  <span className="flex-none px-3 py-[9px] lg:py-[14px] lg:px-[26px] rounded-[11px] lg:rounded-[13px]
                    bg-white/[.07] lg:bg-white/[.12] border border-white/10 lg:border-white/[.14]
                    text-cream/45 font-black text-[13px] tabular-nums">
                    +{chipsRest}
                  </span>
                )}
              </div>

              <div className="relative flex gap-3">
                <button
                  type="button"
                  onClick={openLesson}
                  style={anim('sg-fade-up', 0.6, 1)}
                  className="relative overflow-hidden w-full lg:w-auto py-4 lg:py-[17px] lg:px-7
                    rounded-2xl lg:rounded-[15px] bg-cream lg:bg-white text-signa-900 lg:text-[#0b6446]
                    font-extrabold text-[15px] shadow-[0_8px_20px_rgba(0,0,0,.16)] lg:shadow-[0_10px_24px_rgba(4,44,32,.22)]
                    flex items-center justify-center lg:gap-2.5
                    transition-[transform,box-shadow] duration-[160ms] ease-out
                    hover:-translate-y-0.5 lg:hover:shadow-[0_16px_32px_rgba(4,44,32,.28)] active:scale-[.97]"
                >
                  <span
                    aria-hidden
                    className="hidden lg:block absolute inset-y-0 left-0 w-2/5 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg,transparent,rgba(11,100,70,.10),transparent)',
                      animation: 'sg-sheen 4.5s cubic-bezier(.4,0,.2,1) 2s infinite',
                    }}
                  />
                  <span className="relative">Reia lecția</span>
                  <span aria-hidden className="relative flex ml-2 lg:ml-0 sg-arrow">
                    <ArrowIcon className="w-4 h-4" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onLessons}
                  style={anim('sg-fade-up', 0.6, 1.06)}
                  className="hidden lg:block py-[17px] px-[26px] rounded-[15px] bg-white/[.12] border border-white/[.16]
                    text-white font-extrabold text-[15px]
                    transition-[transform,background-color] duration-[160ms] ease-out
                    hover:-translate-y-0.5 hover:bg-white/20 active:scale-[.97]"
                >
                  Toate lecțiile
                </button>
              </div>
            </div>

            {/* Obiectivul zilei — doar desktop */}
            <div
              style={anim('sg-fade-up', 0.75, 0.44)}
              className="hidden lg:block bg-white border border-ink-900/[.05] rounded-[26px] px-8 py-[30px]
                shadow-[0_10px_30px_rgba(46,42,36,.06)]"
            >
              <div className="flex items-center gap-[22px]">
                <div className="relative w-[88px] h-[88px] flex-none">
                  <div
                    aria-hidden
                    className="absolute -inset-1.5 rounded-full"
                    style={{
                      background: 'rgba(52,211,153,.35)',
                      filter: 'blur(14px)',
                      animation: 'sg-ring-glow 3.4s ease-in-out infinite',
                    }}
                  />
                  <svg width="88" height="88" viewBox="0 0 88 88" className="relative block" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
                    <circle cx="44" cy="44" r="34" fill="none" stroke="rgba(46,42,36,.07)" strokeWidth="7" />
                    <circle
                      cx="44" cy="44" r="34" fill="none" stroke="#10b981" strokeWidth="7" strokeLinecap="round"
                      strokeDasharray={RING_LEN}
                      style={{
                        '--sg-ring-to': String(RING_LEN * (1 - goalPct)),
                        animation: `sg-ring-draw 1.5s ${EASE} .7s both`,
                      }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-px">
                    <span className="text-2xl font-black text-ink-900 leading-none tabular-nums">{goalCount}</span>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                      din {DAILY_GOAL}
                    </span>
                  </span>
                </div>
                <div className="min-w-0">
                  <p
                    style={anim('sg-fade-right', 0.6, 0.6)}
                    className="text-[11px] font-extrabold uppercase tracking-[.19em] text-ink-400"
                  >
                    Obiectivul zilei
                  </p>
                  <p
                    style={anim('sg-fade-up', 0.6, 0.68)}
                    className="mt-[7px] text-xl font-black text-ink-900 tracking-[-.015em] leading-[1.25] text-pretty"
                  >
                    {goalLeft > 0
                      ? `Încă ${goalLeft} ${goalLeft === 1 ? 'semn' : 'semne'} și ziua e bifată`
                      : 'Ziua e bifată. Bravo!'}
                  </p>
                </div>
              </div>

              <div className="h-px bg-ink-900/[.07] mt-[26px] mb-[22px]" />

              <div className="grid grid-cols-2 gap-[18px]">
                <div style={anim('sg-fade-up', 0.6, 0.8)}>
                  <p className="text-[23px] font-black text-ink-900 leading-none tabular-nums">
                    {doneCount}<span className="text-base text-ink-400">/{totalLessonsCount}</span>
                  </p>
                  <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">Lecții făcute</p>
                </div>
                <div style={anim('sg-fade-up', 0.6, 0.88)}>
                  <p className="text-[23px] font-black text-ink-900 leading-none tabular-nums">
                    {rank ? <>{rank.place}<span className="text-base text-ink-400">/{rank.total}</span></> : '—'}
                  </p>
                  <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">Clasament</p>
                </div>
              </div>
            </div>
          </div>

          {/* Statistici — doar mobil */}
          <div className="lg:hidden px-5 pt-3.5 grid grid-cols-3 gap-2.5">
            {[
              { v: xp, label: 'XP total', color: 'text-signa-900' },
              { v: streak, label: 'Zi la rând', color: 'text-amber-700' },
              {
                v: <>{completedLessonsCount}<span className="text-[13px] text-ink-400">/{totalLessonsCount}</span></>,
                label: 'Lecții',
                color: 'text-ink-900',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-ink-900/[.06] rounded-[22px] px-3 py-3.5 text-center
                  shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_22px_rgba(46,42,36,.045)]"
              >
                <p className={`text-[20px] font-black leading-none tabular-nums ${s.color}`}>{s.v}</p>
                <p className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Exersează */}
          <div className="px-5 pt-[22px] lg:px-11 lg:pt-[22px]">
            <div className="lg:hidden flex items-baseline justify-between mb-[11px]">
              <h3 className="text-[14.5px] font-black text-ink-900">Exersează</h3>
              <button
                type="button"
                onClick={onLessons}
                className="text-[12px] font-extrabold text-signa-600 hover:text-signa-900 transition-colors duration-[160ms]"
              >
                Toate lecțiile
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-[18px]">{tiles}</div>
          </div>

          {/* De revăzut azi */}
          {reviewLetters.length > 0 && (
            <div className="px-5 pt-[22px] lg:px-11 lg:pt-[22px]">
              <div
                style={anim('sg-fade-up', 0.7, 0.94)}
                className="lg:bg-white lg:border lg:border-ink-900/[.05] lg:rounded-[22px] lg:px-7 lg:py-6
                  lg:shadow-[0_6px_20px_rgba(46,42,36,.05)] lg:flex lg:items-center lg:gap-7"
              >
                <div className="flex items-baseline justify-between mb-[11px] lg:mb-0 lg:flex-none lg:block">
                  <h3 className="text-[14.5px] lg:text-base font-black lg:font-extrabold text-ink-900">De revăzut azi</h3>
                  <span className="text-[11.5px] lg:text-[13px] font-semibold lg:font-medium text-ink-400 lg:mt-1 lg:block">
                    după memorie
                  </span>
                </div>

                <div className="flex gap-2 lg:gap-[11px] flex-wrap lg:flex-1" onMouseLeave={() => setTileHover(null)}>
                  {reviewChips.map((ch, i) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={onReview}
                      onMouseEnter={() => setTileHover(i)}
                      style={{
                        // `backwards`, nu `both`: altfel animația de intrare ar
                        // bloca transform-ul folosit de valul de hover.
                        animation: `sg-pop .45s ${EASE} ${1 + i * 0.05}s backwards`,
                        transition: `transform .34s ${EASE}, box-shadow .34s ease-out, border-color .34s ease-out`,
                        ...tileStyle(i),
                      }}
                      className="flex items-center justify-center min-w-[46px] h-[46px] lg:w-[52px] lg:h-[52px] px-2
                        rounded-[14px] bg-white lg:bg-[#FFFDF9] border border-ink-900/[.09]
                        text-[16px] lg:text-[17px] font-black lg:font-extrabold text-ink-900"
                    >
                      {ch}
                    </button>
                  ))}
                  {reviewRest > 0 && (
                    <button
                      type="button"
                      onClick={onReview}
                      onMouseEnter={() => setTileHover(reviewChips.length)}
                      style={{
                        animation: `sg-pop .45s ${EASE} ${1 + reviewChips.length * 0.05}s backwards`,
                        transition: `transform .34s ${EASE}, box-shadow .34s ease-out, border-color .34s ease-out`,
                        ...tileStyle(reviewChips.length),
                      }}
                      className="flex items-center justify-center h-[46px] lg:h-[52px] px-3.5 rounded-[14px]
                        bg-white lg:bg-[#FFFDF9] border border-dashed border-ink-900/[.14]
                        text-[12.5px] lg:text-sm font-extrabold text-ink-400 tabular-nums"
                    >
                      +{reviewRest}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onReview}
                  style={anim('sg-fade-up', 0.6, 1.1)}
                  className="hidden lg:block lg:ml-auto flex-none bg-white border border-ink-900/[.09]
                    rounded-[15px] px-6 py-[15px] font-bold text-[14.5px] text-ink-700
                    transition-[transform,box-shadow,border-color,color] duration-[180ms] ease-out
                    hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(46,42,36,.09)]
                    hover:border-signa-500/[.32] hover:text-signa-600 active:scale-[.97]"
                >
                  Începe repetiția
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-[26px] lg:min-h-[44px]" />

          {/* Bară de jos — doar mobil */}
          <nav className="lg:hidden sticky bottom-0 bg-cream/90 backdrop-blur-[14px] border-t border-ink-900/[.07]
            px-[26px] pt-3 pb-2.5 flex justify-between">
            <NavItem icon={HomeIcon} label="Acasă" active />
            <NavItem icon={BookIcon} label="Lecții" onClick={onLessons} />
            <NavItem icon={CamIcon} label="Cameră" onClick={onStart} />
            <NavItem icon={UserIcon} label="Profil" onClick={onProfile} />
      </nav>
    </div>
  );
}
