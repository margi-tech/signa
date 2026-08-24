import { useRef, useEffect } from 'react';
import { FACE_FRAME } from '../../utils/faceFrame';

// Topologia standard MediaPipe Hand — 21 landmarks, 21 conexiuni
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const HAND_TIP_POINTS = new Set([0, 4, 8, 12, 16, 20]);

const HAND_COLORS = [
  { line: 'rgba(52, 211, 153, 0.45)', tip: '#34d399', joint: '#6ee7b7' },
  { line: 'rgba(129, 140, 248, 0.45)', tip: '#818cf8', joint: '#a5b4fc' },
];

/** Contururi cheie Face Mesh (478 puncte) — oval, ochi, sprâncene, nas, buze */
const FACE_CONNECTIONS = [
  // Oval față
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  // Sprânceană stângă
  [70, 63], [63, 105], [105, 66], [66, 107],
  // Sprânceană dreaptă
  [336, 296], [296, 334], [334, 293], [293, 300],
  // Ochi stâng
  [33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154],
  [154, 155], [155, 133], [133, 173], [173, 157], [157, 158], [158, 159],
  [159, 160], [160, 161], [161, 246], [246, 33],
  // Ochi drept
  [362, 382], [382, 381], [381, 380], [380, 374], [374, 373], [373, 390],
  [390, 249], [249, 263], [263, 466], [466, 388], [388, 387], [387, 386],
  [386, 385], [385, 384], [384, 398], [398, 362],
  // Nas
  [1, 2], [2, 98], [98, 327], [1, 168], [168, 6], [6, 197], [197, 195], [195, 5],
  // Buze exterioare
  [61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405],
  [405, 321], [321, 375], [375, 291], [291, 409], [409, 270], [270, 269],
  [269, 267], [267, 0], [0, 37], [37, 39], [39, 40], [40, 185], [185, 61],
];

const FACE_KEY_POINTS = new Set([
  1, 33, 61, 133, 152, 263, 291, 362, // nas, ochi, buze, bărbie
]);

const FACE_COLOR = {
  line: 'rgba(56, 189, 248, 0.55)',
  tip: '#38bdf8',
  joint: '#7dd3fc',
};

/**
 * Schelet Pose — focus pe trunchi + brațe (ce folosim la LSR).
 * Indici MediaPipe Pose (33 puncte).
 */
const POSE_CONNECTIONS = [
  [11, 12], // umeri
  [11, 13], [13, 15], // braț stâng
  [12, 14], [14, 16], // braț drept
  [11, 23], [12, 24], // trunchi
  [23, 24], // șolduri
  [15, 17], [15, 19], [15, 21], // mână stângă (încheietură→degete)
  [16, 18], [16, 20], [16, 22], // mână dreaptă
  [0, 11], [0, 12], // nas → umeri (orientare cap)
];

const POSE_KEY_POINTS = new Set([0, 11, 12, 13, 14, 15, 16, 23, 24]);

const POSE_COLOR = {
  line: 'rgba(251, 191, 36, 0.55)',
  tip: '#fbbf24',
  joint: '#fcd34d',
};

const POSE_VISIBILITY_MIN = 0.5;

function mapVideo(video, canvasW, canvasH, fit) {
  const vw = video?.videoWidth || canvasW;
  const vh = video?.videoHeight || canvasH;
  const scale = fit === 'contain'
    ? Math.min(canvasW / vw, canvasH / vh)
    : Math.max(canvasW / vw, canvasH / vh);
  const drawW = vw * scale;
  const drawH = vh * scale;
  const offX = (canvasW - drawW) / 2;
  const offY = (canvasH - drawH) / 2;
  return {
    px: (p) => p.x * drawW + offX,
    py: (p) => p.y * drawH + offY,
  };
}

function drawSkeleton(ctx, points, connections, colors, tipSet, opts = {}) {
  if (!points?.length) return;
  const { px, py } = opts;
  const visible = opts.isVisible ?? (() => true);

  ctx.lineCap = 'round';
  ctx.lineWidth = opts.lineWidth ?? 2;
  ctx.strokeStyle = colors.line;

  for (const [a, b] of connections) {
    if (!points[a] || !points[b]) continue;
    if (!visible(points[a]) || !visible(points[b])) continue;
    ctx.beginPath();
    ctx.moveTo(px(points[a]), py(points[a]));
    ctx.lineTo(px(points[b]), py(points[b]));
    ctx.stroke();
  }

  const idxs = tipSet
    ? [...tipSet]
    : points.map((_, i) => i).filter((i) => points[i] && visible(points[i]));

  for (const i of idxs) {
    const p = points[i];
    if (!p || !visible(p)) continue;
    const isTip = tipSet?.has(i);
    const radius = isTip ? (opts.tipRadius ?? 6) : (opts.jointRadius ?? 3.5);
    ctx.beginPath();
    ctx.arc(px(p), py(p), radius, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? colors.tip : colors.joint;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }
}

function drawFaceGuide(ctx, px, py, faceFrame) {
  const cx = px({ x: FACE_FRAME.cx, y: FACE_FRAME.cy });
  const cy = py({ x: FACE_FRAME.cx, y: FACE_FRAME.cy });
  const rx = Math.abs(px({ x: FACE_FRAME.cx + FACE_FRAME.rx, y: FACE_FRAME.cy }) - cx);
  const ry = Math.abs(py({ x: FACE_FRAME.cx, y: FACE_FRAME.cy + FACE_FRAME.ry }) - cy);
  const ok = Boolean(faceFrame?.ok);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = ok ? 'rgba(52, 211, 153, 0.95)' : 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 2.5;
  if (!ok) ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Colțuri de vizor — cadranul, nu o ramă grea peste corp.
  const tick = Math.max(10, Math.min(rx, ry) * 0.22);
  const gap = 8;
  const left = cx - rx - gap;
  const right = cx + rx + gap;
  const top = cy - ry - gap;
  const bottom = cy + ry + gap;
  ctx.strokeStyle = ok ? 'rgba(52, 211, 153, 0.75)' : 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const corners = [
    [left, top + tick, left, top, left + tick, top],
    [right - tick, top, right, top, right, top + tick],
    [left, bottom - tick, left, bottom, left + tick, bottom],
    [right - tick, bottom, right, bottom, right, bottom - tick],
  ];
  for (const [x1, y1, x2, y2, x3, y3] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.stroke();
  }

  if (!ok && faceFrame?.hint) {
    const label = faceFrame.hint;
    ctx.translate(cx, cy + ry + 18);
    ctx.scale(-1, 1); // textul să rămână citibil în div-ul oglindă
    ctx.font = '700 13px Nunito, ui-rounded, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tw = ctx.measureText(label).width;
    const padX = 12;
    const h = 26;
    ctx.beginPath();
    ctx.moveTo(-tw / 2 - padX + 13, 0);
    ctx.arcTo(tw / 2 + padX, 0, tw / 2 + padX, h, 13);
    ctx.arcTo(tw / 2 + padX, h, -tw / 2 - padX, h, 13);
    ctx.arcTo(-tw / 2 - padX, h, -tw / 2 - padX, 0, 13);
    ctx.arcTo(-tw / 2 - padX, 0, tw / 2 + padX, 0, 13);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText(label, 0, 6);
  }
  ctx.restore();
}

/**
 * Canvas transparent: cadran față + schelet mâini / față / trunchi (object-cover aware).
 */
export default function HandCanvas({
  landmarks, face, pose, videoRef, videoFit = 'cover', faceFrame = null, showFaceFrame = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
    });

    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas.width === 0 || canvas.height === 0) return;

    const { px, py } = mapVideo(videoRef?.current, canvas.width, canvas.height, videoFit);
    const map = { px, py };

    if (showFaceFrame) drawFaceGuide(ctx, px, py, faceFrame);

    const hasHands = landmarks?.length > 0;
    const hasFace = face?.length > 0;
    const hasPose = pose?.length > 0;
    if (!hasHands && !hasFace && !hasPose) return;

    // Pose (amber) — sub mâini/față
    if (hasPose) {
      drawSkeleton(ctx, pose, POSE_CONNECTIONS, POSE_COLOR, POSE_KEY_POINTS, {
        ...map,
        lineWidth: 2.5,
        tipRadius: 6,
        jointRadius: 4,
        isVisible: (p) => (p.visibility ?? 1) >= POSE_VISIBILITY_MIN,
      });
    }

    // Față (cyan)
    if (hasFace) {
      drawSkeleton(ctx, face, FACE_CONNECTIONS, FACE_COLOR, FACE_KEY_POINTS, {
        ...map,
        lineWidth: 1.5,
        tipRadius: 4,
        jointRadius: 2,
      });
    }

    // Mâini (verde / violet)
    if (hasHands) {
      for (let hi = 0; hi < landmarks.length; hi++) {
        drawSkeleton(
          ctx,
          landmarks[hi],
          HAND_CONNECTIONS,
          HAND_COLORS[hi % HAND_COLORS.length],
          HAND_TIP_POINTS,
          { ...map, tipRadius: 7, jointRadius: 4 },
        );
      }
    }
  }, [landmarks, face, pose, videoRef, videoFit, faceFrame, showFaceFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// backwards-compatible export
export const CONNECTIONS = HAND_CONNECTIONS;
