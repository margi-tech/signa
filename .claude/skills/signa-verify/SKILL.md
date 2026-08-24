---
name: signa-verify
description: Verifică o modificare în Signa — ce comenzi există de fapt, cum previzualizezi în browser și ce capcane sunt. Folosește înainte de a raporta o lucrare ca terminată, când vrei să pornești serverul de dev, sau când trebuie să testezi un ecran care cere autentificare. Conține și regula de siguranță pentru datele de progres din Supabase.
---

# Verificare în Signa

## Comenzile care există de fapt

```bash
npm test          # vitest run — 34 teste
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
`Onboarding` dacă `onboardingDone` e fals. Ca să ajungi la un ecran fără să te
autentifici, adaugă **temporar** un bypass și **scoate-l după**:

```jsx
const preview = window.location.search.includes('previewShell');
if (isSupabaseConfigured && !user && !preview) return <AuthGate … />;
if (!onboardingDone && !preview) return <Onboarding … />;
```

Verifică cu `grep -rn "preview" src/App.jsx` că l-ai scos înainte de commit.

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

`ProgressProvider` ascultă `onAuthStateChange` și, la `SIGNED_IN`/`INITIAL_SESSION`,
face `pullAndMergeProgress()` → `pushProgress()`. Merge-ul e `max(xp)`, `max(streak)`,
`max(stars)` per lecție și uniune pe `letterMastery` cu localul câștigător. Deci
orice date de test injectate local **se urcă în contul real și nu se pot coborî**
— o valoare mai mare rămâne câștigătoare la fiecare sincronizare ulterioară.

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

Dacă totuși ai scris local pe o origine autentificată, curăță imediat:
`localStorage.removeItem('signa-progress-v2')` — și ține minte că trebuie curățat
pe **fiecare** origine (localhost și Vercel au storage separat), altfel una stale
re-umflă cloud-ul la următoarea sincronizare.

## Siguranța datasetului

`signa-dataset-v1` este local și nu se sincronizează cu Supabase, dar conține
muncă reală de colectare. Nu îl șterge, înlocui sau injecta pentru preview fără
acord. Înainte de teste distructive:

1. folosește o origine/instanță separată sau exportă datasetul;
2. nu apăsa resetarea unei etichete reale;
3. nu valida o serie automată completă în contul/browserul utilizatorului;
4. pentru timing foto/video, cere test într-un browser vizibil cu cameră reală.

## Smoke test social

Pentru schimbări la prieteni/Supabase:

1. două conturi publice: A îl urmărește pe B, apoi B pe A → „Prieteni”;
2. follow unilateral apare în tabul „Cereri” al destinatarului;
3. profilul privat dispare din `user_directory`, căutare și liste;
4. verifică existența `follows`, `friendships` și `user_directory`.

Dacă API-ul social întoarce 404/permission errors pe un proiect existent,
re-rulează tot `supabase/schema.sql` înainte să modifici clientul.

## Lista de verificat înainte de „gata"

- [ ] `npm test` trece
- [ ] `npx vite build` fără erori
- [ ] zero erori în consola browserului
- [ ] bypass-urile temporare de preview scoase din `App.jsx`
- [ ] fișierele temporare de preview șterse
- [ ] `git status` arată doar fișierele pe care chiar voiai să le atingi
- [ ] ce n-ai putut verifica (timing, mobil real, cameră) — spus explicit
- [ ] datele reale din `signa-dataset-v1` nu au fost șterse sau fabricate
