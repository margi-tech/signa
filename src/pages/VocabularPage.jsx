import { WORD_CATEGORIES } from '../data/words';
import { useState } from 'react';

export default function VocabularPage({ onBack }) {
  const [selectedWord, setSelectedWord] = useState(null);

  const categories = ['pronume', 'familie'];
  const visibleCategories = WORD_CATEGORIES.filter(cat => categories.includes(cat.id));

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full hover:bg-ink-900/[0.05] flex items-center justify-center transition-colors"
          aria-label="Înapoi"
        >
          ←
        </button>
        <span className="font-bold text-ink-900">Prieteni & Familie</span>
        <div className="w-9" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-6">
          {visibleCategories.map((category) => (
            <div key={category.id}>
              <h2 className="text-sm font-bold text-ink-600 uppercase tracking-wider mb-3">
                {category.title}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {category.words.map((word) => (
                  <button
                    key={word.id}
                    onClick={() => setSelectedWord(selectedWord?.id === word.id ? null : word)}
                    className="bg-white rounded-xl p-3 shadow-card hover:shadow-soft 
                               active:scale-[0.97] transition-all text-left"
                  >
                    <div className="font-semibold text-ink-900 text-sm mb-2">{word.label}</div>
                    <div className="flex gap-1 flex-wrap">
                      {word.letters.map((letter) => (
                        <span
                          key={letter}
                          className="w-6 h-6 rounded-md bg-signa-50 text-signa-600 font-bold text-xs
                                     flex items-center justify-center"
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedWord && (
        <div className="flex-shrink-0 px-6 pb-6 bg-white/80 backdrop-blur-sm border-t border-ink-900/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-ink-900">{selectedWord.label}</span>
            <button
              onClick={() => setSelectedWord(null)}
              className="text-ink-400 hover:text-ink-600 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedWord.letters.map((letter) => (
              <span
                key={letter}
                className="w-10 h-10 rounded-lg bg-signa-100 text-signa-600 font-bold
                           flex items-center justify-center"
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
