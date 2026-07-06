import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// WASM-ul și modelul vin de pe CDN și sunt cachuite de service worker după prima încărcare.
// Versiunea CDN trebuie să fie sincronizată cu versiunea din package.json.
const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/**
 * Inițializează MediaPipe Hand Landmarker și expune funcția detect().
 *
 * Detectorul rulează în modul VIDEO (timestamp-uri monotone crescătoare via
 * performance.now()), optimizat pentru flux live de cameră.
 * Se inițializează o singură dată și se închide curat la unmount.
 *
 * @returns {{ isReady: boolean, error: string|null, detect: Function }}
 */
export function useHandLandmarker() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError]     = useState(null);
  const landmarkerRef         = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

        const lm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'GPU', // fallback automat pe CPU dacă GPU nu e disponibil
          },
          runningMode:                 'VIDEO',
          numHands:                    2,
          minHandDetectionConfidence:  0.5,
          minHandPresenceConfidence:   0.5,
          minTrackingConfidence:       0.5,
        });

        if (!cancelled) {
          landmarkerRef.current = lm;
          setIsReady(true);
        } else {
          lm.close(); // cleanup dacă componenta a fost demontată între timp
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    init();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // detect are referință stabilă (nu se recreează la fiecare render)
  const detect = useCallback((videoElement, timestamp) => {
    if (!landmarkerRef.current) return null;
    return landmarkerRef.current.detectForVideo(videoElement, timestamp);
  }, []);

  return { isReady, error, detect };
}
