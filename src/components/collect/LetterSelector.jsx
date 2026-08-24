import { useEffect, useMemo, useRef, useState } from 'react';
import {
    LSR_LETTERS,
    LSR_FOOD_WORDS,
    DYNAMIC_LETTERS,
    LSR_DIGITS,
    LSR_NUMBERS,
    LSR_COLORS,
    minFor,
    LSR_SALUTATION,
    LSR_PRONOUNS,
    LSR_FAMILY
} from '../../data/lsr-alphabet';

function status(letter, count) {
  if (count === 0) return 'empty';
  if (count < minFor(DYNAMIC_LETTERS.has(letter))) return 'partial';
  return 'done';
}

/** Inventarul complet de etichete, în aceeași ordine cu lecțiile. */
export const COLLECTION_GROUPS = [
  { id: 'letters', title: 'Litere',              items: LSR_LETTERS },
  { id: 'digits', title: 'Cifre',                 items: LSR_DIGITS },
  { id: 'numbers', title: 'Numere',               items: LSR_NUMBERS },
  { id: 'food', title: 'Mâncare',                 items: LSR_FOOD_WORDS },
  { id: 'colors', title: 'Culori',                items: LSR_COLORS },
  { id: 'salutations', title: 'Saluturi',         items: LSR_SALUTATION },
  { id: 'pronouns', title: 'Pronume',             items: LSR_PRONOUNS },
  { id: 'family', title: 'Familie',               items: LSR_FAMILY },
];

function Tile({ letter, active, s, isDynamic, count, refCb, onSelect }) {
  const target = minFor(isDynamic);
  const pct = Math.min(count / target, 1);
  return (
    <button
      ref={refCb}
      onClick={() => onSelect(letter)}
      title={`${count}/${target} ${isDynamic ? 'filmări' : 'poze'}`}
      className={`
        group relative min-w-0 rounded-[15px] border px-3 py-2.5 text-left
        transition-[transform,border-color,background-color,box-shadow] duration-150 select-none
        hover:-translate-y-px
        ${active
          ? 'bg-ink-900 border-ink-900 text-white shadow-[0_8px_18px_rgba(46,42,36,.16)]'
          : s === 'done'
            ? 'bg-signa-50 border-signa-500/[.18] text-signa-900'
            : s === 'partial'
              ? 'bg-[#FFF7E8] border-amber-600/[.14] text-amber-800'
              : isDynamic
                ? 'bg-[#F4F1FB] border-violet-500/[.12] text-violet-700'
                : 'bg-[#FBF7F0] border-ink-900/[.05] text-ink-700'}
      `}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="truncate text-[12.5px] font-extrabold">{letter}</span>
        <span className={`flex-none text-[10px] font-black tabular-nums ${active ? 'text-white/65' : 'opacity-55'}`}>
          {count}/{target}
        </span>
      </span>
      <span className={`mt-2 block h-1 rounded-full overflow-hidden ${active ? 'bg-white/15' : 'bg-ink-900/[.06]'}`}>
        <span
          className={`block h-full rounded-full transition-[width] duration-500
            ${active ? 'bg-signa-400' : s === 'done' ? 'bg-signa-500' : isDynamic ? 'bg-violet-400' : 'bg-amber-400'}`}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className={`mt-1.5 block text-[9.5px] font-bold uppercase tracking-[.08em]
        ${active ? 'text-white/55' : 'opacity-45'}`}>
        {isDynamic ? 'filmări' : 'poze'}
      </span>
    </button>
  );
}

function GroupRow({ title, items, activeLetter, onSelect, samplesFor, activeRef }) {
  const doneCount = items.filter((l) => samplesFor(l) >= minFor(DYNAMIC_LETTERS.has(l))).length;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-2 px-0.5">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
          {title}
        </span>
        <span className="text-[10px] font-bold tabular-nums text-ink-400">
          {doneCount}/{items.length} complete
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((letter) => {
          const active = letter === activeLetter;
          const count = samplesFor(letter);
          return (
            <Tile
              key={letter}
              letter={letter}
              active={active}
              s={status(letter, count)}
              isDynamic={DYNAMIC_LETTERS.has(letter)}
              count={count}
              refCb={active ? activeRef : null}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function LetterSelector({
  activeLetter,
  onSelect,
  samplesFor,
  extraLabels = [],
}) {
  const activeRef = useRef(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeLetter]);

  const groups = useMemo(() => {
    const known = new Set(COLLECTION_GROUPS.flatMap((g) => g.items));
    const custom = extraLabels.filter((label) => !known.has(label));
    const all = custom.length
      ? [...COLLECTION_GROUPS, { id: 'custom', title: 'Etichete proprii', items: custom }]
      : COLLECTION_GROUPS;
    const needle = query.trim().toLocaleLowerCase('ro-RO');
    if (!needle) return all;
    return all
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.toLocaleLowerCase('ro-RO').includes(needle)),
      }))
      .filter((group) => group.items.length);
  }, [extraLabels, query]);

  return (
    <div className="flex flex-col gap-4">
      <label className="relative block">
        <span className="sr-only">Filtrează etichetele</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrează litere și cuvinte…"
          className="w-full rounded-2xl border border-ink-900/[.08] bg-[#FDFCF9] px-4 py-3
            text-[13px] font-semibold text-ink-900 placeholder:text-ink-400 outline-none
            focus:border-signa-500 focus:ring-4 focus:ring-signa-500/[.12]"
        />
      </label>
      {groups.map((g) => (
        <GroupRow
          key={g.id}
          title={g.title}
          items={g.items}
          activeLetter={activeLetter}
          onSelect={onSelect}
          samplesFor={samplesFor}
          activeRef={activeRef}
        />
      ))}
      {groups.length === 0 && (
        <p className="py-5 text-center text-[12px] font-semibold text-ink-400">
          Nicio etichetă găsită.
        </p>
      )}
    </div>
  );
}
