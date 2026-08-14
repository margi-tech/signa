import { useState } from 'react';
import { LESSONS, buildChaptersWithLessons } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';

function BookmarkIcon({ filled }) {
  return (
      <svg width="16" height="16" viewBox="0 0 24 24"
           fill={filled ? 'currentColor' : 'none'}
           stroke="currentColor"
           strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z"/>
      </svg>
  );
}

function Stars({ count }) {
  return (
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24"
                 fill={i < count ? '#f59e0b' : '#EFEAE0'}>
              <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>
            </svg>
        ))}
      </div>
  );
}

function FavoriteChip({ lesson, onOpen }) {
  return (
      <button
          onClick={() => onOpen(lesson.id)}
          className="flex-shrink-0 flex items-center gap-2 bg-white shadow-card rounded-xl
        pl-2 pr-3 py-2 active:scale-[0.97] transition-transform"
      >
      <span className="w-7 h-7 rounded-lg bg-signa-50 text-signa-600 flex items-center
        justify-center font-black text-xs flex-shrink-0">
        {lesson.id}
      </span>
        <span className="text-ink-900 text-xs font-semibold truncate max-w-[8rem]">
        {lesson.title}
      </span>
      </button>
  );
}

function LessonCard({ lesson, stars, unlocked, favorite, onOpen, onToggleFavorite }) {
  const isDyn = lesson.type === 'dynamic';
  return (
      <div className={`relative w-full rounded-2xl transition-all duration-150
      ${unlocked
          ? 'bg-white shadow-card hover:shadow-soft'
          : 'bg-ink-900/[0.03] opacity-70'}`}
      >
        <button
            onClick={() => unlocked && onOpen(lesson.id)}
            disabled={!unlocked}
            className="w-full p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
          font-black text-lg
          ${stars > 0
              ? 'bg-signa-50 text-signa-600'
              : unlocked
                  ? isDyn ? 'bg-indigo-50 text-indigo-500' : 'bg-cream-200 text-ink-900'
                  : 'bg-ink-900/[0.05] text-ink-400'}`}>
            {unlocked ? lesson.id : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5 pr-6">
              <div className="flex items-center gap-2 min-w-0">
              <span className={`font-bold text-sm ${unlocked ? 'text-ink-900' : 'text-ink-400'}`}>
                {lesson.title}
              </span>
                {isDyn && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                  mișcare
                </span>
                )}
              </div>
              <Stars count={stars} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {lesson.letters.map((l) => {
                const isLong = l.length > 1;
                return (
                    <span
                        key={l}
                        title={l}
                        className={`h-6 rounded-md text-[11px] font-bold
                    flex items-center justify-center
                    ${isLong ? 'px-1.5 max-w-[6.5rem] truncate' : 'w-6'}
                    ${unlocked ? 'bg-cream-100 text-ink-600' : 'bg-ink-900/[0.03] text-ink-400'}`}
                    >
                  {l}
                </span>
                );
              })}
            </div>
          </div>
        </button>

        {unlocked && (
            <button
                onClick={() => onToggleFavorite(lesson.id)}
                aria-label={favorite ? 'Scoate din favorite' : 'Adaugă la favorite'}
                className={`absolute top-3 right-3 p-1 -m-1 transition-colors
            ${favorite ? 'text-signa-600' : 'text-ink-300 hover:text-signa-500'}`}
            >
              <BookmarkIcon filled={favorite} />
            </button>
        )}
      </div>
  );
}

function ChapterSection({ chapter, isOpen, onToggle, starsFor, isUnlocked, isFavorite, onToggleFavorite, onOpenLesson }) {
  const chapterStars = chapter.lessons.reduce((s, l) => s + starsFor(l.id), 0);
  const chapterUnlocked = chapter.lessons.some((l) => isUnlocked(l.id));
  const chapterDone = chapter.lessons.every((l) => starsFor(l.id) > 0);

  return (
      <div className="space-y-3">
          <button
              onClick={() => onToggle(chapter.id)}
              className={`w-full flex items-center justify-between px-1 py-1
          ${!chapterUnlocked ? 'opacity-60' : ''}`}
          >
          <div className="flex items-center gap-2">
          <span className={`font-bold text-xs tracking-[0.14em] uppercase
            ${chapterDone ? 'text-signa-600' : 'text-ink-900'}`}>
            {chapter.title}
          </span>
            {!chapterUnlocked && (
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-ink-400">
                  <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
            )}
          </div>
          <div className="flex items-center gap-2">
          <span className="text-ink-400 text-[11px]">
            {chapterStars} / {chapter.lessons.length * 3} ⭐
          </span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                     className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
          </div>
        </button>

        {isOpen && (
            <div className="space-y-3">
              {chapter.lessons.map((lesson) => (
                  <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      stars={starsFor(lesson.id)}
                      unlocked={isUnlocked(lesson.id)}
                      favorite={isFavorite(lesson.id)}
                      onOpen={onOpenLesson}
                      onToggleFavorite={onToggleFavorite}
                  />
              ))}
            </div>
        )}
      </div>
  );
}

/**
 * Capitolul "activ": primul care are o lecție încă necompletată
 * (0 stele). Dacă toate lecțiile dintr-un capitol au stele, se trece
 * automat la următorul. Așa rămâne deschis capitolul curent după ce
 * termini o lecție, sau se deschide următorul dacă tocmai l-ai încheiat.
 */
function findActiveChapterId(chapters, starsFor) {
  const chapterCuLectieNeterminata = chapters.find(
      (ch) => ch.lessons.some((l) => starsFor(l.id) === 0),
  );
  return chapterCuLectieNeterminata?.id ?? chapters[chapters.length - 1]?.id ?? null;
}

export default function LessonsPage({ onBack, onOpenLesson }) {
  const { xp, streak, starsFor, isUnlocked, isFavorite, toggleFavorite, level } = useProgress();
  const chapters = buildChaptersWithLessons();
  const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);
  const totalStars = chapters.reduce(
      (s, c) => s + c.lessons.reduce((cs, l) => cs + starsFor(l.id), 0), 0,
  );
  const favoriteLessons = LESSONS.filter((l) => isFavorite(l.id) && isUnlocked(l.id));

  // capitolul activ (cu lecția curentă) deschis implicit; restul la click
  const [openChapterId, setOpenChapterId] = useState(
      () => findActiveChapterId(chapters, starsFor),
  );

  return (
      <div className="h-full bg-cream flex flex-col overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

        <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
          <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-ink-500 hover:text-ink-900 text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Înapoi
          </button>
          <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">LECȚII</h1>
          <div className="flex items-center gap-1.5 bg-white shadow-card rounded-full px-3 py-1
          text-amber-600 text-sm font-bold tabular-nums">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L4.5 13.5h6L11 22l8.5-11.5h-6L13 2z"/>
            </svg>
            {xp}
          </div>
        </header>

        <div className="px-5 pb-4 flex-shrink-0 flex items-center justify-between">
          <p className="text-ink-500 text-xs">
            {totalStars} / {totalLessons * 3} stele · nivel {level}
          </p>
          {streak > 0 && (
              <p className="text-amber-600 text-xs font-bold">🔥 {streak} zile</p>
          )}
        </div>

        {favoriteLessons.length > 0 && (
            <div className="px-5 pb-4 flex-shrink-0">
              <p className="text-ink-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                Favorite
              </p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {favoriteLessons.map((lesson) => (
                    <FavoriteChip key={lesson.id} lesson={lesson} onOpen={onOpenLesson} />
                ))}
              </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8 space-y-6">
          {chapters.map((chapter) => (
              <ChapterSection
                  key={chapter.id}
                  chapter={chapter}
                  isOpen={openChapterId === chapter.id}
                  onToggle={(id) => setOpenChapterId((prev) => (prev === id ? null : id))}
                  starsFor={starsFor}
                  isUnlocked={isUnlocked}
                  isFavorite={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  onOpenLesson={onOpenLesson}
              />
          ))}

          <div className="rounded-2xl p-4 bg-white/60 border border-ink-900/[0.06] text-center">
            <p className="text-ink-500 text-xs leading-relaxed">
              După alfabet: cuvinte LSR (Bună, Mulțumesc…) prin „Scrie cuvântul”.
              Semnele-gest vin după recolectarea datasetului.
            </p>
          </div>
        </div>
      </div>
  );
}
