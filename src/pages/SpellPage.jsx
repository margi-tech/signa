import { useRef, useState, useCallback, useEffect } from 'react';
import HandTracker from '../components/hand-tracker';
import ReferenceHand from '../components/lesson/ReferenceHand';
import Confetti from '../components/ui/Confetti';
import { useClassifier } from '../hooks/useClassifier';
import { useProgress } from '../hooks/useProgress';
import { HOLD_DURATION_MS } from '../data/lessons';
import { DEMO_WORDS, ALL_WORDS } from '../data/words';
import REFERENCE_POSES from '../data/reference-poses.json';
import { playSuccess, playSkip } from '../utils/sounds';

const MIN_CONFIDENCE = 0.7;

function pickWord(preferDemo = true) {
  const pool = preferDemo && DEMO_WORDS.length ? DEMO_WORDS : ALL_WORDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Provocarea „Scrie cuvântul" — dactilezi literă cu literă.
 * MVP din ARHITECTURA.md §4.1.
 */
export default function SpellPage({ onBack, wordId }) {
  const [word, setWord] = useState(() => {
    if (wordId) return ALL_WORDS.find((w) => w.id === wordId) ?? pickWord();
    return pickWord();
  });
  const [idx, setIdx] = useState(0);
  const [holdPct, setHoldPct] = useState(0);
  const [phase, setPhase] = useState('active'); // active | success | done
  const [skipped, setSkipped] = useState([]);
  const [detected, setDetected] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const lastTickRef = useRef(0);
  const holdMsRef = useRef(0);
  const targetRef = useRef(word.letters[0]);
  const phaseRef = useRef('active');
  const isReadyRef = useRef(false);
  const predictRef = useRef(null);

  const { isReady, predict } = useClassifier();
  const { recordPractice, recordLetter, soundEnabled } = useProgress();
  isReadyRef.current = isReady;
  predictRef.current = predict;

  const target = word.letters[idx];
  targetRef.current = target;
  phaseRef.current = phase;

  const advance = useCallback((didSkip) => {
    if (didSkip) {
      setSkipped((p) => [...p, targetRef.current]);
      recordLetter(targetRef.current, false);
      playSkip(soundEnabled);
    } else {
      recordLetter(targetRef.current, true);
      playSuccess(soundEnabled);
    }
    holdMsRef.current = 0;
    setHoldPct(0);
    setDetected(null);

    setIdx((prev) => {
      if (prev + 1 >= word.letters.length) {
        setPhase('done');
        setShowConfetti(true);
        recordPractice();
        return prev;
      }
      setPhase('active');
      return prev + 1;
    });
  }, [word.letters.length, recordLetter, recordPractice, soundEnabled]);

  const handleLandmarks = useCallback((lm) => {
    if (phaseRef.current !== 'active') return;
    const now = performance.now();
    const elapsed = now - lastTickRef.current;
    if (elapsed < 80) return;
    lastTickRef.current = now;

    if (!lm?.hands?.length || !isReadyRef.current) {
      setDetected(null);
      return;
    }

    const p = predictRef.current(lm);
    if (!p) return;
    setDetected(p.label);

    const isMatch = p.label === targetRef.current && p.confidence >= MIN_CONFIDENCE;
    const step = Math.min(elapsed, 200);
    holdMsRef.current = isMatch
      ? holdMsRef.current + step
      : Math.max(0, holdMsRef.current - step * 2);
    setHoldPct(Math.min(holdMsRef.current / HOLD_DURATION_MS, 1));

    if (holdMsRef.current >= HOLD_DURATION_MS) {
      phaseRef.current = 'success';
      setPhase('success');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'success') return;
    const t = setTimeout(() => advance(false), 700);
    return () => clearTimeout(t);
  }, [phase, advance]);

  if (phase === 'done') {
    const ok = word.letters.length - skipped.length;
    return (
      <div className="h-full bg-cream flex flex-col items-center justify-center px-8 animate-fade-up">
        <Confetti active={showConfetti} />
        <p className="text-signa-600 text-xs font-bold tracking-[0.2em] uppercase mb-2">Cuvânt scris</p>
        <h1 className="text-ink-900 text-3xl font-black mb-2">{word.label}</h1>
        <p className="text-ink-500 text-sm mb-8">{ok}/{word.letters.length} litere corecte</p>
        <div className="flex gap-1.5 mb-10 flex-wrap justify-center">
          {word.letters.map((l, i) => (
            <span
              key={`${l}-${i}`}
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
                ${skipped.includes(l) ? 'bg-amber-100 text-amber-600' : 'bg-signa-50 text-signa-600'}`}
            >
              {l}
            </span>
          ))}
        </div>
        <button
          onClick={() => {
            const next = pickWord();
            setWord(next);
            setIdx(0);
            setSkipped([]);
            setPhase('active');
            setShowConfetti(false);
            holdMsRef.current = 0;
          }}
          className="w-full max-w-xs py-4 bg-signa-500 text-white font-bold rounded-2xl shadow-button
            active:scale-[0.97] transition-transform mb-3"
        >
          Alt cuvânt
        </button>
        <button onClick={onBack} className="text-ink-500 text-sm font-medium hover:text-ink-700">
          Înapoi acasă
        </button>
      </div>
    );
  }

  const isSuccess = phase === 'success';

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="relative flex-1 overflow-hidden">
        <HandTracker onLandmarks={handleLandmarks} />
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-cream to-transparent pointer-events-none z-10" />

        {holdPct > 0 && !isSuccess && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: `inset 0 0 0 3px rgba(52,211,153,${0.2 + holdPct * 0.6})` }}
          />
        )}

        {isSuccess && (
          <div className="absolute inset-0 z-20 bg-signa-500/15 flex items-center justify-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-signa-500 flex items-center justify-center animate-scale-in">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-4">
          <button onClick={onBack} className="text-white/70 hover:text-white text-sm font-medium">
            ← Ieși
          </button>
          <span className="text-white font-bold tracking-wide">{word.label}</span>
          <span className="text-white/60 text-xs tabular-nums">{idx + 1}/{word.letters.length}</span>
        </div>

        {/* Progres litere */}
        <div className="absolute top-14 inset-x-0 z-20 flex justify-center gap-1 px-4">
          {word.letters.map((l, i) => (
            <span
              key={`${l}-${i}`}
              className={`min-w-[1.5rem] h-6 px-1 rounded-md text-[11px] font-bold flex items-center justify-center
                ${i === idx ? 'bg-white text-ink-900' : i < idx ? 'bg-signa-500/90 text-white' : 'bg-black/35 text-white/50'}`}
            >
              {l}
            </span>
          ))}
        </div>

        {detected && detected !== target && !isSuccess && (
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
            <span className="text-white/40 text-xs bg-black/40 px-3 py-1 rounded-full">
              Văd: <span className="font-bold text-white/70">{detected}</span>
            </span>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 bg-white border-t border-ink-900/[0.06] px-5 pt-4 pb-8 shadow-soft">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0
            font-black text-4xl ${isSuccess ? 'bg-signa-50 text-signa-600' : 'bg-cream-100 text-ink-900'}`}>
            {target}
          </div>
          <div className="w-16 h-16 bg-cream-100 rounded-2xl p-1 flex-shrink-0">
            <ReferenceHand pose={REFERENCE_POSES[target]} className="w-full h-full" theme="light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink-900 font-semibold text-sm mb-0.5">Fă semnul „{target}"</p>
            <p className="text-ink-500 text-xs">din cuvântul {word.label}</p>
          </div>
        </div>

        <div className="h-2 bg-cream-200 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-100
              ${isSuccess ? 'bg-signa-400' : holdPct > 0 ? 'bg-signa-500' : 'bg-transparent'}`}
            style={{ width: `${holdPct * 100}%` }}
          />
        </div>

        <button
          onClick={() => advance(true)}
          className="w-full py-2 text-ink-400 hover:text-ink-600 text-xs font-medium"
        >
          Sari peste litera asta →
        </button>
      </div>
    </div>
  );
}
