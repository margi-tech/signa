import { beforeEach, describe, it, expect } from 'vitest';
import {
  DEFAULT_PREFS, PREFS_KEY, loadPrefs, resolveTheme, sanitizePrefs,
} from './preferences.js';

const memory = new Map();

beforeEach(() => {
  memory.clear();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  };
});

describe('preferințe de aspect', () => {
  it('pornește pe „Automat” și text normal', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('respinge valori necunoscute în loc să strice tema', () => {
    expect(sanitizePrefs({ theme: 'neon', textScale: 7 })).toEqual(DEFAULT_PREFS);
    memory.set(PREFS_KEY, '{nu e json');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });

  it('citește ce s-a salvat', () => {
    memory.set(PREFS_KEY, JSON.stringify({ theme: 'dark', textScale: 1.3 }));
    expect(loadPrefs()).toEqual({ theme: 'dark', textScale: 1.3 });
  });

  it('„Automat” urmează sistemul, celelalte sunt fixe', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('cheia nu se suprapune cu progresul', () => {
    expect(PREFS_KEY).not.toMatch(/progress/);
  });
});
