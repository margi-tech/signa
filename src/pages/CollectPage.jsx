import { useRef, useState, useEffect, useCallback } from 'react';
import HandTracker from '../components/hand-tracker';
import LetterSelector from '../components/collect/LetterSelector';
import { useDatasetCollector } from '../hooks/useDatasetCollector';
import { DYNAMIC_LETTERS, SEQ_FRAMES, SEQ_INTERVAL_MS, minFor } from '../data/lsr-alphabet';

const MODE = { FOTO: 'foto', VIDEO: 'video' };

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
        className="flex-1 min-w-0 bg-slate-900 border border-white/[0.08] rounded-xl px-3.5 py-2
          text-white text-sm font-semibold placeholder:text-slate-600 placeholder:font-normal
          focus:outline-none focus:border-signa-500/50 transition-colors"
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
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-signa-500/20 text-signa-400 border border-signa-500/40'
              : 'bg-slate-900 text-slate-500 border border-transparent hover:text-slate-400'}`}
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
    <div className="flex items-center gap-4 px-5 py-2.5 border-b border-white/[0.06]">
      {/* Badge litera */}
      <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
        font-black text-3xl transition-colors duration-300
        ${isDone ? 'bg-signa-500/20 text-signa-400'
                 : isDynamic ? 'bg-indigo-500/15 text-indigo-300' : 'bg-slate-800 text-white'}`}>
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
          <span className="text-white font-semibold text-sm tabular-nums">
            {count}
            <span className="text-slate-600 font-normal"> / {min}</span>
            {isDynamic && (
              <span className="text-indigo-400/70 font-normal text-xs ml-2">înregistrări</span>
            )}
          </span>
          <span className={`text-xs font-medium transition-colors duration-300
            ${isDone ? 'text-signa-400' : 'text-slate-600'}`}>
            {isDone ? '✓ Complet' : `${min - count} rămase`}
          </span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
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
          className="text-slate-700 hover:text-red-400 transition-colors p-1 flex-shrink-0"
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
function CaptureBtn({ onCapture, isHandDetected, letter, isDone, isDynamic, recording, recProgress }) {
  const label = !isHandDetected
    ? 'Ridică mâna în față camerei'
    : recording
      ? 'Se înregistrează mișcarea…'
      : isDynamic
        ? isDone ? `✓ ${letter} complet — mai înregistrează` : `● Înregistrează  ${letter}`
        : isDone ? `✓ ${letter} complet — mai adaugă` : `Capturează  ${letter}`;

  return (
    <button
      onPointerDown={onCapture}
      disabled={recording}
      className={`relative w-full py-[17px] rounded-2xl font-bold text-[15px] overflow-hidden
        transition-all duration-200 active:scale-[0.97] select-none
        ${!isHandDetected
          ? 'bg-slate-800 text-slate-600'
          : recording
            ? 'bg-indigo-600 text-white'
            : isDynamic
              ? 'bg-indigo-500 text-white shadow-[0_6px_24px_rgba(99,102,241,0.3)]'
              : isDone
                ? 'bg-signa-600 text-white shadow-[0_6px_24px_rgba(5,150,105,0.3)]'
                : 'bg-signa-500 text-white shadow-[0_6px_24px_rgba(16,185,129,0.28)]'}`}
    >
      {/* Umplere progres în timpul înregistrării */}
      {recording && (
        <span
          className="absolute inset-y-0 left-0 bg-white/20 transition-all duration-75"
          style={{ width: `${recProgress * 100}%` }}
        />
      )}
      <span className="relative">{label}</span>
    </button>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────── */
export default function CollectPage({ onBack }) {
  const latestLandmarksRef = useRef(null);
  const recTimerRef        = useRef(null);
  const [flash,          setFlash]          = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [recording,      setRecording]      = useState(false);
  const [recProgress,    setRecProgress]    = useState(0);

  const [mode, setMode] = useState(MODE.FOTO);

  const {
    activeLabel, setActiveLabel,
    capture, captureSequence, clearActiveLabel,
    importDataset, exportDataset,
    samplesFor, totalSamples, hasData, storageFull,
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
      await importDataset(file);
    } catch {
      // JSON invalid — ignorăm silențios
    }
  }, [importDataset]);

  const handleLandmarks = useCallback((lm) => {
    latestLandmarksRef.current = lm;
    setIsHandDetected(!!lm);
  }, []);

  /** Oprește orice înregistrare în curs (anulare sau cleanup) */
  const stopRecording = useCallback(() => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setRecording(false);
    setRecProgress(0);
  }, []);

  /** Înregistrează SEQ_FRAMES cadre la interval fix (~1.5s de mișcare) */
  const startRecording = useCallback(() => {
    if (recTimerRef.current || !latestLandmarksRef.current?.[0]) return;

    const frames = [];
    setRecording(true);
    setRecProgress(0);

    recTimerRef.current = setInterval(() => {
      const lm = latestLandmarksRef.current?.[0];
      if (!lm) {
        // Mâna a ieșit din cadru — înregistrarea se anulează
        stopRecording();
        return;
      }
      // Clonăm punctele — MediaPipe poate refolosi structurile intern
      frames.push(lm.map(({ x, y, z }) => ({ x, y, z })));
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

  const handleCapture = useCallback(() => {
    if (isDynamic) {
      startRecording();
      return;
    }
    if (!capture(latestLandmarksRef.current)) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 110);
  }, [isDynamic, capture, startRecording]);

  // Schimbarea etichetei/modului sau părăsirea paginii anulează înregistrarea
  useEffect(() => stopRecording, [activeLabel, mode, stopRecording]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handleCapture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCapture]);

  const count  = samplesFor(activeLabel);
  const isDone = count >= minFor(isDynamic);

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">

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
        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10" />

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
      <div className="flex-shrink-0 bg-slate-950">

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
          />
          <p className="text-center text-slate-700 text-xs mt-2.5">
            {isDynamic
              ? <>apasă și fă mișcarea în ~1.5 secunde — sau folosește <kbd className="bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">Spațiu</kbd></>
              : <>sau apasă <kbd className="bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">Spațiu</kbd></>}
          </p>
          {storageFull && (
            <p className="text-center text-amber-400/90 text-xs mt-2">
              ⚠ Spațiul local e plin — datele noi rămân doar în memorie. Exportă acum!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
