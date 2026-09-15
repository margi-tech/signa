import { describe, it, expect } from 'vitest';
import { sameSign, usesDynamicModel, matchesLessonTarget } from './signMatch.js';
import { LESSONS } from '../data/lessons.js';
import { DYNAMIC_LETTERS } from '../data/lsr-alphabet.js';
import { cleanLabels } from '../hooks/useClassifier.js';
import staticMeta from '../../public/models/signa-labels.json';
import dynamicMeta from '../../public/models/signa-labels-dynamic.json';

describe('sameSign', () => {
  it('ignoră majusculele și spațiile de la capete', () => {
    expect(sameSign('Buna seara', 'buna seara ')).toBe(true);
    expect(sameSign('Roșu', 'roșu')).toBe(true);
  });

  it('păstrează diacriticele — Ă și A sunt litere diferite', () => {
    expect(sameSign('A', 'Ă')).toBe(false);
    expect(sameSign('Mama', 'Mamă')).toBe(false);
  });
});

describe('matchesLessonTarget', () => {
  it('acceptă top-1 la pragul blând', () => {
    expect(matchesLessonTarget({ label: 'A', confidence: 0.25, top3: [] }, 'A')).toBe(true);
    expect(matchesLessonTarget({ label: 'A', confidence: 0.1, top3: [] }, 'A')).toBe(false);
  });

  it('acceptă ținta din top-3 chiar dacă top-1 e alt semn', () => {
    const p = {
      label: 'S',
      confidence: 0.41,
      top3: [
        { label: 'S', p: 0.41 },
        { label: 'A', p: 0.18 },
        { label: 'E', p: 0.09 },
      ],
    };
    expect(matchesLessonTarget(p, 'A')).toBe(true);
    expect(matchesLessonTarget(p, 'B')).toBe(false);
  });

  it('la semne dinamice cere top-1 și o marjă mică', () => {
    expect(matchesLessonTarget(
      { label: 'J', confidence: 0.2, margin: 0.04, top3: [] },
      'J',
      { dynamic: true },
    )).toBe(true);
    expect(matchesLessonTarget(
      { label: 'J', confidence: 0.2, margin: 0.002, top3: [] },
      'J',
      { dynamic: true },
    )).toBe(false);
  });
});

describe('usesDynamicModel', () => {
  const labels = { staticLabels: ['A', 'Eu', 'Tu'], dynamicLabels: ['J', 'El', 'alb'] };

  it('păstrează regula din lsr-alphabet când modelul ales cunoaște semnul', () => {
    expect(usesDynamicModel('J', true, labels)).toBe(true);
    expect(usesDynamicModel('Eu', false, labels)).toBe(false);
  });

  it('trece pe modelul care chiar cunoaște semnul', () => {
    expect(usesDynamicModel('El', false, labels)).toBe(true);
    expect(usesDynamicModel('Alb', false, labels)).toBe(true);
  });

  it('rămâne pe regulă până se încarcă modelele', () => {
    expect(usesDynamicModel('El', false)).toBe(false);
  });
});

// Ținte fără exemple în modelele actuale — se rezolvă prin colectare și
// reantrenare, nu din cod. Testul pică dacă o reantrenare scoate alte semne
// din lecții (reantrenarea din 10 sep a scos mâncarea din 4.1/4.2).
const KNOWN_MISSING = new Set(['legumă', 'carne', 'supă', 'cafea', 'lapte', 'Mama', 'Buna ziua']);

describe('lecțiile vs. modelele din public/models', () => {
  it('fiecare țintă există în modelul pe care îl folosește lecția', () => {
    const staticLabels = cleanLabels(staticMeta.labels);
    const dynamicLabels = cleanLabels(dynamicMeta.labels);
    const missing = LESSONS.flatMap((l) => l.letters)
      .filter((t) => {
        const dyn = usesDynamicModel(t, DYNAMIC_LETTERS.has(t), { staticLabels, dynamicLabels });
        return !(dyn ? dynamicLabels : staticLabels).some((l) => sameSign(l, t));
      })
      .filter((t) => !KNOWN_MISSING.has(t));
    expect(missing).toEqual([]);
  });
});
