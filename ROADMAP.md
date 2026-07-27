# Signa — Foaie de parcurs către o aplicație funcțională

Document de lucru, actualizat 27 iul 2026. Organizat pe priorități, nu pe faze cronologice —
unele lucruri se pot face în paralel.

---

## 0. Stare curentă (rezumat)

- **Tracking**: Hand + Face + Pose Landmarker (MediaPipe), rulează simultan, holistic
- **normalize() v2**: vector de 199 valori (mâini 126 + față 52 + cap 3 + trunchi 18)
- **Colectare**: `CollectPage` — orice etichetă (literă sau cuvânt), foto sau video, localStorage + import/export JSON
- **Antrenare**: `TrainPage` — MLP static + GRU dinamic, ambele antrenate în browser
- **Predicție live**: `CameraPage` — combină static + dinamic, cu prag de mișcare
- **Lecții**: 5 lecții × 5 litere, hold-to-validate, XP + stele (localStorage)
- **⚠ Dataset/modele vechi (25 litere, 2 iul) ARHIVATE** — incompatibile cu normalize() v2, arhivate în `public/models/_legacy-hand-only-63dim/`

---

## 1. Blocante — nimic altceva nu are sens fără astea

### 1.1 Prag de `visibility` pentru punctele de trunchi
PoseLandmarker întoarce mereu toate cele 33 de puncte, chiar și pentru părți din afara
cadrului — le *estimează*, nu le vede. Momentan `normalize()` le tratează ca reale.
**Fix**: în `normalizePose()`, dacă `visibility < prag (~0.5)` pentru oricare din cele 6
puncte folosite, tratăm punctul ca zero (la fel ca o mână absentă). Fără asta, datele
recoltate cu trunchi parțial vizibil vor introduce zgomot direct în model.

### 1.2 Recolectare COMPLETĂ a datasetului (doar David / echipa, nu Claude)
Tot alfabetul (25 litere statice + J/Z/X/Î/Ș/Ț dinamice) trebuie recoltat de la zero în
noul format holistic. Codul de colectare e deja pregătit (surprinde automat mâini+față+
trunchi la fiecare captură) — nu e nimic nou de construit aici, doar de făcut efectiv,
cu camera, de o persoană. **Recomandare**: împarte colectarea cu echipa (Rareș, Cătălin) —
mai multe persoane = model mai robust la variații de mână/față.

### 1.3 Reantrenare model static + GRU dinamic
După 1.2, rulează `TrainPage` pe dataset-ul nou complet. Verifică acuratețea de
validare per literă (folosește metoda de diagnostic din sesiune: rulează manual
modelul pe un eșantion din date și verifică literele cu acuratețe scăzută, cum am
făcut cu V/W/Y).

### 1.4 Regenerare `reference-poses.json`
Schelet-ul de referință din lecții (`ReferenceHand`) e construit pentru formatul vechi
(63 valori/o mână) — după recolectare, trebuie regenerat (extras din noul dataset,
metoda medoid ca înainte) ca lecțiile să arate din nou schelete corecte.

---

## 2. Design vizual — cerut explicit, nu e făcut încă

**Cerința lui David**: aplicația arată "robotică"; vrea un aspect mult mai prietenos,
cu **culori mai deschise**, nu doar dark theme sumbru.

- [ ] Definirea unei a doua palete (light/friendly) — sau un mod luminos ca alternativă
      la `slate-900`/`#070b10` actual
- [ ] Tipografie/spațiere mai "calde" — colțuri mai rotunjite, poate ilustrații/iconițe
      mai jucăușe în loc de geometrie strictă
- [ ] Trecere prin toate paginile: HomePage, CameraPage, CollectPage, TrainPage,
      LessonsPage, LessonPage, PredictionOverlay, ReferenceHand
- [ ] Păstrarea identității de brand (verde `signa-400`) dar reechilibrată într-un
      context mai puțin "terminal/cod" și mai "aplicație de învățare"

*(Această secțiune e cea mai sigură de atacat autonom peste noapte — nu are nevoie
de date noi de la David, doar de editare de cod/stil.)*

---

## 3. Funcționalitate incompletă

- [ ] **Literele dinamice** — J, Z, X, Î, Ș, Ț: colectare+antrenare sub noul format
      (parte din blocantul 1.2/1.3), plus integrarea lor în `LessonsPage` (Lecția 6?)
- [ ] **Referință vizuală pentru semne dinamice** — `ReferenceHand` arată doar o poză
      statică; un semn cu mișcare ar avea nevoie de o mică animație/succesiune de cadre
- [ ] **Vocabular dincolo de alfabet** — `useDatasetCollector` acceptă deja orice
      etichetă (cuvinte, nu doar litere), dar `LessonsPage`/`lessons.js` sunt încă
      hardcodate pe alfabet. De discutat cu Paula (backlog Taiga #5-8, "definirea
      conținutului educațional") cum se leagă alfabetul de cuvinte reale LSR.

---

## 4. Backend & autentificare (Faza 5 — Taiga #9, #10, #11, #12)

Nimic implementat încă local. Din backlog:
- #10 Autentificare utilizatori
- #11 Gestionarea sesiunii + protejarea aplicației
- #12 Salvarea progresului în contul utilizatorului (înlocuiește/completează
  `useProgress`'s localStorage cu sincronizare cont)

Recomandare tehnică: Supabase (auth + Postgres) e cea mai rapidă cale pentru o
echipă mică fără backend dedicat — dar e o decizie de discutat cu echipa, nu doar
tehnică (cine găzduiește, cine plătește, GDPR pt date biometrice de mână/față).

**Atenție GDPR**: datele de landmarks (mâini+față) sunt date biometrice. Dacă se
adaugă conturi/cloud, trebuie clarificat explicit ce se sincronizează (progres/XP =
ok; landmarks brute = sensibil, ar trebui să rămână strict local, cum e acum).

---

## 5. Calitate & robustețe

- [ ] **Performanță pe telefoane reale** — 3 modele MediaPipe simultan, testat doar
      pe desktop până acum. Pose Landmarker e deja pe varianta "lite", detecția e
      gated la ~15fps — dar merită profilat pe un telefon mediu/slab înainte de a
      considera aplicația "gata"
- [ ] **Gestionare erori** — cameră refuzată există parțial; de verificat: model
      corupt, storage plin (parțial acoperit), pierdere conexiune la CDN MediaPipe
      (aplicația e offline-first, dar prima încărcare cere net)
- [ ] **Testare pe mobil real** — tot ce am verificat până acum e desktop Chrome

---

## 6. Echipă & proces

- [ ] Branch-ul curent de cod (holistic tracking) trebuie propus ca PR către `main`,
      coordonat cu mentorul/echipa — vezi convenția de branch-uri per membru
- [ ] Documentație scurtă pentru Rareș/Cătălin ca să poată colecta date ei înșiși
      (cum se rulează `npm run dev`, cum se folosește CollectPage, ce export să trimită)
- [ ] Sincronizare cu Taiga: task-urile #5-8 (conținut educațional) par deja acoperite
      tehnic de Faza 4 (Lecții) — de marcat/discutat cu Paula dacă corespund

---

## 7. PWA / deployment

- [ ] Testare completă offline (service worker cache după prima încărcare)
- [ ] Decizie de hosting — unde ajunge aplicația să fie accesibilă public/echipei
      (Vercel/Netlify pentru front-end static + PWA sunt cele mai simple opțiuni)

---

## Ordinea recomandată de atac

1. **Acum, autonom (Claude, fără date noi)**: 1.1 (prag visibility) + secțiunea 2 (design)
2. **Următorul pas al lui David/echipei**: 1.2 (recolectare) — nimic altceva nu
   avansează fără asta
3. **După recolectare**: 1.3 + 1.4 (reantrenare + referințe noi)
4. **În paralel, oricând**: secțiunea 6 (proces echipă) — nu depinde de cod
5. **Mai târziu**: secțiunile 3, 4, 5, 7 — funcționalitate nouă, backend, robustețe, deploy
