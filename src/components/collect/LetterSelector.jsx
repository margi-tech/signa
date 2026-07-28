import { useEffect, useRef } from 'react';
import { LSR_ALPHABET, DYNAMIC_LETTERS, minFor } from '../../data/lsr-alphabet';

function status(letter, count) {
  if (count === 0) return 'empty';
  if (count < minFor(DYNAMIC_LETTERS.has(letter))) return 'partial';
  return 'done';
}

export default function LetterSelector({ activeLetter, onSelect, samplesFor }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeLetter]);

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-2">
      {LSR_ALPHABET.map((letter) => {
        const s = status(letter, samplesFor(letter));
        const active = letter === activeLetter;
        const isDynamic = DYNAMIC_LETTERS.has(letter);

        return (
          <button
            key={letter}
            ref={active ? activeRef : null}
            onClick={() => onSelect(letter)}
            title={isDynamic ? 'Literă dinamică — se înregistrează mișcarea (1.5s)' : undefined}
            className={`
              relative flex-shrink-0 w-12 h-12 rounded-xl text-sm font-bold
              transition-all duration-150 select-none
              ${active
                ? 'bg-signa-500 text-white scale-105 shadow-button'
                : s === 'done'
                  ? 'bg-signa-50 text-signa-600'
                  : s === 'partial'
                    ? 'bg-amber-50 text-amber-600'
                    : isDynamic
                      ? 'bg-indigo-50 text-indigo-500'
                      : 'bg-cream-100 text-ink-500'}
            `}
          >
            {letter}
            {isDynamic && (
              <svg className="absolute top-1 right-1" width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4c1-2 2-2 3 0s2 2 3 0"
                  stroke={active ? '#fff' : '#818cf8'}
                  strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
            {!active && s !== 'empty' && (
              <span className={`absolute bottom-[3px] left-1/2 -translate-x-1/2
                w-3 h-[2px] rounded-full
                ${s === 'done' ? 'bg-signa-400' : 'bg-amber-400'}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
