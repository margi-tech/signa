import { describe, it, expect } from 'vitest';
import { ALL_WORDS } from './words.js';
import { LSR_LETTERS } from './lsr-alphabet.js';

describe('vocabularul pentru „Scrie cuvântul"', () => {
  it('fiecare cuvânt are un id unic — `wordById` îl întoarce mereu pe primul', () => {
    const ids = ALL_WORDS.map((w) => w.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('id-urile sunt kebab-case, fără spații sau diacritice', () => {
    expect(ALL_WORDS.map((w) => w.id).filter((id) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toEqual([]);
  });

  it('fiecare literă există în alfabetul LSR', () => {
    const alphabet = new Set(LSR_LETTERS);
    const unknown = ALL_WORDS.flatMap((w) => w.letters.filter((l) => !alphabet.has(l)).map((l) => `${w.id}:${l}`));
    expect(unknown).toEqual([]);
  });
});
