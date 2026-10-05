/**
 * Plugin PostCSS pentru tema întunecată și mărimea textului.
 *
 * De ce plugin și nu clase `dark:` în JSX: aplicația are sute de culori
 * scrise direct în clase (`bg-white`, `bg-[#FBF7F0]`, `text-ink-900`,
 * gradienți arbitrari). Pluginul trece prin tot CSS-ul generat de Tailwind și,
 * pentru fiecare regulă care folosește o culoare deschisă din paleta Signa,
 * adaugă imediat după ea o copie sub `:where([data-theme="dark"])` cu culoarea
 * echivalentă din paleta întunecată. Specificitatea rămâne aceeași (`:where`
 * cântărește zero), deci ordinea hover/focus/breakpoint-uri se păstrează.
 *
 * Mărimea textului: orice `font-size`/`line-height` în px/rem devine
 * `calc(<valoare> * var(--sg-text-scale, 1))`. Scalează doar textul — spațierile
 * rem ale Tailwind rămân neatinse, deci layout-ul nu se „umflă” cu tot cu text.
 *
 * Reguli ca să nu strice ce e deja bun:
 * - textul alb/cream nu se inversează (stă pe butoane verzi sau bannere);
 * - albul translucid (`bg-white/[.14]` pe bannerul verde) nu se atinge;
 * - `ink` plin ca fundal (cipuri selectate cu text alb) devine un gri cald,
 *   nu deschis, ca textul alb să rămână lizibil;
 * - umbrele și keyframe-urile nu se ating;
 * - o regulă care menționează deja `data-theme` e scrisă de mână → se sare;
 * - `.sg-boot` (ecranul de pornire din index.html) rămâne verde cu plăcuță albă.
 */

const DARK = '[data-theme="dark"]';
const SCALE = 'var(--sg-text-scale, 1)';

/* Fundaluri, borduri, gradienți, inele. Cheie = culoarea din tema deschisă. */
export const SURFACE_MAP = {
  // alb + crem — suprafețele de bază
  '#ffffff': '#221f1b',
  '#fffbf3': '#171512', // cream
  '#fffefc': '#1a1815', // cream-50
  '#fff7e8': '#2a2219', // cream-100 / cardul de streak
  '#ffefd1': '#3a2d1c', // cream-200
  '#fffdf9': '#1c1a16', // sidebar
  '#fffdf7': '#1c1a16',
  '#fdfcf9': '#1c1a16', // inputuri
  '#fbf7f0': '#2a2620', // card de nivel, litere nevalidate
  '#fbf6ed': '#1f1c18',
  '#efeae0': '#332e27',
  '#fdf3e3': '#3b2c17',
  '#e5e7eb': '#38332c', // bordura implicită Tailwind
  // verde deschis
  '#ecfdf5': '#173828', // signa-50
  '#d1fae5': '#1b3b2d', // signa-100
  '#effaf4': '#15291f',
  '#f3faf6': '#15291f',
  '#f2fbf6': '#15291f',
  '#f3fbf6': '#15291f',
  '#e9f7f0': '#172d23',
  '#e4f5ec': '#1b3328',
  // chihlimbar / roșu / roz
  '#fffbeb': '#3a2c15', // amber-50
  '#fef3c7': '#3a2e15', // amber-100
  '#fde68a': '#5a4519', // amber-200
  '#fef2f2': '#2c1717', // red-50
  '#fee2e2': '#3d1c1c', // red-100
  '#fff1f2': '#2d1619', // rose-50
  '#fecdd3': '#5b2630', // rose-200
  // indigo / albastru / violet
  '#eef2ff': '#232650', // indigo-50
  '#c7d2fe': '#3a3f78', // indigo-200
  '#e8f1fd': '#1e2f4d',
  '#f1ecfb': '#2b2245',
  '#f4f1fb': '#2b2245',
};

/* Culoarea textului (și fill/stroke). Textul închis devine deschis. */
export const TEXT_MAP = {
  // ink — 900 cel mai contrastant, 400 cel mai discret
  '#2e2a24': '#f3eee6',
  '#4f473c': '#ddd5c8',
  '#6b6255': '#c4bbad',
  '#8a8071': '#aaa194',
  '#a69c8d': '#8d8477',
  '#c4baa9': '#6f675b',
  // verde închis
  '#064e3b': '#a7f3d0', // signa-900
  '#065f46': '#a7f3d0', // emerald-800
  '#047857': '#6ee7b7', // emerald-700
  '#059669': '#34d399', // signa-600
  // chihlimbar
  '#b45309': '#fbbf24', // amber-700
  '#92400e': '#fcd34d', // amber-800
  '#78350f': '#fde68a', // amber-900
  '#d97706': '#f59e0b', // amber-600
  // roșu / roz
  '#dc2626': '#f87171', // red-600
  '#be123c': '#fda4af', // rose-700
  '#e11d48': '#fb7185', // rose-600
  // indigo / violet / albastru
  '#4f46e5': '#a5b4fc', // indigo-600
  '#6d28d9': '#c4b5fd', // violet-700
  '#7c3aed': '#a78bfa', // violet-600
  '#2563eb': '#93c5fd', // blue-600
};

const INK = '#2e2a24';
/** `ink-900` translucid (tente, borduri fine) → același alfa pe crem deschis. */
const INK_TINT = '#f3eee6';
/** `ink-900` plin ca fundal — cipuri selectate cu text alb. */
const INK_SOLID = '#4a443b';

const TEXT_PROPS = new Set([
  'color', 'fill', 'stroke', 'caret-color', '-webkit-text-fill-color', 'text-decoration-color',
]);
const SKIP_PROPS = /shadow|filter/;

const COLOR_RE = /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b|rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})((?:\s*[,/]\s*[^)]*)?)\)/gi;

function hex2(n) {
  return Number(n).toString(16).padStart(2, '0');
}

function expandHex(h) {
  return h.length <= 4 ? h.split('').map((c) => c + c).join('') : h;
}

/** Alfa ca număr, sau 1 dacă e plin / `var(--tw-*-opacity)`. */
function parseAlpha(rest) {
  const m = /[,/]\s*([\d.]+)(%?)\s*$/.exec(rest || '');
  if (!m) return 1;
  const v = parseFloat(m[1]);
  return m[2] ? v / 100 : v;
}

function rgbTriplet(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Culoarea închisă pentru `key`, ținând cont de proprietate și alfa. */
function mapColor(key, alpha, isText) {
  if (isText) return TEXT_MAP[key] ?? null;
  if (key === INK) return alpha < 0.5 ? INK_TINT : INK_SOLID;
  // Albul translucid stă pe bannere colorate — rămâne cum e.
  if (key === '#ffffff' && alpha < 0.6) return null;
  return SURFACE_MAP[key] ?? null;
}

/** Înlocuiește culorile dintr-o valoare CSS. Întoarce null dacă nu s-a schimbat nimic. */
export function darkenValue(value, prop) {
  const isText = TEXT_PROPS.has(prop);
  let changed = false;
  const out = value.replace(COLOR_RE, (match, hex, r, g, b, rest) => {
    if (hex) {
      const full = expandHex(hex.toLowerCase());
      const key = `#${full.slice(0, 6)}`;
      const alphaHex = full.slice(6);
      const alpha = alphaHex ? parseInt(alphaHex, 16) / 255 : 1;
      const mapped = mapColor(key, alpha, isText);
      if (!mapped) return match;
      changed = true;
      return mapped + alphaHex;
    }
    const key = `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    const mapped = mapColor(key, parseAlpha(rest), isText);
    if (!mapped) return match;
    changed = true;
    const [nr, ng, nb] = rgbTriplet(mapped);
    // Separatorul se citește doar din triplet: alfa poate fi `var(--x, 1)`,
    // iar virgula de acolo ar produce `rgb(1, 2, 3 / …)` — CSS invalid.
    const triplet = match.slice(0, match.length - (rest || '').length - 1);
    const sep = triplet.includes(',') ? ', ' : ' ';
    const fn = match.toLowerCase().startsWith('rgba') ? 'rgba' : 'rgb';
    return `${fn}(${nr}${sep}${ng}${sep}${nb}${rest || ''})`;
  });
  return changed ? out : null;
}

/** Prefixează un selector ca să se aplice doar în tema întunecată. */
export function darkSelector(sel) {
  const s = sel.trim();
  if (/^html\b/.test(s)) return s.replace(/^html/, `html${DARK}`);
  if (/^:root\b/.test(s)) return s.replace(/^:root/, `:root${DARK}`);
  return `:where(${DARK}) ${s}`;
}

const SIZE_RE = /-?\d*\.?\d+(px|rem)\b/;

export function scaleValue(value) {
  if (!SIZE_RE.test(value) || value.includes('--sg-text-scale')) return null;
  return `calc(${value} * ${SCALE})`;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

export default function signaTheme() {
  return {
    postcssPlugin: 'signa-theme',
    OnceExit(root) {
      root.walkRules((rule) => {
        // `.sg-boot` = ecranul verde static din index.html: e de brand, arată
        // la fel în ambele teme.
        if (insideKeyframes(rule) || rule.selector.includes('data-theme') || rule.selector.includes('sg-boot')) return;

        let dark = null;
        rule.walkDecls((decl) => {
          // Mărimea textului — pe loc, în regula originală.
          if (decl.prop === 'font-size' || decl.prop === 'line-height') {
            const scaled = scaleValue(decl.value);
            if (scaled) decl.value = scaled;
          }
          if (SKIP_PROPS.test(decl.prop)) return;
          const v = darkenValue(decl.value, decl.prop);
          if (v === null) return;
          if (!dark) {
            dark = rule.clone();
            dark.removeAll();
            dark.selectors = rule.selectors.map(darkSelector);
          }
          dark.append(decl.clone({ value: v }));
        });

        if (dark) rule.after(dark);
      });
    },
  };
}
signaTheme.postcss = true;
