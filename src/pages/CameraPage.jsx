import { useRef, useState, useCallback } from 'react';
import HandTracker from '../components/hand-tracker';
import PredictionOverlay from '../components/prediction/PredictionOverlay';
import { useClassifier } from '../hooks/useClassifier';
import { normalize } from '../utils/normalize';
import { SEQ_FRAMES, SEQ_INTERVAL_MS } from '../data/lsr-alphabet';

// Detectorul de mișcare: deplasarea medie a punctelor (coordonate brute imagine)
const MOTION_WINDOW    = 8;      // câte cadre intră în media mișcării
const MOTION_THRESHOLD = 0.008;  // peste = mâna se mișcă (semn dinamic)
const DYN_MIN_CONF     = 0.6;    // confidence minim pentru un semn dinamic
const DYN_HOLD_MS      = 1500;   // cât rămâne afișat semnul dinamic după mișcare

export default function CameraPage({ onBack }) {
  const lastTickRef  = useRef(0);
  const isReadyRef   = useRef(false);
  const isDynRef     = useRef(false);
  const predictRef   = useRef(null);
  const predictSeqRef= useRef(null);
  const debugRef     = useRef(false);
  const seqBufRef    = useRef([]);   // ultimele SEQ_FRAMES cadre normalizate
  const prevRawRef   = useRef(null); // cadrul brut anterior (pentru mișcare)
  const motionBufRef = useRef([]);   // deplasările recente per cadru
  const lastDynRef   = useRef({ p: null, t: 0 });

  const [prediction, setPrediction] = useState(null);
  const [debug,      setDebug]      = useState(false);
  const [debugInfo,  setDebugInfo]  = useState(null);

  const { isReady, isDynReady, predict, predictSequence } = useClassifier();
  // Refs stabili — nu recreează handleLandmarks la fiecare schimbare
  isReadyRef.current    = isReady;
  isDynRef.current      = isDynReady;
  predictRef.current    = predict;
  predictSeqRef.current = predictSequence;
  debugRef.current      = debug;

  // Un tick la SEQ_INTERVAL_MS (~20fps) — același ritm ca la colectarea secvențelor
  const handleLandmarks = useCallback((lm) => {
    const now = performance.now();
    if (now - lastTickRef.current < SEQ_INTERVAL_MS) return;
    lastTickRef.current = now;

    if (!lm?.[0] || !isReadyRef.current) {
      seqBufRef.current = [];
      motionBufRef.current = [];
      prevRawRef.current = null;
      setPrediction(null);
      if (debugRef.current) setDebugInfo(null);
      return;
    }

    const hand = lm[0];

    // — Mișcarea: deplasarea medie a punctelor față de cadrul anterior —
    const prev = prevRawRef.current;
    if (prev) {
      let disp = 0;
      for (let i = 0; i < 21; i++) {
        disp += Math.hypot(hand[i].x - prev[i].x, hand[i].y - prev[i].y);
      }
      motionBufRef.current.push(disp / 21);
      if (motionBufRef.current.length > MOTION_WINDOW) motionBufRef.current.shift();
    }
    prevRawRef.current = hand.map(({ x, y }) => ({ x, y }));

    const motion = motionBufRef.current.length
      ? motionBufRef.current.reduce((s, v) => s + v, 0) / motionBufRef.current.length
      : 0;
    const isMoving = motion > MOTION_THRESHOLD;

    // — Bufferul de secvență (cadre normalizate, ritm fix) —
    const vector = normalize(hand);
    if (vector) {
      seqBufRef.current.push(vector);
      if (seqBufRef.current.length > SEQ_FRAMES) seqBufRef.current.shift();
    }

    // — Predicție combinată —
    let dynP = null;
    if (isMoving && isDynRef.current && seqBufRef.current.length === SEQ_FRAMES) {
      dynP = predictSeqRef.current(seqBufRef.current);
      if (dynP && dynP.confidence >= DYN_MIN_CONF) {
        lastDynRef.current = { p: { ...dynP, dynamic: true }, t: now };
      }
    }

    const staticP = predictRef.current(hand);

    let shown = null;
    if (lastDynRef.current.p && now - lastDynRef.current.t < DYN_HOLD_MS) {
      // Un semn dinamic recent are prioritate — rămâne afișat scurt după mișcare
      shown = lastDynRef.current.p;
    } else if (!isMoving) {
      shown = staticP;
    }
    setPrediction(shown);

    if (debugRef.current) {
      const src = dynP ?? staticP;
      setDebugInfo(src ? { ...src, motion, isMoving, fromDyn: !!dynP } : null);
    }
  }, []); // referință stabilă — HandTracker îl primește o singură dată

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Înapoi
        </button>

        <h1 className="text-white text-base font-bold tracking-[0.2em]">SIGNA</h1>

        {/* Indicator modele active + toggle debug */}
        <div className="w-24 flex justify-end">
          {isReady && (
            <button
              onClick={() => setDebug((d) => !d)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors
                ${debug ? 'text-amber-400' : 'text-signa-400'}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse
                ${debug ? 'bg-amber-400' : 'bg-signa-400'}`} />
              {debug ? 'Debug' : isDynReady ? 'AI + mișcare' : 'AI activ'}
            </button>
          )}
        </div>
      </header>

      {/* Panou debug — predicțiile brute + mișcarea */}
      {debug && (
        <div className="absolute top-16 left-4 z-20 bg-black/70 rounded-xl p-3 w-48
          font-mono text-[11px] space-y-1.5 pointer-events-none">
          {debugInfo ? (
            <>
              {debugInfo.top3.map(({ label, p }, i) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-5 font-bold ${i === 0 ? 'text-white' : 'text-slate-500'}`}>
                    {label}
                  </span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={i === 0
                        ? debugInfo.fromDyn ? 'h-full bg-indigo-400' : 'h-full bg-signa-400'
                        : 'h-full bg-slate-500'}
                      style={{ width: `${p * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-400 w-9 text-right tabular-nums">
                    {(p * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t border-white/10 flex justify-between text-slate-500">
                <span>mișcare</span>
                <span className={debugInfo.isMoving ? 'text-indigo-400' : 'text-slate-400'}>
                  {(debugInfo.motion * 1000).toFixed(1)}
                  {debugInfo.isMoving ? ' ●' : ''}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>model</span>
                <span className={debugInfo.fromDyn ? 'text-indigo-400' : 'text-signa-400'}>
                  {debugInfo.fromDyn ? 'mișcare' : 'static'}
                </span>
              </div>
            </>
          ) : (
            <span className="text-slate-500">fără mână</span>
          )}
        </div>
      )}

      {/* Camera + hand tracking */}
      <HandTracker onLandmarks={handleLandmarks} />

      {/* Predicție */}
      <PredictionOverlay prediction={prediction} />

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 py-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
