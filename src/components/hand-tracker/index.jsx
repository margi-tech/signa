import { useRef, useEffect, useState } from 'react';
import { useHolisticLandmarker } from '../../hooks/useHolisticLandmarker';
import HandCanvas from './HandCanvas';

// 3 modele (mâini + față + trunchi) pe cadru sunt costisitoare — limităm
// detecția reală la ~15fps; desenarea rămâne fluidă prin rAF.
const DETECT_INTERVAL_MS = 66;

/**
 * HandTracker — componentă principală de urmărire holistică (mâini + față + trunchi).
 *
 * Arhitectură:
 *  • Un div oglindă (scaleX -1) conține video + canvas → ambele mirate consistent
 *  • UI-ul (loading, erori) e poziționat DEASUPRA div-ului oglindă, deci nu e răsturnat
 *  • Bucla de detecție rulează cu requestAnimationFrame, gated la DETECT_INTERVAL_MS
 *
 * @param {Function} [onLandmarks]  callback opțional, apelat la fiecare detecție cu
 *   subiectul complet { hands, handedness, faceBlendshapes, headMatrix, pose }
 *   (sau null dacă nu e nicio mână în cadru)
 */
export default function HandTracker({ onLandmarks }) {
  const videoRef       = useRef(null);
  const loopRef        = useRef(null);
  const lastTickRef    = useRef(0);
  const onLandmarksRef = useRef(onLandmarks); // ref stabil — evită re-render la schimbare

  const [subject,      setSubject]      = useState(null);
  const [cameraError,  setCameraError]  = useState(null);

  // Sincronizează ref-ul cu prop-ul fără a reporni bucla
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);

  const { isReady, error: landmarkerError, detect } = useHolisticLandmarker();

  // — Pornire cameră —
  useEffect(() => {
    let stream = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',       // selfie camera pe mobil
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError(err.message);
      }
    }

    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // — Buclă de detecție (pornește când MediaPipe e gata) —
  useEffect(() => {
    if (!isReady) return;

    function loop(now) {
      const video = videoRef.current;

      if (video && video.readyState >= 2 && now - lastTickRef.current >= DETECT_INTERVAL_MS) {
        lastTickRef.current = now;
        const result = detect(video, performance.now());
        const hasHand = result?.hands?.length > 0;
        // Canvas: arată față/corp chiar și fără mână; callback-ul de colectare/predicție
        // rămâne null fără mână (semnul LSR cere cel puțin o mână).
        const forDraw = result && (
          hasHand || result.faceLandmarks || result.pose
        ) ? result : null;
        setSubject(forDraw);
        onLandmarksRef.current?.(hasHand ? result : null);
      }

      loopRef.current = requestAnimationFrame(loop);
    }

    loopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [isReady, detect]);

  // — Stare de eroare (cameră sau MediaPipe) —
  if (cameraError || landmarkerError) {
    const isDenied = /NotAllowed|Permission|denied/i.test(cameraError || '');
    const isOffline = /Failed to fetch|NetworkError|Load failed|CDN/i.test(landmarkerError || '');
    return (
      <div className="flex h-full items-center justify-center bg-cream px-8">
        <div className="rounded-2xl bg-white shadow-card p-6 text-center max-w-xs">
          <p className="text-red-500 text-sm leading-relaxed font-semibold mb-2">
            {isDenied ? 'Camera a fost refuzată' : isOffline ? 'Nu pot încărca MediaPipe' : 'Eroare'}
          </p>
          <p className="text-ink-600 text-sm leading-relaxed">
            {cameraError || landmarkerError}
          </p>
          <p className="mt-3 text-ink-400 text-xs leading-relaxed">
            {isDenied
              ? 'Permite camera din setările browserului, apoi reîncarcă pagina.'
              : isOffline
                ? 'Prima încărcare are nevoie de internet (CDN MediaPipe). Apoi funcționează offline.'
                : 'Reîncearcă după ce verifici conexiunea și permisiunile.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-3 bg-signa-500 text-white font-bold text-sm rounded-xl"
          >
            Reîncarcă
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900">

      {/*
        Div oglindă: aplică scaleX(-1) pe video + canvas împreună.
        Rezultat: camera arată ca o oglindă (natural pentru utilizator),
        iar landmarks-urile se aliniază perfect fără calcule suplimentare.
      */}
      <div
        className="absolute inset-0"
        style={{ transform: 'scaleX(-1)' }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <HandCanvas
          landmarks={subject?.hands ?? null}
          face={subject?.faceLandmarks ?? null}
          pose={subject?.pose ?? null}
          videoRef={videoRef}
        />
      </div>

      {/* Loading overlay — poziționat DEASUPRA div-ului oglindă, deci text e drept */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-signa-400 border-t-transparent" />
          <p className="text-white/70 text-sm">Se încarcă detectoarele…</p>
        </div>
      )}

      {/* Indicator discret: ce e detectat */}
      {isReady && (
        <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-1.5">
          <span
            className={`
              text-xs font-medium px-3 py-1 rounded-full transition-all duration-300
              ${subject?.hands?.length
                ? 'bg-signa-500/80 text-white'
                : 'bg-slate-800/60 text-slate-400'}
            `}
          >
            {subject?.hands?.length ? '✓ Mână detectată' : 'Ridică mâna în față camerei'}
          </span>

          {subject && (
            <div className="flex gap-1.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full
                ${subject.faceLandmarks ? 'bg-sky-500/80 text-white' : 'bg-slate-800/50 text-slate-500'}`}>
                {subject.faceLandmarks ? '✓ Față' : 'Fără față'}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full
                ${subject.pose ? 'bg-amber-500/80 text-white' : 'bg-slate-800/50 text-slate-500'}`}>
                {subject.pose ? '✓ Corp' : 'Fără corp'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
