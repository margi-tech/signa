import { useRef, useState, useEffect, useCallback } from 'react';
import HandTracker from '../components/hand-tracker';
import LetterSelector from '../components/collect/LetterSelector';
import { useDatasetCollector } from '../hooks/useDatasetCollector';
import { DYNAMIC_LETTERS, SEQ_FRAMES, SEQ_INTERVAL_MS, minFor } from '../data/lsr-alphabet';

const MODE = { FOTO: 'foto', VIDEO: 'video' };
/** Secunde de pregătire înainte de Video — apeși, ridici ambele mâini, apoi începe captura */
const COUNTDOWN_SEC = 3;
const PHOTO_BATCH_SIZE = 300;
const VIDEO_BATCH_SIZE = 50;
// Detectorul holistic rulează la ~15 FPS (un rezultat nou la ~66 ms).
// 75 ms este pauza minimă sigură; seria așteaptă și un rezultat MediaPipe nou.
const PHOTO_DELAY_MS = 75;
const VIDEO_GAP_MS = 1000;

/** Clonează un instantaneu holistic — MediaPipe poate refolosi structurile intern */
function cloneSubject(subject) {
  return {
    hands: subject.hands?.map((h) => h.map(({ x, y, z }) => ({ x, y, z }))) ?? [],
    handedness: subject.handedness ? [...subject.handedness] : [],
    faceBlendshapes: subject.faceBlendshapes ? [...subject.faceBlendshapes] : null,
    headMatrix: subject.headMatrix ? [...subject.headMatrix] : null,
    pose: subject.pose ? subject.pose.map(({ x, y, z, visibility }) => ({ x, y, z, visibility })) : null,
  };
}

/* ── Câmp text + comutator Foto/Video, într-un singur rând compact ── */
function WordInput({ value, onChange, mode, onModeChange }) {
  return (
    <div className="flex gap-1.5 px-4 pt-2.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="scrie litera sau cuvântul…"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        className="flex-1 min-w-0 bg-white border border-ink-900/10 rounded-xl px-3.5 py-2
          text-ink-900 text-sm font-semibold placeholder:text-ink-400 placeholder:font-normal
          focus:outline-none focus:border-signa-500/50 shadow-card transition-colors"
      />
      {[
        { id: MODE.FOTO,  label: 'Foto' },
        { id: MODE.VIDEO, label: 'Video' },
      ].map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all
            ${mode === m.id
              ? m.id === MODE.VIDEO
                ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                : 'bg-signa-50 text-signa-600 border border-signa-200'
              : 'bg-cream-100 text-ink-500 border border-transparent hover:text-ink-700'}`}
        >
          {m.id === MODE.VIDEO ? '●' : '◐'} {m.label}
        </button>
      ))}
    </div>
  );
}

/* ── Buton captură / înregistrare ──────────────────────────────── */
function CaptureBtn({
  onCapture, isHandDetected, letter, isDone, isDynamic,
  recording, recProgress, countdown, onCancelCountdown, automation = false,
}) {
  const busy = recording || countdown > 0 || automation;
  const label = countdown > 0
    ? `Pregătește-te… ${countdown}`
    : recording
      ? 'Se înregistrează mișcarea…'
      : automation
        ? 'Seria automată este în desfășurare…'
      : isDynamic
        ? !isHandDetected
          ? `Apasă — ai ${COUNTDOWN_SEC}s să ridici ambele mâini`
          : isDone ? `✓ ${letter} complet — mai înregistrează` : `● Înregistrează  ${letter}`
        : !isHandDetected
          ? 'Ridică mâna în față camerei'
          : isDone ? `✓ ${letter} complet — mai adaugă` : `Capturează  ${letter}`;

  return (
    <div className="space-y-2">
      <button
        onPointerDown={busy ? undefined : onCapture}
        disabled={busy || (!isDynamic && !isHandDetected)}
        className={`relative w-full min-h-[56px] px-4 rounded-2xl font-extrabold text-[13px] overflow-hidden
          border transition-all duration-200 active:scale-[0.98] select-none
          ${countdown > 0
            ? 'bg-amber-500 border-amber-500 text-white'
            : recording
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : !isHandDetected && !isDynamic
                ? 'bg-ink-900/[.035] border-ink-900/[.06] text-ink-400'
                : isDynamic
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-[0_5px_18px_rgba(99,102,241,.22)]'
                  : isDone
                    ? 'bg-signa-600 border-signa-600 text-white shadow-[0_5px_18px_rgba(5,150,105,.2)]'
                    : 'bg-signa-500 border-signa-500 text-white shadow-[0_5px_18px_rgba(16,185,129,.2)]'}`}
      >
        {recording && (
          <span
            className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-75"
            style={{ width: `${recProgress * 100}%` }}
          />
        )}
        <span className="relative">{label}</span>
      </button>
      {countdown > 0 && (
        <button
          type="button"
          onClick={onCancelCountdown}
          className="w-full py-1.5 text-ink-400 hover:text-ink-600 text-xs font-medium"
        >
          Anulează countdown
        </button>
      )}
    </div>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────── */
export default function CollectPage({ onBack }) {
  const latestLandmarksRef = useRef(null);
  const recTimerRef        = useRef(null);
  const countdownRef       = useRef(null);
  const recResolveRef      = useRef(null);
  const countdownResolveRef = useRef(null);
  const autoRunRef         = useRef(0);
  const landmarkFrameRef   = useRef(0);
  const [flash,          setFlash]          = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [recProgress,    setRecProgress]    = useState(0);
  const [countdown,      setCountdown]      = useState(0);
  const [importMsg,      setImportMsg]      = useState('');
  const [tracking,       setTracking]       = useState({
    hands: 0,
    face: false,
    pose: false,
  });
  const [autoRunning,    setAutoRunning]    = useState(false);
  const [autoProgress,   setAutoProgress]   = useState(0);
  const [autoNote,       setAutoNote]       = useState('');

  const [mode, setMode] = useState(MODE.FOTO);

  const {
    activeLabel, setActiveLabel,
    capture, captureSequence, clearActiveLabel,
    importDataset, exportDataset,
    samplesFor, totalSamples, hasData, storageFull, labels,
  } = useDatasetCollector();

  const isDynamic = mode === MODE.VIDEO;
  const autoBatchSize = isDynamic ? VIDEO_BATCH_SIZE : PHOTO_BATCH_SIZE;

  /** Selectarea unei litere din alfabet sugerează un mod implicit, dar rămâne editabil */
  const handleSelectLetter = useCallback((letter) => {
    setActiveLabel(letter);
    setMode(DYNAMIC_LETTERS.has(letter) ? MODE.VIDEO : MODE.FOTO);
  }, [setActiveLabel]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reimportul aceluiași fișier
    if (!file) return;
    try {
      const n = await importDataset(file);
      setImportMsg(n > 0 ? `✓ ${n} exemple importate` : 'Fișierul nu conținea exemple valide');
    } catch {
      setImportMsg('✗ Fișier JSON invalid');
    }
    setTimeout(() => setImportMsg(''), 4000);
  }, [importDataset]);

  const handleLandmarks = useCallback((lm) => {
    latestLandmarksRef.current = lm;
    if (lm) landmarkFrameRef.current += 1;
    setIsHandDetected(!!lm);
  }, []);

  const handleTracking = useCallback((subject) => {
    setTracking({
      hands: subject?.hands?.length ?? 0,
      face: Boolean(subject?.faceLandmarks?.length),
      pose: Boolean(subject?.pose?.length),
    });
  }, []);

  /** Oprește countdown + înregistrare (anulare sau cleanup) */
  const stopRecording = useCallback(() => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
    setRecording(false);
    setRecProgress(0);
    const resolveRecording = recResolveRef.current;
    recResolveRef.current = null;
    resolveRecording?.(false);
    const resolveCountdown = countdownResolveRef.current;
    countdownResolveRef.current = null;
    resolveCountdown?.(false);
  }, []);

  /** Înregistrează SEQ_FRAMES cadre la interval fix (~1.5s de mișcare) */
  const startRecording = useCallback(() => {
    if (recTimerRef.current) return Promise.resolve(false);
    // Fără mână la pornire: așteaptă scurt (user tocmai a ridicat ambele mâini)
    if (!latestLandmarksRef.current?.hands?.length) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      recResolveRef.current = resolve;
      const frames = [];
      setRecording(true);
      setRecProgress(0);

      recTimerRef.current = setInterval(() => {
        const subject = latestLandmarksRef.current;
        if (!subject?.hands?.length) {
          // Mâna a ieșit din cadru — înregistrarea se anulează
          stopRecording();
          return;
        }
        frames.push(cloneSubject(subject));
        setRecProgress(frames.length / SEQ_FRAMES);

        if (frames.length >= SEQ_FRAMES) {
          clearInterval(recTimerRef.current);
          recTimerRef.current = null;
          setRecording(false);
          setRecProgress(0);
          const saved = captureSequence(frames);
          if (saved) {
            setFlash(true);
            setTimeout(() => setFlash(false), 110);
          }
          const finish = recResolveRef.current;
          recResolveRef.current = null;
          finish?.(saved);
        }
      }, SEQ_INTERVAL_MS);
    });
  }, [captureSequence, stopRecording]);

  /** Countdown reutilizabil — oferă timp pentru intrarea în cadru. */
  const startPrepCountdown = useCallback(() => {
    if (countdownRef.current || recTimerRef.current) return Promise.resolve(false);

    return new Promise((resolve) => {
      countdownResolveRef.current = resolve;
      setCountdown(COUNTDOWN_SEC);
      let left = COUNTDOWN_SEC;
      countdownRef.current = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
          countdownResolveRef.current = null;
          setCountdown(0);
          resolve(true);
          return;
        }
        setCountdown(left);
      }, 1000);
    });
  }, []);

  /** Video: countdown 3-2-1, apoi captură. */
  const startCountdown = useCallback(async () => {
    const ready = await startPrepCountdown();
    return ready ? startRecording() : false;
  }, [startPrepCountdown, startRecording]);

  const handleCapture = useCallback(() => {
    if (isDynamic) {
      startCountdown();
      return;
    }
    if (!capture(latestLandmarksRef.current)) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 110);
  }, [isDynamic, capture, startCountdown]);

  const stopAutoCapture = useCallback(() => {
    autoRunRef.current += 1;
    setAutoRunning(false);
    stopRecording();
  }, [stopRecording]);

  const waitForFreshHandFrame = useCallback((previousFrame, runId) => (
    new Promise((resolve) => {
      const startedAt = performance.now();
      const check = () => {
        if (autoRunRef.current !== runId) {
          resolve(false);
          return;
        }
        if (
          landmarkFrameRef.current > previousFrame
          && latestLandmarksRef.current?.hands?.length
        ) {
          resolve(true);
          return;
        }
        // Nu salvăm coordonate vechi dacă tracking-ul a fost pierdut.
        if (performance.now() - startedAt >= 1500) {
          resolve(false);
          return;
        }
        setTimeout(check, 8);
      };
      setTimeout(check, PHOTO_DELAY_MS);
    })
  ), []);

  const startAutoCapture = useCallback(async () => {
    if (autoRunning || recording || countdown > 0) return;

    const runId = autoRunRef.current + 1;
    autoRunRef.current = runId;
    setAutoProgress(0);
    setAutoNote('');
    setAutoRunning(true);

    for (let index = 0; index < autoBatchSize; index += 1) {
      if (autoRunRef.current !== runId) return;

      let saved = false;
      if (isDynamic) {
        if (index === 0) {
          saved = await startCountdown();
        } else {
          await new Promise((resolve) => setTimeout(resolve, VIDEO_GAP_MS));
          if (autoRunRef.current !== runId) return;
          saved = await startRecording();
        }
      } else {
        if (index === 0) {
          const ready = await startPrepCountdown();
          if (!ready || autoRunRef.current !== runId) return;
        } else {
          const fresh = await waitForFreshHandFrame(landmarkFrameRef.current, runId);
          if (!fresh || autoRunRef.current !== runId) {
            setAutoNote('Seria s-a oprit: tracking-ul mâinii a fost pierdut.');
            setAutoRunning(false);
            return;
          }
        }
        saved = capture(latestLandmarksRef.current);
        if (saved) {
          setFlash(true);
          setTimeout(() => setFlash(false), 110);
        }
      }

      if (autoRunRef.current !== runId) return;
      if (!saved) {
        setAutoNote('Seria s-a oprit: mâna a ieșit din cadru.');
        setAutoRunning(false);
        return;
      }

      setAutoProgress(index + 1);
    }

    if (autoRunRef.current === runId) {
      setAutoRunning(false);
      setAutoNote(`Seria de ${autoBatchSize} ${isDynamic ? 'filmări' : 'poze'} este gata.`);
    }
  }, [
    autoBatchSize, autoRunning, capture, countdown, isDynamic, recording,
    startCountdown, startPrepCountdown, startRecording, waitForFreshHandFrame,
  ]);

  // Schimbarea etichetei/modului sau părăsirea paginii anulează înregistrarea
  useEffect(() => stopAutoCapture, [activeLabel, mode, stopAutoCapture]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (countdown > 0 || recording || autoRunning) return;
        handleCapture();
      }
      if (e.code === 'Escape') stopAutoCapture();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCapture, countdown, recording, autoRunning, stopAutoCapture]);

  const count  = samplesFor(activeLabel);
  const isDone = count >= minFor(isDynamic);

  const trackingReady = tracking.hands > 0 && tracking.face && tracking.pose;

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_80%_45%_at_72%_0%,#F2FBF6,#FFFBF3_68%)] text-ink-900">
      <header className="sticky top-0 z-40 border-b border-ink-900/[.06] bg-cream/90 backdrop-blur-xl">
        <div className="max-w-[1540px] mx-auto px-4 lg:px-7 py-3.5 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-none rounded-full border border-ink-900/[.08] bg-white px-3.5 py-2
              text-[12.5px] font-extrabold text-ink-700 transition-[transform,border-color] duration-150
              hover:-translate-y-px hover:border-signa-500"
          >
            ← Înapoi
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-ink-400">
              Studio holistic · față · corp · mâini
            </p>
            <h1 className="text-[18px] lg:text-[22px] font-black tracking-[-.02em] truncate">
              Colectare date
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="rounded-full bg-white border border-ink-900/[.07] px-3 py-2
              text-[11.5px] font-extrabold text-ink-600 tabular-nums">
              {totalSamples} exemple
            </span>
            <label className="rounded-full border border-ink-900/[.08] bg-white px-3.5 py-2
              text-[11.5px] font-extrabold text-ink-700 cursor-pointer hover:border-signa-500">
              Importă
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
            <button
              type="button"
              onClick={exportDataset}
              disabled={!hasData}
              className="rounded-full bg-ink-900 px-3.5 py-2 text-[11.5px] font-extrabold text-white
                transition-transform duration-150 hover:-translate-y-px disabled:opacity-35 disabled:translate-y-0"
            >
              Exportă
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1540px] mx-auto p-3.5 lg:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-[18px] items-start">
          <div className="min-w-0 flex flex-col gap-[14px]">
            {/* Vizor full-bleed: cover elimină complet benzile din jurul camerei. */}
            <section className="relative overflow-hidden rounded-[26px] bg-[#171914]
              shadow-[0_18px_48px_rgba(46,42,36,.16)]
              h-[56vh] min-h-[400px] lg:h-[calc(100vh-310px)] lg:min-h-[450px]">
              <HandTracker
                onLandmarks={handleLandmarks}
                onTracking={handleTracking}
                videoFit="cover"
                showStatus={false}
              />

              {flash && <div className="absolute inset-0 z-30 bg-white/20 pointer-events-none" />}

              <div className="absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-black/75 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 z-20 h-36 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

              <div className="absolute top-4 left-4 right-4 z-30 flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: tracking.hands === 2 ? '2 mâini' : tracking.hands === 1 ? '1 mână' : 'Mâini', on: tracking.hands > 0 },
                    { label: 'Față', on: tracking.face },
                    { label: 'Corp', on: tracking.pose },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={`rounded-full border px-2.5 py-1.5 text-[10.5px] font-extrabold backdrop-blur-md
                        ${item.on
                          ? 'bg-signa-500/85 border-signa-300/30 text-white'
                          : 'bg-black/35 border-white/15 text-white/45'}`}
                    >
                      {item.on ? '✓ ' : '○ '}{item.label}
                    </span>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-right backdrop-blur-md">
                  <p className="max-w-[220px] truncate text-[11px] font-extrabold uppercase tracking-[.08em] text-white/55">
                    Etichetă activă
                  </p>
                  <p className="max-w-[220px] truncate text-[20px] font-black text-white">{activeLabel}</p>
                </div>
              </div>

              {countdown > 0 && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
                  <span
                    className="text-white font-black tabular-nums leading-none"
                    style={{ fontSize: 'clamp(84px, 16vw, 150px)', textShadow: '0 8px 32px rgba(0,0,0,.5)' }}
                  >
                    {countdown}
                  </span>
                  <p className="mt-3 text-[14px] font-extrabold text-white/85">
                    Corpul și ambele mâini în cadru
                  </p>
                </div>
              )}

              {recording && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 rounded-full
                  bg-red-600/90 border border-white/20 px-4 py-2 text-white text-[11px] font-extrabold
                  flex items-center gap-2 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-white" style={{ animation: 'sg-rec 1s ease-in-out infinite' }} />
                  REC · Fă mișcarea acum
                </div>
              )}

              {importMsg && !recording && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40">
                  <span className={`rounded-full bg-black/70 px-4 py-2 text-[11px] font-extrabold
                    ${importMsg.startsWith('✗') ? 'text-red-300' : 'text-white'}`}>
                    {importMsg}
                  </span>
                </div>
              )}

              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 rounded-full
                border px-3.5 py-2 text-[10.5px] font-extrabold backdrop-blur-md pointer-events-none
                ${trackingReady
                  ? 'border-signa-300/30 bg-signa-500/80 text-white'
                  : 'border-white/12 bg-black/35 text-white/70'}`}>
                {trackingReady ? '✓ Gata de captură' : 'Intră cu mâinile în cadru'}
              </div>
            </section>

            {/* Consola de captură rămâne permanent sub vizor. */}
            <section className="rounded-[22px] bg-white/90 border border-ink-900/[.055]
              shadow-[0_8px_24px_rgba(46,42,36,.045)] overflow-hidden backdrop-blur-xl">
              <WordInput value={activeLabel} onChange={setActiveLabel} mode={mode} onModeChange={setMode} />
              <div className="grid grid-cols-1 md:grid-cols-[minmax(150px,.8fr)_minmax(230px,1.25fr)_minmax(230px,1.25fr)]
                gap-2.5 px-4 pb-3 pt-2.5">
                <div className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-ink-900/[.055] bg-white px-3.5">
                  <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-xl font-black
                    ${isDynamic ? 'bg-indigo-50 text-indigo-600' : 'bg-cream-200 text-ink-900'}`}>
                    {activeLabel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-black">
                      <span className="truncate text-ink-700">{count}/{minFor(isDynamic)}</span>
                      {count > 0 && (
                        <button
                          type="button"
                          onClick={clearActiveLabel}
                          className="text-ink-400 transition-colors hover:text-rose-500"
                          aria-label={`Șterge exemplele pentru ${activeLabel}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-900/[.07]">
                      <div
                        className={`h-full rounded-full ${isDynamic ? 'bg-indigo-400' : 'bg-signa-400'}`}
                        style={{ width: `${Math.min(count / minFor(isDynamic), 1) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <CaptureBtn
                  onCapture={handleCapture}
                  isHandDetected={isHandDetected}
                  letter={activeLabel}
                  isDone={isDone}
                  isDynamic={isDynamic}
                  recording={recording}
                  recProgress={recProgress}
                  countdown={countdown}
                  onCancelCountdown={autoRunning ? stopAutoCapture : stopRecording}
                  automation={autoRunning}
                />

                <button
                  type="button"
                  onClick={autoRunning ? stopAutoCapture : startAutoCapture}
                  disabled={!autoRunning && (recording || countdown > 0)}
                  className={`relative min-h-[56px] overflow-hidden rounded-2xl px-4 text-left
                    transition-all duration-200 active:scale-[.98] disabled:opacity-45
                    ${autoRunning
                      ? 'border border-rose-200 bg-rose-50 text-rose-700'
                      : 'border border-signa-600 bg-gradient-to-r from-signa-600 to-signa-500 text-white shadow-[0_6px_18px_rgba(5,150,105,.2)] hover:-translate-y-px'}`}
                >
                  {autoRunning && (
                    <span
                      className="absolute inset-y-0 left-0 bg-rose-200/45 transition-[width] duration-300"
                      style={{ width: `${(autoProgress / autoBatchSize) * 100}%` }}
                    />
                  )}
                  <span className="relative flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-[12px] font-black">
                        {autoRunning ? 'Oprește seria' : `Serie automată · ${autoBatchSize}`}
                      </span>
                      <span className={`mt-0.5 block text-[10px] font-bold ${
                        autoRunning ? 'text-rose-500' : 'text-white/55'
                      }`}>
                        {autoRunning
                          ? `${autoProgress}/${autoBatchSize} capturi`
                          : isDynamic ? 'pauză 1s' : 'cadre noi · ~75ms'}
                      </span>
                    </span>
                    <span className="text-lg">{autoRunning ? '■' : '▶'}</span>
                  </span>
                </button>
              </div>
              {(autoNote || storageFull) && (
                <div className="px-4 pb-3">
                  <p className={`rounded-xl px-3 py-2 text-center text-[10.5px] font-bold ${
                    storageFull ? 'bg-amber-50 text-amber-700' : 'bg-cream-50 text-ink-500'
                  }`}>
                    {storageFull
                      ? 'Spațiul local e plin — exportă datasetul acum.'
                      : autoNote}
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Inventar persistent: fiecare etichetă își arată mereu numărul. */}
          <aside className="xl:sticky xl:top-[82px] rounded-[24px] bg-white border border-ink-900/[.06]
            shadow-[0_10px_30px_rgba(46,42,36,.06)] overflow-hidden
            xl:h-[calc(100vh-106px)] flex flex-col">
            <div className="flex-none px-5 py-4 border-b border-ink-900/[.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-ink-400">
                    Inventar permanent
                  </p>
                  <h2 className="mt-1 text-[18px] font-black text-ink-900">Tot datasetul</h2>
                </div>
                <span className="rounded-full bg-signa-50 border border-signa-500/[.16] px-3 py-1.5
                  text-[11px] font-black text-signa-900 tabular-nums">
                  {labels.length} etichete
                </span>
              </div>
              <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-ink-500">
                Fiecare card arată exact câte poze sau filmări ai și pragul recomandat.
              </p>
              <div className="sm:hidden mt-3 flex gap-2">
                <label className="flex-1 text-center rounded-full border border-ink-900/[.08] bg-white px-3 py-2
                  text-[11px] font-extrabold text-ink-700 cursor-pointer">
                  Importă
                  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                </label>
                <button
                  type="button"
                  onClick={exportDataset}
                  disabled={!hasData}
                  className="flex-1 rounded-full bg-ink-900 px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-35"
                >
                  Exportă
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-4">
              <LetterSelector
                activeLetter={activeLabel}
                onSelect={handleSelectLetter}
                samplesFor={samplesFor}
                extraLabels={labels}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
