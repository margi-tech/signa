import { useEffect, useId, useMemo, useState } from 'react';

const VIEW = 100;
const PAD = 10;

/** Indici MediaPipe: 0 wrist, 1–4 thumb, 5–8 index … 17–20 pinky. */
const DIGITS = [
  { name: 'thumb',  chain: [1, 2, 3, 4],     taper: [1.05, 0.96, 0.86, 0.68], fat: 1.18 },
  { name: 'index',  chain: [5, 6, 7, 8],     taper: [1.00, 0.90, 0.78, 0.60], fat: 0.96 },
  { name: 'middle', chain: [9, 10, 11, 12],  taper: [1.00, 0.90, 0.78, 0.60], fat: 1.00 },
  { name: 'ring',   chain: [13, 14, 15, 16], taper: [1.00, 0.90, 0.78, 0.60], fat: 0.94 },
  { name: 'pinky',  chain: [17, 18, 19, 20], taper: [0.92, 0.84, 0.72, 0.56], fat: 0.82 },
];

const THEMES = {
  dark: {
    skin: '#E3C8B2',
    skinDeep: '#C4A084',
    skinLight: '#F3E2D2',
    palm: '#E8B89A',
    stroke: '#B08464',
    nail: '#E8B6A8',
    nailEdge: '#D09A8C',
    crease: 'rgba(120, 72, 48, 0.32)',
    shadow: '#020617',
  },
  light: {
    skin: '#E6C0A4',
    skinDeep: '#C99270',
    skinLight: '#F6DCC8',
    palm: '#EBB59A',
    stroke: '#C48964',
    nail: '#E8B4A6',
    nailEdge: '#D09484',
    crease: 'rgba(130, 70, 45, 0.30)',
    shadow: '#2E2A24',
  },
};

function hypot(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: (a.z || 0) + (b.z || 0) };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
}

function mul(v, s) {
  return { x: v.x * s, y: v.y * s, z: (v.z || 0) * s };
}

function nrm(v, fb = { x: 1, y: 0 }) {
  const l = Math.hypot(v.x, v.y);
  return l < 1e-5 ? fb : { x: v.x / l, y: v.y / l };
}

function perp(v) {
  return { x: -v.y, y: v.x };
}

function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * t };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmt(p) {
  return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}

/** Poligon cu colțuri rotunjite — fără overshoot Catmull (care făcea degetele „țevi”). */
function roundedPoly(pts, radius = 2.2) {
  const n = pts.length;
  if (n < 3) return '';
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const dIn = hypot(p1, p0);
    const dOut = hypot(p2, p1);
    const r = Math.min(radius, dIn * 0.42, dOut * 0.42);
    const start = add(p1, mul(nrm(sub(p1, p0)), -r));
    const end = add(p1, mul(nrm(sub(p2, p1)), r));
    if (i === 0) d = `M${fmt(start)}`;
    else d += ` L${fmt(start)}`;
    d += ` Q${fmt(p1)} ${fmt(end)}`;
  }
  return `${d} Z`;
}

function layoutPose(pose) {
  if (!pose || pose.length !== 63) return null;
  const raw = [];
  for (let i = 0; i < 21; i++) {
    raw.push({ x: -pose[i * 3], y: pose[i * 3 + 1], z: pose[i * 3 + 2] });
  }

  const w = raw[0];
  const mid = raw[9];
  const along = nrm(sub(w, mid));
  const across = perp(along);
  const palmW = hypot(raw[5], raw[17]) || 0.7;
  const palmL = hypot(w, mid) || 0.8;
  const wristLen = clamp(palmL * 0.38, palmW * 0.28, palmW * 0.55);
  const half = palmW * 0.34;

  const wr = add(add(w, mul(along, wristLen * 0.08)), mul(across, half));
  const wu = add(add(w, mul(along, wristLen * 0.08)), mul(across, -half));
  const cuffA = add(add(w, mul(along, wristLen)), mul(across, half * 0.72));
  const cuffB = add(add(w, mul(along, wristLen)), mul(across, -half * 0.72));

  const extras = [wr, wu, cuffA, cuffB];
  const xs = [...raw, ...extras].map((p) => p.x);
  const ys = [...raw, ...extras].map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const scale = (VIEW - PAD * 2) / span;
  const offX = (VIEW - (maxX - minX) * scale) / 2;
  const offY = (VIEW - (maxY - minY) * scale) / 2;
  const map = (p) => ({
    x: (p.x - minX) * scale + offX,
    y: (p.y - minY) * scale + offY,
    z: p.z,
  });

  return {
    points: raw.map(map),
    wrist: { wr: map(wr), wu: map(wu), cuffA: map(cuffA), cuffB: map(cuffB), along: { x: along.x, y: along.y } },
  };
}

/** Rază la MCP: jumătate din distanța până la vecin, plafonată — degetele se ating când sunt lipite. */
function mcpRadius(points, mcpId, fat) {
  const mcps = [5, 9, 13, 17];
  const i = mcps.indexOf(mcpId);
  const palmW = hypot(points[5], points[17]) || 30;
  const dists = [];
  if (i >= 0) {
    if (i > 0) dists.push(hypot(points[mcpId], points[mcps[i - 1]]));
    if (i < 3) dists.push(hypot(points[mcpId], points[mcps[i + 1]]));
  } else {
    dists.push(hypot(points[1], points[5]));
  }
  const neighbor = dists.length ? Math.min(...dists) : palmW * 0.28;
  const r = neighbor * 0.40 * fat;
  return clamp(r, palmW * 0.07, palmW * 0.14);
}

function tangentAt(pts, i) {
  if (i === 0) return nrm(sub(pts[1], pts[0]));
  if (i === pts.length - 1) return nrm(sub(pts[i], pts[i - 1]));
  return nrm(add(nrm(sub(pts[i], pts[i - 1])), nrm(sub(pts[i + 1], pts[i]))));
}

/**
 * Siluetă de deget: offset stânga/dreapta pe schelet + cap rotunjit (nu stroke).
 * Baza e împinsă în palmă ca să se lipească de mână.
 */
function fingerSilhouette(points, digit) {
  const bones = digit.chain.map((id) => points[id]);
  const baseR = mcpRadius(points, digit.chain[0], digit.fat);
  const radii = digit.taper.map((t) => baseR * t);

  const intoPalm = nrm(sub(bones[0], bones[1]));
  const skeleton = [add(bones[0], mul(intoPalm, radii[0] * 0.55)), ...bones];
  const rad = [radii[0] * 1.02, ...radii];

  const left = [];
  const right = [];
  let side = perp(tangentAt(skeleton, 0));
  for (let i = 0; i < skeleton.length; i++) {
    const t = tangentAt(skeleton, i);
    let n = perp(t);
    if (n.x * side.x + n.y * side.y < 0) n = mul(n, -1);
    side = n;
    left.push(add(skeleton[i], mul(n, rad[i])));
    right.push(add(skeleton[i], mul(n, -rad[i])));
  }

  const tip = bones[bones.length - 1];
  const tTip = nrm(sub(tip, bones[bones.length - 2]));
  const nTip = nrm(sub(left[left.length - 1], tip));
  const cap = [];
  const rTip = radii[radii.length - 1];
  for (let k = 1; k <= 7; k++) {
    const a = (Math.PI * k) / 8;
    const dir = add(mul(nTip, Math.cos(a)), mul(tTip, Math.sin(a)));
    cap.push(add(tip, mul(dir, rTip)));
  }

  const outline = [...left, ...cap, ...right.slice().reverse()];
  const d = roundedPoly(outline, Math.max(1.4, radii[0] * 0.55));

  const creases = [];
  for (const jointIdx of [1, 2]) {
    if (!bones[jointIdx] || !bones[jointIdx + 1]) continue;
    const j = bones[jointIdx];
    const t = nrm(sub(bones[jointIdx], bones[jointIdx - 1]));
    const n = perp(t);
    const rr = radii[jointIdx] * 0.52;
    const a = add(j, mul(n, rr));
    const b = add(j, mul(n, -rr));
    creases.push(`M${fmt(a)} L${fmt(b)}`);
  }

  const nailFrom = bones[bones.length - 2];
  const nailTo = bones[bones.length - 1];
  const nailDir = nrm(sub(nailTo, nailFrom));
  const nailN = perp(nailDir);
  const nw = radii[radii.length - 1] * 0.72;
  const nh = radii[radii.length - 1] * 0.85;
  const nailC = add(nailTo, mul(nailDir, -rTip * 0.35));

  const z = digit.chain.reduce((s, id) => s + points[id].z, 0) / digit.chain.length;

  return { d, creases, nailC, nailDir, nailN, nw, nh, z, name: digit.name };
}

function palmFacing(points) {
  const zPalm = (points[5].z + points[9].z + points[13].z + points[0].z) / 4;
  const zTips = (points[8].z + points[12].z + points[16].z) / 3;
  return zTips > zPalm - 0.015;
}

function palmOutline(points, wrist) {
  const p = points;
  const c = {
    x: (p[0].x + p[5].x + p[9].x + p[13].x + p[17].x) / 5,
    y: (p[0].y + p[5].y + p[9].y + p[13].y + p[17].y) / 5,
  };
  const towardWrist = nrm(sub(p[0], p[9]));
  const out = (pt, k) => add(pt, mul(nrm(sub(pt, c)), k));

  const web = (a, b) => {
    const mid = lerp(a, b, 0.5);
    return add(mid, mul(towardWrist, hypot(a, b) * 0.32));
  };

  const thenar = add(lerp(p[0], p[1], 0.62), mul(nrm(sub(p[1], c)), hypot(p[0], p[1]) * 0.28));
  const crotch = add(lerp(p[2], p[5], 0.42), mul(towardWrist, hypot(p[2], p[5]) * 0.18));
  const hypo = add(lerp(p[0], p[17], 0.58), mul(nrm(sub(p[17], c)), hypot(p[0], p[17]) * 0.16));

  const kn = (id) => out(p[id], hypot(p[5], p[17]) * 0.04);

  return roundedPoly([
    wrist.cuffA,
    wrist.wr,
    thenar,
    crotch,
    kn(5),
    web(p[5], p[9]),
    kn(9),
    web(p[9], p[13]),
    kn(13),
    web(p[13], p[17]),
    kn(17),
    hypo,
    wrist.wu,
    wrist.cuffB,
  ], 3.2);
}

function palmCreases(points) {
  const p = points;
  const q = (a, ctrl, b) => `M${fmt(a)} Q${fmt(ctrl)} ${fmt(b)}`;
  const life = q(
    lerp(p[5], p[1], 0.35),
    lerp(p[0], p[9], 0.35),
    lerp(p[0], p[17], 0.25),
  );
  const head = q(
    lerp(p[5], p[0], 0.28),
    lerp(p[9], p[0], 0.38),
    lerp(p[17], p[0], 0.30),
  );
  const heart = q(
    lerp(p[5], p[9], 0.2),
    lerp(p[9], p[13], 0.5),
    lerp(p[13], p[17], 0.35),
  );
  return [life, head, heart];
}

function nailPath(s) {
  const { nailC, nailDir, nailN, nw, nh } = s;
  const hx = mul(nailN, nw);
  const hy = mul(nailDir, nh);
  const a = add(add(nailC, hx), mul(hy, -0.15));
  const b = add(add(nailC, mul(hx, -1)), mul(hy, -0.15));
  const c = add(add(nailC, mul(hx, -1)), mul(hy, 0.85));
  const d = add(add(nailC, hx), mul(hy, 0.85));
  return roundedPoly([a, b, c, d], 1.1);
}

/**
 * Mână cartoon anatomică — siluete, nu tuburi.
 * Pose: 63 valori (21 puncte × xyz), oglindită pe X.
 */
export default function ReferenceHand({ pose, frames, className = '', theme = 'light' }) {
  const uid = useId().replace(/:/g, '');
  const palette = THEMES[theme] ?? THEMES.light;
  const [frameIdx, setFrameIdx] = useState(0);

  const sequence = useMemo(() => {
    if (frames?.length) return frames.filter((f) => f?.length === 63);
    if (pose?.length === 63) return [pose];
    return [];
  }, [frames, pose]);

  useEffect(() => {
    if (sequence.length < 2) return undefined;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % sequence.length), 90);
    return () => clearInterval(id);
  }, [sequence]);

  const activePose = sequence[frameIdx] ?? sequence[0];
  const layout = useMemo(() => layoutPose(activePose), [activePose]);

  const digits = useMemo(() => {
    if (!layout) return [];
    return DIGITS.map((digit) => fingerSilhouette(layout.points, digit)).sort((a, b) => b.z - a.z);
  }, [layout]);

  if (!layout) {
    return (
      <div className={`flex items-center justify-center text-ink-400 text-[10px] ${className}`}>
        ?
      </div>
    );
  }

  const { points, wrist } = layout;
  const showNails = !palmFacing(points);
  const palmD = palmOutline(points, wrist);
  const creases = palmCreases(points);
  const thenar = lerp(points[0], points[1], 0.45);
  const fill = showNails ? `url(#skin-${uid})` : `url(#palm-${uid})`;

  const body = (extra) => (
    <g {...extra}>
      <path d={palmD} />
      {digits.map((s) => (
        <path key={s.name} d={s.d} />
      ))}
    </g>
  );

  const fingerGaps = [];
  const mcps = [5, 9, 13, 17];
  const tips = [8, 12, 16, 20];
  for (let i = 0; i < 3; i++) {
    const a = lerp(points[mcps[i]], points[mcps[i + 1]], 0.5);
    const b = lerp(points[tips[i]], points[tips[i + 1]], 0.5);
    const start = lerp(a, b, 0.08);
    const end = lerp(a, b, 0.92);
    fingerGaps.push(`M${fmt(start)} L${fmt(end)}`);
  }

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className={className} overflow="visible">
      <defs>
        <radialGradient id={`skin-${uid}`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor={palette.skinLight} />
          <stop offset="48%" stopColor={palette.skin} />
          <stop offset="100%" stopColor={palette.skinDeep} />
        </radialGradient>
        <radialGradient id={`palm-${uid}`} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor={palette.palm} />
          <stop offset="70%" stopColor={palette.skin} />
          <stop offset="100%" stopColor={palette.skinDeep} />
        </radialGradient>
        <filter id={`sh-${uid}`} x="-18%" y="-18%" width="140%" height="140%">
          <feDropShadow dx="1" dy="1.8" stdDeviation="1.4" floodColor={palette.shadow} floodOpacity="0.16" />
        </filter>
      </defs>

      <g filter={`url(#sh-${uid})`}>
        {/* Contur unic: umplem totul cu culoarea de stroke, apoi pielea peste — muchiile interne dispar. */}
        {body({ fill: palette.stroke, stroke: palette.stroke, strokeWidth: 2.15, strokeLinejoin: 'round' })}
        {body({ fill, stroke: 'none' })}

        {!showNails && (
          <>
            <ellipse cx={thenar.x} cy={thenar.y} rx="7" ry="9" fill={palette.palm} opacity="0.4" />
            {creases.map((d) => (
              <path key={d} d={d} fill="none" stroke={palette.crease} strokeWidth="0.7" strokeLinecap="round" />
            ))}
          </>
        )}

        {fingerGaps.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke={palette.crease}
            strokeWidth="0.55"
            strokeLinecap="round"
            opacity="0.55"
          />
        ))}

        {digits.map((s) => (
          <g key={`d-${s.name}`}>
            {s.creases.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke={palette.crease}
                strokeWidth="0.5"
                strokeLinecap="round"
                opacity={showNails ? 0.4 : 0.65}
              />
            ))}
            {showNails && (
              <path
                d={nailPath(s)}
                fill={palette.nail}
                stroke={palette.nailEdge}
                strokeWidth="0.35"
                opacity="0.92"
              />
            )}
          </g>
        ))}
      </g>

      {sequence.length > 1 && (
        <circle cx="90" cy="10" r="3.5" fill="#818cf8" opacity="0.9">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}
