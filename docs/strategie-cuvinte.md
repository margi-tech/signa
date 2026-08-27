# Strategie cuvinte LSR

## Decizie (MVP)

1. **Dactilare literă-cu-literă** („Scrie cuvântul”) — folosește modelul **static** existent.
   Nu e nevoie de model separat pentru MVP. Implementat în `SpellPage`.
2. **Cuvinte-semn** (gest unic: „mulțumesc”, „ajutor”) — model **separat** (static sau GRU),
   etichete libere în CollectPage, lecții dedicate după recolectare.

## De ce

- Dactilarea valorifică imediat alfabetul deja antrenat.
- Cuvintele-semn au formă/mișcare diferită de litere — amestecate în același MLP scad acuratețea.

## Vocabular MVP

Vezi `src/data/words.js` (~25 cuvinte, 5 categorii), extras dintr-un PDF cu
cuvinte LSR pe categorii care nu mai e păstrat în repo (îl are David).
