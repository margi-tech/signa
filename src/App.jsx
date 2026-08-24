import { useEffect, useState } from 'react';
import AppShell, { SHELL_PAGES } from './components/AppShell.jsx';
import CollectPage from './pages/CollectPage.jsx';
import TrainPage from './pages/TrainPage.jsx';
import LessonPage from './pages/LessonPage.jsx';
import SpellPage from './pages/SpellPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import DiagnosticPage from './pages/DiagnosticPage.jsx';
import ReferinteCatalogPage from './pages/ReferinteCatalogPage.jsx';
import Onboarding from './components/Onboarding.jsx';
import AuthGate from './components/auth/AuthGate.jsx';
import { LESSONS } from './data/lessons.js';
import { useProgress } from './hooks/useProgress.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

function pageFromHash() {
  return window.location.hash.replace(/^#/, '') === 'referinte' ? 'referinte' : null;
}

export default function App() {
  const [page, setPage] = useState(() => pageFromHash() || 'home');
  const [lessonId, setLessonId] = useState(null);
  const [reviewLesson, setReviewLesson] = useState(null);
  const { onboardingDone, finishOnboarding } = useProgress();

  useEffect(() => {
    const onHash = () => {
      const fromHash = pageFromHash();
      if (fromHash) setPage(fromHash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openReferinte = () => {
    window.location.hash = 'referinte';
    setPage('referinte');
  };
  const closeReferinte = () => {
    if (window.location.hash.replace(/^#/, '') === 'referinte') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setPage('home');
  };

  const [user, setUser] = useState(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      return undefined;
    }
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Catalogul de review e un document intern — accesibil și fără login (#referinte).
  if (page === 'referinte') {
    return <ReferinteCatalogPage onBack={closeReferinte} />;
  }

  if (user === undefined) {
    return (
      <div className="h-full bg-cream flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-ink-900/10 border-t-signa-500 animate-spin" />
      </div>
    );
  }

  const preview = window.location.search.includes('previewShell');

  if (isSupabaseConfigured && !user && !preview) {
    return <AuthGate onAuth={() => {}} />;
  }

  if (!onboardingDone && !preview) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  if (page === 'collect') return <CollectPage onBack={() => setPage('home')} />;
  if (page === 'train') return <TrainPage onBack={() => setPage('home')} />;
  if (page === 'spell') return <SpellPage onBack={() => setPage('home')} />;
  if (page === 'diagnostic') return <DiagnosticPage onBack={() => setPage('home')} />;

  if (page === 'review') {
    return (
      <ReviewPage
        onBack={() => setPage('home')}
        onStartReview={(letters) => {
          // Fără `type` la nivel de lecție: repetiția poate amesteca liber
          // litere/cuvinte statice și dinamice — LessonPage decide modelul
          // per literă, din DYNAMIC_LETTERS, nu din tipul sesiunii.
          setReviewLesson({
            id: 'review',
            title: 'Repetiție',
            letters,
          });
          setPage('lesson');
        }}
      />
    );
  }

  if (page === 'lesson') {
    const lesson = reviewLesson ?? LESSONS.find((l) => l.id === lessonId);
    return (
      <LessonPage
        key={reviewLesson ? `review-${reviewLesson.letters.join('')}` : lessonId}
        lesson={lesson}
        onExit={() => setPage(reviewLesson ? 'review' : 'lessons')}
      />
    );
  }

  return (
    <AppShell
      page={SHELL_PAGES.includes(page) ? page : 'home'}
      onNavigate={setPage}
      onOpenLesson={(id) => { setLessonId(id); setReviewLesson(null); setPage('lesson'); }}
      onCollect={() => setPage('collect')}
      onTrain={() => setPage('train')}
      onSpell={() => setPage('spell')}
      onReview={() => setPage('review')}
      onDiagnostic={() => setPage('diagnostic')}
      onReferinte={openReferinte}
    />
  );
}
