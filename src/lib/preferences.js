/**
 * Preferințe de aspect — temă și mărimea textului. Stau doar pe dispozitiv
 * (nu sunt progres, nu pleacă în cloud), într-o cheie separată de progres.
 *
 * `public/theme-init.js` citește aceeași cheie înainte de primul paint, ca să
 * nu clipească tema deschisă la pornire. Dacă schimbi cheia sau forma, schimb-o
 * și acolo.
 */
export const PREFS_KEY = 'signa-prefs-v1';

export const THEMES = ['light', 'dark', 'system'];

/** Pașii de mărime a textului. `1` = designul original. */
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3];

export const DEFAULT_PREFS = Object.freeze({ theme: 'system', textScale: 1 });

/** Culoarea barei de sistem (meta theme-color) pentru fiecare temă. */
const THEME_COLOR = { light: '#FFFBF3', dark: '#171512' };

export function sanitizePrefs(raw) {
  const theme = THEMES.includes(raw?.theme) ? raw.theme : DEFAULT_PREFS.theme;
  const textScale = TEXT_SCALES.includes(raw?.textScale) ? raw.textScale : DEFAULT_PREFS.textScale;
  return { theme, textScale };
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return sanitizePrefs(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function systemPrefersDark() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** `system` → tema efectivă, după setarea dispozitivului. */
export function resolveTheme(theme, prefersDark = systemPrefersDark()) {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return theme === 'dark' ? 'dark' : 'light';
}

/** Pune tema și scara pe `<html>`; CSS-ul face restul (vezi postcss.signa-theme.js). */
export function applyPrefs(prefs) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const resolved = resolveTheme(prefs.theme);
  root.dataset.theme = resolved;
  root.style.setProperty('--sg-text-scale', String(prefs.textScale));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved]);
}

/* ── Store minimal pentru useSyncExternalStore ──────────────────────── */

let current = null;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getPrefs() {
  if (!current) current = loadPrefs();
  return current;
}

let switchTimer = null;

/** Tranziție scurtă de culoare doar cât se schimbă tema (vezi `index.css`). */
function animateThemeSwitch() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add('sg-theme-switching');
  clearTimeout(switchTimer);
  switchTimer = setTimeout(() => root.classList.remove('sg-theme-switching'), 420);
}

export function setPrefs(patch) {
  const prev = getPrefs();
  current = sanitizePrefs({ ...prev, ...patch });
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(current));
  } catch { /* storage plin/blocat — preferința ține cât sesiunea */ }
  if (resolveTheme(prev.theme) !== resolveTheme(current.theme)) animateThemeSwitch();
  applyPrefs(current);
  emit();
}

export function subscribePrefs(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let started = false;

/**
 * Chemat o dată la pornire: aplică preferințele și urmărește tema sistemului,
 * ca „Automat” să se schimbe live când telefonul trece pe întunecat.
 */
export function initPrefs() {
  if (started || typeof window === 'undefined') return;
  started = true;
  applyPrefs(getPrefs());
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getPrefs().theme === 'system') {
        // Obiect nou: altfel useSyncExternalStore vede același snapshot și
        // nu re-randează eticheta „acum: întunecat”.
        current = { ...current };
        applyPrefs(current);
        emit();
      }
    });
  } catch { /* browsere vechi fără addEventListener pe MediaQueryList */ }
  // Altă filă a schimbat preferințele.
  window.addEventListener('storage', (e) => {
    if (e.key !== PREFS_KEY) return;
    current = loadPrefs();
    applyPrefs(current);
    emit();
  });
}
