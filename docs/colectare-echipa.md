# Ghid de colectare — pentru echipă 

Scopul: recolecta **tot alfabetul** în formatul holistic nou (`normalize()` v2, 199 valori).
Modelele vechi din `public/models/_legacy-hand-only-63dim/` **nu** mai sunt compatibile.

**Tutorial complet (colectare + unire + antrenare + `public/models/`):**  
→ [`docs/tutorial-antrenare-echipa.md`](./tutorial-antrenare-echipa.md)

## Pornire locală

```bash
git checkout main && git pull
npm install
npm run dev
```

Deschide URL-ul din terminal (de obicei `http://localhost:5173`).
Pe telefon: același Wi-Fi, apoi IP-ul din terminal (ex. `http://192.168.x.x:5173`) — **HTTPS sau localhost** e necesar pentru cameră pe unele browsere; pe iPhone Safari, cel mai simplu e un tunnel (Cloudflare/ngrok) sau deploy preview.

## Cum colectezi

1. Acasă → **Colectare date**
2. Alege litera din bandă (sau scrie un cuvânt în câmp)
3. **Foto** = poză statică (litere fără mișcare)
4. **Video** = countdown 3s (ridici ambele mâini) + ~1.5s mișcare (J, Z, X, Î, Ș, Ț — se selectează automat)
5. Manual: ridică mâna și apasă butonul (sau `Spațiu` pe desktop).
6. Automat: **300 foto** sau **50 filmări**; countdown-ul de 3s îți oferă timp
   să intri în cadru. Foto salvează numai rezultate MediaPipe noi (~75ms minim),
   iar Video păstrează pauză de 1s între secvențe.
7. Poți opri seria cu **Oprește** sau `Escape`. Dacă mâna iese din tracking,
   seria se oprește fără să repete coordonate vechi.
8. Pragurile minime pentru antrenare rămân **50** exemple / literă statică și
   **30** înregistrări / literă dinamică; seriile mai mari oferă diversitate.
9. Diversifică în timpul seriei: unghi, distanță, expresie, lumină și
   stânga/dreapta dacă semnul permite.

Vizorul umple complet cadrul (`cover`), fără margini. Verifică permanent ca
mâinile să nu fie tăiate de marginile imaginii.

## Export (OBLIGATORIU după fiecare sesiune)

Apasă **Export** → salvează JSON-ul. Trimite pe canalul echipei cu numele:

```
signa-dataset-YYYY-MM-DD-<prenume>.json
```

localStorage se poate umple — exportă des.

## Import

**Import** unește datele (nu șterge ce ai deja). Poți combina exporturile colegilor înainte de antrenare.

## Ce NU faci

- Nu modifica `src/utils/normalize.js`
- Nu urca imagini/video pe cloud — doar JSON cu vectori numerici
- Nu amesteca dataset-uri din formatul vechi (63 valori) cu cel nou (199)

## După ce avem date suficiente

Cineva (Lead AI) rulează **Antrenare model** → descarcă modelele → le pune în `public/models/`
(vezi `docs/retrain.md`).
