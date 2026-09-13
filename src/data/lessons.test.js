import { describe, it, expect } from 'vitest';
import { lessonResult } from './lessons.js';

describe('lessonResult', () => {
  it('lecție perfectă: 3 stele și bonus', () => {
    expect(lessonResult(5, 0)).toEqual({ done: 5, stars: 3, xp: 60 });
  });

  it('un semn sărit: 2 stele, fără bonus', () => {
    expect(lessonResult(5, 1)).toEqual({ done: 4, stars: 2, xp: 40 });
  });

  it('mai multe sărite: o stea', () => {
    expect(lessonResult(5, 3)).toEqual({ done: 2, stars: 1, xp: 20 });
  });

  it('nimic validat: 0 stele, chiar și într-o repetiție cu un singur semn', () => {
    expect(lessonResult(1, 1)).toEqual({ done: 0, stars: 0, xp: 0 });
    expect(lessonResult(5, 5)).toEqual({ done: 0, stars: 0, xp: 0 });
  });
});
