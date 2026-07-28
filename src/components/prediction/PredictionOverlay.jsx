/**
 * Afișează predicția curentă peste camera video.
 * Filtrarea (confidence, marjă, stabilitate) se face în CameraPage —
 * aici doar afișăm ce a trecut de filtre.
 */
export default function PredictionOverlay({ prediction }) {
  const show = !!prediction;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-end
        pb-28 pointer-events-none z-10
        transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {show && (
        <div className="flex flex-col items-center gap-3">
          {/* Litera prezisă — glow verde (static) sau violet (mișcare) */}
          <span
            className="font-black text-white leading-none select-none"
            role="status"
            style={{
              fontSize: 'clamp(80px, 28vw, 128px)',
              textShadow: prediction.dynamic
                ? '0 0 48px rgba(129,140,248,0.55), 0 2px 16px rgba(0,0,0,0.8)'
                : '0 0 48px rgba(52,211,153,0.45), 0 2px 16px rgba(0,0,0,0.8)',
            }}
          >
            {prediction.label}
          </span>

          {/* Marcaj semn dinamic */}
          {prediction.dynamic && (
            <span className="flex items-center gap-1.5 text-indigo-300 text-xs font-medium -mt-1">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M1 5c2-4 4-4 6 0s4 4 6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              semn cu mișcare
            </span>
          )}

          {/* Bara de confidence */}
          <div className="flex items-center gap-2.5">
            <div className="w-32 h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-150
                  ${prediction.dynamic ? 'bg-indigo-400' : 'bg-signa-400'}`}
                style={{ width: `${prediction.confidence * 100}%` }}
              />
            </div>
            <span className="text-white/55 text-xs tabular-nums font-medium">
              {Math.round(prediction.confidence * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
