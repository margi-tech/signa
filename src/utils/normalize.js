/**
 * normalize(subject) — aduce o "captură holistică" (mâini + față + cap + trunchi)
 * la un singur vector numeric standard, folosit identic la colectare și predicție.
 *
 * LSR nu se rezumă la forma mâinii: expresia facială și mișcările capului duc
 * informație gramaticală/emoțională, iar postura trunchiului dă orientarea în
 * spațiu. De aceea vectorul combină patru componente:
 *
 *   [ mâna stângă (63) | mâna dreaptă (63) | expresie facială (52) |
 *     orientare cap (3) | trunchi: umeri+coate+șolduri (18) ]
 *   = 199 valori (VECTOR_SIZE)
 *
 * O mână/față/trunchi absent(ă) din cadru devine un bloc de zerouri — modelul
 * învață să tolereze lipsa unei componente, nu doar prezența ei.
 *
 * ⚠ REGULĂ CRITICĂ: această funcție trebuie să fie IDENTICĂ cu cea folosită
 * la colectarea datelor de antrenament. Orice diferență = model orb.
 * (Versiune 2 — extinsă față de Faza 1-4, care normaliza doar o mână/63 valori.
 * Modelele/datele vechi din acel format sunt incompatibile cu acest vector și
 * au fost arhivate în public/models/_legacy-hand-only-63dim/.)
 *
 * @param {{
 *   hands: Array<Array<{x:number,y:number,z:number}>>,
 *   handedness?: Array<string|undefined>,
 *   faceBlendshapes?: number[]|null,
 *   headMatrix?: number[]|null,
 *   pose?: Array<{x:number,y:number,z:number,visibility?:number}>|null,
 * }} subject  rezultatul brut din useHolisticLandmarker().detect()
 * @returns {number[] | null}  vector de VECTOR_SIZE valori, sau null dacă nu e nicio mână
 */

export const HAND_DIM  = 63; // 21 puncte × 3
export const FACE_DIM  = 52; // blendshapes MediaPipe
export const HEAD_DIM  = 3;  // pitch, yaw, roll (din matricea de transformare a capului)
export const POSE_DIM  = 18; // 6 puncte de trunchi × 3
export const VECTOR_SIZE = HAND_DIM * 2 + FACE_DIM + HEAD_DIM + POSE_DIM; // 199

// Indicii MediaPipe Pose pentru trunchi: umăr stâng/drept, cot stâng/drept, șold stâng/drept
const POSE_POINTS = [11, 12, 13, 14, 23, 24];

// PoseLandmarker întoarce ÎNTOTDEAUNA toate cele 33 de puncte, chiar și pentru cele
// din afara cadrului — le estimează, nu le vede. Sub acest prag de `visibility`,
// tratăm punctul ca absent (zero), altfel modelul învață din poziții ghicite.
const POSE_VISIBILITY_MIN = 0.5;

/** Normalizează o singură mână (formula neschimbată din Faza 1): origine la
 *  încheietură, scalare la distanța încheietură→baza degetului mijlociu. */
function normalizeHand(landmarks) {
  if (!landmarks || landmarks.length !== 21) return null;

  const origin = landmarks[0];
  const translated = landmarks.map(({ x, y, z }) => ({
    x: x - origin.x,
    y: y - origin.y,
    z: z - origin.z,
  }));

  const ref = translated[9];
  const scale = Math.sqrt(ref.x ** 2 + ref.y ** 2 + ref.z ** 2) || 1;

  return translated.flatMap(({ x, y, z }) => [x / scale, y / scale, z / scale]);
}

const isVisible = (p) => (p?.visibility ?? 1) >= POSE_VISIBILITY_MIN;

/** Normalizează subsetul de trunchi: origine la mijlocul umerilor, scalare
 *  la distanța dintre umeri (invariant la distanța față de cameră).
 *  Punctele nesigure (estimate, nu văzute) devin zero — vezi POSE_VISIBILITY_MIN. */
function normalizePose(pose) {
  if (!pose || pose.length < 25) return new Array(POSE_DIM).fill(0);

  const pts = POSE_POINTS.map((i) => pose[i]);
  const [ls, rs] = pts;

  // Fără umeri vizibili nu avem origine/scală de încredere — tot blocul devine zero
  if (!isVisible(ls) || !isVisible(rs)) return new Array(POSE_DIM).fill(0);

  const midX = (ls.x + rs.x) / 2;
  const midY = (ls.y + rs.y) / 2;
  const midZ = (ls.z + rs.z) / 2;
  const scale = Math.hypot(rs.x - ls.x, rs.y - ls.y, rs.z - ls.z) || 1;

  return pts.flatMap((p) => {
    if (!isVisible(p)) return [0, 0, 0]; // punct estimat, nu văzut — nu-l folosim
    return [(p.x - midX) / scale, (p.y - midY) / scale, (p.z - midZ) / scale];
  });
}

/** Extrage pitch/yaw/roll (normalizate la ±1) din matricea 4×4 a capului. */
function headAngles(headMatrix) {
  if (!headMatrix || headMatrix.length < 16) return [0, 0, 0];

  // Matrice column-major: elementul (rând i, coloană j) e la index i + j*4
  const r00 = headMatrix[0], r10 = headMatrix[1], r20 = headMatrix[2];
  const r21 = headMatrix[6], r22 = headMatrix[10];

  const pitch = Math.atan2(-r20, Math.hypot(r00, r10)) / Math.PI;
  const yaw   = Math.atan2(r10, r00) / Math.PI;
  const roll  = Math.atan2(r21, r22) / Math.PI;

  return [pitch, yaw, roll];
}

/** Așază mâinile detectate în sloturi stabile [stânga, dreapta] după eticheta MediaPipe. */
function orderedHands(subject) {
  const slots = [null, null];
  const hands = subject?.hands ?? [];
  const handed = subject?.handedness ?? [];

  hands.forEach((h, i) => {
    const label = handed[i];
    const slot = label === 'Right' ? 1 : label === 'Left' ? 0 : (slots[0] ? 1 : 0);
    if (!slots[slot]) slots[slot] = h;
  });

  return slots;
}

export function normalize(subject) {
  if (!subject?.hands?.length) return null; // fără nicio mână = fără semn

  const [handL, handR] = orderedHands(subject);
  const vHandL = normalizeHand(handL) ?? new Array(HAND_DIM).fill(0);
  const vHandR = normalizeHand(handR) ?? new Array(HAND_DIM).fill(0);

  const vFace = subject.faceBlendshapes?.length === FACE_DIM
    ? subject.faceBlendshapes
    : new Array(FACE_DIM).fill(0);

  const vHead = headAngles(subject.headMatrix);
  const vPose = normalizePose(subject.pose);

  return [...vHandL, ...vHandR, ...vFace, ...vHead, ...vPose];
}
