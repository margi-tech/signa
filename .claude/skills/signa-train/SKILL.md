---
name: signa-train
description: Antrenează sau modifică pipeline-ul de modele Signa — TrainPage, MLP static, GRU dinamic, split pe sesiuni, augmentare, export în public/models. Folosește când lucrezi la TrainPage, trainModel.js, parseTrainDataset.js, la încărcarea datasetului din cloud sau când o acuratețe raportată pare prea bună.
---

# Antrenare în Signa

`TrainPage` e full-screen, randat direct din `App.jsx` (nu în `AppShell`).
Antrenarea rulează în browser, cu TensorFlow.js. Nu există pas de server.

## ⚠ Regula care contează cel mai mult: split pe sesiuni, nu pe exemple

`groupedSplit(y, groups, testRatio)` din `src/utils/trainModel.js` ține **toate
exemplele dintr-o sesiune de colectare împreună** — ori tot grupul în train, ori
tot în test.

De ce: o serie automată produce 300 de foto la câteva zeci de milisecunde
distanță, din aceeași poziție, cu aceeași lumină și aceeași mână. Sunt aproape
duplicate. Un split pe exemplu pune cvasi-duplicate de-o parte și de alta, iar
modelul „recunoaște" cadrul vecin, nu litera. Acuratețea de test iese fals mare.

- Grupurile vin din `session_id`-ul loturilor din cloud, propagat prin
  `parseBatchesToTrainSets()` în câmpul `groups`.
- **Un JSON importat local nu are `groups`** → `groupedSplit` cade automat pe
  `stratifiedSplit`. Acuratețea raportată pe un import local e deci optimistă;
  spune asta când raportezi cifre, nu o prezenta ca performanță reală.
- Fallback-ul se aplică și când `groups.length !== y.length`, și când split-ul ar
  ieși degenerat (test sau train gol). Nu „repara" fallback-ul făcându-l strict —
  un set mic cu o singură sesiune per clasă trebuie totuși să poată antrena.
- O clasă cu o singură sesiune rămâne integral în train. E intenționat: mai bine
  fără test pe clasa aia decât un test care măsoară zgomot.

Dacă vezi acuratețe de test suspect de mare (>99% pe date reale de cameră),
verifică **întâi** dacă grupurile au ajuns până la split, nu arhitectura.

## Sursele de date

| Sursă | Cum intră | Grupuri |
|---|---|---|
| Cloud (dataset comun) | `loadCloudTrainSets()` → `fetch_dataset_batches` | da, pe `session_id` |
| JSON exportat din Colectare | `parseRawDataset()` | nu |

- `entriesToTrainSet()` cere **minimum 2 clase**; cu una singură întoarce `null`
  și UI-ul nu trebuie să pornească antrenarea.
- Statice și dinamice se separă prin `isDatasetVector` / `isDatasetSequence`, nu
  prin numele etichetei. O etichetă poate avea ambele tipuri.
- Butonul „Încarcă din cloud" apare doar cu `canLoadCloud` (adică `canTrain` +
  Supabase configurat). Vezi `signa-collect` pentru capabilități.

## Cele două modele

| | Static | Dinamic |
|---|---|---|
| Constructor | `buildStaticModel(tf, nClasses)` | `buildDynamicModel(tf, nClasses)` |
| Intrare | vector 199 | secvență `SEQ_FRAMES` × 199 |
| Arhitectură | MLP | GRU |
| Augmentare | `augmentStatic`, sigma `0.015` | `augmentSequence`, sigma `0.012` |
| Fișiere | `signa-model.*` + `signa-labels.json` | `signa-model-dynamic.*` + `signa-labels-dynamic.json` |

- `expandWithAug(X, y, aug, kind)` multiplică setul cu zgomot gaussian. Augmentarea
  se aplică **numai pe train**, niciodată pe test — altfel testul nu mai e held-out.
- `classWeights(y, nClasses)` compensează dezechilibrul; nu-l scoate „ca să fie
  mai simplu" când unele litere au de 5× mai multe exemple.

## Export către `public/models/`

Modelul se salvează cu `model.save('downloads://<nume>')`, iar etichetele se
descarcă separat ca JSON care conține și `vectorSize: VECTOR_SIZE`.

`vectorSize` e verificat la încărcare (`useClassifier`). Un model antrenat pe alt
contract de vector e respins în loc să dea predicții aiurea — de asta câmpul
trebuie să rămână în fișierul de etichete.

Fișierele finale merg în `public/models/`:

```
signa-model.json  signa-model.weights.bin  signa-labels.json
signa-model-dynamic.json  signa-model-dynamic.weights.bin  signa-labels-dynamic.json
```

**Nu edita niciodată manual `public/models/*.json`.** Nu pune JSON-uri de
colectare acolo — sunt fișiere diferite cu extensii asemănătoare.

## Ce să nu faci

1. Nu antrena litere separat ca să „lipești" modele. Reantrenezi pe tot setul.
2. Nu atinge `src/utils/normalize.js` (contract v2, 199 valori) — invalidează
   toate dataseturile și modelele existente deodată.
3. Nu raporta acuratețea de train ca rezultat. Cifra care contează e pe test set,
   și numai când split-ul a fost pe grupuri.
4. Nu scoate pragul de minim 2 clase și nu relaxa validatorii ca să „treacă" un
   dataset stricat.

## Verificare

`npm test` acoperă `trainModel` (split-uri, augmentare, class weights) și
`parseTrainDataset`. Rulează-l după orice atingere a split-ului — testele de
grup sunt exact plasa de siguranță pentru capcana de mai sus.

Antrenarea în sine cere un browser real: preview-ul ascuns throttle-uiește
timer-ele și nu e o măsură validă pentru durata unei epoci. Vezi `signa-verify`.
