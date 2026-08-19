# Signa — Setup Supabase (US #22)

Pași pentru un coleg. Recunoașterea semnelor rămâne pe dispozitiv — pe server ajung doar profil + XP.

Ghidul de produs: [`docs/mvp-baza-de-date.md`](./mvp-baza-de-date.md). Schema: `supabase/schema.sql`.

**Proiect live:** `signa` · `https://sdwbgooayrtjlnhqxcja.supabase.co` · regiune EU (Ireland).

Deploy-ul public (Vercel) poate fi blocat pe planul Hobby când autorul commitului nu este owner al proiectului Vercel pentru repo privat. Demo-ul local rămâne pe `http://localhost:5173`.

---

## 1. Proiect Supabase (regiune EU)

1. Creează un proiect pe [supabase.com](https://supabase.com) — alege **EU** (GDPR).
2. **Authentication → Providers → Email**: signup activ. Parolă minim 8 caractere.
3. **Confirm email = OFF.** Ține-l oprit. SMTP-ul default Supabase permite ~2 emailuri/oră **pe tot proiectul**, deci cu el pornit nimeni nu își mai poate face cont. Simptom: API-ul întoarce `over_email_send_rate_limit`, dar UI-ul poate afișa înșelător „Folosește un email valid”. Reactivarea are sens doar împreună cu un SMTP propriu care poate livra către toți membrii echipei.
4. **Authentication → URL Configuration** (valorile live, aug 2026)
   - Site URL: `https://signa-flax.vercel.app`
   - Redirect URLs: `https://signa-flax.vercel.app/**`, `https://signa-*-signa-team.vercel.app/**` (preview-uri per branch) și `http://localhost:5173/**` (dev)

## 2. Schema

1. SQL Editor → New query
2. Copiază tot `supabase/schema.sql` → Run
3. Table Editor: trebuie să vezi `profiles`, `progress` și view-ul `leaderboard`
4. Nu există coloană `parola` pe `profiles` — e corect. Parola stă în Auth.

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

## 5. Admin + profil public

Rolul nu se schimbă din aplicație. Rulează `supabase/ops-mvp.sql` în SQL Editor (contul `davidutz` → `admin` + `public`).

Sau manual:

```sql
update public.profiles
set role = 'admin', visibility = 'public'
where username = 'davidutz';
```

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

## Ce să NU faci

- Tabel `users` cu coloană parolă
- `service_role` în `.env.local` / Vercel (e cheie de server)
- Imagini, video sau landmarks în Storage / tabele
- Google OAuth în MVP
