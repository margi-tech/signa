import { useState, useRef, useCallback } from 'react';
import { SEQ_FRAMES } from '../data/lsr-alphabet';

/* ── Preset-uri antrenare ──────────────────────────────────────── */
const PRESETS = [
  { id: 'rapid',    label: 'Rapid',    epochs: 100, desc: '~1 min' },
  { id: 'standard', label: 'Standard', epochs: 150, desc: '~2 min' },
  { id: 'detaliat', label: 'Detaliat', epochs: 250, desc: '~4 min' },
];

const PHASE = { IDLE: 'idle', TRAIN: 'train', DONE: 'done' };

// Validatori — un vector static are 63 de numere; o secvență are SEQ_FRAMES vectori
const isVec = (v) => Array.isArray(v) && v.length === 63 && typeof v[0] === 'number';
const isSeq = (v) => Array.isArray(v) && v.length === SEQ_FRAMES && v.every(isVec);

/* ── Arhitecturi ───────────────────────────────────────────────── */
function buildStaticModel(tf, nClasses) {
  const m = tf.sequential();
  m.add(tf.layers.dense({ inputShape: [63], units: 256, activation: 'relu' }));
  m.add(tf.layers.dropout({ rate: 0.3 }));
  m.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  m.add(tf.layers.dropout({ rate: 0.2 }));
  m.add(tf.layers.dense({ units: nClasses, activation: 'softmax' }));
  m.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return m;
}

function buildDynamicModel(tf, nClasses) {
  const m = tf.sequential();
  m.add(tf.layers.gru({ inputShape: [SEQ_FRAMES, 63], units: 64 }));
  m.add(tf.layers.dropout({ rate: 0.3 }));
  m.add(tf.layers.dense({ units: nClasses, activation: 'softmax' }));
  m.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy', metrics: ['accuracy'] });
  return m;
}

/* ── Antrenare comună (static sau dinamic) ─────────────────────── */
async function trainModel({ build, X, y, nClasses, epochs, batchSize, stopRef, onEpoch }) {
  const tf = await import('@tensorflow/tfjs');

  // Amestecare OBLIGATORIE: validationSplit taie ultimele 15% fără shuffle,
  // iar datele vin ordonate pe litere — fără asta, ultimele litere
  // n-ar fi văzute deloc la antrenare.
  const order = X.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const Xs = order.map((i) => X[i]);
  const ys = order.map((i) => y[i]);

  // tf.tensor deduce forma: [N,63] pentru static, [N,30,63] pentru secvențe
  const xTensor = tf.tensor(Xs);
  // One-hot: evită bug-ul TF.js cu sparseCategoricalCrossentropy + int32 în browser
  const yTensor = tf.oneHot(tf.tensor1d(ys, 'int32'), nClasses).toFloat();

  const model = build(tf, nClasses);
  await model.fit(xTensor, yTensor, {
    epochs,
    batchSize,
    validationSplit: 0.15,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (stopRef.current) model.stopTraining = true;
        onEpoch({
          epoch,
          loss:   logs.loss,
          valAcc: logs.val_acc ?? logs.val_accuracy ?? 0,
        });
      },
    },
  });

  xTensor.dispose();
  yTensor.dispose();
  return model;
}

/* ── Grafic loss + accuracy ───────────────────────────────────── */
function TrainChart({ history, accent = '#34d399' }) {
  if (!history.length) return null;
  const last = history[history.length - 1];
  const maxEpoch = last.epoch + 1;

  const pts = history.map(h => ({
    x: (h.epoch / (maxEpoch - 1 || 1)) * 100,
    y: (1 - h.valAcc) * 60,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const gradId = `accGrad-${accent.replace('#', '')}`;

  return (
    <div className="bg-slate-900 rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Epocă', val: `${maxEpoch}` },
          { label: 'Loss',  val: last.loss.toFixed(4) },
          { label: 'Acc.',  val: `${(last.valAcc * 100).toFixed(1)}%` },
        ].map(m => (
          <div key={m.label} className="text-center">
            <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">{m.label}</p>
            <p className="text-white font-bold text-base tabular-nums">{m.val}</p>
          </div>
        ))}
      </div>

      {pts.length > 1 && (
        <svg viewBox="0 0 100 60" className="w-full h-12" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L100 60 L0 60 Z`} fill={`url(#${gradId})`} />
          <path d={d} stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/* ── Secțiune de antrenare (reutilizată: static + mișcare) ─────── */
function TrainerSection({ stepNo, title, data, build, batchSize, epochs, accent, saveName, labelsName, fileList }) {
  const [phase,   setPhase]   = useState(PHASE.IDLE);
  const [history, setHistory] = useState([]);
  const [error,   setError]   = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const modelRef = useRef(null);
  const stopRef  = useRef(false);

  const isGreen = accent === '#34d399';

  const handleTrain = useCallback(async () => {
    setPhase(PHASE.TRAIN);
    setHistory([]);
    setError('');
    setDownloaded(false);
    stopRef.current = false;

    try {
      modelRef.current = await trainModel({
        build,
        X: data.X,
        y: data.y,
        nClasses: data.labels.length,
        epochs,
        batchSize,
        stopRef,
        onEpoch: (h) => setHistory((prev) => [...prev, h]),
      });
      setPhase(PHASE.DONE);
    } catch (err) {
      setError(err.message || 'Eroare la antrenare');
      setPhase(PHASE.IDLE);
    }
  }, [data, build, batchSize, epochs]);

  const handleDownload = useCallback(async () => {
    if (!modelRef.current) return;
    await modelRef.current.save(`downloads://${saveName}`);
    const blob = new Blob([JSON.stringify({ labels: data.labels })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = labelsName;
    a.click();
    URL.revokeObjectURL(a.href);
    setDownloaded(true);
  }, [data, saveName, labelsName]);

  const isTraining = phase === PHASE.TRAIN;

  return (
    <section>
      <p className="text-slate-600 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
        {stepNo} · {title}
      </p>

      {phase !== PHASE.DONE && !isTraining && (
        <button
          onClick={handleTrain}
          className={`w-full py-4 text-white font-bold rounded-2xl active:scale-[0.97] transition-transform
            ${isGreen
              ? 'bg-signa-500 shadow-[0_6px_24px_rgba(16,185,129,0.22)]'
              : 'bg-indigo-500 shadow-[0_6px_24px_rgba(99,102,241,0.25)]'}`}
        >
          Antrenează · {data.labels.length} litere · {epochs} epoci
        </button>
      )}

      {isTraining && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-xs">Antrenare în curs…</span>
            <button
              onClick={() => { stopRef.current = true; }}
              className="text-red-400/70 hover:text-red-400 text-xs transition-colors"
            >
              Oprește
            </button>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(history.length / epochs) * 100}%`, background: accent }}
            />
          </div>
          <TrainChart history={history} accent={accent} />
        </div>
      )}

      {phase === PHASE.DONE && (
        <div className="space-y-4">
          <TrainChart history={history} accent={accent} />

          <button
            onClick={handleDownload}
            className={`w-full py-4 text-white font-bold rounded-2xl active:scale-[0.97] transition-transform
              ${isGreen
                ? 'bg-signa-500 shadow-[0_6px_24px_rgba(16,185,129,0.25)]'
                : 'bg-indigo-500 shadow-[0_6px_24px_rgba(99,102,241,0.25)]'}`}
          >
            Descarcă modelul
          </button>

          {downloaded && (
            <div className="bg-slate-900 rounded-2xl p-4 space-y-2.5">
              <p className="text-white text-sm font-semibold">Pasul următor</p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Copiază fișierele descărcate în:
              </p>
              <div className="bg-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs text-signa-400">
                public/models/
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Fișiere: {fileList.map((f, i) => (
                  <span key={f}>
                    {i > 0 && ', '}
                    <code className="text-slate-400">{f}</code>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-2 px-1">{error}</p>}
    </section>
  );
}

/* ── Pagina principală ───────────────────────────────────────── */
export default function TrainPage({ onBack }) {
  const [staticData, setStaticData] = useState(null); // { labels, X, y, counts }
  const [dynData,    setDynData]    = useState(null); // { labels, X (secvențe), y, counts }
  const [preset,     setPreset]     = useState('standard');
  const [error,      setError]      = useState('');
  const [fileKey,    setFileKey]    = useState(0); // remount TrainerSections la fișier nou

  /* ── Încarcă dataset — separă mostrele statice de secvențe ── */
  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const raw = JSON.parse(await file.text());
      const all = Object.entries(raw).filter(([k]) => k !== '_meta');

      const parse = (check) => {
        const entries = all
          .map(([k, arr]) => [k, (arr ?? []).filter(check)])
          .filter(([, arr]) => arr.length > 0);
        if (entries.length < 2) return null; // sub 2 clase nu se poate antrena
        const labels = entries.map(([k]) => k).sort();
        const X = [], y = [];
        for (const [letter, samples] of entries) {
          const idx = labels.indexOf(letter);
          for (const s of samples) { X.push(s); y.push(idx); }
        }
        return { labels, X, y, counts: Object.fromEntries(entries.map(([k, v]) => [k, v.length])) };
      };

      const st = parse(isVec);
      const dy = parse(isSeq);
      if (!st && !dy) throw new Error('Dataset gol sau format necunoscut');

      setStaticData(st);
      setDynData(dy);
      setFileKey((k) => k + 1);
    } catch (err) {
      setError(err.message || 'Fișier invalid');
      setStaticData(null);
      setDynData(null);
    }
  }, []);

  const hasData = staticData || dynData;
  const epochs  = PRESETS.find((p) => p.id === preset)?.epochs ?? 150;

  return (
    <div className="h-full bg-slate-950 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="h-[2px] bg-gradient-to-r from-signa-500 via-signa-400/20 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-white/[0.05]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Înapoi
        </button>
        <h1 className="text-white font-bold tracking-[0.18em] text-sm">ANTRENARE MODEL</h1>
        <div className="w-16" />
      </header>

      {/* Conținut scrollabil */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-5 space-y-5">

        {/* ── Pas 1: Dataset ── */}
        <section>
          <p className="text-slate-600 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
            1 · Dataset
          </p>

          {!hasData ? (
            <label className="flex flex-col items-center justify-center gap-2.5
              border-2 border-dashed border-slate-800 rounded-2xl p-8 cursor-pointer
              hover:border-signa-500/40 hover:bg-signa-500/5 transition-all duration-200">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-slate-600">
                <path d="M16 4v16m0-16l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 22v2a4 4 0 004 4h16a4 4 0 004-4v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <div className="text-center">
                <p className="text-white/70 text-sm font-medium">Încarcă dataset.json</p>
                <p className="text-slate-600 text-xs mt-0.5">exportat din pagina de colectare</p>
              </div>
              <input type="file" accept=".json" className="hidden" onChange={handleFile} />
            </label>
          ) : (
            <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-semibold">
                  {(staticData?.labels.length ?? 0) + (dynData?.labels.length ?? 0)} litere detectate
                </p>
                <label className="text-signa-400 text-xs font-medium cursor-pointer hover:underline">
                  Schimbă
                  <input type="file" accept=".json" className="hidden" onChange={handleFile} />
                </label>
              </div>

              {staticData && (
                <div>
                  <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-1.5">
                    Statice · {staticData.X.length} exemple
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {staticData.labels.map((l) => (
                      <div key={l} className="flex items-center gap-1 bg-slate-800 rounded-lg px-2 py-1">
                        <span className="text-white text-xs font-bold">{l}</span>
                        <span className="text-slate-600 text-[10px]">{staticData.counts[l]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dynData && (
                <div>
                  <p className="text-indigo-400/70 text-[10px] uppercase tracking-wider mb-1.5">
                    Cu mișcare · {dynData.X.length} înregistrări
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dynData.labels.map((l) => (
                      <div key={l} className="flex items-center gap-1 bg-indigo-500/15 rounded-lg px-2 py-1">
                        <span className="text-indigo-300 text-xs font-bold">{l}</span>
                        <span className="text-indigo-400/60 text-[10px]">{dynData.counts[l]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-xs mt-2 px-1">{error}</p>}
        </section>

        {/* ── Pas 2: Configurare ── */}
        {hasData && (
          <section>
            <p className="text-slate-600 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
              2 · Configurare
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`py-3.5 rounded-xl flex flex-col items-center gap-0.5 transition-all
                    ${preset === p.id
                      ? 'bg-signa-500/20 border border-signa-500/40 text-signa-400'
                      : 'bg-slate-900 border border-transparent text-slate-500 hover:text-slate-400'}`}
                >
                  <span className="font-bold text-sm">{p.label}</span>
                  <span className="text-[10px] opacity-60">{p.epochs} epoci</span>
                  <span className="text-[10px] opacity-50">{p.desc}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Pas 3: Model static ── */}
        {staticData && (
          <TrainerSection
            key={`static-${fileKey}-${preset}`}
            stepNo="3"
            title="Model static"
            data={staticData}
            build={buildStaticModel}
            batchSize={32}
            epochs={epochs}
            accent="#34d399"
            saveName="signa-model"
            labelsName="signa-labels.json"
            fileList={['signa-model.json', 'signa-model.weights.bin', 'signa-labels.json']}
          />
        )}

        {/* ── Pas 4: Model de mișcare ── */}
        {dynData && (
          <TrainerSection
            key={`dyn-${fileKey}-${preset}`}
            stepNo={staticData ? '4' : '3'}
            title="Model de mișcare"
            data={dynData}
            build={buildDynamicModel}
            batchSize={16}
            epochs={epochs}
            accent="#818cf8"
            saveName="signa-model-dynamic"
            labelsName="signa-labels-dynamic.json"
            fileList={['signa-model-dynamic.json', 'signa-model-dynamic.weights.bin', 'signa-labels-dynamic.json']}
          />
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
