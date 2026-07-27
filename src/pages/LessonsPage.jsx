import { LESSONS } from '../data/lessons';
import { useProgress } from '../hooks/useProgress';

/* ── Stele (0-3) ────────────────────────────────────────────────── */
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

/* ── Card lecție ────────────────────────────────────────────────── */
function LessonCard({ lesson, stars, unlocked, onOpen }) {
  return (
    <button
      onClick={() => unlocked && onOpen(lesson.id)}
      disabled={!unlocked}
      className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left
        transition-all duration-150
        ${unlocked
          ? 'bg-white shadow-card hover:shadow-soft active:scale-[0.98]'
          : 'bg-ink-900/[0.03] opacity-70'}`}
    >
      {/* Număr / lacăt */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
        font-black text-lg
        ${stars > 0
          ? 'bg-signa-50 text-signa-600'
          : unlocked ? 'bg-cream-200 text-ink-900' : 'bg-ink-900/[0.05] text-ink-400'}`}>
        {unlocked ? lesson.id : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        )}
      </div>

      {/* Titlu + litere */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`font-bold text-sm ${unlocked ? 'text-ink-900' : 'text-ink-400'}`}>
            {lesson.title}
          </span>
          <Stars count={stars} />
        </div>
        <div className="flex gap-1">
          {lesson.letters.map((l) => (
            <span key={l} className={`w-6 h-6 rounded-md text-[11px] font-bold
              flex items-center justify-center
              ${unlocked ? 'bg-cream-100 text-ink-600' : 'bg-ink-900/[0.03] text-ink-400'}`}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────── */
export default function LessonsPage({ onBack, onOpenLesson }) {
  const { xp, starsFor, isUnlocked } = useProgress();
  const totalStars = LESSONS.reduce((s, l) => s + starsFor(l.id), 0);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      {/* Header */}
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
          {xp} XP
        </div>
      </header>

      {/* Sumar */}
      <div className="px-5 pb-4 flex-shrink-0">
        <p className="text-ink-500 text-xs">
          {totalStars} / {LESSONS.length * 3} stele · alfabetul static LSR
        </p>
      </div>

      {/* Lista lecțiilor */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8 space-y-3">
        {LESSONS.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            stars={starsFor(lesson.id)}
            unlocked={isUnlocked(lesson.id)}
            onOpen={onOpenLesson}
          />
        ))}

        {/* Teaser litere dinamice */}
        <div className="rounded-2xl p-4 border-2 border-dashed border-ink-900/10 text-center">
          <p className="text-ink-500 text-xs leading-relaxed">
            J · Z · X · Î · Ș · Ț — literele cu mișcare<br />
            vin într-o actualizare viitoare
          </p>
        </div>
      </div>
    </div>
  );
}
