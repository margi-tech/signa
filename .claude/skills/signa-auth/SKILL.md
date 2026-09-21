---
name: signa-auth
description: Modifică autentificarea Signa — ecranul de login/signup, resetarea parolei, login cu Google, validări, mesaje de eroare și crearea profilului la primul login. Folosește când lucrezi la AuthGate, AuthPanel, AuthUi, authErrors, utils/username sau la trigger-ul handle_new_user.
---

# Autentificare în Signa

Cu Supabase configurat, `App.jsx` randează `AuthGate` până există **sesiune sau
mod invitat**, apoi `Onboarding` dacă `onboardingDone` e fals. Fără chei Supabase,
aplicația rămâne offline și nu cere cont.

## Harta fișierelor

| Fișier | Rol |
|---|---|
| `components/auth/AuthGate.jsx` | ecran full-screen: coloană de brand (desktop) + formular |
| `components/auth/AuthPanel.jsx` | markup-ul celor 4 moduri |
| `components/auth/useAuthForm.js` | **câmpurile, validările și apelurile Supabase** |
| `components/auth/GuestConversionCard.jsx` | ecranul de invitat din Profil (vezi `signa-guest`) |
| `components/auth/AuthUi.jsx` | piese reutilizabile: câmpuri, taburi, butoane, bannere |
| `lib/authErrors.js` | traducerea erorilor Supabase în română |
| `utils/username.js` | validatori pentru nume, username, email, parolă |

`AuthPanel` are patru moduri: `login`, `signup`, `forgot`, `reset`. Nu adăuga un
al cincilea ecran fără să verifici că `AuthGate` îl poate selecta prin
`initialMode`.

**Logica de auth stă în `useAuthForm`, nu în `AuthPanel`.** Hook-ul ține starea
câmpurilor, validările și `submitLogin` / `submitSignup` / `signInWithProvider`.
`AuthPanel` și `GuestConversionCard` sunt două layout-uri peste același flux — un
al treilea ecran de auth folosește tot hook-ul, nu-și rescrie apelurile Supabase.
`requireConfirm: false` e pentru formularele fără câmp de confirmare a parolei
(cazul cardului de invitat).

## Intrarea ca invitat

Sub CTA-ul principal din `AuthGate` stă „Continuă ca invitat" — buton secundar,
alb; singurul CTA plin rămâne cel de cont. Apare **doar prin prezența prop-ului
`onGuest`**: același `AuthPanel` e montat și în `ProfilePage`, pentru cineva deja
intrat, iar acolo prop-ul lipsește. Nu adăuga un flag separat.

Când `VITE_ENABLE_OAUTH` e pornit, separatorul „SAU" e al blocului social, iar
butonul de invitat vine după `SocialButtons` fără un al doilea separator.

## Cele patru fluxuri

**Login / signup.** Signup-ul trimite `first_name`, `last_name` și `username` prin
`options.data`. Nu insera profilul din client — trigger-ul `handle_new_user`
(`supabase/schema.sql`) creează rândurile din `profiles` și `progress` la insert
în `auth.users`, generează un username unic dacă lipsește sau e luat (bază din
email + sufix numeric) și forțează `role = 'user'`.

**Resetare parolă.** `requestPasswordReset()` trimite linkul; clientul are
`detectSessionInUrl: true`, deci userul revine autentificat, iar
`onAuthStateChange` prinde evenimentul `PASSWORD_RECOVERY` și comută pe modul
`reset`, unde `supabase.auth.updateUser({ password })` chiar schimbă parola.
Fluxul e complet — dacă pare că „doar te loghează", verifică întâi că evenimentul
ajunge, nu rescrie ecranul.

**Login cu Google.** Butonul apare doar când `VITE_ENABLE_OAUTH === 'true'` **și**
providerul e activat în Supabase. `signInWithOAuth` trimite
`redirectTo: window.location.origin`, ca userul să se întoarcă pe originea de
unde a pornit (altfel preview-urile Vercel ar arunca înapoi pe producție).
Pașii de configurare: `docs/supabase-setup.md` §8.

Apple Sign In a fost **scos intenționat** din `SocialButtons` — cere Apple
Developer Program plătit. Nu-l readăuga fără cerere explicită.

**Ștergere cont.** `deleteOwnAccount()` cheamă RPC-ul `delete_own_account`, apoi
curăță cheile locale de progres și face `signOut`. Curățarea locală face parte din
flux; fără ea, contul următor moștenește progresul afișat.

## Reguli fixe

1. **Niciun bypass de autentificare bazat pe URL.** Un parametru „de test" care
   sare peste `AuthGate` ajunge în build-ul de producție. Pentru verificări
   vizuale, randează componenta cu props stub într-un harness temporar și
   scoate-l înainte de commit.
2. **Clientul nu poate acorda roluri.** `protect_profile_role` forțează
   `role = 'user'` la orice scriere din client. Promovarea se face doar din SQL
   Editor.
3. **Mesajele de eroare trec prin `authErrorMessage()`.** Nu scrie string-uri de
   eroare inline în componente — un cod nou de la Supabase se adaugă acolo, ca
   toate ecranele să-l traducă la fel.
4. **Validarea stă în `utils/username.js`.** Aceleași reguli la signup și la
   editarea profilului; nu duplica praguri în JSX.
5. Nu trimite `role`, XP sau streak în `updateOwnProfile()`.
6. **Nu duplica apelurile de auth.** Un ecran nou de login/signup consumă
   `useAuthForm`; dacă îi lipsește ceva, extinde hook-ul, nu-l ocoli.

## Capcane cunoscute

- **Confirm email e OPRIT intenționat** în proiectul Supabase. SMTP-ul default
  are ~2 emailuri/oră pe tot proiectul; cu confirmarea pornită, signup-ul pică cu
  `500 Error sending confirmation email` **și contul nu se creează**. Dacă
  primești `over_email_send_rate_limit`, UI-ul poate afișa înșelător „email
  invalid" — de asta `authErrors.js` are un mesaj dedicat.
- Câmpurile de signup rămân montate la comutarea pe login; `Collapsible` doar le
  colapsează, cu `maxHeight` fix. Un text de eroare lung sub un câmp poate fi
  tăiat — dacă adaugi erori noi acolo, verifică vizual înălțimea.
- Indicatorul din `AuthTabs` are lățimi/poziții hardcodate (42/72px, x 0/64px),
  calibrate pe Nunito. Dacă schimbi textul taburilor, recalibrează-l. Taburile din
  `GuestConversionCard` fac invers, și e varianta bună: măsoară `offsetWidth` /
  `offsetLeft` din DOM, remăsurând la `document.fonts.ready` și la resize — Nunito
  se încarcă după primul cadru, deci o măsurătoare la montare iese greșită.
- Sub 768px coloana de brand dispare complet; verifică formularul și acolo.
- `AuthPanel` e montat în **două** locuri: `AuthGate` și `ProfilePage`. Orice
  props nou trebuie gândit pentru amândouă — de aici și butonul de invitat legat
  de prezența lui `onGuest`.

## Verificare

Rulează `signa-verify`. Specific pentru auth:

1. signup cu date valide → cont creat, profil și progres existente în Supabase;
2. username deja luat → mesaj clar, nu eroare brută de constrângere;
3. „Am uitat parola" → link → ecran „Alege o parolă nouă" → parola chiar se schimbă;
4. buton Google (dacă providerul e configurat) → revine autentificat pe aceeași origine;
5. un utilizator obișnuit nu-și poate seta `role = 'admin'`;
6. ștergerea contului elimină sesiunea **și** cheile locale de progres.
