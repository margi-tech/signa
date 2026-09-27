/**
 * Corecție de geometrie a cadrului, aplicată ÎNAINTE de `normalize()`.
 *
 * MediaPipe întoarce coordonate normalizate separat pe axe: `x` la lățimea
 * imaginii, `y` la înălțime (`z` are aproximativ scara lui `x`). `normalizeHand`
 * din `normalize.js` translatează la încheietură și împarte la un singur scalar,
 * deci raportul x/y NU se corectează — rămâne cel impus de raportul de aspect al
 * camerei.
 *
 * Consecința: aceeași mână filmată în portret (telefon, ~9:16) produce un vector
 * complet diferit de cel filmat în landscape (laptop, ~16:9). Datasetul a fost
 * colectat pe laptopuri, deci pe telefon modelul primește o formă pe care n-a
 * văzut-o niciodată.
 *
 * Funcția de aici remapează `x`/`z` ca și cum cadrul ar fi avut raportul de
 * referință, ca telefonul să intre în distribuția de antrenare.
 *
 * ⚠ Nu atinge `normalize.js` (contract v2, 199 valori) și nu schimbă nimic
 * pentru camerele landscape: pentru `aspect >= 1` întoarce exact obiectul
 * primit. Laptopurile — 16:9 sau 4:3 — rămân bit-identice.
 */

/** Raportul cerut în `getUserMedia` (1280×720) — referința datelor de antrenare. */
export const REFERENCE_ASPECT = 16 / 9;

/** Sub acest prag diferența e sub zgomotul de detecție; nu merită atinsă. */
const MIN_CORRECTION = 0.02;

const scalePoint = (p, f) => ({ ...p, x: p.x * f, z: typeof p.z === 'number' ? p.z * f : p.z });

/**
 * @param {number} width   lățimea reală a fluxului video (`video.videoWidth`)
 * @param {number} height  înălțimea reală (`video.videoHeight`)
 * @returns {number} factorul cu care se înmulțesc `x` și `z`; 1 = fără corecție
 */
export function aspectCorrectionFactor(width, height) {
  if (!width || !height) return 1;
  const aspect = width / height;
  // Doar portretul e corectat. Landscape (inclusiv 4:3) e distribuția în care
  // s-a colectat datasetul — acolo orice ajustare ar strica ce merge acum.
  if (aspect >= 1) return 1;
  const factor = aspect / REFERENCE_ASPECT;
  return Math.abs(1 - factor) < MIN_CORRECTION ? 1 : factor;
}

/**
 * Întoarce un subiect cu mâinile și trunchiul remapate. Blendshape-urile feței
 * sunt scoruri adimensionale, iar matricea capului e în spațiu metric 3D — pe
 * acestea raportul de aspect nu le atinge, deci trec neschimbate.
 *
 * @param {object|null} subject  rezultatul brut din `detect()`
 * @param {number} factor        din `aspectCorrectionFactor()`
 */
export function applyAspectCorrection(subject, factor) {
  if (!subject || factor === 1) return subject;

  return {
    ...subject,
    hands: subject.hands?.map((hand) => hand.map((p) => scalePoint(p, factor))),
    pose: subject.pose?.map((p) => scalePoint(p, factor)),
  };
}
