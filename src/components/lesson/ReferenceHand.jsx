import { useMemo } from 'react';

const VIEW = 100;   // viewBox pătrat
const PAD  = 15;    // padding intern (acoperă și grosimea degetelor)

// Lanțurile de articulații per deget (MediaPipe)
const FINGERS = [
  { chain: [1, 2, 3, 4],     widths: [12, 10.5, 9] },   // degetul mare — mai gros
  { chain: [5, 6, 7, 8],     widths: [10.5, 9, 7.5] },  // arătătorul
  { chain: [9, 10, 11, 12],  widths: [10.5, 9, 7.5] },  // mijlociul
  { chain: [13, 14, 15, 16], widths: [10, 8.5, 7] },    // inelarul
  { chain: [17, 18, 19, 20], widths: [9, 7.5, 6.5] },   // micul deget
];

// Conturul palmei: încheietură + bazele degetelor
const PALM = [0, 1, 5, 9, 13, 17];

const HAND  = '#e2e8f0';   // degetele (slate-200)
const PALMC = '#cbd5e1';   // palma, ușor mai închisă — dă adâncime
const HALO  = '#0f172a';   // fundalul casetei — separă degetele vizual

/** Curbă închisă netedă (Catmull-Rom → cubic Bézier) prin puncte */
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

/**
 * Mâna de referință în stil cartoon natural, desenată din poza reală
 * cea mai reprezentativă (medoid) a semnului din datele de colectare.
 *
 * Naturalețe:
 *  • degetele se subțiază spre vârf (segmente cu grosimi descrescătoare)
 *  • palma e o curbă netedă, nu un poligon
 *  • degetele sunt desenate în ordinea adâncimii (z), cu halo de separare
 *
 * @param {number[]} pose  63 valori [x,y,z, ...] din reference-poses.json
 */
export default function ReferenceHand({ pose, className = '' }) {
  const points = useMemo(() => {
    if (!pose || pose.length !== 63) return null;

    // Extrage (x, y), oglindit pe X (aplicația afișează camera în oglindă)
    const pts = [];
    for (let i = 0; i < 21; i++) {
      pts.push({ x: -pose[i * 3], y: pose[i * 3 + 1] });
    }

    // Încadrare în viewBox cu proporții păstrate
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
  }, [pose]);

  if (!points) return null;

  const seg = (a, b) =>
    `M${points[a].x.toFixed(1)} ${points[a].y.toFixed(1)} L${points[b].x.toFixed(1)} ${points[b].y.toFixed(1)}`;
  const fullPath = (chain) =>
    chain.map((id, i) => `${i === 0 ? 'M' : 'L'}${points[id].x.toFixed(1)} ${points[id].y.toFixed(1)}`).join(' ');

  // Ordinea de desenare după adâncime: degetele depărtate primele,
  // cele apropiate de cameră ultimele (z-ul MediaPipe scade spre cameră)
  const byDepth = [...FINGERS].sort((a, b) => {
    const za = a.chain.reduce((s, id) => s + pose[id * 3 + 2], 0) / a.chain.length;
    const zb = b.chain.reduce((s, id) => s + pose[id * 3 + 2], 0) / b.chain.length;
    return zb - za;
  });

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className={className}>
      {/* Palma — contur curbat, plin */}
      <path
        d={smoothClosedPath(PALM.map((id) => points[id]))}
        fill={PALMC}
        stroke={PALMC}
        strokeWidth="9"
        strokeLinejoin="round"
      />

      {/* Degetele — halo de separare + segmente tot mai subțiri spre vârf */}
      {byDepth.map(({ chain, widths }, fi) => (
        <g key={fi}>
          {/* Halo pe tot degetul, în culoarea fundalului */}
          <path
            d={fullPath(chain)}
            fill="none"
            stroke={HALO}
            strokeWidth={widths[0] + 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Segmente cu grosimi descrescătoare — efect de deget natural */}
          {widths.map((wd, si) => (
            <path
              key={si}
              d={seg(chain[si], chain[si + 1])}
              fill="none"
              stroke={HAND}
              strokeWidth={wd}
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
