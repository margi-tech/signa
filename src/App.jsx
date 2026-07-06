import { useState } from 'react';
import HomePage    from './pages/HomePage.jsx';
import CameraPage  from './pages/CameraPage.jsx';
import CollectPage from './pages/CollectPage.jsx';
import TrainPage   from './pages/TrainPage.jsx';
import LessonsPage from './pages/LessonsPage.jsx';
import LessonPage  from './pages/LessonPage.jsx';
import { LESSONS } from './data/lessons.js';

export default function App() {
  const [page,     setPage]     = useState('home');
  const [lessonId, setLessonId] = useState(null);

  if (page === 'camera')  return <CameraPage  onBack={() => setPage('home')} />;
  if (page === 'collect') return <CollectPage onBack={() => setPage('home')} />;
  if (page === 'train')   return <TrainPage   onBack={() => setPage('home')} />;

  if (page === 'lessons') {
    return (
      <LessonsPage
        onBack={() => setPage('home')}
        onOpenLesson={(id) => { setLessonId(id); setPage('lesson'); }}
      />
    );
  }

  if (page === 'lesson') {
    const lesson = LESSONS.find((l) => l.id === lessonId);
    return (
      <LessonPage
        key={lessonId}
        lesson={lesson}
        onExit={() => setPage('lessons')}
      />
    );
  }

  return (
    <HomePage
      onLessons={() => setPage('lessons')}
      onStart={()   => setPage('camera')}
      onCollect={() => setPage('collect')}
      onTrain={()   => setPage('train')}
    />
  );
}
