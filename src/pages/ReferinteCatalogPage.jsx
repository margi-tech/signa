import { useEffect, useMemo, useState } from 'react';
import ReferenceHand3D from '../components/lesson/ReferenceHand3D';
import REFERENCE_POSES from '../data/reference-poses.json';

/** Litere statice din modelul antrenat + reference-poses.json (Faza 1). */
export const STATIC_CATALOG_LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'Y', 'Â', 'Ă',
];

function LetterCard({ letter, pose, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(letter)}
      className="group text-left bg-white rounded-[22px] border border-ink-900/[0.06]
        shadow-card hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200
        p-4 flex flex-col min-h-[220px] focus:outline-none focus-visible:ring-2
        focus-visible:ring-signa-500/40"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="w-10 h-10 rounded-2xl bg-cream-100 text-ink-900 font-black text-xl
          flex items-center justify-center">
          {letter}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
          static
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center py-1 min-h-[140px]">
        <ReferenceHand3D pose={pose} className="w-full h-40" />
      </div>
      <p className="text-center text-xs font-semibold text-ink-500 mt-1">
        Dactilema „{letter}”
      </p>
    </button>
  );
}

function ZoomSheet({ letter, pose, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Dactilema ${letter}`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Închide"
      />
      <div className="relative w-full sm:max-w-md bg-cream rounded-t-[28px] sm:rounded-[28px]
        shadow-soft p-6 pb-8 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ink-400">
              Literă statică
            </p>
            <h2 className="text-3xl font-black text-ink-900 leading-none mt-1">{letter}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-ink-900/10 text-ink-500
              hover:text-ink-900 text-lg font-bold"
          >
            ×
          </button>
        </div>
        <div className="bg-white rounded-[24px] border border-ink-900/[0.06] p-3 shadow-card">
          <ReferenceHand3D
            pose={pose}
            interactive
            detail="high"
            className="w-full h-[min(52vh,340px)]"
          />
        </div>
        <p className="text-center text-sm text-ink-500 mt-4 leading-relaxed">
          Trage mâna ca să o vezi din toate părțile. Unghiile marchează dosul mâinii,
          iar eticheta din colț spune dacă privești palma sau dosul.
        </p>
      </div>
    </div>
  );
}

/**
 * Catalog de review — Faza 1: doar litere statice.
 * Deschide cu #referinte (fără login) sau din Unelte pe Acasă.
 */
export default function ReferinteCatalogPage({ onBack }) {
  const [open, setOpen] = useState(null);

  const letters = useMemo(
    () => STATIC_CATALOG_LETTERS.filter((l) => REFERENCE_POSES[l]?.length === 63),
    [],
  );

  const missing = STATIC_CATALOG_LETTERS.filter((l) => !REFERENCE_POSES[l]);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-ink-500 hover:text-ink-900 text-sm font-medium"
          >
            ← Înapoi
          </button>
        ) : (
          <div className="w-16" />
        )}
        <div className="text-center">
          <h1 className="text-ink-900 font-bold tracking-[0.14em] text-sm">REFERINȚE LSR</h1>
          <p className="text-[10px] font-semibold text-ink-400 tracking-wide">Faza 1 · litere statice</p>
        </div>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 pb-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-ink-600 text-sm leading-relaxed mb-5 px-1">
            {letters.length} dactileme 3D, din pose-urile înregistrate.
            Apasă o carte, apoi <span className="font-semibold text-ink-800">trage</span> ca
            să rotești mâna și să vezi clar încotro arată degetele.
          </p>

          {missing.length > 0 && (
            <p className="text-amber-700 text-xs mb-4 px-1">
              Fără poză: {missing.join(', ')}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {letters.map((letter) => (
              <LetterCard
                key={letter}
                letter={letter}
                pose={REFERENCE_POSES[letter]}
                onOpen={setOpen}
              />
            ))}
          </div>
        </div>
      </div>

      {open && (
        <ZoomSheet
          letter={open}
          pose={REFERENCE_POSES[open]}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
