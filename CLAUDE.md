# Signa — Context pentru Claude

Aplicație web PWA de tip „Duolingo pentru Limba Semnelor Române" (LSR).
Recunoașterea semnelor rulează **pe dispozitiv**, fără cloud, fără costuri.

## Stack (fix, nu se schimbă)
- React 18 + Vite 6 + Tailwind CSS v3 — livrat ca PWA via `vite-plugin-pwa`
- MediaPipe (`@mediapipe/tasks-vision`) — Hand Landmarker (21 pct/mână) + Face Landmarker
  (blendshapes + orientare cap) + Pose Landmarker (trunchi) — tracking holistic, nu doar mâini
- TensorFlow.js — clasificator MLP (poze statice) + GRU (semne cu mișcare), antrenate în browser
- Backend: Supabase (Faza 5, scaffold în `src/lib/supabase.js` + `supabase/schema.sql`)

## Structura proiectului
```
src/
├── components/hand-tracker/   # Camera + canvas overlay
├── components/collect/        # LetterSelector
├── components/lesson/         # ReferenceHand (static + animat)
├── components/prediction/     # PredictionOverlay
├── components/ui/             # Confetti
├── hooks/
│   ├── useHolisticLandmarker.js
│   ├── useDatasetCollector.js
│   ├── useClassifier.js
│   └── useProgress.js         # XP, stele, streak, nivel, mastery
├── pages/                     # Home, Camera, Collect, Train, Lessons, Lesson,
│                              # Spell, Review, Diagnostic
├── data/                      # lsr-alphabet, lessons, words, reference-poses
├── lib/supabase.js
└── utils/normalize.js         # ⚠ CRITICĂ — VECTOR_SIZE 199
```

## Reguli importante
1. `normalize()` din `src/utils/normalize.js` NU se modifică fără anunț explicit —
   orice schimbare invalidează datele/modelele. Contract v2: 199 valori.
2. Recunoașterea rămâne **pe dispozitiv** — niciodată imagini în cloud.
3. Stil: mobile-first, **temă cream/friendly** (`cream`, `ink`, accent `signa-400`).
4. Comentariile în română sunt ok.
5. Literele dinamice (J, Z, X, Î, Ș, Ț) = secvențe `SEQ_FRAMES`.

## Faze
- Faza 1–4 ✅ (camera holistică, colectare, train, lecții)
- Faza 4.5 🚧 (pipeline GRU gata; lipsește recolectare + modele active în `public/models/`)
- Faza 5 — scaffold Supabase; proiect live TBD

## Cum rulezi local
```bash
npm install
npm run dev
npm test
```

Vezi `ROADMAP.md` pentru starea bifelor.
