import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Randator 3D pentru dactileme. Fiecare deget e un tub continuu generat pe o
 * curbă Catmull-Rom prin articulații (nu capsule lipite, care lăsau umflături
 * la fiecare falangă), palma e un volum extrudat, iar desenul folosește
 * back-face culling, sortare pe adâncime, Lambert + specular, întunecare pe
 * silueta fiecărui deget și pe adâncime, ca degetele suprapuse să se separe.
 */

const FINGERS = [
  { ids: [1, 2, 3, 4],     fat: 1.34, tip: 20 },
  { ids: [5, 6, 7, 8],     fat: 1.02, tip: 8 },
  { ids: [9, 10, 11, 12],  fat: 1.06, tip: 12 },
  { ids: [13, 14, 15, 16], fat: 1.00, tip: 16 },
  { ids: [17, 18, 19, 20], fat: 0.88, tip: 20 },
];

/** Profil de rază pe lungimea degetului: ancoră în palmă → MCP → PIP → DIP → vârf. */
const PROFILE = [1.06, 1.0, 0.94, 0.86, 0.74];

const SKIN = { r: 241, g: 201, b: 172 };
const SKIN_DEEP = { r: 148, g: 94, b: 66 };
const SKIN_WARM = { r: 236, g: 176, b: 152 };
const PALM_TINT = { r: 240, g: 185, b: 168 };
const NAIL = { r: 248, g: 219, b: 211 };

function norm3(v) {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function mul(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function len(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function mixCol(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

function css(c) {
  return `rgb(${c.r | 0},${c.g | 0},${c.b | 0})`;
}

const LIGHT = norm3({ x: -0.40, y: 0.66, z: 0.64 });
const HALF = norm3({ x: LIGHT.x, y: LIGHT.y, z: LIGHT.z + 1 });

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return {
    x: f(p0.x, p1.x, p2.x, p3.x),
    y: f(p0.y, p1.y, p2.y, p3.y),
    z: f(p0.z, p1.z, p2.z, p3.z),
  };
}

/** Eșantionează o curbă Catmull-Rom prin puncte, cu rază interpolată liniar. */
function sampleCurve(ctrl, radii, perSeg) {
  const pts = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  const out = [];
  for (let i = 1; i < pts.length - 2; i++) {
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      out.push({
        p: catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], t),
        r: radii[i - 1] + (radii[i] - radii[i - 1]) * t,
      });
    }
  }
  out.push({ p: ctrl[ctrl.length - 1], r: radii[radii.length - 1] });
  return out;
}

/**
 * Tub în jurul unei curbe, cu cadre transportate paralel (fără răsucire)
 * și calotă rotundă la vârf.
 */
function tube(stations, radial, capRings, tint) {
  const faces = [];
  const n = stations.length;
  if (n < 2) return faces;

  const tangents = stations.map((_, i) => {
    const a = stations[Math.max(0, i - 1)].p;
    const b = stations[Math.min(n - 1, i + 1)].p;
    return norm3(sub(b, a));
  });

  let u = (() => {
    const t = tangents[0];
    const helper = Math.abs(t.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    return norm3(cross(t, helper));
  })();

  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = tangents[i];
    u = norm3(sub(u, mul(t, dot(u, t))));
    const v = norm3(cross(t, u));
    const row = [];
    for (let k = 0; k < radial; k++) {
      const ang = (k / radial) * Math.PI * 2;
      const dir = add(mul(u, Math.cos(ang)), mul(v, Math.sin(ang)));
      row.push({ p: add(stations[i].p, mul(dir, stations[i].r)), n: dir });
    }
    rings.push({ row, t: i / (n - 1) });
  }

  // Calotă la vârf, ca degetul să se termine bombat, nu tăiat.
  const last = stations[n - 1];
  const tipT = tangents[n - 1];
  const tipU = norm3(sub(u, mul(tipT, dot(u, tipT))));
  const tipV = norm3(cross(tipT, tipU));
  for (let c = 1; c <= capRings; c++) {
    const a = (c / capRings) * (Math.PI / 2);
    const rr = Math.cos(a) * last.r;
    const center = add(last.p, mul(tipT, Math.sin(a) * last.r * 0.92));
    const row = [];
    for (let k = 0; k < radial; k++) {
      const ang = (k / radial) * Math.PI * 2;
      const dir = add(mul(tipU, Math.cos(ang)), mul(tipV, Math.sin(ang)));
      const p = add(center, mul(dir, rr));
      row.push({ p, n: norm3(sub(p, last.p)) });
    }
    rings.push({ row, t: 1 });
  }

  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    for (let k = 0; k < radial; k++) {
      const j = (k + 1) % radial;
      const quad = [a.row[k], a.row[j], b.row[j], b.row[k]];
      faces.push({
        v: quad.map((x) => x.p),
        n: norm3(quad.reduce((s, x) => add(s, x.n), { x: 0, y: 0, z: 0 })),
        tint: tint * (a.t + b.t) * 0.5,
      });
    }
  }
  return faces;
}

/** Rotunjire Chaikin pe contur — palma nu mai arată ca un poligon tăiat. */
function chaikin(pts, passes = 2) {
  let out = pts;
  for (let p = 0; p < passes; p++) {
    const next = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i];
      const b = out[(i + 1) % out.length];
      next.push(add(mul(a, 0.75), mul(b, 0.25)));
      next.push(add(mul(a, 0.25), mul(b, 0.75)));
    }
    out = next;
  }
  return out;
}

/** Palma ca volum: contur rotunjit, extrudat pe normala palmei. */
function palmMesh(outline, normal, thickness) {
  const half = thickness / 2;
  const front = outline.map((p) => add(p, mul(normal, half)));
  const back = outline.map((p) => add(p, mul(normal, -half)));
  const faces = [
    { v: front, n: normal, palm: true },
    { v: [...back].reverse(), n: mul(normal, -1), palm: true },
  ];
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const e = sub(outline[j], outline[i]);
    faces.push({
      v: [front[i], front[j], back[j], back[i]],
      n: norm3(cross(e, normal)),
      palm: true,
    });
  }
  return faces;
}

/** 63 valori MediaPipe → nor de puncte 3D centrat, Y în sus, +Z spre cameră. */
function cloudFromPose(pose) {
  if (!pose || pose.length !== 63) return null;
  const raw = [];
  for (let i = 0; i < 21; i++) {
    raw.push({
      x: -pose[i * 3],
      y: -pose[i * 3 + 1],
      z: -(pose[i * 3 + 2] ?? 0) * 1.15,
    });
  }
  const unit = len(raw[0], raw[9]) || 1;
  const c = raw.reduce((s, p) => add(s, p), { x: 0, y: 0, z: 0 });
  const center = mul(c, 1 / 21);
  return raw.map((p) => mul(sub(p, center), 1 / unit));
}

function buildHand(cloud, detail) {
  const high = detail === 'high';
  const radial = high ? 20 : 15;
  const perSeg = high ? 5 : 4;
  const capRings = high ? 4 : 3;

  const spacing =
    (len(cloud[5], cloud[9]) + len(cloud[9], cloud[13]) + len(cloud[13], cloud[17])) / 3;
  // Degetele reale aproape se ating: rază ≈ jumătate din distanța dintre MCP-uri.
  const unitR = Math.max(spacing * 0.47, 0.085);

  const faces = [];
  for (const finger of FINGERS) {
    const [a, b, c, d] = finger.ids.map((i) => cloud[i]);
    const anchor = add(a, mul(norm3(sub(a, b)), unitR * 1.15));
    const radii = PROFILE.map((k) => k * unitR * finger.fat);
    const stations = sampleCurve([anchor, a, b, c, d], radii, perSeg);
    faces.push(...tube(stations, radial, capRings, 1));
  }

  // Palma: contur prin încheietură, baza degetului mare și MCP-uri, umflat spre exterior.
  const rim = [0, 1, 5, 9, 13, 17].map((i) => cloud[i]);
  const palmCenter = mul(rim.reduce((s, p) => add(s, p), { x: 0, y: 0, z: 0 }), 1 / rim.length);
  let normal = norm3(cross(sub(cloud[5], cloud[0]), sub(cloud[17], cloud[0])));
  // Convenție: fața palmară privește camera în pozele înregistrate (semnul se face spre cameră).
  if (normal.z < 0) normal = mul(normal, -1);

  const inflate = (p, k) => add(p, mul(norm3(sub(p, palmCenter)), unitR * k));
  // Palma coboară în încheietură cu două colțuri laterale, ca un singur volum:
  // un ciot separat ar atârna ca o bilă sub palmă.
  const across = norm3(sub(cloud[17], cloud[5]));
  const wristDir = norm3(sub(cloud[0], cloud[9]));
  const wristBase = add(cloud[0], mul(wristDir, unitR * 1.05));
  const outline = chaikin(
    [
      add(wristBase, mul(across, -unitR * 1.35)),
      add(cloud[0], mul(across, -unitR * 1.5)),
      inflate(cloud[1], 1.25),
      inflate(cloud[5], 1.0),
      inflate(cloud[9], 0.88),
      inflate(cloud[13], 0.9),
      inflate(cloud[17], 1.3),
      add(cloud[0], mul(across, unitR * 1.5)),
      add(wristBase, mul(across, unitR * 1.35)),
    ],
    2,
  );
  faces.push(...palmMesh(outline, normal, unitR * 2.0));

  // Unghii — arată instant care e dosul mâinii.
  const dorsal = mul(normal, -1);
  const nails = FINGERS.slice(1).map((finger) => {
    const tip = cloud[finger.ids[3]];
    const prev = cloud[finger.ids[2]];
    const r = unitR * PROFILE[4] * finger.fat;
    const dir = norm3(sub(tip, prev));
    return {
      center: add(add(tip, mul(dorsal, r * 0.68)), mul(dir, -r * 0.2)),
      dir,
      dorsal,
      r,
    };
  });

  return { faces, nails, normal };
}

function rotate(p, yaw, pitch) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return { x: x1, y: p.y * cp - z1 * sp, z: p.y * sp + z1 * cp };
}

const FOCAL = 5.2;

function shade(base, n, depth) {
  const diff = Math.max(0, dot(n, LIGHT));
  const spec = Math.pow(Math.max(0, dot(n, HALF)), 30) * 0.38;
  // Silueta se întunecă puțin: degetele lipite se citesc separat.
  const rim = Math.min(1, Math.max(0, n.z) / 0.45);
  let k = 0.38 + 0.66 * diff;
  k *= 0.80 + 0.20 * (rim * rim * (3 - 2 * rim));
  k *= 0.82 + 0.18 * depth;
  return mixCol(mixCol(SKIN_DEEP, base, k), { r: 255, g: 251, b: 246 }, spec);
}

function drawHand(ctx, w, h, hand, yaw, pitch, opts) {
  ctx.clearRect(0, 0, w, h);

  const rotated = hand.faces.map((f) => ({
    ...f,
    rv: f.v.map((p) => rotate(p, yaw, pitch)),
    rn: rotate(f.n, yaw, pitch),
  }));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const f of rotated) {
    for (const p of f.rv) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
  }
  const spanX = Math.max(maxX - minX, 0.1);
  const spanY = Math.max(maxY - minY, 0.1);
  const spanZ = Math.max(maxZ - minZ, 0.1);
  const pad = opts.pad ?? 0.86;
  const scale = Math.min((w * pad) / spanX, (h * pad) / spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const project = (p) => {
    const d = FOCAL / (FOCAL - p.z);
    return { x: w / 2 + (p.x - cx) * scale * d, y: h / 2 - (p.y - cy) * scale * d, z: p.z };
  };

  const groundY = h / 2 + (cy - minY) * scale + 6;
  const g = ctx.createRadialGradient(w / 2, groundY, 1, w / 2, groundY, spanX * scale * 0.62);
  g.addColorStop(0, 'rgba(46,42,36,0.20)');
  g.addColorStop(1, 'rgba(46,42,36,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(w / 2, groundY, spanX * scale * 0.6, spanX * scale * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  const visible = [];
  for (const f of rotated) {
    if (f.rn.z <= 0.01) continue;
    const pv = f.rv.map(project);
    let z = 0;
    for (const p of pv) z += p.z;
    visible.push({ pv, z: z / pv.length, n: f.rn, palm: f.palm, tint: f.tint });
  }
  visible.sort((a, b) => a.z - b.z);

  for (const f of visible) {
    const base = f.palm
      ? PALM_TINT
      : mixCol(SKIN, SKIN_WARM, (f.tint ?? 0) * 0.55);
    const color = css(shade(base, f.n, (f.z - minZ) / spanZ));
    ctx.beginPath();
    ctx.moveTo(f.pv[0].x, f.pv[0].y);
    for (let i = 1; i < f.pv.length; i++) ctx.lineTo(f.pv[i].x, f.pv[i].y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  for (const nail of hand.nails) {
    const rn = rotate(nail.dorsal, yaw, pitch);
    if (rn.z <= 0.12) continue;
    const rc = rotate(nail.center, yaw, pitch);
    const c = project(rc);
    const tipDir = rotate(nail.dir, yaw, pitch);
    const d = FOCAL / (FOCAL - rc.z);
    const r = nail.r * scale * d;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.atan2(-tipDir.y, tipDir.x) + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${NAIL.r},${NAIL.g},${NAIL.b},${0.3 + rn.z * 0.5})`;
    ctx.fill();
    ctx.restore();
  }

  return { palmToViewer: rotate(hand.normal, yaw, pitch).z > 0 };
}

/**
 * Dactilemă 3D — volum, lumină, unghii pe dos, rotire cu mouse-ul.
 */
export default function ReferenceHand3D({
  pose,
  className = '',
  interactive = false,
  detail = 'low',
  yaw: yaw0 = 0.42,
  pitch: pitch0 = -0.16,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const angles = useRef({ yaw: yaw0, pitch: pitch0 });
  const drag = useRef(null);
  const [facing, setFacing] = useState(true);
  const [hint, setHint] = useState(interactive);

  const hand = useMemo(() => {
    const cloud = cloudFromPose(pose);
    return cloud ? buildHand(cloud, detail) : null;
  }, [pose, detail]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !hand) return undefined;
    const ctx = canvas.getContext('2d');

    const paint = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 8 || h < 8) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const info = drawHand(ctx, w, h, hand, angles.current.yaw, angles.current.pitch, {
        pad: interactive ? 0.8 : 0.88,
      });
      setFacing(info.palmToViewer);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);

    let raf = 0;
    const onDown = (e) => {
      if (!interactive) return;
      drag.current = { x: e.clientX, y: e.clientY, ...angles.current };
      setHint(false);
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (!drag.current) return;
      angles.current.yaw = drag.current.yaw + (e.clientX - drag.current.x) * 0.011;
      angles.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, drag.current.pitch + (e.clientY - drag.current.y) * 0.009),
      );
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    const onUp = () => {
      drag.current = null;
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [hand, interactive]);

  if (!hand) {
    return (
      <div className={`flex items-center justify-center text-ink-400 text-[10px] ${className}`}>?</div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${
          interactive ? 'cursor-grab active:cursor-grabbing touch-none' : ''
        }`}
      />
      <span
        className="absolute top-1 left-1 px-2 py-0.5 rounded-full bg-white/85 text-ink-600
          text-[9px] font-extrabold uppercase tracking-[0.12em] pointer-events-none"
      >
        {facing ? 'palmă' : 'dos'}
      </span>
      {interactive && hint && (
        <p
          className="absolute bottom-1.5 left-0 right-0 text-center text-[11px] font-semibold
            text-ink-400 pointer-events-none"
        >
          trage ca să rotești
        </p>
      )}
    </div>
  );
}
