---
name: signa-ui
description: Implementează sau modifică UI în Signa — ecrane, layout, animații, tokeni de design. Folosește pentru HomePage, LessonsPage, ProfilePage, CollectPage, sidebar/shell sau când primești un mockup ori screenshot de tradus în React + Tailwind. Acoperă keyframe-urile `sg-*`, arhitectura de shell și convențiile responsive.
---

# UI în Signa

## Arhitectura de shell — citește asta întâi

Ecranele **Acasă, Lecții, Cameră, Clasament și Profil** trăiesc într-un shell persistent. Nu au
sidebar propriu și nu-și pun singure fundalul de pagină.

```
App.jsx
└── AppShell.jsx          # page/leaving/dir, straturile <main>, tranziția
    ├── Sidebar.jsx       # NU se remontează la navigare
    └── <main> × 5        # Home / Lessons / Camera / Leaderboard / Profile
```

Reguli care decurg din asta:

- **Nu adăuga `<aside>` într-o pagină.** Meniul, uneltele, lista de capitole și
  rândul de profil sunt în `Sidebar.jsx`.
- **Rădăcina unei pagini e `min-h-full`**, nu `h-full overflow-hidden`. Scroll-ul
  îl face `<main>`-ul shell-ului; o pagină cu scroll propriu produce scroll dublu.
- Dacă o pagină are nevoie de scroll (parallax, sticky), leagă-te de
  `ref.current.closest('main')` — vezi `ProfilePage.jsx`.
- Ecranele full-screen (Lecție, Colectare, Train, Diagnostic și Referințe) rămân
  în afara shell-ului, randate direct din `App.jsx`.
- Prietenii nu au ecran/rută separată: `FriendsSection` este parte din
  `ProfileDashboard`.

Ordinea din meniu dă direcția tranziției — `PAGE_ORDER` în `Sidebar.jsx`:
`home 0, lessons 1, camera 2, leaderboard 3, profile 4`.

## Tokeni

Din `tailwind.config.js` — folosește-i, nu hardcoda hex-uri în JSX când există token:

| Grup | Valori |
|---|---|
| `signa` | 50 `#ecfdf5`, 100 `#d1fae5`, 400 `#34d399`, 500 `#10b981`, 600 `#059669`, 900 `#064e3b` |
| `cream` | DEFAULT `#FFFBF3`, 50, 100 `#FFF7E8`, 200 `#FFEFD1` |
| `ink` | 400 `#A69C8D`, 500 `#8A8071`, 600 `#6B6255`, 700 `#4F473C`, 900 `#2E2A24` |
| umbre | `shadow-soft`, `shadow-card`, `shadow-button` |

Font: Nunito (deja global). Easing standard: `cubic-bezier(.22,1,.36,1)`.

Culorile din afara paletei apar doar unde designul le cere explicit (ex. `#FFFDF9`
fundal sidebar, `#C4BAA9` eyebrow, `#FBF7F0` card de nivel) — sunt intenționate.

## Catalogul de animații

Toate stau în `src/index.css`. **Refolosește-le. Nu inventa keyframes noi dacă
unul existent face treaba.**

| Keyframe | Ce face |
|---|---|
| `sg-fade-up`, `sg-fade-right`, `sg-fade-in`, `sg-scale-in` | intrări |
| `sg-pop` | pop cu overshoot (badge-uri, cipuri, inele) |
| `sg-pop-avatar` | pop cu rotație — **doar** avatarul din Profil, via `.sg-popin` |
| `sg-sheen`, `sg-shine` | reflexie care traversează |
| `sg-aurora-a/b/c`, `sg-drift`, `sg-float` | halouri și fundal ambiental |
| `sg-pulse-ring` | inel care pulsează (logo, punct de status, avatar) |
| `sg-spin` | rotație continuă (spinner, inel punctat) |
| `sg-chip-cue` | pistă de lumină secvențială pe cipuri |
| `sg-ring-draw`, `sg-ring-glow` | inelul obiectivului zilei |
| `sg-arrow`, `sg-underline`, `sg-topbar`, `sg-flame`, `sg-ripple`, `sg-grow` | micro |
| `sg-page-in-down/up`, `sg-page-out-down/up` | tranziția între ecrane (doar AppShell) |

⚠ `sg-pop` și `sg-pop-avatar` sunt **diferite intenționat**. Au fost cândva
ambele `sg-pop` și una o suprascria pe cealaltă. Nu le reunifica.

### Cum le aplici

Pentru stagger cu delay-uri diferite per element, folosește helper-ul local:

```jsx
const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

<h1 style={anim('sg-fade-up', 0.7, 0.14)}>…</h1>
```

Clasele utilitare (`.sg-fade-up`, `.sg-sheen`, `.sg-pulse-ring`…) au durate fixe —
bune pentru animații infinite, nu pentru staggere.

Folosește `fill-mode: backwards`, nu `both`, dacă elementul are și un `transform`
de hover — altfel animația îl blochează după ce se termină.

`prefers-reduced-motion` e acoperit global de blocul din josul `index.css` (țintește
`*`), deci orice keyframe nou e prins automat. Nu adăuga guard-uri per componentă.

### Ce se anima doar când are sens

`sg-chip-cue` fixează `background-color`, deci ar șterge diferența dintre literele
validate și cele rămase. Rulează doar când `pct === 0`. Același raționament se
aplică oricărei animații care suprascrie o stare vizuală purtătoare de informație.

## Convenții de layout

- Breakpoint-ul de shell e `lg` (1024px). Sub el sidebar-ul dispare: HomePage are
  bară de jos, LessonsPage un rând orizontal de capitole.
- Sidebar 262px, iteme de nav `h-12`/`text-[15px]`, logo 38px, padding `px-5 pt-[26px] pb-6`.
- Conținut: `lg:px-11 lg:pt-[34px] lg:pb-11`, spațiere între secțiuni 22px.
- Carduri mari `rounded-[26px]`, tile-uri `rounded-[22px]`.
- `tabular-nums` pe orice cifră care se schimbă (XP, procente, contoare).
- `text-pretty` pe titluri.

### Colectare

- `CollectPage` este full-screen: vizor mare + consolă compactă + inventar
  persistent. Nu o muta în `AppShell`.
- Camera folosește `videoFit="cover"`: fără benzi sau margini în jurul fluxului.
  `HandCanvas` trebuie să folosească același fit.
- Cadranul de față e un oval subțire în treimea de sus (funcțional, nu decorativ).
  Nu adăuga o mască întunecată peste corp sau mâini.
- Numerele seriei și inventarului folosesc `tabular-nums`.

### Profil și social

- Profilul este o identitate de jucător: avatar/nivel/XP, statistici, alfabet,
  `FriendsSection`, apoi atelierul de cont.
- Nu reintroduce „Prieteni” în sidebar și nu crea `FriendsPage`.

## Reguli fixe

1. **Nu atinge `src/utils/normalize.js`** — contract v2, 199 valori. Orice
   modificare invalidează datele și modelele.
2. Fără librării de animație (framer-motion etc.). Doar CSS + state React.
3. Iconițele sunt SVG inline din `src/components/icons.jsx`. Nu duplica seturi
   locale de iconițe în pagini — au fost deja deduplicate o dată.
4. Datele de profil/rang/rol vin din `useProfileSummary()`, chemat o singură dată
   în shell și pasat mai departe. Nu re-interoga Supabase din fiecare pagină.
5. Colectare, Train și Diagnostic se afișează în sidebar numai pentru admin.
   Ascunderea vizuală nu este suficientă: păstrează și guard-ul de rută din
   `App.jsx`.

## Înainte să spui că e gata

Rulează skill-ul `signa-verify`. Pe scurt: `npm test` + `npx vite build`.
**Nu există `npm run lint` și nici `tsc`** în proiectul ăsta.
