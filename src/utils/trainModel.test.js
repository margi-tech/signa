import { describe, it, expect } from 'vitest';
import {
  stratifiedSplit,
  expandWithAug,
  classWeights,
  augmentStatic,
} from './trainModel.js';

describe('stratifiedSplit', () => {
  it('keeps all classes in train when possible', () => {
    const y = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2];
    const { trainIdx, testIdx } = stratifiedSplit(y, 0.25);
    expect(trainIdx.length + testIdx.length).toBe(y.length);
    const trainClasses = new Set(trainIdx.map((i) => y[i]));
    expect(trainClasses.has(0)).toBe(true);
    expect(trainClasses.has(1)).toBe(true);
    expect(trainClasses.has(2)).toBe(true);
  });
});

describe('expandWithAug', () => {
  it('multiplies samples by aug factor', () => {
    const X = [[1, 2], [3, 4]];
    const y = [0, 1];
    const out = expandWithAug(X, y, 3, 'static');
    expect(out.X).toHaveLength(6);
    expect(out.y).toHaveLength(6);
  });

  it('aug=1 leaves data unchanged length', () => {
    const X = [[1, 2]];
    const y = [0];
    expect(expandWithAug(X, y, 1, 'static').X).toHaveLength(1);
  });
});

describe('classWeights', () => {
  it('upweights rare classes', () => {
    const y = [0, 0, 0, 1];
    const w = classWeights(y, 2);
    expect(w[1]).toBeGreaterThan(w[0]);
  });
});

describe('augmentStatic', () => {
  it('returns same length with finite numbers', () => {
    const v = Array(10).fill(0.5);
    const a = augmentStatic(v, 0.01);
    expect(a).toHaveLength(10);
    expect(a.every(Number.isFinite)).toBe(true);
  });
});
