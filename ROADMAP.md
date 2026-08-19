# Signa — Foaie de parcurs către o aplicație funcțională

Document de lucru, actualizat 28 iul 2026 (sesiune overnight pe `dev`).
Organizat pe priorități, nu pe faze cronologice — unele lucruri se pot face în paralel.

---

## 0. Stare curentă (rezumat)

- **Tracking**: Hand + Face + Pose Landmarker (MediaPipe), rulează simultan, holistic
- **normalize() v2**: vector de 199 valori (mâini 126 + față 52 + cap 3 + trunchi 18) + prag visibility 0.5
- **Colectare**: `CollectPage` — orice etichetă, foto/video, overview dataset, import/export
- **Antrenare**: `TrainPage` — MLP + GRU, held-out test set, litere slabe pe test
- **Predicție live**: `CameraPage` — static + dinamic, confidence + margin
- **Lecții**: 6 lecții (5 static + 1 dinamic), hold-to-validate, XP + stele + streak + nivel
- **Extra MVP**: Scrie cuvântul, onboarding, repetiție, diagnostic, confetti/sunete
- **⚠ Dataset/modele vechi** — arhivate în `public/models/_legacy-hand-only-63dim/` — **recolectare încă necesară**

---

## 1. Blocante — nimic altceva nu are sens fără astea

### 1.1 Prag de `visibility` pentru punctele de trunchi
- [x] Implementat: `POSE_VISIBILITY_MIN = 0.5` în `normalizePose()` — puncte estimate → zero

### 1.2 Recolectare COMPLETĂ a datasetului (doar David / echipa, nu Claude)
- [ ] **Încă necesar (uman + cameră)** — ghid: `docs/colectare-echipa.md`

### 1.3 Reantrenare model static + GRU dinamic
- [ ] **După 1.2** — UI + evaluare test set gata; procedura: `docs/retrain.md`

### 1.4 Regenerare `reference-poses.json`
- [ ] **După 1.2** — încă pe formatul vechi 63-dim; `ReferenceHand` degradează grațios

---

## 2. Design vizual — cerut explicit

- [x] Paletă light/friendly (`cream`, `ink`, `signa`) în Tailwind
- [x] Tipografie Nunito, colțuri rotunjite, umbre calde
- [x] Trecere Home / Lessons / Lesson / Collect / Train / Spell / Review / Diagnostic / Onboarding
- [x] Camera rămâne video natural; chrome-ul UI e cream/white
- [x] Brand verde `signa` păstrat pe fundal luminos
- [x] PWA icons + theme-color cream

---

## 3. Funcționalitate

- [x] Lecția 6 pentru litere dinamice (UI + predicție GRU când modelul există)
- [x] `ReferenceHand` animat pe secvențe (`frames` prop)
- [x] Vocabular MVP + „Scrie cuvântul" (`src/data/words.js`, `SpellPage`)
- [x] Strategie cuvinte documentată (`docs/strategie-cuvinte.md`)
- [ ] Lecții cuvinte-semn (gest unic) — după recolectare + model separat

---

## 4. Backend & autentificare (Faza 5)

- [x] Scaffold: `src/lib/supabase.js`, `.env.example`, `supabase/schema.sql` (RLS)
- [x] UI Profil (login/register) + Clasament (live când e configurat)
- [x] Sync progres cu merge max(XP/stele) — `useProgressSync.js`
- [x] Proiect Supabase live (`signa`, EU) + sync automat după lecție și la login
- [ ] Deploy public Vercel (pauză: Hobby + colaborare pe repo privat)

---

## 5. Calitate & robustețe

- [x] Erori cameră / CDN MediaPipe cu mesaje acționabile + reload
- [x] Pagină Diagnostic (FPS, modele, UA)
- [x] Teste automate: `normalize`, validatori dataset, levels (`npm test`)
- [ ] Profilare pe telefon real (necesită dispozitiv)
- [ ] Testare mobil Safari/Chrome pe teren

---

## 6. Echipă & proces

- [x] Ghid colectare pentru Rareș/Cătălin: `docs/colectare-echipa.md`
- [x] ROADMAP pe branch `dev` (PR către `main` — de deschis de David)
- [ ] Sync Taiga #5–12 cu Paula (proces, nu cod)

---

## 7. PWA / deployment

- [x] Icons 192/512, theme cream, cache modele NetworkFirst
- [x] `vercel.json` pregătit pentru deploy static
- [ ] Deploy efectiv + test offline pe hosting (necesită cont/permisiuni)

---

## Ordinea rămasă

1. **David/echipa**: 1.2 recolectare (blocant)
2. **După date**: 1.3 + 1.4 (reantrenare + referințe)
3. **Oricând**: Supabase live, deploy Vercel, teste pe telefon
4. **Mai târziu**: lecții cuvinte-semn, clasament social
