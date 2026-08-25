---
name: signa-collect
description: Modifică fluxul de colectare a datasetului Signa — cameră holistică, capturi foto/video, serii automate, inventar, import/export și siguranța coordonatelor. Folosește când lucrezi la CollectPage, HandTracker, HandCanvas, LetterSelector sau useDatasetCollector.
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
- Se salvează doar coordonate numerice în `signa-dataset-v1`. Imaginile și
  filmările nu se trimit și nu se stochează.

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
