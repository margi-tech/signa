/**
 * Lecțiile Signa — alfabetul împărțit în grupe.
 * Deblocare progresivă: o lecție se deschide când cea anterioară e completată.
 * (Logica de deblocare/stele trăiește în useProgress — isUnlocked / starsFor.
 *  Aici doar definim lecțiile și gruparea lor pe capitole.)
 *
 * type: 'static'  — litere fără mișcare (MLP)
 * type: 'dynamic' — litere cu mișcare (GRU), ținute mai lung
 */
export const LESSONS = [
  { id: 1.1, title: 'Lecția 1.1', type: 'static',  letters: ['A', 'B', 'C', 'D', 'E'] },
  { id: 1.2, title: 'Lecția 1.2', type: 'static',  letters: ['F', 'G', 'H', 'I', 'K'] },
  { id: 1.3, title: 'Lecția 1.3', type: 'static',  letters: ['L', 'M', 'N', 'O', 'P'] },
  { id: 1.4, title: 'Lecția 1.4', type: 'static',  letters: ['Q', 'R', 'S', 'T', 'U'] },
  { id: 1.5, title: 'Lecția 1.5', type: 'static',  letters: ['V', 'W', 'Y', 'Â', 'Ă'] },
  { id: 2.1, title: 'Lecția 2.1', type: 'dynamic', letters: ['J', 'Z', 'X', 'Î', 'Ș', 'Ț'] },

  // Numere — folosesc etichetele deja antrenate în public/models/ (signa-labels.json / -dynamic.json)
  { id: 3.1, title: 'Lecția 3.1', type: 'static',  letters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    teaser: 'Numere 1–10' },
  { id: 3.2, title: 'Lecția 3.2', type: 'dynamic', letters: ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
    teaser: 'Numere 11–20 — necesită modelul GRU' },
  { id: 3.3, title: 'Lecția 3.3', type: 'dynamic', letters: ['100', '1000', '112'],
    teaser: 'Numere speciale — necesită modelul GRU' },

  { id: 4.1, title: 'Lecția 4.1', type: 'dynamic',
    letters: ['mâncare', 'apă', 'legumă', 'fruct', 'pâine'],
    teaser: 'Cuvinte-semn — un gest per cuvânt, modelul GRU' },
  { id: 4.2, title: 'Lecția 4.2', type: 'dynamic',
    letters: ['carne', 'supă', 'măr', 'cafea', 'lapte'],
    teaser: 'Cuvinte-semn — un gest per cuvânt, modelul GRU' },

  { id: 5.1, title: 'Lectia 5.1', type: 'dynamic', letters:['Alb', 'Gri', 'Negru', 'Roz', 'Maro'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU' },
  { id: 5.2, title: 'Lectia 5.2', type: 'dynamic', letters:['Roșu', 'Galben', 'Portocaliu', 'Albastru', 'Verde', 'Mov'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU' },
  { id: 6.1, title: 'Lectia 6.1', type: 'dynamic', letters:['Buna','Buna ziua','Ce faci','Buna seara','La revedere'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU' },

  { id: 7.1, title: 'Lecția 7.1', type: 'dynamic', letters: ['Eu', 'Tu', 'El', 'Ea', 'Noi'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU' },
  { id: 8.1, title: 'Lecția 8.1', type: 'dynamic', letters: ['Mama', 'Tată', 'Frate', 'Soră', 'Bunic', 'Copil'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU'},
  { id: 8.2, title: 'Lecția 8.2', type: 'dynamic', letters: ['Copil', 'Prieten', 'Socru', 'Unchi', 'Verișor'],
    teaser: 'Cuvinte-semn- un gest per cuvant, modelul GRU'},

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

/* ------------------------------------------------------------------ */
/* Capitole — grupează LESSONS de mai sus, fără să le duplice.        */
/* Deblocarea rămâne în useProgress (isUnlocked) — aici doar gruparea. */
/* ------------------------------------------------------------------ */

export const CHAPTERS = [
  {
    id: 'ch1',
    title: '1. Alfabet static',
    description: 'Litere fără mișcare',
    lessonIds: [1.1, 1.2, 1.3, 1.4, 1.5],
  },
  {
    id: 'ch2',
    title: '2. Alfabet dinamic',
    description: 'Litere cu mișcare',
    lessonIds: [2.1],
  },

  {
    id: 'ch3',
    title: '3. Numere',
    description: 'Cifre și numere',
    lessonIds: [3.1, 3.2, 3.3],
  },

  {
    id: 'ch4',
    title: '4. Mâncare',
    description: 'Cuvinte-semn de bază',
    lessonIds: [4.1, 4.2],
  },

  {
    id: 'ch5',
    title: '5. Culori',
    description: 'Toate culorile',
    lessonIds: [5.1, 5.2],
  },
  {
    id: 'ch6',
    title: '6. Saluturi',
    description: 'Saluturi eseniale',
    lessonIds: [6.1],
  },
  {
    id: 'ch7',
    title: '7. Pronume',
    description: 'Pronume',
    lessonIds: [7.1],
  },
  {
    id: 'ch8',
    title: '8. Familie',
    description: 'Familie',
    lessonIds: [8.1, 8.2],
  },
];

/** Atașează lecțiile complete (nu doar id-uri) la fiecare capitol. */
export function buildChaptersWithLessons() {
  const lessonsById = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
  return CHAPTERS.map((ch) => ({
    ...ch,
    lessons: ch.lessonIds.map((id) => lessonsById[id]).filter(Boolean),
  }));
}

/** Găsește capitolul căruia îi aparține o lecție, după id. */
export function chapterForLesson(lessonId) {
  return CHAPTERS.find((ch) => ch.lessonIds.includes(lessonId));
}