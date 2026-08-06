/**
 * Alfabetul dactil LSR — literele pentru care colectăm date.
 * Include literele specifice limbii române (Ă, Â, Î, Ș, Ț).
 * Ordinea e cea de colectare recomandată (litere simple primul).
 */
export const LSR_ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z',
  'Ă', 'Â', 'Î', 'Ș', 'Ț', 'alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro',
];

// Minim recomandat de exemple per literă pentru un model decent
export const MIN_SAMPLES_PER_LETTER = 50;

// Litere care implică mișcarea mâinii — se colectează ca SECVENȚE de cadre,
// nu ca poze statice (pipeline-ul de mișcare, Faza 4.5).
export const DYNAMIC_LETTERS = new Set(['J', 'Z', 'X', 'Î', 'Ș', 'Ț', 'alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro',)];

// O înregistrare = SEQ_FRAMES cadre la SEQ_INTERVAL_MS distanță (~1.5s)
export const SEQ_FRAMES      = 30;
export const SEQ_INTERVAL_MS = 50;

// Minim recomandat de înregistrări per literă dinamică
export const MIN_SEQ_PER_LETTER = 30;

/**
 * Pragul de „complet" al unei etichete, după modul de captură.
 * @param {boolean} isVideo  true = secvență filmată, false = poză statică
 */
export const minFor = (isVideo) =>
  isVideo ? MIN_SEQ_PER_LETTER : MIN_SAMPLES_PER_LETTER;
