import { useState } from 'react';
import { requestPasswordReset, supabase } from '../../lib/supabase';
import { validateEmail, validatePassword, validatePasswordConfirm } from '../../utils/username';
import { useAuthForm } from './useAuthForm';
import {
  AuthField,
  AuthInput,
  AuthTabs,
  MailIcon,
  OrSeparator,
  PasswordInput,
  PasswordStrength,
  PrimaryButton,
  SecondaryButton,
  SocialButtons,
} from './AuthUi';

/** OAuth e opțional — se afișează doar dacă providerii sunt configurați în Supabase. */
const OAUTH_ENABLED = import.meta.env.VITE_ENABLE_OAUTH === 'true';

const HEADINGS = {
  login: {
    title: 'Bine ai revenit',
    subtitle: 'Continuă de unde ai rămas cu lecțiile tale.',
  },
  signup: {
    title: 'Creează-ți contul',
    subtitle: 'Începe să înveți Limba Semnelor Române azi.',
  },
};

/**
 * Câmpurile de signup rămân montate la comutarea pe login — doar colapsează,
 * ca tranziția să fie continuă și valorile introduse să nu se piardă.
 */
function Collapsible({ open, maxHeight, children }) {
  return (
    <div
      aria-hidden={!open}
      className="overflow-hidden"
      style={{
        maxHeight: open ? maxHeight : 0,
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(-8px)',
        pointerEvents: open ? 'auto' : 'none',
        transition: 'max-height .5s cubic-bezier(.22,1,.36,1), opacity .35s ease-out,'
          + ' transform .5s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Panou autentificare: login, signup, reset parolă.
 * `onGuest` vine doar din AuthGate — în ProfilePage, unde același panou e
 * montat pentru cineva deja intrat, butonul de invitat nu are ce căuta.
 */
export default function AuthPanel({
  mode,
  onModeChange,
  busy,
  onBusy,
  onMessage,
  afterAuth,
  onRecoveryComplete,
  onGuest,
}) {
  const {
    email, setEmail,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    username, setUsername,
    passwordConfirm, setPasswordConfirm,
    fieldErrors, setFieldErrors,
    run, submitLogin, submitSignup, signInWithProvider,
  } = useAuthForm({ onBusy, onMessage, afterAuth });

  if (mode === 'forgot') {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => { onModeChange('login'); onMessage(null); }}
          className="md:hidden text-sm font-bold text-ink-500"
        >
          ←
        </button>
        <div>
          <h2 className="text-[26px] md:text-[29px] font-black text-ink-900 tracking-[-.02em] leading-tight">
            Resetează parola
          </h2>
          <p className="hidden md:block text-ink-500 text-[14.5px] mt-1.5 leading-relaxed">
            Primești un link pe email dacă există un cont cu adresa introdusă.
          </p>
        </div>
        <AuthField label="Email" error={fieldErrors.email} hideLabelBelowMd>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@gmail.com"
            autoComplete="email"
            error={fieldErrors.email}
            icon={<MailIcon />}
          />
        </AuthField>
        <PrimaryButton
          disabled={busy}
          busy={busy}
          onClick={() => run(async () => {
            const emailErr = validateEmail(email);
            if (emailErr) {
              setFieldErrors({ email: emailErr });
              throw new Error(emailErr);
            }
            await requestPasswordReset(email);
            onMessage({
              tone: 'success',
              text: (
                <>
                  <span className="md:hidden">Link trimis. Verifică emailul.</span>
                  <span className="hidden md:inline">
                    Dacă există un cont cu acest email, vei primi un link de resetare.
                  </span>
                </>
              ),
            });
          })}
        >
          {busy ? 'Se trimite…' : 'Trimite link'}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => { onModeChange('login'); onMessage(null); }}
          className="hidden md:block text-sm text-ink-500 hover:text-ink-900 font-semibold"
        >
          ← Înapoi
        </button>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-[26px] md:text-[29px] font-black text-ink-900 tracking-[-.02em] leading-tight">
            Alege o parolă nouă
          </h2>
          <p className="hidden md:block text-ink-500 text-[14.5px] mt-1.5 leading-relaxed">
            Linkul de recuperare a fost verificat. Salvează parola nouă pentru contul tău.
          </p>
        </div>

        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          error={fieldErrors.password}
          hideLabelBelowMd
        />
        <PasswordStrength password={password} />
        <PasswordInput
          label="Confirmă parola"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          error={fieldErrors.passwordConfirm}
          hideLabelBelowMd
        />

        <PrimaryButton
          disabled={busy}
          busy={busy}
          onClick={() => run(async () => {
            const passwordError = validatePassword(password);
            const confirmError = validatePasswordConfirm(password, passwordConfirm);
            if (passwordError || confirmError) {
              setFieldErrors({
                password: passwordError,
                passwordConfirm: confirmError,
              });
              throw new Error('Verifică parola nouă.');
            }
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            onMessage({ tone: 'success', text: 'Parola a fost schimbată.' });
            onRecoveryComplete?.();
          })}
        >
          {busy ? 'Se salvează…' : 'Salvează parola nouă'}
        </PrimaryButton>
      </div>
    );
  }

  const heading = HEADINGS[mode] ?? HEADINGS.login;
  const mobileTitle = mode === 'signup' ? 'Cont nou' : heading.title;

  return (
    <div className="space-y-5">
      <AuthTabs mode={mode} onChange={onModeChange} disabled={busy} />

      <div>
        <h2 className="text-[26px] md:text-[29px] font-black text-ink-900 tracking-[-.02em] leading-tight">
          <span className="md:hidden">{mobileTitle}</span>
          <span className="hidden md:inline">{heading.title}</span>
        </h2>
        <p className="hidden md:block text-ink-500 text-[14.5px] mt-1.5 leading-relaxed">{heading.subtitle}</p>
      </div>

      <div className="space-y-4">
        <Collapsible open={mode === 'signup'} maxHeight={96}>
          <div className="grid grid-cols-2 gap-3">
            <AuthField label="Prenume" error={fieldErrors.firstName} hideLabelBelowMd>
              <AuthInput
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Maria"
                autoComplete="given-name"
                error={fieldErrors.firstName}
              />
            </AuthField>
            <AuthField label="Nume" error={fieldErrors.lastName} hideLabelBelowMd>
              <AuthInput
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Popescu"
                autoComplete="family-name"
                error={fieldErrors.lastName}
              />
            </AuthField>
          </div>
        </Collapsible>

        <Collapsible open={mode === 'signup'} maxHeight={116}>
          <AuthField
            label="Username"
            hint="3–20 caractere, litere, cifre, punct sau underscore"
            error={fieldErrors.username}
            hideLabelBelowMd
            hideHintBelowMd
          >
            <AuthInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="maria.pop"
              autoComplete="username"
              error={fieldErrors.username}
              icon={<span aria-hidden className="md:hidden text-ink-400 font-extrabold text-[15px]">@</span>}
              className="md:pl-4"
            />
          </AuthField>
        </Collapsible>

        <AuthField label="Email" error={fieldErrors.email} hideLabelBelowMd>
          <AuthInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nume@gmail.com"
            autoComplete="email"
            error={fieldErrors.email}
            icon={<MailIcon />}
          />
        </AuthField>

        <div className="space-y-1">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            error={fieldErrors.password}
            hideLabelBelowMd
            action={mode === 'login' ? (
              <button
                type="button"
                onClick={() => { onModeChange('forgot'); onMessage(null); }}
                className="text-[12.5px] font-bold text-signa-600 hover:text-signa-500 transition-colors"
              >
                Ai uitat parola?
              </button>
            ) : null}
          />
          {mode === 'login' && (
            <div className="md:hidden flex justify-end">
              <button
                type="button"
                onClick={() => { onModeChange('forgot'); onMessage(null); }}
                className="text-[12.5px] font-bold text-signa-600"
              >
                Ai uitat parola?
              </button>
            </div>
          )}
          {mode === 'signup' && <PasswordStrength password={password} />}
        </div>

        {/* Confirmarea parolei există doar la signup — la login n-are sens. */}
        <Collapsible open={mode === 'signup'} maxHeight={96}>
          <PasswordInput
            label="Confirmă parola"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            error={fieldErrors.passwordConfirm}
            hideLabelBelowMd
          />
        </Collapsible>
      </div>

      {mode === 'login' ? (
        <PrimaryButton disabled={busy} busy={busy} onClick={submitLogin}>
          {busy ? 'Se conectează…' : 'Intră în cont'}
        </PrimaryButton>
      ) : (
        <PrimaryButton disabled={busy} busy={busy} onClick={submitSignup}>
          {busy ? 'Se creează…' : 'Creează cont'}
        </PrimaryButton>
      )}

      {OAUTH_ENABLED && (
        <div className="space-y-4">
          <OrSeparator />
          <SocialButtons onProvider={signInWithProvider} disabled={busy} />
        </div>
      )}

      {/* Separatorul e al blocului social când OAuth e pornit — două „SAU"
          unul sub altul ar rupe ecranul. */}
      {onGuest && (
        <div className="space-y-3">
          {!OAUTH_ENABLED && <OrSeparator />}
          <SecondaryButton disabled={busy} onClick={onGuest}>
            Continuă ca invitat
          </SecondaryButton>
          <p className="hidden md:block text-center text-[12.5px] text-ink-400 leading-relaxed">
            Înveți fără cont. Progresul rămâne pe acest dispozitiv.
          </p>
        </div>
      )}

      {mode === 'login' && (
        <p className="hidden md:block text-center text-[13.5px] text-ink-500">
          Nu ai cont?{' '}
          <button
            type="button"
            onClick={() => { onModeChange('signup'); onMessage(null); }}
            className="font-bold text-signa-600 hover:text-signa-500 transition-colors"
          >
            Creează unul gratuit
          </button>
        </p>
      )}
    </div>
  );
}
