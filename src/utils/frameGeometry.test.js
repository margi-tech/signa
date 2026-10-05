import { describe, it, expect } from 'vitest';
import { aspectCorrectionFactor, applyAspectCorrection, REFERENCE_ASPECT } from './frameGeometry';
import { normalize } from './normalize';

/** O „mână" pătrată în pixeli, exprimată în coordonate normalizate de MediaPipe. */
function squareHandIn(width, height) {
  // 21 de puncte; ne interesează doar geometria, nu anatomia.
  const px = (x, y) => ({ x: x / width, y: y / height, z: 0 });
  const pts = [px(300, 300)]; // încheietura = originea
  for (let i = 1; i < 21; i++) {
    // puncte pe o grilă pătrată de 200×200 px față de încheietură
    const dx = (i % 5) * 50;
    const dy = Math.floor(i / 5) * 50;
    pts.push(px(300 + dx, 300 + dy));
  }
  return pts;
}

describe('aspectCorrectionFactor', () => {
  it('nu atinge landscape-ul — 16:9 rămâne neschimbat', () => {
    expect(aspectCorrectionFactor(1280, 720)).toBe(1);
  });

  it('nu atinge nici webcam-urile 4:3, unde s-a colectat o parte din dataset', () => {
    expect(aspectCorrectionFactor(640, 480)).toBe(1);
  });

  it('corectează portretul de telefon către raportul de referință', () => {
    const f = aspectCorrectionFactor(720, 1280);
    expect(f).toBeCloseTo((720 / 1280) / REFERENCE_ASPECT, 6);
    expect(f).toBeLessThan(1);
  });

  it('tratează dimensiunile lipsă ca lipsă de corecție', () => {
    expect(aspectCorrectionFactor(0, 0)).toBe(1);
    expect(aspectCorrectionFactor(undefined, undefined)).toBe(1);
  });
});

describe('applyAspectCorrection', () => {
  it('întoarce exact obiectul primit când nu e nimic de corectat', () => {
    const subject = { hands: [squareHandIn(1280, 720)] };
    expect(applyAspectCorrection(subject, 1)).toBe(subject);
  });

  it('lasă blendshape-urile și matricea capului neatinse', () => {
    const faceBlendshapes = new Array(52).fill(0.5);
    const headMatrix = new Array(16).fill(1);
    const out = applyAspectCorrection(
      { hands: [squareHandIn(720, 1280)], faceBlendshapes, headMatrix },
      0.3,
    );
    expect(out.faceBlendshapes).toBe(faceBlendshapes);
    expect(out.headMatrix).toBe(headMatrix);
  });
});

describe('vectorul final', () => {
  it('portretul corectat produce același vector ca landscape-ul', () => {
    const landscape = { hands: [squareHandIn(1280, 720)] };
    const portrait = { hands: [squareHandIn(720, 1280)] };

    const vLandscape = normalize(landscape);
    const vPortraitRaw = normalize(portrait);
    const vPortraitFixed = normalize(
      applyAspectCorrection(portrait, aspectCorrectionFactor(720, 1280)),
    );

    // fără corecție, aceeași mână fizică dă alt vector — de-aia scade acuratețea
    expect(vPortraitRaw).not.toEqual(vLandscape);

    // cu corecție, cele două cadre ajung la același vector
    vPortraitFixed.forEach((value, i) => {
      expect(value).toBeCloseTo(vLandscape[i], 6);
    });
  });
});
