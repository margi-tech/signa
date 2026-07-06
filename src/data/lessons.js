/**
 * Lecțiile Signa — alfabetul static împărțit în grupe de 5 litere.
 * Deblocare progresivă: o lecție se deschide când cea anterioară e completată.
 */
export const LESSONS = [
  { id: 1, title: 'Lecția 1', letters: ['A', 'B', 'C', 'D', 'E'] },
  { id: 2, title: 'Lecția 2', letters: ['F', 'G', 'H', 'I', 'K'] },
  { id: 3, title: 'Lecția 3', letters: ['L', 'M', 'N', 'O', 'P'] },
  { id: 4, title: 'Lecția 4', letters: ['Q', 'R', 'S', 'T', 'U'] },
  { id: 5, title: 'Lecția 5', letters: ['V', 'W', 'Y', 'Â', 'Ă'] },
];

// XP primit pentru fiecare literă reușită (nu și sărită)
export const XP_PER_LETTER = 10;

// Bonus pentru lecție perfectă (nicio literă sărită)
export const XP_PERFECT_BONUS = 10;

// Cât timp trebuie ținut semnul corect ca să fie validat (ms)
export const HOLD_DURATION_MS = 1200;
