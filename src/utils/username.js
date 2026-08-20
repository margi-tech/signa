export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

export function normalizeUsername(raw) {
  return String(raw ?? '').trim();
}

/** @returns {string|null} mesaj de eroare sau null dacă e valid */
export function validateUsername(raw) {
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN) {
    return 'Username-ul trebuie să aibă minim 3 caractere.';
  }
  if (username.length > USERNAME_MAX) {
    return 'Username-ul poate avea maxim 20 de caractere.';
  }
  if (/\s/.test(username)) {
    return 'Username-ul nu poate conține spații.';
  }
  if (!USERNAME_RE.test(username)) {
    return 'Folosește doar litere, cifre, punct sau underscore.';
  }
  return null;
}

/**
 * Ticket-ul cere minim 5 caractere + cel puțin o cifră. Păstrăm 8 (mai strict,
 * și cât cere oricum Supabase Auth), plus verificarea de cifră.
 */
export function validatePassword(raw) {
  const password = String(raw ?? '');
  if (password.length < 8) {
    return 'Parola trebuie să aibă minim 8 caractere.';
  }
  if (!/\d/.test(password)) {
    return 'Parola trebuie să conțină cel puțin o cifră.';
  }
  return null;
}

/** Confirmarea parolei la signup — trebuie să fie identică. */
export function validatePasswordConfirm(password, confirm) {
  if (!String(confirm ?? '')) {
    return 'Confirmă parola.';
  }
  if (String(password ?? '') !== String(confirm)) {
    return 'Parolele nu coincid.';
  }
  return null;
}

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Email: obligatoriu, fără spații, forma local@domeniu.tld */
export function validateEmail(raw) {
  const email = String(raw ?? '').trim();
  if (!email) return 'Emailul e obligatoriu.';
  if (/\s/.test(String(raw ?? ''))) return 'Emailul nu poate conține spații.';
  if (email.length > 254) return 'Emailul e prea lung.';
  if ((email.match(/@/g) || []).length !== 1) {
    return 'Folosește un email valid, de forma nume@domeniu.com';
  }
  if (email.includes('..')) return 'Emailul nu poate conține puncte consecutive.';
  if (!EMAIL_RE.test(email)) {
    return 'Folosește un email valid, de forma nume@domeniu.com';
  }
  const domain = email.split('@')[1];
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-')) {
    return 'Folosește un email valid, de forma nume@domeniu.com';
  }
  return null;
}

export function validateName(raw, label) {
  const value = String(raw ?? '').trim();
  if (!value) return `${label} e obligatoriu.`;
  if (value.length > 40) return `${label} e prea lung.`;
  return null;
}
