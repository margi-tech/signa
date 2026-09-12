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

/** Câte lecții ale contului așteaptă încă să ajungă pe server. */
export function pendingLessonCount(userId) {
  if (!userId) return 0;
  return loadPending().filter((event) => event.userId === userId).length;
}

async function flushLessonCompletions() {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pending = loadPending().filter((event) => event.userId === user.id);
  const sent = [];
  for (const event of pending) {
    const { error } = await supabase.rpc('record_lesson_completion', {
      p_lesson_id: event.lessonId,
      p_stars: event.stars,
      p_xp: event.xp,
    });
    if (error) {
      console.warn('[signa] lecția', event.lessonId, 'nu a ajuns pe server:', error.code ?? '', error.message ?? error);
    } else {
      sent.push(event);
    }
  }
  if (!sent.length) return;

  // Recitim coada în loc s-o suprascriem: între timp pot apărea lecții noi, iar
  // evenimentele altor conturi de pe același dispozitiv trebuie să rămână.
  // Scoatem doar ce a ajuns pe server exact cu valorile trimise.
  const wasSent = (event) => sent.some((s) => s.userId === event.userId
    && s.key === event.key && s.stars === event.stars && s.xp === event.xp);
  savePending(loadPending().filter((event) => !wasSent(event)));
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
  // Lecțiile au RPC-ul lor — le trimitem și dacă salvarea mastery-ului pică.
  await flushLessonCompletions();
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
