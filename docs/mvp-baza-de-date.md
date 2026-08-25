# Signa — MVP bază de date (US #22)

Document istoric pentru US #22, actualizat cu starea curentă a backendului.

**Scop:** conturi reale, progres în cloud, clasament, aplicație publică pe Vercel.

**Constrângere:** recunoașterea semnelor rămâne pe dispozitiv — zero imagini, zero landmarks pe server.

Ticket Taiga: [#22 Creare tabele/schema pentru baza de date](https://tree.taiga.io/project/paula1999-signa/us/22).

---

## Decizie de arhitectură

Nu facem un tabel `users` cu coloană `parola`.

Ticket-ul cere: nume, prenume, email, username, parolă, XP, rol, data înscrierii, profil public/privat.

- **Parola** și **emailul** stau în Supabase Auth (`auth.users`). Nu le duplicăm.
- Restul câmpurilor merg în `profiles` + `progress`.
- Asta acoperă US #22 fără să stocăm parole în schema noastră.

Hosting: **Vercel** (SPA Vite). Railway nu e necesar — nu avem backend Node propriu.

Auth MVP: **doar email + parolă**. Google OAuth rămâne după MVP.

---

## Următorii 3 pași

1. [x] Creează proiectul Supabase (regiune EU) și pune cheile în `.env.local` — vezi [`docs/supabase-setup.md`](./supabase-setup.md)
2. [x] Extinde schema: `profiles` (nume, prenume, username, rol, vizibilitate) + RLS + trigger
3. [x] Leagă signup/login de câmpurile noi — [ ] deploy pe Vercel (blocat de permisiuni Vercel Hobby pe repo privat)

---

## Mapare Taiga → schema MVP

| Câmp din ticket | Unde trăiește | MVP |
|---|---|---|
| nume | `profiles.last_name` | Gata în schema + UI |
| prenume | `profiles.first_name` | Gata în schema + UI |
| email | `auth.users.email` | Deja în Auth — nu duplicăm |
| username | `profiles.username` UNIQUE | Gata (index case-insensitive) |
| parolă | Supabase Auth (hash intern) | Nu stocăm noi |
| progress / XP | `progress` + `lesson_completions` | Acordat server-side prin RPC |
| rol admin/user | `profiles.role`, default `user` | Protejat prin trigger; admin doar din SQL |
| data înscrierii | `profiles.created_at` | Deja în schema |
| profile mode | `profiles.visibility` (`public` / `private`) | Gata în schema + UI |
| avatar | `profiles.avatar_url` + Storage `avatars` | Gata în Profil |
| follow/prieteni | `follows` + view `friendships` | Gata în Profil |

---

## Ce e deja în repo (nu refacem)

| Piesă | Fișier | Stare |
|---|---|---|
| Client + helper-e profil | `src/lib/supabase.js` | Gata; pornește doar cu chei în `.env` |
| Schema + RLS + trigger | `supabase/schema.sql` | MVP complet — de rulat în SQL Editor |
| Login / register / edit profil | `src/pages/ProfilePage.jsx` | Nume, prenume, username, vizibilitate |
| Sync progres | `src/hooks/useProgressSync.js` | Server-authoritative + coadă offline per user |
| Clasament (view) | `src/pages/LeaderboardPage.jsx` | Doar profile public; mesaj dacă ești privat |
| Social | `FriendsSection.jsx` + `src/lib/supabase.js` | Follow reciproc, cereri derivate, căutare |
| Config Vercel SPA | `vercel.json` | Gata, fără proiect live |
| Setup uman | `docs/supabase-setup.md` | Pași dashboard + Vercel |

---

## Planul de execuție

Ordinea e obligatorie: fără proiect live, schema nu poate fi testată; fără schema, UI-ul de signup nu are unde scrie; fără URL public, Auth nu confirmă redirect-urile de producție.

### Faza 0 — Decizii (30 min, echipă)

Închide ambiguitățile din ticket înainte de SQL. Owner: David + cine are acces la org-ul GitHub/Supabase.

- [x] Arhitectură: `auth.users` + `profiles`, nu tabel `users` cu coloană parolă
- [x] Hosting: Vercel (SPA Vite), nu Railway — deploy public amânat (Hobby)
- [x] MVP: doar email + parolă. Google OAuth rămâne după MVP
- [x] Org Supabase: `margi-tech's Org`, proiect `signa`, owner David
- [ ] Confirm email OFF până la demo (Authentication → Providers → Email)

### Faza 1 — Proiect Supabase live

Cont + chei. Fără asta, UI-ul de Profil rămâne pe banner-ul „Supabase nu e configurat”.

Fișiere: `.env.example`, `.env.local` (gitignored).

- [x] Creează proiectul pe [supabase.com](https://supabase.com), regiune **EU** (GDPR)
- [ ] Auth → Email: Confirm email OFF, Site URL = `http://localhost:5173`
- [x] Copiază `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` în `.env.local` (nu se commitează)
- [x] Service role key rămâne doar în dashboard — niciodată în frontend sau Git *(documentat în `.env.example`)*
- [ ] Invită membrii echipei în organizația Supabase

### Faza 2 — Schema SQL de MVP

Tabelele `profiles`, `progress`, `follows`; view-urile `leaderboard`,
`friendships`, `user_directory`; trigger la signup și politici RLS.

Fișier: `supabase/schema.sql`. Rulezi totul în SQL Editor.

- [x] ALTER `profiles`: `last_name`, `first_name`, `username`, `role`, `visibility`
- [x] UNIQUE(`username`) case-insensitive + CHECK `role IN ('user', 'admin')` default `user`
- [x] CHECK `visibility IN ('public', 'private')` default `public`
- [x] Trigger `handle_new_user` citește nume/prenume/username din `raw_user_meta_data`
- [x] RLS `profiles`: tabela completă nu este publică; owner prin RPC, ceilalți prin view-uri allowlist
- [x] View `leaderboard`: doar `visibility = public`, fără email, fără parolă
- [x] `progress` + `lesson_completions`: XP/streak/lecții numai prin RPC, mastery own row
- [x] Rulează SQL-ul în SQL Editor și verifică tabelele + view-urile de mai sus
- [ ] Cont de test + un admin — rulează `supabase/ops-mvp.sql` (`davidutz` → admin + public)

### Faza 3 — Legătura cu aplicația

Ticket-ul cere explicit integrare cu UI signup/login.

Fișiere: `ProfilePage.jsx`, `LeaderboardPage.jsx`, `useProgress.js`, `useProgressSync.js`, `App.jsx`.

- [x] Signup: nume, prenume, username, email, parolă — metadata către `signUp()`
- [x] Validare username: 3–20 caractere, unic, fără spații; mesaj dacă e luat
- [x] Profil: editare nume/prenume/username/vizibilitate; logout existent rămâne
- [x] `role` nu e editabil din UI (doar din Supabase Table Editor)
- [x] Sync automat după `completeLesson` + la login (butonul manual rămâne backup)
- [x] Clasament: nume afișat din prenume/username; profilurile private nu apar
- [x] Fără sesiune: aplicația rămâne blocată în ecranul de autentificare (auth obligatoriu)
- [x] Resetare parolă prin link, ștergere proprie de cont și unelte interne admin-only

### Faza 4 — Aplicație publică (Vercel)

Signa e PWA static (Vite). Vercel e potrivit; Railway ar fi pentru un backend Node pe care nu îl avem.

Fișier: `vercel.json` (deja gata).

- [x] Proiect Vercel legat de GitHub `margi-tech/signa`
- [x] Environment Variables: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Production și Preview)
- [ ] Supabase Auth: Redirect URLs = domeniul Vercel + localhost
- [ ] Deploy neblocat pe URL public (în prezent blocat de Vercel Hobby când autorul commitului nu e owner de proiect)

### Faza 5 — Acceptare US #22

Închidem sprint-ul doar după ce un coleg poate crea un cont pe URL-ul public și își vede XP-ul pe un al doilea browser.

- [x] Test merge XP: acoperit în `useProgressSync.test.js` (două browsere / max XP)
- [x] Test profil privat: nu apare în clasament (verificat live)
- [x] Notă pentru echipă: [`docs/supabase-setup.md`](./supabase-setup.md)
- [x] PR `feat/22-supabase-schema` → `main` (merge commit `047f0a2`)
- [ ] Bifează US #22 în Taiga după deploy public funcțional

---

## În afara MVP (nu le facem acum)

| Idee | De ce așteaptă |
|---|---|
| Tabel custom `users` cu `parola` | Duplicat nesigur al Auth; hash-ul e treaba Supabase |
| Google / Apple login | Complică Auth redirect-urile; email e suficient pentru demo |
| Panou admin în UI | Rolul se setează din Table Editor pentru 1–2 admini |
| Clasament săptămânal | View extra; all-time e destul |
| Railway / server propriu | Nu avem API Node; totul e SPA + Supabase |
| Landmarks / imagini / video în DB | Interzis explicit (GDPR + cost + contract produs) |

---

## Criterii de acceptare (demo)

| # | Criteriu | Cum verifici |
|---|---|---|
| 1 | Signup cu nume, prenume, username, email, parolă | Creezi un cont din Profil |
| 2 | Parola nu e vizibilă în Table Editor pe `profiles` | Deschizi tabela — zero coloană parolă |
| 3 | La signup apar rânduri în `profiles` + `progress` | SQL Editor / Table Editor |
| 4 | XP se salvează în cloud după o lecție (logat) | Al doilea browser, același cont |
| 5 | Fără login, accesul e blocat până la autentificare | Fereastră incognito: vezi doar ecranul de auth |
| 6 | Profil privat nu apare în clasament | Schimbi visibility, reîncarci Clasament |
| 7 | Există rol admin vs user în DB | Un rând cu `role=admin`, restul `user` |
| 8 | App publică pe Vercel, signup funcționează | URL `.vercel.app`, nu doar localhost |

---

## Fișiere de referință

- `supabase/schema.sql` — schema SQL
- `supabase/ops-mvp.sql` — admin + profil public pentru `davidutz`
- `src/lib/supabase.js` — client (activ doar cu chei)
- `.env.example` — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `vercel.json` — rewrite SPA + cache modele
- [`docs/supabase-setup.md`](./supabase-setup.md) — pași dashboard Supabase
- `docs/impartirea-muncii.md` — Persoana 4 (backend & conturi)
