import { describe, it, expect } from 'vitest';
import {
  FACE_FRAME,
  assessFaceFrame,
  faceBoxFromLandmarks,
  SIZE_IN,
  SIZE_OUT,
} from './faceFrame.js';

function fakeFace({ cx = FACE_FRAME.cx, cy = FACE_FRAME.cy, w = FACE_FRAME.rx * 2, h = FACE_FRAME.ry * 2 } = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: cy, z: 0 }));
  pts[10] = { x: cx, y: cy - h / 2, z: 0 };
  pts[152] = { x: cx, y: cy + h / 2, z: 0 };
  pts[234] = { x: cx - w / 2, y: cy, z: 0 };
  pts[454] = { x: cx + w / 2, y: cy, z: 0 };
  return pts;
}

describe('faceBoxFromLandmarks', () => {
  it('întoarce null fără landmarks', () => {
    expect(faceBoxFromLandmarks(null)).toBeNull();
    expect(faceBoxFromLandmarks([])).toBeNull();
  });

  it('calculează centrul și dimensiunea din cele 4 puncte', () => {
    const box = faceBoxFromLandmarks(fakeFace({ cx: 0.5, cy: 0.3, w: 0.24, h: 0.32 }));
    expect(box.cx).toBeCloseTo(0.5);
    expect(box.cy).toBeCloseTo(0.3);
    expect(box.w).toBeCloseTo(0.24);
    expect(box.h).toBeCloseTo(0.32);
  });
});

describe('assessFaceFrame', () => {
  it('lipsa feței cere așezarea în cadran', () => {
    const r = assessFaceFrame(null);
    expect(r.ok).toBe(false);
    expect(r.status).toBe('no-face');
  });

  it('acceptă o față care umple cadranul', () => {
    const r = assessFaceFrame(fakeFace());
    expect(r.ok).toBe(true);
    expect(r.status).toBe('ok');
    expect(r.sizeRatio).toBeCloseTo(1);
  });

  it('prea departe → apropie-te', () => {
    const r = assessFaceFrame(fakeFace({ w: 0.10, h: 0.12 }));
    expect(r.ok).toBe(false);
    expect(r.status).toBe('too-far');
  });

  it('prea aproape → depărtează-te', () => {
    const r = assessFaceFrame(fakeFace({ w: 0.40, h: 0.50 }));
    expect(r.ok).toBe(false);
    expect(r.status).toBe('too-close');
  });

  it('decentrat → centrează', () => {
    const r = assessFaceFrame(fakeFace({ cx: 0.78, cy: 0.30 }));
    expect(r.ok).toBe(false);
    expect(r.status).toBe('off-center');
  });

  it('hysteresis: o față la limita inferioară rămâne ok dacă era deja în cadran', () => {
    const ratio = (SIZE_IN.min + SIZE_OUT.min) / 2; // între pragul de ieșire și cel de intrare
    expect(ratio).toBeGreaterThan(SIZE_OUT.min);
    expect(ratio).toBeLessThan(SIZE_IN.min);

    const face = fakeFace({
      w: FACE_FRAME.rx * 2 * ratio,
      h: FACE_FRAME.ry * 2 * ratio,
    });
    expect(assessFaceFrame(face, { wasOk: false }).ok).toBe(false);
    expect(assessFaceFrame(face, { wasOk: true }).ok).toBe(true);
  });
});
