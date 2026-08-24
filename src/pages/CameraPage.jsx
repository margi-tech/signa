import { useRef, useState, useCallback, useEffect } from 'react';
import HandTracker from '../components/hand-tracker';
import { useClassifier } from '../hooks/useClassifier';
import { normalize } from '../utils/normalize';
import { SEQ_FRAMES, SEQ_INTERVAL_MS } from '../data/lsr-alphabet';

// Detectorul de mișcare: deplasarea medie a punctelor (coordonate brute imagine)
const MOTION_WINDOW    = 8;      // câte cadre intră în media mișcării
const MOTION_THRESHOLD = 0.008;  // peste = mâna se mișcă (semn dinamic)
const DYN_MIN_CONF     = 0.6;    // confidence minim pentru un semn dinamic
const DYN_MIN_MARGIN   = 0.1;    // diferența față de locul 2 (evită ambiguități)
const STATIC_MIN_CONF  = 0.45;   // sub asta, nu afișăm predicție statică
const DYN_HOLD_MS      = 1500;   // cât rămâne afișat semnul dinamic după mișcare

const EASE = 'cubic-bezier(.22,1,.36,1)';
const FPS = Math.round(1000 / SEQ_INTERVAL_MS);

/** Bara de mișcare e plină la dublul pragului — pragul cade astfel la 50%. */
const MOTION_FULL = MOTION_THRESHOLD * 2;

const anim = (name, dur, delay = 0, fill = 'both', ease = EASE) =>
  ({ animation: `${name} ${dur}s ${ease} ${delay}s ${fill}` });

/** Vârfurile degetelor din scheletul-fantomă, afișat cât timp nu e nicio mână. */
const TIPS = [[10, 74], [46, 28], [78, 12], [112, 28], [136, 62]];
const FINGERS = [[30, 148, 10, 74], [52, 138, 46, 28], [78, 134, 78, 12],
  [104, 138, 112, 28], [122, 144, 136, 62]];

/** Scheletul care plutește peste feed cât timp nu e detectată nicio mână. */
function GhostHand() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ animation: 'sg-float-y 4.6s ease-in-out infinite' }}
    >
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div
            className="w-[300px] h-[300px] rounded-full"
            style={{
              background: 'rgba(52,211,153,.22)',
              filter: 'blur(60px)',
              animation: 'sg-ring-glow 4s ease-in-out infinite',
            }}
          />
        </div>

        <svg viewBox="0 0 160 190" width="252" height="300" className="relative block overflow-visible">
          <g style={{ transformOrigin: '80px 95px', animation: 'sg-bracket 4.2s ease-in-out infinite' }}>
            {[
              ['M4 40V16a12 12 0 0 1 12-12h20', 0.7],
              ['M156 40V16a12 12 0 0 0-12-12h-20', 0.8],
              ['M4 150v24a12 12 0 0 0 12 12h20', 0.9],
              ['M156 150v24a12 12 0 0 1-12 12h-20', 1],
            ].map(([d, delay]) => (
              <path
                key={d} d={d} fill="none" stroke="rgba(52,211,153,.6)"
                strokeWidth="2" strokeLinecap="round"
                style={anim('sg-fade-in', 0.6, delay, 'both', 'ease-out')}
              />
            ))}
          </g>

          <rect
            x="20" y="132" width="118" height="46" rx="23"
            fill="rgba(255,255,255,.10)" stroke="rgba(52,211,153,.24)" strokeWidth="2"
            style={{ ...anim('sg-scale-in', 0.6, 0.34), transformOrigin: '79px 155px' }}
          />

          {FINGERS.map(([x1, y1, x2, y2], i) => (
            <line
              key={`f-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,.14)" strokeWidth="15" strokeLinecap="round"
              style={anim('sg-fade-in', 0.5, 0.36 + i * 0.06, 'both', 'ease-out')}
            />
          ))}

          <path
            d="M10 74 46 28 78 12 112 28 136 62"
            fill="none" stroke="rgba(52,211,153,.5)" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="320"
            style={anim('sg-draw', 1.6, 0.62)}
          />

          {TIPS.map(([cx, cy], i) => (
            <circle
              key={`h-${cx}-${cy}`} cx={cx} cy={cy} r="15" fill="rgba(52,211,153,0.2)"
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                animation: `sg-halo 1.9s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
          {TIPS.map(([cx, cy], i) => (
            <circle
              key={`t-${cx}-${cy}`} cx={cx} cy={cy} r="7" fill="#34d399"
              style={{
                transformOrigin: `${cx}px ${cy}px`,
                animation: `sg-tip 1.9s ease-in-out ${i * 0.18}s infinite`,
              }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function CameraPage() {
  const lastTickRef  = useRef(0);
  const isReadyRef   = useRef(false);
  const isDynRef     = useRef(false);
  const predictRef   = useRef(null);
  const predictSeqRef= useRef(null);
  const seqBufRef    = useRef([]);   // ultimele SEQ_FRAMES cadre normalizate
  const prevRawRef   = useRef(null); // cadrul brut anterior (pentru mișcare)
  const motionBufRef = useRef([]);   // deplasările recente per cadru
  const lastDynRef   = useRef({ p: null, t: 0 });
  const lastLoggedRef= useRef(null); // ultimul semn adăugat în sesiune

  const [prediction, setPrediction] = useState(null);
  const [debug,      setDebug]      = useState(false);
  const [live,       setLive]       = useState(null); // top3 + mișcare, mereu
  const [cameraOn,   setCameraOn]   = useState(false);
  const [session,    setSession]    = useState([]);   // semnele din sesiune
  const [guide,      setGuide]      = useState({ framed: false, hasHand: false });

  const { isReady, isDynReady, predict, predictSequence } = useClassifier();
  // Refs stabili — nu recreează handleLandmarks la fiecare schimbare
  isReadyRef.current    = isReady;
  isDynRef.current      = isDynReady;
  predictRef.current    = predict;
  predictSeqRef.current = predictSequence;

  // Un tick la SEQ_INTERVAL_MS (~20fps) — același ritm ca la colectarea secvențelor
  const handleLandmarks = useCallback((lm) => {
    const now = performance.now();
    if (now - lastTickRef.current < SEQ_INTERVAL_MS) return;
    lastTickRef.current = now;

    if (!lm?.hands?.length || !isReadyRef.current) {
      seqBufRef.current = [];
      motionBufRef.current = [];
      prevRawRef.current = null;
      setPrediction(null);
      setLive(null);
      return;
    }

    const subject = lm;
    const hand = subject.hands[0]; // mâna principală, folosită pentru detectorul de mișcare

    // — Mișcarea: deplasarea medie a punctelor mâinii față de cadrul anterior —
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

    // — Bufferul de secvență (vectori deja normalizați, ritm fix) —
    const vector = normalize(subject);
    if (vector) {
      seqBufRef.current.push(vector);
      if (seqBufRef.current.length > SEQ_FRAMES) seqBufRef.current.shift();
    }

    // — Predicție combinată —
    let dynP = null;
    if (isMoving && isDynRef.current && seqBufRef.current.length === SEQ_FRAMES) {
      dynP = predictSeqRef.current(seqBufRef.current);
      if (
        dynP
        && dynP.confidence >= DYN_MIN_CONF
        && dynP.margin >= DYN_MIN_MARGIN
      ) {
        lastDynRef.current = { p: { ...dynP, dynamic: true }, t: now };
      }
    }

    const staticRaw = predictRef.current(subject);
    const staticP = staticRaw
      && staticRaw.confidence >= STATIC_MIN_CONF
      ? staticRaw
      : null;

    let shown = null;
    if (lastDynRef.current.p && now - lastDynRef.current.t < DYN_HOLD_MS) {
      // Un semn dinamic recent are prioritate — rămâne afișat scurt după mișcare
      shown = lastDynRef.current.p;
    } else if (!isMoving) {
      shown = staticP;
    }
    setPrediction(shown);

    // Panoul lateral arată mereu top3 + mișcare, nu doar în debug.
    const src = dynP ?? staticP;
    setLive(src ? { ...src, motion, isMoving, fromDyn: !!dynP } : { motion, isMoving });

    // Jurnalul sesiunii: un semn nou intră o singură dată, nu la fiecare cadru.
    if (shown && shown.label !== lastLoggedRef.current) {
      lastLoggedRef.current = shown.label;
      setSession((s) => [
        ...s.slice(-23),
        { label: shown.label, confidence: shown.confidence, dynamic: !!shown.dynamic, at: now },
      ]);
    } else if (!shown) {
      lastLoggedRef.current = null;
    }
  }, []); // referință stabilă — HandTracker îl primește o singură dată

  const handleTracking = useCallback((subject) => {
    setGuide({
      framed: Boolean(subject?.faceFrame?.ok),
      hasHand: (subject?.hands?.length ?? 0) > 0,
    });
  }, []);

  // Oprirea camerei demontează HandTracker (care își oprește stream-ul) și
  // golește tot ce ținea de cadrul curent.
  useEffect(() => {
    if (cameraOn) return;
    seqBufRef.current = [];
    motionBufRef.current = [];
    prevRawRef.current = null;
    lastDynRef.current = { p: null, t: 0 };
    lastLoggedRef.current = null;
    setPrediction(null);
    setLive(null);
    setGuide({ framed: false, hasHand: false });
  }, [cameraOn]);

  const motionPct = live ? Math.min(100, (live.motion / MOTION_FULL) * 100) : 0;
  const thresholdPct = (MOTION_THRESHOLD / MOTION_FULL) * 100; // = 50%
  const avgConf = session.length
    ? Math.round((session.reduce((s, x) => s + x.confidence, 0) / session.length) * 100)
    : 0;

  const statusLabel = debug ? 'Debug' : isDynReady ? 'AI + mișcare' : isReady ? 'AI activ' : 'Se încarcă';

  return (
    <div className="min-h-full flex flex-col gap-[22px]
      px-5 pt-5 pb-8 lg:px-11 lg:pt-[34px] lg:pb-11
      bg-[radial-gradient(110%_45%_at_50%_0%,#F3FBF6_0%,#FFFBF3_62%)]
      lg:bg-[radial-gradient(ellipse_70%_50%_at_85%_0%,#FFFDF7,#FBF6ED)]">

      {/* 1 · Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <p
            style={anim('sg-fade-right', 0.6, 0.06)}
            className="text-[10.5px] lg:text-xs font-extrabold uppercase tracking-[.14em] lg:tracking-[.22em] text-ink-400"
          >
            Cameră · Recunoaștere locală
          </p>
          <h1
            style={anim('sg-fade-up', 0.7, 0.14)}
            className="mt-1.5 lg:mt-2 text-[29px] lg:text-[2.6rem] font-black text-ink-900
              tracking-[-.02em] lg:tracking-[-.025em] leading-tight lg:leading-[1.1] text-pretty"
          >
            Antrenament liber
          </h1>
          <p
            style={anim('sg-fade-up', 0.7, 0.2)}
            className="mt-1 text-[13.5px] font-semibold text-ink-500"
          >
            Totul rulează pe dispozitiv — imaginea nu pleacă nicăieri.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            style={anim('sg-scale-in', 0.5, 0.22)}
            className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold
              bg-signa-50 text-signa-600 border border-signa-500/[.18]"
          >
            <span aria-hidden className="relative w-[7px] h-[7px] flex-none">
              <span className="absolute inset-0 rounded-full bg-signa-500" />
              <span className="absolute -inset-1 rounded-full border-[1.5px] border-signa-500/55 sg-dot-ring" />
            </span>
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => setDebug((d) => !d)}
            style={anim('sg-scale-in', 0.5, 0.29)}
            className={`rounded-full px-3.5 py-2 text-[12.5px] font-extrabold border
              transition-[color,background-color,border-color,transform] duration-[160ms] ease-out
              ${debug
              ? 'bg-ink-900 border-ink-900 text-white'
              : 'bg-white border-ink-900/[.09] text-ink-700 hover:border-signa-500 hover:text-signa-600 hover:-translate-y-px'}`}
          >
            Debug
          </button>
        </div>
      </div>

      {/* 2 · Viewport + panou lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[18px] items-stretch">
        <div
          style={anim('sg-fade-up', 0.75, 0.3)}
          className="relative overflow-hidden rounded-3xl lg:rounded-[26px] min-h-[430px]
            bg-[linear-gradient(160deg,#111c1a,#0b1614_60%,#0d1a17)]"
        >
          {/* Feed real — umple cardul; landmark-urile se desenează în HandCanvas */}
          {cameraOn && (
            <div className="absolute inset-0">
              <HandTracker onLandmarks={handleLandmarks} onTracking={handleTracking} />
            </div>
          )}

          {/* Atmosferă: aurora verde + indigo, peste feed */}
          <span
            aria-hidden
            className="absolute -top-[120px] -right-[70px] w-[300px] h-[300px] rounded-full pointer-events-none sg-aurora-a"
            style={{
              background: 'radial-gradient(circle, rgba(52,211,153,.34), transparent 70%)',
              filter: 'blur(52px)',
            }}
          />
          <span
            aria-hidden
            className="absolute -bottom-[110px] left-[14%] w-[280px] h-[280px] rounded-full pointer-events-none sg-aurora-b"
            style={{
              background: 'radial-gradient(circle, rgba(79,70,229,.26), transparent 72%)',
              filter: 'blur(54px)',
            }}
          />
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),'
                + 'linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
              maskImage: 'radial-gradient(ellipse 62% 58% at 50% 48%, #000, transparent 76%)',
              WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 50% 48%, #000, transparent 76%)',
            }}
          />

          {/* Fantomă doar după ce fața e în cadran — altfel ovalul e ghidul. */}
          {cameraOn && guide.framed && !guide.hasHand && <GhostHand />}

          {cameraOn && (
            <span
              aria-hidden
              className="absolute top-0 left-[6%] right-[6%] h-[2.5px] rounded-sm pointer-events-none"
              style={{
                background: 'linear-gradient(90deg,transparent,rgba(52,211,153,.95),transparent)',
                '--sg-scan-from': '420px',
                animation: 'sg-scan 3.4s cubic-bezier(.45,0,.55,1) 1.2s infinite',
              }}
            />
          )}

          {/* Badge-uri sus — LIVE doar cât stream-ul e deschis */}
          <div className="absolute top-5 left-[22px] right-[22px] flex items-center justify-between gap-3.5 z-[2]">
            <span
              style={anim('sg-fade-up', 0.6, 0.5)}
              className="flex items-center gap-2 rounded-full bg-black/40 border border-white/[.12]
                text-white text-[11.5px] font-extrabold uppercase tracking-[.1em] px-3.5 py-2"
            >
              {cameraOn ? (
                <>
                  <span
                    aria-hidden
                    className="w-[7px] h-[7px] rounded-full bg-[#f43f5e]"
                    style={{ animation: 'sg-rec 1.6s ease-in-out infinite' }}
                  />
                  Live
                </>
              ) : 'Oprită'}
            </span>
            {cameraOn && (
              <span
                style={anim('sg-fade-up', 0.6, 0.56)}
                className="rounded-full bg-black/40 border border-white/[.12] text-white/70
                  text-[11.5px] font-bold px-3.5 py-2 tabular-nums"
              >
                {FPS} fps · 21 puncte
              </span>
            )}
          </div>

          {!cameraOn && (
            <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-4 px-6">
              <p className="text-white/70 text-[13.5px] font-semibold text-center max-w-[280px]">
                Camera e oprită. Pornește-o ca să recunoști semne.
              </p>
              <button
                type="button"
                onClick={() => setCameraOn(true)}
                className="rounded-2xl bg-signa-500 text-white px-5 py-3 text-[13px] font-extrabold
                  shadow-[0_10px_24px_rgba(16,185,129,.35)]
                  transition-transform duration-[160ms] ease-out hover:-translate-y-0.5"
              >
                Pornește camera
              </button>
            </div>
          )}

          {cameraOn && (
            <div className="absolute left-[22px] right-[22px] bottom-[22px] flex items-end justify-between gap-4 z-[2]">
              {/* Glass: panoul stă peste feed, deci are nevoie de blur propriu
                  ca litera să rămână lizibilă indiferent de fundal. */}
              <div
                style={{
                  ...anim('sg-fade-up', 0.7, 0.88),
                  background: 'rgba(0,0,0,.5)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                className="flex items-center gap-3.5 rounded-[20px] border border-white/[.12] px-[22px] py-4"
              >
                <span
                  key={prediction?.label ?? 'none'}
                  className="font-black text-white leading-none tabular-nums"
                  style={{
                    fontSize: 44,
                    ...anim('sg-fade-up', 0.22, 0, 'both', 'ease-out'),
                    textShadow: prediction?.dynamic
                      ? '0 0 32px rgba(129,140,248,.55)'
                      : '0 0 32px rgba(52,211,153,.45)',
                  }}
                >
                  {prediction?.label ?? '—'}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-white/55">
                    {prediction?.dynamic ? 'Semn dinamic' : 'Semn static'}
                  </span>
                  <span className="mt-1.5 block w-[132px] h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${prediction?.dynamic ? 'bg-indigo-400' : 'bg-signa-400'}`}
                      style={{
                        width: `${(prediction?.confidence ?? 0) * 100}%`,
                        transition: 'width .4s ease-out',
                      }}
                    />
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCameraOn(false)}
                style={anim('sg-fade-up', 0.7, 0.94)}
                className="flex-none rounded-2xl border border-white/[.14] bg-black/40 text-white
                  px-5 py-3 text-[13px] font-bold backdrop-blur
                  transition-transform duration-[160ms] ease-out hover:-translate-y-0.5"
              >
                Oprește camera
              </button>
            </div>
          )}
        </div>

        {/* Panoul lateral */}
        <div className="flex flex-col gap-[18px]">
          <div
            style={anim('sg-fade-up', 0.75, 0.4)}
            className="bg-white border border-ink-900/[.05] rounded-[22px] lg:rounded-[26px]
              shadow-[0_10px_30px_rgba(46,42,36,.06)] px-6 py-[22px]"
          >
            <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">
              Top 3 predicții
            </p>
            <div className="mt-3.5 flex flex-col gap-2.5">
              {(live?.top3 ?? []).map(({ label, p }, i) => {
                const accent = live.fromDyn ? '#4f46e5' : '#10b981';
                return (
                  <div
                    key={label}
                    style={anim('sg-fade-up', 0.55, 0.62 + i * 0.08)}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="w-8 h-8 flex-none rounded-[10px] flex items-center justify-center
                        font-black text-[13px]"
                      style={i === 0
                        ? { background: `${accent}1a`, color: accent }
                        : { background: 'rgba(46,42,36,.05)', color: '#C4BAA9' }}
                    >
                      {label}
                    </span>
                    <span className="flex-1 h-1.5 rounded-full bg-ink-900/[.07] overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${p * 100}%`,
                          background: i === 0 ? accent : '#C4BAA9',
                          transition: 'width .45s ease-out',
                        }}
                      />
                    </span>
                    <span className="w-12 text-right text-[12px] font-bold text-ink-500 tabular-nums">
                      {(p * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
              {!live?.top3 && (
                <p className="text-[13px] font-semibold text-ink-400 py-2">
                  {cameraOn
                    ? (guide.framed ? 'Arată o mână în cadru.' : 'Pune fața în cadran.')
                    : 'Camera e oprită.'}
                </p>
              )}
            </div>
          </div>

          <div
            style={anim('sg-fade-up', 0.75, 0.48)}
            className="bg-white border border-ink-900/[.05] rounded-[22px] lg:rounded-[26px]
              shadow-[0_10px_30px_rgba(46,42,36,.06)] px-6 py-[22px]"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                Mișcare
              </p>
              <span className={`text-[11px] font-extrabold tabular-nums
                ${live?.isMoving ? 'text-indigo-600' : 'text-ink-400'}`}
              >
                {live?.isMoving ? 'Peste prag' : 'Sub prag'}
              </span>
            </div>
            <div className="relative mt-3 h-[9px] rounded-full bg-ink-900/[.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#818cf8,#4f46e5)]"
                style={{ width: `${motionPct}%`, transition: 'width .2s linear' }}
              />
              {/* Marcajul pragului — poziționat din MOTION_THRESHOLD, nu hardcodat */}
              <span
                aria-hidden
                className="absolute inset-y-0 w-[2px] bg-ink-900/25"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[18px]">
            <div
              style={anim('sg-fade-up', 0.75, 0.58)}
              className="bg-white border border-ink-900/[.05] rounded-[22px]
                shadow-[0_6px_20px_rgba(46,42,36,.05)] px-5 py-4"
            >
              <p className="text-[23px] font-black text-signa-900 leading-none tabular-nums">
                {session.length}
              </p>
              <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                Semne
              </p>
            </div>
            <div
              style={anim('sg-fade-up', 0.75, 0.66)}
              className="bg-white border border-ink-900/[.05] rounded-[22px]
                shadow-[0_6px_20px_rgba(46,42,36,.05)] px-5 py-4"
            >
              <p className="text-[23px] font-black text-ink-900 leading-none tabular-nums">
                {avgConf}%
              </p>
              <p className="mt-[5px] text-[11px] font-extrabold uppercase tracking-[.14em] text-ink-400">
                Încredere
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 · Recunoscute acum */}
      <div
        style={anim('sg-fade-up', 0.7, 0.74)}
        className="bg-white border border-ink-900/[.05] rounded-[22px] px-7 py-6
          shadow-[0_6px_20px_rgba(46,42,36,.05)] flex items-center gap-7"
      >
        <div className="flex-none">
          <h3 className="text-base font-extrabold text-ink-900">Recunoscute acum</h3>
          <p className="mt-1 text-[13px] font-medium text-ink-400">în sesiunea curentă</p>
        </div>

        <div className="flex-1 flex gap-2.5 flex-wrap">
          {session.length > 0 ? session.slice(-12).map((s, i) => (
            <span
              key={`${s.label}-${s.at}`}
              title={`${Math.round(s.confidence * 100)}%`}
              style={{
                // `backwards`, nu `both` — altfel animația blochează hover-ul
                animation: `sg-pop .45s ${EASE} ${i * 0.05}s backwards`,
              }}
              className={`w-[52px] h-[52px] flex-none rounded-[14px] flex items-center justify-center
                text-[17px] font-extrabold border transition-[transform,box-shadow] duration-[220ms] ease-out
                hover:-translate-y-[5px] hover:shadow-[0_12px_24px_rgba(46,42,36,.13)]
                ${s.dynamic
                ? 'bg-indigo-50 border-indigo-500/20 text-indigo-600'
                : 'bg-[#FFFDF9] border-ink-900/[.09] text-ink-900'}`}
            >
              {s.label}
            </span>
          )) : (
            <p className="text-[13px] font-semibold text-ink-400 py-3">
              Niciun semn încă în sesiunea asta.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setSession([]); lastLoggedRef.current = null; }}
          disabled={session.length === 0}
          className="ml-auto flex-none bg-white border border-ink-900/[.09] rounded-[15px]
            px-6 py-[15px] font-bold text-[14.5px] text-ink-700
            transition-[transform,box-shadow,border-color,color] duration-[180ms] ease-out
            hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(46,42,36,.09)]
            hover:border-signa-500/[.32] hover:text-signa-600
            disabled:opacity-40 disabled:translate-y-0 disabled:cursor-not-allowed"
        >
          Golește sesiunea
        </button>
      </div>
    </div>
  );
}
