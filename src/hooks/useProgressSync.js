/**
 * Sincronizare progres local ↔ Supabase.
 * Strategie merge: max(xp), max(streak), max(stars) per lecție, union mastery.
 * Local rămâne sursa offline; sync e best-effort când ești autentificat.
 * favorites / soundEnabled / onboardingDone rămân doar pe dispozitiv.
 */
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const STORAGE_KEY = 'signa-progress-v2';
const PENDING_KEY = 'signa-progress-pending-v1';

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

  return {
    ...local,
    // Valorile care alimentează clasamentul sunt autoritative pe server.
    xp: remote.xp ?? 0,
    streak: remote.streak ?? 0,
    lastPracticeDate: remote.last_practice_date ?? null,
    lessons: remote.lessons ?? {},
    letterMastery: { ...(remote.letter_mastery ?? {}), ...(local.letterMastery ?? {}) },
  };
}

function loadPending() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePending(events) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(events));
  } catch { /* evenimentul va fi retrimis doar dacă încape în storage */ }
}

export async function queueLessonCompletion(lessonId, stars, xp) {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const date = new Date().toISOString().slice(0, 10);
  const key = `${date}:${lessonId}`;
  const events = loadPending();
  const existing = events.find(
    (event) => event.key === key && event.userId === userId,
  );
  if (existing) {
    existing.stars = Math.max(existing.stars ?? 0, stars ?? 0);
    existing.xp = Math.max(existing.xp ?? 0, xp ?? 0);
  } else {
    events.push({ key, userId, lessonId: String(lessonId), stars, xp });
  }
  savePending(events);
}

export function clearPendingLessonCompletions() {
  localStorage.removeItem(PENDING_KEY);
}

async function flushLessonCompletions() {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pending = loadPending().filter((event) => event.userId === user.id);
  const failed = [];
  for (const event of pending) {
    const { error } = await supabase.rpc('record_lesson_completion', {
      p_lesson_id: event.lessonId,
      p_stars: event.stars,
      p_xp: event.xp,
    });
    if (error) failed.push(event);
  }
  savePending(failed);
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
    letter_mastery: progress.letterMastery ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('progress').upsert(payload);
  if (error) throw error;
  await flushLessonCompletions();
}

export async function pushProgressBestEffort(progress) {
  try {
    await pushProgress(progress);
  } catch {
    /* offline / fără sesiune — local rămâne sursa */
  }
}

export { mergeProgress };
