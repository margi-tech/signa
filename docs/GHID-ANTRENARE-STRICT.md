# Ghid strict — Antrenare modele Signa

**Dataset** = JSON cu exemple (Downloads/Drive).  
**Model** = rezultatul antrenării → `public/models/`.

**1 dataset unit → 1 antrenare → 1 set de modele.**

---

## Interzis

- JSON de colectare în `public/models/`
- Antrenări separate pe litere/cuvinte pe care le „lipești” după
- Upload multiplu pe Antrenare ca să unești (nu unește — **înlocuiește**)
- Dataset vechi (63) — trebuie **199**
- Modificat `normalize.js`

Unirea se face doar: **Colectare → Import**.  
Date noi mâine = Import vechi+nou → **reantrenezi tot** → înlocuiești modelul.

---

## Pași

1. **Colectezi** — Foto (static) / Video (dinamic). Prag recomandat: minimum
   50 Foto / 30 Video per etichetă. Seria automată face 300 Foto sau 50 Video;
   oprește și exportă mai devreme dacă ai acoperirea necesară.
2. **Export** — `signa-dataset-prenume.json` → pe canal.
3. **Unești** (1 persoană) — Import pe rând → Export `signa-dataset-merged.json`.
4. **Antrenezi** — încarci un singur merged → Model static + Model de mișcare → Descarcă.
5. **Instalezi** în `public/models/` (nume exacte, fără `(1)`):


| Static                    | Dinamic                           |
| ------------------------- | --------------------------------- |
| `signa-model.json`        | `signa-model-dynamic.json`        |
| `signa-model.weights.bin` | `signa-model-dynamic.weights.bin` |
| `signa-labels.json`       | `signa-labels-dynamic.json`       |


---



## Test pe dev

```bash
npm run dev
```

1. **Diagnostic** → static/dinamic = „încărcat” (altfel: nume greșite / hard refresh / unregister SW)
2. **Antrenament** → testezi live
  - Foto/static = semn **nemiscat**  
  - Video/dinamic = **mișcarea** ca la colectare  
  - Apare doar ce e în `signa-labels*.json`

**Local:** pui fișierele în `public/models/` → `npm run dev` (fără push).

**Pe** `dev` **(echipă):** commit+push pe `dev` → colegii `git pull` și testează.  
Ultimul push suprascrie modelul — anunțați pe canal.  
Pe `dev` e OK model incomplet; pe `**main**` doar modelul final (dataset unit).