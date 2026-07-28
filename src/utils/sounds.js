/**
 * Feedback sonor ușor (Web Audio) — fără fișiere externe.
 * Respectă preferința sunetului din useProgress.
 */

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq, duration, type = 'sine', gain = 0.08) {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playSuccess(enabled = true) {
  if (!enabled) return;
  tone(523.25, 0.12, 'sine', 0.07);
  setTimeout(() => tone(659.25, 0.14, 'sine', 0.07), 90);
  setTimeout(() => tone(783.99, 0.18, 'triangle', 0.06), 180);
}

export function playLevelUp(enabled = true) {
  if (!enabled) return;
  [392, 494, 587, 784].forEach((f, i) => {
    setTimeout(() => tone(f, 0.2, 'triangle', 0.08), i * 110);
  });
}

export function playTap(enabled = true) {
  if (!enabled) return;
  tone(440, 0.05, 'sine', 0.04);
}

export function playSkip(enabled = true) {
  if (!enabled) return;
  tone(300, 0.08, 'sine', 0.04);
}
