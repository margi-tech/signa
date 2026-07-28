/**
 * Lecțiile Signa — alfabetul împărțit în grupe.
 * Deblocare progresivă: o lecție se deschide când cea anterioară e completată.
 *
 * type: 'static'  — litere fără mișcare (MLP)
 * type: 'dynamic' — litere cu mișcare (GRU), ținute mai lung
 */
export const LESSONS = [
  { id: 1, title: 'Lecția 1', type: 'static',  letters: ['A', 'B', 'C', 'D', 'E'] },
  { id: 2, title: 'Lecția 2', type: 'static',  letters: ['F', 'G', 'H', 'I', 'K'] },
  { id: 3, title: 'Lecția 3', type: 'static',  letters: ['L', 'M', 'N', 'O', 'P'] },
  { id: 4, title: 'Lecția 4', type: 'static',  letters: ['Q', 'R', 'S', 'T', 'U'] },
  { id: 5, title: 'Lecția 5', type: 'static',  letters: ['V', 'W', 'Y', 'Â', 'Ă'] },
  { id: 6, title: 'Lecția 6', type: 'dynamic', letters: ['J', 'Z', 'X', 'Î', 'Ș', 'Ț'],
    teaser: 'Litere cu mișcare — necesită modelul GRU' },
];

// XP primit pentru fiecare literă reușită (nu și sărită)
export const XP_PER_LETTER = 10;

// Bonus pentru lecție perfectă (nicio literă sărită)
export const XP_PERFECT_BONUS = 10;

// Cât timp trebuie ținut semnul corect ca să fie validat (ms)
export const HOLD_DURATION_MS = 1200;

// Litere dinamice: menținere mai lungă (mișcarea e mai greu de stabilizat)
export const HOLD_DURATION_DYNAMIC_MS = 1800;

/** XP necesar pentru a ajunge la un nivel (nivelul 1 = 0 XP) */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  // curbă blândă: 50, 120, 210, 320…
  return Math.round(40 * level * (level - 1) / 2 + 10 * (level - 1));
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}
