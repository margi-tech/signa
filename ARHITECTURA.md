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
- Provocări și activitate între prieteni.
- Mod „antrenament rapid”.

### 4.2.1. Extensii deja implementate
- Tracking holistic: două mâini, expresie facială, orientarea capului și trunchi.
- Litere dinamice prin secvențe + clasificator GRU.
- Conturi Supabase, progres sincronizat, clasament și profil public/privat.
- Follow reciproc și prieteni integrați în pagina Profil.
- Colectare asistată: inventar permanent și serii automate foto/video.
- Recuperare parolă prin email, ștergere cont și avatar JPEG/PNG/WebP validat.
- Dataset colaborativ: echipa colectează în același set din cloud (numai vectori
  numerici, cu consimțământ explicit), iar antrenarea îl încarcă de acolo.
- Diagnosticul e rezervat adminilor; colectarea și antrenarea merg pe capabilități
  acordate individual, separate de rol.

### 4.3. Non-goals (asumate explicit)
- Traducere completă, în timp real, a propozițiilor.
- Stocarea imaginilor/video în cloud.
- Fluență — Signa e primul pas, nu un substitut pentru cursuri cu profesori surzi.

---

## 5. Arhitectura tehnică

Aplicație web PWA cu shell desktop-first pentru navigarea principală și ecrane
de lucru full-screen responsive/mobile-first, împărțită în trei zone.

### Zona 1 — Pe dispozitiv (timp real)
Inima aplicației rulează integral în browser. La fiecare cadru video:
1. **Camera** (getUserMedia) — captează imaginea.
2. **MediaPipe holistic** — Hand + Face + Pose Landmarker rulează simultan.
3. **Normalizare v2** — produce un vector fix de 199 valori: mâini 126,
   față 52, orientare cap 3 și trunchi 18.
4. **Clasificator TensorFlow.js** — MLP pentru static sau GRU pentru secvențe.
5. **Feedback live** — UI: „corect”, ghidare, scor.

### Zona 2 — Pregătirea modelului (înainte de lansare, o singură dată)
1. **Dataset propriu** — se salvează local doar vectorii numerici; imagini/video nu
   sunt persistate. `CollectPage` oferă serii automate 300 foto / 50 video.
2. **Antrenare în browser** — MLP static + GRU dinamic, cu test set separat.
3. **Modele TF.js** — exportate în `public/models/` și încărcate local de PWA.

### Zona 3 — Cloud (progres & social)
Singura parte care comunică în rețea, și doar pentru date non-sensibile (progres, scoruri) — niciodată imagini.
- **Backend** — Supabase Auth + PostgreSQL + RLS.
- **Date** — profil, progres, scoruri și relații follow.
- **Gamificare/social** — streak, niveluri, clasament și prietenii reciproce.
- **Securitate** — scoruri acordate prin RPC, rol protejat prin trigger, view-uri
  publice cu coloane allowlist și ștergere proprie de cont.

### De ce pe dispozitiv
Recunoașterea locală = confidențialitate (camera nu pleacă de pe telefon) + viteză (fără întârziere de rețea) + funcționare offline + cost zero.

---

## 6. Stack tehnologic

| Strat | Tehnologie | Rol |
|---|---|---|
| Interfață | React + Tailwind (PWA) | Ecrane, lecții, feedback; rulează pe orice telefon |
| Cameră | getUserMedia (Web API) | Acces la fluxul video, în browser |
| Tracking holistic | MediaPipe Hand + Face + Pose Landmarker | Mâini, expresie/cap și trunchi |
| Clasificare | TensorFlow.js | MLP static + GRU dinamic, pe dispozitiv |
| Backend | Supabase | Auth, profil, progres și social |
| Bază de date | PostgreSQL + RLS | `profiles`, `progress`, `follows` și view-uri |
| Notificări | Web Push API | Reamintiri pentru streak (opțional) |

---

## 7. Modelul de date

Sursa exactă este `supabase/schema.sql`.

### profiles
| Câmp | Tip | Descriere |
|---|---|---|
| id | UUID | Identificator unic |
| display_name / first_name / last_name | text | Identitatea afișată |
| username | text unic | Nume public de utilizator |
| avatar_url | text | Avatar public opțional |
| role | text | `user` sau `admin` |
| visibility | text | `public` sau `private` |
| created_at | timestamptz | Data înscrierii |

### progres
| Câmp | Tip | Descriere |
|---|---|---|
| user_id | UUID | Referință la `auth.users` |
| xp / streak | întreg | Progres agregat |
| lessons | JSONB | Stele și lecții finalizate |
| letter_mastery | JSONB | Stăpânire per literă |
| updated_at | timestamptz | Ultima sincronizare |

### follows
| Câmp | Tip | Descriere |
|---|---|---|
| follower_id | UUID | Cine urmărește |
| following_id | UUID | Cine este urmărit |
| created_at | timestamptz | Începutul relației |

`friendships` derivă perechile reciproce, `user_directory` expune numai câmpurile
publice permise, iar `leaderboard` combină profilul public cu scorul. Profilul
complet propriu se citește prin `get_own_profile()`. XP/streak/lecțiile sunt
actualizate numai prin `record_lesson_completion`, cu deduplicare per lecție/zi.

### dataset_members
| Câmp | Tip | Descriere |
|---|---|---|
| user_id | UUID | Membrul invitat |
| can_collect / can_train / can_publish | boolean | Capabilități, separate de `role` |
| consented_at | timestamptz | Momentul consimțământului pentru trimitere |
| granted_by | UUID | Cine a acordat accesul |

### dataset_batches
| Câmp | Tip | Descriere |
|---|---|---|
| id | UUID | Identificator lot |
| user_id | UUID | Cine a colectat |
| label | text | Eticheta (literă sau cuvânt) |
| kind | text | `static` sau `sequence` |
| session_id | UUID | Sesiunea de colectare — grupul pentru split train/test |
| samples | JSONB | Vectori 199 (sau secvențe `SEQ_FRAMES × 199`) |
| created_at | timestamptz | Momentul trimiterii |

Clientul nu poate scrie direct în niciunul dintre tabele: totul trece prin RPC-uri
(`get_dataset_access`, `consent_dataset_upload`, `append_dataset_batch`,
`list_dataset_inventory`, `fetch_dataset_batches`), care validează forma vectorilor,
cer consimțământ și aplică o limită de rată. Sursa exactă: `supabase/dataset-collab.sql`.

**Nu se stochează imagini sau video** — nici aici, nici altundeva.

---

## 8. Cum funcționează recunoașterea

Trei etape: imagine → subiect holistic → semn.

1. **Extragere:** MediaPipe întoarce până la două mâini, blendshape-uri faciale,
   matricea capului și punctele de trunchi.
2. **Normalizare:** `normalize()` aplică același contract la colectare și predicție
   și produce exact **199 valori**.
3. **Clasificare:** MLP primește un vector static; GRU primește o secvență de
   vectori. Rezultatul este acceptat numai peste pragurile de confidence și margin.

> **Regulă critică:** funcția de normalizare trebuie să fie IDENTICĂ la colectarea datelor și la predicția live, altfel modelul nu recunoaște nimic.

### Pseudocod

```
funcție recunoașteSemn(cadru_video):
    subiect = MediaPipe.detecteazăHolistic(cadru_video)
    dacă subiect.mâini este gol:
        întoarce "nicio mână detectată"

    vector = normalize(subiect)          # contract v2: 199 valori
    predicție, încredere = MLP.prezice(vector)

    dacă încredere < PRAG:
        întoarce "semn neclar - încearcă din nou"
    întoarce predicție

funcție recunoașteMișcare(cadre):
    secvență = cadre.map(normalize)       # fiecare cadru are 199 valori
    întoarce GRU.prezice(secvență)
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
- Supabase Auth, profil public/privat, progres sincronizat, clasament și follow reciproc.
- **Rezultat:** conturile, progresul și socialul rulează, iar aplicația e publică
  pe `https://signa-lsr.online`.

### Faza 5.5 — Dataset colaborativ
- Colectare în echipă pe același set din cloud, cu capabilități per membru și
  consimțământ explicit; antrenarea încarcă setul comun și separă train/test pe
  sesiuni de colectare.
- **Rezultat:** echipa nu mai unește JSON-uri manual, iar acuratețea raportată nu
  mai e umflată de seriile automate.

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
