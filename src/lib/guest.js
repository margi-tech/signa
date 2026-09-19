/**
 * Modul invitat: o sesiune de învățare fără cont.
 * E doar un flag local — invitatul nu are `user_id`, deci nimic din ce cere
 * identitate (profil, clasament, social, dataset) nu i se aplică.
 * Vezi `docs/guest-mode.md`.
 */
const KEY = 'signa-guest-v1';

/**
 * Se pune la intrarea în modul invitat, nu la login: așa nu contează în ce
 * ordine se înregistrează ascultătorii de `onAuthStateChange`. Doar
 * `consumeGuestConversion()` îl scoate — `exitGuest()` nu-l atinge.
 */
const CONVERT_KEY = 'signa-guest-convert-v1';

/**
 * Invitatul are propriul slate de progres. Cheia stă aici, nu în
 * useProgressSync, ca modulul să-și poată curăța singur datele expirate.
 */
export const GUEST_PROGRESS_KEY = 'signa-progress-guest-v1';

/**
 * Cât timp de *inactivitate* mai poate fi revendicat progresul de invitat.
 * Fiecare scriere de progres îl reîmprospătează, deci un invitat care învață
 * zile la rând nu pierde nimic; expiră doar un slate uitat pe un dispozitiv,
 * ca să nu-l absoarbă altcineva care se loghează peste luni.
 */
export const CONVERSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isGuestSession() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function touchGuestConversion() {
  try {
    localStorage.setItem(CONVERT_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function enterGuest() {
  try {
    localStorage.setItem(KEY, '1');
  } catch { /* storage plin — modul invitat ține doar cât sesiunea */ }
  touchGuestConversion();
}

export function exitGuest() {
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
}

/**
 * True o singură dată, dacă progresul local mai așteaptă să fie mutat pe cont.
 * Un slate expirat nu se revendică — se șterge, ca să nu rămână pe disc.
 */
export function consumeGuestConversion() {
  try {
    const raw = localStorage.getItem(CONVERT_KEY);
    localStorage.removeItem(CONVERT_KEY);
    if (!raw) return false;

    const at = Number(raw);
    // '1' e marcajul din versiunea fără timestamp — îl tratăm ca proaspăt.
    if (!Number.isFinite(at) || at <= 1) return true;
    if (Date.now() - at < CONVERSION_TTL_MS) return true;

    localStorage.removeItem(GUEST_PROGRESS_KEY);
    return false;
  } catch {
    return false;
  }
}
