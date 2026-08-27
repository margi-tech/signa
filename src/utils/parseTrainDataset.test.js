import { describe, expect, it } from 'vitest';
import { VECTOR_SIZE } from './normalize.js';
import { SEQ_FRAMES } from '../data/lsr-alphabet.js';
import { parseBatchesToTrainSets, parseRawDataset } from './parseTrainDataset.js';

const vec = (fill = 0.1) => Array(VECTOR_SIZE).fill(fill);
const seq = () => Array.from({ length: SEQ_FRAMES }, () => vec(0.2));

describe('parseRawDataset', () => {
  it('builds static and dynamic sets from an export', () => {
    const { staticData, dynData } = parseRawDataset({
      _meta: { created: 'x' },
      A: [vec(), vec()],
      B: [vec(0.4)],
      J: [seq(), seq()],
      Z: [seq()],
    });
    expect(staticData.labels).toEqual(['A', 'B']);
    expect(staticData.X).toHaveLength(3);
    expect(dynData.labels).toEqual(['J', 'Z']);
    expect(dynData.X).toHaveLength(3);
    expect(staticData.groups).toBeUndefined();
  });

  it('returns null when a kind has fewer than 2 labels', () => {
    const { staticData } = parseRawDataset({ A: [vec(), vec()] });
    expect(staticData).toBeNull();
  });
});

describe('parseBatchesToTrainSets', () => {
  it('keeps session_id as groups', () => {
    const { staticData } = parseBatchesToTrainSets([
      { label: 'A', kind: 'static', session_id: 's1', samples: [vec(), vec()] },
      { label: 'B', kind: 'static', session_id: 's2', samples: [vec(0.3)] },
    ]);
    expect(staticData.labels).toEqual(['A', 'B']);
    expect(staticData.groups).toEqual(['s1', 's1', 's2']);
    expect(staticData.X).toHaveLength(3);
  });
});
