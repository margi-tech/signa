# Reantrenare modele Signa

După recolectarea datasetului holistic (199 valori).

**Pentru echipă (flux end-to-end, fără greșeli):**  
→ [`docs/tutorial-antrenare-echipa.md`](./tutorial-antrenare-echipa.md)

## Pași

1. **Ia datele.** Două variante:
   - **Recomandat** — deschide **Antrenare** → **Încarcă din cloud**. Iei setul
     comun al echipei, fără export/import manual. Cere `can_train`.
   - Alternativ (offline sau fără invitație) — exportă din **Colectare** și
     încarcă JSON-ul în Antrenare.
2. Verifică numărul de etichete și exemplele per etichetă înainte să pornești.
3. Alege preset (Standard e ok pentru început).
4. Antrenează **Model static**, apoi **Model de mișcare** (dacă ai secvențe).
5. Uită-te la **Test set (held-out)** și la literele slabe (&lt;70%).
6. **Descarcă modelul** — vei primi:
   - `signa-model.json` + `signa-model.weights.bin` + `signa-labels.json`
   - (opțional) `signa-model-dynamic.*` + `signa-labels-dynamic.json`
7. Copiază-le în `public/models/` (înlocuiește fișierele active, **nu** arhiva `_legacy-…`).
8. Hard refresh în browser:
   - Chrome: DevTools → Network → Disable cache + reload, sau
   - Șterge service worker-ul Signa (Application → Service Workers → Unregister)
9. Verifică pe pagina **Diagnostic** că modelele apar „încărcate”.

## Capcane

| Problemă | Cauză | Fix |
|---|---|---|
| Predicții random după update | Service worker / HMR ține modelul vechi | Unregister SW + hard refresh |
| `Failed to load model` | Nume greșite / lipsă `.weights.bin` | Numele exacte din listă |
| Acc mare la train, slab live | `normalize()` diferit (nu e cazul dacă n-ai atins fișierul) | Nu modifica normalize |
| Test set ~100%, dar live e slab | Ai antrenat pe un JSON local (fără sesiuni) | Încarcă din cloud, unde sesiunile există |
| Litere V/W/Y confuze | Prea puține exemple / unghiuri similare | Mai multe exemple diverse |
| Model dinamic nu se activează | Lipsă fișiere sau litere fără secvențe | Colectează Video pentru J/Z/X/Î/Ș/Ț |

## Antrenare (v2 — mai rapid + mai bun)

Preseturile folosesc:
- **WebGL** backend
- **Early stopping** (oprire când validarea nu mai crește) + restaurare best weights
- **Augmentare** (zgomot pe landmarks) pe setul de train
- **Split pe sesiuni de colectare** + **class weights** (clase rare nu sunt ignorate)
- Arhitectură MLP mai adâncă (BatchNorm) / GRU mai lat (96)

### De ce contează split-ul pe sesiuni

O serie automată face 300 de poze la câteva zeci de milisecunde distanță, din
aceeași poziție — sunt aproape identice. Dacă testul ar primi cadre din aceeași
serie ca antrenamentul, modelul „ghicește" cadrul vecin și acuratețea iese fals
mare. De aceea toate exemplele dintr-o sesiune rămân împreună, ori în train, ori
în test.

**Datele din cloud au sesiuni; un JSON importat local nu are.** Deci acuratețea
raportată pe un import local e optimistă — folosește-o ca orientare, nu ca cifră
finală.

Recomandare: **Standard**. Rapid e pentru iterații; Detaliat dacă ai multe exemple.

## Versionare

`signa-labels.json` include acum `version` (dată) și `vectorSize`.
Cache-ul pe `/models/` e NetworkFirst (Workbox) — după copiere, hard-refresh / unregister SW.
