import { useSyncExternalStore } from 'react';
import { getPrefs, resolveTheme, setPrefs, subscribePrefs } from '../lib/preferences.js';

/**
 * Tema și mărimea textului. Store-ul e global (un singur `<html>`), deci nu
 * are nevoie de provider — orice componentă îl poate citi.
 */
export function usePreferences() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, getPrefs);
  return {
    theme: prefs.theme,
    resolvedTheme: resolveTheme(prefs.theme),
    textScale: prefs.textScale,
    setTheme: (theme) => setPrefs({ theme }),
    setTextScale: (textScale) => setPrefs({ textScale }),
  };
}
