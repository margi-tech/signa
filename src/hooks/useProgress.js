import { useState, useCallback, useMemo } from 'react';
import { LESSONS, levelFromXp, xpForLevel } from '../data/lessons';

const STORAGE_KEY = 'signa-progress-v2';
const LEGACY_KEY  = 'signa-progress-v1';

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a, b) {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / 86_400_000);
}

function emptyProgress() {
  return {
    xp: 0,
    streak: 0,
    lastPracticeDate: null,
    onboardingDone: false,
    lessons: {},
    letterMastery: {}, // { [letter]: { correct, attempts, lastAt } }
    soundEnabled: true,
  };
}

function migrate(raw) {
  if (!raw) return emptyProgress();
  return {
    ...emptyProgress(),
    ...raw,
    lessons: raw.lessons ?? {},
    letterMastery: raw.letterMastery ?? {},
  };
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
    // migrare din v1
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrate(JSON.parse(legacy));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* ignore */ }
  return emptyProgress();
}

/**
 * Progresul utilizatorului: XP, stele, streak, nivel, mastery.
 * Persistat în localStorage — sync cu Supabase când e configurat (Faza 5).
 */
export function useProgress() {
  const [progress, setProgress] = useState(loadStored);

  const persist = useCallback((next) => {
    setProgress(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage plin — rămâne în sesiune */ }
  }, []);

  const update = useCallback((fn) => {
    setProgress((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const starsFor = useCallback(
    (lessonId) => progress.lessons[lessonId]?.stars ?? 0,
    [progress]
  );

  const isUnlocked = useCallback(
    (lessonId) => {
      const idx = LESSONS.findIndex((l) => l.id === lessonId);
      if (idx <= 0) return true;
      return (progress.lessons[LESSONS[idx - 1].id]?.stars ?? 0) > 0;
    },
    [progress]
  );

  /** Marchează practica de azi — actualizează streak-ul */
  const recordPractice = useCallback(() => {
    update((prev) => {
      const today = todayKey();
      if (prev.lastPracticeDate === today) return prev;

      let streak = 1;
      if (prev.lastPracticeDate) {
        const gap = daysBetween(prev.lastPracticeDate, today);
        streak = gap === 1 ? (prev.streak || 0) + 1 : 1;
      }
      return { ...prev, streak, lastPracticeDate: today };
    });
  }, [update]);

  const completeLesson = useCallback((lessonId, stars, xpGained) => {
    update((prev) => {
      const prevStars = prev.lessons[lessonId]?.stars ?? 0;
      const today = todayKey();
      let streak = prev.streak || 0;
      let lastPracticeDate = prev.lastPracticeDate;

      if (lastPracticeDate !== today) {
        if (lastPracticeDate && daysBetween(lastPracticeDate, today) === 1) {
          streak += 1;
        } else {
          streak = 1;
        }
        lastPracticeDate = today;
      }

      return {
        ...prev,
        xp: prev.xp + xpGained,
        streak,
        lastPracticeDate,
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            stars: Math.max(prevStars, stars),
            completedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [update]);

  const recordLetter = useCallback((letter, correct) => {
    update((prev) => {
      const cur = prev.letterMastery[letter] ?? { correct: 0, attempts: 0, lastAt: null };
      return {
        ...prev,
        letterMastery: {
          ...prev.letterMastery,
          [letter]: {
            correct: cur.correct + (correct ? 1 : 0),
            attempts: cur.attempts + 1,
            lastAt: new Date().toISOString(),
          },
        },
      };
    });
  }, [update]);

  const finishOnboarding = useCallback(() => {
    update((prev) => ({ ...prev, onboardingDone: true }));
  }, [update]);

  const setSoundEnabled = useCallback((enabled) => {
    update((prev) => ({ ...prev, soundEnabled: !!enabled }));
  }, [update]);

  /** Litere de recapitulat: învățate dar cu rate scăzută sau vechi */
  const reviewLetters = useMemo(() => {
    const mastered = Object.entries(progress.letterMastery)
      .filter(([, m]) => m.attempts >= 2)
      .map(([letter, m]) => {
        const rate = m.correct / m.attempts;
        const daysAgo = m.lastAt
          ? (Date.now() - Date.parse(m.lastAt)) / 86_400_000
          : 99;
        const priority = (1 - rate) * 2 + Math.min(daysAgo / 3, 3);
        return { letter, rate, daysAgo, priority };
      })
      .sort((a, b) => b.priority - a.priority);
    return mastered.slice(0, 8).map((x) => x.letter);
  }, [progress.letterMastery]);

  const level = levelFromXp(progress.xp);
  const xpIntoLevel = progress.xp - xpForLevel(level);
  const xpNeeded = xpForLevel(level + 1) - xpForLevel(level);

  return {
    xp: progress.xp,
    streak: progress.streak,
    lastPracticeDate: progress.lastPracticeDate,
    onboardingDone: progress.onboardingDone,
    soundEnabled: progress.soundEnabled ?? true,
    level,
    xpIntoLevel,
    xpNeeded,
    letterMastery: progress.letterMastery,
    reviewLetters,
    starsFor,
    isUnlocked,
    completeLesson,
    recordPractice,
    recordLetter,
    finishOnboarding,
    setSoundEnabled,
    persist,
  };
}
