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

const initialForm = { nume: '', prenume: '', username: '', email: '', password: '', confirmPassword: '' };

export default function SignupPage({ onBack, onSwitchToLogin, onSuccess }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};

    if (!form.nume.trim()) next.nume = 'Introdu numele.';
    if (!form.prenume.trim()) next.prenume = 'Introdu prenumele.';

    if (!form.username.trim()) {
      next.username = 'Introdu un username.';
    } else if (form.username.trim().length < 3) {
      next.username = 'Minim 3 caractere.';
    }

    if (!form.email.trim()) {
      next.email = 'Introdu emailul.';
    } else if (!isValidEmail(form.email)) {
      next.email = 'Format de email invalid.';
    }

    if (!form.password) {
      next.password = 'Introdu parola.';
    } else if (!isValidPassword(form.password)) {
      next.password = 'Minim 5 caractere, cel puțin o cifră.';
    }

    if (!form.confirmPassword) {
      next.confirmPassword = 'Confirmă parola.';
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Parolele nu coincid.';
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
        <h1 className="text-ink-900 font-bold tracking-[0.18em] text-sm">CONT NOU</h1>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-signa-600 text-[11px] font-bold tracking-[0.2em] uppercase mb-1 mt-2">Hai să începem</p>
        <h2 className="text-ink-900 font-black text-2xl mb-6">Creează cont</h2>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nume" error={errors.nume}>
              <input
                type="text"
                value={form.nume}
                onChange={setField('nume')}
                placeholder="Popescu"
                className={`${inputClass} ${errors.nume ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
              />
            </Field>
            <Field label="Prenume" error={errors.prenume}>
              <input
                type="text"
                value={form.prenume}
                onChange={setField('prenume')}
                placeholder="Ana"
                className={`${inputClass} ${errors.prenume ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
              />
            </Field>
          </div>

          <Field label="Username" error={errors.username}>
            <input
              type="text"
              value={form.username}
              onChange={setField('username')}
              placeholder="ana_popescu"
              autoCapitalize="off"
              autoCorrect="off"
              className={`${inputClass} ${errors.username ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={setField('email')}
              placeholder="ana@exemplu.ro"
              autoCapitalize="off"
              autoCorrect="off"
              className={`${inputClass} ${errors.email ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          <Field label="Parolă" error={errors.password}>
            <input
              type="password"
              value={form.password}
              onChange={setField('password')}
              placeholder="minim 5 caractere, o cifră"
              className={`${inputClass} ${errors.password ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          <Field label="Confirmare parolă" error={errors.confirmPassword}>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              placeholder="repetă parola"
              className={`${inputClass} ${errors.confirmPassword ? 'border-red-400' : 'border-ink-900/10 focus:border-signa-500/50'}`}
            />
          </Field>

          {success ? (
            <div className="space-y-3">
              <p className="text-signa-600 text-sm font-semibold text-center">✓ Cont creat cu succes</p>
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
              Creează cont
            </button>
          )}
        </form>

        <p className="text-center text-ink-500 text-sm mt-5">
          Ai deja cont?{' '}
          <button onClick={onSwitchToLogin} className="text-signa-600 font-semibold hover:underline">
            Intră
          </button>
        </p>
      </div>
    </div>
  );
}
