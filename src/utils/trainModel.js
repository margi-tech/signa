/**
 * Antrenare MLP (static) + GRU (dinamic) — optimizat pentru viteză și generalizare.
 * Nu atinge normalize(); lucrează pe vectori deja normalizați (VECTOR_SIZE).
 */
import { SEQ_FRAMES } from '../data/lsr-alphabet';
import { VECTOR_SIZE } from './normalize';

export const PRESETS = [
  {
    id: 'rapid',
    label: 'Rapid',
    epochs: 50,
    patience: 7,
    aug: 1,
    batchStatic: 64,
    batchDyn: 24,
    desc: '~20–40s',
  },
  {
    id: 'standard',
    label: 'Standard',
    epochs: 90,
    patience: 12,
    aug: 2,
    batchStatic: 48,
    batchDyn: 16,
    desc: '~1 min',
  },
  {
    id: 'detaliat',
    label: 'Detaliat',
    epochs: 140,
    patience: 18,
    aug: 3,
    batchStatic: 32,
    batchDyn: 12,
    desc: '~2–3 min',
  },
];

export function shuffleIndices(n, rng = Math.random) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Split stratificat train/test — fiecare clasă apare în ambele seturi. */
export function stratifiedSplit(y, testRatio = 0.15) {
  const byClass = new Map();
  y.forEach((label, i) => {
    if (!byClass.has(label)) byClass.set(label, []);
    byClass.get(label).push(i);
  });

  const testIdx = [];
  const trainIdx = [];

  for (const idxs of byClass.values()) {
    const order = shuffleIndices(idxs.length).map((k) => idxs[k]);
    const nTest = Math.max(1, Math.floor(order.length * testRatio));
    // dacă o clasă are 1 singur exemplu, îl lăsăm la train
    if (order.length === 1) {
      trainIdx.push(order[0]);
      continue;
    }
    testIdx.push(...order.slice(0, nTest));
    trainIdx.push(...order.slice(nTest));
  }

  return { trainIdx: shuffleIndices(trainIdx.length).map((i) => trainIdx[i]), testIdx };
}

function gaussian() {
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Zgomot mic pe vector static — robustețe la jitter MediaPipe. */
export function augmentStatic(vec, sigma = 0.015) {
  return vec.map((x) => x + gaussian() * sigma);
}

/** Zgomot pe fiecare cadru al secvenței. */
export function augmentSequence(seq, sigma = 0.012) {
  return seq.map((frame) => augmentStatic(frame, sigma));
}

/**
 * Expandează setul de train cu copii zgomotoase (aug ≥ 1 = doar originale).
 * @param {'static'|'dynamic'} kind
 */
export function expandWithAug(X, y, aug, kind) {
  if (aug <= 1) return { X, y };
  const Xout = [...X];
  const yout = [...y];
  const copies = aug - 1;
  for (let c = 0; c < copies; c++) {
    for (let i = 0; i < X.length; i++) {
      Xout.push(kind === 'dynamic' ? augmentSequence(X[i]) : augmentStatic(X[i]));
      yout.push(y[i]);
    }
  }
  return { X: Xout, y: yout };
}

/** Greutăți pe clasă — clase rare contează la fel. */
export function classWeights(y, nClasses) {
  const counts = new Array(nClasses).fill(0);
  for (const c of y) counts[c] += 1;
  const total = y.length;
  const w = {};
  for (let i = 0; i < nClasses; i++) {
    w[i] = counts[i] > 0 ? total / (nClasses * counts[i]) : 1;
  }
  return w;
}

export function buildStaticModel(tf, nClasses) {
  const m = tf.sequential();
  m.add(tf.layers.dense({
    inputShape: [VECTOR_SIZE],
    units: 256,
    activation: 'relu',
    kernelInitializer: 'heNormal',
  }));
  m.add(tf.layers.batchNormalization());
  m.add(tf.layers.dropout({ rate: 0.25 }));
  m.add(tf.layers.dense({ units: 128, activation: 'relu', kernelInitializer: 'heNormal' }));
  m.add(tf.layers.batchNormalization());
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
  m.add(tf.layers.dropout({ rate: 0.15 }));
  m.add(tf.layers.dense({ units: nClasses, activation: 'softmax' }));
  m.compile({
    optimizer: tf.train.adam(0.0015),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return m;
}

export function buildDynamicModel(tf, nClasses) {
  const m = tf.sequential();
  m.add(tf.layers.gru({
    inputShape: [SEQ_FRAMES, VECTOR_SIZE],
    units: 96,
    returnSequences: false,
    recurrentInitializer: 'glorotNormal',
  }));
  m.add(tf.layers.dropout({ rate: 0.3 }));
  m.add(tf.layers.dense({ units: 64, activation: 'relu', kernelInitializer: 'heNormal' }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: nClasses, activation: 'softmax' }));
  m.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return m;
}

/**
 * @param {'static'|'dynamic'} kind
 * @returns {Promise<{ model, testAcc, perLabel, testN, epochsRan, earlyStopped }>}
 */
export async function trainModel({
  kind,
  X,
  y,
  nClasses,
  epochs,
  batchSize,
  patience = 12,
  aug = 2,
  stopRef,
  onEpoch,
}) {
  const tf = await import('@tensorflow/tfjs');

  try {
    await tf.setBackend('webgl');
  } catch { /* cpu fallback */ }
  await tf.ready();

  const { trainIdx, testIdx } = stratifiedSplit(y, 0.15);
  let Xtrain = trainIdx.map((i) => X[i]);
  let ytrain = trainIdx.map((i) => y[i]);
  const Xtest = testIdx.map((i) => X[i]);
  const ytest = testIdx.map((i) => y[i]);

  ({ X: Xtrain, y: ytrain } = expandWithAug(Xtrain, ytrain, aug, kind));

  // re-shuffle după aug
  const sh = shuffleIndices(Xtrain.length);
  Xtrain = sh.map((i) => Xtrain[i]);
  ytrain = sh.map((i) => ytrain[i]);

  const weights = classWeights(ytrain, nClasses);
  const build = kind === 'dynamic' ? buildDynamicModel : buildStaticModel;
  const model = build(tf, nClasses);

  const xTensor = tf.tensor(Xtrain);
  const yTensor = tf.oneHot(tf.tensor1d(ytrain, 'int32'), nClasses).toFloat();

  let bestVal = -1;
  let bestWeights = null;
  let wait = 0;
  let earlyStopped = false;
  let epochsRan = 0;

  await model.fit(xTensor, yTensor, {
    epochs,
    batchSize,
    validationSplit: 0.12,
    shuffle: true,
    classWeight: weights,
    yieldEvery: 'auto',
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        epochsRan = epoch + 1;
        if (stopRef?.current) {
          model.stopTraining = true;
          earlyStopped = true;
        }

        const valAcc = logs.val_acc ?? logs.val_accuracy ?? 0;
        onEpoch?.({
          epoch,
          loss: logs.loss,
          valAcc,
          bestVal: Math.max(bestVal, valAcc),
        });

        if (valAcc > bestVal + 0.002) {
          bestVal = valAcc;
          wait = 0;
          if (bestWeights) bestWeights.forEach((w) => w.dispose());
          bestWeights = model.getWeights().map((w) => w.clone());
        } else {
          wait += 1;
          if (wait >= patience) {
            model.stopTraining = true;
            earlyStopped = true;
          }
        }
      },
    },
  });

  if (bestWeights) {
    model.setWeights(bestWeights);
    bestWeights.forEach((w) => w.dispose());
  }

  // Evaluare pe test held-out (fără aug)
  const xt = tf.tensor(Xtest);
  const preds = model.predict(xt);
  const predIdx = await preds.argMax(-1).data();
  xt.dispose();
  preds.dispose();

  const counts = {};
  const hits = {};
  for (let i = 0; i < ytest.length; i++) {
    const t = ytest[i];
    counts[t] = (counts[t] || 0) + 1;
    if (predIdx[i] === t) hits[t] = (hits[t] || 0) + 1;
  }
  const correct = Object.keys(counts).reduce((s, k) => s + (hits[k] || 0), 0);
  const testAcc = ytest.length ? correct / ytest.length : 0;
  const perLabel = Object.fromEntries(
    Object.keys(counts).map((k) => [Number(k), (hits[k] || 0) / counts[k]])
  );

  xTensor.dispose();
  yTensor.dispose();

  return {
    model,
    testAcc,
    perLabel,
    testN: ytest.length,
    epochsRan,
    earlyStopped,
    trainN: Xtrain.length,
  };
}
