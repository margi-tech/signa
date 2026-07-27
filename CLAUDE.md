# Signa — Context pentru Claude

Aplicație web PWA de tip „Duolingo pentru Limba Semnelor Române" (LSR).
Recunoașterea semnelor rulează **pe dispozitiv**, fără cloud, fără costuri.

## Stack (fix, nu se schimbă)
- React 18 + Vite 6 + Tailwind CSS v3 — livrat ca PWA via `vite-plugin-pwa`
- MediaPipe (`@mediapipe/tasks-vision`) — Hand Landmarker (21 pct/mână) + Face Landmarker
  (blendshapes + orientare cap) + Pose Landmarker (trunchi) — tracking holistic, nu doar mâini
- TensorFlow.js — clasificator MLP (poze statice) + GRU (semne cu mișcare), antrenate în browser
- Backend: Node + Express sau Supabase (Faza 5, nu e încă în proiect)

## Structura proiectului
```
src/
├── components/hand-tracker/   # Camera + canvas overlay
│   ├── index.jsx              # HandTracker: cameră, buclă detecție holistică, stări UI
│   └── HandCanvas.jsx         # Desenarea scheletului mâinilor pe canvas
├── components/collect/        # LetterSelector (alfabet + stare colectare)
├── components/lesson/         # ReferenceHand (schelet cartoon de referință)
├── components/prediction/     # PredictionOverlay (litera + confidence live)
├── hooks/
│   ├── useHolisticLandmarker.js  # Inițializare MediaPipe (mâini+față+trunchi), expune detect()
│   ├── useDatasetCollector.js    # Colectare/import/export dataset (localStorage)
│   ├── useClassifier.js          # Încarcă modelele TF.js, expune predict()/predictSequence()
│   └── useProgress.js            # XP + stele per lecție (localStorage)
├── pages/
│   ├── HomePage.jsx, CameraPage.jsx, CollectPage.jsx, TrainPage.jsx
│   └── LessonsPage.jsx, LessonPage.jsx
├── data/
│   ├── lsr-alphabet.js        # Alfabet, litere dinamice, praguri de colectare
│   └── lessons.js             # Structura lecțiilor + constante de scor
└── utils/
    └── normalize.js           # ⚠ CRITICĂ — identică la colectare și predicție
```

## Reguli importante
1. `normalize()` din `src/utils/normalize.js` NU se modifică fără să anunți explicit —
   orice schimbare invalidează toate datele/modelele deja colectate/antrenate.
   Contract curent (v2, din Faza 4.5): primește obiectul holistic brut
   `{ hands, handedness, faceBlendshapes, headMatrix, pose }` din
   `useHolisticLandmarker().detect()` și întoarce un vector de `VECTOR_SIZE` (199)
   valori: mâna stângă (63) + mâna dreaptă (63) + expresie facială/blendshapes (52) +
   orientare cap (3) + trunchi (18). Întoarce `null` dacă nu e nicio mână în cadru.
   Modelele/datele din formatul vechi (o mână, 63 valori) sunt arhivate în
   `public/models/_legacy-hand-only-63dim/` și NU mai sunt compatibile.
2. Recunoașterea rămâne **pe dispozitiv** — niciodată imagini în cloud.
3. Stil: mobile-first, dark theme (`slate-900`), accent verde (`signa-400 = #34d399`).
4. Comentariile în română sunt ok.
5. Literele dinamice (mișcare: J, Z, X, Î, Ș, Ț) se colectează ca secvențe de
   `SEQ_FRAMES` cadre (vezi `src/data/lsr-alphabet.js`), nu ca poze statice.

## Faze de dezvoltare
- **Faza 1** ✅ Camera + MediaPipe Hand + `normalize()` (v1, doar mână)
- **Faza 2** ✅ Colectare dataset LSR (alfabet dactil static, 25 litere)
- **Faza 3** ✅ Antrenare TensorFlow.js (MLP) + predicție live
- **Faza 4** ✅ Lecții gamificate (referință → imită → feedback → scor, XP + stele)
- **Faza 4.5** 🚧 Extindere tracking la mâini+față+trunchi (`normalize()` v2, 199 valori) +
  model GRU pentru semne dinamice — necesită recolectare completă a datasetului
- **Faza 5** — Backend, conturi, clasament (vezi și user story #9 „signup + authentication" din Taiga)

## Echipă
Proiectul e coordonat de un mentor și lucrat în echipă (Rareș, Cătălin, Paula, Roxana) —
vezi backlog-ul din Taiga pentru user stories curente. Repo: `github.com/margi-tech/signa`.
Fiecare membru lucrează pe branch propriu, nu direct pe `main`.

## Cum rulezi local
```bash
npm install
npm run dev
```
