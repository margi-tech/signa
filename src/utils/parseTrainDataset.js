import {
  isDatasetSequence as isSeq,
  isDatasetVector as isVec,
} from './datasetValidation';

/**
 * Transformă [etichetă, exemple] în { labels, X, y, counts, groups? }.
 * Cere minim 2 clase — altfel modelul nu are ce deosebi.
 */
export function entriesToTrainSet(entries, { groupsForSample } = {}) {
  const cleaned = (entries ?? [])
    .map(([raw, samples]) => [String(raw ?? '').trim(), samples ?? []])
    .filter(([label, samples]) => label && samples.length > 0);
  if (cleaned.length < 2) return null;

  const labels = cleaned.map(([k]) => k).sort();
  const X = [];
  const y = [];
  const groups = [];
  let hasGroups = false;

  for (const [letter, samples] of cleaned) {
    const idx = labels.indexOf(letter);
    samples.forEach((sample, i) => {
      X.push(sample);
      y.push(idx);
      const group = groupsForSample?.(letter, sample, i);
      if (group != null && group !== '') {
        hasGroups = true;
        groups.push(String(group));
      } else {
        groups.push(null);
      }
    });
  }

  return {
    labels,
    X,
    y,
    counts: Object.fromEntries(cleaned.map(([k, v]) => [k, v.length])),
    groups: hasGroups ? groups : undefined,
  };
}

/** Parsează un JSON exportat din Colectare ({ literă: exemple[], _meta? }). */
export function parseRawDataset(raw) {
  const all = Object.entries(raw ?? {}).filter(([key]) => key !== '_meta');
  const parse = (check) => entriesToTrainSet(
    all.map(([key, arr]) => [key, (arr ?? []).filter(check)]),
  );
  return {
    staticData: parse(isVec),
    dynData: parse(isSeq),
    all,
  };
}

/** Unește loturile din cloud într-un set de antrenare, cu grupuri pe session_id. */
export function parseBatchesToTrainSets(batches) {
  const staticMap = new Map();
  const dynMap = new Map();
  const staticGroups = new Map();
  const dynGroups = new Map();

  for (const batch of batches ?? []) {
    const label = String(batch.label ?? '').trim();
    if (!label) continue;
    const session = batch.session_id || batch.id;
    const samples = batch.samples ?? [];
    if (batch.kind === 'static') {
      const valid = samples.filter(isVec);
      if (!valid.length) continue;
      staticMap.set(label, [...(staticMap.get(label) ?? []), ...valid]);
      staticGroups.set(label, [
        ...(staticGroups.get(label) ?? []),
        ...valid.map(() => session),
      ]);
    } else if (batch.kind === 'sequence') {
      const valid = samples.filter(isSeq);
      if (!valid.length) continue;
      dynMap.set(label, [...(dynMap.get(label) ?? []), ...valid]);
      dynGroups.set(label, [
        ...(dynGroups.get(label) ?? []),
        ...valid.map(() => session),
      ]);
    }
  }

  const toSet = (map, groupMap) => entriesToTrainSet(
    [...map.entries()],
    { groupsForSample: (letter, _sample, i) => groupMap.get(letter)?.[i] },
  );

  return {
    staticData: toSet(staticMap, staticGroups),
    dynData: toSet(dynMap, dynGroups),
  };
}
