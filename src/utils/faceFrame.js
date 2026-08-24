/**
 * Cadran de față — distanță și poziție fixe față de cameră.
 *
 * Coordonatele sunt în spațiul video MediaPipe (0–1), nu în CSS. Astfel
 * aceeași așezare produce același cadru pe orice ecran, indiferent de
 * object-cover. Ovalul stă în treimea de sus, ca mâinile să aibă loc jos.
 */

export const FACE_FRAME = {
  cx: 0.5,
  cy: 0.30,
  rx: 0.12,
  ry: 0.16,
};

/** Indici Face Mesh: frunte, bărbie, obraz stâng, obraz drept. */
export const FACE_BOX_IDX = { top: 10, chin: 152, left: 234, right: 454 };

/** Praguri stricte la intrare; mai laxe cât timp ești deja în cadran (anti-flicker). */
export const SIZE_IN = { min: 0.78, max: 1.22 };
export const SIZE_OUT = { min: 0.68, max: 1.32 };
export const DIST_IN = 0.55;
export const DIST_OUT = 0.75;

export function faceBoxFromLandmarks(landmarks) {
  if (!landmarks?.length) return null;
  const top = landmarks[FACE_BOX_IDX.top];
  const chin = landmarks[FACE_BOX_IDX.chin];
  const left = landmarks[FACE_BOX_IDX.left];
  const right = landmarks[FACE_BOX_IDX.right];
  if (!top || !chin || !left || !right) return null;

  const cx = (left.x + right.x) / 2;
  const cy = (top.y + chin.y) / 2;
  const w = Math.abs(right.x - left.x);
  const h = Math.abs(chin.y - top.y);
  if (w < 0.02 || h < 0.02) return null;

  return { cx, cy, w, h };
}

/**
 * @param {Array<{x:number,y:number}>|null|undefined} landmarks
 * @param {{ wasOk?: boolean }} [opts]
 * @returns {{
 *   ok: boolean,
 *   status: 'no-face' | 'too-far' | 'too-close' | 'off-center' | 'ok',
 *   hint: string,
 *   box: {cx:number,cy:number,w:number,h:number}|null,
 *   sizeRatio: number|null,
 * }}
 */
export function assessFaceFrame(landmarks, { wasOk = false } = {}) {
  const missing = {
    ok: false,
    status: 'no-face',
    hint: 'Așază-te cu fața în cadran',
    box: null,
    sizeRatio: null,
  };

  const box = faceBoxFromLandmarks(landmarks);
  if (!box) return missing;

  const sizeRatio = (
    box.h / (FACE_FRAME.ry * 2)
    + box.w / (FACE_FRAME.rx * 2)
  ) / 2;

  const size = wasOk ? SIZE_OUT : SIZE_IN;
  if (sizeRatio < size.min) {
    return { ok: false, status: 'too-far', hint: 'Apropie-te de cameră', box, sizeRatio };
  }
  if (sizeRatio > size.max) {
    return { ok: false, status: 'too-close', hint: 'Depărtează-te de cameră', box, sizeRatio };
  }

  const dx = (box.cx - FACE_FRAME.cx) / FACE_FRAME.rx;
  const dy = (box.cy - FACE_FRAME.cy) / FACE_FRAME.ry;
  const dist = Math.hypot(dx, dy);
  const maxDist = wasOk ? DIST_OUT : DIST_IN;
  if (dist > maxDist) {
    return { ok: false, status: 'off-center', hint: 'Centrează fața în cadran', box, sizeRatio };
  }

  return { ok: true, status: 'ok', hint: 'Față în cadran', box, sizeRatio };
}
