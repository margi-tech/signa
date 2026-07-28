import { describe, it, expect } from 'vitest';
import { normalize, VECTOR_SIZE, HAND_DIM, FACE_DIM, HEAD_DIM, POSE_DIM } from './normalize.js';

function fakeHand(seed = 0) {
  return Array.from({ length: 21 }, (_, i) => ({
    x: seed + i * 0.01,
    y: seed + i * 0.02,
    z: seed * 0.001,
  }));
}

function fakePose(vis = 1) {
  return Array.from({ length: 33 }, (_, i) => ({
    x: i * 0.01,
    y: i * 0.02,
    z: 0,
    visibility: vis,
  }));
}

describe('normalize() contract', () => {
  it('VECTOR_SIZE is 199', () => {
    expect(VECTOR_SIZE).toBe(199);
    expect(HAND_DIM * 2 + FACE_DIM + HEAD_DIM + POSE_DIM).toBe(199);
  });

  it('returns null without hands', () => {
    expect(normalize({ hands: [] })).toBeNull();
    expect(normalize(null)).toBeNull();
  });

  it('returns VECTOR_SIZE floats with one hand', () => {
    const v = normalize({
      hands: [fakeHand()],
      handedness: ['Left'],
      faceBlendshapes: null,
      headMatrix: null,
      pose: null,
    });
    expect(v).toHaveLength(VECTOR_SIZE);
    expect(v.every((n) => typeof n === 'number' && Number.isFinite(n))).toBe(true);
  });

  it('zeros pose when shoulders not visible', () => {
    const pose = fakePose(0.1); // under 0.5
    const v = normalize({
      hands: [fakeHand(1)],
      handedness: ['Right'],
      pose,
    });
    const poseSlice = v.slice(VECTOR_SIZE - POSE_DIM);
    expect(poseSlice.every((n) => n === 0)).toBe(true);
  });

  it('snapshot: same input → same vector (regression)', () => {
    const subject = {
      hands: [fakeHand(0.3)],
      handedness: ['Left'],
      faceBlendshapes: Array(52).fill(0.1),
      headMatrix: Array(16).fill(0).map((_, i) => (i % 5 === 0 ? 1 : 0)),
      pose: fakePose(0.9),
    };
    const a = normalize(subject);
    const b = normalize(subject);
    expect(a).toEqual(b);
    // snapshot numeric — schimbarea invalidatează modelele
    expect(a.slice(0, 6).map((n) => +n.toFixed(5))).toEqual([
      0, 0, 0, // wrist after translate/scale — first point is origin
      expect.any(Number),
      expect.any(Number),
      expect.any(Number),
    ]);
    expect(a[0]).toBe(0);
    expect(a[1]).toBe(0);
    expect(a[2]).toBe(0);
  });
});
