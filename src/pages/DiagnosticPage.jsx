import { useRef, useState } from 'react';
import HandTracker from '../components/hand-tracker';
import { useClassifier } from '../hooks/useClassifier';
import { VECTOR_SIZE } from '../utils/normalize';
import { SEQ_FRAMES } from '../data/lsr-alphabet';

/**
 * Pagină de diagnostic pe teren — model, FPS, cameră, UA.
 */
export default function DiagnosticPage({ onBack }) {
  const [fps, setFps] = useState(0);
  const [frames, setFrames] = useState(0);
  const [lastSubject, setLastSubject] = useState(null);
  const [mpHint, setMpHint] = useState('se încarcă…');
  const ticksRef = useRef([]);
  const { isReady, isDynReady } = useClassifier();

  const onLandmarks = (lm) => {
    const now = performance.now();
    ticksRef.current.push(now);
    ticksRef.current = ticksRef.current.filter((t) => now - t < 1000);
    setFps(ticksRef.current.length);
    setFrames((n) => n + 1);
    setLastSubject(lm);
    setMpHint('gata');
  };

  const row = (label, value, ok) => (
    <div className="flex items-center justify-between py-2.5 border-b border-ink-900/[0.05]">
      <span className="text-ink-500 text-xs font-medium">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${
        ok === true ? 'text-signa-600' : ok === false ? 'text-red-500' : 'text-ink-700'
      }`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">DIAGNOSTIC</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8 space-y-4">
        <div className="bg-white rounded-2xl shadow-card px-4 py-1">
          {row('Model static', isReady ? 'încărcat' : 'lipsă', isReady)}
          {row('Model dinamic (GRU)', isDynReady ? 'încărcat' : 'lipsă', isDynReady)}
          {row('MediaPipe', mpHint, mpHint === 'gata')}
          {row('VECTOR_SIZE', String(VECTOR_SIZE), true)}
          {row('SEQ_FRAMES', String(SEQ_FRAMES), true)}
          {row('FPS detecție', String(fps), fps >= 10)}
          {row('Cadre procesate', String(frames), null)}
          {row('Față (landmarks)', lastSubject?.faceLandmarks ? 'da' : 'nu', !!lastSubject?.faceLandmarks)}
          {row('Față (blendshapes)', lastSubject?.faceBlendshapes ? 'da' : 'nu', !!lastSubject?.faceBlendshapes)}
          {row('Trunchi (pose)', lastSubject?.pose ? 'da' : 'nu', !!lastSubject?.pose)}
          {row('Mâini', String(lastSubject?.hands?.length ?? 0), (lastSubject?.hands?.length ?? 0) > 0)}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-4">
          <p className="text-ink-500 text-[10px] font-semibold tracking-[0.18em] uppercase mb-2">User Agent</p>
          <p className="text-ink-700 text-[11px] leading-relaxed break-all font-mono">
            {typeof navigator !== 'undefined' ? navigator.userAgent : '—'}
          </p>
        </div>

        <div className="h-48 rounded-2xl overflow-hidden shadow-card relative bg-ink-900">
          <HandTracker onLandmarks={onLandmarks} requireFaceFrame={false} />
        </div>

        <p className="text-ink-400 text-[11px] leading-relaxed text-center px-2">
          Modelele lipsă = copiază fișierele din TrainPage în{' '}
          <code className="text-ink-600">public/models/</code>. Vezi docs/retrain.md.
        </p>
      </div>
    </div>
  );
}
