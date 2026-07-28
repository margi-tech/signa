import { useEffect, useMemo, useState } from 'react';

const VIEW = 100;
const PAD  = 15;

const FINGERS = [
  { chain: [1, 2, 3, 4],     widths: [12, 10.5, 9] },
  { chain: [5, 6, 7, 8],     widths: [10.5, 9, 7.5] },
  { chain: [9, 10, 11, 12],  widths: [10.5, 9, 7.5] },
  { chain: [13, 14, 15, 16], widths: [10, 8.5, 7] },
  { chain: [17, 18, 19, 20], widths: [9, 7.5, 6.5] },
];

const PALM = [0, 1, 5, 9, 13, 17];

const THEMES = {
  dark:  { hand: '#e2e8f0', palm: '#cbd5e1', halo: '#0f172a' },
  light: { hand: '#6B6255', palm: '#8A8071', halo: '#FFF7E8' },
};

function smoothClosedPath(pts) {
  const n = pts.length;
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + ' Z';
}

function poseToPoints(pose) {
  if (!pose || pose.length !== 63) return null;
  const pts = [];
  for (let i = 0; i < 21; i++) {
    pts.push({ x: -pose[i * 3], y: pose[i * 3 + 1] });
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (VIEW - PAD * 2) / span;
  const offX = (VIEW - (maxX - minX) * scale) / 2;
  const offY = (VIEW - (maxY - minY) * scale) / 2;
  return pts.map((p) => ({
    x: (p.x - minX) * scale + offX,
    y: (p.y - minY) * scale + offY,
  }));
}

/**
 * Mâna de referință (cartoon).
 * @param {number[]} [pose]     63 valori (format vechi, o mână)
 * @param {number[][]} [frames] secvență de poze — animează semnele dinamice
 * @param {'dark'|'light'} [theme]
 */
export default function ReferenceHand({ pose, frames, className = '', theme = 'dark' }) {
  const palette = THEMES[theme] ?? THEMES.dark;
  const [frameIdx, setFrameIdx] = useState(0);

  const sequence = useMemo(() => {
    if (frames?.length) return frames.filter((f) => f?.length === 63);
    if (pose?.length === 63) return [pose];
    return [];
  }, [frames, pose]);

  useEffect(() => {
    if (sequence.length < 2) return;
    const id = setInterval(() => {
      setFrameIdx((i) => (i + 1) % sequence.length);
    }, 90);
    return () => clearInterval(id);
  }, [sequence]);

  const activePose = sequence[frameIdx] ?? sequence[0];
  const points = useMemo(() => poseToPoints(activePose), [activePose]);

  if (!points || !activePose) {
    return (
      <div className={`flex items-center justify-center text-ink-400 text-[10px] ${className}`}>
        ?
      </div>
    );
  }

  const seg = (a, b) =>
    `M${points[a].x.toFixed(1)} ${points[a].y.toFixed(1)} L${points[b].x.toFixed(1)} ${points[b].y.toFixed(1)}`;
  const fullPath = (chain) =>
    chain.map((id, i) => `${i === 0 ? 'M' : 'L'}${points[id].x.toFixed(1)} ${points[id].y.toFixed(1)}`).join(' ');

  const byDepth = [...FINGERS].sort((a, b) => {
    const za = a.chain.reduce((s, id) => s + activePose[id * 3 + 2], 0) / a.chain.length;
    const zb = b.chain.reduce((s, id) => s + activePose[id * 3 + 2], 0) / b.chain.length;
    return zb - za;
  });

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className={className}>
      <path
        d={smoothClosedPath(PALM.map((id) => points[id]))}
        fill={palette.palm}
        stroke={palette.palm}
        strokeWidth="9"
        strokeLinejoin="round"
      />
      {byDepth.map(({ chain, widths }, fi) => (
        <g key={fi}>
          <path
            d={fullPath(chain)}
            fill="none"
            stroke={palette.halo}
            strokeWidth={widths[0] + 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {widths.map((wd, si) => (
            <path
              key={si}
              d={seg(chain[si], chain[si + 1])}
              fill="none"
              stroke={palette.hand}
              strokeWidth={wd}
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
      {sequence.length > 1 && (
        <circle cx="88" cy="12" r="4" fill="#818cf8" opacity="0.85">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
