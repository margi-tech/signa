import { useState } from 'react';
import { isUsernameTaken, supabase } from '../../lib/supabase';
import { authErrorMessage } from '../../lib/authErrors';
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirm,
  validateUsername,
} from '../../utils/username';

/**
 * Câmpurile, validările și submit-ul pentru login / signup.
 * Trăiesc aici ca AuthPanel și cardul de conversie al invitatului să meargă pe
 * exact același flux Supabase, cu două layout-uri diferite deasupra.
 *
 * `requireConfirm` false = formularul n-are câmp de confirmare a parolei
 * (cazul cardului de invitat), deci validarea lui se sare.
 */
export function useAuthForm({ onBusy, onMessage, afterAuth, requireConfirm = true }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
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
    if (requireConfirm) {
      const confirmErr = validatePasswordConfirm(password, passwordConfirm);
      if (confirmErr) errs.passwordConfirm = confirmErr;
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitLogin = () => run(async () => {
    if (!validateLogin()) throw new Error('Verifică câmpurile marcate.');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    await afterAuth();
    onMessage({ tone: 'success', text: 'Bine ai revenit.' });
  });

  const submitSignup = () => run(async () => {
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
  });

  const signInWithProvider = (provider) => run(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  });

  return {
    email, setEmail,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    username, setUsername,
    passwordConfirm, setPasswordConfirm,
    fieldErrors, setFieldErrors,
    run,
    submitLogin,
    submitSignup,
    signInWithProvider,
  };
}
