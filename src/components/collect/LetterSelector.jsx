import { useEffect, useRef } from 'react';
import {
    LSR_LETTERS,
    LSR_FOOD_WORDS,
    DYNAMIC_LETTERS,
    LSR_DIGITS,
    LSR_NUMBERS,
    LSR_COLORS,
    minFor,
    LSR_SALUTATION
} from '../../data/lsr-alphabet';

function status(letter, count) {
  if (count === 0) return 'empty';
  if (count < minFor(DYNAMIC_LETTERS.has(letter))) return 'partial';
  return 'done';
}

// Separat categoriile din LSR_WORDS
const LSR_MÂNCARE = ['mâncare', 'apă', 'legumă', 'fruct', 'pâine', 'carne', 'supă', 'măr', 'cafea', 'lapte'];
const LSR_CULORI = ['alb', 'negru', 'gri', 'roșu', 'galben', 'portocaliu', 'albastru', 'verde', 'mov', 'maro', 'roz'];
const LSR_PRONUME_FAMILIE = ['eu', 'tu', 'el', 'ea', 'noi', 'voi', 'ei', 'ele', 'mamă', 'tată', 'frate', 'soră', 'bunicul', 'bunica', 'prieten', 'prietenă'];

/** Categorii afișate — poți adăuga aici viitoarele grupuri (culori, familie…). */
const GROUPS = [
  { id: 'letters', title: 'Litere',              items: LSR_LETTERS },
    {id: 'digits', title: 'Cifre',               items: LSR_DIGITS  },
    {id: 'numbers', title: 'Numere',             items: LSR_NUMBERS },
  { id: 'food',    title: 'Mâncare',   items: LSR_FOOD_WORDS   },
    {id: 'colors', title: "Culori",              items: LSR_COLORS },
    {id: 'Salutation', title: "Saluturi",              items: LSR_SALUTATION },
  { id: 'food',    title: 'Mâncare',             items: LSR_MÂNCARE   },
  { id: 'colors',  title: 'Culori',              items: LSR_CULORI },
  { id: 'pronouns', title: 'Pronume & Familie',  items: LSR_PRONUME_FAMILIE },
];

function Tile({ letter, active, s, isDynamic, isWord, refCb, onSelect }) {
  return (
    <button
      ref={refCb}
      onClick={() => onSelect(letter)}
      title={isDynamic ? 'Etichetă dinamică — se înregistrează mișcarea (1.5s)' : undefined}
      className={`
        relative flex-shrink-0 h-12 rounded-xl font-bold
        transition-all duration-150 select-none
        ${isWord ? 'px-3 text-xs min-w-[3.5rem]' : 'w-12 text-sm'}
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
}

function GroupRow({ title, items, activeLetter, onSelect, samplesFor, activeRef, isWordGroup }) {
  const doneCount = items.filter((l) => samplesFor(l) >= minFor(DYNAMIC_LETTERS.has(l))).length;

  return (
    <div className="px-4 pt-1.5 pb-1">
      <div className="flex items-baseline justify-between mb-1 px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {title}
        </span>
        <span className="text-[10px] tabular-nums text-ink-400">
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {items.map((letter) => {
          const active = letter === activeLetter;
          return (
            <Tile
              key={letter}
              letter={letter}
              active={active}
              s={status(letter, samplesFor(letter))}
              isDynamic={DYNAMIC_LETTERS.has(letter)}
              isWord={isWordGroup}
              refCb={active ? activeRef : null}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function LetterSelector({ activeLetter, onSelect, samplesFor }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeLetter]);

  return (
    <div className="space-y-0.5">
      {GROUPS.map((g) => (
        <GroupRow
          key={g.id}
          title={g.title}
          items={g.items}
          activeLetter={activeLetter}
          onSelect={onSelect}
          samplesFor={samplesFor}
          activeRef={activeRef}
          isWordGroup={g.id !== 'letters'}
        />
      ))}
    </div>
  );
}
