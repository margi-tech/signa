/**
 * Potrivirea țintelor din lecții cu etichetele modelelor.
 *
 * Lecțiile, listele din lsr-alphabet și modelele scriu aceleași semne diferit
 * („Buna" în lecție, „buna" în model; „El" în model, „el" în DYNAMIC_LETTERS).
 * Cu comparația strictă, 29 de ținte din lecțiile 5.1–8.2 nu puteau fi validate
 * niciodată — nici modelul ales nu era cel care cunoștea semnul.
 */

/** Cheia de comparație: fără spații la capete și fără majuscule. Diacriticele
 *  rămân — Ă și A sunt litere diferite în alfabet. */
export const signKey = (label) => String(label ?? '').trim().toLocaleLowerCase('ro');

export const sameSign = (a, b) => signKey(a) === signKey(b);

/**
 * Alege modelul pentru o țintă. Păstrează regula din lsr-alphabet când modelul
 * ales cunoaște semnul; altfel trece pe celălalt, dacă acela îl cunoaște.
 * Până se încarcă modelele (etichete goale), rămâne regula.
 */
export function usesDynamicModel(target, defaultDynamic, { staticLabels = [], dynamicLabels = [] } = {}) {
  const knows = (labels) => labels.some((l) => sameSign(l, target));
  if (knows(defaultDynamic ? dynamicLabels : staticLabels)) return defaultDynamic;
  if (knows(defaultDynamic ? staticLabels : dynamicLabels)) return !defaultDynamic;
  return defaultDynamic;
}
