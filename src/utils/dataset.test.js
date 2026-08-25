import { describe, it, expect } from 'vitest';
import { VECTOR_SIZE } from './normalize.js';
import { SEQ_FRAMES, minFor, DYNAMIC_LETTERS } from '../data/lsr-alphabet.js';
import { levelFromXp, xpForLevel } from '../data/lessons.js';
import { isDatasetSequence as isSeq, isDatasetVector as isVec } from './datasetValidation.js';

describe('dataset validators', () => {
  it('accepts static vector', () => {
    expect(isVec(Array(VECTOR_SIZE).fill(0))).toBe(true);
    expect(isVec(Array(63).fill(0))).toBe(false);
    expect(isVec([NaN, ...Array(VECTOR_SIZE - 1).fill(0)])).toBe(false);
  });

  it('accepts sequence', () => {
    const seq = Array.from({ length: SEQ_FRAMES }, () => Array(VECTOR_SIZE).fill(0.1));
    expect(isSeq(seq)).toBe(true);
    expect(isSeq(seq.slice(0, 10))).toBe(false);
  });

  it('minFor depends on boolean not letter string', () => {
    expect(minFor(false)).toBe(50);
    expect(minFor(true)).toBe(30);
    // bug vechi: minFor('A') era truthy → 30
    expect(minFor(DYNAMIC_LETTERS.has('A'))).toBe(50);
    expect(minFor(DYNAMIC_LETTERS.has('J'))).toBe(30);
  });
});

describe('levels', () => {
  it('level 1 at 0 XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it('increases with XP', () => {
    expect(levelFromXp(xpForLevel(3))).toBe(3);
    expect(levelFromXp(xpForLevel(3) - 1)).toBe(2);
  });
});
