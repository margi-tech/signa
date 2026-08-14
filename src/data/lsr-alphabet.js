/**
 * Alfabetul dactil LSR + primele cuvinte-semn.
 *
 * Structura:
 *   • LSR_LETTERS  — literele propriu-zise (statice + dinamice)
 *   • LSR_WORDS    — cuvinte-semn (toate dinamice, un semn = o secvență)
 *   • LSR_ALPHABET — literele + cuvintele, în ordinea de colectare
 *                    (păstrat ca export pentru compatibilitate cu tot ce
 *                    consumă „lista tuturor etichetelor").
 *
 * Cuvintele stau tot în pipeline-ul „dinamic" — piggyback pe modelul GRU
 * antrenat pentru literele cu mișcare. Când vor fi >20 cuvinte sau apar
 * semne cu două mâini / față esențială, extragem model separat.
 */
export const LSR_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  'Ă', 'Â', 'Î', 'Ș', 'Ț', 'alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro', 'roz'
];

export const LSR_WORDS = [
  'mâncare', 'apă', 'legumă', 'fruct', 'pâine',
  'carne', 'supă', 'măr', 'cafea', 'lapte',
];

//cifre statice
export const LSR_DIGITS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
];

//numere dinamice
export const LSR_NUMBERS = [
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '100', '1000', '112'
];

export const LSR_ALPHABET = [...LSR_LETTERS, ...LSR_WORDS];
export const DYNAMIC_LETTERS = new Set(['J', 'Z', 'X', 'Î', 'Ș', 'Ț', 'alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro', 'roz',]);
export const LSR_ALPHABET = [...LSR_LETTERS, ...LSR_WORDS, ...LSR_DIGITS, ...LSR_NUMBERS];

// Minim recomandat de exemple per literă pentru un model decent
export const MIN_SAMPLES_PER_LETTER = 50;

/**
 * Etichete care implică mișcare — se colectează ca SECVENȚE de cadre.
 * Include literele cu mișcare + toate cuvintele-semn.
 * Numele „DYNAMIC_LETTERS" e păstrat pentru compatibilitate; în cod nou
 * folosește `isDynamicTarget()` sau aliasul `DYNAMIC_TARGETS`.
 */
export const DYNAMIC_LETTERS = new Set([
  'J', 'Z', 'X', 'Î', 'Ș', 'Ț',
  ...LSR_WORDS, ...LSR_NUMBERS
]);

/** Alias semantic — orice etichetă care merge prin GRU. */
export const DYNAMIC_TARGETS = DYNAMIC_LETTERS;

/** True dacă eticheta e cuvânt-semn (nu o literă a alfabetului). */
export const isWord = (target) => LSR_WORDS.includes(target) || LSR_NUMBERS.includes(target);

/** True dacă eticheta se prezice cu modelul dinamic (GRU). */
export const isDynamicTarget = (target) => DYNAMIC_LETTERS.has(target);
// Litere care implică mișcarea mâinii — se colectează ca SECVENȚE de cadre,
// nu ca poze statice (pipeline-ul de mișcare, Faza 4.5).
export const DYNAMIC_LETTERS = new Set(['J', 'Z', 'X', 'Î', 'Ș', 'Ț', 'alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro', 'roz',]);

// O înregistrare = SEQ_FRAMES cadre la SEQ_INTERVAL_MS distanță (~1.5s)
export const SEQ_FRAMES      = 30;
export const SEQ_INTERVAL_MS = 50;

// Minim recomandat de înregistrări per etichetă dinamică
export const MIN_SEQ_PER_LETTER = 30;

/**
 * Pragul de „complet" al unei etichete, după modul de captură.
 * @param {boolean} isVideo  true = secvență filmată, false = poză statică
 */
export const minFor = (isVideo) =>
  isVideo ? MIN_SEQ_PER_LETTER : MIN_SAMPLES_PER_LETTER;
