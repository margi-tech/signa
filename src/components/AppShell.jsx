import { useEffect, useState } from 'react';
import Sidebar, { PAGE_ORDER } from './Sidebar.jsx';
import HomePage from '../pages/HomePage.jsx';
import LessonsPage from '../pages/LessonsPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import CameraPage from '../pages/CameraPage.jsx';
import LeaderboardPage from '../pages/LeaderboardPage.jsx';
import { buildChaptersWithLessons } from '../data/lessons.js';
import { useProgress } from '../hooks/useProgress.js';
import { useProfileSummary } from '../hooks/useProfileSummary.js';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/** Ecranele care trăiesc în shell (au sidebar și se tranziționează între ele). */
export const SHELL_PAGES = ['home', 'lessons', 'camera', 'leaderboard', 'profile'];

/**
 * Capitolul „activ”: primul care are o lecție încă necompletată (0 stele).
 * Dacă toate lecțiile dintr-un capitol au stele, se trece la următorul.
 */
function findActiveChapterId(chapters, starsFor) {
  const chapterCuLectieNeterminata = chapters.find(
    (ch) => ch.lessons.some((l) => starsFor(l.id) === 0),
  );
  return chapterCuLectieNeterminata?.id ?? chapters[chapters.length - 1]?.id ?? null;
}

/**
 * Shell-ul persistent: sidebar-ul rămâne montat, iar conținutul se schimbă
 * cu o tranziție. Ecranul care iese rămâne montat cât ține animația, ca
 * staggerurile interne ale celui care intră să se rejoace de la capăt.
 */
export default function AppShell({
  page, onNavigate,
  onOpenLesson, onCollect, onTrain, onDiagnostic, onSpell, onReview, onReferinte,
}) {
  const {
    xp, streak, level, xpIntoLevel, xpNeeded, totalLessonsCount, starsFor,
  } = useProgress();
  const {
    firstName, initials, avatarUrl, rank, refresh: refreshProfile,
  } = useProfileSummary(xp);

  const chapters = buildChaptersWithLessons();
  const [selectedChapterId, setSelectedChapterId] = useState(
    () => findActiveChapterId(chapters, starsFor),
  );

  /* Tranziția: `leaving` e ecranul care iese, `dir` direcția din meniu.
     Se calculează în timpul randării, nu într-un efect — altfel primul
     cadru după schimbarea paginii ar demonta ecranul vechi fără animație. */
  const [prevPage, setPrevPage] = useState(page);
  const [leaving, setLeaving] = useState(null);
  const [dir, setDir] = useState('down');

  if (prevPage !== page) {
    setPrevPage(page);
    if (SHELL_PAGES.includes(prevPage)) {
      setLeaving(prevPage);
      setDir((PAGE_ORDER[page] ?? 0) > (PAGE_ORDER[prevPage] ?? 0) ? 'down' : 'up');
    }
  }

  /* Ecranul care iese se demontează când i se termină animația. Nu pe un
     timer fix: `filter: blur()` pe un strat cât pagina nu se poate compune
     pe GPU, iar sub jank un setTimeout(470) poate întârzia de câteva ori.
     Timer-ul rămâne doar ca plasă de siguranță, generos. */
  useEffect(() => {
    if (!leaving) return undefined;
    const id = setTimeout(() => setLeaving(null), 1500);
    return () => clearTimeout(id);
  }, [leaving]);

  // `animationend` urcă și de la copii (staggerurile interne) — ne interesează
  // doar animația stratului însuși.
  const onLayerAnimEnd = (e) => {
    if (e.target === e.currentTarget) setLeaving(null);
  };

  // Click-urile din timpul tranziției se ignoră, ca să nu rămână un ecran
  // blocat pe la mijloc dacă apeși repede pe două iteme.
  const go = (target) => {
    if (target === page || leaving) return;
    onNavigate(target);
  };

  const layer = (name) => (name === page
    ? {
      zIndex: 1,
      willChange: 'transform, opacity, filter',
      animation: `sg-page-in-${dir} .52s ${EASE} both`,
    }
    : {
      zIndex: 0,
      pointerEvents: 'none',
      willChange: 'transform, opacity, filter',
      animation: `sg-page-out-${dir} .42s cubic-bezier(.4,0,.6,1) both`,
    });

  const mainClass = 'absolute inset-0 overflow-y-auto scrollbar-hide';
  const shows = (name) => page === name || leaving === name;

  return (
    <div className="h-full overflow-hidden bg-cream flex flex-col">
      <div
        className="h-[3px] flex-shrink-0 sg-topbar"
        style={{
          background: 'linear-gradient(90deg,#34d399,rgba(16,185,129,.4),transparent,#34d399,rgba(16,185,129,.4),transparent)',
        }}
      />

      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[262px_1fr]">
        <Sidebar
          page={page}
          onNavigate={go}
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={setSelectedChapterId}
          starsFor={starsFor}
          level={level}
          xpIntoLevel={xpIntoLevel}
          xpNeeded={xpNeeded}
          totalLessonsCount={totalLessonsCount}
          rank={rank}
          firstName={firstName}
          initials={initials}
          avatarUrl={avatarUrl}
          streak={streak}
          onCollect={onCollect}
          onTrain={onTrain}
          onDiagnostic={onDiagnostic}
          onReferinte={onReferinte}
        />

        <div className="relative min-w-0 flex-1 min-h-0 overflow-hidden">
          {shows('home') && (
            <main className={mainClass} style={layer('home')} onAnimationEnd={onLayerAnimEnd}>
              <HomePage
                firstName={firstName}
                initials={initials}
                rank={rank}
                onLessons={() => go('lessons')}
                onOpenLesson={onOpenLesson}
                onStart={() => go('camera')}
                onProfile={() => go('profile')}
                onLeaderboard={() => go('leaderboard')}
                onSpell={onSpell}
                onReview={onReview}
              />
            </main>
          )}

          {shows('lessons') && (
            <main className={mainClass} style={layer('lessons')} onAnimationEnd={onLayerAnimEnd}>
              <LessonsPage
                chapters={chapters}
                selectedChapterId={selectedChapterId}
                onSelectChapter={setSelectedChapterId}
                rank={rank}
                onBack={() => go('home')}
                onOpenLesson={onOpenLesson}
              />
            </main>
          )}

          {shows('camera') && (
            <main className={mainClass} style={layer('camera')} onAnimationEnd={onLayerAnimEnd}>
              <CameraPage />
            </main>
          )}

          {shows('leaderboard') && (
            <main className={mainClass} style={layer('leaderboard')} onAnimationEnd={onLayerAnimEnd}>
              <LeaderboardPage />
            </main>
          )}

          {shows('profile') && (
            <main className={mainClass} style={layer('profile')} onAnimationEnd={onLayerAnimEnd}>
              <ProfilePage onProfileUpdated={refreshProfile} />
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
