import { useState, useRef, useCallback } from 'react';
import { VECTOR_SIZE } from '../utils/normalize';
import { PRESETS, trainModel } from '../utils/trainModel';
import { parseRawDataset } from '../utils/parseTrainDataset';
import { loadCloudTrainSets } from '../lib/dataset';
import {
  isDatasetSequence as isSeq,
  isDatasetVector as isVec,
} from '../utils/datasetValidation';
import { MAX_TRAIN_IMPORT_BYTES, readJsonObject } from '../utils/readJsonFile';

const PHASE = { IDLE: 'idle', TRAIN: 'train', DONE: 'done' };

/* ── Grafic loss + accuracy ───────────────────────────────────── */
function TrainChart({ history, accent = '#34d399', testAcc, earlyStopped, epochsRan }) {
  if (!history.length) return null;
  const last = history[history.length - 1];
  const maxEpoch = last.epoch + 1;

  const pts = history.map((h) => ({
    x: (h.epoch / (maxEpoch - 1 || 1)) * 100,
    y: (1 - h.valAcc) * 60,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const gradId = `accGrad-${accent.replace('#', '')}`;

  return (
    <div className="bg-cream-50 rounded-2xl p-4 space-y-4 border border-ink-900/[0.04]">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Epoci', val: `${epochsRan ?? maxEpoch}` },
          { label: 'Loss', val: last.loss.toFixed(4) },
          { label: 'Val.', val: `${(last.valAcc * 100).toFixed(1)}%` },
        ].map((m) => (
          <div key={m.label} className="text-center">
            <p className="text-ink-400 text-[10px] uppercase tracking-wider mb-0.5">{m.label}</p>
            <p className="text-ink-900 font-bold text-base tabular-nums">{m.val}</p>
          </div>
        ))}
      </div>
      {testAcc != null && (
        <p className="text-center text-sm font-bold text-signa-600">
          Test set (held-out): {(testAcc * 100).toFixed(1)}%
          {earlyStopped ? ' · early stop' : ''}
        </p>
      )}

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

/* ── Secțiune de antrenare ─────────────────────────────────────── */
function TrainerSection({
  stepNo, title, kind, data, config, accent, saveName, labelsName, fileList,
}) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [testAcc, setTestAcc] = useState(null);
  const [perLabel, setPerLabel] = useState(null);
  const [epochsRan, setEpochsRan] = useState(0);
  const [earlyStopped, setEarlyStopped] = useState(false);
  const [trainN, setTrainN] = useState(0);
  const modelRef = useRef(null);
  const stopRef = useRef(false);
  const historyFlushRef = useRef([]);

  const isGreen = accent === '#34d399';
  const batchSize = kind === 'dynamic' ? config.batchDyn : config.batchStatic;

  const handleTrain = useCallback(async () => {
    setPhase(PHASE.TRAIN);
    setHistory([]);
    historyFlushRef.current = [];
    setError('');
    setDownloaded(false);
    setTestAcc(null);
    setPerLabel(null);
    setEpochsRan(0);
    setEarlyStopped(false);
    setTrainN(0);
    stopRef.current = false;

    try {
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
        stopRef,
        onEpoch: (h) => {
          historyFlushRef.current.push(h);
          // Actualizare UI la fiecare epocă (suficient de rar ca să nu blocheze WebGL)
          setHistory([...historyFlushRef.current]);
        },
      });
      modelRef.current = result.model;
      setTestAcc(result.testAcc);
      setPerLabel(result.perLabel);
      setEpochsRan(result.epochsRan);
      setEarlyStopped(result.earlyStopped);
      setTrainN(result.trainN);
      setPhase(PHASE.DONE);
    } catch (err) {
      setError(err.message || 'Eroare la antrenare');
      setPhase(PHASE.IDLE);
    }
  }, [data, kind, config, batchSize]);

  const handleDownload = useCallback(async () => {
    if (!modelRef.current) return;
    await modelRef.current.save(`downloads://${saveName}`);
    const blob = new Blob([JSON.stringify({
      labels: data.labels,
      version: new Date().toISOString().slice(0, 10),
      vectorSize: VECTOR_SIZE,
      kind,
    })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = labelsName;
    a.click();
    URL.revokeObjectURL(a.href);
    setDownloaded(true);
  }, [data, saveName, labelsName, kind]);

  const isTraining = phase === PHASE.TRAIN;
  const weakLabels = perLabel && data?.labels
    ? data.labels
      .map((l, i) => ({ l, acc: perLabel[i] ?? 0 }))
      .filter((x) => x.acc < 0.7)
      .sort((a, b) => a.acc - b.acc)
    : [];

  return (
    <section>
      <p className="text-ink-400 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
        {stepNo} · {title}
      </p>

      {phase !== PHASE.DONE && !isTraining && (
        <button
          onClick={handleTrain}
          className={`w-full py-4 text-white font-bold rounded-2xl active:scale-[0.97] transition-transform
            ${isGreen
              ? 'bg-signa-500 shadow-button'
              : 'bg-indigo-500 shadow-[0_6px_24px_rgba(99,102,241,0.25)]'}`}
        >
          Antrenează · {data.labels.length} clase · max {config.epochs} epoci
        </button>
      )}

      {isTraining && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-ink-500 text-xs">
              Antrenare WebGL… (se oprește singur când nu mai crește)
            </span>
            <button
              onClick={() => { stopRef.current = true; }}
              className="text-red-500/80 hover:text-red-500 text-xs transition-colors"
            >
              Oprește
            </button>
          </div>
          <div className="h-1 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(history.length / config.epochs) * 100}%`,
                background: accent,
              }}
            />
          </div>
          <TrainChart history={history} accent={accent} />
        </div>
      )}

      {phase === PHASE.DONE && (
        <div className="space-y-4">
          <TrainChart
            history={history}
            accent={accent}
            testAcc={testAcc}
            earlyStopped={earlyStopped}
            epochsRan={epochsRan}
          />

          <p className="text-ink-400 text-[11px] text-center">
            {trainN} exemple la train (cu augmentare ×{config.aug})
            {earlyStopped ? ' · oprit automat la plateau' : ''}
          </p>

          {weakLabels.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold mb-1">Litere slabe pe test (&lt;70%) — recolectează-le</p>
              <p>{weakLabels.map((x) => `${x.l} ${(x.acc * 100).toFixed(0)}%`).join(' · ')}</p>
            </div>
          )}

          <button
            onClick={handleDownload}
            className={`w-full py-4 text-white font-bold rounded-2xl active:scale-[0.97] transition-transform
              ${isGreen
                ? 'bg-signa-500 shadow-button'
                : 'bg-indigo-500 shadow-[0_6px_24px_rgba(99,102,241,0.25)]'}`}
          >
            Descarcă modelul
          </button>

          {downloaded && (
            <div className="bg-cream-50 rounded-2xl p-4 space-y-2.5 border border-ink-900/[0.04]">
              <p className="text-ink-900 text-sm font-semibold">Pasul următor</p>
              <p className="text-ink-500 text-xs leading-relaxed">
                Copiază fișierele descărcate în:
              </p>
              <div className="bg-white rounded-xl px-3.5 py-2.5 font-mono text-xs text-signa-600 border border-ink-900/5">
                public/models/
              </div>
              <p className="text-ink-400 text-[11px] leading-relaxed">
                Fișiere: {fileList.map((f, i) => (
                  <span key={f}>
                    {i > 0 && ', '}
                    <code className="text-ink-600">{f}</code>
                  </span>
                ))}
                . Apoi hard-refresh (sau vezi docs/retrain.md).
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2 px-1">{error}</p>}
    </section>
  );
}

/* ── Pagina principală ───────────────────────────────────────── */
export default function TrainPage({ onBack, canLoadCloud = false }) {
  const [staticData, setStaticData] = useState(null);
  const [dynData, setDynData] = useState(null);
  const [preset, setPreset] = useState('standard');
  const [error, setError] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [sourceNote, setSourceNote] = useState('');

  const applySets = useCallback((st, dy, note) => {
    if (!st && !dy) {
      throw new Error('Dataset incompatibil sau prea mic (minim 2 etichete pe tip).');
    }
    setStaticData(st);
    setDynData(dy);
    setSourceNote(note);
    setFileKey((k) => k + 1);
  }, []);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const raw = await readJsonObject(file, MAX_TRAIN_IMPORT_BYTES);
      const { staticData: st, dynData: dy, all } = parseRawDataset(raw);
      if (!st && !dy) {
        const diag = all.map(([k, arr]) => {
          const n = (arr ?? []).length;
          const ok = (arr ?? []).filter(isVec).length;
          const seqOk = (arr ?? []).filter(isSeq).length;
          const lens = [...new Set((arr ?? []).map((s) => (Array.isArray(s) ? s.length : typeof s)))];
          return `${k}: ${ok}/${n} ok (dim ${lens.join(',')}${seqOk ? `, ${seqOk} seq` : ''})`;
        });
        throw new Error(
          `Dataset incompatibil (așteptat VECTOR_SIZE ${VECTOR_SIZE}, min. 2 litere). ${diag.join(' · ') || 'gol'}`,
        );
      }
      applySets(st, dy, 'Fișier JSON');
    } catch (err) {
      setError(err.message || 'Fișier invalid');
      setStaticData(null);
      setDynData(null);
    }
  }, [applySets]);

  const handleCloud = useCallback(async () => {
    setError('');
    setCloudLoading(true);
    try {
      const { staticData: st, dynData: dy } = await loadCloudTrainSets();
      applySets(st, dy, 'Dataset comun (split pe sesiune)');
    } catch (err) {
      setError(err.message || 'Nu am putut încărca din cloud');
      setStaticData(null);
      setDynData(null);
    } finally {
      setCloudLoading(false);
    }
  }, [applySets]);

  const hasData = staticData || dynData;
  const config = PRESETS.find((p) => p.id === preset) ?? PRESETS[1];

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-ink-900/[0.06]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-ink-500 hover:text-ink-900 text-sm font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Înapoi
        </button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">ANTRENARE</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-5 space-y-5">
        <section>
          <p className="text-ink-400 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
            1 · Dataset
          </p>

          {!hasData ? (
            <div className="space-y-3">
              {canLoadCloud && (
                <button
                  type="button"
                  onClick={handleCloud}
                  disabled={cloudLoading}
                  className="w-full rounded-2xl bg-signa-500 py-4 text-sm font-bold text-white
                    shadow-button active:scale-[0.97] disabled:opacity-50"
                >
                  {cloudLoading ? 'Se încarcă din cloud…' : 'Încarcă din cloud'}
                </button>
              )}
              <label className="flex flex-col items-center justify-center gap-2.5
                border-2 border-dashed border-ink-900/10 rounded-2xl p-8 cursor-pointer bg-white
                hover:border-signa-500/40 hover:bg-signa-50/50 transition-all duration-200 shadow-card">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-ink-400">
                  <path d="M16 4v16m0-16l-5 5m5-5l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 22v2a4 4 0 004 4h16a4 4 0 004-4v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <div className="text-center">
                  <p className="text-ink-700 text-sm font-medium">sau încarcă un JSON</p>
                  <p className="text-ink-400 text-xs mt-0.5">backup exportat din colectare</p>
                </div>
                <input type="file" accept=".json" className="hidden" onChange={handleFile} />
              </label>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 space-y-3 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-ink-900 text-sm font-semibold">
                  {(staticData?.labels.length ?? 0) + (dynData?.labels.length ?? 0)} etichete detectate
                </p>
                <div className="flex items-center gap-3">
                  {canLoadCloud && (
                    <button
                      type="button"
                      onClick={handleCloud}
                      disabled={cloudLoading}
                      className="text-signa-600 text-xs font-medium hover:underline disabled:opacity-50"
                    >
                      {cloudLoading ? 'Se încarcă…' : 'Reîncarcă cloud'}
                    </button>
                  )}
                  <label className="text-signa-600 text-xs font-medium cursor-pointer hover:underline">
                    Schimbă fișier
                    <input type="file" accept=".json" className="hidden" onChange={handleFile} />
                  </label>
                </div>
              </div>
              {sourceNote && (
                <p className="text-[11px] font-semibold text-ink-400">{sourceNote}</p>
              )}
              {(staticData?.groups || dynData?.groups) && (
                <p className="text-[11px] font-semibold text-signa-700">
                  Split pe sesiune — exemplele din aceeași serie nu se amestecă între train și test.
                </p>
              )}

              {staticData && (
                <div>
                  <p className="text-ink-400 text-[10px] uppercase tracking-wider mb-1.5">
                    Statice · {staticData.X.length} exemple
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {staticData.labels.map((l) => (
                      <div key={l} className="flex items-center gap-1 bg-cream-100 rounded-lg px-2 py-1">
                        <span className="text-ink-900 text-xs font-bold">{l}</span>
                        <span className="text-ink-400 text-[10px]">{staticData.counts[l]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dynData && (
                <div>
                  <p className="text-indigo-500 text-[10px] uppercase tracking-wider mb-1.5">
                    Cu mișcare · {dynData.X.length} înregistrări
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dynData.labels.map((l) => (
                      <div key={l} className="flex items-center gap-1 bg-indigo-50 rounded-lg px-2 py-1">
                        <span className="text-indigo-600 text-xs font-bold">{l}</span>
                        <span className="text-indigo-400 text-[10px]">{dynData.counts[l]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-500 text-xs mt-2 px-1">{error}</p>}
        </section>

        {hasData && (
          <section>
            <p className="text-ink-400 text-[10px] font-semibold tracking-[0.18em] uppercase mb-3">
              2 · Configurare
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`py-3.5 rounded-xl flex flex-col items-center gap-0.5 transition-all
                    ${preset === p.id
                      ? 'bg-signa-50 border border-signa-300 text-signa-600'
                      : 'bg-white border border-transparent text-ink-500 hover:text-ink-700 shadow-card'}`}
                >
                  <span className="font-bold text-sm">{p.label}</span>
                  <span className="text-[10px] opacity-60">max {p.epochs}</span>
                  <span className="text-[10px] opacity-50">{p.desc}</span>
                </button>
              ))}
            </div>
            <p className="text-ink-400 text-[11px] mt-2 leading-relaxed">
              Early stop + augmentare + greutăți pe clase. Se oprește când validarea nu mai crește.
            </p>
          </section>
        )}

        {staticData && (
          <TrainerSection
            key={`static-${fileKey}-${preset}`}
            stepNo="3"
            title="Model static"
            kind="static"
            data={staticData}
            config={config}
            accent="#34d399"
            saveName="signa-model"
            labelsName="signa-labels.json"
            fileList={['signa-model.json', 'signa-model.weights.bin', 'signa-labels.json']}
          />
        )}

        {dynData && (
          <TrainerSection
            key={`dyn-${fileKey}-${preset}`}
            stepNo={staticData ? '4' : '3'}
            title="Model de mișcare"
            kind="dynamic"
            data={dynData}
            config={config}
            accent="#818cf8"
            saveName="signa-model-dynamic"
            labelsName="signa-labels-dynamic.json"
            fileList={[
              'signa-model-dynamic.json',
              'signa-model-dynamic.weights.bin',
              'signa-labels-dynamic.json',
            ]}
          />
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
