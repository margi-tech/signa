import { useState } from 'react';
import { isValidEmail, isValidPassword } from '../utils/validation';

const inputClass = `w-full bg-white border rounded-xl px-3.5 py-2.5
  text-ink-900 text-sm font-semibold placeholder:text-ink-400 placeholder:font-normal
  focus:outline-none shadow-card transition-colors`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-ink-600 text-xs font-semibold mb-1 block">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}
    </div>
  );
}

export default function LoginPage({ onBack, onSwitchToSignup, onSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const next = {};

    if (!identifier.trim()) {
      next.identifier = 'Introdu username-ul sau emailul.';
    } else if (identifier.includes('@') && !isValidEmail(identifier)) {
      next.identifier = 'Format de email invalid.';
    }

    if (!password) {
      next.password = 'Introdu parola.';
    } else if (!isValidPassword(password)) {
      next.password = 'Minim 5 caractere, cel puțin o cifră.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(false);
    if (validate()) setSuccess(true);
  };

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />
      <header className="flex items-center justify-between px-5 py-4 flex-shrink-0">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-900 text-sm font-medium">← Înapoi</button>
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">AUTENTIFICARE</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-signa-600 text-[11px] font-bold tracking-[0.2em] uppercase mb-1 mt-2">Bine ai revenit</p>
        <h2 className="text-ink-900 font-black text-2xl mb-6">Intră în cont</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 space-y-4" noValidate>
          <Field label="Username sau email" error={errors.identifier}>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="username sau email"
              autoCapitalize="off"
              autoCorrect="off"
              className={`${inputClass} ${errors.identifier ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          <Field label="Parolă" error={errors.password}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="parolă"
              className={`${inputClass} ${errors.password ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          {success ? (
            <div className="space-y-3">
              <p className="text-signa-600 text-sm font-semibold text-center">✓ Autentificare reușită</p>
              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button
                  active:scale-[0.97] transition-transform duration-100"
              >
                Continuă în aplicație
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-signa-500 text-white font-bold text-sm shadow-button
                active:scale-[0.97] transition-transform duration-100"
            >
              Intră în cont
            </button>
          )}
        </form>

        <p className="text-center text-ink-500 text-sm mt-5">
          Nu ai cont?{' '}
          <button onClick={onSwitchToSignup} className="text-signa-600 font-semibold hover:underline">
            Creează unul
          </button>
        </p>
      </div>
    </div>
  );
}
