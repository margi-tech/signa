---
name: signa-git
description: Fluxul de git pentru repo-ul Signa — branch per task, commit, PR, merge. Folosește când începi o lucrare nouă, când dai commit/push, când schimbi branch-ul sau când un merge e blocat. Conține regula care a costat deja o zi de muncă pierdută.
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
Termină cu:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Dă commit doar la fișierele lucrării tale. Repo-ul are frecvent și munca altcuiva
în working tree — `git add -A` orb amestecă istoricul. Verifică cu
`git status --short` după staging.

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
   Nu-ți poți aproba singur PR-ul.
2. **Vercel: „Account is blocked"** — check-ul de deploy pică din cauza contului
   Vercel al ownerului echipei (billing/suspendare), nu din cauza codului.

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
