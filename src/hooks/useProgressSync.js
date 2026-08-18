/**
 * Sincronizare progres local ↔ Supabase.
 * Strategie merge: max(xp), max(streak), max(stars) per lecție, union mastery.
 * Local rămâne sursa offline; sync e best-effort când ești autentificat.
 * favorites / soundEnabled / onboardingDone rămân doar pe dispozitiv.
 */
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const STORAGE_KEY = 'signa-progress-v2';

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function mergeProgress(local, remote) {
  if (!remote) return local;
  if (!local) {
    return {
      xp: remote.xp ?? 0,
      streak: remote.streak ?? 0,
      lastPracticeDate: remote.last_practice_date,
      lessons: remote.lessons ?? {},
      letterMastery: remote.letter_mastery ?? {},
      onboardingDone: true,
      soundEnabled: true,
      favorites: [],
    };
  }

  const lessons = { ...remote.lessons, ...local.lessons };
  for (const id of Object.keys(lessons)) {
    const a = local.lessons?.[id];
    const b = remote.lessons?.[id];
    if (a && b) {
      lessons[id] = {
        stars: Math.max(a.stars ?? 0, b.stars ?? 0),
        completedAt: (a.completedAt > b.completedAt ? a.completedAt : b.completedAt),
      };
    }
  }

  return {
    ...local,
    xp: Math.max(local.xp ?? 0, remote.xp ?? 0),
    streak: Math.max(local.streak ?? 0, remote.streak ?? 0),
    lastPracticeDate: [local.lastPracticeDate, remote.last_practice_date]
      .filter(Boolean)
      .sort()
      .at(-1) ?? null,
    lessons,
    letterMastery: { ...(remote.letter_mastery ?? {}), ...(local.letterMastery ?? {}) },
  };
}

/** Trage de pe server și unește cu local. Returnează progresul merge-uit. */
export async function pullAndMergeProgress() {
  if (!isSupabaseConfigured || !supabase) return loadLocal();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loadLocal();

  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  const merged = mergeProgress(loadLocal(), data);
  if (merged) saveLocal(merged);
  return merged;
}

/** Împinge progresul local pe server (după merge). */
export async function pushProgress(progress = loadLocal()) {
  if (!isSupabaseConfigured || !supabase || !progress) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    xp: progress.xp ?? 0,
    streak: progress.streak ?? 0,
    last_practice_date: progress.lastPracticeDate ?? null,
    lessons: progress.lessons ?? {},
    letter_mastery: progress.letterMastery ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('progress').upsert(payload);
  if (error) throw error;
}

export async function pushProgressBestEffort(progress) {
  try {
    await pushProgress(progress);
  } catch {
    /* offline / fără sesiune — local rămâne sursa */
  }
}

export { mergeProgress };
