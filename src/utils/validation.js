/* Validări client-side pentru formularele de autentificare (login/signup). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(value.trim());
}

/** Parolă: minim 5 caractere, cel puțin o cifră. */
export function isValidPassword(value) {
  return value.length >= 5 && /\d/.test(value);
}
