import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  countPendingSamples,
  enqueueSample,
  flushPendingBatches,
  listDatasetInventory,
  localDatasetToBatches,
  pendingForUser,
  setPendingForUser,
} from '../lib/dataset';

const FLUSH_MS = 4000;

/**
 * Coadă locală → append_dataset_batch.
 * Nu atinge signa-dataset-v1; doar replică exemplele noi (și, la cerere, localul).
 */
export function useDatasetCloudSync({ userId, canCollect, consented }) {
  const enabled = Boolean(isSupabaseConfigured && userId && canCollect);
  const sessionRef = useRef(crypto.randomUUID());
  const flushingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [inventory, setInventory] = useState([]);

  const bumpSession = useCallback(() => {
    sessionRef.current = crypto.randomUUID();
  }, []);

  const refreshCount = useCallback(() => {
    setPendingCount(countPendingSamples(pendingForUser(userId)));
  }, [userId]);

  const refreshInventory = useCallback(async () => {
    if (!enabled) return;
    try {
      setInventory(await listDatasetInventory());
    } catch {
      /* inventarul e informativ — captura locală continuă */
    }
  }, [enabled]);

  const enqueue = useCallback((event) => {
    if (!enabled || !userId) return;
    enqueueSample(userId, {
      ...event,
      sessionId: event.sessionId || sessionRef.current,
    });
    refreshCount();
  }, [enabled, refreshCount, userId]);

  const flush = useCallback(async () => {
    if (!enabled || !consented || !userId || flushingRef.current) return;
    if (!countPendingSamples(pendingForUser(userId))) return;
    flushingRef.current = true;
    setStatus('syncing');
    try {
      const result = await flushPendingBatches(userId);
      refreshCount();
      setError('');
      setStatus(result.remaining ? 'idle' : 'ok');
      if (result.sent > 0) await refreshInventory();
    } catch (err) {
      setError(err.message || 'Sincronizarea a eșuat.');
      setStatus('error');
    } finally {
      flushingRef.current = false;
    }
  }, [consented, enabled, refreshCount, refreshInventory, userId]);

  const queueLocalDataset = useCallback((dataset) => {
    if (!enabled || !userId) return 0;
    const extra = localDatasetToBatches(dataset);
    if (!extra.length) return 0;
    setPendingForUser(userId, [...pendingForUser(userId), ...extra]);
    refreshCount();
    return extra.reduce((sum, batch) => sum + batch.samples.length, 0);
  }, [enabled, refreshCount, userId]);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (enabled && consented) flush();
  }, [consented, enabled, flush]);

  useEffect(() => {
    if (!enabled) return undefined;
    refreshInventory();
    const id = setInterval(flush, FLUSH_MS);
    const onOnline = () => { flush(); };
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, flush, refreshInventory]);

  return {
    enabled,
    enqueue,
    flush,
    bumpSession,
    queueLocalDataset,
    pendingCount,
    status,
    error,
    inventory,
    refreshInventory,
  };
}
