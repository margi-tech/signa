/* ─────────────────────────────────────────────────────────────────
   HomePage — ecran de reluare: „continuă unde ai rămas”, nu meniu
───────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';
import { getOwnProfile, isSupabaseConfigured, supabase } from '../lib/supabase';

/* ── Iconițe inline (fără librării) ────────────────────────────── */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

const HomeIcon = (p) => <svg {...stroke} strokeWidth="2.1" {...p}><path d="M4 10.5 12 4l8 6.5V20H4z" /></svg>;
const BookIcon = (p) => <svg {...stroke} strokeWidth="2.1" {...p}><path d="M4 5h16v14H4zM8 5v14" /></svg>;
const CamIcon = (p) => <svg {...stroke} strokeWidth="2.1" {...p}><rect x="3" y="7" width="14" height="11" rx="3" /><path d="M17 12l4-2.5v7L17 14z" /></svg>;
const UserIcon = (p) => <svg {...stroke} strokeWidth="2.1" {...p}><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c1.4-3.6 4-5.2 7-5.2s5.6 1.6 7 5.2" /></svg>;
const ChartIcon = (p) => <svg {...stroke} {...p}><path d="M5 20V11m7 9V5m7 15v-6" /></svg>;
const LinesIcon = (p) => <svg {...stroke} {...p}><path d="M4 7h16M4 12h10M4 17h6" /></svg>;
const PlayCamIcon = (p) => <svg {...stroke} {...p}><rect x="2.5" y="6.5" width="13" height="11" rx="3" /><path d="M15.5 11l6-3v8l-6-3z" /></svg>;
const RepeatIcon = (p) => <svg {...stroke} {...p}><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" /></svg>;
const ChevronIcon = (p) => <svg {...stroke} strokeWidth="2.6" {...p}><path d="M9 6l6 6-6 6" /></svg>;

const FlameIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2s5 4.6 5 9.3A5 5 0 0 1 7 11.5C7 8 9 6 9 6s-.5 2.5 1 3.5c0-3 2-6.5 2-7.5Z" />
  </svg>
);

const SoundIcon = ({ on, ...p }) => (
  <svg {...stroke} {...p}>
    <path d="M11 5 6.5 8.5H3.5v7h3L11 19z" />
    {on
      ? <><path d="M14.5 9.2a4 4 0 0 1 0 5.6" /><path d="M17 6.7a7.5 7.5 0 0 1 0 10.6" /></>
      : <path d="m15.5 9.5 5 5m0-5-5 5" />}
  </svg>
);

/* ── Piese ─────────────────────────────────────────────────────── */

/** Inel de progres — conic-gradient cu disc interior. */
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

const TILE_TONES = {
  signa: 'bg-signa-50 text-signa-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-700',
  pink: 'bg-pink-50 text-pink-700',
};

/** Tile de acțiune — pastilă icon colorată + titlu + subtitlu. */
function Tile({ icon: Icon, tone, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-ink-900/[.06] rounded-[20px] p-4 lg:p-[18px]
        shadow-[0_1px_2px_rgba(46,42,36,.04),0_6px_18px_rgba(46,42,36,.04)]
        transition-[transform,box-shadow,border-color] duration-[180ms] ease-out
        hover:-translate-y-[3px] hover:shadow-[0_14px_30px_rgba(46,42,36,.09)] hover:border-signa-500/[.28]
        active:-translate-y-px active:scale-[.99]"
    >
      <span className={`w-[34px] h-[34px] lg:w-9 lg:h-9 rounded-xl flex items-center justify-center ${TILE_TONES[tone]}`}>
        <Icon className="w-[17px] h-[17px] lg:w-[18px] lg:h-[18px]" />
      </span>
      <p className="mt-[11px] lg:mt-[13px] text-[14px] lg:text-[14.5px] font-extrabold text-ink-900">{title}</p>
      <p className="mt-[3px] text-[11.5px] lg:text-[12px] font-semibold text-ink-400">{subtitle}</p>
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
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

/** Rând din meniul lateral (desktop). */
function SideItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-[11px] px-3 py-[11px] rounded-[13px] text-[13.5px] transition-colors duration-[160ms]
        ${active
          ? 'bg-signa-50 text-signa-600 font-extrabold'
          : 'text-ink-600 font-bold hover:bg-ink-900/[.03] hover:text-ink-900'}`}
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </button>
  );
}

/* ── Pagina ────────────────────────────────────────────────────── */

const DAILY_GOAL = 5;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HomePage({
  onLessons, onStart, onCollect, onTrain, onSpell, onReview, onDiagnostic, onProfile, onLeaderboard,
  onOpenLesson,
}) {
  const {
    xp, streak, level, completedLessonsCount, totalLessonsCount,
    reviewLetters, letterMastery, starsFor, isUnlocked, soundEnabled, setSoundEnabled,
  } = useProgress();

  const [firstName, setFirstName] = useState('');
  const [initials, setInitials] = useState('');
  const [rank, setRank] = useState(null);

  // Numele din profil — doar decorativ; fără Supabase rămâne salutul scurt.
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let cancelled = false;
    getOwnProfile()
      .then((p) => {
        if (cancelled || !p) return;
        setFirstName((p.first_name ?? '').trim());
        const ini = [p.first_name, p.last_name]
          .map((s) => (s || '').trim()[0])
          .filter(Boolean).join('').toUpperCase().slice(0, 2);
        setInitials(ini || (p.username ?? '?')[0].toUpperCase());
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Poziția în clasament — două count-uri ieftine pe view-ul `leaderboard`.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const ahead = await supabase.from('leaderboard')
          .select('*', { count: 'exact', head: true }).gt('xp', xp);
        const all = await supabase.from('leaderboard')
          .select('*', { count: 'exact', head: true });
        if (cancelled || ahead.error || all.error) return;
        setRank({ place: (ahead.count ?? 0) + 1, total: all.count ?? 0 });
      } catch { /* fără sesiune / offline */ }
    })();
    return () => { cancelled = true; };
  }, [xp]);

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
  const goalLeft = Math.max(DAILY_GOAL - signsToday, 0);

  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = firstName ? `Bine ai revenit, ${firstName}.` : 'Bine ai revenit.';
  const rankLabel = rank ? `Locul ${rank.place} din ${rank.total}` : 'Vezi clasamentul';
  const openLesson = () => (onOpenLesson ? onOpenLesson(nextLesson.id) : onLessons());

  // Cipurile lecției — max 6 vizibile, restul rezumate.
  const chips = nextLesson.letters.slice(0, 6);
  const chipsRest = nextLesson.letters.length - chips.length;

  const letterChips = (
    <div className="relative flex gap-[7px] lg:gap-2 mt-4 lg:mt-5">
      {chips.map((ch) => (
        <span
          key={ch}
          className={`flex-1 min-w-0 truncate text-center py-[9px] lg:py-[11px] rounded-[11px] lg:rounded-[13px]
            font-black text-[14px] lg:text-[15px] border ${
            validated.has(ch)
              ? 'bg-white/[.14] border-white/[.16] text-white'
              : 'bg-white/[.07] border-white/10 text-cream/45'
          }`}
        >
          {ch}
        </span>
      ))}
      {chipsRest > 0 && (
        <span className="flex-none px-3 py-[9px] lg:py-[11px] rounded-[11px] lg:rounded-[13px] bg-white/[.07]
          border border-white/10 text-cream/45 font-black text-[13px] tabular-nums">
          +{chipsRest}
        </span>
      )}
    </div>
  );

  const tiles = (
    <>
      <Tile icon={LinesIcon} tone="signa" title="Scrie cuvântul" subtitle="Literă cu literă" onClick={onSpell} />
      <Tile icon={PlayCamIcon} tone="blue" title="Antrenament" subtitle="Camera liberă" onClick={onStart} />
      <Tile
        icon={RepeatIcon} tone="amber" title="Repetiție"
        subtitle={`${reviewLetters.length} litere de revăzut`} onClick={onReview}
      />
      <Tile icon={ChartIcon} tone="pink" title="Clasament" subtitle={rankLabel} onClick={onLeaderboard} />
    </>
  );

  const reviewChips = reviewLetters.slice(0, 6);
  const reviewRest = reviewLetters.length - reviewChips.length;

  return (
    <div className="h-full overflow-hidden bg-cream flex flex-col lg:grid lg:grid-cols-[232px_1fr]">
      <div className="h-[3px] flex-shrink-0 lg:hidden bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent" />

      {/* ── Sidebar (desktop) ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-[26px] bg-white border-r border-ink-900/[.06] px-[18px] py-[26px]">
        <div className="flex items-center gap-2.5 px-2">
          <img src="/icon.svg" alt="" className="w-8 h-8 rounded-[10px] block" />
          <span className="font-black text-[15px] tracking-[.16em] text-ink-900">SIGNA</span>
        </div>

        <nav className="flex flex-col gap-1">
          <SideItem icon={HomeIcon} label="Acasă" active />
          <SideItem icon={BookIcon} label="Lecții" onClick={onLessons} />
          <SideItem icon={CamIcon} label="Cameră" onClick={onStart} />
          <SideItem icon={ChartIcon} label="Clasament" onClick={onLeaderboard} />
          <SideItem icon={UserIcon} label="Profil" onClick={onProfile} />
        </nav>

        <div className="flex-1" />

        <div className="border-t border-ink-900/[.06] pt-4 flex flex-col gap-1">
          {[
            ['Colectare date', onCollect],
            ['Antrenare model', onTrain],
            ['Diagnostic', onDiagnostic],
          ].map(([label, fn]) => (
            <button
              key={label}
              type="button"
              onClick={fn}
              className="text-left px-3 py-[9px] text-[12.5px] font-bold text-ink-400
                hover:text-ink-700 transition-colors duration-[160ms]"
            >
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Conținut ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col
        bg-[radial-gradient(110%_45%_at_50%_0%,#F3FBF6_0%,#FFFBF3_62%)]
        lg:bg-[radial-gradient(90%_40%_at_70%_0%,#F3FBF6,#FFFBF3_70%)]">

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
        <div className="px-5 pt-[22px] lg:px-8 lg:pt-7 lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400 first-letter:uppercase">
              {today}
            </p>
            <h1 className="mt-[7px] lg:mt-2 text-[26px] lg:text-[30px] font-black text-ink-900 tracking-[-.02em] leading-[1.15] text-pretty">
              {greeting}
            </h1>
          </div>
          <div className="hidden lg:flex items-center gap-2.5">
            {streak > 0 && (
              <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-600/[.16] text-amber-700
                rounded-full px-[13px] py-2 text-[12.5px] font-extrabold tabular-nums">
                <FlameIcon className="w-[13px] h-[13px]" />
                {streak} {streak === 1 ? 'zi' : 'zile'}
              </span>
            )}
            <span className="bg-white border border-ink-900/[.07] rounded-full px-[13px] py-2
              text-[12.5px] font-extrabold text-ink-700 tabular-nums">
              Nv. {level} · {xp} XP
            </span>
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
          </div>
        </div>

        {/* Rând principal: „Continuă” + obiectivul zilei (desktop) */}
        <div className="px-5 pt-[18px] lg:px-8 lg:pt-[18px] lg:grid lg:grid-cols-[1.5fr_1fr] lg:gap-[18px] lg:items-start">
          <div className="relative overflow-hidden rounded-3xl p-[22px] lg:p-7
            bg-[linear-gradient(140deg,#064e3b,#065f46_52%,#047857)]
            shadow-[0_18px_38px_rgba(6,78,59,.28)]">
            <span
              aria-hidden
              className="absolute -top-[120px] -right-[70px] w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)',
                filter: 'blur(46px)',
              }}
            />
            <div className="relative flex items-start justify-between gap-3.5 lg:gap-[18px]">
              <div className="min-w-0">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-emerald-100/70 truncate">
                  Continuă · {nextLesson.title}
                </p>
                <h2 className="mt-2 lg:mt-[9px] text-[21px] lg:text-[26px] font-black text-white tracking-[-.01em] leading-[1.2] text-pretty">
                  {lessonSubtitle}
                </h2>
                <p className="hidden lg:block mt-2 text-[13.5px] font-semibold text-cream/65 tabular-nums">
                  {validated.size} din {nextLesson.letters.length} litere validate
                </p>
              </div>
              <div className="lg:hidden">
                <Ring
                  size={58} inner={44} pct={pct}
                  fill="#34d399" track="rgba(255,255,255,.16)" innerClass="bg-signa-900"
                >
                  <span className="text-[12.5px] font-black text-white tabular-nums">{Math.round(pct * 100)}%</span>
                </Ring>
              </div>
              <div className="hidden lg:block">
                <Ring
                  size={70} inner={54} pct={pct}
                  fill="#34d399" track="rgba(255,255,255,.16)" innerClass="bg-signa-900"
                >
                  <span className="text-[13.5px] font-black text-white tabular-nums">{Math.round(pct * 100)}%</span>
                </Ring>
              </div>
            </div>

            {letterChips}

            <div className="relative flex gap-3 mt-[18px] lg:mt-[22px]">
              <button
                type="button"
                onClick={openLesson}
                className="w-full lg:w-auto py-4 lg:py-[15px] lg:px-7 rounded-2xl bg-cream text-signa-900
                  font-extrabold text-[15px] lg:text-[14.5px] shadow-[0_8px_20px_rgba(0,0,0,.16)]
                  flex items-center justify-center gap-2 transition-transform duration-[160ms] ease-out
                  hover:-translate-y-0.5 active:scale-[.985]"
              >
                Reia lecția
                <ChevronIcon className="w-[15px] h-[15px] lg:w-3.5 lg:h-3.5" />
              </button>
              <button
                type="button"
                onClick={onLessons}
                className="hidden lg:block py-[15px] px-[22px] rounded-2xl bg-white/[.14] border border-white/[.22]
                  text-white font-extrabold text-[14.5px] transition-transform duration-[160ms] ease-out
                  hover:-translate-y-0.5 active:scale-[.985]"
              >
                Toate lecțiile
              </button>
            </div>
          </div>

          {/* Obiectivul zilei — doar desktop */}
          <div className="hidden lg:block bg-white border border-ink-900/[.06] rounded-[22px] px-6 py-[22px]
            shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_22px_rgba(46,42,36,.045)]">
            <div className="flex items-center gap-[18px]">
              <Ring
                size={88} inner={70} pct={Math.min(signsToday / DAILY_GOAL, 1)}
                fill="#10b981" track="rgba(46,42,36,.07)" innerClass="bg-white"
              >
                <span className="text-[21px] font-black text-ink-900 leading-none tabular-nums">
                  {Math.min(signsToday, DAILY_GOAL)}
                </span>
                <span className="mt-[3px] text-[9px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                  din {DAILY_GOAL}
                </span>
              </Ring>
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">Obiectivul zilei</p>
                <p className="mt-[7px] text-[16.5px] font-black text-ink-900 leading-[1.3] text-pretty">
                  {goalLeft > 0
                    ? `Încă ${goalLeft} ${goalLeft === 1 ? 'semn' : 'semne'} și ziua e bifată`
                    : 'Ziua e bifată. Bravo!'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-5 pt-[18px] border-t border-ink-900/[.06]">
              <div>
                <p className="text-[19px] font-black text-signa-900 leading-none tabular-nums">
                  {completedLessonsCount}<span className="text-[13px] text-ink-400">/{totalLessonsCount}</span>
                </p>
                <p className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">Lecții făcute</p>
              </div>
              <div>
                <p className="text-[19px] font-black text-ink-900 leading-none tabular-nums">
                  {rank ? <>{rank.place}<span className="text-[13px] text-ink-400">/{rank.total}</span></> : '—'}
                </p>
                <p className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">Clasament</p>
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
        <div className="px-5 pt-[22px] lg:px-8 lg:pt-[18px]">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5">{tiles}</div>
        </div>

        {/* De revăzut azi */}
        {reviewLetters.length > 0 && (
          <div className="px-5 pt-[22px] lg:px-8 lg:pt-[18px]">
            <div className="lg:bg-white lg:border lg:border-ink-900/[.06] lg:rounded-[22px] lg:px-6 lg:py-5
              lg:shadow-[0_1px_2px_rgba(46,42,36,.04),0_8px_22px_rgba(46,42,36,.045)]
              lg:flex lg:items-center lg:gap-[22px]">
              <div className="flex items-baseline justify-between mb-[11px] lg:mb-0 lg:flex-none lg:block">
                <h3 className="text-[14.5px] font-black text-ink-900">De revăzut azi</h3>
                <span className="text-[11.5px] lg:text-[12px] font-semibold text-ink-400 lg:mt-1 lg:block">
                  după memorie
                </span>
              </div>
              <div className="flex gap-2 flex-wrap lg:flex-1">
                {reviewChips.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={onReview}
                    className="min-w-[46px] h-[46px] px-2 rounded-[14px] bg-white border border-ink-900/[.09]
                      text-[16px] font-black text-ink-900 transition-[border-color,transform,color,box-shadow]
                      duration-[160ms] ease-out hover:border-signa-500 hover:text-signa-600 hover:-translate-y-0.5
                      hover:shadow-[0_6px_14px_rgba(16,185,129,.16)]"
                  >
                    {ch}
                  </button>
                ))}
                {reviewRest > 0 && (
                  <button
                    type="button"
                    onClick={onReview}
                    className="h-[46px] px-3.5 rounded-[14px] bg-white border border-ink-900/[.09]
                      text-[12.5px] font-extrabold text-ink-500 tabular-nums transition-[border-color,transform,color]
                      duration-[160ms] ease-out hover:border-signa-500 hover:text-signa-600 hover:-translate-y-0.5"
                  >
                    +{reviewRest}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onReview}
                className="hidden lg:block flex-none bg-white border border-ink-900/10 rounded-[14px] px-[18px] py-[11px]
                  font-bold text-[13px] text-ink-700 transition-[transform,box-shadow,border-color] duration-[180ms] ease-out
                  hover:-translate-y-px hover:shadow-soft hover:border-ink-900/20"
              >
                Începe repetiția
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-[26px]" />

        {/* Bară de jos — doar mobil */}
        <nav className="lg:hidden sticky bottom-0 bg-cream/90 backdrop-blur-[14px] border-t border-ink-900/[.07]
          px-[26px] pt-3 pb-2.5 flex justify-between">
          <NavItem icon={HomeIcon} label="Acasă" active />
          <NavItem icon={BookIcon} label="Lecții" onClick={onLessons} />
          <NavItem icon={CamIcon} label="Cameră" onClick={onStart} />
          <NavItem icon={UserIcon} label="Profil" onClick={onProfile} />
        </nav>
      </div>
    </div>
  );
}
