# Signa — Modul Invitat (guest mode)

> Document de arhitectură. Propunere de implementare, nu stare curentă.
> Branch: `guest-mode`.

**Rezumat.** Azi aplicația e complet închisă până la login (`src/App.jsx:88`). Modul
invitat deschide partea de *învățare* (lecții, cameră, silabisire, repetiție,
referințe) fără cont, și lasă închisă partea de *identitate* (profil, clasament,
social, unelte de dataset). Progresul invitatului rămâne pe dispozitiv și nu atinge
niciodată serverul.

**Decizia principală:** invitatul e o sesiune **fără `user_id`**. Nu inventăm un
utilizator anonim în Supabase, nu folosim `signInAnonymously()`, nu creăm rânduri în
`profiles`. Tot ce cere identitate e ascuns sau înlocuit cu un îndemn la creare de
cont. Consecința e că **nu avem nevoie de nicio schimbare în `supabase/schema.sql`** —
granturile actuale fac deja munca grea.

---

## 1. De ce așa

Alternativa ar fi fost autentificarea anonimă din Supabase (un `auth.users` real, fără
email). Am respins-o:

- ar declanșa `handle_new_user` și ar umple `profiles` cu conturi fantomă care apoi
  apar în `user_directory` și în căutarea de prieteni;
- ar primi `authenticated` și, odată cu el, `record_lesson_completion` — adică XP real
  în clasament pentru cineva fără identitate;
- „upgrade-ul" la cont real ar deveni o migrare de date între două rânduri `auth.users`,
  cu tot ce ține de asta (follows, avatar, dataset).

Fără `user_id`, toate astea dispar prin construcție. Invitatul e pur client-side.

---

## 2. Matricea de capabilități

| Zonă | Invitat | Motiv |
|---|---|---|
| Lecții, Repetiție, Silabisire | ✅ | rulează pe date locale (`src/data/lessons.js`) |
| Cameră / recunoaștere | ✅ | MediaPipe + TF.js, 100% pe dispozitiv |
| Referințe LSR (`#referinte`) | ✅ | e deja deschis fără login (`src/App.jsx:67`) |
| XP, stele, nivel | ✅ local | slate propriu (§6.1), nu pleacă nicăieri |
| Serie de zile (streak) | ❌ | n-ar putea fi transferată pe cont — vezi §7 |
| Onboarding | ✅ | rulează după alegerea „continuă ca invitat" |
| Clasament — vizionare | ✅ read-only | `grant select on public.leaderboard to anon` (`schema.sql:438`) |
| **Profil** (nume, username, avatar, vizibilitate) | ❌ | cere `profiles` + `auth.uid()` |
| **Clasament — apariție în el** | ❌ | view-ul filtrează pe `profiles.visibility` |
| **Social** (prieteni, follow, căutare) | ❌ | `follows`/`friendships` sunt `authenticated` |
| **Sincronizare progres** | ❌ | nu există cont în care să sincronizezi |
| **Ștergere cont** | ❌ | n-are ce șterge |
| Colectare / Antrenare / Diagnostic | ❌ | cer `dataset_members` sau `role = 'admin'` |

Cerința „invitatul nu poate folosi funcțiile de profil" e acoperită de rândurile
îngroșate.

Clasamentul **rămâne vizibil**, read-only, cu un banner „Creează un cont ca să apari
aici". Datele sunt deja publice pentru `anon`, deci nu costă nimic, iar un clasament
plin pe care nu ești e cel mai bun argument de conversie pe care îl avem.

---

## 3. Unde trăiește starea

Un modul nou, minim, `src/lib/guest.js`:

```js
const KEY = 'signa-guest-v1';

export function isGuestSession() { /* localStorage.getItem(KEY) === '1' */ }
export function enterGuest() { /* set */ }
export function exitGuest() { /* remove */ }
```

Trei reguli care nu se negociază:

1. **`localStorage`, nu `sessionStorage`.** Altfel un refresh aruncă invitatul înapoi
   în `AuthGate` și pierde impresia că „e în aplicație".
2. **Se șterge la `SIGNED_IN`.** În `onAuthStateChange`, orice sesiune reală anulează
   starea de invitat. Nu există „invitat logat".
3. **Nu se setează dacă există sesiune.** `enterGuest()` e apelat doar din `AuthGate`,
   adică exact pe ramura unde `user === null`.

Flag-ul se citește o singură dată, în `App.jsx`, și coboară ca prop `isGuest` prin
`AppShell` → `Sidebar` / pagini — consistent cu felul în care circulă deja
`profileSummary`, `canCollect`, `canTrain`. Dacă pe parcurs se dovedește că prop-ul
ajunge în prea multe locuri, alternativa e un context mic lângă `ProgressProvider`
(`src/main.jsx:9`); nu merită de la început.

---

## 4. Intrarea în modul invitat (ecranul de login)

Modul invitat e inutil dacă nu se vede. Intrarea stă **pe ecranul de login, sub
butonul principal** — nu într-un link mic de subsol, nu într-un meniu.

### 4.1. Așezare

```
┌──────────────────────── AuthGate ─────────────────────────┐
│                        │  [ Login ][ Signup ]   AuthTabs  │
│   BrandColumn          │  Bine ai revenit                 │
│   (doar md+,           │  Email                           │
│    decorativ)          │  Parolă            Ai uitat?     │
│                        │  ┌────────────────────────────┐  │
│                        │  │   Intră în cont     verde  │  │ PrimaryButton
│                        │  └────────────────────────────┘  │
│                        │  ───────────  SAU  ───────────   │ OrSeparator
│                        │  ┌────────────────────────────┐  │
│                        │  │   Continuă ca invitat  alb │  │ SecondaryButton
│                        │  └────────────────────────────┘  │
│                        │  Înveți fără cont. Progresul     │
│                        │  rămâne pe acest dispozitiv.     │
│                        │                                  │
│                        │  Nu ai cont? Creează unul gratuit│
└───────────────────────────────────────────────────────────┘
```

Locul exact în cod: în `AuthPanel`, după `PrimaryButton` (`AuthPanel.jsx:335–387`) și
înaintea rândului „Nu ai cont?" (`:396–407`).

### 4.2. Componente — se refolosesc, nu se scriu altele noi

| Element | Componentă existentă |
|---|---|
| Separatorul „SAU" | `OrSeparator` (`AuthUi.jsx:275`) |
| Butonul de invitat | `SecondaryButton` (`AuthUi.jsx:312`) — alb, bordat, `variant="default"` |
| Linia explicativă | `<p>` simplu, `text-[12.5px] text-ink-400`, ca hint-urile din `AuthField` |

Nu e nevoie de keyframe nou: `SecondaryButton` are deja tranziția lui, iar dacă vrem o
intrare animată refolosim `sg-fade-up` din `src/index.css` cu un `animationDelay` mai
mare decât al butonului principal.

### 4.3. Ierarhie vizuală

Butonul de invitat e **secundar și trebuie să rămână secundar**: alb pe cream, fără
umplere verde. Singurul CTA plin de pe ecran rămâne „Intră în cont" / „Creează cont".
Vrem conturi; modul invitat e plasa de siguranță pentru cine nu vrea să se înscrie *în
secunda asta*, nu destinația implicită.

### 4.4. Când apare

- **Da** pe `mode === 'login'` și pe `mode === 'signup'`. Ambele sunt intrări în
  aplicație, iar `AuthTabs` comută între ele — dacă butonul ar dispărea pe signup, ar
  clipi la fiecare schimbare de tab.
- **Nu** pe `mode === 'forgot'` și `mode === 'reset'`. Acolo utilizatorul are deja cont
  și e în mijlocul unei recuperări; „continuă ca invitat" ar fi o capcană.
- **Nu** în `ProfilePage`. Același `AuthPanel` e montat și acolo (`ProfilePage.jsx:256`),
  pentru cineva care e deja în aplicație. Se rezolvă prin prezența prop-ului:

  ```jsx
  {onGuest && (mode === 'login' || mode === 'signup') && ( /* … */ )}
  ```

  `AuthGate` primește `onGuest` din `App.jsx` și îl coboară în `AuthPanel`; `ProfilePage`
  nu-l dă, deci butonul nu se randează. Fără flag în plus, fără prop de tip
  `showGuestButton`.

### 4.5. Coabitarea cu login-ul Google

`SocialButtons` se afișează doar când `VITE_ENABLE_OAUTH === 'true'` (`AuthPanel.jsx:28`)
și vine deja cu propriul `OrSeparator` (`:389–394`). Două separatoare „SAU" unul sub
altul arată rupt, deci ordinea e:

- **OAuth oprit** (starea de azi): `PrimaryButton` → `OrSeparator` → buton invitat → hint.
- **OAuth pornit**: `PrimaryButton` → `OrSeparator` → `SocialButtons` → buton invitat →
  hint, **fără** al doilea separator. Butonul de invitat se lipește de blocul social
  printr-un simplu `space-y-3`.

### 4.6. Comportament

- La click: `enterGuest()` + `setGuest(true)` în `App.jsx`. **Zero apeluri de rețea** —
  nimic din `supabase.auth`. Tranziția spre onboarding e instantanee.
- `disabled={busy}` — cât timp un login e în curs, nu poți pleca de sub el.
- E un `<button type="button">` real, deci intră natural în ordinea de focus, imediat
  după CTA-ul principal.
- Nu e o fundătură: ieșirea din modul invitat (§11) readuce utilizatorul exact pe acest
  ecran, cu butonul la locul lui.

### 4.7. Text

| Loc | Text |
|---|---|
| Buton | **Continuă ca invitat** |
| Sub buton | Înveți fără cont. Progresul rămâne pe acest dispozitiv. |

Linia de sub buton nu e decorativă — e singurul moment în care putem spune onest că
progresul e local, *înainte* ca utilizatorul să investească timp. Fără ea, conversia de
mai târziu (§7) se simte ca o pierdere. Aceeași promisiune se repetă în ecranul de
conversie din Profil.

Pe mobil (`< md`) coloana de brand e ascunsă (`AuthGate.jsx:51`) și formularul de login
e scurt, deci butonul rămâne vizibil fără scroll. Nu are nevoie de tratament separat.

---

## 5. Modificări pe fișiere

### `src/App.jsx` — gate-ul

Astăzi:

```js
if (isSupabaseConfigured && !user) {
  return <AuthGate onAuth={() => {}} />;   // :88
}
```

Devine: dacă nu e user **și** nu e invitat → `AuthGate`, care primește
`onGuest={() => { enterGuest(); setGuest(true); }}`. Restul fluxului (onboarding la
`:92`, apoi shell) rămâne neatins — invitatul cade natural prin onboarding, ceea ce e
comportamentul dorit.

Capabilitățile de la `:96–99` trebuie să devină false explicit pentru invitat:

```js
const canCollect = !isGuest && (!isSupabaseConfigured || isAdmin || datasetAccess.can_collect);
```

Fără `!isGuest`, ramura `!isSupabaseConfigured` ar deschide uneltele pe un build fără
chei. Cu Supabase configurat, `datasetAccess` fără `userId` întoarce oricum fals, dar
nu ne bazăm pe asta.

**Capcană reală:** `useProfileSummary(xp, user?.id)` (`:29`). Pentru invitat `user` e
`null`, deci `user?.id` e `undefined`, iar hook-ul iese devreme **fără** să pună
`loading` pe false (`src/hooks/useProfileSummary.js:20–24` — doar `userId === null`
face asta, nu `undefined`). `loading` rămâne blocat pe true, iar gate-ul de la
`src/App.jsx:107` ar ține uneltele într-un spinner etern. Se transmite `user?.id ?? null`.

### `src/components/auth/AuthGate.jsx` + `AuthPanel.jsx`

Butonul de invitat, conform §4. `AuthGate` doar transmite `onGuest` mai departe.

### `src/components/Sidebar.jsx` — meniul

- Itemul „Profil" (`:168`) rămâne în listă. Scoaterea lui ar strica `PAGE_ORDER`
  (`:10`), care dă direcția tranziției în `AppShell`, și ar lăsa un gol vizibil în nav.
  În schimb, pagina Profil arată invitatului ecranul de conversie.
- Rândul de profil de jos (`:397–415`) afișează „Invitat" în loc de `firstName`, un
  avatar neutru și, în locul streak-ului, un mic „Creează cont".
- Badge-ul `#rank` de pe Clasament (`:162`) se ascunde — vezi capcana din §8.
- Uneltele sunt deja condiționate de `canCollect/canTrain/canDiagnostic`, deci dispar
  singure.

### `src/pages/ProfilePage.jsx` — miezul cerinței

Pagina are deja trei ramuri (`:196–266`): fără Supabase / loading / `user ?
ProfileDashboard : AuthPanel`. Adăugăm o a patra, **înaintea** celorlalte, pentru
invitat:

- rezumatul progresului local (nivel, XP, streak) — refolosim cardul „Progres local"
  care există deja la `:179–186`;
- lista a ce se deblochează cu un cont: clasament, prieteni, progres pe mai multe
  dispozitive, avatar;
- `AuthPanel` în modul `signup`, ca actul de conversie să fie la un singur click;
- butonul de ieșire din modul invitat (§11).

`ProfileDashboard` **nu se montează niciodată** pentru invitat. Asta e granița: nu
ascundem butoane dintr-un dashboard montat, nu montăm dashboard-ul deloc. Nicio cale
prin UI nu ajunge la `updateOwnProfile`, `uploadAvatar`, `deleteOwnAccount`,
`FriendsSection` sau `onSync`.

### `src/pages/LeaderboardPage.jsx`

Blocul `try` de la `:63–70` cheamă `getOwnProfile()` și `getSessionUser()`. Pentru
invitat, RPC-ul `get_own_profile()` e grantat doar lui `authenticated` (`schema.sql:333`)
și va da eroare — prinsă de `catch`, deci nu crapă, dar produce un 401 inutil la
fiecare intrare pe ecran. Se sare peste bloc când `isGuest`.

Mai departe, `meId` rămâne `null` ⇒ `myIndex === -1` ⇒ cardul „locul tău" nu se
randează. În locul lui punem banner-ul de conversie.

### `src/pages/HomePage.jsx`

Avatarul din antet (`:262`) și itemul „Profil" din nav-ul mobil (`:708`) duc în pagina
de conversie — nu le blocăm, doar își schimbă destinația de conținut.

---

## 6. Progresul invitatului

### 6.1. Slate separat — obligatoriu

`signa-progress-v2` e o cheie a *dispozitivului*, nu a unui cont: rămâne pe disc și
după sign-out. Dacă invitatul ar citi aceeași cheie, ar moșteni progresul ultimului
cont logat — ceea ce s-a și întâmplat la prima implementare: un utilizator cu toate
lecțiile făcute a intrat ca invitat și și-a văzut cele 17 lecții bifate.

Consecința gravă nu era afișarea, ci conversia: replay-ul din §7 ar fi re-emis toate
lecțiile contului ca și cum ar fi fost făcute azi, adică XP nemeritat direct în
clasamentul live.

Deci cheia de progres e o funcție de identitate:

```js
export function progressKey() {
  return isGuestSession() ? GUEST_PROGRESS_KEY : ACCOUNT_PROGRESS_KEY;
}
```

- `signa-progress-v2` — slate-ul contului, neatins de modul invitat;
- `signa-progress-guest-v1` — slate-ul invitatului, curat la prima intrare.

Nu se copiază nimic între ele: intrarea și ieșirea din modul invitat doar comută
cheia activă și cer `reloadFromStorage()` ca starea React să reia de la slate-ul nou.
Efect secundar dorit: invitatul pornește cu `onboardingDone: false`, deci vede
onboarding-ul chiar dacă pe dispozitiv exista un cont care îl trecuse.

Trei reguli care decurg:

1. **`queueGuestProgress` citește explicit `GUEST_PROGRESS_KEY`**, niciodată „slate-ul
   curent". La momentul conversiei flag-ul e deja stins, deci un `loadLocal()` ar
   apuca exact slate-ul contului — bug-ul de mai sus, pe ușa din dos.
2. **Migrarea din `signa-progress-v1` e a contului.** Un invitat nu moștenește nici
   date legacy.
3. **Un singur scriitor la conversie.** `AuthPanel`-ul din ecranul de conversie nu
   primește `afterAuth`: dacă ar rula și el `pushProgress` + `pullAndMergeProgress`,
   ar putea salva progresul *contului* în slate-ul de invitat cât flag-ul e încă
   aprins, iar replay-ul i-ar re-emite apoi lecțiile. Conversia o face doar
   handler-ul de `SIGNED_IN` din `useProgress`.

### 6.3. Fereastra de revendicare

Marcajul de conversie poartă un timestamp, reîmprospătat la fiecare scriere de progres
în modul invitat (`touchGuestConversion`). `CONVERSION_TTL_MS` (7 zile) măsoară deci
**inactivitate, nu vechime**: un invitat care învață săptămâni la rând nu pierde nimic,
dar un slate uitat pe un dispozitiv nu mai e absorbit de primul cont care se loghează
peste luni — la expirare se și șterge de pe disc.

Ce rămâne neacoperit, conștient: pe un dispozitiv partajat, un cont care se loghează
în fereastra de 7 zile preia progresul invitatului. Plafonat la o zi de XP de dedupe-ul
serverului; alternativa ar fi să pierdem conversia pentru cazul normal, care e mult
mai frecvent.

### 6.2. Căile spre server

Pentru invitat, toate se opresc singure:

- `queueLessonCompletion` (`src/hooks/useProgressSync.js:67–71`) iese imediat dacă nu
  există sesiune — deci **nu se acumulează coadă** în `signa-progress-pending-v1`;
- `pushProgress` și `pullAndMergeProgress` ies pe `if (!user)`;
- efectul de sync din `useProgress` (`:215–231`) ascultă `onAuthStateChange`, care
  pentru invitat nu emite `SIGNED_IN`.

Regula 7 din `CLAUDE.md` (nu scrie chei de progres în `localStorage` pe o origine cu
sesiune Supabase activă) **nu e încălcată**: invitatul e prin definiție o origine fără
sesiune. Dar exact de aici vine problema din §7 — datele scrise ca invitat rămân pe
disc după ce apare o sesiune.

Limitare acceptată: doi invitați pe același dispozitiv împart același slate de
invitat. Nu merită rezolvat; contul rezolvă asta.

---

## 7. Conversia invitat → cont

Punctul cel mai delicat al documentului. Ce se întâmplă azi, dacă nu facem nimic:

1. invitatul are `xp: 340` local;
2. își face cont → `SIGNED_IN` → `pushProgress()` face upsert pe `progress` (doar
   `letter_mastery`, restul e refuzat de `revoke update` din `schema.sql:440–442`),
   creând rândul cu `xp = 0`;
3. `pullAndMergeProgress()` citește rândul și `mergeProgress` aplică
   `xp: remote.xp ?? 0` (`src/hooks/useProgressSync.js:44`) — **XP-ul local e șters**.

Deci implicit: invitatul pierde tot, brusc, chiar în momentul în care a făcut ce voiam
noi. Inacceptabil ca experiență, dar corect ca securitate — XP-ul e autoritar pe server.

Există și o variantă mai urâtă: dacă din vreun motiv `pushProgress` eșuează, rândul
`progress` nu există, `mergeProgress` intră pe `if (!remote) return local` (`:27`) și
XP-ul de invitat **supraviețuiește local** fără corespondent pe server — utilizatorul
vede 340 XP acasă și 0 în clasament, la nesfârșit. Asta e cea mai proastă variantă
posibilă și trebuie eliminată indiferent ce decidem mai jos.

### Soluția adoptată — transfer prin re-emitere

La primul `SIGNED_IN` după o sesiune de invitat, parcurgem `progress.lessons` din
local și punem în coadă câte un `record_lesson_completion` pentru fiecare lecție cu
stele, exact prin RPC-ul autoritar. Serverul decide cât XP se dă.

XP-ul nu se ghicește: `completeLesson` îl reține în slate (`lessons[id].xp`, cea mai
bună recompensă obținută), iar conversia îl trimite ca atare, plafonat client-side la
maximul lecției ca RPC-ul să nu respingă evenimentul și să-l lase blocat în coadă. Așa
intră și **repetițiile** (`review`, plafon 90), care altfel n-ar avea din ce fi
reconstruite — n-au intrare în `LESSONS`. Reconstrucția din stele a rămas doar ca
rezervă pentru intrări scrise înainte de câmpul `xp`.

Plafoanele client vs. server sunt verificate de `src/data/xpAllowlist.test.js`, care
citește allowlist-ul direct din `supabase/schema.sql`. Fără el, un derapaj s-ar vedea
abia la prima conversie reală a unui invitat.

E sigur, și nu pentru că avem încredere în client:

- `record_lesson_completion` are un **allowlist de XP per lecție** (`schema.sql:187–199`)
  și aruncă `Invalid lesson reward` peste plafon — un `localStorage` modificat de mână
  nu poate injecta XP arbitrar;
- dedupe-ul e pe `(user_id, lesson_id, current_date)` (`:205–210`), deci replay-ul
  acordă **cel mult echivalentul unei singure zile** de joc;
- `p_stars` e validat `between 0 and 3` (`:183`).

**Invitatul nu are serie de zile.** Update-ul de la `:240–244` calculează streak-ul din
`last_practice_date`, iar toate completările replayate cad pe `current_date` — deci o
serie strânsă ca invitat n-ar avea cum să treacă pe cont. În loc s-o arătăm și apoi
s-o pierdem, n-o acumulăm deloc: `recordPractice` și `completeLesson` sar peste streak
cât `isGuestSession()`. Toate afișările sunt deja păzite de `streak > 0`, deci dispar
singure; seria pornește curat, odată cu contul.

După flush, local se curăță și se face `pullAndMergeProgress` — de acolo încolo
serverul e sursa. Curățarea rezolvă și scenariul „340 XP fantomă" de mai sus.

### Plan B (dacă re-emiterea se dovedește costisitoare)

Se șterg cheile locale de progres la `SIGNED_IN` dacă sesiunea anterioară era de
invitat, și se spune limpede în `AuthGate` că progresul nu se transferă. Mai puțin cod,
experiență mai proastă. Nu e varianta pe care mergem.

---

## 8. Capcane concrete găsite în cod

Lista de mai jos e ce ar rupe implementarea dacă nu e atinsă explicit:

1. **`useProfileSummary` rămâne pe `loading: true`** pentru `userId === undefined`
   (`:20–24`) → spinner etern pe rutele de unelte. Se transmite `null`.
2. **Rank-ul se calculează și fără sesiune** (`:46–60`): efectul interoghează view-ul
   `leaderboard`, pe care `anon` chiar are `select`. Invitatul ar primi o poziție
   calculată din XP-ul lui local — o poziție în care nu e. Se sare pe `isGuest` și
   `rank` rămâne `null`.
3. **`PAGE_ORDER`** (`src/components/Sidebar.jsx:10`) nu suportă scoaterea unui item;
   `AppShell` îl folosește pentru direcția tranziției (`:65`).
4. **`AuthPanel` e montat în două locuri** — `AuthGate` și `ProfilePage.jsx:256`.
   Butonul de invitat trebuie să apară doar în primul (§4.4).
5. **`getOwnProfile()` din `LeaderboardPage`** produce un 401 tăcut la fiecare montare.
6. **Onboarding-ul e după gate** (`src/App.jsx:92`) — ordinea actuală e deja cea bună
   pentru invitat, nu o inversa.
7. **Nu adăuga `signInAnonymously`.** Ar trece invitatul în rolul `authenticated` și i-ar
   da acces la `record_lesson_completion`, `follows`, `progress` — exact contrariul
   documentului.
8. **Slate-ul de progres nu se împarte cu contul** (§6.1). Cea mai costisitoare
   greșeală a implementării: invitatul moștenea progresul ultimului cont logat și
   l-ar fi re-emis la conversie.
9. **Flag-ul de invitat se stinge sincron, în `useProgress`**, la începutul
   handler-ului de `SIGNED_IN`, înainte de orice scriere de progres. Dacă l-ar stinge
   `App.jsx` în ascultătorul lui, ordinea celor două `onAuthStateChange` ar decide
   în ce slate aterizează progresul de pe server.

---

## 9. Plan de implementare

| Pas | Ce | Fișiere |
|---|---|---|
| 1 | `guest.js` + flag-ul în `App.jsx` | `src/lib/guest.js`, `src/App.jsx` |
| 2 | Butonul din ecranul de login (§4) | `AuthGate.jsx`, `AuthPanel.jsx` |
| 3 | Capabilități false + `user?.id ?? null` | `src/App.jsx` |
| 4 | Sidebar: rând „Invitat", fără badge de rank | `Sidebar.jsx`, `AppShell.jsx` |
| 5 | Ecranul de conversie din Profil + ieșirea din modul invitat | `ProfilePage.jsx` |
| 6 | Clasament read-only + banner | `LeaderboardPage.jsx` |
| 7 | Conversia prin re-emitere (§7) | `useProgressSync.js`, `useProgress.js` |

Pașii 1–6 sunt independenți de 7 și pot merge într-un PR separat; 7 e singurul care
atinge date și merită PR propriu, cu teste.

**Teste (vitest, lângă `useProgressSync.test.js`):**

- invitatul nu pune nimic în `signa-progress-pending-v1`;
- `mergeProgress` cu `remote` prezent și `local` de invitat → `xp` de pe server;
- replay-ul de conversie cere un `record_lesson_completion` per lecție cu stele și
  golește localul după succes;
- flag-ul de invitat dispare la `SIGNED_IN`.

**Verificare manuală** (vezi skill-ul `signa-verify`): login → „Continuă ca invitat" →
onboarding → lecție → refresh (rămâne invitat) → Profil (fără dashboard) → creare cont →
XP-ul apare în clasament.

Probat cap-coadă pe Supabase live (18.09.2026, cont de test): lecțiile strânse ca
invitat au intrat pe cont prin `record_lesson_completion`, contul a apărut în clasament
cu XP-ul lor, iar `signa-progress-pending-v1` a rămas gol — niciun eveniment respins.
Signup-ul deschide sesiune direct, deci conversia rulează imediat, nu la un login
ulterior.

```bash
npm test && npx vite build
```

---

## 10. În afara scopului

- Autentificare anonimă Supabase — respinsă, §1.
- Progres de invitat pe mai multe dispozitive — prin definiție imposibil.
- Limită de lecții pentru invitat („paywall soft") — decizie de produs, nu de arhitectură.
- Colectare de dataset fără cont — exclusă: consimțământul are nevoie de un subiect.

---

## 11. Decizii luate

1. **Intrarea e vizibilă pe ecranul de login**, ca buton secundar sub CTA-ul principal,
   pe `login` și `signup` (§4).
2. **Clasamentul e vizibil invitatului**, read-only, cu banner de conversie. Apariția în
   el rămâne blocată.
3. **Progresul se transferă la creare de cont**, prin re-emitere pe
   `record_lesson_completion`. **Invitatul nu are serie de zile** — n-ar putea fi
   transferată, deci n-o promitem (§7).
4. **La ieșirea din modul invitat, progresul local se păstrează** — utilizatorul poate
   reveni și continua. În ecranul de conversie din Profil stau două butoane:
   „Ieși din modul invitat" (`exitGuest()` → înapoi la `AuthGate`, datele rămân) și,
   separat, un „Șterge progresul de pe acest dispozitiv" explicit, cu confirmare.
