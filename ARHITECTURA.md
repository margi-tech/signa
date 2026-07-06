# Signa — Document de Arhitectură

> *„Limba semnelor, la îndemână.”*
> Aplicație web (PWA) de învățare a Limbii Semnelor Române (LSR) cu recunoaștere a semnelor prin cameră.
> Proiect pentru Academia dpIT · Mentor: Betfair Romania Development.

---

## 1. Rezumat executiv

Signa este o aplicație web (PWA) de tip „Duolingo pentru limba semnelor”: utilizatorul face un semn în fața camerei, iar aplicația îi recunoaște semnul și îi dă feedback în timp real. Spre deosebire de resursele existente (clipuri video pe care le privești pasiv), Signa transformă învățarea în practică activă cu feedback instant.

Recunoașterea rulează direct pe dispozitiv, în browser — deci aplicația este rapidă, funcționează offline, iar camera nu părăsește niciodată telefonul (confidențialitate + cost zero).

**Propunere de valoare:** reducem bariera de comunicare dintre lumea auzitoare și comunitatea surzilor, printr-un instrument plăcut, gratuit și accesibil de pe orice telefon.

---

## 2. Contextul și problema

LSR nu este „un set de gesturi”, ci o limbă de sine stătătoare, cu lexic și gramatică proprii, recunoscută oficial ca limbă maternă a persoanelor surde prin **Legea nr. 27/2020**.

Bariera e profundă: înainte de recunoașterea legală, peste 20 de ani, sub 1% dintre copiii surzi își finalizau studiile (erau examinați în scris, în română). Societatea auzitoare aproape că nu cunoaște LSR, iar instrumentele moderne de învățare lipsesc.

**Oportunitatea:** cadru legal favorabil + tehnologie de hand tracking gratuită care rulează în browser + o nevoie reală neacoperită (nu există feedback activ, doar vizionare de clipuri).

---

## 3. Viziunea produsului

- **Poziționare:** un antrenor personal de limba semnelor — îți arată semnul, te lasă să-l imiți, te corectează în timp real.
- **Diferențiator:** resursele existente îți arată un clip; Signa îți corectează semnul (practică, nu vizionare) și e construită cu comunitatea surzilor.
- **Public țintă:** auzitori care vor să comunice cu prieteni/rude/colegi surzi; familii cu un membru surd; elevi; companii (accesibilitate/CSR).
- **Principii:** construit cu comunitatea (validare cu un interpret LSR); onestitate (predăm bazele, nu fluență); confidențialitate (procesare locală, fără stocarea imaginilor).

---

## 4. Funcționalitățile aplicației

### 4.1. MVP (obligatoriu)
- Recunoaștere live a alfabetului dactil (faci litera, camera o identifică, primești feedback).
- O lecție gamificată completă: referință → imiți → ești verificat → scor → mai departe.
- Provocarea „Scrie cuvântul” (dactilezi un cuvânt scurt, literă cu literă).
- Progres și motivație: niveluri, streak zilnic, punctaj.

### 4.2. Extensii (opțional)
- 5–10 semne uzuale (bună, mulțumesc, da, nu, ajutor).
- Clasament între prieteni / pe școală.
- Mod „antrenament rapid”.

### 4.3. Non-goals (asumate explicit)
- Traducere completă, în timp real, a propozițiilor.
- Recunoașterea expresiei faciale și a semnelor cu mișcare complexă (etapă ulterioară).
- Fluență — Signa e primul pas, nu un substitut pentru cursuri cu profesori surzi.

---

## 5. Arhitectura tehnică

Aplicație web mobile-first (PWA) cu trei zone separate.

### Zona 1 — Pe dispozitiv (timp real)
Inima aplicației, rulează integral în browser, fără server. La fiecare cadru video:
1. **Camera** (getUserMedia) — captează imaginea.
2. **MediaPipe Hand Landmarker** — detectează mâna, extrage 21 de puncte (landmarks) 3D.
3. **Normalizare** — punctele sunt aduse la o formă standard (relativ la încheietură + scalare).
4. **Clasificator (TensorFlow.js)** — primește punctele normalizate, prezice litera/semnul.
5. **Feedback live** — UI: „corect”, ghidare, scor.

### Zona 2 — Pregătirea modelului (înainte de lansare, o singură dată)
1. **Dataset propriu** — echipa se înregistrează făcând fiecare semn de zeci de ori; se salvează vectorii de landmark-uri.
2. **Antrenare** — un clasificator mic în TensorFlow.js.
3. **model.json** — exportat și încărcat o singură dată în aplicație.

### Zona 3 — Cloud (progres & social)
Singura parte care comunică în rețea, și doar pentru date non-sensibile (progres, scoruri) — niciodată imagini.
- **Backend API** — Node + Express sau Supabase.
- **Bază de date** — utilizatori, progres, scoruri.
- **Gamificare** — streak, niveluri, badge-uri, clasament.

### De ce pe dispozitiv
Recunoașterea locală = confidențialitate (camera nu pleacă de pe telefon) + viteză (fără întârziere de rețea) + funcționare offline + cost zero.

---

## 6. Stack tehnologic

| Strat | Tehnologie | Rol |
|---|---|---|
| Interfață | React + Tailwind (PWA) | Ecrane, lecții, feedback; rulează pe orice telefon |
| Cameră | getUserMedia (Web API) | Acces la fluxul video, în browser |
| Detecție mână | MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) | 21 de puncte 3D pe mână, în timp real |
| Clasificare | TensorFlow.js | Modelul care prezice semnul, pe dispozitiv |
| Backend | Node + Express / Supabase | Conturi, progres, API |
| Bază de date | PostgreSQL | Utilizatori, progres, scoruri, lecții |
| Notificări | Web Push API | Reamintiri pentru streak (opțional) |

---

## 7. Modelul de date

### utilizatori
| Câmp | Tip | Descriere |
|---|---|---|
| id | UUID | Identificator unic |
| nume | text | Numele afișat |
| email | text | Autentificare (opțional la MVP) |
| nivel | întreg | Nivelul curent |
| streak | întreg | Zile consecutive de practică |
| creat_la | dată | Data înregistrării |

### semne
| Câmp | Tip | Descriere |
|---|---|---|
| id | UUID | Identificator unic |
| eticheta | text | Litera sau semnul (ex. „A”, „mulțumesc”) |
| tip | text | „litera” sau „semn” |
| referinta | text | Link către imaginea/clipul de referință |
| dificultate | întreg | Ordinea în care apare în lecții |

### progres
| Câmp | Tip | Descriere |
|---|---|---|
| id | UUID | Identificator unic |
| utilizator_id | UUID | Referință către utilizatori |
| semn_id | UUID | Referință către semne |
| stapanit | boolean | Dacă semnul a fost învățat |
| scor | întreg | Punctaj acumulat pentru semn |
| actualizat_la | dată | Ultima practică |

---

## 8. Cum funcționează recunoașterea

Trei etape: imagine → puncte → literă.

1. **Extragerea punctelor:** MediaPipe întoarce 21 de puncte (x, y, z) pentru mână.
2. **Normalizarea:** mutăm originea în încheietură (translatare) și împărțim la o distanță de referință (scalare), ca semnul să arate la fel indiferent de poziția față de cameră.
3. **Clasificarea:** vectorul normalizat (63 de valori = 21 × 3) intră în clasificatorul TensorFlow.js, care întoarce semnul cel mai probabil + un nivel de încredere. Dacă încrederea e prea mică, cere o reîncercare.

> **Regulă critică:** funcția de normalizare trebuie să fie IDENTICĂ la colectarea datelor și la predicția live, altfel modelul nu recunoaște nimic.

### Pseudocod

```
funcție recunoașteSemn(cadru_video):
    mâini = MediaPipe.detecteazăMâini(cadru_video)
    dacă mâini este gol:
        întoarce "nicio mână detectată"

    puncte = mâini[0].landmarks          # 21 de puncte (x, y, z)
    vector = normalizează(puncte)
    predicție, încredere = clasificator.prezice(vector)

    dacă încredere < PRAG:
        întoarce "semn neclar - încearcă din nou"
    întoarce predicție

funcție normalizează(puncte):
    origine = puncte[0]                   # încheietura
    puncte = puncte - origine             # translatare la origine
    scară   = distanță(puncte[0], puncte[9])
    puncte  = puncte / scară              # invariant la scară
    întoarce aplatizează(puncte)          # vector de 63 de valori
```

---

## 9. Pașii de realizare

Pe faze. Fiecare fază are obiectiv, sarcini și un rezultat verificabil. Nu treceți la faza următoare până nu funcționează rezultatul celei curente.

### Faza 0 — Pregătire
- Repository Git comun, roluri stabilite, unelte instalate (Node.js, editor, proiect React gol).
- Contact cu un interpret LSR / asociația surzilor pentru validare.
- **Rezultat:** proiect care pornește local, roluri și plan stabilite.

### Faza 1 — Dovada de concept (camera + mâna)
- Accesul la cameră (getUserMedia), integrarea MediaPipe, desenarea celor 21 de puncte peste imagine.
- **Rezultat:** o pagină care urmărește mâna în timp real.

### Faza 2 — Construirea datasetului LSR
- Alegerea setului de semne (recomandat: alfabetul dactil).
- Mod de „colectare”: o tastă pentru o literă → salvezi vectorul de landmark-uri.
- Înregistrarea fiecărei litere de multe ori (ideal de la mai multe persoane).
- **Rezultat:** un set de date propriu, etichetat (JSON).

### Faza 3 — Antrenarea și integrarea clasificatorului
- Funcția de normalizare, antrenarea unui clasificator mic în TensorFlow.js, evaluarea acurateței.
- Export `model.json`, încărcat în aplicație pentru predicție.
- **Rezultat:** aplicația recunoaște literele în timp real.

### Faza 4 — Fluxul de lecții și gamificarea
- Ecran de lecție: referință → cameră → feedback. Logica de progres. Provocarea „Scrie cuvântul”. Scor, niveluri, streak.
- **Rezultat:** o lecție completă, jucabilă cap-coadă.

### Faza 5 — Backend, conturi și clasament
- Backend (Node + Express sau Supabase), salvarea progresului, clasament.
- **Rezultat:** progresul persistă; utilizatorii se pot compara (opțional pentru MVP).

### Faza 6 — Finisare, testare și pregătirea demo-ului
- Curățarea UI, testare pe mai multe telefoane/condiții de lumină, repetarea demo-ului, variantă de rezervă.
- **Rezultat:** Signa gata de prezentat, cu un demo memorabil exersat.

---

## 10. Împărțirea pe echipă

| Rol | Responsabilități | Livrabile |
|---|---|---|
| #1 AI / Tech Lead | MediaPipe, normalizare, antrenare model, arhitectură | `model.json`, pipeline de predicție |
| #2 Date și conținut | Dataset, materiale de referință, legătura cu comunitatea | Dataset etichetat, referințe |
| #3 Frontend / UX | Camera, feedback live, fluxul de lecții, ecranele de joc | Interfața aplicației |
| #4 Backend / Gamificare | Conturi, progres, streak, clasament | API + bază de date |
| #5 Product Owner / Pitch | Coordonare, parteneriate, demo, prezentare | Plan de demo și pitch |

> Toată echipa contribuie la colectarea semnelor (Faza 2) — mâini diferite = model mai robust.

---

## 11. Riscuri și mitigare

| Risc | Mitigare |
|---|---|
| Acuratețe slabă pe unele litere | Mai multe exemple în dataset; începeți cu un subset clar |
| Lumină / fundal variabil la demo | Testare în condiții reale; zonă de filmare controlată |
| Timp insuficient | Livrați întâi MVP-ul (faze 0–4); restul sunt bonus |
| Corectitudinea semnelor LSR | Validare cu un interpret / asociația surzilor |
| Probleme tehnice pe scenă | Variantă de rezervă (înregistrare) + demo repetat |

---

## 12. Planul de demo și pitch

**Demo-ul care câștigă:** invită un jurat pe scenă. Aplicația îl învață o literă, el o face în fața camerei, Signa îl verifică live și sărbătorește când reușește. Apoi dactilați un cuvânt scurt (ex. „D-P-I-T”). Juratul învață primul lui semn în LSR, în fața tuturor.

**Structura pitch-ului (5–7 min):**
1. Cârlig (20s): bariera de comunicare.
2. Problema (45s): cifrele + Legea 27/2020; societatea n-a ținut pasul.
3. Soluția + demo live (3 min): juratul învață un semn.
4. Cum funcționează (30s): MediaPipe + AI pe dispozitiv + dataset propriu.
5. Diferențiatorul (30s): feedback în timp real, construit cu comunitatea.
6. Viziunea (30s): mai multe semne, școli, companii — o punte între cele două lumi.

**Peisaj competitiv (poziționare onestă):** învățarea prin cameră e dovedită global pentru limba americană (NVIDIA „Signs”, SignAll „Ace ASL”). Pentru LSR însă există doar dicționare (dlmgLSR) și instrumente cu interpreți umani (Apel 112 NG) — nimic care să-ți recunoască semnele cu AI ca să te corecteze. Formularea: *„abordare dovedită, adusă la limba semnelor română.”* (Nu „primii din lume”.)

---

## 13. Glosar

| Termen | Explicație |
|---|---|
| LSR | Limba Semnelor Române, recunoscută prin Legea 27/2020 |
| Alfabet dactil | Configurațiile de mână pentru fiecare literă (dactilare) |
| Landmark | Punct de reper pe mână (MediaPipe întoarce 21) |
| MediaPipe | Bibliotecă gratuită Google pentru urmărirea mâinii în browser |
| TensorFlow.js | Bibliotecă de învățare automată care rulează în browser |
| PWA | Progressive Web App — aplicație web care se comportă ca una nativă |
| Normalizare | Aducerea datelor la o formă standard, independentă de poziție/scară |
