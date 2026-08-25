import { useState, useRef, useCallback, useEffect } from 'react';
import { normalize, VECTOR_SIZE } from '../utils/normalize';
import { SEQ_FRAMES } from '../data/lsr-alphabet';

const MODEL_PATH      = '/models/signa-model.json';
const LABELS_PATH     = '/models/signa-labels.json';
const DYN_MODEL_PATH  = '/models/signa-model-dynamic.json';
const DYN_LABELS_PATH = '/models/signa-labels-dynamic.json';

/**
 * Curăță etichetele venite din dataset: spațiile accidentale la capete au creat
 * clase fantomă („Tu ” ≠ „Tu”), imposibil de validat prin comparația strictă din
 * LessonPage/SpellPage. Vezi și trim-ul de la colectare și import.
 */
export function cleanLabels(labels) {
  return labels.map((l) => String(l).trim());
}

/** Rulează softmax-ul unui model și împachetează rezultatul */
function rank(tf, model, data, labels) {
  return tf.tidy(() => {
    const probs = Array.from(model.predict(tf.tensor(data)).dataSync());
    // Clasele cu același nume (ex. „Soră” colectată și cu, și fără spațiu) sunt
    // același semn — probabilitățile lor se adună, nu se concurează între ele.
    const merged = new Map();
    probs.forEach((p, i) => {
      const label = labels[i];
      merged.set(label, (merged.get(label) ?? 0) + p);
    });
    const ranked = [...merged.entries()]
      .map(([label, p]) => ({ label, p }))
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
 *  • modelul STATIC — vectori de VECTOR_SIZE (199)
 *  • modelul DINAMIC — secvențe [SEQ_FRAMES, VECTOR_SIZE] (GRU)
 */
export function useClassifier() {
  const [isReady,    setIsReady]    = useState(false);
  const [isDynReady, setIsDynReady] = useState(false);
  const [modelVersion, setModelVersion] = useState(null);
  const tfRef        = useRef(null);
  const modelRef     = useRef(null);
  const labelsRef    = useRef(null);
  const dynModelRef  = useRef(null);
  const dynLabelsRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadOne(labelsPath, modelPath, warmShape) {
      // Cache-bust pe labels (conține version) — forțează revalidarea după reantrenare
      const res = await fetch(`${labelsPath}?t=${Date.now()}`);
      if (!res.ok) return null;
      const meta = await res.json();
      if (meta.vectorSize !== VECTOR_SIZE) {
        console.error(
          `Model incompatibil: vectorSize=${meta.vectorSize}, așteptat ${VECTOR_SIZE}.`,
        );
        return null;
      }
      const labels = cleanLabels(meta.labels ?? []);
      if (!labels.length) return null;

      if (!tfRef.current) tfRef.current = await import('@tensorflow/tfjs');
      const tf = tfRef.current;

      const bust = meta.version ? `?v=${encodeURIComponent(meta.version)}` : `?t=${Date.now()}`;
      // Nu adăuga query pe modelPath — TF.js rezolvă weights relativ și se strică.
      // Cache-ul e controlat de Workbox NetworkFirst pe /models/.
      void bust;
      const model = await tf.loadLayersModel(modelPath);
      tf.tidy(() => model.predict(tf.zeros(warmShape)));
      return { model, labels, version: meta.version ?? null };
    }

    (async () => {
      try {
        const st = await loadOne(LABELS_PATH, MODEL_PATH, [1, VECTOR_SIZE]);
        if (st && !cancelled) {
          modelRef.current  = st.model;
          labelsRef.current = st.labels;
          setModelVersion(st.version);
          setIsReady(true);
        }
      } catch { /* model static lipsă sau corupt */ }

      try {
        const dy = await loadOne(DYN_LABELS_PATH, DYN_MODEL_PATH, [1, SEQ_FRAMES, VECTOR_SIZE]);
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
   * Prezice semnul STATIC dintr-un subject holistic (sau landmarks legacy).
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
   * Prezice semnul DINAMIC dintr-o secvență de cadre normalizate (VECTOR_SIZE fiecare).
   * @param {number[][]} frames  SEQ_FRAMES vectori
   */
  const predictSequence = useCallback((frames) => {
    const tf = tfRef.current;
    if (!tf || !dynModelRef.current) return null;
    if (!frames || frames.length !== SEQ_FRAMES) return null;

    return rank(tf, dynModelRef.current, [frames], dynLabelsRef.current);
  }, []);

  return { isReady, isDynReady, predict, predictSequence, modelVersion };
}
