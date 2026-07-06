import { useRef, useEffect, useState } from 'react';
import { useHandLandmarker } from '../../hooks/useHandLandmarker';
import HandCanvas from './HandCanvas';

/**
 * HandTracker — componentă principală de urmărire a mâinii.
 *
 * Arhitectură:
 *  • Un div oglindă (scaleX -1) conține video + canvas → ambele mirate consistent
 *  • UI-ul (loading, erori) e poziționat DEASUPRA div-ului oglindă, deci nu e răsturnat
 *  • Bucla de detecție rulează cu requestAnimationFrame, pornind doar când MediaPipe e gata
 *
 * @param {Function} [onLandmarks]  callback opțional, apelat la fiecare cadru cu
 *                                  landmarks-urile curente (sau null dacă nu e mână)
 */
export default function HandTracker({ onLandmarks }) {
  const videoRef       = useRef(null);
  const loopRef        = useRef(null);
  const onLandmarksRef = useRef(onLandmarks); // ref stabil — evită re-render la schimbare

  const [landmarks,    setLandmarks]    = useState(null);
  const [cameraError,  setCameraError]  = useState(null);

  // Sincronizează ref-ul cu prop-ul fără a reporni bucla
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);

  const { isReady, error: landmarkerError, detect } = useHandLandmarker();

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

    function loop() {
      const video = videoRef.current;

      // HAVE_CURRENT_DATA (readyState >= 2) = avem cel puțin un cadru valid
      if (video && video.readyState >= 2) {
        const result     = detect(video, performance.now());
        const newLandmarks = result?.landmarks?.length ? result.landmarks : null;
        setLandmarks(newLandmarks);
        onLandmarksRef.current?.(newLandmarks);
      }

      loopRef.current = requestAnimationFrame(loop);
    }

    loopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [isReady, detect]);

  // — Stare de eroare (cameră sau MediaPipe) —
  if (cameraError || landmarkerError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 px-8">
        <div className="rounded-2xl bg-slate-800 p-6 text-center max-w-xs">
          <p className="text-red-400 text-sm leading-relaxed">
            {cameraError || landmarkerError}
          </p>
          <p className="mt-2 text-slate-500 text-xs">
            Verifică permisiunile camerei și reîncarcă pagina.
          </p>
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
        <HandCanvas landmarks={landmarks} videoRef={videoRef} />
      </div>

      {/* Loading overlay — poziționat DEASUPRA div-ului oglindă, deci text e drept */}
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-signa-400 border-t-transparent" />
          <p className="text-white/70 text-sm">Se încarcă detectorul de mâini…</p>
        </div>
      )}

      {/* Indicator discret: mână detectată / nu */}
      {isReady && (
        <div className="absolute bottom-20 left-0 right-0 flex justify-center">
          <span
            className={`
              text-xs font-medium px-3 py-1 rounded-full transition-all duration-300
              ${landmarks
                ? 'bg-signa-500/80 text-white'
                : 'bg-slate-800/60 text-slate-400'}
            `}
          >
            {landmarks ? '✓ Mână detectată' : 'Ridică mâna în față camerei'}
          </span>
        </div>
      )}
    </div>
  );
}
