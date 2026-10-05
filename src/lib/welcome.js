/**
 * Animația de bun venit rulează o singură dată, pentru un cont creat de
 * curând — indiferent cum (email, Google, conversie din invitat).
 *
 * „Nou” = creat în ultimele 24 h: cu confirmare pe email, primul login poate
 * veni la câteva ore după înregistrare. Id-urile văzute se țin local, ca un
 * refresh sau un al doilea login să nu o mai repete.
 */
const KEY = 'signa-welcome-shown-v1';
export const WELCOME_WINDOW_MS = 24 * 60 * 60 * 1000;

function shownIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function shouldShowWelcome(user, now = Date.now()) {
  if (!user?.id || !user.created_at) return false;
  const created = Date.parse(user.created_at);
  if (!Number.isFinite(created) || now - created > WELCOME_WINDOW_MS) return false;
  return !shownIds().includes(user.id);
}

export function markWelcomeShown(userId) {
  if (!userId) return;
  try {
    // Ultimele 20 sunt destule — un dispozitiv nu vede multe conturi noi.
    const ids = [...shownIds().filter((id) => id !== userId), userId].slice(-20);
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* storage blocat — în cel mai rău caz o mai vede o dată */ }
}
