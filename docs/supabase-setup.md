# Signa — Setup Supabase (US #22)

Pași pentru un coleg. Recunoașterea semnelor rămâne pe dispozitiv — pe server
ajung doar profilul, progresul și relațiile sociale, niciodată camera/landmarks.

Ghidul de produs: [`docs/mvp-baza-de-date.md`](./mvp-baza-de-date.md). Schema: `supabase/schema.sql`.

**Proiect live:** `signa` · `https://sdwbgooayrtjlnhqxcja.supabase.co` · regiune EU (Ireland).

Deploy-ul public (Vercel) poate fi blocat pe planul Hobby când autorul commitului nu este owner al proiectului Vercel pentru repo privat. Demo-ul local rămâne pe `http://localhost:5173`.

---

## 1. Proiect Supabase (regiune EU)

1. Creează un proiect pe [supabase.com](https://supabase.com) — alege **EU** (GDPR).
2. **Authentication → Providers → Email**: signup activ. Parolă minim 8 caractere.
3. **Confirm email = OFF pentru MVP.** Aplicația nu folosește coduri OTP. Fluxul
   „Am uitat parola” folosește linkul de recovery Supabase. SMTP-ul implicit
   permite aproximativ 2 emailuri/oră pe proiect și este doar pentru test;
   pentru producție cu volum real ar trebui SMTP propriu.
4. **Authentication → URL Configuration** (valorile live, aug 2026)
   - Site URL: `https://signa-flax.vercel.app`
   - Redirect URLs: `https://signa-flax.vercel.app/**`, `https://signa-*-signa-team.vercel.app/**` (preview-uri per branch) și `http://localhost:5173/**` (dev)

## 2. Schema

Pentru proiectele existente, migrarea se aplică în această ordine:

1. SQL Editor → New query
2. Copiază tot `supabase/schema.sql` → Run
3. Rulează `supabase/storage-avatars.sql` după ce bucket-ul `avatars` există
4. Table Editor: trebuie să vezi `profiles`, `progress`, `lesson_completions`,
   `follows` și view-urile `leaderboard`, `friendships`, `user_directory`
5. Nu există coloană `parola` pe `profiles` — e corect. Parola stă în Auth.

Schema securizată mută XP/streak/lecțiile în RPC-ul
`record_lesson_completion`, protejează rolul admin, limitează citirea profilurilor
și oferă `get_own_profile()` plus `delete_own_account()`. Deploy-ul clientului
trebuie făcut după această migrare.

## 3. Chei locale

1. Project Settings → API
2. Copiază `.env.example` → `.env.local`
3. `VITE_SUPABASE_URL` = Project URL
4. `VITE_SUPABASE_ANON_KEY` = anon / public
5. Repornește `npm run dev`

**Nu commita** `.env.local`. **Nu pune** `service_role` în frontend sau Git.

## 4. Verificare rapidă

1. Profil → Creează cont (prenume, nume, username, email, parolă)
2. Table Editor: un rând nou în `profiles` + `progress`
3. Termină o lecție logat → `progress.xp` crește
4. Alt browser, același cont → același XP după login
5. Profil privat → nu mai apari în Clasament
6. Cu două conturi publice: A îl urmărește pe B, apoi B pe A → ambele afișează
   „Prieteni” în secțiunea din Profil
7. Profil privat → dispare și din căutarea socială/lista celorlalți
8. Utilizator obișnuit → Colectare, Train și Diagnostic nu apar și nu se deschid
9. „Am uitat parola” → email cu link → ecran „Alege o parolă nouă”
10. Ștergere cont → confirmare cu username, logout și dispariția datelor

## 5. Admin + profil public

Rolul nu se schimbă din aplicație. Rulează `supabase/ops-mvp.sql` în SQL Editor (contul `davidutz` → `admin` + `public`).

Sau manual:

```sql
update public.profiles
set role = 'admin', visibility = 'public'
where username = 'davidutz';
```

## 5b. Bucket „avatars" (poze de profil, US #23)

⚠️ **Verifică întâi că ești în proiectul corect.** Aplicația folosește `sdwbgooayrtjlnhqxcja` (proiectul **`signa`**), nu alt proiect din organizație. Bucket-ul creat în alt proiect nu ajută cu nimic — aplicația dă „Bucket not found" la upload, fără niciun indiciu că proiectul e de vină. Link direct: [Storage în proiectul signa](https://supabase.com/dashboard/project/sdwbgooayrtjlnhqxcja/storage/buckets).

1. Storage → **New bucket** → nume `avatars`, **Public bucket: ON**.
2. SQL Editor → rulează `supabase/storage-avatars.sql` — fără listare globală,
   scriere doar în folderul propriu `{user_id}/...`.
3. Sunt acceptate numai JPEG, PNG și WebP sub 2 MB. Clientul verifică și
   semnătura magică; SVG-urile și fișierele cu MIME fals sunt respinse.
4. Verificare: Profil → click pe avatar → alege o imagine validă → apare imediat.

## 6. Invită echipa

Project Settings → **Team** / **Members** → Invite pe email (rol Developer e suficient).

Fiecare își face `.env.local` din `.env.example` + URL + **anon** key. Fără `service_role`.

## 7. Vercel (pauză — nu e blocker pentru US #22)

1. Importă `margi-tech/signa` pe [vercel.com](https://vercel.com)
2. Environment Variables (Production **și** Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Adaugă URL-ul `.vercel.app` la Redirect URLs în Supabase
4. Preview pe branch-ul `feat/22-supabase-schema`, apoi test signup pe URL public

### Notă practică (aug 2026)

- Integrarea Supabase pe Vercel adaugă automat variabile `SUPABASE_*` / `POSTGRES_*`, dar aplicația Vite citește doar variabile cu prefix `VITE_`.
- Verifică explicit că există:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- După modificarea variabilelor de mediu, rulează **Redeploy**.

## 8. Comportament auth în aplicație

- Când Supabase este configurat, autentificarea este obligatorie.
- Fără sesiune activă, utilizatorul vede doar ecranul de login/signup (auth gate).
- Signup-ul nu cere cod OTP. Confirmarea emailului rămâne oprită în MVP.
- Resetarea parolei folosește un link de recovery și apoi `updateUser`.
- Rolul `admin` nu poate fi acordat din client; numai operațional, prin SQL.

## Ce să NU faci

- Tabel `users` cu coloană parolă
- `service_role` în `.env.local` / Vercel (e cheie de server)
- Imagini, video sau landmarks în Storage / tabele
- Google OAuth în MVP
