# Signa — Context pentru Claude

Aplicație web PWA de tip „Duolingo pentru Limba Semnelor Române" (LSR).
Recunoașterea semnelor rulează **pe dispozitiv**, fără cloud, fără costuri.

## Stack (fix, nu se schimbă)
- React 18 + Vite 6 + Tailwind CSS v3 — livrat ca PWA via `vite-plugin-pwa`
- MediaPipe (`@mediapipe/tasks-vision`) — Hand Landmarker (21 pct/mână) + Face Landmarker
  (blendshapes + orientare cap) + Pose Landmarker (trunchi) — tracking holistic, nu doar mâini
- TensorFlow.js — clasificator MLP (poze statice) + GRU (semne cu mișcare), antrenate în browser
- Backend: Supabase live — auth, profil, progres, clasament, social și datasetul
  colaborativ (`src/lib/supabase.js` + `supabase/schema.sql`)

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
│   ├── useDatasetAccess.js    # capabilități colector/antrenor (dataset_members)
│   ├── useDatasetCloudSync.js # coadă locală → append_dataset_batch, sesiuni
│   ├── useClassifier.js
│   ├── useProgress.js         # XP, stele, streak, nivel, mastery
│   ├── useProgressSync.js     # progres server-authoritative + coadă offline per user
│   ├── useProfileSummary.js   # nume, avatar, rang, rol admin — chemat o dată din shell
│   └── useCountUp.js          # contoare animate
├── pages/                     # Home, Camera, Collect, Train, Lessons, Lesson, Spell,
│                              # Review, Diagnostic, Profile, Leaderboard, ReferinteCatalog
├── data/                      # lsr-alphabet, lessons, words, reference-poses
├── lib/
│   ├── supabase.js            # client + profil, avatar, social
│   ├── dataset.js             # dataset colaborativ: coadă, loturi, RPC-uri
│   └── authErrors.js          # erori Supabase → mesaje în română
└── utils/
    ├── normalize.js           # ⚠ CRITICĂ — VECTOR_SIZE 199
    ├── datasetValidation.js   # vectori finiți + secvențe SEQ_FRAMES
    ├── parseTrainDataset.js   # JSON/loturi cloud → seturi de antrenare + grupuri
    ├── trainModel.js          # MLP + GRU, split pe sesiuni, augmentare
    ├── readJsonFile.js        # import JSON cu limită de dimensiune
    ├── username.js            # validatori pentru nume/username/email/parolă
    ├── faceFrame.js           # cadranul de față
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
7. ⚠ **Nu scrie în `localStorage` cheile de progres pe o origine cu sesiune
   Supabase activă.** XP/streak/lecțiile sunt acordate de
   `record_lesson_completion`; evenimentele offline sunt legate de `userId`.
   Vezi skill-ul `signa-verify`.
8. Colectare: 300 foto / 50 filmări per serie automată; foto așteaptă un cadru
   MediaPipe nou (~75 ms minim), video are pauză 1 s. Camera folosește `cover`.
9. Prietenii sunt integrați în `ProfileDashboard` prin `FriendsSection`; fără
   rută/sidebar `friends`.
10. Colectare și Train: cu Supabase, rutele rămân interne. Diagnostic e
    `role = 'admin'`. Colectorii/antrenorii se invită în `dataset_members`
    (SQL), nu prin `profiles.role`. Fără Supabase, uneltele rămân deschise.
11. Clientul nu poate scrie rolul, XP-ul sau streak-ul direct. Nu slăbi trigger-ele,
    RPC-urile ori granturile din `supabase/schema.sql`.
12. Datasetul din cloud e **comun pe toată echipa**: cu `can_collect` și
    consimțământ dat, capturile pleacă automat în `dataset_batches`. Nu genera
    exemple de test pe un cont real de colector. Coada locală e
    `signa-dataset-pending-v1`, per user; `signa-dataset-v1` rămâne intact.
13. `session_id`-ul din loturi e grupul pe care se face split-ul train/test.
    Nu-l unifica și nu-l genera o singură dată per user — altfel acuratețea
    raportată devine falsă (vezi skill-ul `signa-train`).

## Verificare
```bash
npm install
npm run dev
npm test          # vitest — 60 de teste, 13 fișiere
npx vite build
```
**Nu există `npm run lint` și nici `tsc`** — proiectul e JS curat. Dacă o cerință
le menționează, spune că nu se aplică și rulează testele + build-ul.

## Skill-uri
`.claude/skills/` — invocă-le după caz:
- **signa-ui** — UI, layout, animații, tokeni, arhitectura de shell
- **signa-verify** — comenzi de verificare, preview, capcane, siguranța datelor
- **signa-git** — branch per task, commit, push, PR, merge, recuperarea muncii pierdute
- **signa-collect** — cameră holistică, serii automate, dataset local + cloud
- **signa-train** — MLP/GRU, split pe sesiuni, augmentare, export în `public/models/`
- **signa-auth** — login/signup, resetare parolă, login cu Google, `handle_new_user`
- **signa-social** — follow reciproc, prieteni în Profil, Supabase/RLS

## Faze
- Faza 1–4 ✅ (camera holistică, colectare, train, lecții)
- Faza 4.5 🚧 (pipeline GRU gata; lipsește recolectare + modele active în `public/models/`)
- Faza 5 ✅ Supabase live, aplicația publică pe `https://signa-lsr.online`
- Faza 5.5 ✅ dataset colaborativ: echipa colectează în același set din cloud,
  cu capabilități și consimțământ, iar antrenarea face split pe sesiuni
- În curs: login cu Google (cod gata, provider neconfigurat încă în Supabase —
  vezi `docs/supabase-setup.md` §8)

Vezi `ROADMAP.md` pentru starea bifelor și `ARHITECTURA.md` pentru viziunea de produs.
