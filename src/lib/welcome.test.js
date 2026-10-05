import { beforeEach, describe, it, expect } from 'vitest';
import { WELCOME_WINDOW_MS, markWelcomeShown, shouldShowWelcome } from './welcome.js';

const memory = new Map();

beforeEach(() => {
  memory.clear();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  };
});

const NOW = Date.parse('2026-10-05T12:00:00Z');
const user = (id, ageMs) => ({ id, created_at: new Date(NOW - ageMs).toISOString() });

describe('animația de bun venit', () => {
  it('apare pentru un cont abia creat', () => {
    expect(shouldShowWelcome(user('a', 30_000), NOW)).toBe(true);
  });

  it('nu apare pentru conturi vechi sau fără user', () => {
    expect(shouldShowWelcome(user('a', WELCOME_WINDOW_MS + 1), NOW)).toBe(false);
    expect(shouldShowWelcome(null, NOW)).toBe(false);
  });

  it('apare o singură dată per cont', () => {
    markWelcomeShown('a');
    expect(shouldShowWelcome(user('a', 30_000), NOW)).toBe(false);
    expect(shouldShowWelcome(user('b', 30_000), NOW)).toBe(true);
  });
});
