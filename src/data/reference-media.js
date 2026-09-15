/**
 * Imagini de referință pentru semnele afișate în lecții.
 *
 * Fișierele sunt servite din public/reference/.
 * Imaginile pentru alfabetul static sunt în lesson/, iar cele dinamice
 * rămân în dynamic/.
 */
export const DYNAMIC_REFERENCE_MEDIA = {
  A: '/reference/lesson/a.jpg',
  B: '/reference/lesson/b.jpg',
  C: '/reference/lesson/c.jpg',
  D: '/reference/lesson/d.jpg',
  E: '/reference/lesson/e.jpg',
  F: '/reference/lesson/f.jpg',
  G: '/reference/lesson/g.jpg',
  H: '/reference/lesson/h.jpg',
  I: '/reference/lesson/i.jpg',
  K: '/reference/lesson/k.jpg',
  L: '/reference/lesson/L.jpg',
  M: '/reference/lesson/M.jpg',
  N: '/reference/lesson/N.jpg',
  O: '/reference/lesson/O.jpg',
  P: '/reference/lesson/p.jpg',
  Q: '/reference/lesson/q.jpg',
  R: '/reference/lesson/r.jpg',
  S: '/reference/lesson/s.jpg',
  T: '/reference/lesson/t.jpg',
  U: '/reference/lesson/u.jpg',
  V: '/reference/lesson/v.jpg',
  W: '/reference/lesson/w.jpg',
  Y: '/reference/lesson/y.jpg',
  'Â': '/reference/lesson/â.jpg',
  'Ă': '/reference/lesson/ă.jpg',

  J: '/reference/dynamic/J.mp4',
  Z: '/reference/dynamic/Z.mp4',
  X: '/reference/dynamic/X.jpg',
  'Î': '/reference/dynamic/Î.mp4',
  'Ș': '/reference/dynamic/Ș.mp4',
  'Ț': '/reference/dynamic/Ț.mp4',
};

export function referenceMediaFor(target) {
  return DYNAMIC_REFERENCE_MEDIA[target] ?? null;
}
