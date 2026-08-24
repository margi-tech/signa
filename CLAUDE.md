# Signa — Context pentru Claude

Aplicație web PWA de tip „Duolingo pentru Limba Semnelor Române" (LSR).
Recunoașterea semnelor rulează **pe dispozitiv**, fără cloud, fără costuri.

## Stack (fix, nu se schimbă)
- React 18 + Vite 6 + Tailwind CSS v3 — livrat ca PWA via `vite-plugin-pwa`
- MediaPipe (`@mediapipe/tasks-vision`) — Hand Landmarker (21 pct/mână) + Face Landmarker
  (blendshapes + orientare cap) + Pose Landmarker (trunchi) — tracking holistic, nu doar mâini
- TensorFlow.js — clasificator MLP (poze statice) + GRU (semne cu mișcare), antrenate în browser
- Backend: Supabase live — auth, profil, progres, clasament și social
  (`src/lib/supabase.js` + `supabase/schema.sql`)

## Structura proiectului
```
src/
├── components/
│   ├── AppShell.jsx           # shell persistent: sidebar + tranziții între ecrane
│   ├── Sidebar.jsx            # meniu, capitole, unelte, card nivel, rând profil
│   ├── icons.jsx              # SVG-uri partajate (nav, unelte, conținut)
│   ├── hand-tracker/          # Camera + canvas overlay
│   ├── collect/               # LetterSelector
│   ├── lesson/                # ReferenceHand (static + animat) + ReferenceHand3D
│   ├── prediction/            # PredictionOverlay
│   ├── auth/                  # AuthPanel, AuthUi, ProfileDashboard, AuthGate
│   ├── collect/               # selector + inventar permanent pentru dataset
│   ├── FriendsSection.jsx     # social integrat în Profil
│   ├── FriendsList.jsx, UserSearch.jsx, UserProfile.jsx, UserRow.jsx, FollowButton.jsx
│   └── ui/                    # Confetti
├── hooks/
│   ├── useHolisticLandmarker.js
│   ├── useDatasetCollector.js
│   ├── useClassifier.js
│   ├── useProgress.js         # XP, stele, streak, nivel, mastery
│   ├── useProgressSync.js     # merge max(XP/stele) cu Supabase
│   ├── useProfileSummary.js   # nume, inițiale, avatar, rang — chemat o dată din shell
│   └── useCountUp.js          # contoare animate
├── pages/                     # Home, Camera, Collect, Train, Lessons, Lesson, Spell,
│                              # Review, Diagnostic, Profile, Leaderboard, ReferinteCatalog
├── data/                      # lsr-alphabet, lessons, words, reference-poses
├── lib/supabase.js
└── utils/
    ├── normalize.js           # ⚠ CRITICĂ — VECTOR_SIZE 199
    └── playerMeta.js          # nivel/rang/metadate vizuale comune socialului
```

### Shell vs. ecrane full-screen
**Acasă, Lecții, Cameră, Clasament și Profil** trăiesc în `AppShell` — au sidebar comun și tranziție
între ele. Nu-și pun singure sidebar sau scroll (produce scroll dublu); rădăcina
lor e `min-h-full`, scroll-ul îl face `<main>`-ul shell-ului.

**Lecție, Colectare, Train, Diagnostic și Referințe** rămân full-screen, randate
direct din `App.jsx`.

## Reguli importante
1. `normalize()` din `src/utils/normalize.js` NU se modifică fără anunț explicit —
   orice schimbare invalidează datele/modelele. Contract v2: 199 valori.
2. Recunoașterea rămâne **pe dispozitiv** — niciodată imagini în cloud.
3. Stil: **temă cream/friendly** (`cream`, `ink`, accent `signa-*`), font Nunito.
   Ecranele de shell sunt desktop-first (breakpoint `lg`); restul, mobile-first.
4. Comentariile în română sunt ok.
5. Literele dinamice (J, Z, X, Î, Ș, Ț) = secvențe `SEQ_FRAMES`.
6. Animațiile sunt CSS pur, cu keyframes `sg-*` din `src/index.css`. **Fără
   librării de animație.** Refolosește keyframe-urile existente.
7. ⚠ **Nu scrie în `localStorage` cheia `signa-progress-v2` pe o origine cu
   sesiune Supabase activă.** Sync-ul face `max()` și urcă datele în contul real,
   fără cale de întoarcere. Vezi skill-ul `signa-verify`.
8. Colectare: 300 foto / 50 filmări per serie automată; foto așteaptă un cadru
   MediaPipe nou (~75 ms minim), video are pauză 1 s. Camera folosește `cover`.
9. Prietenii sunt integrați în `ProfileDashboard` prin `FriendsSection`; fără
   rută/sidebar `friends`.

## Verificare
```bash
npm install
npm run dev
npm test          # vitest — 34 teste
npx vite build
```
**Nu există `npm run lint` și nici `tsc`** — proiectul e JS curat. Dacă o cerință
le menționează, spune că nu se aplică și rulează testele + build-ul.

## Skill-uri
`.claude/skills/` — invocă-le după caz:
- **signa-ui** — UI, layout, animații, tokeni, arhitectura de shell
- **signa-verify** — comenzi de verificare, preview, capcane, siguranța datelor
- **signa-git** — branch per task, commit, PR, merge, recuperare din stash
- **signa-collect** — cameră holistică, serii automate, dataset, import/export
- **signa-social** — follow reciproc, prieteni în Profil, Supabase/RLS

## Faze
- Faza 1–4 ✅ (camera holistică, colectare, train, lecții)
- Faza 4.5 🚧 (pipeline GRU gata; lipsește recolectare + modele active în `public/models/`)
- Faza 5 — Supabase live; deploy Vercel blocat de contul echipei

Vezi `ROADMAP.md` pentru starea bifelor și `ARHITECTURA.md` pentru viziunea de produs.
