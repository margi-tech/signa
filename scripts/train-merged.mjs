/**
 * Unește dataseturile din `datasets/` + loturile din cloud (dacă există dump)
 * și antrenează MLP + GRU. Rulează: npx vite-node scripts/train-merged.mjs
 * Nu e folosit de aplicație — script de antrenare one-off.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VECTOR_SIZE } from '../src/utils/normalize.js';
import {
  isDatasetSequence as isSeq,
  isDatasetVector as isVec,
} from '../src/utils/datasetValidation.js';
import { entriesToTrainSet } from '../src/utils/parseTrainDataset.js';
import { PRESETS, trainModel } from '../src/utils/trainModel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'models');
const DATA = path.join(ROOT, 'datasets');
const CLOUD_PAGES = '/tmp/signa-train/pages';

const staticBucket = new Map();
const dynBucket = new Map();

function bucketFor(sample) {
  if (isVec(sample)) return staticBucket;
  if (isSeq(sample)) return dynBucket;
  return null;
}

function addSamples(label, samples, groupId) {
  const trimmed = String(label ?? '').trim();
  if (!trimmed || !samples?.length) return { static: 0, dyn: 0, skipped: 0 };
  let nStatic = 0;
  let nDyn = 0;
  let skipped = 0;
  for (const sample of samples) {
    const bucket = bucketFor(sample);
    if (!bucket) {
      skipped += 1;
      continue;
    }
    if (!bucket.has(trimmed)) bucket.set(trimmed, { samples: [], groups: [] });
    const row = bucket.get(trimmed);
    row.samples.push(sample);
    row.groups.push(groupId);
    if (bucket === staticBucket) nStatic += 1;
    else nDyn += 1;
  }
  return { static: nStatic, dyn: nDyn, skipped };
}

function loadJsonFile(file, groupPrefix, { skipLabels = new Set(), onlyLabels = null } = {}) {
  if (!fs.existsSync(file)) {
    console.log(`lipsește ${file}`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stats = [];
  for (const [key, arr] of Object.entries(raw)) {
    if (key === '_meta') continue;
    const label = String(key).trim();
    if (!label || skipLabels.has(label)) continue;
    if (onlyLabels && !onlyLabels.has(label)) continue;
    const counts = addSamples(label, arr ?? [], `${groupPrefix}:${label}`);
    stats.push({ label, ...counts });
  }
  return stats;
}

function toTrainSet(bucket) {
  return entriesToTrainSet(
    [...bucket.entries()].map(([label, row]) => [label, row.samples]),
    { groupsForSample: (letter, _sample, i) => bucket.get(letter).groups[i] },
  );
}

function summarize(name, set) {
  if (!set) {
    console.log(`${name}: gol`);
    return;
  }
  const counts = Object.entries(set.counts)
    .sort(([a], [b]) => a.localeCompare(b, 'ro'))
    .map(([k, n]) => `${k}:${n}`)
    .join('  ');
  const nGroups = new Set(set.groups ?? []).size;
  console.log(`${name}: ${set.labels.length} clase, ${set.X.length} exemple, ${nGroups} sesiuni`);
  console.log(`  ${counts}`);
}

async function saveTfModel(tf, model, base) {
  const handler = tf.io.withSaveHandler(async (artifacts) => {
    const chunks = Array.isArray(artifacts.weightData)
      ? artifacts.weightData
      : [artifacts.weightData];
    const weightData = Buffer.concat(chunks.map((d) => Buffer.from(d)));
    const json = {
      modelTopology: artifacts.modelTopology,
      format: 'layers-model',
      generatedBy: artifacts.generatedBy ?? 'TensorFlow.js tfjs-layers v4.22.0',
      convertedBy: null,
      weightsManifest: [{
        paths: [`./${base}.weights.bin`],
        weights: artifacts.weightSpecs,
      }],
    };
    fs.writeFileSync(path.join(OUT_DIR, `${base}.json`), JSON.stringify(json));
    fs.writeFileSync(path.join(OUT_DIR, `${base}.weights.bin`), weightData);
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON',
        weightDataBytes: weightData.length,
      },
    };
  });
  await model.save(handler);
}

function saveLabels(kind, labels) {
  const name = kind === 'dynamic' ? 'signa-labels-dynamic.json' : 'signa-labels.json';
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify({
    labels,
    version: '2026-09-14',
    vectorSize: VECTOR_SIZE,
    kind,
  }));
}

function loadCloud() {
  if (!fs.existsSync(CLOUD_PAGES)) {
    console.log('cloud: fără dump local');
    return;
  }
  const files = fs.readdirSync(CLOUD_PAGES).filter((f) => f.endsWith('.json')).sort();
  let batches = 0;
  let samples = 0;
  for (const file of files) {
    const text = fs.readFileSync(path.join(CLOUD_PAGES, file), 'utf8');
    const parsed = JSON.parse(text.slice(text.indexOf('{')));
    for (const row of parsed.rows ?? []) {
      const groupId = `cloud:${row.session_id || row.id}`;
      const counts = addSamples(row.label, row.samples ?? [], groupId);
      batches += 1;
      samples += counts.static + counts.dyn;
    }
  }
  console.log(`cloud: ${batches} loturi, ${samples} exemple păstrate`);
}

function loadLocal() {
  const petrisor = path.join(DATA, 'petrisor');
  const rares = path.join(DATA, 'rares');
  const skipAu = new Set('ABCDEFGHIKLMNOPQRST'.split(''));

  // restul literelor include A–T identic cu a-u; păstrăm U din a-u (100 vs 50)
  loadJsonFile(
    path.join(petrisor, 'signa-dataset-2026-08-02-restul-literelor.json'),
    'petrisor-restul',
    { skipLabels: new Set(['U']) },
  );
  loadJsonFile(
    path.join(petrisor, 'signa-dataset-2026-08-02-au-fara-video.json'),
    'petrisor-au',
    { skipLabels: skipAu },
  );
  loadJsonFile(path.join(petrisor, 'signa-dataset-2026-08-03-familie.json'), 'petrisor-familie');
  loadJsonFile(path.join(petrisor, 'signa-dataset-2026-08-03-socru.json'), 'petrisor-socru');
  loadJsonFile(path.join(petrisor, 'signa-dataset-2026-08-03-eu-sora.json'), 'petrisor-eu-sora');
  loadJsonFile(path.join(rares, 'signa-dataset-2026-08-10.json'), 'rares-10');
  loadJsonFile(path.join(rares, 'signa-dataset-2026-08-11.json'), 'rares-11');
  loadJsonFile(path.join(DATA, 'extra', 'signa-dataset-2026-09-03.json'), 'greetings-0903');
  loadJsonFile(
    path.join(DATA, 'andreea', 'signa-dataset-2026-08-04-mancare-litere-dinamice.json'),
    'andreea-mancare-0804',
  );
  loadJsonFile(path.join(DATA, 'extra', 'signa-dataset-2026-09-14.json'), 'extra-0914');
  loadJsonFile(path.join(DATA, 'enia', 'signa-dataset-2026-08-12-culori.json'), 'culori-0812');
  loadJsonFile(
    path.join(DATA, 'extra', 'signa-dataset-2026-08-24.json'),
    'extra-0824',
    { onlyLabels: new Set(['C']) },
  );
}

async function trainOne(kind, data, config) {
  if (!data) {
    console.log(`sari ${kind}: date insuficiente`);
    return null;
  }
  const batchSize = kind === 'dynamic' ? config.batchDyn : config.batchStatic;
  console.log(`\n=== Antrenare ${kind} · ${data.labels.length} clase · max ${config.epochs} epoci · ${config.label} ===`);
  const result = await trainModel({
    kind,
    X: data.X,
    y: data.y,
    nClasses: data.labels.length,
    epochs: config.epochs,
    batchSize,
    patience: config.patience,
    aug: config.aug,
    groups: data.groups,
    onEpoch: (h) => {
      const pct = ((h.valAcc ?? 0) * 100).toFixed(1);
      if ((h.epoch + 1) % 2 === 0 || h.epoch === 0) {
        console.log(`  ep ${h.epoch + 1}/${config.epochs}  loss=${h.loss.toFixed(4)}  val=${pct}%`);
      }
    },
  });
  const weak = data.labels
    .map((l, i) => ({ l, acc: result.perLabel[i] ?? 0, inTest: result.perLabel[i] != null }))
    .filter((x) => x.inTest && x.acc < 0.7)
    .sort((a, b) => a.acc - b.acc);
  const heldOut = data.labels.filter((_, i) => result.perLabel[i] != null);
  console.log(
    `${kind} gata: test=${(result.testAcc * 100).toFixed(1)}%  epoci=${result.epochsRan}`
    + `${result.earlyStopped ? '  early-stop' : ''}  trainN=${result.trainN}  testN=${result.testN}`
    + `  held-out=${heldOut.length}/${data.labels.length}`,
  );
  if (weak.length) {
    console.log(`  slabe (<70% pe test): ${weak.map((x) => `${x.l} ${(x.acc * 100).toFixed(0)}%`).join(' · ')}`);
  }
  const onlyTrain = data.labels.filter((_, i) => result.perLabel[i] == null);
  if (onlyTrain.length) {
    console.log(`  doar în train (o sesiune): ${onlyTrain.join(', ')}`);
  }
  const base = kind === 'dynamic' ? 'signa-model-dynamic' : 'signa-model';
  const tf = await import('@tensorflow/tfjs');
  await saveTfModel(tf, result.model, base);
  saveLabels(kind, data.labels);
  result.model.dispose();
  return {
    kind,
    testAcc: result.testAcc,
    epochsRan: result.epochsRan,
    earlyStopped: result.earlyStopped,
    trainN: result.trainN,
    testN: result.testN,
    labels: data.labels,
    weak,
    onlyTrain,
  };
}

loadLocal();
loadCloud();

const staticData = toTrainSet(staticBucket);
const dynData = toTrainSet(dynBucket);
summarize('STATIC', staticData);
summarize('DYNAMIC', dynData);

const config = PRESETS.find((p) => p.id === 'detaliat');
const report = {
  static: await trainOne('static', staticData, config),
  dynamic: await trainOne('dynamic', dynData, config),
};
fs.mkdirSync('/tmp/signa-train', { recursive: true });
fs.writeFileSync('/tmp/signa-train/report.json', JSON.stringify(report, null, 2));
console.log('\nScris raportul în /tmp/signa-train/report.json');
console.log('Modele în', OUT_DIR);
