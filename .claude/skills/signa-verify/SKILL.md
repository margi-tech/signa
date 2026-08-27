---
name: signa-verify
description: Verifică o modificare în Signa — ce comenzi există de fapt, cum previzualizezi în browser și ce capcane sunt. Folosește înainte de a raporta o lucrare ca terminată, când vrei să pornești serverul de dev, sau când trebuie să testezi un ecran care cere autentificare. Conține și regula de siguranță pentru datele de progres din Supabase.
---

# Verificare în Signa

## Comenzile care există de fapt

```bash
npm test          # vitest run — 60 de teste, 13 fișiere
npx vite build    # verificarea de compilare
npm run dev       # server de dev
```

**Nu există `npm run lint`. Nu există `tsconfig.json` și nici `tsc`.** Proiectul e
JS curat. Dacă o cerință zice `npm run lint && npx tsc --noEmit` (a apărut de mai
multe ori în brief-uri de design), spune explicit că nu se aplică aici și rulează
`npm test` + `vite build` în loc. Nu inventa că au trecut.

Curăță `dist/` după build dacă nu-ți trebuie: `rm -rf dist`.

## Server de dev + preview

Serverul se pornește prin `preview_start` cu `.claude/launch.json` (`signa-dev`,
portul 5199). Dacă `npm` crapă cu `EPERM: uv_cwd`, pornește direct binarul:

```bash
(nohup npx vite --port 5199 --strictPort > /tmp/vite-signa.log 2>&1 &)
```

Apoi `preview_start` cu `{url: "http://localhost:5199/"}`.

### Aplicația cere login

`App.jsx` randează `AuthGate` când Supabase e configurat și nu ai sesiune, apoi
`Onboarding` dacă `onboardingDone` e fals. **Nu adăuga parametri URL care sar
peste autentificare** — un astfel de bypass ajunge ușor în build-ul de producție.
Pentru verificări vizuale, randează componenta cu props stub într-un harness
temporar izolat și scoate harness-ul înainte de commit.

### Capcană: panoul raportează tab-ul ca ascuns

Browser pane-ul rulează cu `document.visibilityState === 'hidden'` și `FPS = 0`.
Consecințe:

- `requestAnimationFrame` nu rulează
- `setTimeout`/`setInterval` sunt throttle-uite la ~1s
- animațiile CSS nu avansează

Deci **nu poți măsura durate, fluența unei tranziții sau comportament dependent
de timing**. O măsurătoare de „2377ms pentru o animație de 420ms" e artefact de
mediu, nu jank real. Verifică asta cu:

```js
document.visibilityState + ' / FPS=' + …
```

Ce **poți** verifica de încredere: structura DOM, stilurile calculate
(`getComputedStyle(el).animationName`, `.animationDelay`, lățimi, culori),
existența și pozițiile elementelor, absența erorilor din consolă.

Același lucru se aplică seriilor din `CollectPage`: preview-ul ascuns nu poate
valida pauza foto de 75 ms, FPS-ul MediaPipe sau alinierea în mișcare. Verifică
doar că butonul pornește countdown-ul; ritmul și camera se testează într-un tab
Chrome/Safari real.

Pentru animații, verifică **numele și delay-ul keyframe-ului**, nu cât durează:

```js
getComputedStyle(el).animationName + '@' + getComputedStyle(el).animationDelay
```

Rezultatele lungi întoarce-le prin `document.title` + `get_page_text` — e mai
robust decât valoarea de retur a `javascript_tool`.

## ⚠ Siguranța datelor de progres

**Nu scrie niciodată în `localStorage` cheia `signa-progress-v2` pe o origine cu
sesiune Supabase activă.**

`ProgressProvider` ascultă `onAuthStateChange`. XP, streak-ul și lecțiile sunt
autoritative pe server și se modifică numai prin RPC-ul
`record_lesson_completion`; clientul trimite direct doar `letter_mastery`.
Finalizările offline stau în `signa-progress-pending-v1`, fiecare legată de
`userId`, apoi sunt retrimise la sincronizare.

Datele locale fabricate nu mai pot umfla XP-ul live după aplicarea schemei noi,
dar pot strica afișarea locală și coada de sincronizare. Nu le injecta într-o
sesiune reală și nu testa împotriva unui proiect Supabase rămas pe schema veche.

Asta s-a întâmplat deja o dată: un seed de test cu 420 XP a înlocuit 60 XP reali
și a adăugat ~30 de intrări `letterMastery` fabricate.

Înainte de orice seed, confirmă că nu există sesiune:

```js
(await import('/src/lib/supabase.js')).supabase.auth.getSession()
// data.session === null  →  sigur; pushProgress iese devreme fără user
```

Alternativa sigură și preferată: randează componenta cu **props stub**, printr-un
bypass temporar în `App.jsx`, fără să atingi `localStorage`. Majoritatea
componentelor (ProfileDashboard, LessonsPage) primesc tot ce le trebuie prin props.

Dacă totuși ai scris local pe o origine autentificată, curăță imediat ambele:
`signa-progress-v2` și `signa-progress-pending-v1`. Fiecare origine (localhost,
preview și producție) are storage separat.

## Siguranța datasetului

`signa-dataset-v1` conține muncă reală de colectare. Nu îl șterge, înlocui sau
injecta pentru preview fără acord. Înainte de teste distructive:

1. folosește o origine/instanță separată sau exportă datasetul;
2. nu apăsa resetarea unei etichete reale;
3. nu valida o serie automată completă în contul/browserul utilizatorului;
4. pentru timing foto/video, cere test într-un browser vizibil cu cameră reală.

### ⚠ Datasetul din cloud e comun pe toată echipa

De la datasetul colaborativ, exemplele nu mai rămân pe mașina ta: un cont cu
`can_collect` **și consimțământ dat** trimite automat orice captură în
`dataset_batches`, la 4 secunde. Ce injectezi acolo intră în setul pe care
antrenează toată lumea, iar loturile trimise nu se retrag din client.

Deci, pe un cont real de colector:

- nu porni serii automate „de test" și nu captura cadre fabricate;
- nu apela `queueLocalDataset()` ca să vezi ce face — urcă tot datasetul local;
- pentru verificări de UI, testează pe un cont **fără** `can_collect`, sau
  înainte de a accepta consimțământul: coada rămâne locală și nu pleacă nimic.

Verifică unde ești înainte de orice captură de test:

```js
(await import('/src/lib/dataset.js')).getDatasetAccess()
// null sau can_collect:false → sigur; consented:true → capturile pleacă în cloud
```

Dacă ai trimis din greșeală exemple stricate, spune-i utilizatorului — curățarea
se face din SQL Editor, nu din aplicație.

## Smoke test social

Pentru schimbări la prieteni/Supabase:

1. două conturi publice: A îl urmărește pe B, apoi B pe A → „Prieteni”;
2. follow unilateral apare în tabul „Cereri” al destinatarului;
3. profilul privat dispare din `user_directory`, căutare și liste;
4. verifică existența `follows`, `friendships` și `user_directory`.

Dacă API-ul social întoarce 404/permission errors pe un proiect existent,
re-rulează tot `supabase/schema.sql` înainte să modifici clientul.

## Smoke test securitate Supabase

După o migrare de schemă:

1. un utilizator obișnuit nu poate seta `role = 'admin'`;
2. un update direct de XP/streak nu schimbă scorul;
3. `record_lesson_completion` acordă XP o singură dată per lecție/zi;
4. `profiles` complet este disponibil numai prin `get_own_profile()`;
5. avatarurile SVG sau peste 2 MB sunt respinse;
6. ștergerea contului elimină sesiunea și datele locale de progres;
7. un cont fără rând în `dataset_members` nu poate chema `append_dataset_batch`
   și nu vede Colectare/Train;
8. un colector fără consimțământ primește „Consent required", nu un insert reușit.

## Smoke test dataset colaborativ

1. cont invitat cu `can_collect` → Colectare se deschide, dar nimic nu pleacă
   până la consimțământ (UI: „Local până accepți trimiterea");
2. după consimțământ, capturile ajung în inventarul comun în câteva secunde;
3. offline → coada crește; revenirea online o golește singură;
4. `can_train` → butonul „Încarcă din cloud" apare în Train;
5. o etichetă colectată în două sesiuni diferite ajunge cu două `session_id`-uri
   distincte (altfel split-ul train/test devine fals — vezi `signa-train`).

## Lista de verificat înainte de „gata"

- [ ] `npm test` trece
- [ ] `npx vite build` fără erori
- [ ] zero erori în consola browserului
- [ ] niciun bypass de autentificare bazat pe URL în `App.jsx`
- [ ] fișierele temporare de preview șterse
- [ ] `git status` arată doar fișierele pe care chiar voiai să le atingi
- [ ] ce n-ai putut verifica (timing, mobil real, cameră) — spus explicit
- [ ] datele reale din `signa-dataset-v1` nu au fost șterse sau fabricate
- [ ] nicio captură de test n-a plecat în `dataset_batches` (setul e comun)
