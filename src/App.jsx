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
import { useProfileSummary } from './hooks/useProfileSummary.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import { useDatasetAccess } from './hooks/useDatasetAccess.js';

/* Ecranele cu URL propriu, ca să poată fi deschise direct dintr-un link — pe
   telefon sidebar-ul cu Unelte nu există (`hidden lg:flex`), deci hash-ul e
   singurul drum spre Colectare. Accesul rămâne filtrat de `canCollect` mai jos. */
const HASH_PAGES = { referinte: 'referinte', colectare: 'collect' };
const HASH_TARGETS = Object.values(HASH_PAGES);

function pageFromHash() {
  return HASH_PAGES[window.location.hash.replace(/^#/, '')] ?? null;
}

function clearHash() {
  if (pageFromHash()) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

export default function App() {
  const [page, setPage] = useState(() => pageFromHash() || 'home');
  const [lessonId, setLessonId] = useState(null);
  const [reviewLesson, setReviewLesson] = useState(null);
  const [user, setUser] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const { onboardingDone, finishOnboarding, xp } = useProgress();
  const profileSummary = useProfileSummary(xp, user?.id);
  const datasetAccess = useDatasetAccess(user?.id);

  useEffect(() => {
    const onHash = () => {
      const fromHash = pageFromHash();
      /* Back-ul browserului scoate hash-ul: atunci ieșim din ecranul cu URL propriu.
         Ecranele fără hash (lecție, train, review) nu se ating — altfel orice
         hashchange le-ar arunca Acasă. */
      setPage((prev) => fromHash ?? (HASH_TARGETS.includes(prev) ? 'home' : prev));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openHashPage = (hash, target) => {
    window.location.hash = hash;
    setPage(target);
  };
  const backHome = () => {
    clearHash();
    setPage('home');
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      return undefined;
    }
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Catalogul de review e un document intern — accesibil și fără login (#referinte).
  if (page === 'referinte') {
    return <ReferinteCatalogPage onBack={backHome} />;
  }

  if (user === undefined) {
    return (
      <div className="h-full bg-cream flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-ink-900/10 border-t-signa-500 animate-spin" />
      </div>
    );
  }

  if (passwordRecovery) {
    return (
      <AuthGate
        initialMode="reset"
        onRecoveryComplete={() => setPasswordRecovery(false)}
      />
    );
  }

  if (isSupabaseConfigured && !user) {
    return <AuthGate onAuth={() => {}} />;
  }

  if (!onboardingDone) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  const isAdmin = profileSummary.role === 'admin';
  const canCollect = !isSupabaseConfigured || isAdmin || datasetAccess.can_collect;
  const canTrain = !isSupabaseConfigured || isAdmin || datasetAccess.can_train;
  const canDiagnostic = !isSupabaseConfigured || isAdmin;
  const needsDatasetAccess = page === 'collect' || page === 'train';
  const internalTool = ['collect', 'train', 'diagnostic'].includes(page);
  const allowedTool = (
    (page === 'collect' && canCollect)
    || (page === 'train' && canTrain)
    || (page === 'diagnostic' && canDiagnostic)
  );
  if (internalTool && (profileSummary.loading || (needsDatasetAccess && datasetAccess.loading))) {
    return (
      <div className="h-full bg-cream flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-ink-900/10 border-t-signa-500 animate-spin" />
      </div>
    );
  }
  if (internalTool && !allowedTool) {
    const copy = page === 'train'
      ? {
        title: 'Antrenare rezervată echipei',
        body: 'Doar antrenorii invitați pot încărca datasetul comun și antrena modelul.',
      }
      : page === 'diagnostic'
        ? {
          title: 'Unealtă rezervată administratorilor',
          body: 'Diagnosticul rămâne intern, pentru verificarea detectoarelor.',
        }
        : {
          title: 'Colectare rezervată echipei',
          body: 'Doar colectorii invitați pot trimite exemple în datasetul comun.',
        };
    return (
      <div className="h-full bg-cream flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-black text-ink-900">{copy.title}</h1>
        <p className="max-w-sm text-sm font-semibold text-ink-500">{copy.body}</p>
        <button
          type="button"
          onClick={backHome}
          className="rounded-xl bg-signa-500 px-5 py-3 text-sm font-bold text-white"
        >
          Înapoi acasă
        </button>
      </div>
    );
  }

  if (page === 'collect') {
    return (
      <CollectPage
        onBack={backHome}
        userId={user?.id}
        datasetAccess={datasetAccess}
      />
    );
  }
  if (page === 'train') {
    return (
      <TrainPage
        onBack={() => setPage('home')}
        canLoadCloud={canTrain && isSupabaseConfigured}
      />
    );
  }
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
        key={reviewLesson ? `review-${reviewLesson.letters?.join('') ?? 'invalid'}` : lessonId}
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
      onCollect={() => openHashPage('colectare', 'collect')}
      onTrain={() => setPage('train')}
      onSpell={() => setPage('spell')}
      onReview={() => setPage('review')}
      onDiagnostic={() => setPage('diagnostic')}
      onReferinte={() => openHashPage('referinte', 'referinte')}
      profileSummary={profileSummary}
      canCollect={canCollect}
      canTrain={canTrain}
      canDiagnostic={canDiagnostic}
    />
  );
}
