import { useState, useRef, useCallback, useEffect } from 'react';
import { normalize } from '../utils/normalize';
import { SEQ_FRAMES } from '../data/lsr-alphabet';

const MODEL_PATH      = '/models/signa-model.json';
const LABELS_PATH     = '/models/signa-labels.json';
const DYN_MODEL_PATH  = '/models/signa-model-dynamic.json';
const DYN_LABELS_PATH = '/models/signa-labels-dynamic.json';

/** Rulează softmax-ul unui model și împachetează rezultatul */
function rank(tf, model, data, labels) {
  return tf.tidy(() => {
    // tensorul se creează ÎN tidy ca să fie eliberat automat
    const probs = Array.from(model.predict(tf.tensor(data)).dataSync());
    const ranked = probs
      .map((p, i) => ({ label: labels[i], p }))
      .sort((a, b) => b.p - a.p);
    return {
      label:      ranked[0].label,
      confidence: ranked[0].p,
      margin:     ranked[0].p - (ranked[1]?.p ?? 0),
      top3:       ranked.slice(0, 3),
    };
  });
}

/**
 * Încarcă modelele TensorFlow.js antrenate și expune predicția.
 *  • modelul STATIC (obligatoriu pentru predicții) — poze de mână
 *  • modelul DINAMIC (opțional) — secvențe de mișcare (GRU)
 * Fiecare lipsă e tolerată silențios: camera merge și fără modele.
 */
export function useClassifier() {
  const [isReady,    setIsReady]    = useState(false);
  const [isDynReady, setIsDynReady] = useState(false);
  const tfRef        = useRef(null);
  const modelRef     = useRef(null);
  const labelsRef    = useRef(null);
  const dynModelRef  = useRef(null);
  const dynLabelsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOne(labelsPath, modelPath, warmShape) {
      const res = await fetch(labelsPath);
      if (!res.ok) return null; // model neantrenat — fail silențios
      const { labels } = await res.json();

      // TF.js se importă lazy, o singură dată pentru ambele modele
      if (!tfRef.current) tfRef.current = await import('@tensorflow/tfjs');
      const tf = tfRef.current;

      const model = await tf.loadLayersModel(modelPath);
      // Warmup: prima inferență e lentă — o consumăm acum
      tf.tidy(() => model.predict(tf.zeros(warmShape)));
      return { model, labels };
    }

    (async () => {
      try {
        const st = await loadOne(LABELS_PATH, MODEL_PATH, [1, 63]);
        if (st && !cancelled) {
          modelRef.current  = st.model;
          labelsRef.current = st.labels;
          setIsReady(true);
        }
      } catch { /* model static lipsă sau corupt */ }

      try {
        const dy = await loadOne(DYN_LABELS_PATH, DYN_MODEL_PATH, [1, SEQ_FRAMES, 63]);
        if (dy && !cancelled) {
          dynModelRef.current  = dy.model;
          dynLabelsRef.current = dy.labels;
          setIsDynReady(true);
        }
      } catch { /* model dinamic lipsă sau corupt */ }
    })();

    return () => { cancelled = true; };
  }, []);

  /**
   * Prezice semnul STATIC din landmarks-urile unei mâini.
   * @param {Array<{x,y,z}>} landmarks  21 puncte MediaPipe
   * @returns {{ label, confidence, margin, top3 } | null}
   */
  const predict = useCallback((landmarks) => {
    const tf = tfRef.current;
    if (!tf || !modelRef.current || !landmarks) return null;

    const vector = normalize(landmarks);
    if (!vector) return null;

    return rank(tf, modelRef.current, [vector], labelsRef.current);
  }, []);

  /**
   * Prezice semnul DINAMIC dintr-o secvență de cadre normalizate.
   * @param {number[][]} frames  SEQ_FRAMES vectori de câte 63 valori
   * @returns {{ label, confidence, margin, top3 } | null}
   */
  const predictSequence = useCallback((frames) => {
    const tf = tfRef.current;
    if (!tf || !dynModelRef.current) return null;
    if (!frames || frames.length !== SEQ_FRAMES) return null;

    return rank(tf, dynModelRef.current, [frames], dynLabelsRef.current);
  }, []);

  return { isReady, isDynReady, predict, predictSequence };
}
