import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { consentDatasetUpload, getDatasetAccess } from '../lib/dataset';

const EMPTY = {
  loading: false,
  can_collect: false,
  can_train: false,
  can_publish: false,
  consented: false,
};

/**
 * Capabilități dataset (colector / antrenor), separate de role=admin.
 * Fără Supabase, App.jsx lasă uneltele deschise — aici rămân toate false.
 */
export function useDatasetAccess(userId) {
  const [state, setState] = useState(() => ({
    ...EMPTY,
    loading: Boolean(isSupabaseConfigured && userId),
  }));

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) {
      setState(EMPTY);
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const row = await getDatasetAccess();
      setState({
        loading: false,
        can_collect: Boolean(row?.can_collect),
        can_train: Boolean(row?.can_train),
        can_publish: Boolean(row?.can_publish),
        consented: Boolean(row?.consented),
      });
    } catch {
      setState(EMPTY);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const consent = useCallback(async () => {
    const row = await consentDatasetUpload();
    setState({
      loading: false,
      can_collect: Boolean(row?.can_collect),
      can_train: Boolean(row?.can_train),
      can_publish: Boolean(row?.can_publish),
      consented: Boolean(row?.consented ?? true),
    });
    return row;
  }, []);

  return { ...state, refresh, consent };
}
