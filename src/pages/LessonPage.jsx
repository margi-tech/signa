import { useRef, useState, useCallback, useEffect } from 'react';
import HandTracker from '../components/hand-tracker';
import ReferenceHand from '../components/lesson/ReferenceHand';
import { useClassifier } from '../hooks/useClassifier';
import { useProgress } from '../hooks/useProgress';
import { XP_PER_LETTER, XP_PERFECT_BONUS, HOLD_DURATION_MS } from '../data/lessons';
import REFERENCE_POSES from '../data/reference-poses.json';

// Predicția trebuie să fie măcar atât de sigură ca să conteze la validare
const MIN_CONFIDENCE = 0.7;

/* ── Puncte de progres per literă ───────────────────────────────── */
function LetterDots({ letters, idx, skipped }) {
  return (
    <div className="flex gap-1.5">
      {letters.map((l, i) => (
        <div key={l} className={`w-2 h-2 rounded-full transition-colors duration-300
          ${i === idx
            ? 'bg-white'
            : i < idx
              ? skipped.includes(l) ? 'bg-amber-400' : 'bg-signa-400'
              : 'bg-slate-700'}`}
        />
      ))}
    </div>
  );
}

/* ── Ecranul de rezultate ───────────────────────────────────────── */
function ResultsScreen({ lesson, skipped, xpGained, stars, onExit, onRetry }) {
  return (
    <div className="h-full bg-[#070b10] flex flex-col items-center justify-center px-8 animate-fade-up">
      {/* Stele */}
      <div className="flex gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <svg key={i} width="44" height="44" viewBox="0 0 24 24"
            className={i < stars ? 'animate-scale-in' : ''}
            style={{ animationDelay: `${i * 150}ms` }}
            fill={i < stars ? '#fbbf24' : 'rgba(255,255,255,0.07)'}>
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>
          </svg>
        ))}
      </div>

      <h1 className="text-white text-2xl font-black mb-1">
        {stars === 3 ? 'Perfect!' : stars === 2 ? 'Foarte bine!' : 'Lecție completată'}
      </h1>
      <p className="text-signa-400 font-bold text-lg mb-6">+{xpGained} XP</p>

      {/* Recap litere */}
      <div className="flex gap-2 mb-10">
        {lesson.letters.map((l) => {
          const wasSkipped = skipped.includes(l);
          return (
            <div key={l} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold
              ${wasSkipped ? 'bg-amber-500/15 text-amber-400' : 'bg-signa-500/15 text-signa-400'}`}>
              {l}
            </div>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <p className="text-slate-600 text-xs -mt-7 mb-8">
          {skipped.join(', ')} — de repetat
        </p>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onExit}
          className="w-full py-4 bg-signa-500 text-white font-bold rounded-2xl
            shadow-[0_6px_24px_rgba(16,185,129,0.25)] active:scale-[0.97] transition-transform"
        >
          Continuă
        </button>
        <button
          onClick={onRetry}
          className="w-full py-3 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors"
        >
          Repetă lecția
        </button>
      </div>
    </div>
  );
}

/* ── Pagina ─────────────────────────────────────────────────────── */
export default function LessonPage({ lesson, onExit }) {
  const [idx,      setIdx]      = useState(0);
  const [holdPct,  setHoldPct]  = useState(0);
  const [phase,    setPhase]    = useState('active'); // active | success | results
  const [skipped,  setSkipped]  = useState([]);
  const [detected, setDetected] = useState(null);

  const lastTickRef  = useRef(0);
  const holdMsRef    = useRef(0);
  const targetRef    = useRef(lesson.letters[0]);
  const phaseRef     = useRef('active');
  const isReadyRef   = useRef(false);
  const predictRef   = useRef(null);
  const timeoutRef   = useRef(null);
  const recordedRef  = useRef(false);

  const { isReady, predict } = useClassifier();
  const { completeLesson }   = useProgress();
  isReadyRef.current = isReady;
  predictRef.current = predict;

  const target = lesson.letters[idx];
  targetRef.current = target;
  phaseRef.current  = phase;

  /* Avansează la litera următoare sau la rezultate */
  const advance = useCallback((didSkip) => {
    if (didSkip) setSkipped((prev) => [...prev, targetRef.current]);
    holdMsRef.current = 0;
    setHoldPct(0);
    setDetected(null);

    setIdx((prev) => {
      if (prev + 1 >= lesson.letters.length) {
        setPhase('results');
        return prev;
      }
      setPhase('active');
      return prev + 1;
    });
  }, [lesson.letters.length]);

  /* Bucla de validare — throttle 12fps, hold-to-confirm */
  const handleLandmarks = useCallback((lm) => {
    if (phaseRef.current !== 'active') return;

    const now = performance.now();
    const elapsed = now - lastTickRef.current;
    if (elapsed < 80) return;
    lastTickRef.current = now;

    if (!lm?.[0] || !isReadyRef.current) {
      setDetected(null);
      return; // fără mână — progresul îngheață, nu se pierde
    }

    const p = predictRef.current(lm[0]);
    if (!p) return;
    setDetected(p.label);

    const isMatch = p.label === targetRef.current && p.confidence >= MIN_CONFIDENCE;
    const step = Math.min(elapsed, 200); // protecție la tab-switch
    holdMsRef.current = isMatch
      ? holdMsRef.current + step
      : Math.max(0, holdMsRef.current - step * 2);

    setHoldPct(Math.min(holdMsRef.current / HOLD_DURATION_MS, 1));

    if (holdMsRef.current >= HOLD_DURATION_MS) {
      phaseRef.current = 'success';
      setPhase('success');
    }
  }, []);

  /* Succes → pauză scurtă cu feedback, apoi avans */
  useEffect(() => {
    if (phase !== 'success') return;
    timeoutRef.current = setTimeout(() => advance(false), 900);
    return () => clearTimeout(timeoutRef.current);
  }, [phase, advance]);

  /* Rezultate → înregistrează progresul o singură dată */
  useEffect(() => {
    if (phase !== 'results' || recordedRef.current) return;
    recordedRef.current = true;

    const done  = lesson.letters.length - skipped.length;
    const stars = skipped.length === 0 ? 3 : skipped.length === 1 ? 2 : 1;
    const xp    = done * XP_PER_LETTER + (skipped.length === 0 ? XP_PERFECT_BONUS : 0);
    completeLesson(lesson.id, stars, xp);
  }, [phase, skipped, lesson, completeLesson]);

  if (phase === 'results') {
    const done  = lesson.letters.length - skipped.length;
    const stars = skipped.length === 0 ? 3 : skipped.length === 1 ? 2 : 1;
    const xp    = done * XP_PER_LETTER + (skipped.length === 0 ? XP_PERFECT_BONUS : 0);
    return (
      <ResultsScreen
        lesson={lesson} skipped={skipped} xpGained={xp} stars={stars}
        onExit={onExit}
        onRetry={() => {
          recordedRef.current = false;
          holdMsRef.current = 0;
          setSkipped([]); setIdx(0); setHoldPct(0); setPhase('active');
        }}
      />
    );
  }

  const isSuccess = phase === 'success';

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Camera ── */}
      <div className="relative flex-1 overflow-hidden">
        <HandTracker onLandmarks={handleLandmarks} />

        {/* Gradienți */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-10" />

        {/* Glow verde pe măsură ce progresezi */}
        {holdPct > 0 && !isSuccess && (
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity"
            style={{ boxShadow: `inset 0 0 0 3px rgba(52,211,153,${0.2 + holdPct * 0.6})` }}
          />
        )}

        {/* Flash succes */}
        {isSuccess && (
          <div className="absolute inset-0 z-20 bg-signa-500/15 flex items-center justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-signa-500 flex items-center justify-center animate-scale-in
              shadow-[0_0_60px_rgba(52,211,153,0.5)]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ieși
          </button>

          <span className="text-white/60 text-xs font-semibold tracking-wider">{lesson.title}</span>

          <LetterDots letters={lesson.letters} idx={idx} skipped={skipped} />
        </div>

        {/* Ce vede modelul (feedback discret) */}
        {detected && detected !== target && !isSuccess && (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
            <span className="text-white/40 text-xs bg-black/40 px-3 py-1 rounded-full">
              Văd: <span className="font-bold text-white/70">{detected}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Panoul cu ținta ── */}
      <div className="flex-shrink-0 bg-slate-950 px-5 pt-4 pb-8">
        <div className="flex items-center gap-4 mb-4">
          {/* Litera țintă */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
            font-black text-4xl transition-colors duration-300
            ${isSuccess ? 'bg-signa-500/25 text-signa-400' : 'bg-slate-800 text-white'}`}>
            {target}
          </div>

          {/* Referința — scheletul semnului */}
          <div className="w-16 h-16 bg-slate-900 rounded-2xl p-1 flex-shrink-0">
            <ReferenceHand pose={REFERENCE_POSES[target]} className="w-full h-full" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm mb-0.5">
              Fă semnul „{target}"
            </p>
            <p className="text-slate-600 text-xs">
              și ține-l până se umple bara
            </p>
          </div>
        </div>

        {/* Bara de menținere */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-100
              ${isSuccess ? 'bg-signa-400' : holdPct > 0 ? 'bg-signa-500' : 'bg-transparent'}`}
            style={{ width: `${holdPct * 100}%` }}
          />
        </div>

        {/* Sari peste */}
        <button
          onClick={() => advance(true)}
          className="w-full py-2 text-slate-600 hover:text-slate-400 text-xs font-medium transition-colors"
        >
          Sari peste litera asta →
        </button>
      </div>
    </div>
  );
}
