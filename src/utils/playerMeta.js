import { levelFromXp } from '../data/lessons';

/** Nivelul public, din XP-ul din clasament. */
export function playerLevel(xp) {
  return levelFromXp(xp ?? 0);
}

export function memberSinceLabel(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

/** Un rând compact: nivel, XP, streak. */
export function statsLine(user) {
  const level = playerLevel(user?.xp);
  const xp = user?.xp ?? 0;
  const streak = user?.streak ?? 0;
  const zile = streak === 1 ? 'zi' : 'zile';
  return `Nv. ${level} · ${xp.toLocaleString('ro-RO')} XP · ${streak} ${zile}`;
}
