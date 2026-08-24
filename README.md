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
  (300 foto / 50 video), export JSON și antrenare TensorFlow.js
- **Scrie cuvântul** — dactilare literă cu literă
- **Profil social** — identitate de jucător, clasament, follow reciproc și prieteni
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
Colectare (Foto/Video) → Export JSON → Import (unire) → Antrenare → public/models/ → Test
```

1. Fiecare colectează pe etichetele lui și exportă JSON  
2. Un lead unește dataset-urile (**Colectare → Import**)  
3. O singură antrenare pe setul unit  
4. Fișierele modelului merg în `public/models/`  
5. Test: `npm run dev` → Diagnostic → Antrenament  

**Ghid scurt (obligatoriu pentru echipă):** [`docs/GHID-ANTRENARE-STRICT.md`](docs/GHID-ANTRENARE-STRICT.md) · [PDF](docs/GHID-ANTRENARE-STRICT.pdf)

### Reguli pe scurt

- Nu pune JSON-uri de colectare în `public/models/`
- Nu antrena litere separat ca să „lipești” modele — reantrenezi pe tot setul
- Unirea dataset-urilor = **Colectare → Import**, nu pagina Antrenare
- Format dataset: **199** valori (nu 63)
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
├── utils/normalize.js   # ⚠ VECTOR_SIZE 199
├── index.css       # tokeni + animațiile `sg-*`
└── lib/supabase.js
public/models/      # modele active (TF.js)
docs/               # ghiduri echipă
.claude/skills/     # skill-uri de lucru (UI, colectare, social, verificare, git)
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
| `signa-verify` | Verificare, preview, capcane, siguranța datelor de progres |
| `signa-git` | Branch per task, commit, PR, merge |
| `signa-collect` | Cameră holistică, serii automate, dataset, import/export |
| `signa-social` | Follow reciproc, prieteni în Profil, Supabase/RLS |

## Git (echipă)

- Lucrați pe **branch-uri**, nu direct pe `main`
- Schimbările ajung pe `main` prin **Pull Request**
- **Dați commit înainte de a schimba branch-ul** — altfel lucrul ajunge în stash
  și e ușor de pierdut din vedere
- Nu modificați `src/utils/normalize.js` fără anunț

## Confidențialitate

Recunoașterea rulează **local pe dispozitiv**. Nu trimitem imagini/video în cloud — doar vectori numerici în dataset-urile exportate (JSON), dacă le partajați în echipă.

⚠ Progresul (`signa-progress-v2` din `localStorage`) se sincronizează cu Supabase
prin `max()` pe XP/stele. Datele de test scrise local pe o origine autentificată
ajung în contul real și **nu pot fi coborâte** ulterior.

## Licență

Proiect privat — `margi-tech/signa`.
