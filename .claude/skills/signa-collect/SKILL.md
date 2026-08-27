---
name: signa-collect
description: Modifică fluxul de colectare a datasetului Signa — cameră holistică, capturi foto/video, serii automate, inventar, dataset colaborativ în cloud, import/export și siguranța coordonatelor. Folosește când lucrezi la CollectPage, HandTracker, HandCanvas, LetterSelector, useDatasetCollector, useDatasetCloudSync sau lib/dataset.js.
---

# Colectarea datasetului Signa

## Contractul datelor

- `normalize()` v2 produce exact **199 valori**. Nu îl modifica fără acord explicit;
  schimbarea invalidează toate dataseturile și modelele.
- Capturile statice sunt vectori de 199 valori; filmările sunt secvențe de
  `SEQ_FRAMES`, fiecare cadru având 199 valori.
- Importul trece prin `readJsonObject()` (limită de dimensiune + rădăcină obiect)
  și prin `isDatasetVector()` / `isDatasetSequence()`. Fiecare valoare trebuie să
  fie finită; nu relaxa validarea în `CollectPage` sau `TrainPage`.
- Se salvează coordonate numerice în `signa-dataset-v1` (local) și, după
  consimțământ, în `dataset_batches` (vectori 199, fără imagini). Coada
  pending e `signa-dataset-pending-v1`, per user. Nu șterge dataset-ul local.

## Dataset colaborativ (cloud)

Echipa nu mai unește JSON-uri manual: exemplele se replică în Supabase, ca
`TrainPage` să antreneze pe setul comun. Local rămâne sursa de adevăr —
sincronizarea **nu atinge niciodată `signa-dataset-v1`**.

**Acces.** Capabilitățile stau în `dataset_members` (`can_collect`, `can_train`,
`can_publish`) și sunt **separate de `profiles.role`**. Adminii le au implicit;
restul se invită din SQL Editor. Clientul nu poate scrie în tabel. `useDatasetAccess`
citește `get_dataset_access()`; fără Supabase, totul e `false`, iar `App.jsx` lasă
uneltele deschise (mod offline).

**Consimțământ.** Nimic nu pleacă spre cloud până la `consent_dataset_upload()`.
Până atunci capturile se adună doar în coada locală, iar UI-ul spune explicit
„Local până accepți trimiterea". Nu trimite exemple în avans „ca să nu se piardă".

**Sesiuni — contează pentru antrenare.** `useDatasetCloudSync` ține un `sessionId`
(`crypto.randomUUID()`) și îl schimbă prin `bumpSession()` la schimbarea
etichetei/modului și la pornirea fiecărei serii automate. `session_id` ajunge în
`dataset_batches` și devine grupul pe care `groupedSplit` separă train/test.
**Dacă strici sesiunile, strici evaluarea modelului** — toate exemplele ar arăta
ca o singură sesiune uriașă și acuratețea de test devine falsă. Vezi `signa-train`.

**Loturi și coadă.** Exemplele se string în loturi de `STATIC_CHUNK = 50` /
`SEQUENCE_CHUNK = 8` (`chunkSizeFor`), rotunjite la 4 zecimale (`round4`) și
validate din nou înainte de a intra în coadă. Coada e `signa-dataset-pending-v1`,
**per user**, exact ca la progres. Flush automat la 4 s și la evenimentul `online`.

**Erori de la RPC.** `throwRpc` traduce mesajele: consimțământ lipsă, cont
neinvitat la colectare/antrenare, rate limit. La rate limit lotul rămâne în coadă
și se reîncearcă; la orice altă eroare coada se păstrează și eroarea urcă în UI.
Nu înghiți eroarea și nu goli coada ca să „treacă".

**Inventar.** `list_dataset_inventory()` dă numărul pe etichetă din setul comun;
`CollectPage` afișează `max(cloud, local)`. `queueLocalDataset()` urcă la cerere
datasetul local existent — util o singură dată, la intrarea unui coleg în echipă.

## Camera holistică

- `HandTracker` urmărește mâini + față + trunchi și trimite subiectul complet.
- Colectarea cere cel puțin o mână; fața și trunchiul îmbogățesc vectorul.
- Fața trebuie să umple cadranul oval (treimea de sus). Fără față în cadran,
  `onLandmarks` e `null` — captura și recunoașterea stau. Seria automată
  poate porni oricum; countdown-ul dă timp de așezare. Diagnosticul folosește
  `requireFaceFrame={false}`.
- În `CollectPage`, vizorul folosește `videoFit="cover"`: utilizatorul a cerut
  explicit zero benzi/margini în jurul camerei.
- `HandCanvas` trebuie să primească același `videoFit` ca video-ul, altfel
  landmarks-urile nu se aliniază.

## Serii automate

- Foto: **300 capturi**.
- Video: **50 secvențe**.
- Video păstrează pauză de **1 secundă** între secvențe.
- Detectorul holistic rulează la aproximativ 15 FPS (`DETECT_INTERVAL_MS = 66`).
  Foto folosește minimum **75 ms** și așteaptă incrementarea
  `landmarkFrameRef`; nu salva de două ori același rezultat MediaPipe.
- Prima captură are countdown de 3 secunde. `Escape`, schimbarea etichetei/modului
  și butonul Oprește trebuie să anuleze seria și timer-ele.
- Dacă tracking-ul mâinii lipsește 1,5 secunde, oprește seria; nu reutiliza
  coordonate vechi. Același timeout se aplică dacă fața iese din cadran.

## UI

- Vizorul, consola compactă și inventarul permanent trebuie să fie vizibile fără
  elemente decorative care acoperă corpul.
- Inventarul afișează mereu numărul per literă/cuvânt și pragul recomandat:
  50 foto statice / 30 secvențe dinamice.
- Butonul seriei rămâne accesibil fără mână detectată; countdown-ul oferă timp
  pentru cadran + mâini. Captura manuală statică stă dezactivată până când
  fața e în cadran și o mână e vizibilă.

## Verificare

Rulează `npm test` și `npx vite build`, apoi testează camera într-un tab real.
Preview-ul Cursor ascuns limitează `requestAnimationFrame` și throttle-uiește
timer-ele, deci nu validează corect ritmul de 75 ms sau tracking-ul live.
