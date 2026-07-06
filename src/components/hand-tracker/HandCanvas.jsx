import { useRef, useEffect } from 'react';

// Topologia standard MediaPipe Hand — 21 landmarks, 21 conexiuni
export const CONNECTIONS = [
  // Degetul mare
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Arătătorul
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Mijlociul
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Inelarul
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Micul deget
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Baza palmei (knuckles)
  [5, 9], [9, 13], [13, 17],
];

// Vârfurile degetelor + încheietura — desenate mai mari
const TIP_POINTS = new Set([0, 4, 8, 12, 16, 20]);

// Culori distincte per mână: [conexiuni, vârf, articulație]
const HAND_COLORS = [
  { line: 'rgba(52, 211, 153, 0.45)',  tip: '#34d399', joint: '#6ee7b7' }, // verde
  { line: 'rgba(129, 140, 248, 0.45)', tip: '#818cf8', joint: '#a5b4fc' }, // violet
];

/**
 * Canvas transparent suprapus peste video.
 * Desenează scheletul mâinii detectat de MediaPipe.
 * Dimensiunile canvas-ului urmăresc containerul prin ResizeObserver.
 *
 * Landmarks-urile sunt normalizate la cadrul COMPLET al camerei, dar video-ul
 * e afișat cu object-cover (decupat să umple containerul) — de aceea reproducem
 * aceeași scalare + decupare centrată la desenare, altfel scheletul e decalat.
 */
export default function HandCanvas({ landmarks, videoRef }) {
  const canvasRef = useRef(null);

  // Sincronizează dimensiunile canvas-ului cu containerul la resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width  = Math.round(width);
      canvas.height = Math.round(height);
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  // Redesenează la fiecare set nou de landmarks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks?.length) return;

    const w = canvas.width;
    const h = canvas.height;

    // Reproduce object-cover: video-ul e scalat să umple containerul,
    // cu excesul decupat simetric. Calculăm dimensiunea reală de afișare
    // și offset-ul de centrare, apoi mapăm landmarks-urile la ele.
    const video = videoRef?.current;
    const vw = video?.videoWidth  || w;
    const vh = video?.videoHeight || h;
    const scale = Math.max(w / vw, h / vh);
    const drawW = vw * scale;
    const drawH = vh * scale;
    const offX  = (w - drawW) / 2;
    const offY  = (h - drawH) / 2;
    const px = (p) => p.x * drawW + offX;
    const py = (p) => p.y * drawH + offY;

    // Desenează fiecare mână detectată
    for (let hi = 0; hi < landmarks.length; hi++) {
      const lm     = landmarks[hi];
      const colors = HAND_COLORS[hi % HAND_COLORS.length];

      // — Conexiuni —
      ctx.lineCap     = 'round';
      ctx.lineWidth   = 2;
      ctx.strokeStyle = colors.line;

      for (const [a, b] of CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(px(lm[a]), py(lm[a]));
        ctx.lineTo(px(lm[b]), py(lm[b]));
        ctx.stroke();
      }

      // — Puncte —
      for (let i = 0; i < lm.length; i++) {
        const x      = px(lm[i]);
        const y      = py(lm[i]);
        const isTip  = TIP_POINTS.has(i);
        const radius = isTip ? 7 : 4;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle   = isTip ? colors.tip : colors.joint;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth   = 1.5;
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [landmarks]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
