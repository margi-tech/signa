import { useState, useCallback } from 'react';
import { LESSONS } from '../data/lessons';

const STORAGE_KEY = 'signa-progress-v1';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { xp: 0, lessons: {} };
  } catch {
    return { xp: 0, lessons: {} };
  }
}

/**
 * Progresul utilizatorului: XP total + stele per lecție.
 * Persistat în localStorage — Faza 5 îl va sincroniza cu backend-ul.
 *
 * Format: { xp: number, lessons: { [id]: { stars, completedAt } } }
 */
export function useProgress() {
  const [progress, setProgress] = useState(loadStored);

  const save = useCallback((next) => {
    setProgress(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage indisponibil — progresul rămâne doar în sesiune
    }
  }, []);

  /** Stelele obținute la o lecție (0 = necompletată) */
  const starsFor = useCallback(
    (lessonId) => progress.lessons[lessonId]?.stars ?? 0,
    [progress]
  );

  /** O lecție e deblocată dacă e prima sau dacă precedenta e completată */
  const isUnlocked = useCallback(
    (lessonId) => {
      const idx = LESSONS.findIndex((l) => l.id === lessonId);
      if (idx <= 0) return true;
      return (progress.lessons[LESSONS[idx - 1].id]?.stars ?? 0) > 0;
    },
    [progress]
  );

  /** Înregistrează o lecție completată; stelele se păstrează doar dacă sunt mai bune */
  const completeLesson = useCallback((lessonId, stars, xpGained) => {
    setProgress((prev) => {
      const prevStars = prev.lessons[lessonId]?.stars ?? 0;
      const next = {
        xp: prev.xp + xpGained,
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            stars: Math.max(prevStars, stars),
            completedAt: new Date().toISOString(),
          },
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* vezi save() */ }
      return next;
    });
  }, []);

  return { xp: progress.xp, starsFor, isUnlocked, completeLesson };
}
