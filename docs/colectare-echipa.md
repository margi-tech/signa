# Ghid de colectare — pentru echipă

Scopul: recolecta **tot alfabetul** în formatul holistic nou (`normalize()` v2, 199 valori).
Modelele vechi din `public/models/_legacy-hand-only-63dim/` **nu** mai sunt compatibile.

**Fluxul principal:** toți colectează pe `https://signa-lsr.online` → exemplele
(vectori, nu poze) ajung în datasetul comun → un antrenor apasă **Încarcă din cloud**.

JSON export/import rămâne ca backup, dacă ești offline.

**Tutorial complet:** [`docs/tutorial-antrenare-echipa.md`](./tutorial-antrenare-echipa.md)
· setup SQL: [`docs/supabase-setup.md`](./supabase-setup.md) §5c

## Pornire

1. Cont pe `https://signa-lsr.online` (același ca la lecții)
2. Un admin te invită în `dataset_members` (`can_collect = true`)
3. Acasă → **Colectare date** → acceptă consimțământul (doar numere, fără cameră)
4. Colectezi. Inventarul arată totalul echipei. Statusul din header spune dacă s-a trimis.

Local (`npm run dev`) e util pentru UI; datele de echipă se strâng pe site-ul live.

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

## Backup JSON (dacă ești offline)

Apasă **Export** → salvează JSON-ul. **Import** unește datele (nu șterge ce ai deja).
Pe site, **Trimite localul în cloud** urcă backup-ul după ce ai consimțământul.

localStorage se poate umple — exportă dacă vezi avertismentul.

## Ce NU faci

- Nu modifica `src/utils/normalize.js`
- Nu urca imagini/video pe cloud — doar vectori numerici (automat, după consimțământ)
- Nu amesteca dataset-uri din formatul vechi (63 valori) cu cel nou (199)

## După ce avem date suficiente

Cineva cu `can_train` deschide **Antrenare model** → **Încarcă din cloud** → descarcă
modelele → le pune în `public/models/` (vezi `docs/retrain.md`). JSON-ul de backup
e doar dacă cloud-ul nu e disponibil.
