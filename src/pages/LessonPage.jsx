import { useRef, useState, useCallback, useEffect } from 'react';
import HandTracker from '../components/hand-tracker';
import SignCoach, { SignWell } from '../components/lesson/SignCoach';
import Confetti from '../components/ui/Confetti';
import { useClassifier } from '../hooks/useClassifier';
import { useProgress } from '../hooks/useProgress';
import {
  HOLD_DURATION_MS, HOLD_DURATION_DYNAMIC_MS, HOLD_DECAY, lessonResult,
  nextCurriculumLesson,
} from '../data/lessons';
import { DYNAMIC_LETTERS, SEQ_FRAMES, SEQ_INTERVAL_MS } from '../data/lsr-alphabet';
import { normalize } from '../utils/normalize';
import { usesDynamicModel, matchesLessonTarget } from '../utils/signMatch';
import REFERENCE_POSES from '../data/reference-poses.json';
import { playSuccess, playSkip, playLevelUp } from '../utils/sounds';

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

function ResultsScreen({ lesson, skipped, xpGained, stars, leveledUp, nextLesson, onContinue, onExit, onRetry }) {
  const continueLabel = nextLesson
    ? `Continuă · ${nextLesson.title}`
    : 'Continuă';

  return (
    <div className="h-full bg-cream flex flex-col items-center justify-center px-8 animate-fade-up relative">
      <Confetti active={stars > 0} />
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
        {leveledUp ? 'Nivel nou!' : stars === 3 ? 'Perfect!' : stars === 2 ? 'Foarte bine!' : stars === 1 ? 'Lecție completată' : 'Reîncearcă lecția'}
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
          type="button"
          onClick={onContinue}
          className="w-full py-4 bg-signa-500 text-white font-bold rounded-2xl
            shadow-button active:scale-[0.97] transition-transform"
        >
          {continueLabel}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="w-full py-3 text-ink-500 hover:text-ink-700 font-medium text-sm transition-colors"
        >
          Repetă lecția
        </button>
        <button
          type="button"
          onClick={onExit}
          className="w-full py-3 rounded-2xl border border-ink-900/10 text-ink-700 font-semibold text-sm
            hover:bg-cream-100 transition-colors"
        >
          Ieși afară
        </button>
      </div>
    </div>
  );
}

function LessonSession({ lesson, onExit, onContinue }) {
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
  const isDynTargetRef = useRef(false);
  const predictRef = useRef(null);
  const predictSeqRef = useRef(null);
  const timeoutRef = useRef(null);
  const recordedRef = useRef(false);
  const seqBufRef = useRef([]);
  const levelBeforeRef = useRef(null);

  const {
    isReady, isDynReady, predict, predictSequence, staticLabels, dynamicLabels,
  } = useClassifier();
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

  // Tipul (static/dinamic) se decide PER LITERĂ/CUVÂNT, din DYNAMIC_LETTERS —
  // nu mai depinde de lesson.type, care e la nivel de lecție întreagă și nu
  // are sens pentru sesiuni mixte (ex. Repetiție spațiată).
  // Dacă modelul ales așa nu cunoaște semnul, dar celălalt da, îl folosim pe acela
  // (lecțiile scriu „El”/„Alb”, listele „el”/„alb” — vezi utils/signMatch).
  const isDynamicTarget = usesDynamicModel(
    target, DYNAMIC_LETTERS.has(target), { staticLabels, dynamicLabels },
  );
  isDynTargetRef.current = isDynamicTarget;
  const holdNeed = isDynamicTarget ? HOLD_DURATION_DYNAMIC_MS : HOLD_DURATION_MS;

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
    const tickMs = isDynTargetRef.current ? SEQ_INTERVAL_MS : 80;
    if (elapsed < tickMs) return;
    lastTickRef.current = now;

    if (!lm?.hands?.length || !isReadyRef.current) {
      setDetected(null);
      return;
    }

    let isMatch = false;
    let label = null;

    if (isDynTargetRef.current && isDynRef.current) {
      const vector = normalize(lm);
      if (vector) {
        seqBufRef.current.push(vector);
        if (seqBufRef.current.length > SEQ_FRAMES) seqBufRef.current.shift();
      }
      if (seqBufRef.current.length === SEQ_FRAMES) {
        const p = predictSeqRef.current(seqBufRef.current);
        if (p) {
          label = p.label;
          isMatch = matchesLessonTarget(p, targetRef.current, { dynamic: true });
        }
      }
    } else {
      const p = predictRef.current(lm);
      if (p) {
        label = p.label;
        isMatch = matchesLessonTarget(p, targetRef.current);
      }
    }

    if (label) setDetected(label);

    const step = Math.min(elapsed, 200);
    holdMsRef.current = isMatch
      ? holdMsRef.current + step
      : Math.max(0, holdMsRef.current - step * HOLD_DECAY);

    setHoldPct(Math.min(holdMsRef.current / holdNeed, 1));

    if (holdMsRef.current >= holdNeed) {
      phaseRef.current = 'success';
      setPhase('success');
    }
  }, [holdNeed]);

  useEffect(() => {
    if (phase !== 'success') return;
    timeoutRef.current = setTimeout(() => advance(false), 900);
    return () => clearTimeout(timeoutRef.current);
  }, [phase, advance]);

  useEffect(() => {
    if (phase !== 'results' || recordedRef.current) return;
    recordedRef.current = true;
    levelBeforeRef.current = level;

    const { stars, xp } = lessonResult(lesson.letters.length, skipped.length);
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

  if (phase === 'results') {
    const { stars, xp } = lessonResult(lesson.letters.length, skipped.length);
    const nextLesson = nextCurriculumLesson(lesson.id);
    return (
      <ResultsScreen
        lesson={lesson} skipped={skipped} xpGained={xp} stars={stars}
        leveledUp={leveledUp}
        nextLesson={nextLesson}
        onContinue={() => (nextLesson && onContinue ? onContinue(nextLesson) : onExit())}
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
  const pose = REFERENCE_POSES[target];

  return (
    <div className="h-full bg-cream flex flex-col lg:flex-row lg:gap-3 lg:p-3 overflow-hidden">
      <div className="relative flex-1 min-h-0 min-w-0 overflow-hidden lg:rounded-[26px] lg:shadow-card">
        <HandTracker onLandmarks={handleLandmarks} />

        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/65 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-10 lg:from-black/30" />

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

        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-3 py-3 sm:px-4 sm:py-4">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-black/35 backdrop-blur-sm
              text-white/90 hover:text-white text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ieși
          </button>

          <span className="h-9 px-3 rounded-full bg-black/35 backdrop-blur-sm text-white/80 text-xs font-semibold
            tracking-wider flex items-center truncate max-w-[40%]">
            {lesson.title}
          </span>
          <div className="h-9 px-3 rounded-full bg-black/35 backdrop-blur-sm flex items-center">
            <LetterDots letters={lesson.letters} idx={idx} skipped={skipped} />
          </div>
        </div>

        {detected && detected !== target && !isSuccess && (
          <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center pointer-events-none">
            <span className="text-white/50 text-xs bg-black/45 backdrop-blur-sm px-3 py-1 rounded-full">
              Văd: <span className="font-bold text-white/80">{detected}</span>
            </span>
          </div>
        )}

        <div className="lg:hidden absolute top-[4.35rem] right-3 z-20 w-[min(52vw,220px)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75 mb-1.5 text-right drop-shadow">
            De reprodus
          </p>
          <SignWell
            target={target}
            pose={pose}
            isDynamic={isDynamicTarget}
            isSuccess={isSuccess}
            holdPct={holdPct}
            className="w-full aspect-square shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
          />
        </div>
      </div>

      <SignCoach
        target={target}
        pose={pose}
        isDynamic={isDynamicTarget}
        isSuccess={isSuccess}
        holdPct={holdPct}
        onSkip={() => advance(true)}
        letters={lesson.letters}
        idx={idx}
        skipped={skipped}
      />
    </div>
  );
}

export default function LessonPage({ lesson, onExit, onContinue }) {
  if (!lesson?.letters?.length) {
    return (
      <div className="h-full bg-cream flex items-center justify-center">
        <button onClick={onExit} className="text-ink-600">
          Lecție invalidă — înapoi
        </button>
      </div>
    );
  }

  return <LessonSession lesson={lesson} onExit={onExit} onContinue={onContinue} />;
}
