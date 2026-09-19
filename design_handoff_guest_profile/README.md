# Handoff: Profil — cont de invitat (varianta 1b)

## Prompt de pornire pentru Claude Code

> Citește `design_handoff_guest_profile/README.md` în întregime, apoi deschide
> `design_handoff_guest_profile/Profil Invitat.dc.html` în browser. Implementează **doar
> opțiunea cu badge-ul `1b`** (a doua din pagină, „Card de conversie") în aplicația Signa,
> 1:1 cu designul: aceleași culori, dimensiuni, spațieri, copy și animații.
> Ținta este ramura `isGuest` din `src/pages/ProfilePage.jsx`, refolosind componentele
> existente din `src/components/auth/AuthUi.jsx` și logica de auth din
> `src/components/auth/AuthPanel.jsx`. Nu copia HTML-ul din fișierul de design —
> rescrie-l ca JSX + Tailwind, în stilul codului existent. Nu schimba ramura de utilizator
> autentificat din ProfilePage și nu atinge fluxul Supabase.

## Overview

Ecranul de Profil în **modul invitat** din Signa. Astăzi afișează un card „Progres local",
o listă de beneficii și formularul de auth generic — fără ierarhie, fără motiv clar de
conversie. Designul nou transformă pagina într-un **card de conversie pe două coloane**:

- **stânga (panou verde):** identitatea de invitat + progresul local (XP, nivel, lecții) +
  ce se deblochează cu un cont;
- **dreapta (panou alb):** formularul de cont nou / login, cu taburi, validare vizuală de
  parolă și o notă explicită despre transferul progresului.

Obiectivul: utilizatorul vede **ce are de pierdut / de mutat** înainte de a vedea formularul.

## About the Design Files

Fișierele din acest pachet sunt **referințe de design realizate în HTML** — prototipuri care
arată aspectul și comportamentul dorit, **nu cod de producție care se copiază direct**.
Sarcina este să **recreezi designul în codebase-ul existent** (React 18 + Vite + Tailwind,
vezi `tailwind.config.js` și `src/index.css`), folosind pattern-urile și componentele deja
stabilite acolo. Stilizarea din prototip e inline din motive de streaming al preview-ului;
în aplicație folosește clase Tailwind și tokenii din temă (`bg-card`, `text-ink`,
`shadow-card`, `rounded-2xl`, `text-brand-600` etc.).

Prototipul conține **trei** opțiuni una lângă alta. Se implementează **numai `1b`**:
- `1a` = recreare a stării actuale (doar pentru comparație — nu se implementează);
- `1b` = **direcția aprobată**;
- `1c` = direcție alternativă, respinsă.

## Fidelity

**High-fidelity.** Culorile, tipografia, spațierile, radiusurile, umbrele, copy-ul și
animațiile sunt finale. Recrează UI-ul pixel-perfect cu Tailwind-ul existent. Unde o valoare
din prototip nu are token în `tailwind.config.js`, folosește valoarea arbitrară Tailwind
(ex. `rounded-[26px]`, `shadow-[0_18px_50px_rgba(46,42,36,0.12)]`) în loc să inventezi tokeni noi.

## Screens / Views

### Profil — invitat (o singură vizualizare)

**Purpose:** invitatul își vede progresul local și își creează cont / se conectează, cu
garanția că progresul se mută.

**Layout (desktop, lățimea conținutului din shell):**

```
<main> padding: 26px 32px 40px, background #FFFBF3, position relative, overflow hidden
├─ 2 blob-uri decorative (absolute, blur, animate — vezi „Animații")
├─ eyebrow        „PROFIL · MODUL INVITAT"
├─ h1             „Ai deja {XP} XP de mutat pe cont."   (cu subliniere animată pe „{XP} XP")
├─ p              subtitlu, max-width 520px
└─ card conversie   margin-top 24px
   grid-template-columns: 352px 1fr
   border-radius 26px, overflow hidden
   border 1px rgba(46,42,36,.07)
   box-shadow 0 18px 50px rgba(46,42,36,.12)
   ├─ coloana stângă  (panou verde, padding 30px 28px)
   └─ coloana dreaptă (panou alb,  padding 30px 32px 32px)
```

**Responsive:** sub ~880px lățime de container, grila devine o singură coloană
(`grid-cols-1 lg:grid-cols-[352px_1fr]`), panoul verde deasupra formularului. Titlul scade
de la `2.4rem` la ~`1.9rem`. Nimic din card nu are înălțime fixă.

---

#### Header de pagină

| Element | Valori |
| --- | --- |
| Eyebrow | „PROFIL · MODUL INVITAT" — 12px / 800 / uppercase / letter-spacing .22em / `#A69C8D` |
| H1 | 2.4rem / 900 / letter-spacing −.02em / line-height 1.1 / `#2E2A24`. Text: „Ai deja **340 XP** de mutat pe cont." |
| Subliniere | pe span-ul cu XP: absolut, `left:0;right:0;bottom:2px`, height 7px, radius 4px, `rgba(52,211,153,.5)`, `transform-origin:left`, animație de creștere pe X |
| Subtitlu | 14px / 600 / `#8A8071` / line-height 1.5 / max-width 520px. Text: „Creează contul și lecțiile strânse pe acest dispozitiv se mută singure. Nu pierzi nimic — seria de zile pornește odată cu contul." |

#### Coloana stângă — panou „invitat"

- Fundal: `linear-gradient(160deg,#064e3b,#065f46 52%,#059669)`.
- Aurora 1: absolut `top:-120px;right:-120px`, 360×360, radius 999px, `blur(50px)`,
  `radial-gradient(circle, rgba(52,211,153,.55) 0%, transparent 70%)`.
- Aurora 2: absolut `bottom:-88px;left:-68px`, 300×300, `blur(46px)`,
  `radial-gradient(circle, rgba(255,251,243,.22) 0%, transparent 70%)`.
- Grilă decorativă: `inset:0`, opacity .16, două `linear-gradient` de 1px
  `rgba(255,255,255,.5)`, `background-size:64px 64px`, cu
  `mask-image: radial-gradient(ellipse 70% 60% at 60% 40%, #000, transparent 75%)`.
- Plăcuțe LSR plutitoare (decorative, `aria-hidden`): litera „A" 48×48 radius 16px la
  `top:14px;right:18px`; litera „B" 36×36 radius 12px la `top:70px;right:74px`. Ambele:
  `rgba(255,255,255,.1)`, border `1px rgba(255,255,255,.18)`, `backdrop-filter:blur(6px)`,
  text `#d1fae5` / 900.

**Blocul de identitate** (rând, gap 12px):
- Avatar 56×56: cerc `rgba(255,255,255,.14)`, icon user 26px `#d1fae5`; inel exterior
  `2px solid rgba(52,211,153,.7)` care pulsează.
- Nume „Invitat" — 19px / 900 / `#fff` / letter-spacing −.01em.
- Sub el: „Progres doar pe acest dispozitiv" — 12.5px / 700 / `rgba(255,251,243,.66)`.

**Blocul de progres** (margin-top 26px, rând, gap 18px):
- Inel XP: SVG 104×104, rotit −90°, `r=48`, `stroke-width 8`.
  Track `rgba(255,255,255,.16)`; progres `#34d399`, `stroke-linecap round`,
  `stroke-dasharray 302`, `stroke-dashoffset` calculat = `302 * (1 − xp%/100)`
  (în prototip 163 ≈ 46%). În centru: numărul de XP (24px / 900 / tabular-nums) și
  eticheta „XP" (10.5px / 800 / letter-spacing .14em / `rgba(255,251,243,.6)`).
- Lângă: „Nivel 3" (15px / 900 / `#fff`), „6 lecții pregătite pentru transfer"
  (12.5px / 700 / `rgba(255,251,243,.66)`), și 4 segmente 26×5px radius 999px —
  primele 3 `#34d399`, ultimul `rgba(255,255,255,.2)`.
- Separator: `height 1px`, `rgba(255,255,255,.14)`, margin-top 28px.

**Lista „SE DEBLOCHEAZĂ CU CONTUL"** (label 10.5px / 800 / uppercase / .18em /
`rgba(209,250,229,.72)`; listă cu `gap:9px`). Fiecare rând: padding 10px 12px,
radius 14px, `rgba(255,255,255,.1)`, border `1px rgba(255,255,255,.16)`, icon 17px
`#34d399`, text 13px / 800 / `#fff`. Conținut, în ordine:
1. Locul tău în clasament (icon bare/chart)
2. Prieteni și urmăriri (icon users)
3. Progres pe orice dispozitiv (icon refresh)
4. Profil cu poză și nume (icon user)

#### Coloana dreaptă — formular

- **Taburi:** rând cu `gap:22px`, border-bottom `1px rgba(46,42,36,.06)`. Butoane
  14px / 700, `padding-bottom 11px`, `white-space:nowrap`; activ `#2E2A24`, inactiv `#A69C8D`.
  Indicator: bară absolută `bottom:0`, height 2px, `#10b981`, a cărei **lățime și poziție X
  sunt măsurate din DOM** (offsetWidth/offsetLeft ale butonului activ) — nu hardcodate.
  Etichete: „Cont nou" / „Am deja cont".
- **Titlu:** 27px / 900 / −.02em — „Creează-ți contul" (signup) sau „Bine ai revenit" (login).
- **Subtitlu:** 14px / 600 / `#8A8071` — signup: „Un minut, și progresul de invitat devine al
  contului tău."; login: „Intră în cont — progresul de invitat se mută automat."
- **Câmpuri** (gap 14px):
  - Grup doar-signup (Prenume + Nume în grilă 1fr 1fr gap 12px, apoi Username cu hint
    „Așa te vor găsi prietenii în Signa.") — colapsează cu `max-height` + `opacity`.
  - Email (icon mail 18px la stânga, padding-left 46px).
  - Parolă (icon lock la stânga, padding-right 74px, buton text „Arată" 12px / 800 la dreapta).
  - Stil input: `width:100%`, border `1px rgba(46,42,36,.09)`, radius 16px, fundal `#FDFCF9`,
    padding 14px 16px, 15px / 600, text `#2E2A24`, placeholder `#A69C8D`.
  - Label: 13.5px / 700 / `#4F473C`, margin-bottom 6px.
  - **Focus:** `border-color:#10b981`, `box-shadow:0 0 0 4px rgba(16,185,129,.14)`,
    `background:#fff`, `transform:translateY(-1px)`, tranziție 180ms.
- **Indicator de parolă** (apare doar când câmpul are conținut): bară 5px radius 999px pe
  `rgba(46,42,36,.08)`; umplere cu lățime + culoare după regulile din „Form validation".
  Etichetă 12px / `#A69C8D`.
- **CTA:** lățime 100%, radius 18px, padding 18px, 15.5px / 800 / `#fff`,
  `linear-gradient(180deg,#10b981,#059669)`, `box-shadow:0 10px 24px rgba(16,185,129,.3)`,
  cu sheen animat și săgeată 18px la dreapta textului.
  Text: „Creează cont" / „Intră în cont".
- **Nota de transfer:** padding 12px 14px, radius 14px, fundal `#ecfdf5`,
  border `1px rgba(16,185,129,.18)`, icon refresh `#047857`, text 12.5px / 700 / `#065f46`:
  „6 lecții și 340 XP se mută pe cont imediat după conectare." (numerele din progresul real).
- **Acțiuni distructive** (după separator `1px rgba(46,42,36,.06)`, gap 8px):
  - „Ieși din modul invitat" — border `rgba(46,42,36,.08)`, text `#4F473C`, hover `#FFF7E8`;
  - „Șterge progresul de pe acest dispozitiv" — border `#fee2e2`, text `#dc2626`, hover `#fef2f2`;
  - notă centrată 12px / 600 / `#A69C8D`: „Progresul rămâne pe dispozitiv — poți reveni oricând."
  - Ambele acțiuni păstrează **confirmarea existentă** din `ProfilePage.jsx` — nu executa
    ștergerea fără pasul de confirmare deja implementat.

## Interactions & Behavior

- **Taburi:** click comută între `signup` și `login`; grupul de câmpuri doar-signup
  colapsează prin `max-height 232px → 0` (500ms `cubic-bezier(.22,1,.36,1)`) +
  `opacity 1 → 0` (350ms). Indicatorul de tab glisează 420ms pe același easing.
- **Inputuri:** focus 180ms pe `border-color`, `box-shadow`, `transform`.
- **Rânduri de perks (panou verde):** hover → `background rgba(255,255,255,.2)` +
  `translateX(4px)`, 300ms `cubic-bezier(.22,1,.36,1)`.
- **CTA:** hover → `translateY(-2px)` + `box-shadow 0 16px 34px rgba(16,185,129,.38)`;
  active → `scale(.985)`; 160ms.
- **Stări de încărcare/eroare:** refolosește exact ce există în `AuthPanel.jsx`
  (buton dezactivat + `MessageBanner`). Bannerul de eroare se montează **sub CTA**,
  deasupra notei de transfer.

### Animații de intrare (o singură dată, la montare)

| Nume | Keyframes | Aplicat pe | Durată / easing / delay |
| --- | --- | --- | --- |
| `fade-up` | `opacity 0→1`, `translateY(18px→0)` | eyebrow, h1, subtitlu, card | .7–.9s `cubic-bezier(.22,1,.36,1)`, delay 0 / .06 / .14 / .2s |
| `fade-right` | `opacity 0→1`, `translateX(-22px→0)` | bloc identitate | .7s, delay .3s |
| `pop-avatar` | `scale(.72) rotate(-7deg) → scale(1) rotate(0)` | avatar | .78s `cubic-bezier(.34,1.5,.64,1)`, delay .34s |
| `ring-draw` | `stroke-dashoffset 302 → 163` | inel XP | 1.4s `cubic-bezier(.22,1,.36,1)`, delay .6s |
| `grow-x` | `scaleX(0→1)`, origin left | subliniere h1; cele 3 segmente | .5–.9s, delay .9 / 1.0 / 1.1s |
| `fade-up` (stagger) | idem | cele 4 rânduri de perks | .7s, delay .56 / .64 / .72 / .80s |
| numărător XP | `requestAnimationFrame`, easing `1-(1-p)³` | numărul din inel | 1400ms, 0 → XP real |

### Animații continue

| Nume | Descriere | Durată |
| --- | --- | --- |
| `aurora-a` | translate + scale + opacity pe blob-ul verde | 16s ease-in-out infinite |
| `aurora-b` | idem, blob crem | 21s ease-in-out infinite |
| `float` | `translateY(0→-14px)` + 2deg | plăcuțele A / B (7.5s și 9.5s, delay .8s) |
| `pulse-ring` | `scale(.85→1.5)`, `opacity .55→0` | inelul avatarului | 3.4s |
| `sheen` | `translateX(-130%→320%) skewX(-18deg)` pe un gradient alb de 38% lățime | CTA | 3.6s |
| `drift` | translate + scale pe blob-urile de fundal ale paginii | 14s / 18s reverse |

**Accesibilitate:** totul se oprește sub `@media (prefers-reduced-motion: reduce)`
(animații reduse la ~0ms, 1 iterație); numărătorul de XP sare direct la valoarea finală.
Decorațiunile (blob-uri, plăcuțe A/B) sunt `aria-hidden`. Contrast: text alb pe verde
`#065f46` ≥ 4.5:1; nu folosi text cu opacitate sub `rgba(255,251,243,.66)`.

## State Management

Stare locală în componenta de profil-invitat:

| Stare | Tip | Trigger / rol |
| --- | --- | --- |
| `mode` | `'signup' \| 'login'` | click pe taburi; determină titlu, subtitlu, CTA, câmpuri vizibile |
| `password` | `string` | input; alimentează indicatorul de putere |
| `showPassword` | `boolean` | butonul „Arată" |
| `xpDisplay` | `number` | animația numărătorului (rAF), 0 → XP real |
| `tabRect` | `{w,x}` | măsurat din refs pe taburi (+ la `document.fonts.ready` și la resize) pentru indicator |

Date citite din progresul local existent (aceleași surse pe care le folosește deja
`ProfilePage.jsx` în ramura `isGuest`): `xp`, `level`, numărul de lecții finalizate.
`nivel = floor(xp/100) + 1`, procentul inelului = `xp % 100`.
**Nu sunt necesare fetch-uri noi.** Submit-ul folosește exact handlerele existente
de signup/login din `AuthPanel.jsx` / Supabase.

## Form validation rules

- Username: 3–20 caractere, litere / cifre / `.` / `_` (regula existentă din cod).
- Parolă: minimum 8 caractere. Indicator:
  - gol sau `< 8` → lățime 33% (gol: 0%), `#f59e0b`, „Minim 8 caractere";
  - `≥ 8`, doar litere → 68%, `#34d399`, „Bună";
  - `≥ 8` + cel puțin un caracter non-literă → 100%, `#059669`, „Puternică".
- Restul validărilor (email luat, username luat, erori Supabase) rămân cele existente.

## Design Tokens

**Culori**

| Rol | Hex |
| --- | --- |
| Fundal pagină | `#FFFBF3` |
| Card / suprafață | `#FFFFFF` |
| Fundal input | `#FDFCF9` |
| Hover crem | `#FFF7E8` |
| Text principal | `#2E2A24` |
| Text label | `#4F473C` |
| Text secundar | `#8A8071` |
| Text terțiar | `#A69C8D` |
| Borduri | `rgba(46,42,36,.06 / .07 / .09)` |
| Brand 400 | `#34d399` |
| Brand 500 | `#10b981` |
| Brand 600 | `#059669` |
| Brand 700 | `#047857` |
| Brand 800 | `#065f46` |
| Brand 900 | `#064e3b` |
| Verde deschis | `#d1fae5` / `#ecfdf5` |
| Avertisment | `#f59e0b` |
| Distructiv | `#dc2626`, border `#fee2e2`, hover `#fef2f2` |

**Tipografie** — Nunito (deja importat în `src/index.css`), greutăți 500/600/700/800/900.
Scale: 10.5 · 11 · 12 · 12.5 · 13 · 13.5 · 14 · 15 · 15.5 · 19 · 21 · 22 · 24 · 27px · 2.4rem.
Tabular-nums pe toate cifrele de XP.

**Spațiere** (px): 4 · 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 26 · 28 · 30 · 32.

**Radius** (px): 10 · 11 · 12 · 14 · 16 · 18 · 20 · 26 · 999.

**Umbre**
- card mare: `0 18px 50px rgba(46,42,36,.12)`
- card mic: `0 2px 10px rgba(46,42,36,.05)`
- CTA: `0 10px 24px rgba(16,185,129,.3)` → hover `0 16px 34px rgba(16,185,129,.38)`
- inel de focus: `0 0 0 4px rgba(16,185,129,.14)`

**Easing:** `cubic-bezier(.22,1,.36,1)` (standard), `cubic-bezier(.34,1.5,.64,1)` (pop),
`cubic-bezier(.4,0,.2,1)` (sheen).

## Assets

- `icon.svg` — logo-ul Signa, copiat din `public/icon.svg` al aplicației. Folosește-l
  pe cel din aplicație, nu copia din pachet.
- Toate iconițele sunt SVG inline, `stroke-width` 1.9–2.6, `stroke-linecap/linejoin round`,
  `currentColor`. În aplicație folosește setul existent din `src/components/icons.jsx` și
  adaugă acolo doar iconițele care lipsesc (mail, lock, refresh, users).
- Fără imagini raster. Fără librării de animație.

## Files

În acest pachet:
- `Profil Invitat.dc.html` — designul (deschide-l în browser; implementează **doar `1b`**).
- `support.js`, `icon.svg` — necesare ca prototipul să ruleze local.

În aplicație, fișierele atinse:
- `src/pages/ProfilePage.jsx` — ramura `isGuest` (ținta principală).
- `src/components/auth/AuthPanel.jsx` — logica de signup/login, validări, reset parolă.
- `src/components/auth/AuthUi.jsx` — `Field`, `SectionCard`, `MessageBanner` etc.
- `src/components/icons.jsx` — iconițe noi.
- `src/index.css` / `tailwind.config.js` — `@keyframes` noi și eventuale tokenuri.

## De reținut

- Un bug real vizibil în recrearea stării actuale (`1a`): `SectionCard` n-are padding intern,
  deci conținutul atinge marginea cardului. Designul nou presupune padding-ul corect.
- Nu duplica logica de auth — designul e un **layout nou peste fluxul existent**.
- `@keyframes` se declară o singură dată în `src/index.css`, nu per componentă.
