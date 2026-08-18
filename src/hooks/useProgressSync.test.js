import { describe, it, expect } from 'vitest';
import { mergeProgress } from '../hooks/useProgressSync.js';

describe('mergeProgress', () => {
  it('takes max xp and stars', () => {
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
    expect(m.xp).toBe(100);
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
});
