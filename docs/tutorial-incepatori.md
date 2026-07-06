# Tutorial pentru începători — cum lucrezi la Signa fără să fi scris cod vreodată

Bun venit în echipă! 🎉 Acest ghid te duce de la zero până la prima ta contribuție.
Vestea bună: **nu trebuie să știi să programezi** — vei lucra cu Claude Code, un asistent AI
care scrie codul pentru tine. Tu îi explici în română ce vrei, el face.

---

## Pasul 0 — Ce este fiecare lucru (dicționar minim)

| Termen | Pe înțelesul tuturor |
|---|---|
| **Repozitoriu (repo)** | Folderul proiectului, găzduit pe GitHub, la care avem toți acces |
| **GitHub** | Site-ul unde stă codul echipei (ca un Google Drive pentru cod) |
| **Git** | Programul care ține evidența schimbărilor (cine, ce, când a modificat) |
| **Ramură (branch)** | O „copie de lucru" a proiectului în care modifici fără să strici versiunea principală |
| **`main`** | Ramura principală — versiunea „bună" a aplicației. Nu se lucrează direct pe ea |
| **Pull Request (PR)** | Cererea ta: „am terminat, uitați-vă peste schimbările mele și băgați-le în main" |
| **Terminal** | Fereastra în care scrii comenzi text (pe Mac: aplicația **Terminal**) |
| **Claude Code** | Asistentul AI din terminal care scrie și modifică codul la cererea ta |

---

## Pasul 1 — Instalează ce ai nevoie (o singură dată)

### 1.1 Creează cont pe GitHub
1. Intră pe [github.com](https://github.com) → **Sign up**
2. Trimite username-ul tău lui David ca să te adauge la proiect
3. Vei primi un email de invitație — apasă **Accept invitation**

### 1.2 Instalează uneltele
Deschide **Terminal** (pe Mac: Cmd+Spațiu, scrie „Terminal", Enter) și rulează pe rând:

```bash
# 1. Homebrew — instalatorul de programe pentru Mac (dacă nu-l ai deja)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Git + Node.js (motorul care rulează aplicația) + GitHub CLI
brew install git node gh

# 3. Claude Code — asistentul tău AI
npm install -g @anthropic-ai/claude-code
```

### 1.3 Conectează-te la GitHub din terminal
```bash
gh auth login
```
Alege: **GitHub.com** → **HTTPS** → **Login with a web browser** și urmează pașii din browser.

### 1.4 Spune-i lui Git cine ești
```bash
git config --global user.name "numele-tau-de-github"
git config --global user.email "emailul-tau@exemplu.com"
```

---

## Pasul 2 — Descarcă proiectul (o singură dată)

```bash
cd ~/Documents
git clone https://github.com/margi-tech/signa.git
cd signa
npm install
```

`npm install` durează un minut — descarcă bibliotecile de care are nevoie aplicația.

### Verifică dacă merge
```bash
npm run dev
```
Deschide în browser adresa afișată (de obicei `http://localhost:5173`). Ar trebui să vezi aplicația Signa! 🎉
Când vrei să oprești aplicația, apasă `Ctrl+C` în terminal.

---

## Pasul 3 — Pornește Claude Code

Din folderul proiectului:
```bash
cd ~/Documents/signa
claude
```

Prima dată îți va cere să te conectezi cu un cont — urmează instrucțiunile.
După asta, pur și simplu **scrii ce vrei, în română**, ca un chat:

> „Explică-mi ce face această aplicație și cum e organizat codul"

> „Pornește serverul local ca să văd aplicația"

Claude citește singur fișierul `CLAUDE.md` din proiect, deci știe deja regulile echipei.

---

## Pasul 4 — Cum lucrezi zi de zi (ciclul complet)

Regula de aur a echipei: **nu modifici niciodată direct `main`**. Lucrezi pe o ramură a ta,
apoi ceri integrarea printr-un Pull Request. Sună complicat, dar Claude face totul pentru tine.

### 4.1 Începe o sarcină nouă
Deschide Claude Code în folderul proiectului și spune-i:

> „Vreau să încep o sarcină nouă: [descrie sarcina din to-do list-ul tău].
> Adu-mi te rog ultima versiune de pe main și creează o ramură nouă pentru asta.
> Eu sunt persoana [P1–P5], deci prefixul ramurii e [p1–p5]."

### 4.2 Lucrează la sarcină
Descrie-i lui Claude ce vrei, pas cu pas, ca într-o conversație:

> „Adaugă un buton verde pe pagina principală care..."

> „Nu-mi place cum arată, fă textul mai mare și mută-l jos"

> „Arată-mi cum arată acum în browser"

Sfaturi:
- **Cereri mici, pe rând** — nu-i cere 5 lucruri deodată
- **Uită-te în browser după fiecare schimbare** — spune-i „pornește serverul" și verifică
- Dacă ceva s-a stricat, spune-i: „ai stricat X, repară" sau „anulează ultima schimbare"

### 4.3 Salvează-ți munca (des!)
> „Salvează progresul într-un commit cu o descriere potrivită"

Fă asta de câte ori ai terminat o bucată care funcționează — e ca „Save" într-un joc.

### 4.4 Trimite munca spre echipă
Când sarcina e gata:

> „Am terminat sarcina. Fă push la ramură și deschide un Pull Request spre main,
> cu o descriere clară a ce am făcut și de ce."

Apoi anunță pe grupul echipei că ai un PR — altcineva trebuie să se uite peste el
și să-l aprobe înainte de merge.

### 4.5 După ce PR-ul tău a fost integrat
> „PR-ul meu a fost integrat. Treci înapoi pe main și adu ultima versiune."

Și ciclul se reia de la 4.1 pentru următoarea sarcină. Atât!

---

## Reguli de aur (memorează-le!)

1. 🚫 **Nu modifica NICIODATĂ fișierul `src/utils/normalize.js`** — dacă Claude propune să-l schimbe, refuză și anunță-l pe David. Schimbarea lui strică modelul AI al aplicației.
2. 🔒 **Nimic din cameră nu pleacă pe internet** — recunoașterea semnelor rulează doar pe dispozitiv.
3. 🌿 **Lucrezi doar pe ramura ta**, niciodată direct pe `main`.
4. 💾 **Salvează des** (commit-uri mici) și **cere integrarea des** (PR-uri mici) — nu sta o săptămână fără să trimiți nimic.
5. 🗣️ **Dacă nu înțelegi ceva, întreabă-l pe Claude** — chiar și „explică-mi ca pentru un copil ce ai făcut adineauri". Nu există întrebări proaste.

---

## Probleme frecvente

**„command not found: claude / git / npm"**
→ Instalarea de la Pasul 1 nu s-a terminat cu succes. Rulează din nou comanda `brew install...` sau cere-i ajutorul lui Claude pe telefon/web: [claude.ai](https://claude.ai).

**Aplicația nu pornește / erori roșii în terminal**
→ Copiază eroarea și dă-i-o lui Claude: „îmi dă eroarea asta, repar-o: [lipește eroarea]".

**„Am stricat ceva și nu știu ce"**
→ Spune-i lui Claude: „Anulează toate schimbările nesalvate și adu-mă la ultima versiune care funcționa." Nimic nu e pierdut definitiv — Git ține minte tot.

**Vrei să vezi ce au făcut ceilalți**
→ „Adu ultimele schimbări de pe GitHub și fă-mi un rezumat a ce s-a schimbat."

---

## Sarcinile tale

Deschide [impartirea-muncii.md](impartirea-muncii.md) și caută secțiunea cu rolul tău (P1–P5).
Acolo e to-do list-ul tău. Ia-le pe rând, de sus în jos — și spor la treabă! 💪
