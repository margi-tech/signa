import { useState } from 'react';
import HomePage from './pages/HomePage.jsx';
import CameraPage from './pages/CameraPage.jsx';
import CollectPage from './pages/CollectPage.jsx';
import TrainPage from './pages/TrainPage.jsx';
import LessonsPage from './pages/LessonsPage.jsx';
import LessonPage from './pages/LessonPage.jsx';
import SpellPage from './pages/SpellPage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import DiagnosticPage from './pages/DiagnosticPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import Onboarding from './components/Onboarding.jsx';
import AuthGate from './components/AuthGate.jsx';
import { LESSONS } from './data/lessons.js';
import { useProgress } from './hooks/useProgress.js';

export default function App() {
  const [page, setPage] = useState('home');
  const [lessonId, setLessonId] = useState(null);
  const [reviewLesson, setReviewLesson] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [authScreen, setAuthScreen] = useState('gate');
  const { onboardingDone, finishOnboarding } = useProgress();

  if (!onboardingDone) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  if (!authed) {
    if (authScreen === 'login') {
      return (
        <LoginPage
          onBack={() => setAuthScreen('gate')}
          onSwitchToSignup={() => setAuthScreen('signup')}
          onSuccess={() => setAuthed(true)}
        />
      );
    }
    if (authScreen === 'signup') {
      return (
        <SignupPage
          onBack={() => setAuthScreen('gate')}
          onSwitchToLogin={() => setAuthScreen('login')}
          onSuccess={() => setAuthed(true)}
        />
      );
    }
    return <AuthGate onLogin={() => setAuthScreen('login')} onSignup={() => setAuthScreen('signup')} />;
  }

  if (page === 'camera') return <CameraPage onBack={() => setPage('home')} />;
  if (page === 'collect') return <CollectPage onBack={() => setPage('home')} />;
  if (page === 'train') return <TrainPage onBack={() => setPage('home')} />;
  if (page === 'spell') return <SpellPage onBack={() => setPage('home')} />;
  if (page === 'diagnostic') return <DiagnosticPage onBack={() => setPage('home')} />;
  if (page === 'profile') return <ProfilePage onBack={() => setPage('home')} />;
  if (page === 'leaderboard') return <LeaderboardPage onBack={() => setPage('home')} />;

  if (page === 'review') {
    return (
      <ReviewPage
        onBack={() => setPage('home')}
        onStartReview={(letters) => {
          setReviewLesson({
            id: 'review',
            title: 'Repetiție',
            type: 'static',
            letters,
          });
          setPage('lesson');
        }}
      />
    );
  }

  if (page === 'lessons') {
    return (
      <LessonsPage
        onBack={() => setPage('home')}
        onOpenLesson={(id) => { setLessonId(id); setReviewLesson(null); setPage('lesson'); }}
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
    <HomePage
      onLessons={() => setPage('lessons')}
      onStart={() => setPage('camera')}
      onCollect={() => setPage('collect')}
      onTrain={() => setPage('train')}
      onSpell={() => setPage('spell')}
      onReview={() => setPage('review')}
      onDiagnostic={() => setPage('diagnostic')}
      onProfile={() => setPage('profile')}
      onLeaderboard={() => setPage('leaderboard')}
    />
  );
}
