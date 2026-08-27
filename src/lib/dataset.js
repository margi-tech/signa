/**
 * Dataset colaborativ: vectori normalizați în Supabase, fără imagini/video.
 * Coada pending e per user, în localStorage — același model ca la progres.
 */
import { isSupabaseConfigured, supabase } from './supabase';
import { isDatasetSequence, isDatasetVector } from '../utils/datasetValidation';
import { parseBatchesToTrainSets } from '../utils/parseTrainDataset';

export const DATASET_PENDING_KEY = 'signa-dataset-pending-v1';
export const STATIC_CHUNK = 50;
export const SEQUENCE_CHUNK = 8;

const round4 = (value) => Math.round(value * 1e4) / 1e4;

export function compactSample(sample, kind) {
  if (kind === 'sequence') {
    return (sample ?? []).map((frame) => (
      Array.isArray(frame) ? frame.map(round4) : frame
    ));
  }
  return (sample ?? []).map(round4);
}

export function chunkSizeFor(kind) {
  return kind === 'sequence' ? SEQUENCE_CHUNK : STATIC_CHUNK;
}

export function newClientBatchId() {
  return crypto.randomUUID();
}

export function loadPendingMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DATASET_PENDING_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function savePendingMap(map) {
  try {
    localStorage.setItem(DATASET_PENDING_KEY, JSON.stringify(map));
  } catch {
    /* coada rămâne în memorie până la următorul flush reușit */
  }
}

export function pendingForUser(userId) {
  if (!userId) return [];
  const list = loadPendingMap()[userId];
  return Array.isArray(list) ? list : [];
}

export function setPendingForUser(userId, batches) {
  if (!userId) return;
  const map = loadPendingMap();
  map[userId] = batches;
  savePendingMap(map);
}

export function countPendingSamples(batches) {
  return (batches ?? []).reduce((sum, batch) => sum + (batch.samples?.length ?? 0), 0);
}

export function enqueueSample(userId, { label, kind, sample, sessionId }) {
  const trimmed = String(label ?? '').trim();
  if (!userId || !trimmed || !sessionId) return pendingForUser(userId);
  if (kind !== 'static' && kind !== 'sequence') return pendingForUser(userId);
  const compact = compactSample(sample, kind);
  const valid = kind === 'static' ? isDatasetVector(compact) : isDatasetSequence(compact);
  if (!valid) return pendingForUser(userId);

  const next = pendingForUser(userId).map((batch) => ({
    ...batch,
    samples: [...(batch.samples ?? [])],
  }));
  const last = next[next.length - 1];
  const max = chunkSizeFor(kind);
  if (
    last
    && last.label === trimmed
    && last.kind === kind
    && last.sessionId === sessionId
    && last.samples.length < max
  ) {
    last.samples.push(compact);
    setPendingForUser(userId, next);
    return next;
  }

  next.push({
    clientBatchId: newClientBatchId(),
    sessionId,
    label: trimmed,
    kind,
    samples: [compact],
  });
  setPendingForUser(userId, next);
  return next;
}

/** Taie un array de exemple în loturi gata de RPC. */
export function chunkSamples(label, kind, samples, sessionId) {
  const trimmed = String(label ?? '').trim();
  const max = chunkSizeFor(kind);
  const batches = [];
  const compact = (samples ?? [])
    .map((sample) => compactSample(sample, kind))
    .filter((sample) => (
      kind === 'static' ? isDatasetVector(sample) : isDatasetSequence(sample)
    ));
  for (let i = 0; i < compact.length; i += max) {
    batches.push({
      clientBatchId: newClientBatchId(),
      sessionId,
      label: trimmed,
      kind,
      samples: compact.slice(i, i + max),
    });
  }
  return batches;
}

export function localDatasetToBatches(dataset) {
  const batches = [];
  for (const [rawLabel, samples] of Object.entries(dataset ?? {})) {
    const label = String(rawLabel).trim();
    if (!label || rawLabel === '_meta') continue;
    const list = samples ?? [];
    const statics = list.filter(isDatasetVector);
    const sequences = list.filter(isDatasetSequence);
    if (statics.length) {
      batches.push(...chunkSamples(label, 'static', statics, newClientBatchId()));
    }
    if (sequences.length) {
      batches.push(...chunkSamples(label, 'sequence', sequences, newClientBatchId()));
    }
  }
  return batches;
}

export function inventoryCountFor(inventory, label) {
  const key = String(label ?? '').trim();
  return (inventory ?? [])
    .filter((row) => String(row.label ?? '').trim() === key)
    .reduce((sum, row) => sum + Number(row.sample_count || 0), 0);
}

function asObject(data) {
  if (!data) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
}

function throwRpc(error, fallback) {
  const message = error?.message || fallback;
  if (/Consent required/i.test(message)) {
    throw new Error('Acceptă consimțământul înainte de a trimite exemplele.');
  }
  if (/Not a dataset collector/i.test(message)) {
    throw new Error('Contul nu e invitat la colectare.');
  }
  if (/Not a dataset trainer/i.test(message)) {
    throw new Error('Contul nu e invitat la antrenare.');
  }
  if (/Rate limited/i.test(message)) {
    throw new Error('Prea multe loturi într-un minut — așteaptă puțin.');
  }
  throw new Error(message);
}

export async function getDatasetAccess() {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.rpc('get_dataset_access');
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return null;
    throwRpc(error, 'Nu am putut citi accesul la dataset.');
  }
  return asObject(data);
}

export async function consentDatasetUpload() {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  const { data, error } = await supabase.rpc('consent_dataset_upload');
  if (error) throwRpc(error, 'Nu am putut salva consimțământul.');
  return asObject(data);
}

export async function appendDatasetBatch(batch) {
  if (!supabase) throw new Error('Supabase nu e configurat.');
  const { data, error } = await supabase.rpc('append_dataset_batch', {
    p_label: batch.label,
    p_kind: batch.kind,
    p_samples: batch.samples,
    p_client_batch_id: batch.clientBatchId,
    p_session_id: batch.sessionId,
  });
  if (error) throwRpc(error, 'Nu am putut trimite lotul.');
  return data;
}

export async function listDatasetInventory() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_dataset_inventory');
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') return [];
    throwRpc(error, 'Nu am putut citi inventarul.');
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchAllDatasetBatches() {
  if (!supabase) return [];
  const all = [];
  let afterCreated = null;
  let afterId = null;
  for (;;) {
    const { data, error } = await supabase.rpc('fetch_dataset_batches', {
      p_after_created: afterCreated,
      p_after_id: afterId,
      p_limit: 40,
    });
    if (error) throwRpc(error, 'Nu am putut descărca datasetul comun.');
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) break;
    all.push(...rows);
    const last = rows[rows.length - 1];
    afterCreated = last.created_at;
    afterId = last.id;
    if (rows.length < 40) break;
  }
  return all;
}

export async function loadCloudTrainSets() {
  const batches = await fetchAllDatasetBatches();
  return parseBatchesToTrainSets(batches);
}

export async function flushPendingBatches(userId) {
  if (!supabase || !userId) return { sent: 0, remaining: countPendingSamples(pendingForUser(userId)) };
  const pending = pendingForUser(userId);
  const failed = [];
  let sent = 0;
  for (const batch of pending) {
    if (!batch?.samples?.length) continue;
    try {
      await appendDatasetBatch(batch);
      sent += batch.samples.length;
    } catch (err) {
      failed.push(batch);
      const retryLater = /Prea multe loturi/i.test(err.message);
      if (!retryLater) {
        failed.push(...pending.slice(pending.indexOf(batch) + 1));
        setPendingForUser(userId, failed);
        throw err;
      }
      failed.push(...pending.slice(pending.indexOf(batch) + 1));
      break;
    }
  }
  setPendingForUser(userId, failed);
  return { sent, remaining: countPendingSamples(failed) };
}
