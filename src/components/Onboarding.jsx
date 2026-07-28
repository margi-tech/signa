import { useState } from 'react';

const STEPS = [
  {
    title: 'Bine ai venit la Signa',
    body: 'Înveți Limba Semnelor Române făcând semnele în fața camerei. Totul rulează pe telefonul tău — fără cloud, fără imagini pe server.',
    icon: '👋',
  },
  {
    title: 'Permite camera',
    body: 'Ai nevoie de cameră pentru a exersa. Semnele tale rămân pe dispozitiv. Poți refuza oricând din setările browserului.',
    icon: '📷',
  },
  {
    title: 'Cum ții mâna',
    body: 'Ridică mâna în fața camerei, pe un fundal cât de cât limpede. Ține semnul până se umple bara verde — așa confirmăm că e corect.',
    icon: '✋',
  },
  {
    title: 'Primul semn',
    body: 'Începe cu Lecția 1 (A–E). Sau încearcă „Scrie cuvântul" ca să dactilezi un cuvânt scurt literă cu literă.',
    icon: '✨',
  },
];

/**
 * Onboarding la prima deschidere — 4 pași, salvat în useProgress.
 */
export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden animate-fade-in">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-6 animate-float" aria-hidden>{s.icon}</div>
        <h1 className="text-ink-900 text-2xl font-black mb-3 tracking-tight">{s.title}</h1>
        <p className="text-ink-600 text-sm leading-relaxed max-w-xs">{s.body}</p>
      </div>

      <div className="flex-shrink-0 px-6 pb-10">
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-signa-500' : 'w-1.5 bg-ink-900/10'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => (last ? onDone() : setStep((x) => x + 1))}
          className="w-full py-[17px] bg-signa-500 text-white font-bold text-[15px] rounded-2xl
            shadow-button active:scale-[0.97] transition-transform"
        >
          {last ? 'Hai să începem' : 'Continuă'}
        </button>

        {!last && (
          <button
            onClick={onDone}
            className="w-full mt-3 py-2 text-ink-500 hover:text-ink-700 text-xs font-medium"
          >
            Sari peste
          </button>
        )}
      </div>
    </div>
  );
}
