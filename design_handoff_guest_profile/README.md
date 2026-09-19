# Handoff: Profil — cont de invitat, varianta `2a` („hero verde sus, rând alb dedesubt")

## Prompt de pornire pentru Claude Code

> Citește `design_handoff_guest_profile/README.md` în întregime, apoi deschide
> `design_handoff_guest_profile/Profil Invitat.dc.html` în browser. Implementează **doar
> opțiunea cu badge-ul `2a`** (prima din pagină, turul 2 — „Stivuit: verde sus, alb
> dedesubt"), rescriind layoutul din `src/components/auth/GuestConversionCard.jsx`.
> Păstrează logica existentă (`useAuthForm`, `useCountUp`, `AuthInput`, `MessageBanner`,
> `onExitGuest`) — se schimbă **doar** structura vizuală și animațiile. Aliniază-te la
> limbajul vizual din `src/pages/HomePage.jsx` (hero gradient + grilă `1.55fr / 1fr` de
> carduri albe). Nu atinge fluxul Supabase și nici ramura de utilizator autentificat din
> `ProfilePage.jsx`.

## Ce se schimbă față de ce e pe main

Pe main, `GuestConversionCard` e un card pe **două coloane** (panou verde 352px în stânga,
formular în dreapta) — motivul pentru care ecranul nu seamănă cu restul aplicației.
Varianta `2a` îl **stivuiește** și îl aduce în limbajul paginii Acasă:

```
antet de pagină          (eyebrow + titlu + 2 pastile în dreapta)
hero verde full-width    (identitate + progres + beneficii + 2 butoane)
grilă 1.55fr / 1fr       (stânga: cardul de formular · dreapta: rezumat + „Nu acum?")
```

Panoul verde nu mai stă lângă formular, ci deasupra lui, pe toată lățimea, exact ca
blocul „Continuă unde ai rămas" de pe Acasă.

## About the Design Files

Fișierele din pachet sunt **referințe de design realizate în HTML** — arată aspectul și
comportamentul dorit, **nu cod de producție care se copiază**. Recrează designul în
codebase-ul existent (React 18 + Vite + Tailwind), cu clasele și tokenii din
`tailwind.config.js` / `src/index.css`. Stilurile inline din prototip există doar pentru
streamingul preview-ului.

Prototipul conține mai multe opțiuni. Se implementează **numai `2a`**. `1a` e starea veche,
`1b` e ce e pe main acum, `1c` a fost respinsă — rămân doar ca referință.

## Fidelity

**High-fidelity.** Culori, tipografie, spațieri, radiusuri, umbre, copy și animații sunt
finale. Unde o valoare n-are token în temă, folosește valoarea arbitrară Tailwind
(`rounded-[26px]`, `shadow-[0_20px_48px_rgba(8,74,52,.24)]`) în loc să inventezi tokeni noi.

## Layout

Containerul invitatului e pe **toată lățimea conținutului** (nu mai e îngustat).
Padding: `34px 44px 44px` desktop, `22px 16px 32px` mobil.
Fundalul secțiunii: `radial-gradient(ellipse 70% 50% at 85% 0%, #FFFDF7, #FBF6ED)`.

Ordinea verticală: antet → **26px** → hero verde → **22px** → grila de carduri albe.

---

### 1. Antetul de pagină

Rând `flex items-start justify-between gap-6`.

**Stânga:**
- eyebrow „Profil · Modul invitat" — 12px / 800 / uppercase / tracking `.22em` / `#A69C8D`;
- `h1` 2.6rem / 900 / tracking `-.025em` / line-height 1.1 / `text-wrap: pretty` /
  `text-ink-900`: „Ai deja **{340 XP}** de mutat pe cont.". Span-ul cu XP e `relative`,
  `whitespace-nowrap`, tabular-nums, cu subliniere absolută: `left:0;right:6px;bottom:4px`,
  height 8px, radius 4px, `rgba(52,211,153,.32)`, `origin-left`, animată pe scaleX.

**Dreapta** (două pastile, `flex gap-2.5`, `pt-1.5`):
- ambru: `bg-[#FFF7E8]`, border `1px rgba(245,158,11,.18)`, text `#b45309`, radius 999px,
  padding `9px 15px`, 13px / 800, cu `LockIcon` 13px — „Doar pe acest dispozitiv";
- neutră: `bg-white`, border `1px rgba(46,42,36,.08)`, `text-ink-700`, tabular-nums —
  „Nv. {3} · {340} XP".

Pe mobil pastilele trec sub titlu (`flex-wrap`), nu dispar.

### 2. Heroul verde (full width)

Container: `rounded-[26px]`, padding `34px 36px`,
`bg-[linear-gradient(125deg,#0f7d59_0%,#0b6446_58%,#075237_100%)]`,
`shadow-[0_20px_48px_rgba(8,74,52,.24)]`, `relative overflow-hidden`.

Decor (toate `aria-hidden`, `pointer-events-none`):
- aurora verde: absolut `top:-90px;right:-40px`, 300×300, `blur(46px)`,
  `radial-gradient(circle, rgba(52,211,153,.5), transparent 70%)`, `sg-aurora-a` 16s;
- aurora albă: absolut `bottom:-110px;left:20%`, 280×280, `blur(50px)`,
  `radial-gradient(circle, rgba(255,255,255,.18), transparent 72%)`, `sg-aurora-b` 21s;
- sheen: bandă verticală de 34% lățime, `linear-gradient(90deg, transparent,
  rgba(255,255,255,.14), transparent)`, `sg-sheen 6.5s cubic-bezier(.4,0,.2,1) 1.6s infinite`.

**Rândul de sus** — `flex items-start justify-between gap-7`:

*Stânga:*
- eyebrow „Progres local · gata de transfer" — 11.5px / 800 / uppercase / tracking `.2em` /
  `rgba(209,250,229,.85)`, margin-bottom 12px;
- rând identitate (`flex items-center gap-3.5`):
  - avatar 52px: cerc `bg-white/[.14]` cu `UserIcon` 24px `#d1fae5`, plus inel exterior
    `2px solid rgba(52,211,153,.7)` care pulsează;
  - `h2` „Invitat" — **2.05rem** / 900 / alb / tracking `-.02em` / line-height 1.08;
  - sub nume, 13.5px / 700 / `rgba(209,250,229,.66)` / tabular-nums:
    „{6 lecții} · {340 XP} · încă {60} XP până la Nv. {4}".

*Dreapta:* coloană centrată cu inelul de nivel:
- 78×78, glow: `inset:-6px`, radius 999px, `rgba(52,211,153,.35)`, `blur(14px)`,
  `sg-ring-glow 3.4s ease-in-out infinite`;
- SVG rotit −90°, `r=30`: disc de fundal `rgba(255,255,255,.10)`, arc `#34d399`,
  `stroke-width 3`, `linecap round`, `dasharray 189`,
  `dashoffset = 189 * (1 − xpIntoLevel/xpNeeded)` (în prototip 102 ≈ 46%);
- în centru procentul — 16px / 900 / alb / tabular-nums;
- sub inel: „SPRE NV. {4}" — 10.5px / 800 / uppercase / tracking `.14em` /
  `rgba(209,250,229,.7)`.

**Beneficiile** (margin-top 26px): label „SE DEBLOCHEAZĂ CU CONTUL" — 10.5px / 800 /
uppercase / tracking `.2em` / `rgba(209,250,229,.72)`, apoi un rând `flex flex-wrap gap-2.5`
de chip-uri: padding `11px 17px`, radius 12px, `bg-white/10`, border
`1px rgba(255,255,255,.15)`, text `#ECFDF5` 13.5px / 700, icon 16px. Hover:
`bg-white/20` + `translateY(-2px)`, 280ms `cubic-bezier(.22,1,.36,1)`.
Conținut (iconițele există deja în `src/components/icons.jsx`):
`ChartIcon` Clasament · `UsersIcon` Prieteni · `RepeatIcon` Progres sincronizat ·
`UserIcon` Poză și nume.

**Hairline** `height 1px`, `rgba(255,255,255,.14)`, `margin: 26px 0 22px`.

**Butoanele** (`flex items-center gap-3`):
- primar: `bg-white`, text `#0b6446`, padding `17px 28px`, radius 15px, 15px / 800,
  `shadow-[0_10px_24px_rgba(4,44,32,.22)]`, cu sheen discret și săgeată 16px care
  oscilează (`sg-arrow 1.8s ease-in-out infinite`) — „Creează cont";
  hover `translateY(-2px)` + umbră mai mare, active `scale(.97)`;
- secundar: `bg-white/[.12]`, border `1px rgba(255,255,255,.16)`, text alb —
  „Am deja cont"; hover `bg-white/20` + `translateY(-2px)`.

**Comportament:** ambele butoane **setează `mode`** (`signup` / `login`) **și focusează
câmpul de email** din cardul de formular de mai jos (`requestAnimationFrame(() =>
emailRef.current?.focus())`). Nu fac submit și nu navighează.

### 3. Grila albă de dedesubt

`grid grid-cols-[1.55fr_1fr] gap-[22px] items-start`. Sub ~900px → o singură coloană.
Toate cardurile: `bg-white`, border `1px rgba(46,42,36,.05)`, `rounded-[26px]`,
`shadow-[0_10px_30px_rgba(46,42,36,.06)]`.

#### 3a. Cardul de formular (stânga) — padding `30px 32px 32px`

- **Taburi:** rând `gap-[22px]`, border-bottom `1px rgba(46,42,36,.06)`, butoane
  14px / 700 `whitespace-nowrap`, activ `text-ink-900` / inactiv `text-ink-400`.
  Indicator: bară absolută `bottom:0`, height 2px, `bg-signa-500`, cu **lățimea și X-ul
  măsurate din DOM** (`offsetWidth` / `offsetLeft` ale butonului activ, remăsurate la
  `document.fonts.ready` și la resize) — logica există deja pe main, se păstrează.
  Etichete: „Cont nou" / „Am deja cont".
- **Titlu** 27px / 900 / tracking `-.02em`: „Creează-ți contul" / „Bine ai revenit".
- **Subtitlu** 14px / 600 / `text-ink-500`: „Un minut, și progresul de invitat devine al
  contului tău." / „Intră în cont — progresul de invitat se mută automat."
- **Câmpuri** (margin-top 20px, `flex flex-col gap-3.5`):
  - grup doar-signup: Prenume + Nume (`grid-cols-2 gap-3`), apoi Username cu hint
    „Așa te vor găsi prietenii în Signa."; colapsează cu `max-height 232px → 0` +
    `opacity 1 → 0`, `pointerEvents:none` când e ascuns;
  - **Email și Parolă stau pe două coloane** (`grid-cols-2 gap-3`) — diferență față de main,
    unde sunt una sub alta; pe mobil trec pe o coloană;
  - bara de putere a parolei, pe toată lățimea, sub grila celor două câmpuri.
  - Folosește `AuthInput` din `AuthUi.jsx` (are deja fundalul `#FDFCF9`, radius 16px,
    focus `border-signa-500` + `ring-4 ring-signa-500/[.14]` + `-translate-y-px`).
    Padding vertical 15px.
- **CTA:** lățime 100%, margin-top 20px, radius 16px, padding 17px, 15px / 800, alb pe
  `linear-gradient(180deg,#10b981,#059669)`, `shadow-[0_10px_24px_rgba(16,185,129,.3)]`,
  sheen animat, săgeată 18px. Text „Creează cont" / „Intră în cont"; stările `busy`
  („Se creează…" / „Se conectează…") rămân ca azi.
- Sub CTA: `MessageBanner` (dacă există), apoi nota centrată 12.5px / 600 / `text-ink-400`:
  „Progresul rămâne pe dispozitiv — poți reveni oricând."

#### 3b. Coloana din dreapta (`flex flex-col gap-3.5`)

**Card „Ce se mută pe cont"** — padding `30px 28px`:
- label 11px / 800 / uppercase / tracking `.19em` / `text-ink-400`;
- două statistici (`grid-cols-2 gap-[18px]`, margin-top 18px): XP-ul (23px / 900 /
  tabular-nums, animat cu `useCountUp`) cu eticheta „XP STRÂNS"; și „{6}**/17**"
  (numărul mic în `text-ink-400`) cu eticheta „LECȚII FĂCUTE". Etichetele: 11px / 800 /
  uppercase / tracking `.14em` / `text-ink-400`;
- bară de progres lecții: height 6px, radius 999px, track `rgba(46,42,36,.07)`, umplere
  `linear-gradient(90deg,#34d399,#10b981)`, lățime `lessonsCount / totalLessons`,
  animată `sg-grow-x 1s` cu delay `.8s`;
- separator `1px rgba(46,42,36,.07)`, apoi rând cu chip `RepeatIcon` (30px, radius 10px,
  `bg-signa-100`, icon `#047857`) și textul 13px / 700 / `text-ink-700`: „Transferul e
  automat, la prima conectare. Seria de zile pornește odată cu contul."

**Card „Nu acum?"** — padding `24px 28px 26px`: titlu 15px / 900; paragraf 13px / 600 /
`text-ink-500` — „Poți continua ca invitat — camera și semnele rămân pe dispozitiv.";
buton full-width, padding 13px, radius 15px, border `1px rgba(46,42,36,.08)`,
`text-ink-700`, hover `bg-cream-100` + `translateY(-1px)` — „Ieși din modul invitat"
(`onExitGuest`).

**Ștergerea progresului local:** adaug-o aici **doar dacă** handlerul cu confirmare există
deja pe main; altfel nu introduce fluxul.

## Animații

Keyframes noi de adăugat în `src/index.css` (restul există deja din implementarea `1b`):

```css
@keyframes sg-pop       { 0% {opacity:0;transform:scale(.7)} 60% {transform:scale(1.06)} 100% {opacity:1;transform:scale(1)} }
@keyframes sg-scale-in  { from {opacity:0;transform:scale(.92)} to {opacity:1;transform:scale(1)} }
@keyframes sg-arrow     { 0%,100% {transform:translateX(0)} 50% {transform:translateX(4px)} }
@keyframes sg-ring-glow { 0%,100% {opacity:.28;transform:scale(1)} 50% {opacity:.55;transform:scale(1.1)} }
```

### Intrare (o dată, la montare) — `cubic-bezier(.22,1,.36,1)` dacă nu scrie altfel

| Element | Animație | Durată / delay |
| --- | --- | --- |
| eyebrow antet | `sg-fade-right` | .6s / .08s |
| h1 | `sg-fade-up` | .7s / .16s |
| pastila ambru / pastila Nv. | `sg-scale-in` | .5s / .2s · .28s |
| heroul verde | `sg-fade-up` | .75s / .34s |
| eyebrow hero | `sg-fade-right` | .6s / .5s |
| rând identitate | `sg-fade-up` | .7s / .56s |
| avatar | `sg-pop-avatar` (`cubic-bezier(.34,1.5,.64,1)`) | .78s / .6s |
| inelul de nivel | `sg-pop` (`cubic-bezier(.34,1.5,.64,1)`) | .6s / .66s |
| arcul inelului | `sg-ring-draw` | 1.3s / .7s |
| label „se deblochează" | `sg-fade-in` | .6s / .66s |
| cele 4 chip-uri | `sg-pop` | .5s / .72s, .78s, .84s, .9s |
| butoanele hero | `sg-fade-up` | .6s / 1s · 1.06s |
| cardul de formular | `sg-fade-up` | .75s / .44s |
| cardul de rezumat | `sg-fade-up` | .75s / .52s |
| cardul „Nu acum?" | `sg-fade-up` | .75s / .6s |
| sublinierea din h1 · bara de lecții | `sg-grow-x` (origin left) | .9s / .9s · 1s / .8s |
| numărătorul XP | `useCountUp` | 1400ms, 0 → XP real |

### Continue

`sg-aurora-a` (16s) · `sg-aurora-b` (21s) · `sg-sheen` pe hero (6.5s, delay 1.6s), pe
butonul primar (4.5s, delay 2s) și pe CTA (3.6s) · `sg-pulse-ring` pe avatar (3.4s) ·
`sg-ring-glow` (3.4s) · `sg-arrow` (1.8s).

`@media (prefers-reduced-motion: reduce)` există deja global și oprește tot; `useCountUp`
respectă deja preferința.

## State Management

| Stare | Tip | Rol |
| --- | --- | --- |
| `mode` | `'signup' \| 'login'` | comută copy, CTA, câmpurile de signup |
| `showPassword` | `boolean` | butonul „Arată" |
| `tabRect` | `{w,x}` | indicatorul de tab, măsurat din refs (logica existentă) |
| `emailRef` | ref | focusat de butoanele din hero |
| `busy`, `banner`, câmpurile | din `useAuthForm` | neschimbate |

Props: `xp`, `level`, `xpIntoLevel`, `xpNeeded`, `lessonsCount`, `onExitGuest` — toate
folosite. Procentul inelului = `xpIntoLevel / xpNeeded`; „încă N XP" = `xpNeeded - xpIntoLevel`;
nivelul următor = `level + 1`. **Fără fetch-uri noi.**

## Form validation rules

Neschimbate față de main: username 3–20 caractere (litere/cifre/`.`/`_`); parolă minimum
8 caractere; bara: `< 8` → 33% ambru „Minim 8 caractere"; `≥ 8` doar litere → 68%
`signa-400` „Bună"; `≥ 8` cu un caracter non-literă → 100% `signa-600` „Puternică".

## Design Tokens

| Rol | Valoare |
| --- | --- |
| Fundal secțiune | `radial-gradient(ellipse 70% 50% at 85% 0%, #FFFDF7, #FBF6ED)` |
| Suprafață card | `#FFFFFF` |
| Fundal input | `#FDFCF9` |
| Hover crem | `#FFF7E8` |
| Text principal / label / secundar / terțiar | `#2E2A24` / `#4F473C` / `#8A8071` / `#A69C8D` |
| Borduri | `rgba(46,42,36,.05 / .06 / .07 / .08)` |
| Verde hero | `#0f7d59` `#0b6446` `#075237` |
| Verde UI | `#047857` `#059669` `#10b981` `#34d399` `#d1fae5` `#ECFDF5` |
| Ambru | `#FFF7E8` / `rgba(245,158,11,.18)` / `#b45309` |
| Distructiv | `#dc2626`, border `#fee2e2`, hover `#fef2f2` |

Tipografie: Nunito, greutăți 600/700/800/900. Scale: 10.5 · 11 · 11.5 · 12 · 12.5 · 13 ·
13.5 · 14 · 15 · 16 · 23 · 27px · 2.05rem · 2.6rem. Tabular-nums pe toate cifrele.
Radius: 10 · 12 · 13 · 15 · 16 · 26 · 999.
Umbre: `0 20px 48px rgba(8,74,52,.24)` (hero) · `0 10px 30px rgba(46,42,36,.06)` (carduri) ·
`0 10px 24px rgba(4,44,32,.22)` (buton alb pe verde) · `0 10px 24px rgba(16,185,129,.3)` (CTA).
Easing: `cubic-bezier(.22,1,.36,1)` standard · `cubic-bezier(.34,1.5,.64,1)` pop ·
`cubic-bezier(.4,0,.2,1)` sheen.

## Accesibilitate

Tot decorul (aurora, sheen, glow) e `aria-hidden` + `pointer-events-none`. Contrastul
textului pe verde: alb și `rgba(209,250,229,.85)` sunt ok pe `#0b6446`; nu coborî sub
`rgba(209,250,229,.66)`. Butoanele din hero sunt `<button type="button">`.

## Files

Pachet: `Profil Invitat.dc.html` (designul — implementează **doar `2a`**), `support.js`,
`icon.svg`.

În aplicație, fișierele atinse:
- `src/components/auth/GuestConversionCard.jsx` — rescris cu noul layout (ținta principală);
- `src/pages/ProfilePage.jsx` — containerul invitatului pe toată lățimea;
- `src/index.css` — cele 4 `@keyframes` noi;
- `src/components/icons.jsx` — nimic nou.
