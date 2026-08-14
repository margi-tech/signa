import { useRef, useState, useEffect, useCallback } from 'react';
import HandTracker from '../components/hand-tracker';
import LetterSelector from '../components/collect/LetterSelector';
import { useDatasetCollector } from '../hooks/useDatasetCollector';
import { DYNAMIC_LETTERS, SEQ_FRAMES, SEQ_INTERVAL_MS, minFor, LSR_ALPHABET } from '../data/lsr-alphabet';

const MODE = { FOTO: 'foto', VIDEO: 'video' };
/** Secunde de pregătire înainte de Video — apeși, ridici ambele mâini, apoi începe captura */
const COUNTDOWN_SEC = 3;

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

/* ── Acoperire dataset: litere complete / lipsă ──────────────────── */
function DatasetOverview({ samplesFor, labels }) {
  const [open, setOpen] = useState(false);
  const done = LSR_ALPHABET.filter((l) => samplesFor(l) >= minFor(DYNAMIC_LETTERS.has(l)));
  const missing = LSR_ALPHABET.filter((l) => samplesFor(l) < minFor(DYNAMIC_LETTERS.has(l)));
  const custom = labels.filter((l) => !LSR_ALPHABET.includes(l));

  return (
    <div className="px-4 pb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left py-2 text-xs font-semibold text-ink-500"
      >
        <span>Dataset · {done.length}/{LSR_ALPHABET.length} etichete complete · {labels.length} etichete totale</span>
        <span className="text-ink-400">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="bg-cream-50 rounded-xl p-3 mb-2 space-y-2 text-xs">
          {missing.length > 0 && (
            <p className="text-ink-600">
              <span className="font-bold text-amber-600">Lipsă/sub prag:</span>{' '}
              {missing.join(' · ')}
            </p>
          )}
          {custom.length > 0 && (
            <p className="text-ink-600">
              <span className="font-bold text-signa-600">Cuvinte/custom:</span>{' '}
              {custom.map((l) => `${l}(${samplesFor(l)})`).join(', ')}
            </p>
          )}
          {missing.length === 0 && (
            <p className="text-signa-600 font-semibold">Alfabetul e complet la pragurile minime ✓</p>
          )}
        </div>
      )}
    </div>
  );
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

/* ── Colțuri ghid — se aprind când mâna e detectată ─────────────── */
function GuideFrame({ active }) {
  const cls = `w-7 h-7 transition-all duration-300
    ${active ? 'border-signa-400 opacity-100' : 'border-white/25 opacity-60'}`;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="w-52 h-64 relative">
        <div className={`absolute top-0 left-0    border-t-2 border-l-2 rounded-tl-xl ${cls}`} />
        <div className={`absolute top-0 right-0   border-t-2 border-r-2 rounded-tr-xl ${cls}`} />
        <div className={`absolute bottom-0 left-0  border-b-2 border-l-2 rounded-bl-xl ${cls}`} />
        <div className={`absolute bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl ${cls}`} />
      </div>
    </div>
  );
}

/* ── Card litera activă ─────────────────────────────────────────── */
function ActiveCard({ letter, count, isDone, isDynamic, onClear }) {
  const min = minFor(isDynamic);
  const progress = Math.min(count / min, 1);

  return (
    <div className="flex items-center gap-4 px-5 py-2.5 border-b border-ink-900/[0.06]">
      {/* Badge litera */}
      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
        font-black text-3xl transition-colors duration-300
        ${isDone ? 'bg-signa-50 text-signa-600'
                 : isDynamic ? 'bg-indigo-50 text-indigo-600' : 'bg-cream-100 text-ink-900'}`}>
        {letter}
        {isDynamic && (
          <svg className="absolute top-1.5 right-1.5" width="10" height="10" viewBox="0 0 8 8" fill="none">
            <path d="M1 4c1-2 2-2 3 0s2 2 3 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-ink-900 font-semibold text-sm tabular-nums">
            {count}
            <span className="text-ink-400 font-normal"> / {min}</span>
            {isDynamic && (
              <span className="text-indigo-500/80 font-normal text-xs ml-2">înregistrări</span>
            )}
          </span>
          <span className={`text-xs font-medium transition-colors duration-300
            ${isDone ? 'text-signa-600' : 'text-ink-400'}`}>
            {isDone ? '✓ Complet' : `${min - count} rămase`}
          </span>
        </div>
        <div className="h-1 bg-cream-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500
              ${isDone ? 'bg-signa-400' : isDynamic ? 'bg-indigo-400' : 'bg-amber-400'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Resetare */}
      {count > 0 && (
        <button
          onClick={onClear}
          className="text-ink-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Buton captură / înregistrare ──────────────────────────────── */
function CaptureBtn({
  onCapture, isHandDetected, letter, isDone, isDynamic,
  recording, recProgress, countdown, onCancelCountdown,
}) {
  const busy = recording || countdown > 0;
  const label = countdown > 0
    ? `Pregătește-te… ${countdown}`
    : recording
      ? 'Se înregistrează mișcarea…'
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
        className={`relative w-full py-[17px] rounded-2xl font-bold text-[15px] overflow-hidden
          transition-all duration-200 active:scale-[0.97] select-none
          ${countdown > 0
            ? 'bg-amber-500 text-white'
            : recording
              ? 'bg-indigo-600 text-white'
              : !isHandDetected && !isDynamic
                ? 'bg-cream-200 text-ink-400'
                : isDynamic
                  ? 'bg-indigo-500 text-white shadow-[0_6px_24px_rgba(99,102,241,0.3)]'
                  : isDone
                    ? 'bg-signa-600 text-white shadow-[0_6px_24px_rgba(5,150,105,0.3)]'
                    : 'bg-signa-500 text-white shadow-button'}`}
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
  const [flash,          setFlash]          = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [recProgress,    setRecProgress]    = useState(0);
  const [countdown,      setCountdown]      = useState(0);
  const [importMsg,      setImportMsg]      = useState('');

  const [mode, setMode] = useState(MODE.FOTO);

  const {
    activeLabel, setActiveLabel,
    capture, captureSequence, clearActiveLabel,
    importDataset, exportDataset,
    samplesFor, totalSamples, hasData, storageFull, labels,
  } = useDatasetCollector();

  const isDynamic = mode === MODE.VIDEO;

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
    setIsHandDetected(!!lm);
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
  }, []);

  /** Înregistrează SEQ_FRAMES cadre la interval fix (~1.5s de mișcare) */
  const startRecording = useCallback(() => {
    if (recTimerRef.current) return;
    // Fără mână la pornire: așteaptă scurt (user tocmai a ridicat ambele mâini)
    if (!latestLandmarksRef.current?.hands?.length) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      return;
    }

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
        stopRecording();
        if (captureSequence(frames)) {
          setFlash(true);
          setTimeout(() => setFlash(false), 110);
        }
      }
    }, SEQ_INTERVAL_MS);
  }, [captureSequence, stopRecording]);

  /** Video: countdown 3-2-1, apoi captură — timp să ridici ambele mâini */
  const startCountdown = useCallback(() => {
    if (countdownRef.current || recTimerRef.current) return;

    setCountdown(COUNTDOWN_SEC);
    let left = COUNTDOWN_SEC;
    countdownRef.current = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        setCountdown(0);
        startRecording();
        return;
      }
      setCountdown(left);
    }, 1000);
  }, [startRecording]);

  const handleCapture = useCallback(() => {
    if (isDynamic) {
      startCountdown();
      return;
    }
    if (!capture(latestLandmarksRef.current)) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 110);
  }, [isDynamic, capture, startCountdown]);

  // Schimbarea etichetei/modului sau părăsirea paginii anulează înregistrarea
  useEffect(() => stopRecording, [activeLabel, mode, stopRecording]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (countdown > 0 || recording) return;
        handleCapture();
      }
      if (e.code === 'Escape') stopRecording();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCapture, countdown, recording, stopRecording]);

  const count  = samplesFor(activeLabel);
  const isDone = count >= minFor(isDynamic);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">

      {/* ── Camera ── */}
      <div className="relative flex-1 overflow-hidden">
        <HandTracker onLandmarks={handleLandmarks} />

        {/* Flash captură */}
        {flash && (
          <div className="absolute inset-0 bg-white/12 pointer-events-none z-20" />
        )}

        {/* Border glow: verde = mână detectată, violet = înregistrare */}
        {isHandDetected && (
          <div className={`absolute inset-0 pointer-events-none z-10
            ${recording
              ? 'shadow-[inset_0_0_0_3px_rgba(129,140,248,0.7)]'
              : 'shadow-[inset_0_0_0_2px_rgba(52,211,153,0.45)]'}`} />
        )}

        {/* Countdown — timp să ridici ambele mâini înainte de captură */}
        {countdown > 0 && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none
            bg-black/35 animate-fade-in">
            <span className="text-white font-black tabular-nums leading-none"
              style={{ fontSize: 'clamp(72px, 22vw, 120px)', textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              {countdown}
            </span>
            <p className="mt-3 text-white/90 text-sm font-semibold px-6 text-center">
              Ridică ambele mâini — captura începe la 0
            </p>
          </div>
        )}

        {/* Confirmare import/export */}
        {importMsg && !recording && (
          <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none animate-fade-in">
            <span className={`bg-black/70 px-3.5 py-1.5 rounded-full text-xs font-semibold
              ${importMsg.startsWith('✗') ? 'text-red-300' : 'text-white'}`}>
              {importMsg}
            </span>
          </div>
        )}

        {/* Indicator REC */}
        {recording && (
          <div className="absolute top-16 left-0 right-0 z-20 flex justify-center pointer-events-none">
            <span className="flex items-center gap-2 bg-black/60 px-3.5 py-1.5 rounded-full
              text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Fă mișcarea acum
            </span>
          </div>
        )}

        {/* Gradienți sus/jos */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-cream to-transparent pointer-events-none z-10" />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/70 hover:text-white
              text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Înapoi
          </button>

          <span className="text-white/40 text-xs tabular-nums">
            {totalSamples} exemple
          </span>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer
              text-white/60 border border-white/15 hover:text-white hover:border-white/30
              transition-all">
              Import
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>

            <button
              onClick={exportDataset}
              disabled={!hasData}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all
                ${hasData
                  ? 'bg-signa-500/20 text-signa-400 border border-signa-500/25 hover:bg-signa-500/30'
                  : 'text-slate-700 cursor-not-allowed'}`}
            >
              Export
            </button>
          </div>
        </div>

        {/* Colțuri ghid */}
        <GuideFrame active={isHandDetected} />

        {/* Eticheta activă — fantomă pe cameră */}
        <div className="absolute top-16 right-3 z-10 pointer-events-none select-none">
          <span className="font-black text-white/[0.07] leading-none"
                style={{ fontSize: activeLabel.length > 2 ? 'clamp(36px, 12vw, 72px)' : 'clamp(90px, 26vw, 160px)' }}>
            {activeLabel}
          </span>
        </div>
      </div>

      {/* ── Panou inferior ── */}
      <div className="flex-shrink-0 bg-white border-t border-ink-900/[0.06] shadow-soft max-h-[48%] overflow-y-auto scrollbar-hide">

        {/* Cuvânt/literă introdus manual + mod captură */}
        <WordInput value={activeLabel} onChange={setActiveLabel} mode={mode} onModeChange={setMode} />

        {/* Card etichetă activă */}
        <ActiveCard
          letter={activeLabel}
          count={count}
          isDone={isDone}
          isDynamic={isDynamic}
          onClear={clearActiveLabel}
        />

        {/* Selector litere alfabet — completează rapid câmpul de text */}
        <LetterSelector
          activeLetter={activeLabel}
          onSelect={handleSelectLetter}
          samplesFor={samplesFor}
        />

        <DatasetOverview samplesFor={samplesFor} labels={labels} />

        {/* Captură */}
        <div className="px-4 pb-5 pt-1">
          <CaptureBtn
            onCapture={handleCapture}
            isHandDetected={isHandDetected}
            letter={activeLabel}
            isDone={isDone}
            isDynamic={isDynamic}
            recording={recording}
            recProgress={recProgress}
            countdown={countdown}
            onCancelCountdown={stopRecording}
          />
          <p className="text-center text-ink-400 text-xs mt-2.5">
            {isDynamic
              ? <>Video: apeși → countdown {COUNTDOWN_SEC}s → mișcarea (~1.5s). <kbd className="bg-cream-100 text-ink-500 px-1.5 py-0.5 rounded text-[10px]">Spațiu</kbd> / <kbd className="bg-cream-100 text-ink-500 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd></>
              : <>sau apasă <kbd className="bg-cream-100 text-ink-500 px-1.5 py-0.5 rounded text-[10px]">Spațiu</kbd></>}
          </p>
          {storageFull && (
            <p className="text-center text-amber-600 text-xs mt-2 font-medium">
              Spațiul local e plin — datele noi rămân doar în memorie. Exportă acum!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
