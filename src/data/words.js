/**
 * Vocabular MVP — cuvinte LSR pentru provocarea „Scrie cuvântul"
 * (dactilare literă-cu-literă) și lecțiile de cuvinte viitoare.
 *
 * Sursa: un PDF cu cuvinte LSR pe categorii (nu mai e în repo), subset curat
 * pentru începători.
 * Strategia (P1): dactilarea literă-cu-literă folosește modelul static existent;
 * cuvintele-semn (gest unic) vor avea model separat după recolectare.
 */

export const WORD_CATEGORIES = [
  {
    id: 'salut',
    title: 'Salut & politețe',
    words: [
      { id: 'buna',       label: 'Bună',       letters: ['B', 'U', 'N', 'Ă'] },
      { id: 'multumesc',  label: 'Mulțumesc',  letters: ['M', 'U', 'L', 'Ț', 'U', 'M', 'E', 'S', 'C'] },
      { id: 'te-rog',     label: 'Te rog',     letters: ['T', 'E', 'R', 'O', 'G'] },
      { id: 'pa',         label: 'Pa',         letters: ['P', 'A'] },
      { id: 'da',         label: 'Da',         letters: ['D', 'A'] },
      { id: 'nu',         label: 'Nu',         letters: ['N', 'U'] },
    ],
  },
  {
    id: 'pronume',
    title: 'Pronume personale',
    words: [
      { id: 'eu',         label: 'Eu',        letters: ['E', 'U'] },
      { id: 'tu',         label: 'Tu',        letters: ['T', 'U'] },
      { id: 'el',         label: 'El',        letters: ['E', 'L'] },
      { id: 'ea',         label: 'Ea',        letters: ['E', 'A'] },
      { id: 'noi',        label: 'Noi',       letters: ['N', 'O', 'I'] },
    ],
  },
  {
    id: 'familie',
    title: 'Familie',
    words: [
      { id: 'mama',       label: 'Mamă',      letters: ['M', 'A', 'M', 'Ă'] },
      { id: 'tata',       label: 'Tată',      letters: ['T', 'A', 'T', 'Ă'] },
      { id: 'frate',      label: 'Frate',     letters: ['F', 'R', 'A', 'T', 'E'] },
      { id: 'sora',       label: 'Soră',      letters: ['S', 'O', 'R', 'Ă'] },
      { id: 'copil',      label: 'Copil',     letters: ['C', 'O', 'P', 'I', 'L'] },
      { id: 'prieten',    label: 'Prieten',   letters: ['P', 'R', 'I', 'E', 'T', 'E', 'N'] },
      { id: 'socru',      label: 'Socru',     letters: ['S', 'O', 'C', 'R', 'U'] },
      { id: 'versor',     label: 'Verișor',   letters: ['V', 'E', 'R', 'I', 'Ș', 'O', 'R'] },
      { id: 'bunichi',    label: 'Bunichi',   letters: ['B', 'U', 'N', 'I', 'C', 'H', 'I'] },
      { id: 'unchi',      label: 'Unchi',     letters: ['U', 'N', 'C', 'H', 'I'] },
    ],
  },
  {
    id: 'culori',
    title: 'Culori',
    words: [
      { id: 'rosu',         label: 'Roșu',          letters: ['R', 'O', 'Ș', 'U'] },
      { id: 'albastru',     label: 'Albastru',      letters: ['A', 'L', 'B', 'A', 'S', 'T', 'R', 'U'] },
      { id: 'verde',        label: 'Verde',         letters: ['V', 'E', 'R', 'D', 'E'] },
      { id: 'galben',       label: 'Galben',        letters: ['G', 'A', 'L', 'B', 'E', 'N'] },
      { id: 'negru',        label: 'Negru',         letters: ['N', 'E', 'G', 'R', 'U'] },
      { id: 'alb',          label: 'Alb',           letters: ['A', 'L', 'B'] },
      { id: 'gri',          label: 'Gri',           letters: ['G', 'R', 'I'] },
      { id: 'roz',          label: 'Roz',           letters: ['R', 'O', 'Z'] },
      { id: 'maro',         label: 'Maro',          letters: ['M', 'A', 'R', 'O'] },
      { id: 'portocaliu',   label: 'Portocaliu',    letters: ['P', 'O', 'R', 'T', 'O', 'C', 'A', 'L', 'I', 'U'] },
      { id: 'mov',          label: 'Mov',           letters: ['M', 'O', 'V'] },
    ],
  },
  {
    id: 'numere',
    title: 'Numere',
    words: [
      { id: 'zero',    label: 'Zero',    letters: ['Z', 'E', 'R', 'O'] },
      { id: 'unu',     label: 'Unu',     letters: ['U', 'N', 'U'] },
      { id: 'doi',     label: 'Doi',     letters: ['D', 'O', 'I'] },
      { id: 'trei',    label: 'Trei',    letters: ['T', 'R', 'E', 'I'] },
      { id: 'patru',   label: 'Patru',   letters: ['P', 'A', 'T', 'R', 'U'] },
      { id: 'cinci',   label: 'Cinci',   letters: ['C', 'I', 'N', 'C', 'I'] },
      { id: 'sase',    label: 'Șase',    letters: ['Ș', 'A', 'S', 'E'] },
      { id: 'sapte',   label: 'Șapte',   letters: ['Ș', 'A', 'P', 'T', 'E'] },
      { id: 'opt',     label: 'Opt',     letters: ['O', 'P', 'T'] },
      { id: 'noua',    label: 'Nouă',    letters: ['N', 'O', 'U', 'Ă'] },
      { id: 'zece',    label: 'Zece',    letters: ['Z', 'E', 'C', 'E'] },
    ],
  },
  {
    id: 'util',
    title: 'Utile',
    words: [
      { id: 'ajutor',  label: 'Ajutor',  letters: ['A', 'J', 'U', 'T', 'O', 'R'] },
      { id: 'apa',     label: 'Apă',     letters: ['A', 'P', 'Ă'] },
      { id: 'casa',    label: 'Casă',    letters: ['C', 'A', 'S', 'Ă'] },
      { id: 'scoala',  label: 'Școală',  letters: ['Ș', 'C', 'O', 'A', 'L', 'Ă'] },
    ],
  },
  {
    id: 'saluturi',
    title: 'saluturi',
    words: [
      { id: 'buna',  label: 'Buna',  letters: ['B', 'U', 'N', 'A'] },
      { id: 'buna ziua',     label: 'Buna ziua',     letters: ['B','U','N','A','Z','I','U','A'] },
      { id: 'ce faci',    label: 'Ce faci',    letters: ['C', 'E', 'F', 'A','C','I'] },
      { id: 'la revedere',  label: 'La revedere',  letters: ['L','A','R','E','V','E','D','E','R','E'] },
      { id: 'buna seara', label: 'Buna seara', letters: ['B', 'U', 'N', 'A', 'S', 'E', 'A', 'R', 'A'] },
    ],
  },
];

/** Listă plată — toate cuvintele MVP */
export const ALL_WORDS = WORD_CATEGORIES.flatMap((c) => c.words);

/** Cuvinte scurte ideale pentru demo (≤4 litere, fără dinamice grele) */
export const DEMO_WORDS = ALL_WORDS.filter(
  (w) => w.letters.length <= 4 && !w.letters.some((l) => ['J', 'Z', 'X', 'Î', 'Ș', 'Ț'].includes(l))
);

export function wordById(id) {
  return ALL_WORDS.find((w) => w.id === id) ?? null;
}
