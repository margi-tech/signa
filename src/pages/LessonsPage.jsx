import { useMemo, useState } from 'react';
import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';

/* ── Iconițe inline (fără librării) ────────────────────────────── */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

const ChevronIcon = (p) => <svg {...stroke} strokeWidth="2.6" {...p}><path d="M9 6l6 6-6 6" /></svg>;

function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BookmarkIcon({ filled, size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" />
    </svg>
  );
}

function Stars({ count, size = 13 }) {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < count ? '#f59e0b' : '#EFEAE0'} aria-hidden>
          <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
        </svg>
      ))}
    </div>
  );
}

const EASE = 'cubic-bezier(.22,1,.36,1)';

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

/* ── Constante de prezentare ───────────────────────────────────── */

/** Pastila colorată din dreptul fiecărui capitol, în sidebar. */
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

/** Estimare grosieră pentru cât mai durează o lecție: ~2 minute pe literă rămasă. */
const MINUTES_PER_LETTER = 2;

const FILTERS = [
  { id: 'all', label: 'Toate' },
  { id: 'progress', label: 'În curs' },
  { id: 'fav', label: 'Favorite' },
];

/** Titlul capitolului fără prefixul numeric („1. Alfabet static” → „Alfabet static”). */
const stripIndex = (title) => title.replace(/^\d+\.\s*/, '');

/* ── Piese ─────────────────────────────────────────────────────── */


/** Cardul unei lecții din grila capitolului. */
function LessonCard({
  lesson, stars, unlocked, favorite, validated, prevTitle, onOpen, onToggleFavorite, delay = 0,
}) {
  const isDyn = lesson.type === 'dynamic';
  const inProgress = unlocked && stars === 0;
  const pct = lesson.letters.length
    ? Math.round((lesson.letters.filter((ch) => validated.has(ch)).length / lesson.letters.length) * 100)
    : 0;

  if (!unlocked) {
    return (
      <div
        style={anim('sg-fade-up', 0.65, delay)}
        className="box-border flex flex-col items-stretch p-6 rounded-[22px]
          bg-ink-900/[.025] border border-dashed border-ink-900/10 shadow-none cursor-not-allowed"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="w-10 h-10 rounded-[13px] bg-ink-900/[.05] text-ink-400
            flex items-center justify-center flex-shrink-0">
            <LockIcon />
          </span>
          {isDyn && (
            <span className="text-[9.5px] font-extrabold uppercase tracking-[.08em]
              text-indigo-600 bg-indigo-50 rounded-[7px] px-2 py-1">
              Mișcare
            </span>
          )}
        </div>
        <p className="mt-3.5 text-[14.5px] font-black text-ink-400">{lesson.title}</p>
        <p className="mt-[9px] text-[11.5px] font-semibold text-ink-400 leading-relaxed">
          {prevTitle ? `Se deschide după ${prevTitle}` : 'Se deschide mai târziu'}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(lesson.id)}
      style={anim('sg-fade-up', 0.65, delay)}
      className="box-border text-left flex flex-col items-stretch p-6 rounded-[22px]
        bg-white border border-ink-900/[.05] shadow-[0_6px_20px_rgba(46,42,36,.05)]
        transition-[transform,box-shadow,border-color] duration-[220ms] ease-out
        hover:-translate-y-[5px] hover:shadow-[0_18px_36px_rgba(46,42,36,.10)] hover:border-signa-500/[.26]
        active:-translate-y-px active:scale-[.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`w-10 h-10 rounded-[13px] flex items-center justify-center flex-shrink-0
            font-black text-[13px] tabular-nums ${
          stars > 0
            ? 'bg-signa-50 text-signa-600'
            : 'bg-gradient-to-br from-signa-500 to-signa-600 text-white'}`}
        >
          {lesson.id}
        </span>

        <span className="flex items-center gap-2 flex-shrink-0">
          {stars > 0 ? (
            <Stars count={stars} />
          ) : (
            <span className="text-[9.5px] font-extrabold uppercase tracking-[.08em]
              text-signa-600 bg-signa-50 rounded-[7px] px-2 py-1 tabular-nums">
              În curs · {pct}%
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            aria-label={favorite ? 'Scoate din favorite' : 'Adaugă la favorite'}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(lesson.id); }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(lesson.id);
            }}
            className={`p-0.5 -m-0.5 transition-colors duration-[160ms] cursor-pointer
              ${favorite ? 'text-signa-600' : 'text-ink-300 hover:text-signa-500'}`}
          >
            <BookmarkIcon filled={favorite} />
          </span>
        </span>
      </div>

      <p className="mt-3.5 text-[14.5px] font-black text-ink-900">{lesson.title}</p>

      <div className="flex gap-1 mt-[9px] flex-wrap">
        {lesson.letters.map((ch) => (
          <span
            key={ch}
            title={ch}
            className={`h-[23px] min-w-[23px] px-1.5 rounded-[7px] text-[11px] font-extrabold
              flex items-center justify-center ${ch.length > 1 ? 'truncate max-w-[6.5rem]' : ''}
              ${validated.has(ch) ? 'bg-signa-50 text-signa-600' : 'bg-cream-100 text-ink-600'}`}
          >
            {ch}
          </span>
        ))}
      </div>
    </button>
  );
}


/* ── Pagina ────────────────────────────────────────────────────── */

export default function LessonsPage({
  onBack, onOpenLesson, chapters, selectedChapterId, onSelectChapter,
}) {
  const {
    starsFor, isUnlocked, isFavorite, toggleFavorite, letterMastery,
  } = useProgress();

  const [filter, setFilter] = useState('all');

  const chapterIndex = Math.max(chapters.findIndex((c) => c.id === selectedChapterId), 0);
  const chapter = chapters[chapterIndex];
  const nextChapter = chapters[chapterIndex + 1] ?? null;

  // Literele exersate corect măcar o dată — pentru cipuri și pentru procente.
  const validated = useMemo(
    () => new Set(Object.entries(letterMastery)
      .filter(([, m]) => (m?.correct ?? 0) > 0)
      .map(([ch]) => ch)),
    [letterMastery],
  );

  const chapterLetters = chapter.lessons.flatMap((l) => l.letters);
  const chapterStars = chapter.lessons.reduce((s, l) => s + starsFor(l.id), 0);
  const chapterMaxStars = chapter.lessons.length * 3;
  const lessonsDone = chapter.lessons.filter((l) => starsFor(l.id) > 0).length;
  const lettersLearned = chapterLetters.filter((ch) => validated.has(ch)).length;
  const lessonsLeft = chapter.lessons.length - lessonsDone;

  // Lecția de continuat: prima deblocată fără stele; altfel prima deblocată.
  const nextLesson = chapter.lessons.find((l) => isUnlocked(l.id) && starsFor(l.id) === 0)
    ?? chapter.lessons.find((l) => isUnlocked(l.id))
    ?? null;

  const nextValidated = nextLesson ? nextLesson.letters.filter((ch) => validated.has(ch)).length : 0;
  const nextTotal = nextLesson ? nextLesson.letters.length : 0;
  const nextPct = nextTotal ? nextValidated / nextTotal : 0;
  const minutesLeft = Math.max((nextTotal - nextValidated) * MINUTES_PER_LETTER, 1);

  const favoriteCount = chapter.lessons.filter((l) => isFavorite(l.id)).length;

  const visibleLessons = chapter.lessons.filter((l) => {
    if (filter === 'progress') return isUnlocked(l.id) && starsFor(l.id) === 0;
    if (filter === 'fav') return isFavorite(l.id);
    return true;
  });

  const prevTitleFor = (lessonId) => {
    const idx = LESSONS.findIndex((l) => l.id === lessonId);
    return idx > 0 ? LESSONS[idx - 1].title : null;
  };

  const chapterRow = (ch, i) => {
    const stars = ch.lessons.reduce((s, l) => s + starsFor(l.id), 0);
    const selected = ch.id === selectedChapterId;
    return (
      <button
        key={ch.id}
        type="button"
        onClick={() => { onSelectChapter(ch.id); setFilter('all'); }}
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
  };

  return (
    <div className="min-h-full flex flex-col gap-[22px]
      px-5 pt-5 pb-8 lg:px-11 lg:pt-[34px] lg:pb-11
      bg-[radial-gradient(110%_45%_at_50%_0%,#F3FBF6_0%,#FFFBF3_62%)]
      lg:bg-[radial-gradient(ellipse_70%_50%_at_85%_0%,#FFFDF7,#FBF6ED)]">

          {/* Capitole ca rând orizontal — doar sub lg */}
          <div className="lg:hidden flex flex-col gap-3">
            <button
              type="button"
              onClick={onBack}
              className="self-start flex items-center gap-2 rounded-xl border border-ink-900/10 bg-white
                px-4 py-2 text-[13px] font-bold text-ink-700"
            >
              <ChevronIcon className="w-[15px] h-[15px] rotate-180" />
              Înapoi
            </button>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5">
              {chapters.map(chapterRow)}
            </div>
          </div>

          {/* 1 · Header capitol */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="min-w-0">
              <p
                style={anim('sg-fade-right', 0.6, 0.06)}
                className="text-[10.5px] lg:text-xs font-extrabold uppercase tracking-[.14em] lg:tracking-[.22em] text-ink-400"
              >
                Capitolul {chapterIndex + 1} din {chapters.length}
              </p>
              <h1
                style={anim('sg-fade-up', 0.7, 0.14)}
                className="mt-1.5 lg:mt-2 text-[29px] lg:text-[2.6rem] font-black text-ink-900
                  tracking-[-.02em] lg:tracking-[-.025em] leading-tight lg:leading-[1.1] text-pretty"
              >
                {stripIndex(chapter.title)}
              </h1>
              <p
                style={anim('sg-fade-up', 0.7, 0.2)}
                className="mt-1 text-[13.5px] font-semibold text-ink-500 tabular-nums"
              >
                {chapter.description}
                {' · '}{chapter.lessons.length} {chapter.lessons.length === 1 ? 'lecție' : 'lecții'}
                {' · '}{chapterLetters.length} {chapterLetters.length === 1 ? 'literă' : 'litere'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {FILTERS.map((f, i) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    style={anim('sg-scale-in', 0.5, 0.22 + i * 0.07)}
                    className={`rounded-full px-3.5 py-2 text-[12.5px] font-extrabold border
                      transition-[color,background-color,border-color,transform] duration-[160ms] ease-out
                      ${active
                      ? 'bg-ink-900 border-ink-900 text-white'
                      : 'bg-white border-ink-900/[.09] text-ink-700 hover:border-signa-500 hover:text-signa-600 hover:-translate-y-px'}`}
                  >
                    {f.id === 'fav' ? `Favorite · ${favoriteCount}` : f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2 · Continuă + progresul capitolului */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[18px] items-stretch">
            <div
              style={anim('sg-fade-up', 0.75, 0.3)}
              className="relative overflow-hidden rounded-3xl lg:rounded-[26px] p-[22px] lg:p-[34px_36px]
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

              {nextLesson ? (
                <>
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p
                        style={anim('sg-fade-right', 0.6, 0.44)}
                        className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-emerald-100/75"
                      >
                        Continuă de aici
                      </p>
                      <h2
                        style={anim('sg-fade-up', 0.7, 0.5)}
                        className="mt-2 lg:mt-2.5 text-[22px] lg:text-[2.5rem] font-black text-white
                          tracking-[-.01em] lg:tracking-[-.02em] lg:leading-[1.06]"
                      >
                        {nextLesson.title}
                      </h2>
                      <p
                        style={anim('sg-fade-up', 0.7, 0.56)}
                        className="mt-1.5 lg:mt-2 text-[13px] lg:text-[15px] font-semibold text-cream/65 tabular-nums"
                      >
                        {nextValidated} din {nextTotal} litere validate · ~{minutesLeft}
                        {minutesLeft === 1 ? ' minut' : ' minute'}
                      </p>
                    </div>
                    <div
                      className="flex-none w-[62px] h-[62px] rounded-full flex items-center justify-center"
                      style={{
                        background: `conic-gradient(#34d399 0turn ${nextPct}turn, rgba(255,255,255,.16) ${nextPct}turn 1turn)`,
                        ...anim('sg-pop', 0.6, 0.6),
                      }}
                    >
                      <div className="w-12 h-12 rounded-full bg-signa-900 flex items-center justify-center">
                        <span className="text-[12.5px] font-black text-white tabular-nums">
                          {Math.round(nextPct * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex gap-2 mt-5">
                    {nextLesson.letters.map((ch, i) => {
                      // Pista de lumină rulează doar când nimic nu e validat —
                      // altfel ar spăla diferența dintre literele făcute și restul.
                      const cue = nextPct === 0
                        ? `, sg-chip-cue 5s ease-in-out ${(1.6 + i * 0.15).toFixed(2)}s infinite`
                        : '';
                      return (
                      <span
                        key={ch}
                        title={ch}
                        style={{ animation: `sg-pop .5s ${EASE} ${(0.64 + i * 0.06).toFixed(2)}s both${cue}` }}
                        className={`flex-1 min-w-0 truncate text-center py-2.5 rounded-xl font-black text-[14px] border
                          ${validated.has(ch)
                          ? 'bg-white/[.15] border-white/[.16] text-white'
                          : 'bg-white/[.07] border-white/10 text-cream/45'}`}
                      >
                        {ch}
                      </span>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenLesson(nextLesson.id)}
                    style={anim('sg-fade-up', 0.6, 0.94)}
                    className="relative overflow-hidden mt-5 rounded-2xl px-[26px] py-3.5 bg-cream text-signa-900
                      font-extrabold text-[14.5px] shadow-[0_10px_22px_rgba(0,0,0,.18)]
                      flex items-center gap-2 transition-transform duration-[160ms] ease-out
                      hover:-translate-y-0.5 active:scale-[.985]"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-2/5 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg,transparent,rgba(11,100,70,.10),transparent)',
                        animation: 'sg-sheen 4.5s cubic-bezier(.4,0,.2,1) 2s infinite',
                      }}
                    />
                    <span className="relative">Continuă lecția</span>
                    <span aria-hidden className="relative flex sg-arrow">
                      <ChevronIcon className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </>
              ) : (
                <div className="relative">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-emerald-100/75">
                    Capitol blocat
                  </p>
                  <h2 className="mt-2 text-[22px] font-black text-white tracking-[-.01em]">
                    {stripIndex(chapter.title)}
                  </h2>
                  <p className="mt-1.5 text-[13px] font-semibold text-cream/65 leading-relaxed">
                    Termină capitolul anterior ca să deschizi lecțiile de aici.
                  </p>
                </div>
              )}
            </div>

            <div
              style={anim('sg-fade-up', 0.75, 0.4)}
              className="bg-white border border-ink-900/[.05] rounded-[22px] lg:rounded-[26px]
                shadow-[0_10px_30px_rgba(46,42,36,.06)]
                px-6 py-[22px] lg:px-8 lg:py-[30px] flex flex-col justify-between gap-4"
            >
              <div>
                <p
                  style={anim('sg-fade-right', 0.6, 0.54)}
                  className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400"
                >
                  Progresul capitolului
                </p>
                <p style={anim('sg-fade-up', 0.6, 0.6)} className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-[32px] font-black text-ink-900 leading-none tabular-nums">{chapterStars}</span>
                  <span className="text-[15px] font-bold text-ink-400 tabular-nums">/ {chapterMaxStars} stele</span>
                </p>
                <div className="relative mt-3.5 h-[9px] rounded-full bg-ink-900/[.07] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-signa-400 to-signa-600 transition-[width] duration-500"
                    style={{ width: `${chapterMaxStars ? (chapterStars / chapterMaxStars) * 100 : 0}%` }}
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
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-ink-900/[.06] pt-[18px]">
                <div style={anim('sg-fade-up', 0.6, 0.72)}>
                  <p className="text-[19px] lg:text-[23px] font-black text-signa-900 leading-none tabular-nums">
                    {lessonsDone}<span className="text-[13px] lg:text-base text-ink-400">/{chapter.lessons.length}</span>
                  </p>
                  <p className="mt-1.5 lg:mt-[5px] text-[9.5px] lg:text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                    Lecții făcute
                  </p>
                </div>
                <div style={anim('sg-fade-up', 0.6, 0.8)}>
                  <p className="text-[19px] lg:text-[23px] font-black text-ink-900 leading-none tabular-nums">
                    {lettersLearned}<span className="text-[13px] lg:text-base text-ink-400">/{chapterLetters.length}</span>
                  </p>
                  <p className="mt-1.5 lg:mt-[5px] text-[9.5px] lg:text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                    Litere învățate
                  </p>
                </div>
              </div>

              {lessonsLeft > 0 && nextChapter && (
                <div
                  style={anim('sg-fade-up', 0.6, 0.88)}
                  className="rounded-[14px] bg-signa-50 border border-signa-500/[.14] px-3.5 py-3"
                >
                  <p className="text-[12px] font-bold text-signa-900 leading-relaxed">
                    {lessonsLeft === 1 ? 'Încă o lecție' : `Încă ${lessonsLeft} lecții`} și se deschide
                    {' '}capitolul {chapterIndex + 2} — {stripIndex(nextChapter.title).toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3 · Grila lecțiilor */}
          <div>
            <div style={anim('sg-fade-up', 0.6, 0.46)} className="flex items-baseline justify-between mb-3.5">
              <h3 className="text-[15px] font-black text-ink-900">Lecțiile capitolului</h3>
              <span className="text-[12px] font-bold text-ink-400">Deblocare progresivă</span>
            </div>

            {visibleLessons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {visibleLessons.map((lesson, i) => (
                  <LessonCard
                    key={lesson.id}
                    delay={0.5 + i * 0.06}
                    lesson={lesson}
                    stars={starsFor(lesson.id)}
                    unlocked={isUnlocked(lesson.id)}
                    favorite={isFavorite(lesson.id)}
                    validated={validated}
                    prevTitle={prevTitleFor(lesson.id)}
                    onOpen={onOpenLesson}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] font-semibold text-ink-400 py-6">
                {filter === 'fav'
                  ? 'Nicio lecție marcată ca favorită în acest capitol.'
                  : 'Nicio lecție în curs în acest capitol.'}
              </p>
            )}
      </div>
    </div>
  );
}
