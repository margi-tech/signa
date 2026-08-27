# Ghid strict — Antrenare modele Signa

**Dataset** = exemplele colectate (în cloud, comune pe echipă).  
**Model** = rezultatul antrenării → `public/models/`.

**1 dataset complet → 1 antrenare → 1 set de modele.**

---

## Interzis

- JSON de colectare în `public/models/`
- Antrenări separate pe litere/cuvinte pe care le „lipești” după
- Dataset vechi (63) — trebuie **199**
- Modificat `normalize.js`
- Colectat „de probă” pe contul tău de colector — setul din cloud e **comun**;
  ce trimiți ajunge în modelul tuturor

Date noi mâine = **reantrenezi tot** → înlocuiești modelul. Nu se lipesc modele.

---

## Pași

1. **Colectezi** — Foto (static) / Video (dinamic). Prag recomandat: minimum
   50 Foto / 30 Video per etichetă. Seria automată face 300 Foto sau 50 Video;
   poți opri mai devreme dacă ai acoperirea necesară.
   Exemplele pleacă singure în setul comun, după ce accepți consimțământul o
   dată. Nu trebuie să exporți și să trimiți nimic pe canal.
2. **Antrenezi** (1 persoană, cu drept de antrenare) — **Antrenare → Încarcă din
   cloud** → Model static + Model de mișcare → Descarcă.
3. **Instalezi** în `public/models/` (nume exacte, fără `(1)`):


| Static                    | Dinamic                           |
| ------------------------- | --------------------------------- |
| `signa-model.json`        | `signa-model-dynamic.json`        |
| `signa-model.weights.bin` | `signa-model-dynamic.weights.bin` |
| `signa-labels.json`       | `signa-labels-dynamic.json`       |


4. **Testezi** (mai jos).

### Dacă nu ai invitație sau lucrezi offline

Fluxul vechi merge în continuare: **Colectare → Export** → un coleg face
**Colectare → Import** pe rând → antrenează pe setul unit. E mai lent și pierde
informația de sesiune (vezi `docs/retrain.md`), deci folosește-l doar ca rezervă.

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