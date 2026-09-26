# Handoff: Signa — versiunea de telefon (minimal)

## Overview
Aplicația Signa pe mobil (sub `lg`), cu puțin text. Sidebar-ul de pe desktop devine o **bară de jos cu 5 taburi**. Acoperă: Login / Cont nou / Resetare, Acasă, Lecții, Cameră, Clasament, Profil, Lecție full-screen, Scrie cuvântul, Repetiție și Rezultate.

## About the Design Files
`Signa Mobil v2.dc.html` e o **referință de design în HTML**: un prototip care arată aspectul și comportamentul dorite. **Nu e cod de producție de copiat.** Designul trebuie refăcut în codebase-ul existent (React 18 + Vite + Tailwind v3), cu tokenii din `tailwind.config.js`, animațiile `sg-*` din `src/index.css` și componentele existente (`AppShell`, `Sidebar`, `AuthUi`, `SignCoach`, `icons.jsx`). Datele din prototip sunt mock-uri; în app vin din `useProgress`, `useProfileSummary` și Supabase.

## Fidelity
**High-fidelity.** Culorile, fonturile (Nunito), raze, umbre și animații sunt aceleași ca pe desktop. Desktop-ul (`lg:`) NU se schimbă.

## Regula principală: text minim
- Fără etichete „eyebrow” uppercase deasupra titlurilor (ex. „CAPITOLUL 1 DIN 8”, „CAMERĂ · RECUNOAȘTERE LOCALĂ”, „CLASAMENT · DIN TOTDEAUNA”).
- Fără subtitluri sau fraze explicative sub titluri sau în carduri.
- Titluri de pagină de 1–2 cuvinte: `Cameră`, `Clasament`, numele capitolului.
- Butoane scurte: `Continuă`, `Pornește`, `Golește`, `Repetă`, `Ieși`, `Sari →`, `Pauză`.
- Câmpurile de login nu au label deasupra, doar iconiță + placeholder.
- Pe mobil se ascund textele marcate mai jos; pe desktop rămân.

## 1. Navigație mobilă — `AppShell.jsx` / componentă nouă `MobileTabBar.jsx`
- `Sidebar` rămâne `hidden lg:flex`. Adaugă `<MobileTabBar>` cu `lg:hidden`, sub containerul de pagini, `flex-none`.
- Scoate bara de jos din `HomePage.jsx` (cea cu 4 `NavItem`). Bara devine una singură, în shell, pentru toate cele 5 pagini.
- Stil:
  - bară: `bg-cream/90 backdrop-blur-[14px] border-t border-ink-900/[.07] pt-2 px-2.5 pb-[max(26px,env(safe-area-inset-bottom))]`
  - grid: `grid-cols-5`
  - item: `min-h-[50px] flex-col gap-1 text-[10px] font-extrabold`; activ `text-signa-600`, inactiv `text-ink-400`; iconițe din `icons.jsx`, 20px, `strokeWidth 2.1`
- Pilula activă: un `span` absolut cu lățimea 1/5, `translateX(index*100%)`, `transition transform .42s cubic-bezier(.22,1,.36,1)`. În interior: `inset-x-2 rounded-[14px] bg-[linear-gradient(180deg,#E4F5EC,#EFFAF4)] shadow-[inset_0_0_0_1px_rgba(16,185,129,.12)]`.
- Badge-uri mici:
  - Lecții: nr. total, `text-[9px] font-black bg-white border rounded-full px-[5px]`
  - Cameră: punctul verde pulsant `sg-dot-ring`
  - Clasament: `#loc`, `text-amber-700 bg-[#FFF7E8]`
- Header mobil comun pentru cele 5 pagini (mută-l din HomePage în shell): `sticky top-0 bg-cream/80 backdrop-blur`, conține:
  - logo 30px cu `sg-pulse-ring`
  - „SIGNA” `text-[15px] font-black tracking-[.16em]`
  - streak `bg-amber-50 border-amber-600/[.16] text-amber-700 rounded-full px-[11px] py-1.5 text-[12px]`
  - buton sunet 34px
  - avatar 34px `bg-signa-100 text-signa-900`
- Tranziția între pagini rămâne `sg-page-in-up/down` după `PAGE_ORDER`. La schimbarea tabului, scroll-ul revine sus.

## 2. Login / Cont nou — `AuthGate.jsx` + `AuthPanel.jsx` (doar pe mobil)
- **Hero** (înlocuiește pe mobil blocul logo + „SIGNA” + „Limba Semnelor Române”):
  - card `mx-3 mt-2.5 rounded-[30px] overflow-hidden`, fundal `linear-gradient(135deg,#064e3b,#065f46 55%,#059669)`
  - înălțime 232px pe login, 150px pe signup/forgot (`transition height .5s EASE`)
  - în interior: aurora a+b, grila mascată (`opacity .16`, 48px), 4 plăcuțe plutitoare (A 56px, B 40px, C 48px, E 34px) cu stilul din `BrandColumn` (`sg-float`)
  - logo 36px + „SIGNA” alb, stânga sus
  - titlu jos-stânga, `30px font-black leading-[1.12]`: „Limba semnelor,” / „semn cu semn.” cu `sg-underline` `rgba(52,211,153,.55)`
- **Formular** `px-[22px] pt-[22px] pb-9 gap-[18px]`:
  - `AuthTabs`: „Intră” / „Cont nou”, indicator glisant.
  - Titlu `26px font-black`: „Bine ai revenit” / „Cont nou” / „Resetează parola”. **Fără subtitlu.**
  - Câmpuri **fără `AuthField` label**, doar placeholder: Prenume + Nume (grid 2), `@ username`, Email (MailIcon), Parolă (LockIcon + „Arată/Ascunde”), Confirmă parola. Stilul inputurilor: exact `inputBase` din `AuthUi` (`rounded-2xl py-4 pl-[46px]`).
  - Câmpurile de signup rămân în `Collapsible`, ca acum.
  - „Ai uitat parola?” aliniat dreapta, sub parolă, doar pe login.
  - `PasswordStrength` pe un rând: bara + eticheta scurtă (Minim 8 / Bună / Puternică).
  - `PrimaryButton`: „Intră în cont” / „Creează cont” / „Trimite link”.
  - `OrSeparator` + `SecondaryButton` „Continuă ca invitat”.
- Scoate pe mobil: subtitlurile din `HEADINGS`, rândul „Înveți fără cont…”, nota de confidențialitate de jos, linkul „Nu ai cont? Creează unul gratuit” (tab-ul face asta), hint-ul de la username.
- Erorile rămân sub câmp, `text-xs text-red-600`. Chenarul devine `border-red-300`.
- Forgot: buton „←” în loc de „← Înapoi”. Succes: „Link trimis. Verifică emailul.”

## 3. Acasă — `HomePage.jsx` (mobil)
- Salut: „Salut, {firstName}.” (cu underline). **Fără dată.**
- Cardul verde:
  - eyebrow = doar `nextLesson.title`
  - titlu = `lessonSubtitle`
  - inelul de procent + cipurile rămân
  - butonul devine „Continuă”
- Stats 3 coloane: rămân.
- „Exersează”:
  - fără linkul „Toate lecțiile”
  - tile-urile au **doar titlu** (fără subtitlu): Scrie, Cameră, Repetiție, Clasament
- „De revăzut azi” → „De revăzut”, fără „după memorie”.

## 4. Lecții — `LessonsPage.jsx` (mobil)
- Scoate butonul „Înapoi”, pentru că acum există tab bar.
- Rândul orizontal de capitole: rămâne, pe fundal `bg-white/70` când nu e selectat.
- Scoate:
  - eyebrow-ul „Capitolul X din Y”
  - linia cu descriere / nr. lecții / litere
- Card verde:
  - fără „Continuă de aici”
  - sub titlu doar `~{minutes} min`
  - butonul devine „Continuă”
- Card progres:
  - fără eyebrow „Progresul capitolului”
  - etichetele devin „Lecții” / „Litere”
  - fără nota „Încă N lecții și se deschide…”
- Secțiunea „Lecțiile capitolului” → „Lecții”, fără „Deblocare progresivă”.
- LessonCard:
  - badge-ul „În curs · 40%” → „40%”
  - cardul blocat nu mai are textul „Se deschide după…”, doar lacăt + titlu

## 5. Cameră — `CameraPage.jsx` (mobil)
- Titlu „Cameră”, fără eyebrow și subtitlu.
- Pastila de status: „Local”.
- Viewport `h-[440px] rounded-3xl`:
  - fără textul „Camera e oprită…”, doar butonul „Pornește”
  - fără badge-ul „fps · puncte”
  - butonul de oprire devine „Oprește”, compact
- Panoul lateral devine un stack: Top 3 → Mișcare → 2 stat-uri.
- „Recunoscute acum”:
  - devine „Sesiune”, pe verticală: titlu, cipuri 46px, apoi butonul full-width „Golește”
  - când e gol arată „—”

## 6. Clasament — `LeaderboardPage.jsx` (mobil)
- Titlu „Clasament”. Fără eyebrow, fără linia „N jucători · XP” și fără filtrele Săptămâna / Din totdeauna.
- Podium:
  - `px-4 pt-6`, container `h-[258px]`
  - coloane 150 / 116 / 94px
  - avatare 56 / 48px
- „Poziția ta”:
  - fără eyebrow
  - fără nota verde „Încă N lecții…”
  - etichetele devin „XP total” / „Zile”
- Rânduri: `grid-cols-[34px_38px_minmax(0,1fr)_auto_auto] gap-2.5 px-4 py-3`.

## 7. Profil — `ProfilePage` / `ProfileDashboard.jsx` (mobil)
- Scoate headerul cu „Profil · Nivel…”, „{Nume}. Asta ești tu.” și fraza de nivel.
- Banner verde pe un singur rând:
  - avatar 76px
  - badge nivel (fără badge-ul de vizibilitate)
  - nume `22px`
  - `@username`, fără „din {lună}”
  - inel nivel 64px, în dreapta
- Bara XP are eticheta „Nv. {n+1}”.
- Mozaic:
  - 2 coloane: „Zile” (amber) și „Lecții” (verde), fără frazele de sub numere
  - apoi „Alfabet” pe toată lățimea
- Setări (listă):
  - „Profil public” (switch), „Sunete” (switch), „Sincronizează”, „Deconectare” (roșu)
  - fără descrieri sub rânduri
  - Atelierul (editare nume) poate rămâne într-un ecran separat

## 8. Lecție / Scrie cuvântul / Repetiție / Rezultate
- `LessonPage`:
  - scoate „De reprodus” de deasupra `SignWell`-ului mobil
  - `SignCoach` pe mobil: titlul devine „Semnul „X"”, fără linia de instrucțiune
  - skip-ul devine „Sari →”
- `SpellPage`:
  - cipurile cuvântului sub bara de sus (34×40, verde = făcut, alb = curent)
  - SignWell în dreapta
  - dock cu thumbnail 56px
- `ReviewPage`:
  - header „←” · „REPETIȚIE”
  - fără paragraful explicativ
  - butonul devine „Începe · {n}”
- `ResultsScreen`:
  - butonul principal devine „Continuă”
  - „Repetă”, „Ieși”
  - fără linia „X, Y — de repetat”

## Design tokens (din `tailwind.config.js`, neschimbați)
- **signa:** 50 `#ecfdf5`, 100 `#d1fae5`, 400 `#34d399`, 500 `#10b981`, 600 `#059669`, 900 `#064e3b`
- **cream:** `#FFFBF3`, 100 `#FFF7E8`, 200 `#FFEFD1`
- **ink:** 400 `#A69C8D`, 500 `#8A8071`, 600 `#6B6255`, 700 `#4F473C`, 900 `#2E2A24`
- **Gradient card verde:** `linear-gradient(135deg,#064e3b,#065f46 52%,#047857)`
- **Fundal pagină mobil:** `radial-gradient(110% 45% at 50% 0%,#F3FBF6 0%,#FFFBF3 62%)`
- **EASE:** `cubic-bezier(.22,1,.36,1)`
- **Font:** Nunito 500–900

## Files
- `Signa Mobil v2.dc.html` — prototipul de referință (deschide-l în browser; butoanele de deasupra telefonului sar între ecrane)
- `Signa Mobil.dc.html` — prima variantă, cu textul complet (doar pentru comparație)
