import { describe, it, expect } from 'vitest';
import { mergeProgress } from '../hooks/useProgressSync.js';

describe('mergeProgress', () => {
  it('folosește serverul ca sursă pentru XP, streak și lecții', () => {
    const local = {
      xp: 100,
      streak: 2,
      lastPracticeDate: '2026-07-20',
      lessons: { 1: { stars: 2, completedAt: '2026-07-20' } },
      letterMastery: { A: { correct: 1, attempts: 2 } },
      favorites: ['1'],
      soundEnabled: false,
    };
    const remote = {
      xp: 80,
      streak: 5,
      last_practice_date: '2026-07-27',
      lessons: { 1: { stars: 3, completedAt: '2026-07-27' }, 2: { stars: 1, completedAt: '2026-07-27' } },
      letter_mastery: { B: { correct: 2, attempts: 2 } },
    };
    const m = mergeProgress(local, remote);
    expect(m.xp).toBe(80);
    expect(m.streak).toBe(5);
    expect(m.lessons[1].stars).toBe(3);
    expect(m.lessons[2].stars).toBe(1);
    expect(m.lastPracticeDate).toBe('2026-07-27');
    expect(m.letterMastery.A).toBeTruthy();
    expect(m.letterMastery.B).toBeTruthy();
    expect(m.favorites).toEqual(['1']);
    expect(m.soundEnabled).toBe(false);
  });

  it('păstrează câmpurile locale când remote e gol ca obiect de progress', () => {
    const remote = {
      xp: 10,
      streak: 1,
      last_practice_date: '2026-08-18',
      lessons: {},
      letter_mastery: {},
    };
    const m = mergeProgress(null, remote);
    expect(m.favorites).toEqual([]);
    expect(m.onboardingDone).toBe(true);
  });

  it('două browsere: progresul serverului înlocuiește scorul local', () => {
    const browserA = {
      xp: 540,
      streak: 0,
      lastPracticeDate: '2026-08-18',
      lessons: { 1: { stars: 3, completedAt: '2026-08-18' } },
      letterMastery: { A: { correct: 5, attempts: 5 } },
    };
    const browserBRemote = {
      xp: 580,
      streak: 1,
      last_practice_date: '2026-08-19',
      lessons: { 1: { stars: 2, completedAt: '2026-08-19' }, 3: { stars: 1, completedAt: '2026-08-19' } },
      letter_mastery: { B: { correct: 1, attempts: 1 } },
    };
    const m = mergeProgress(browserA, browserBRemote);
    expect(m.xp).toBe(580);
    expect(m.streak).toBe(1);
    expect(m.lessons[1].stars).toBe(2);
    expect(m.lessons[3].stars).toBe(1);
    expect(m.letterMastery.A).toBeTruthy();
    expect(m.letterMastery.B).toBeTruthy();
  });
});
