import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS, levelFromXp, xpForLevel } from '../data/lessons';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  consumeGuestConversion, exitGuest, isGuestSession, touchGuestConversion,
} from '../lib/guest';
import {
  GUEST_PROGRESS_KEY,
  clearGuestSlate,
  loadSlate,
  pendingLessonCount,
  progressKey,
  pullAndMergeProgress,
  pushProgress,
  pushProgressBestEffort,
  queueGuestProgress,
  queueLessonCompletion,
} from './useProgressSync';

const LEGACY_KEY  = 'signa-progress-v1';

const ProgressContext = createContext(null);

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
    favorites: [], // id-uri de lecții marcate ca favorite
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
    favorites: raw.favorites ?? [],
  };
}

function loadStored() {
  try {
    const key = progressKey();
    const raw = localStorage.getItem(key);
    if (raw) return migrate(JSON.parse(raw));
    // Migrarea din v1 e a contului — un invitat pornește de la zero.
    if (key === GUEST_PROGRESS_KEY) return emptyProgress();
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrate(JSON.parse(legacy));
      localStorage.setItem(key, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* ignore */ }
  return emptyProgress();
}

function useProgressState() {
  const [progress, setProgress] = useState(loadStored);
  // Lecții terminate care n-au ajuns încă pe server — afișate în sidebar,
  // ca o sincronizare care pică să nu mai treacă neobservată.
  const [unsyncedLessons, setUnsyncedLessons] = useState(0);
  const userIdRef = useRef(null);
  const refreshUnsynced = useCallback(() => {
    setUnsyncedLessons(pendingLessonCount(userIdRef.current));
  }, []);

  // Cât timp învață ca invitat, dreptul de a-și muta progresul pe un cont
  // rămâne proaspăt; fereastra de expirare măsoară inactivitate, nu vechime.
  const writeSlate = (next) => {
    try {
      localStorage.setItem(progressKey(), JSON.stringify(next));
      if (isGuestSession()) touchGuestConversion();
    } catch { /* storage plin — rămâne în sesiune */ }
  };

  const persist = useCallback((next) => {
    setProgress(next);
    writeSlate(next);
  }, []);

  const update = useCallback((fn) => {
    setProgress((prev) => {
      const next = fn(prev);
      writeSlate(next);
      return next;
    });
  }, []);

  /** Re-citește slate-ul activ — la intrarea/ieșirea din modul invitat. */
  const reloadFromStorage = useCallback(() => {
    setProgress(loadStored());
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

  const isFavorite = useCallback(
      (lessonId) => (progress.favorites ?? []).includes(lessonId),
      [progress]
  );

  const toggleFavorite = useCallback((lessonId) => {
    update((prev) => {
      const current = prev.favorites ?? [];
      const next = current.includes(lessonId)
          ? current.filter((id) => id !== lessonId)
          : [...current, lessonId];
      return { ...prev, favorites: next };
    });
  }, [update]);

  // Invitatul n-are serie de zile: n-ar avea ce transfera pe cont (serverul o
  // calculează din `last_practice_date`, iar completările replayate cad toate
  // pe ziua curentă), deci mai bine nu i-o promitem deloc.
  const recordPractice = useCallback(() => {
    if (isGuestSession()) return;
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
      const alreadyRewardedToday = prev.lessons[lessonId]?.lastAwardDate === today;
      let streak = prev.streak || 0;
      let lastPracticeDate = prev.lastPracticeDate;

      if (!isGuestSession() && lastPracticeDate !== today) {
        if (lastPracticeDate && daysBetween(lastPracticeDate, today) === 1) {
          streak += 1;
        } else {
          streak = 1;
        }
        lastPracticeDate = today;
      }

      return {
        ...prev,
        xp: prev.xp + (alreadyRewardedToday ? 0 : xpGained),
        streak,
        lastPracticeDate,
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            stars: Math.max(prevStars, stars),
            completedAt: new Date().toISOString(),
            lastAwardDate: today,
            // Cea mai bună recompensă obținută la lecția asta. Doar slate-ul
            // de invitat o folosește, la conversie: altfel XP-ul ar trebui
            // ghicit din stele, ceea ce subestimează și ratează repetițiile.
            xp: Math.max(prev.lessons[lessonId]?.xp ?? 0, xpGained),
          },
        },
      };
    });
    queueMicrotask(() => {
      queueLessonCompletion(lessonId, stars, xpGained)
        .then(() => {
          const raw = localStorage.getItem(progressKey());
          if (raw) return pushProgressBestEffort(JSON.parse(raw));
          return undefined;
        })
        .catch(() => {})
        .finally(refreshUnsynced);
    });
  }, [update, refreshUnsynced]);

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

  const syncNow = useCallback(async () => {
    try {
      await pushProgress();
      const merged = await pullAndMergeProgress();
      if (merged) persist(merged);
      return merged;
    } finally {
      refreshUnsynced();
    }
  }, [persist, refreshUnsynced]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      userIdRef.current = session?.user?.id ?? null;
      refreshUnsynced();
      // `session?.user` e obligatoriu: `INITIAL_SESSION` se emite la fiecare
      // încărcare de pagină, inclusiv fără sesiune. Fără garda asta, un
      // refresh în modul invitat stingea flag-ul și ștergea slate-ul.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Slate-ul de invitat se citește ÎNAINTE de a stinge flag-ul, iar
        // flag-ul se stinge sincron, aici: de la linia asta încolo tot ce
        // scrie progres merge în slate-ul contului, indiferent în ce ordine
        // au fost înregistrați ceilalți ascultători de auth.
        const converting = consumeGuestConversion();
        const guestSlate = converting ? loadSlate(GUEST_PROGRESS_KEY) : null;
        const wasGuest = isGuestSession();
        exitGuest();
        if (wasGuest) reloadFromStorage();

        Promise.resolve(guestSlate ? queueGuestProgress(guestSlate) : 0)
          .then(() => { if (guestSlate) clearGuestSlate(); })
          .then(() => pushProgress())
          .then(() => pullAndMergeProgress())
          .then((merged) => {
            if (merged) persist(merged);
          })
          .catch(() => {})
          .finally(refreshUnsynced);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [persist, refreshUnsynced, reloadFromStorage]);

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

  // Lecții cu cel puțin o stea — pentru „nr. de lecții realizate” din profil.
  const completedLessonsCount = useMemo(
      () => Object.values(progress.lessons).filter((l) => (l?.stars ?? 0) > 0).length,
      [progress.lessons]
  );
  const totalLessonsCount = LESSONS.length;

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
    completedLessonsCount,
    totalLessonsCount,
    reviewLetters,
    starsFor,
    isUnlocked,
    favorites: progress.favorites ?? [],
    isFavorite,
    toggleFavorite,
    completeLesson,
    recordPractice,
    recordLetter,
    finishOnboarding,
    setSoundEnabled,
    persist,
    reloadFromStorage,
    syncNow,
    unsyncedLessons,
  };
}

/** O singură sursă de progres pentru toată aplicația. */
export function ProgressProvider({ children }) {
  const value = useProgressState();
  return createElement(ProgressContext.Provider, { value }, children);
}

/**
 * Progresul utilizatorului: XP, stele, streak, nivel, mastery.
 * Persistat în localStorage — sync cu Supabase când e configurat (Faza 5).
 */
export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress trebuie folosit în <ProgressProvider>.');
  }
  return ctx;
}
