import { describe, it, expect } from 'vitest';
import { cleanLabels } from './useClassifier.js';

describe('cleanLabels', () => {
  it('taie spațiile de la capete care au creat clase fantomă', () => {
    expect(cleanLabels(['Tu ', 'Noi ', 'Unchi ', 'Soră '])).toEqual(['Tu', 'Noi', 'Unchi', 'Soră']);
  });

  it('păstrează spațiile interioare — etichetele pot avea mai multe cuvinte', () => {
    expect(cleanLabels(['buna ziua', 'ce faci'])).toEqual(['buna ziua', 'ce faci']);
  });

  it('face ca „Soră ” și „Soră” să devină aceeași clasă', () => {
    const cleaned = cleanLabels(['Soră', 'Soră ']);
    expect(new Set(cleaned).size).toBe(1);
  });

  it('nu modifică etichetele deja curate', () => {
    const labels = ['A', 'Ă', '10', 'Mamă'];
    expect(cleanLabels(labels)).toEqual(labels);
  });
});
