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
- **Colectare & antrenare** — dataset în browser, export JSON, antrenare TensorFlow.js
- **Scrie cuvântul** — dactilare literă cu literă
- **PWA** — instalabilă, temă cream/friendly, mobile-first

## Stack

| Layer | Tehnologie |
|---|---|
| UI | React 18, Vite 6, Tailwind CSS v3 |
| Tracking | MediaPipe Tasks Vision (Hand + Face + Pose) |
| ML | TensorFlow.js (MLP static + GRU dinamic) |
| Backend | Supabase (scaffold — auth / sync progres) |
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
├── components/     # camera, lecții, predicție, UI
├── hooks/          # landmarker, colectare, clasificator, progres
├── pages/          # Home, Camera, Collect, Train, Lessons, …
├── data/           # alfabet, lecții, cuvinte, reference-poses
├── utils/normalize.js   # ⚠ VECTOR_SIZE 199
└── lib/supabase.js
public/models/      # modele active (TF.js)
docs/               # ghiduri echipă
```

## Documentație

| Document | Rol |
|---|---|
| [`docs/GHID-ANTRENARE-STRICT.md`](docs/GHID-ANTRENARE-STRICT.md) | Ghid scurt colectare + antrenare + test |
| [`docs/tutorial-antrenare-echipa.md`](docs/tutorial-antrenare-echipa.md) | Tutorial detaliat |
| [`docs/colectare-echipa.md`](docs/colectare-echipa.md) | Colectare pe teren |
| [`docs/retrain.md`](docs/retrain.md) | Checklist reantrenare |
| [`docs/mvp-baza-de-date.md`](docs/mvp-baza-de-date.md) | Plan MVP Supabase + Vercel (US #22) |
| [`docs/supabase-setup.md`](docs/supabase-setup.md) | Setup proiect Supabase + chei + Vercel |
| [`ROADMAP.md`](ROADMAP.md) | Stare proiect & priorități |
| [`docs/tutorial-incepatori.md`](docs/tutorial-incepatori.md) | Onboarding fără experiență de cod |

## Git (echipă)

- Lucrați pe **branch-uri**, nu direct pe `main`
- Schimbările ajung pe `main` prin **Pull Request**
- Nu modificați `src/utils/normalize.js` fără anunț

## Confidențialitate

Recunoașterea rulează **local pe dispozitiv**. Nu trimitem imagini/video în cloud — doar vectori numerici în dataset-urile exportate (JSON), dacă le partajați în echipă.

## Licență

Proiect privat — `margi-tech/signa`.
