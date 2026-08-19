import { useState } from 'react';
import {
  isUsernameTaken,
  requestPasswordReset,
  supabase,
} from '../../lib/supabase';
import { authErrorMessage } from '../../lib/authErrors';
import {
  validateEmail,
  validateName,
  validatePassword,
  validateUsername,
} from '../../utils/username';
import {
  AuthField,
  AuthInput,
  AuthTabs,
  PasswordInput,
  PasswordStrength,
  PrimaryButton,
} from './AuthUi';

/**
 * Panou autentificare: login, signup, reset parolă.
 */
export default function AuthPanel({ mode, onModeChange, busy, onBusy, onMessage, afterAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const run = async (fn) => {
    onBusy(true);
    onMessage(null);
    setFieldErrors({});
    try {
      await fn();
    } catch (err) {
      onMessage({ tone: 'error', text: authErrorMessage(err) });
    } finally {
      onBusy(false);
    }
  };

  const validateLogin = () => {
    const errs = {};
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = 'Parola e obligatorie.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateSignup = () => {
    const errs = {};
    const fnErr = validateName(firstName, 'Prenumele');
    const lnErr = validateName(lastName, 'Numele');
    if (fnErr) errs.firstName = fnErr;
    if (lnErr) errs.lastName = lnErr;
    const userErr = validateUsername(username);
    if (userErr) errs.username = userErr;
    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    const passErr = validatePassword(password);
    if (passErr) errs.password = passErr;
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  if (mode === 'forgot') {
    return (
      <div className="p-5 space-y-4">
        <div>
          <p className="text-ink-900 font-bold">Resetează parola</p>
          <p className="text-ink-500 text-sm mt-1 leading-relaxed">
            Primești un link pe email dacă există un cont cu adresa introdusă.
          </p>
        </div>
        <AuthField label="Email" error={fieldErrors.email}>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@gmail.com"
            autoComplete="email"
            error={fieldErrors.email}
          />
        </AuthField>
        <PrimaryButton
          disabled={busy}
          onClick={() => run(async () => {
            const emailErr = validateEmail(email);
            if (emailErr) {
              setFieldErrors({ email: emailErr });
              throw new Error(emailErr);
            }
            await requestPasswordReset(email);
            onMessage({
              tone: 'success',
              text: 'Dacă există un cont cu acest email, vei primi un link de resetare.',
            });
          })}
        >
          {busy ? 'Se trimite…' : 'Trimite link'}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => { onModeChange('login'); onMessage(null); }}
          className="text-sm text-ink-500 hover:text-ink-900 font-medium"
        >
          ← Înapoi
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <AuthTabs mode={mode} onChange={onModeChange} disabled={busy} />

      {mode === 'signup' && (
        <div className="grid grid-cols-2 gap-3">
          <AuthField label="Prenume" error={fieldErrors.firstName}>
            <AuthInput
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Maria"
              autoComplete="given-name"
              error={fieldErrors.firstName}
            />
          </AuthField>
          <AuthField label="Nume" error={fieldErrors.lastName}>
            <AuthInput
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Popescu"
              autoComplete="family-name"
              error={fieldErrors.lastName}
            />
          </AuthField>
        </div>
      )}

      {mode === 'signup' && (
        <AuthField
          label="Username"
          hint="3–20 caractere, litere, cifre, punct sau underscore"
          error={fieldErrors.username}
        >
          <AuthInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="maria.pop"
            autoComplete="username"
            error={fieldErrors.username}
          />
        </AuthField>
      )}

      <AuthField label="Email" error={fieldErrors.email}>
        <AuthInput
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nume@gmail.com"
          autoComplete="email"
          error={fieldErrors.email}
        />
      </AuthField>

      <div className="space-y-1">
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
        />
        {mode === 'signup' && <PasswordStrength password={password} />}
      </div>

      {mode === 'login' && (
        <button
          type="button"
          onClick={() => { onModeChange('forgot'); onMessage(null); }}
          className="text-sm text-ink-500 hover:text-ink-900 font-medium"
        >
          Ai uitat parola?
        </button>
      )}

      {mode === 'login' ? (
        <PrimaryButton
          disabled={busy}
          onClick={() => run(async () => {
            if (!validateLogin()) throw new Error('Verifică câmpurile marcate.');
            const { error } = await supabase.auth.signInWithPassword({
              email: email.trim().toLowerCase(),
              password,
            });
            if (error) throw error;
            await afterAuth();
            onMessage({ tone: 'success', text: 'Bine ai revenit.' });
          })}
        >
          {busy ? 'Se conectează…' : 'Intră în cont'}
        </PrimaryButton>
      ) : (
        <PrimaryButton
          disabled={busy}
          onClick={() => run(async () => {
            if (!validateSignup()) throw new Error('Verifică câmpurile marcate.');
            if (await isUsernameTaken(username.trim())) {
              setFieldErrors({ username: 'Username-ul e deja luat.' });
              throw new Error('Username-ul e deja luat.');
            }
            const { data, error } = await supabase.auth.signUp({
              email: email.trim().toLowerCase(),
              password,
              options: {
                data: {
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  username: username.trim(),
                },
              },
            });
            if (error) throw error;
            if (data.session) {
              await afterAuth();
              onMessage({ tone: 'success', text: 'Cont creat.' });
            } else {
              onMessage({
                tone: 'info',
                text: 'Verifică emailul pentru confirmare, apoi revino să te conectezi.',
              });
            }
          })}
        >
          {busy ? 'Se creează…' : 'Creează cont'}
        </PrimaryButton>
      )}
    </div>
  );
}
