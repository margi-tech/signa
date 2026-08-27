# Tutorial echipă — Colectare + Antrenare fără greșeli

Ghid pas cu pas pentru toată echipa 
Citește-l **înainte** să colectezi sau să antrenezi. Majoritatea problemelor vin din confuzia
dintre **dataset** (datele) și **model** (rezultatul antrenării).

Documente înrudite:

- `docs/colectare-echipa.md` — detalii de cameră / foto / video
- `docs/retrain.md` — checklist scurt la reantrenare

---

## 0. Ideea pe scurt (obligatoriu de înțeles)


| Ce          | Ce este                                              | Unde stă                               |
| ----------- | ---------------------------------------------------- | -------------------------------------- |
| **Dataset** | exemple (vectori 199 / 30×199)                       | cloud comun + backup JSON local        |
| **Model**   | Rețeaua antrenată (3–6 fișiere)                      | `public/models/` în proiect            |


**Regula de aur:**

1. Fiecare colectează pe `https://signa-lsr.online` (după invitație + consimțământ).
2. Un antrenor încarcă **datasetul comun** din cloud și antrenează o dată pe tot.
3. Se pune **un singur set de model** în `public/models/`.

Nu antrenezi „model pentru A” pe un branch și „model pentru B” pe altul.
Nu merge. Modelul trebuie să vadă **toate** literele împreună ca să le deosebească.

JSON export/import rămâne backup dacă ești offline — vezi `docs/colectare-echipa.md`.

---



## 1. Ce NU faceți (capcane frecvente)


| Greșeală                                                           | De ce e greșit                                           | Ce faci în schimb                                                   |
| ------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Antrenez doar C și E, mâine doar A și B, și pun 2 seturi de modele | Modelul din ziua 2 nu „știe” C/E; nu se combină 2 modele | Reantrenezi pe tot setul comun → **înlocuiești** modelul |
| Pun JSON-urile de colectare în `public/models/`                    | Acolo stau doar modelele antrenate                       | Dataset-urile rămân în Downloads / Drive / Discord                  |
| Încarc pe rând 4 JSON-uri pe pagina **Antrenare** ca să le unesc   | Antrenarea **înlocuiește** fișierul, nu unește           | Folosești **Încarcă din cloud**; ca rezervă, unești pe **Colectare → Import** |
| Fiecare pe branch antrenează și dă push la `signa-model.json`      | La merge se calcă unul pe altul; modele incomplete       | Un singur PR cu modelul final, după antrenarea comună               |
| Folosesc un dataset vechi (63 valori)                              | Format incompatibil (acum e 199)                         | Recolectezi; vezi eroarea `VECTOR_SIZE 199`                         |
| Modific `src/utils/normalize.js`                                   | Invalidează tot dataset-ul și modelele                   | Nu atinge fișierul                                                  |


---



## 2. Roluri în echipă


| Rol                                               | Face                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Colector** (invitat în `dataset_members`) | Colectează pe site, acceptă consimțământul |
| **Lead antrenare** (`can_train`)            | Încarcă din cloud, antrenează, PR cu modelul |


Branch-urile Git sunt pentru **cod** (UI, bugfix-uri).  
Datele de colectare **nu trebuie** să treacă prin 4 branch-uri cu modele separate.

---



## 3. Pregătire (o dată pe mașină)

```bash
git checkout main && git pull
npm install
npm run dev
```

Deschide URL-ul din terminal (ex. `http://localhost:5173`).

Verifică pe **Diagnostic** că `VECTOR_SIZE` e **199**.  
Dacă încerci un dataset vechi, vei vedea: *Dataset incompatibil (așteptat VECTOR_SIZE 199)*.

---



## 4. Cum colectezi (fiecare persoană)



### 4.1 Împărțirea alfabetului

Stabiliți pe canal cine face ce, ca să nu dublați inutil și să nu rămână găuri. Exemplu:

- Persoana 1: A–H (static)
- Persoana 2: I–P (static)
- Persoana 3: Q–Z fără J/X/Z (static)
- Persoana 4: litere dinamice J, Z, X, Î, Ș, Ț (video) + Ă, Â

(Adaptați cum vreți — important e să acoperiți totul.)

### 4.2 Pași în app

1. Acasă → **Colectare date**
2. Alege litera (sau scrie o etichetă)
3. **Foto** = litere fără mișcare
  **Video** = litere cu mișcare (J, Z, X, Î, Ș, Ț)
4. Alege manual sau **Serie automată**:
  - Foto: 300 capturi, fiecare pe un rezultat MediaPipe nou (~75 ms minim)
  - Video: 50 secvențe, cu pauză de 1 secundă
  - Prima captură are countdown de 3 secunde; `Escape` oprește seria
5. Ține corpul și mâinile în vizorul fără margini; dacă tracking-ul se pierde,
   seria automată se oprește în loc să repete coordonate vechi
6. Ținte minime:
  - static: **≥ 50** exemple / literă
  - dinamic: **≥ 30** înregistrări video / literă
7. Diversifică: unghi, distanță, lumină, poziție și expresie

Fiecare exemplu salvează **un vector de 199 valori** (mâini + față + cap + trunchi) în același dataset — nu sunt fișiere separate pe parte a corpului.

### 4.3 Export (obligatoriu după fiecare sesiune)

1. Apasă **Export**
2. Salvează fișierul cu numele:

```text
signa-dataset-YYYY-MM-DD-<prenume>.json
```

Exemplu: `signa-dataset-2026-07-31-rares.json`

1. Trimite-l pe canalul echipei (Discord / Drive / etc.)

`localStorage` se poate umple — **exportă des**. Nu te baza doar pe browser.

---



## 5. Cum uniți datele de la toți

**În mod normal nu trebuie să uniți nimic.** Dacă toți colectează invitați și cu
consimțământ acceptat, exemplele sunt deja împreună în setul din cloud, iar
antrenorul le ia direct cu **Antrenare → Încarcă din cloud** (secțiunea 6).

Restul secțiunii e **procedura de rezervă**, pentru situația în care cineva a
colectat offline sau fără invitație. Unirea se face pe pagina **Colectare**, nu
pe Antrenare.

1. Deschide **Colectare** (browser curat sau după ce ai golit dataset-ul local dacă vrei un start curat)
2. **Import** → alege JSON-ul persoanei 1
3. **Import** → JSON persoana 2
4. Repetă pentru toți
5. Verifică inventarul permanent: fiecare literă are suficiente exemple
6. **Export** → salvează un fișier master, ex.:

```text
signa-dataset-2026-07-31-merged.json
```

Importul **adaugă** datele (nu șterge ce ai deja).  
Dacă aceeași literă e la 2 persoane, exemplele se **adună** — e bine (mai multă diversitate).

### Verificare rapidă că e formatul bun

- Fișierul are litere ca chei (`"A"`, `"B"`, …) și `_meta`
- Fiecare exemplu static e o listă de **199** numere (nu 63)
- Pentru dinamice: fiecare exemplu e o **secvență** de cadre, fiecare cadru tot 199

Dacă vezi eroare `VECTOR_SIZE 199` → dataset vechi sau stricat. Nu-l forța.

---



## 6. Cum antrenezi (Lead antrenare)



### 6.1 Pe pagina Antrenare

1. Acasă → **Antrenare model**
2. La „1 – DATASET”, apasă **Încarcă din cloud** — iei tot setul echipei.
  (Rezervă, dacă lucrezi offline: încarcă **un singur** fișier `…-merged.json`.)
3. Alege preset **Standard**
4. Antrenează **Model static** (litere fără mișcare)
5. Dacă ai secvențe video: antrenează și **Model de mișcare**
6. Uită-te la:
  - **Test set (held-out)** — acuratețea pe date nevăzute
  - literele slabe (< ~70%) — mai colectezi exemple pentru alea

> **Cum se citește acuratețea.** Testul e separat pe **sesiuni de colectare**, nu
> pe exemple: toate pozele dintr-o serie automată rămân împreună. Altfel modelul
> ar fi testat pe cadre aproape identice cu cele de antrenament și cifra ar ieși
> fals mare. Datele din cloud au sesiuni; un JSON încărcat local nu are, deci
> acolo procentul e mai optimist decât realitatea.



### 6.2 Descarcă modelul

Apasă **Descarcă modelul**. Primiți în Downloads (browserul poate adăuga `(1)`, `(2)`…):

**Static (obligatoriu împreună):**

- `signa-model.json`
- `signa-model.weights.bin`
- `signa-labels.json`

**Dinamic (dacă ați antrenat mișcarea):**

- `signa-model-dynamic.json`
- `signa-model-dynamic.weights.bin`
- `signa-labels-dynamic.json`



### 6.3 Pune-le în proiect

Copiază în folderul:

```text
public/models/
```

**Redenumește** dacă browserul a pus `(4)` etc. — numele trebuie să fie **exact** cele de mai sus.


| Din Downloads                 | În `public/models/`       |
| ----------------------------- | ------------------------- |
| `signa-model (4).json`        | `signa-model.json`        |
| `signa-model.weights (4).bin` | `signa-model.weights.bin` |
| `signa-labels (4).json`       | `signa-labels.json`       |


- **Înlocuiești** fișierele active.
- **Nu** le pui în `public/models/_legacy-hand-only-63dim/` (arhivă veche).
- **Nu** lași 2 seturi de modele „pe litere diferite”.



### 6.4 Hard refresh

Browserul / PWA poate ține modelul vechi în cache:

- Chrome: DevTools → Application → Service Workers → **Unregister** pe Signa  
- sau DevTools → Network → ✓ Disable cache + reload

Verifică pe **Diagnostic** că modelele apar încărcate și că `signa-labels` conține literele așteptate.

### 6.5 Commit pe git (doar Lead)

```bash
git checkout main && git pull
git checkout -b models/retrain-YYYY-MM-DD
# copiază fișierele în public/models/
git add public/models/signa-model.json public/models/signa-model.weights.bin public/models/signa-labels.json
# + cele dynamic dacă există
git commit -m "Update trained models (holistic v2)"
git push -u origin HEAD
# deschide PR către main
```

Restul echipei: după merge → `git checkout main && git pull`.

---



## 7. Scenarii pe zile (ca să fie clar)



### „Azi am C și E, mâine am A și B”

1. **Azi:** colectezi C, E → Export → păstrezi JSON-ul (poți antrena un model de test doar cu C+E, dar e doar pentru experiment).
2. **Mâine:** colectezi A, B → Export.
3. **Înainte de modelul „bun”:** Import ambele JSON-uri (sau toate de la echipă) → Export merged → Antrenare pe **tot** → înlocuiești `public/models/`.

Modelul de test din ziua 1 (doar C+E) se **aruncă** când ai modelul nou pe alfabetul complet. Nu „adăugi” un al doilea fișier de model.

### „4 oameni, 4 branch-uri”

- OK: fiecare lucrează features pe branch-ul lui.
- OK: fiecare trimite `signa-dataset-…-prenume.json` pe canal.
- Greșit: 4 antrenări → 4 push-uri pe `public/models/signa-model.*`.

---



## 8. Checklist înainte să spui „gata”

- [ ] Toate literele țintă au ≥ 50 (static) / ≥ 30 (dinamic) exemple
- [ ] Dataset-urile sunt format **199**, nu 63
- [ ] Există un `…-merged.json` cu tot
- [ ] O singură antrenare pe merged
- [ ] Cele 3 (sau 6) fișiere sunt în `public/models/` cu numele exacte
- [ ] Diagnostic OK după hard refresh
- [ ] PR pe `main` doar cu modelul final (nu cu 10 JSON-uri de colectare amestecate)

---



## 9. FAQ

**Pot pune mai multe JSON-uri în** `public/models/`**?**  
Nu pentru colectare. Acolo e un set de model (static ± dinamic). Dataset-urile stau în afara proiectului (sau într-un folder `datasets/` separat, dacă decideți voi — dar app-ul citește doar `public/models/`).

**Antrenarea de pe pagina Antrenare unește fișiere?**  
Nu. Un upload = un dataset. Unești pe Colectare → Import.

**Conturile Git diferite strică ceva?**  
Nu, dacă urmați fluxul: date pe canal → un lead antrenează → un PR cu modelul.

**Am antrenat doar 2 litere. E ok?**  
Doar ca test. În app, modelul va recunoaște practic doar acele litere. Pentru lecții/alfabet, trebuie reantrenare pe setul complet.

**Ce fac dacă Import eșuează?**  
Citește mesajul. Cel mai des: format vechi (63) sau JSON corupt. Nu amesteca dataset vechi cu nou.