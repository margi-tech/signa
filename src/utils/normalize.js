/**
 * normalize(landmarks) — aduce cei 21 de landmarks MediaPipe la o formă standard.
 *
 * Pași:
 *  1. Translatare: mută originea în landmark[0] (încheietura)
 *  2. Scalare: împarte la distanța Euclidiană landmark[0] → landmark[9]
 *     (baza degetului mijlociu), eliminând dependența de distanța față de cameră
 *  3. Aplatizare: returnează un vector plat de 63 valori [x0,y0,z0, x1,y1,z1, ...]
 *
 * ⚠ REGULĂ CRITICĂ: această funcție trebuie să fie IDENTICĂ cu cea folosită
 * la colectarea datelor de antrenament (Faza 2). Orice diferență = model orb.
 *
 * @param {Array<{x: number, y: number, z: number}>} landmarks  21 puncte MediaPipe
 * @returns {number[] | null}  vector de 63 valori, sau null la input invalid
 */
export function normalize(landmarks) {
  if (!landmarks || landmarks.length !== 21) return null;

  const origin = landmarks[0]; // încheietura — punct de referință

  // 1. Translatare: toate punctele față de încheietură
  const translated = landmarks.map(({ x, y, z }) => ({
    x: x - origin.x,
    y: y - origin.y,
    z: z - origin.z,
  }));

  // 2. Scalare: distanța Euclidiană încheietură → baza degetului mijlociu (landmark[9])
  const ref = translated[9];
  const scale = Math.sqrt(ref.x ** 2 + ref.y ** 2 + ref.z ** 2) || 1;

  // 3. Scalare + aplatizare într-un singur vector de 63 de valori
  return translated.flatMap(({ x, y, z }) => [x / scale, y / scale, z / scale]);
}
