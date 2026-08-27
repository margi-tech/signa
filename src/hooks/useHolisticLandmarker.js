import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FaceLandmarker, PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// WASM-ul și modelele vin de pe CDN (script injectat de MediaPipe, apoi fetch)
// și sunt cachuite de service worker. CSP-ul de producție trebuie să permită
// jsDelivr la script-src, nu doar la connect-src — vezi vercel.json.
export const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
export const HAND_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
export const FACE_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// Pose "lite" — mai rapid decât "full"/"heavy"; precizia suplimentară nu contează
// pentru cei ~6 puncte de trunchi/umeri pe care îi folosim.
export const POSE_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/**
 * Inițializează cele 3 detectoare MediaPipe (mâini + față + trunchi) și
 * expune o singură funcție detect() care le rulează pe toate pe un cadru.
 *
 * LSR foloseşte simultan mâinile (forma semnului), expresia facială/capul
 * (gramatică, emoție) și postura trunchiului (orientare în spațiu) — de
 * aceea urmărim toate trei, nu doar mâinile ca în Faza 1-4.
 *
 * @returns {{ isReady: boolean, error: string|null, detect: Function }}
 */
export function useHolisticLandmarker() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError]     = useState(null);
  const handRef = useRef(null);
  const faceRef = useRef(null);
  const poseRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

        const [hand, face, pose] = await Promise.all([
          HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: HAND_MODEL_PATH, delegate: 'GPU' },
            runningMode:                'VIDEO',
            numHands:                   2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence:  0.5,
            minTrackingConfidence:      0.5,
          }),
          FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numFaces:    1,
            outputFaceBlendshapes:            true, // 52 coeficienți de expresie
            outputFacialTransformationMatrixes: true, // orientarea capului
          }),
          PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: POSE_MODEL_PATH, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numPoses:    1,
          }),
        ]);

        if (!cancelled) {
          handRef.current = hand;
          faceRef.current = face;
          poseRef.current = pose;
          setIsReady(true);
        } else {
          hand.close(); face.close(); pose.close();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            typeof err?.message === 'string' && err.message
              ? err.message
              : 'Detectoarele MediaPipe nu s-au putut încărca.',
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      handRef.current?.close();
      faceRef.current?.close();
      poseRef.current?.close();
      handRef.current = null;
      faceRef.current = null;
      poseRef.current = null;
    };
  }, []);

  /**
   * Rulează toate cele 3 detectoare pe un cadru și întoarce un obiect unificat.
   * @returns {{
   *   hands: Array<Array<{x,y,z}>>,
   *   handedness: Array<string|undefined>,
   *   faceBlendshapes: number[]|null,
   *   headMatrix: number[]|null,
   *   pose: Array<{x,y,z,visibility}>|null,
   * } | null}
   */
  const detect = useCallback((videoElement, timestamp) => {
    if (!handRef.current) return null;

    const handRes = handRef.current.detectForVideo(videoElement, timestamp);
    const faceRes = faceRef.current?.detectForVideo(videoElement, timestamp);
    const poseRes = poseRef.current?.detectForVideo(videoElement, timestamp);

    return {
      hands:      handRes?.landmarks ?? [],
      handedness: (handRes?.handednesses ?? []).map((h) => h?.[0]?.categoryName),
      faceLandmarks: faceRes?.faceLandmarks?.[0] ?? null,
      faceBlendshapes: faceRes?.faceBlendshapes?.[0]?.categories
        ? faceRes.faceBlendshapes[0].categories.map((c) => c.score)
        : null,
      headMatrix: faceRes?.facialTransformationMatrixes?.[0]?.data
        ? Array.from(faceRes.facialTransformationMatrixes[0].data)
        : null,
      pose: poseRes?.landmarks?.[0] ?? null,
    };
  }, []);

  return { isReady, error, detect };
}
