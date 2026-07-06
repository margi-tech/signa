# Signa — Context pentru Claude

Aplicație web PWA de tip „Duolingo pentru Limba Semnelor Române" (LSR).
Recunoașterea semnelor rulează **pe dispozitiv**, fără cloud, fără costuri.

## Stack (fix, nu se schimbă)
- React 18 + Vite 6 + Tailwind CSS v3 — livrat ca PWA via `vite-plugin-pwa`
- MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) — 21 landmarks 3D pe mână
- TensorFlow.js — clasificator de semne (Faza 3, nu e încă în proiect)
- Backend: Node + Express sau Supabase (Faza 5, nu e încă în proiect)

## Structura proiectului
```
src/
├── components/hand-tracker/   # Camera + canvas overlay
│   ├── index.jsx              # HandTracker: cameră, buclă detecție, stări UI
│   └── HandCanvas.jsx         # Desenarea celor 21 de puncte pe canvas
├── hooks/
│   └── useHandLandmarker.js   # Inițializare MediaPipe, expune detect()
├── pages/
│   └── CameraPage.jsx         # Prima pagină — fullscreen camera
└── utils/
    └── normalize.js           # ⚠ CRITICĂ — identică la colectare și predicție
```

## Reguli importante
1. `normalize()` din `src/utils/normalize.js` NU se modifică după ce începe colectarea datelor (Faza 2). Orice schimbare = model inutilizabil.
2. Recunoașterea rămâne **pe dispozitiv** — niciodată imagini în cloud.
3. Stil: mobile-first, dark theme (`slate-900`), accent verde (`signa-400 = #34d399`).
4. Comentariile în română sunt ok.

## Faze de dezvoltare
- **Faza 1** ✅ Camera + 21 puncte MediaPipe + `normalize()`
- **Faza 2** — Colectare dataset LSR (alfabet dactil)
- **Faza 3** — Antrenare clasificator TensorFlow.js + integrare predicție live
- **Faza 4** — Lecții gamificate (referință → imită → feedback → scor)
- **Faza 5** — Backend, conturi, clasament

## Cum rulezi local
```bash
npm install
npm run dev
```
