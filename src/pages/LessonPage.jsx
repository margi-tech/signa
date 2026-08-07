import { useRef, useState, useCallback, useEffect } from 'react';
import HandTracker from '../components/hand-tracker';
import ReferenceHand from '../components/lesson/ReferenceHand';
import Confetti from '../components/ui/Confetti';
import { useClassifier } from '../hooks/useClassifier';
import { useProgress } from '../hooks/useProgress';
import {
  XP_PER_LETTER, XP_PERFECT_BONUS, HOLD_DURATION_MS, HOLD_DURATION_DYNAMIC_MS,
} from '../data/lessons';
import { DYNAMIC_LETTERS, SEQ_FRAMES, SEQ_INTERVAL_MS, isWord } from '../data/lsr-alphabet';
import { normalize } from '../utils/normalize';
import REFERENCE_POSES from '../data/reference-poses.json';
import { playSuccess, playSkip, playLevelUp } from '../utils/sounds';

const MIN_CONFIDENCE = 0.7;
// Litere dinamice: prag mai relaxat (6 clase, seturi mici).
const DYN_MIN_CONF = 0.55;
const DYN_MIN_MARGIN = 0.08;

/** Text mare pentru target: shrink automat pentru cuvinte lungi. */
function targetTextSize(label) {
  const len = label?.length ?? 1;
  if (len <= 1) return 'text-4xl';
  if (len <= 3) return 'text-2xl';
  if (len <= 6) return 'text-lg';
  return 'text-base';
}

function LetterDots({ letters, idx, skipped }) {
  return (
    <div className="flex gap-1.5">
      {letters.map((l, i) => (
        <div key={`${l}-${i}`} className={`w-2 h-2 rounded-full transition-colors duration-300
          ${i === idx
            ? 'bg-white'
            : i < idx
              ? skipped.includes(l) ? 'bg-amber-400' : 'bg-signa-400'
              : 'bg-white/25'}`}
        />
      ))}
    </div>
  );
}

function ResultsScreen({ lesson, skipped, xpGained, stars, leveledUp, onExit, onRetry }) {
  return (
    <div className="h-full bg-cream flex flex-col items-center justify-center px-8 animate-fade-up relative">
      <Confetti active />
      <div className="flex gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <svg key={i} width="48" height="48" viewBox="0 0 24 24"
            className={i < stars ? 'animate-scale-in' : ''}
            style={{ animationDelay: `${i * 150}ms` }}
            fill={i < stars ? '#f59e0b' : '#EFEAE0'}>
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>
          </svg>
        ))}
      </div>

      <h1 className="text-ink-900 text-2xl font-black mb-1">
        {leveledUp ? 'Nivel nou!' : stars === 3 ? 'Perfect!' : stars === 2 ? 'Foarte bine!' : 'Lecție completată'}
      </h1>
      <p className="text-signa-600 font-bold text-lg mb-6">+{xpGained} XP</p>

      <div className="flex gap-2 mb-10 flex-wrap justify-center max-w-md">
        {lesson.letters.map((l, i) => {
          const wasSkipped = skipped.includes(l);
          const isLong = l.length > 1;
          return (
            <div key={`${l}-${i}`} className={`min-w-[2.5rem] h-10 px-2 rounded-xl flex items-center justify-center font-bold
              ${isLong ? 'text-xs' : ''}
              ${wasSkipped ? 'bg-amber-100 text-amber-600' : 'bg-signa-50 text-signa-600'}`}>
              {l}
            </div>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <p className="text-ink-500 text-xs -mt-7 mb-8">
          {skipped.join(', ')} — de repetat
        </p>
      )}

      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={onExit}
          className="w-full py-4 bg-signa-500 text-white font-bold rounded-2xl
            shadow-button active:scale-[0.97] transition-transform"
        >
          Continuă
        </button>
        <button
          onClick={onRetry}
          className="w-full py-3 text-ink-500 hover:text-ink-700 font-medium text-sm transition-colors"
        >
          Repetă lecția
        </button>
      </div>
    </div>
  );
}

export default function LessonPage({ lesson, onExit }) {
  const isDynamicLesson = lesson?.type === 'dynamic';
  const holdNeed = isDynamicLesson ? HOLD_DURATION_DYNAMIC_MS : HOLD_DURATION_MS;

  const [idx, setIdx] = useState(0);
  const [holdPct, setHoldPct] = useState(0);
  const [phase, setPhase] = useState('active');
  const [skipped, setSkipped] = useState([]);
  const [detected, setDetected] = useState(null);
  const [leveledUp, setLeveledUp] = useState(false);

  const lastTickRef = useRef(0);
  const holdMsRef = useRef(0);
  const targetRef = useRef(lesson.letters[0]);
  const phaseRef = useRef('active');
  const isReadyRef = useRef(false);
  const isDynRef = useRef(false);
  const predictRef = useRef(null);
  const predictSeqRef = useRef(null);
  const timeoutRef = useRef(null);
  const recordedRef = useRef(false);
  const seqBufRef = useRef([]);
  const levelBeforeRef = useRef(null);

  const { isReady, isDynReady, predict, predictSequence } = useClassifier();
  const {
    completeLesson, recordLetter, soundEnabled, level,
  } = useProgress();

  isReadyRef.current = isReady;
  isDynRef.current = isDynReady;
  predictRef.current = predict;
  predictSeqRef.current = predictSequence;

  const target = lesson.letters[idx];
  targetRef.current = target;
  phaseRef.current = phase;

  const advance = useCallback((didSkip) => {
    if (didSkip) {
      setSkipped((prev) => [...prev, targetRef.current]);
      recordLetter(targetRef.current, false);
      playSkip(soundEnabled);
    } else {
      recordLetter(targetRef.current, true);
      playSuccess(soundEnabled);
    }
    holdMsRef.current = 0;
    setHoldPct(0);
    setDetected(null);
    seqBufRef.current = [];

    setIdx((prev) => {
      if (prev + 1 >= lesson.letters.length) {
        setPhase('results');
        return prev;
      }
      setPhase('active');
      return prev + 1;
    });
  }, [lesson.letters.length, recordLetter, soundEnabled]);

  const handleLandmarks = useCallback((lm) => {
    if (phaseRef.current !== 'active') return;

    const now = performance.now();
    const elapsed = now - lastTickRef.current;
    const tickMs = isDynamicLesson ? SEQ_INTERVAL_MS : 80;
    if (elapsed < tickMs) return;
    lastTickRef.current = now;

    if (!lm?.hands?.length || !isReadyRef.current) {
      setDetected(null);
      return;
    }

    let isMatch = false;
    let label = null;

    if (isDynamicLesson && DYNAMIC_LETTERS.has(targetRef.current) && isDynRef.current) {
      const vector = normalize(lm);
      if (vector) {
        seqBufRef.current.push(vector);
        if (seqBufRef.current.length > SEQ_FRAMES) seqBufRef.current.shift();
      }
      if (seqBufRef.current.length === SEQ_FRAMES) {
        const p = predictSeqRef.current(seqBufRef.current);
        if (p) {
          label = p.label;
          isMatch = p.label === targetRef.current
            && p.confidence >= DYN_MIN_CONF
            && p.margin >= DYN_MIN_MARGIN;
        }
      }
    } else {
      const p = predictRef.current(lm);
      if (p) {
        label = p.label;
        isMatch = p.label === targetRef.current && p.confidence >= MIN_CONFIDENCE;
      }
    }

    if (label) setDetected(label);

    const step = Math.min(elapsed, 200);
    holdMsRef.current = isMatch
      ? holdMsRef.current + step
      : Math.max(0, holdMsRef.current - step * 2);

    setHoldPct(Math.min(holdMsRef.current / holdNeed, 1));

    if (holdMsRef.current >= holdNeed) {
      phaseRef.current = 'success';
      setPhase('success');
    }
  }, [isDynamicLesson, holdNeed]);

  useEffect(() => {
    if (phase !== 'success') return;
    timeoutRef.current = setTimeout(() => advance(false), 900);
    return () => clearTimeout(timeoutRef.current);
  }, [phase, advance]);

  useEffect(() => {
    if (phase !== 'results' || recordedRef.current) return;
    recordedRef.current = true;
    levelBeforeRef.current = level;

    const done = lesson.letters.length - skipped.length;
    const stars = skipped.length === 0 ? 3 : skipped.length === 1 ? 2 : 1;
    const xp = done * XP_PER_LETTER + (skipped.length === 0 ? XP_PERFECT_BONUS : 0);
    completeLesson(lesson.id, stars, xp);
  }, [phase, skipped, lesson, completeLesson, level]);

  // detect level-up after results render (progress updates async)
  useEffect(() => {
    if (phase !== 'results') return;
    if (levelBeforeRef.current != null && level > levelBeforeRef.current) {
      setLeveledUp(true);
      playLevelUp(soundEnabled);
    }
  }, [phase, level, soundEnabled]);

  if (!lesson) {
    return (
      <div className="h-full bg-cream flex items-center justify-center">
        <button onClick={onExit} className="text-ink-600">Lecție invalidă — înapoi</button>
      </div>
    );
  }

  if (phase === 'results') {
    const done = lesson.letters.length - skipped.length;
    const stars = skipped.length === 0 ? 3 : skipped.length === 1 ? 2 : 1;
    const xp = done * XP_PER_LETTER + (skipped.length === 0 ? XP_PERFECT_BONUS : 0);
    return (
      <ResultsScreen
        lesson={lesson} skipped={skipped} xpGained={xp} stars={stars}
        leveledUp={leveledUp}
        onExit={onExit}
        onRetry={() => {
          recordedRef.current = false;
          holdMsRef.current = 0;
          setLeveledUp(false);
          setSkipped([]); setIdx(0); setHoldPct(0); setPhase('active');
        }}
      />
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
            className="absolute inset-0 pointer-events-none z-10 transition-opacity"
            style={{ boxShadow: `inset 0 0 0 3px rgba(52,211,153,${0.2 + holdPct * 0.6})` }}
          />
        )}

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
            font-black px-2 text-center leading-tight transition-colors duration-300
            ${targetTextSize(target)}
            ${isSuccess ? 'bg-signa-50 text-signa-600' : 'bg-cream-100 text-ink-900'}`}>
            {target}
          </div>

          {REFERENCE_POSES[target] ? (
            <div className="w-16 h-16 bg-cream-100 rounded-2xl p-1 flex-shrink-0">
              <ReferenceHand pose={REFERENCE_POSES[target]} className="w-full h-full" theme="light" />
            </div>
          ) : (
            // Fără pose de referință (ex. cuvinte-semn) — placeholder discret
            <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center flex-shrink-0
              text-ink-300" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M8 11V7a2 2 0 114 0v4M12 11V6a2 2 0 114 0v6M16 11V8a2 2 0 114 0v6a6 6 0 01-12 0v-1"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-ink-900 font-semibold text-sm mb-0.5 truncate">
              {isWord(target) ? `Semnul „${target}"` : `Fă semnul „${target}"`}
            </p>
            <p className="text-ink-500 text-xs">
              {isDynamicLesson
                ? 'fă mișcarea și ține până se umple bara'
                : 'și ține-l până se umple bara'}
            </p>
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
          className="w-full py-2 text-ink-400 hover:text-ink-600 text-xs font-medium transition-colors"
        >
          {isWord(target) ? 'Sari peste cuvântul ăsta →' : 'Sari peste litera asta →'}
        </button>
      </div>
    </div>
  );
}
