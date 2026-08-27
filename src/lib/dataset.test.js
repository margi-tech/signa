import { beforeEach, describe, expect, it } from 'vitest';
import { VECTOR_SIZE } from '../utils/normalize.js';
import { SEQ_FRAMES } from '../data/lsr-alphabet.js';
import {
  STATIC_CHUNK,
  chunkSamples,
  compactSample,
  countPendingSamples,
  enqueueSample,
  localDatasetToBatches,
} from './dataset.js';

const vec = (fill = 0.1) => Array(VECTOR_SIZE).fill(fill);
const seq = () => Array.from({ length: SEQ_FRAMES }, () => vec(0.2));

const memory = new Map();

beforeEach(() => {
  memory.clear();
  globalThis.localStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => { memory.set(key, String(value)); },
    removeItem: (key) => { memory.delete(key); },
  };
});

describe('chunkSamples', () => {
  it('splits static samples at 50', () => {
    const samples = Array.from({ length: STATIC_CHUNK + 3 }, () => vec());
    const batches = chunkSamples('A', 'static', samples, 'session-1');
    expect(batches).toHaveLength(2);
    expect(batches[0].samples).toHaveLength(50);
    expect(batches[1].samples).toHaveLength(3);
    expect(batches[0].label).toBe('A');
    expect(batches[0].sessionId).toBe('session-1');
  });

  it('rejects invalid vectors', () => {
    const batches = chunkSamples('A', 'static', [[1, 2, 3], vec()], 's');
    expect(batches).toHaveLength(1);
    expect(batches[0].samples).toHaveLength(1);
  });
});

describe('enqueueSample', () => {
  it('merges into the same batch until the chunk fills', () => {
    const user = 'user-1';
    enqueueSample(user, { label: 'B', kind: 'static', sample: vec(), sessionId: 's1' });
    enqueueSample(user, { label: 'B', kind: 'static', sample: vec(0.3), sessionId: 's1' });
    const batches = JSON.parse(localStorage.getItem('signa-dataset-pending-v1'))[user];
    expect(batches).toHaveLength(1);
    expect(batches[0].samples).toHaveLength(2);
    expect(countPendingSamples(batches)).toBe(2);
  });

  it('opens a new batch when the label or session changes', () => {
    const user = 'user-1';
    enqueueSample(user, { label: 'B', kind: 'static', sample: vec(), sessionId: 's1' });
    enqueueSample(user, { label: 'C', kind: 'static', sample: vec(), sessionId: 's1' });
    enqueueSample(user, { label: 'C', kind: 'static', sample: vec(), sessionId: 's2' });
    const batches = JSON.parse(localStorage.getItem('signa-dataset-pending-v1'))[user];
    expect(batches).toHaveLength(3);
  });
});

describe('compactSample', () => {
  it('rounds static values to 4 decimals', () => {
    const out = compactSample([0.123456789], 'static');
    expect(out[0]).toBe(0.1235);
  });
});

describe('localDatasetToBatches', () => {
  it('splits static and sequence samples per label', () => {
    const batches = localDatasetToBatches({
      A: [vec(), vec()],
      J: [seq()],
      _meta: { created: 'x' },
    });
    expect(batches.some((b) => b.label === 'A' && b.kind === 'static' && b.samples.length === 2)).toBe(true);
    expect(batches.some((b) => b.label === 'J' && b.kind === 'sequence' && b.samples.length === 1)).toBe(true);
  });
});
