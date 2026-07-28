import { useState, useEffect, useCallback } from 'react';
import { normalize, VECTOR_SIZE } from '../utils/normalize';
import { LSR_ALPHABET, MIN_SAMPLES_PER_LETTER, MIN_SEQ_PER_LETTER } from '../data/lsr-alphabet';

// Validatori pentru cele două tipuri de mostre
const isVec = (v) => Array.isArray(v) && v.length === VECTOR_SIZE && typeof v[0] === 'number';
const isSeq = (v) => Array.isArray(v) && v.length > 0 && v.every(isVec);

// Rotunjire la 4 zecimale — reduce mult spațiul ocupat în localStorage,
// eroarea (~1e-4) e cu mult sub zgomotul natural al detecției mâinii
const round4 = (v) => Math.round(v * 1e4) / 1e4;

const STORAGE_KEY = 'signa-dataset-v1';

/** Citește dataset-ul salvat în browser (sau obiect gol) */
function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Gestionează colectarea și exportul vectorilor de landmarks per literă.
 *
 * Dataset-ul e un obiect { 'A': [[...63 val...], ...], 'B': [...], ... }
 * unde fiecare vector e deja normalizat cu normalize() — identic cu predicția.
 *
 * Persistență: fiecare modificare se salvează automat în localStorage,
 * deci un refresh nu pierde datele colectate.
 */
export function useDatasetCollector() {
  const [dataset,       setDataset]       = useState(loadStored);
  const [activeLabel,   setActiveLabel]   = useState(LSR_ALPHABET[0]);
  const [storageFull,   setStorageFull]   = useState(false);

  // Auto-salvare la fiecare modificare
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
      setStorageFull(false);
    } catch {
      // Storage plin — datele rămân doar în memorie; exportă cât mai repede
      setStorageFull(true);
    }
  }, [dataset]);

  /**
   * Capturează un vector normalizat (poză statică) pentru eticheta activă.
   * @param {object|null} subject  rezultatul holistic curent { hands, faceBlendshapes, pose, ... }
   * @returns {boolean}  true dacă captura a reușit
   */
  const capture = useCallback((subject) => {
    const vector = normalize(subject);
    if (!vector) return false;

    setDataset((prev) => ({
      ...prev,
      [activeLabel]: [...(prev[activeLabel] ?? []), vector],
    }));

    return true;
  }, [activeLabel]);

  /**
   * Capturează o SECVENȚĂ de cadre (film) pentru eticheta activă.
   * @param {Array<object>} rawFrames  instantanee holistice consecutive (subject brut, neprelucrat)
   * @returns {boolean}  true dacă înregistrarea a fost salvată
   */
  const captureSequence = useCallback((rawFrames) => {
    if (!rawFrames?.length) return false;

    const seq = [];
    for (const subject of rawFrames) {
      const vector = normalize(subject);
      if (!vector) return false; // cadru invalid — înregistrarea se aruncă întreagă
      seq.push(vector.map(round4));
    }

    setDataset((prev) => ({
      ...prev,
      [activeLabel]: [...(prev[activeLabel] ?? []), seq],
    }));

    return true;
  }, [activeLabel]);

  /** Șterge toate exemplele pentru eticheta activă */
  const clearActiveLabel = useCallback(() => {
    setDataset((prev) => {
      const next = { ...prev };
      delete next[activeLabel];
      return next;
    });
  }, [activeLabel]);

  /**
   * Importă un dataset exportat anterior și îl unește cu cel curent.
   * Etichetele existente se completează (exemplele se adaugă), nu se suprascriu.
   * Acceptă orice etichetă (literă sau cuvânt), nu doar alfabetul fix.
   * @param {File} file  fișierul JSON exportat
   * @returns {Promise<number>}  numărul de exemple importate
   */
  const importDataset = useCallback(async (file) => {
    const raw = JSON.parse(await file.text());
    let imported = 0;

    setDataset((prev) => {
      const next = { ...prev };
      for (const [label, samples] of Object.entries(raw)) {
        if (label === '_meta') continue;
        // Fiecare exemplu e static (63 valori) sau secvență (film) — determinat din formă
        const valid = (samples ?? []).filter((s) => isVec(s) || isSeq(s));
        if (!valid.length) continue;
        next[label] = [...(next[label] ?? []), ...valid];
        imported += valid.length;
      }
      return next;
    });

    return imported;
  }, []);

  /** Exportă dataset-ul ca fișier JSON cu metadate */
  const exportDataset = useCallback(() => {
    const labels       = Object.keys(dataset).filter((l) => dataset[l]?.length);
    const totalSamples = labels.reduce((s, l) => s + dataset[l].length, 0);

    const output = {
      _meta: {
        created:       new Date().toISOString(),
        total_samples: totalSamples,
        labels,
        video_labels: labels.filter((l) => dataset[l].some(isSeq)),
        min_samples_per_letter: MIN_SAMPLES_PER_LETTER,
        min_seq_per_letter: MIN_SEQ_PER_LETTER,
      },
      ...Object.fromEntries(labels.map((l) => [l, dataset[l]])),
    };

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `signa-dataset-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [dataset]);

  const samplesFor  = (label) => dataset[label]?.length ?? 0;
  const totalSamples = Object.values(dataset).reduce((s, arr) => s + arr.length, 0);
  const labels = Object.keys(dataset).filter((l) => dataset[l]?.length);

  return {
    activeLabel,
    setActiveLabel,
    capture,
    captureSequence,
    clearActiveLabel,
    importDataset,
    exportDataset,
    samplesFor,
    totalSamples,
    labels,
    dataset,
    hasData: totalSamples > 0,
    storageFull,
  };
}
