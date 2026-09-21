import ReferencePreview from './ReferencePreview';
import DYNAMIC_HAND_ANIMATIONS from '../../data/dynamic-hand-animations';
import { isWord } from '../../data/lsr-alphabet';
import { referenceMediaFor } from '../../data/reference-media';

const EASE = 'cubic-bezier(.22,1,.36,1)';
const anim = (name, dur, delay = 0) => ({
  animation: `${name} ${dur}s ${EASE} ${delay}s both`,
});

function badgeSize(label) {
  const len = label?.length ?? 1;
  if (len <= 1) return 'text-xl';
  if (len <= 3) return 'text-base';
  if (len <= 8) return 'text-xs';
  return 'text-[11px] leading-tight';
}

function SignFigure({ target, pose, isDynamic }) {
  const MovementHint = isDynamic ? DYNAMIC_HAND_ANIMATIONS[target] : null;

  if (MovementHint) {
    return (
      <div className="w-full h-full flex items-center justify-center p-2 [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-full">
        <MovementHint />
      </div>
    );
  }

  return (
    <ReferencePreview
      target={target}
      pose={pose}
      fit="contain"
      className="w-full h-full"
    />
  );
}

/**
 * Cartea cu semnul de copiat — foto/animație mare, nu thumbnail.
 */
export function SignWell({
  target,
  pose,
  isDynamic,
  isSuccess,
  holdPct,
  className = '',
  showBadge = true,
}) {
  const usesPhoto = Boolean(referenceMediaFor(target)) && !DYNAMIC_HAND_ANIMATIONS[target];

  return (
    <div className={`relative ${className}`}>
      <div
        className={`w-full h-full overflow-hidden rounded-[22px] transition-[box-shadow] duration-200
          ${usesPhoto ? 'bg-black' : 'bg-cream-100'}
          ${isSuccess ? 'ring-[3px] ring-signa-400' : ''}`}
        style={{
          boxShadow: holdPct > 0 && !isSuccess
            ? `inset 0 0 0 3px rgba(16,185,129,${0.3 + holdPct * 0.7})`
            : undefined,
        }}
      >
        <div key={target} className="w-full h-full" style={anim('sg-scale-in', 0.38)}>
          <SignFigure target={target} pose={pose} isDynamic={isDynamic} />
        </div>
      </div>

      {showBadge && (
        <div
          className={`absolute top-2.5 left-2.5 min-w-[2.35rem] max-w-[calc(100%-1.25rem)] h-9 px-2 rounded-xl
            flex items-center justify-center font-black text-center shadow-soft
            ${badgeSize(target)}
            ${isSuccess ? 'bg-signa-500 text-white' : 'bg-white text-ink-900'}`}
        >
          {target}
        </div>
      )}

      {isDynamic && (
        <span className="absolute bottom-2.5 right-2.5 h-6 px-2 rounded-full bg-black/55 text-white
          text-[10px] font-bold tracking-wide flex items-center">
          Mișcare
        </span>
      )}
    </div>
  );
}

/**
 * Panoul de coaching: pe mobil e dock sub cameră, pe desktop coloană lângă vizor.
 */
export default function SignCoach({
  target,
  pose,
  isDynamic,
  isSuccess,
  holdPct,
  onSkip,
  letters,
  idx,
  skipped,
}) {
  return (
    <aside
      className="flex-shrink-0 flex flex-col bg-white border-t border-ink-900/[0.06]
        px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]
        lg:w-[360px] xl:w-[400px] lg:border lg:border-ink-900/[0.06] lg:rounded-[26px]
        lg:px-6 lg:py-6 lg:shadow-card lg:overflow-hidden min-h-0"
    >
      <p className="hidden lg:block text-[11px] font-bold uppercase tracking-[0.18em] text-ink-400 mb-3">
        De reprodus
      </p>

      <div className="hidden lg:flex flex-1 min-h-[220px] mb-5">
        <SignWell
          target={target}
          pose={pose}
          isDynamic={isDynamic}
          isSuccess={isSuccess}
          holdPct={holdPct}
          className="w-full h-full"
        />
      </div>

      <div className="min-w-0">
        <p className="text-ink-900 font-bold text-[15px] lg:text-xl text-pretty leading-snug">
          {isWord(target) ? `Semnul „${target}"` : `Fă semnul „${target}"`}
        </p>
        <p className="text-ink-500 text-xs lg:text-sm mt-0.5">
          {isDynamic
            ? 'fă mișcarea și ține până se umple bara'
            : 'copiază imaginea și ține-l până se umple bara'}
        </p>
      </div>

      {letters?.length > 1 && (
        <div className="hidden lg:flex flex-wrap gap-1.5 mt-4">
          {letters.map((l, i) => {
            const done = i < idx;
            const current = i === idx;
            const wasSkipped = skipped?.includes(l);
            return (
              <span
                key={`${l}-${i}`}
                className={`min-w-[1.75rem] h-7 px-1.5 rounded-lg text-xs font-bold flex items-center justify-center
                  ${current
                    ? 'bg-ink-900 text-white'
                    : done
                      ? wasSkipped ? 'bg-amber-100 text-amber-600' : 'bg-signa-50 text-signa-600'
                      : 'bg-cream-100 text-ink-400'}`}
              >
                {l}
              </span>
            );
          })}
        </div>
      )}

      <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden mt-3.5">
        <div
          className={`h-full rounded-full transition-all duration-100
            ${isSuccess ? 'bg-signa-400' : holdPct > 0 ? 'bg-signa-500' : 'bg-transparent'}`}
          style={{ width: `${holdPct * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-2 w-full py-2 text-ink-400 hover:text-ink-600 text-xs font-medium transition-colors"
      >
        {isWord(target) ? 'Sari peste cuvântul ăsta →' : 'Sari peste litera asta →'}
      </button>
    </aside>
  );
}
