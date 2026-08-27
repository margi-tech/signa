---
name: signa-git
description: Fluxul de git pentru repo-ul Signa — branch per task, commit, push, PR, merge și recuperarea muncii pierdute. Folosește când începi o lucrare nouă, când dai commit/push, când schimbi branch-ul, când un merge e blocat sau când un commit pare dispărut. Conține cele două reguli care au costat deja muncă pierdută.
---

# Git în Signa

Repo: `margi-tech/signa`. Branch principal: `main`, protejat.

## ⚠ Regula care a costat deja muncă pierdută

**Dă commit înainte de a schimba branch-ul. Întotdeauna.**

Un refactor întreg (shell persistent + animații, ~700 linii de fișiere noi) a
stat necomis în working tree pentru că am tot amânat commit-ul cu „spune-mi când
vrei". La schimbarea de branch s-a stash-uit automat, iar câteva ture mai târziu
lucram pe un branch care nu-l conținea — și am raportat greșit că munca „nu
există". A fost recuperat din `stash@{1}`, dar putea fi pierdut definitiv.

Concret:

- Nu lăsa lucru terminat necomis peste mai multe ture.
- Înainte de `checkout`/`switch`/`reset`/`clean`: rulează `git status`, apoi
  commit sau `git stash push -u` cu **mesaj descriptiv** (nu stash anonim).
- Când ceva pare „pierdut", caută în ordine: `git stash list`,
  `git log --all --oneline -- <fisier>`, `git reflog`, `git fsck --lost-found`.
  Verifică și partea untracked a unui stash: `git show --stat 'stash@{N}^3'`.

## ⚠ A doua regulă plătită cu muncă pierdută: nu ești singur pe repo

Pe 27 aug 2026, un commit terminat (login cu Google) a dispărut complet — și din
istoric, și din working tree. Cauza: repo-ul e deschis simultan în Claude Code și
în Cursor. Cealaltă unealtă a resetat branch-ul la `origin/main` și a
cherry-pick-uit peste el altă lucrare. Commit-ul meu exista doar local, deci
nimic nu l-a protejat. A fost refăcut manual; în `git reflog` se vedea limpede.

Ce urmează din asta:

- **Verifică starea imediat înainte de push**, nu doar înainte de commit. Un
  `git log --oneline -3` care nu arată commit-ul tău înseamnă că altcineva a
  rescris branch-ul între timp.
- **Push devreme.** Un commit ne-pushed pe un repo folosit de două unelte e la fel
  de fragil ca lucrul necomis. `origin` e singura copie pe care n-o rescrie
  accidental un alt proces local.
- Dacă un fișier la care tocmai ai lucrat „arată ca înainte", nu presupune că te-ai
  înșelat — verifică `git reflog` întâi. Reflog-ul ține și commit-urile rămase
  fără branch.
- Când raportezi o pierdere de muncă utilizatorului, spune ce s-a întâmplat și de
  unde știi (reflog), nu doar „refac".

Recuperare, în ordine: `git reflog`, `git stash list`,
`git log --all --oneline -- <fisier>`, `git fsck --lost-found`.

## Branch per task

Fiecare lucrare pleacă din `main`, nu din branch-ul curent:

```bash
git fetch origin main --quiet
git checkout -b design/<nume-scurt> origin/main
```

Convenții de nume folosite până acum: `design/*` pentru UI, `feat/*` pentru
funcționalitate, `fix/*` pentru corecturi, `docs/*` pentru documentație.

Dacă ai lucru necomis pe branch-ul vechi, `git stash push -u -m "..."` întâi și
`git stash pop` după ce ai făcut noul branch. Verifică ce se aplică — dacă
fișierul e atins de ambele părți, ai conflict.

## Commit

Mesaje în română, imperativ, cu explicația *de ce* în corp când nu e evident.

Trailer-ul `Co-Authored-By` trebuie să poarte identitatea **modelului care chiar a
scris commit-ul** — istoricul are deja `Cursor` și `Claude Sonnet 5` pe commit-uri
diferite, ceea ce e corect. Nu copia un trailer dintr-un commit vechi și nu lăsa
un nume hardcodat în vreun script; se schimbă de la o sesiune la alta.

Dă commit doar la fișierele lucrării tale. Repo-ul are frecvent și munca altcuiva
în working tree — `git add -A` orb amestecă istoricul. Verifică cu
`git status --short` după staging.

Înainte de commit rulează verificarea specifică proiectului:
`npm test` + `npx vite build` (nu există lint/tsc configurat).

## Push și PR

```bash
git push -u origin <branch>
gh pr create --title "..." --body "..."
```

Ca să urci **doar o parte** din commit-urile unui branch (ex. lucrarea de design
fără cea de feature), pune un branch pe commit-ul dorit și urcă-l pe el:

```bash
git branch design/<nume> <sha>
git push -u origin design/<nume>
```

Verifică întâi ce ia cu el: `git diff --stat origin/main <sha>` și un `git grep`
după termeni din cealaltă lucrare.

## Merge — ce blochează

`main` are branch protection. La merge te poți lovi de:

1. **„Review required"** — cere cel puțin un approve de la cineva cu write access.
   Nu-ți poți aproba singur PR-ul. `gh` e autentificat chiar ca autorul PR-urilor,
   deci auto-aprobarea e imposibilă.
2. **Vercel: „Account is blocked"** — check-ul de deploy a picat o perioadă din
   cauza contului Vercel al ownerului echipei (billing), nu din cauza codului.
   Aplicația e între timp publică pe `https://signa-lsr.online`, deci dacă
   revezi blocajul, verifică starea reală a contului înainte să dai vina pe cod.

Merge cu bypass (doar dacă ești admin și ți se cere explicit):

```bash
gh pr merge <nr> --merge --admin
```

Notă: `gh pr merge` poate fi blocat de clasificatorul harness-ului chiar și cu
permisiuni corecte. Dacă se întâmplă, spune-i utilizatorului să dea merge din
interfața GitHub — nu încerca alte rute.

## Conflicte frecvente

`src/App.jsx` e atins de aproape orice lucrare (rutare, props). Când apare
conflict acolo, de obicei răspunsul e **păstrează ambele** — un rând de props
nou nu-l exclude pe celălalt.

`src/index.css` a avut un conflict de nume de keyframe (`sg-pop` definit diferit
în două branch-uri). Două `@keyframes` cu același nume nu dau eroare — al doilea
îl suprascrie tăcut pe primul. Dacă vezi două definiții cu același nume în conflict,
redenumește una, nu alege.
