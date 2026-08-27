# Signa

**Duolingo pentru Limba Semnelor Române (LSR).**  
Aplicație web PWA care recunoaște semnele **pe dispozitiv** — fără cloud, fără costuri pe imagine.

<p align="center">
  <img src="public/icon-512.png" alt="Signa" width="96" />
</p>

## Ce face

- **Tracking holistic** — mâini, față și trunchi (MediaPipe), nu doar o mână
- **Predicție live** — litere statice (MLP) + semne cu mișcare (GRU), în browser
- **Lecții + XP** — progres, stele, streak, nivel
- **Colectare & antrenare** — cameră holistică, inventar permanent, serii automate
  (300 foto / 50 video) și antrenare TensorFlow.js în browser
- **Dataset colaborativ** — echipa colectează în același set din cloud (doar
  vectori numerici, cu consimțământ), fără unire manuală de JSON-uri
- **Scrie cuvântul** — dactilare literă cu literă
- **Profil social** — identitate de jucător, clasament, follow reciproc și prieteni
- **Cont securizat** — recuperare parolă, ștergere cont și avataruri validate
- **PWA** — instalabilă, temă cream/friendly, mobile-first

## Stack

| Layer | Tehnologie |
|---|---|
| UI | React 18, Vite 6, Tailwind CSS v3 |
| Tracking | MediaPipe Tasks Vision (Hand + Face + Pose) |
| ML | TensorFlow.js (MLP static + GRU dinamic) |
| Backend | Supabase (auth, profil, progres, clasament și relații sociale) |
| Livrare | PWA (`vite-plugin-pwa`) |

Contract critic: `normalize()` → vector de **199** valori. Nu se modifică fără acordul echipei — invalidează datele și modelele.

## Pornire rapidă

```bash
git clone https://github.com/margi-tech/signa.git
cd signa
npm install
npm run dev
```

Deschide URL-ul din terminal (de obicei `http://localhost:5173`).

```bash
npm test      # teste
npm run build # build producție
```

### Modele

Modelele antrenate stau în `public/models/`:

- Static: `signa-model.json` + `.weights.bin` + `signa-labels.json`
- Dinamic: `signa-model-dynamic.*` + `signa-labels-dynamic.json`

Fără aceste fișiere, predicția nu e disponibilă. Vezi ghidul de antrenare mai jos.

## Flux pentru echipă (date + modele)

```
Colectare (Foto/Video) → sync automat în cloud → Train „Încarcă din cloud"
   → public/models/ → Test
```

1. Fiecare e invitat în `dataset_members` și acceptă consimțământul în aplicație  
2. Colectează pe etichetele lui — exemplele se trimit singure, în fundal  
3. Un antrenor apasă **Train → Încarcă din cloud** și antrenează pe setul comun  
4. Fișierele modelului merg în `public/models/`  
5. Test: `npm run dev` → Diagnostic → Antrenament  

Fluxul vechi (export JSON → **Colectare → Import** → antrenare) încă
funcționează offline sau fără invitație, dar nu mai e calea normală.

**Ghid scurt (obligatoriu pentru echipă):** [`docs/GHID-ANTRENARE-STRICT.md`](docs/GHID-ANTRENARE-STRICT.md)

### Reguli pe scurt

- Nu pune JSON-uri de colectare în `public/models/`
- Nu antrena litere separat ca să „lipești” modele — reantrenezi pe tot setul
- Format dataset: **199** valori (nu 63)
- Nu colecta „de test" pe un cont invitat — setul din cloud e comun pe toată echipa
- Pe `main`: modelul final. Pe `dev`/local: teste OK

## Structură

```
src/
├── components/     # AppShell + Sidebar (shell persistent), icons,
│                   # camera, lecții, predicție, auth, social, UI
├── hooks/          # landmarker, colectare, clasificator, progres, profil
├── pages/          # Home, Camera, Collect, Train, Lessons, Lesson, Spell,
│                   # Review, Diagnostic, Profile, Leaderboard, Referințe
├── data/           # alfabet, lecții, cuvinte, reference-poses
├── utils/          # normalize (⚠ VECTOR_SIZE 199), validatori, antrenare,
│                   # parsare dataset, validări de cont
├── index.css       # tokeni + animațiile `sg-*`
└── lib/            # supabase, dataset colaborativ, mesaje de eroare
public/models/      # modele active (TF.js)
supabase/           # schema.sql, dataset-collab.sql, storage-avatars.sql
docs/               # ghiduri echipă
.claude/skills/     # skill-uri de lucru (UI, colectare, antrenare, auth,
                    # social, verificare, git)
```

**Acasă / Lecții / Cameră / Clasament / Profil** stau într-un shell comun
(`AppShell` + `Sidebar`), cu tranziție între ele. Prietenii sunt o secțiune din
Profil. Lecția, Colectarea, Train, Diagnostic și Referințe rămân full-screen.

## Documentație

| Document | Rol |
|---|---|
| [`docs/GHID-ANTRENARE-STRICT.md`](docs/GHID-ANTRENARE-STRICT.md) | Ghid scurt colectare + antrenare + test |
| [`docs/tutorial-antrenare-echipa.md`](docs/tutorial-antrenare-echipa.md) | Tutorial detaliat |
| [`docs/colectare-echipa.md`](docs/colectare-echipa.md) | Colectare pe teren |
| [`docs/retrain.md`](docs/retrain.md) | Checklist reantrenare |
| [`docs/mvp-baza-de-date.md`](docs/mvp-baza-de-date.md) | Plan MVP Supabase + Vercel (US #22) |
| [`docs/supabase-setup.md`](docs/supabase-setup.md) | Setup proiect Supabase + chei + Vercel |
| [`FRIENDS.md`](FRIENDS.md) | Modelul follow/prietenie și integrarea socială în Profil |
| [`ROADMAP.md`](ROADMAP.md) | Stare proiect & priorități |
| [`docs/tutorial-incepatori.md`](docs/tutorial-incepatori.md) | Onboarding fără experiență de cod |
| [`ARHITECTURA.md`](ARHITECTURA.md) | Viziune de produs, model de date, faze |
| [`CLAUDE.md`](CLAUDE.md) | Context pentru lucrul cu Claude Code |

### Skill-uri (`.claude/skills/`)

| Skill | Când |
|---|---|
| `signa-ui` | Ecrane, layout, animații, tokeni, shell |
| `signa-verify` | Verificare, preview, capcane, siguranța datelor |
| `signa-git` | Branch per task, commit, push, PR, merge, recuperare |
| `signa-collect` | Cameră holistică, serii automate, dataset local + cloud |
| `signa-train` | MLP/GRU, split pe sesiuni, export în `public/models/` |
| `signa-auth` | Login/signup, resetare parolă, login cu Google |
| `signa-social` | Follow reciproc, prieteni în Profil, Supabase/RLS |

## Git (echipă)

- Lucrați pe **branch-uri**, nu direct pe `main`
- Schimbările ajung pe `main` prin **Pull Request**
- **Dați commit înainte de a schimba branch-ul** — altfel lucrul ajunge în stash
  și e ușor de pierdut din vedere
- Nu modificați `src/utils/normalize.js` fără anunț

## Confidențialitate

Recunoașterea rulează **local pe dispozitiv**. Imaginile și filmările nu pleacă
niciodată de pe dispozitiv — nu sunt trimise și nu sunt stocate nicăieri.

Ce ajunge în cloud, pentru membrii invitați la datasetul colaborativ și **numai
după consimțământ explicit în aplicație**: vectorii numerici normalizați (199 de
valori per captură statică, `SEQ_FRAMES × 199` per filmare). Din ei nu se poate
reconstrui imaginea. Până accepți, exemplele rămân într-o coadă locală, iar
ecranul de Colectare o spune explicit.

XP-ul, streak-ul și lecțiile sunt validate și acordate în Supabase prin
`record_lesson_completion`; clientul nu poate suprascrie direct scorurile.
Finalizările offline sunt păstrate într-o coadă locală legată de utilizator.
Nu injecta totuși date de test în cheile `signa-progress-*` ale unei sesiuni reale.

## Licență

Proiect privat — `margi-tech/signa`.
