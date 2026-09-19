---
name: signa-guest
description: Modifică modul invitat din Signa — intrarea fără cont, slate-ul separat de progres, cardul de conversie din Profil și mutarea progresului pe cont la primul login. Folosește când lucrezi la lib/guest.js, GuestConversionCard, ramura isGuest din ProfilePage, la capabilitățile din App.jsx sau la orice atinge coada de progres a unui invitat.
---

# Modul invitat în Signa

Invitatul învață fără cont. Nu e un utilizator anonim în Supabase: e o sesiune
**fără `user_id`**, pur client-side. Documentul complet de arhitectură e
`docs/guest-mode.md` — skill-ul ăsta e partea pe care o uiți și te costă.

## Modelul, în trei propoziții

1. `src/lib/guest.js` ține trei chei: flag-ul de sesiune, marcajul de conversie și
   numele slate-ului de progres al invitatului.
2. Deschis: lecții, cameră, silabisire, repetiție, referințe, clasament read-only.
   Închis: profil, social, sincronizare, colectare/antrenare/diagnostic.
3. La creare de cont, lecțiile strânse ca invitat se **re-emit** prin
   `record_lesson_completion` — singurul loc care acordă XP.

**Nu adăuga `signInAnonymously()`.** Ar trece invitatul în rolul `authenticated`
și i-ar da acces la `record_lesson_completion`, `follows` și `progress` — exact
contrariul modelului. Ar umple și `profiles` cu conturi fantomă care apar apoi în
căutarea de prieteni.

## ⚠ Slate-ul de progres nu se împarte cu contul

`signa-progress-v2` e o cheie a **dispozitivului**, nu a contului: rămâne pe disc
și după sign-out. Prima implementare a lăsat invitatul să citească aceeași cheie,
și un utilizator cu toate lecțiile făcute a intrat ca invitat și și-a văzut cele
17 lecții bifate.

Afișarea era partea blândă. Partea gravă: marcajul de conversie era pus, deci la
următorul login replay-ul ar fi re-emis toate lecțiile contului ca și cum ar fi
fost făcute azi — XP nemeritat direct în clasamentul live al echipei.

Deci cheia de progres e o funcție de identitate:

```js
progressKey() // signa-progress-guest-v1 dacă isGuestSession(), altfel signa-progress-v2
```

Nu se copiază nimic între slate-uri. Intrarea și ieșirea din modul invitat doar
comută cheia activă și cer `reloadFromStorage()` din `useProgress`, ca starea
React să reia de la slate-ul nou.

## Capcanele care au costat muncă

**1. `queueGuestProgress` citește explicit cheia de invitat.** La momentul
conversiei flag-ul e deja stins, deci un `loadLocal()` ar apuca exact slate-ul
contului și i-ar re-emite lecțiile vechi. Același bug, pe ușa din dos.

**2. `INITIAL_SESSION` se emite și fără sesiune**, la fiecare încărcare de pagină.
Handler-ul de progres trebuie să ceară `session?.user`. Fără garda asta, un simplu
refresh în modul invitat consuma conversia, stingea flag-ul și ștergea slate-ul —
progresul dispărea, iar omul era aruncat înapoi la login.

**3. Un singur scriitor la conversie.** `AuthPanel`-ul din cardul de invitat
primește `afterAuth` gol. Dacă ar rula și el `pushProgress` + `pullAndMergeProgress`,
ar putea salva progresul contului în slate-ul de invitat cât flag-ul e încă aprins,
iar replay-ul i-ar re-emite apoi lecțiile. Conversia o face **doar** handler-ul de
`SIGNED_IN` din `useProgress`, care stinge flag-ul sincron, la începutul lui.

**4. `LESSONS[].id` e număr (`1.1`), cheile din `progress.lessons` sunt string-uri.**
`LESSONS.find((l) => l.id === lessonId)` întoarce mereu `undefined` și conversia nu
mută nimic — fără nicio eroare. Compară pe `String(l.id)`.

## Conversia

XP-ul nu se ghicește: `completeLesson` reține recompensa în slate
(`lessons[id].xp`), iar conversia o trimite ca atare, plafonată client-side la
maximul lecției. Așa intră și repetițiile (`review`, plafon 90), care n-au intrare
în `LESSONS`. Reconstrucția din stele a rămas doar ca rezervă pentru intrări
scrise înainte de câmpul `xp`.

Serverul rămâne autoritatea: allowlist de XP per lecție și dedupe pe
`(user_id, lesson_id, current_date)`, deci replay-ul nu poate acorda mai mult
decât o zi de joc. `src/data/xpAllowlist.test.js` compară plafoanele clientului cu
allowlist-ul citit direct din `supabase/schema.sql` — fără el, un derapaj s-ar
vedea abia la prima conversie reală.

Marcajul de conversie poartă un timestamp reîmprospătat la fiecare scriere de
progres, deci fereastra măsoară **inactivitate, nu vechime**: un invitat care
învață săptămâni la rând nu pierde nimic, dar un slate uitat pe un dispozitiv
expiră și se șterge singur.

**Invitatul nu are serie de zile.** Serverul o calculează din `last_practice_date`,
iar completările replayate cad toate pe ziua curentă — deci n-ar avea cum să treacă
pe cont. În loc s-o arătăm și apoi s-o pierdem, `recordPractice` și `completeLesson`
o sar cât `isGuestSession()`. Toate afișările sunt păzite de `streak > 0`, deci
dispar singure.

## Unde stă UI-ul

| Loc | Ce |
|---|---|
| `AuthGate` → `AuthPanel` | butonul „Continuă ca invitat", sub CTA-ul principal |
| `Sidebar` | rândul de jos devine „Invitat / Creează cont"; fără badge de rang |
| `ProfilePage` (ramura `isGuest`) | `GuestConversionCard` — `ProfileDashboard` nu se montează deloc |
| `LeaderboardPage` | read-only, cu banner de conversie; „poziția ta" pe 0 / „—" |

Butonul de invitat apare **doar prin prezența prop-ului `onGuest`**. Același
`AuthPanel` e montat și în `ProfilePage`, pentru cineva deja intrat — acolo prop-ul
lipsește, deci butonul nu se randează. Fără flag în plus.

Granița de securitate e că `ProfileDashboard` nu se montează, nu că i-am ascunde
butoane. Nicio cale prin UI nu ajunge la `updateOwnProfile`, `uploadAvatar`,
`deleteOwnAccount`, `FriendsSection` sau `onSync`.

Capabilitățile de dataset se calculează cu `!isGuest` explicit în `App.jsx` —
altfel ramura „fără Supabase" ar deschide uneltele pe un build fără chei.

## Verificare

Vezi și `signa-verify`. Specific pentru invitat:

1. login → „Continuă ca invitat" → onboarding → aplicația;
2. **refresh** → rămâne invitat, cu progresul intact (capcana 2);
3. Profil → cardul de conversie, fără dashboard;
4. Clasament → se încarcă, fără tine în el, fără 401 în consolă;
5. o lecție ca invitat scrie în `signa-progress-guest-v1`, iar
   `signa-progress-v2` rămâne neatins;
6. creare de cont → lecțiile apar pe cont, `signa-progress-pending-v1` rămâne gol,
   slate-ul de invitat se șterge.

Pentru (6) ai nevoie de un cont real: creează unul de test, verifică, apoi
șterge-l din Profil. Nu-l face pe contul tău — replay-ul s-ar amesteca peste
progresul existent.
