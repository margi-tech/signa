import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mergeProgress, pushProgress } from '../hooks/useProgressSync.js';

const PENDING_KEY = 'signa-progress-pending-v1';

const mocks = vi.hoisted(() => ({ userId: 'user-b', rpc: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: mocks.userId } } }),
      getSession: async () => ({ data: { session: { user: { id: mocks.userId } } } }),
    },
    from: () => ({ upsert: async () => ({ error: null }) }),
    rpc: mocks.rpc,
  },
}));

const memory = new Map();

beforeEach(() => {
  memory.clear();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  };
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({ error: null });
});

const lesson = (userId, lessonId, xp = 60) => ({
  key: `2026-09-11:${lessonId}`, userId, lessonId, stars: 3, xp,
});
const setPending = (events) => localStorage.setItem(PENDING_KEY, JSON.stringify(events));
const getPending = () => JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');

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

describe('coada de lecții netrimise', () => {
  it('păstrează lecțiile altui cont de pe același dispozitiv', async () => {
    setPending([lesson('user-a', '1.1'), lesson('user-b', '1.2')]);
    await pushProgress({ letterMastery: {} });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][1].p_lesson_id).toBe('1.2');
    expect(getPending()).toEqual([lesson('user-a', '1.1')]);
  });

  it('păstrează lecția când serverul o respinge', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    setPending([lesson('user-b', '1.1')]);
    await pushProgress({ letterMastery: {} });
    expect(getPending()).toEqual([lesson('user-b', '1.1')]);
  });

  it('nu pierde o lecție pusă în coadă cât timp trimiterea e în curs', async () => {
    setPending([lesson('user-b', '1.1')]);
    mocks.rpc.mockImplementationOnce(async () => {
      setPending([...getPending(), lesson('user-b', '1.2')]);
      return { error: null };
    });
    await pushProgress({ letterMastery: {} });
    expect(getPending()).toEqual([lesson('user-b', '1.2')]);
  });

  it('nu scoate un scor mai bun salvat în timpul trimiterii', async () => {
    setPending([lesson('user-b', '1.1', 30)]);
    mocks.rpc.mockImplementationOnce(async () => {
      setPending([lesson('user-b', '1.1', 60)]);
      return { error: null };
    });
    await pushProgress({ letterMastery: {} });
    expect(getPending()).toEqual([lesson('user-b', '1.1', 60)]);
  });
});
