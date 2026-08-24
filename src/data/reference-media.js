/**
 * Imagini de referință pentru semne dinamice.
 *
 * Fișierele sunt servite din public/reference/dynamic/.
 * Exemplu: public/reference/dynamic/J.webp -> /reference/dynamic/J.webp
 */
export const DYNAMIC_REFERENCE_MEDIA = {
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
