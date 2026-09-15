/**
 * Potrivirea țintelor din lecții cu etichetele modelelor.
 *
 * Lecțiile, listele din lsr-alphabet și modelele scriu aceleași semne diferit
 * („Buna" în lecție, „buna" în model; „El" în model, „el" în DYNAMIC_LETTERS).
 * Cu comparația strictă, 29 de ținte din lecțiile 5.1–8.2 nu puteau fi validate
 * niciodată — nici modelul ales nu era cel care cunoștea semnul.
 */

import {
  MIN_CONFIDENCE, MIN_TOP3, DYN_MIN_CONF, DYN_MIN_MARGIN,
} from '../data/lessons.js';

/** Cheia de comparație: fără spații la capete și fără majuscule. Diacriticele
 *  rămân — Ă și A sunt litere diferite în alfabet. */
export const signKey = (label) => String(label ?? '').trim().toLocaleLowerCase('ro');

export const sameSign = (a, b) => signKey(a) === signKey(b);

/**
 * Recunoaștere în lecții: top-1 la pragul blând, sau ținta în top-3.
 * Dinamic rămâne pe top-1 + marjă mică (clase puține, mișcarea e semnalul).
 */
export function matchesLessonTarget(prediction, target, { dynamic = false } = {}) {
  if (!prediction) return false;
  if (dynamic) {
    return sameSign(prediction.label, target)
      && prediction.confidence >= DYN_MIN_CONF
      && prediction.margin >= DYN_MIN_MARGIN;
  }
  if (sameSign(prediction.label, target) && prediction.confidence >= MIN_CONFIDENCE) {
    return true;
  }
  return (prediction.top3 ?? []).some(
    (row) => sameSign(row.label, target) && row.p >= MIN_TOP3,
  );
}

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
