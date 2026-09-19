/**
 * Sincronizare progres local ↔ Supabase.
 * Strategie merge: max(xp), max(streak), max(stars) per lecție, union mastery.
 * Local rămâne sursa offline; sync e best-effort când ești autentificat.
 * favorites / soundEnabled / onboardingDone rămân doar pe dispozitiv.
 */
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { GUEST_PROGRESS_KEY, isGuestSession } from '../lib/guest';
import { LESSONS, lessonResult } from '../data/lessons';

/**
 * Invitatul are propriul slate (`GUEST_PROGRESS_KEY`, definit în lib/guest).
 * Altfel ar moșteni progresul lăsat pe dispozitiv de ultimul cont logat — și
 * l-ar și re-emite la conversie.
 */
export const ACCOUNT_PROGRESS_KEY = 'signa-progress-v2';
export { GUEST_PROGRESS_KEY };
const PENDING_KEY = 'signa-progress-pending-v1';

export function progressKey() {
  return isGuestSession() ? GUEST_PROGRESS_KEY : ACCOUNT_PROGRESS_KEY;
}

export function loadSlate(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function clearGuestSlate() {
  try {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
  } catch { /* ignore */ }
}

function loadLocal() {
  return loadSlate(progressKey());
}

function saveLocal(data) {
  try {
    localStorage.setItem(progressKey(), JSON.stringify(data));
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

/**
 * Plafonul pe care îl acceptă `record_lesson_completion` pentru o repetiție
 * (allowlist-ul din `supabase/schema.sql`). ReviewPage taie la 8 semne, deci
 * 8 × XP_PER_LETTER + bonusul de sesiune perfectă.
 */
const REVIEW_MAX_XP = 90;

function maxXpFor(lessonId, lesson) {
  if (lessonId === 'review') return REVIEW_MAX_XP;
  return lessonResult(lesson.letters.length, 0).xp;
}

/**
 * Doar pentru intrări scrise înainte ca slate-ul să rețină XP-ul câștigat.
 * Reconstruiește din numărul minim de litere care produce acele stele, deci
 * subestimează, niciodată invers.
 */
function xpFromStars(lesson, stars) {
  const total = lesson.letters.length;
  const skipped = stars >= 3 ? 0 : stars === 2 ? 1 : 2;
  return lessonResult(total, Math.min(skipped, total)).xp;
}

/**
 * Mută progresul strâns ca invitat pe contul tocmai conectat, re-emițându-l
 * prin `record_lesson_completion`. Clientul nu scrie XP nicăieri: serverul
 * plafonează per lecție (allowlist) și dedupe-ază pe ziua curentă, deci
 * replay-ul nu poate acorda mai mult decât o zi de joc. Streak-ul nu se
 * transferă — toate completările cad pe `current_date`.
 *
 * Citește explicit slate-ul de invitat, niciodată „cel curent": la momentul
 * conversiei flag-ul de invitat e deja stins, iar un `loadLocal()` ar apuca
 * progresul contului și i-ar re-emite lecțiile vechi ca și cum ar fi de azi.
 */
export async function queueGuestProgress(progress = loadSlate(GUEST_PROGRESS_KEY)) {
  const lessons = progress?.lessons;
  if (!lessons) return 0;

  let queued = 0;
  for (const [lessonId, entry] of Object.entries(lessons)) {
    const stars = Math.min(entry?.stars ?? 0, 3);
    if (stars <= 0) continue;

    // `LESSONS[].id` e număr (1.1), cheia din `lessons` e string ("1.1").
    // 'review' n-are intrare în LESSONS, dar serverul îl acceptă.
    const lesson = LESSONS.find((l) => String(l.id) === lessonId);
    const known = Boolean(lesson) || lessonId === 'review';
    // XP-ul câștigat e reținut la completare; fără el (lecție scoasă din
    // curriculum, sau slate scris de o versiune mai veche) n-avem din ce-l
    // reconstrui decât pentru o lecție care încă există.
    const earned = Number.isFinite(entry?.xp)
      ? entry.xp
      : (lesson ? xpFromStars(lesson, stars) : null);
    if (!known || earned === null) continue;

    // Peste plafon RPC-ul aruncă `Invalid lesson reward`, iar evenimentul ar
    // rămâne blocat în coadă, reîncercat la fiecare flush.
    const xp = Math.max(0, Math.min(earned, maxXpFor(lessonId, lesson)));
    await queueLessonCompletion(lessonId, stars, xp);
    queued += 1;
  }
  return queued;
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
