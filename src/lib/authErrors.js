/** Mesaje lizibile în română pentru erori Auth / PostgREST. */
export function authErrorMessage(err) {
  if (!err) return 'A apărut o eroare.';
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || err.status || '');

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request')) {
    return 'Nu am putut contacta serverul. Ești offline?';
  }
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || code === 'invalid_credentials') {
    return 'Email sau parolă greșită.';
  }
  if (msg.includes('already registered') || msg.includes('already been registered') || code === 'user_already_exists') {
    return 'Există deja un cont cu acest email.';
  }
  if (msg.includes('unable to validate email') || msg.includes('invalid email') || code === 'email_address_invalid') {
    return 'Folosește un email valid, de forma nume@domeniu.com';
  }
  if (msg.includes('email not confirmed') || code === 'email_not_confirmed') {
    return 'Verifică emailul pentru a confirma contul.';
  }
  if (msg.includes('rate limit') || code === 'over_email_send_rate_limit') {
    return 'Prea multe încercări. Adresa e validă — Supabase a blocat emailurile de confirmare pentru o oră. Oprește Confirm email în dashboard sau așteaptă, apoi reîncearcă.';
  }
  if ((msg.includes('password') && (msg.includes('least') || msg.includes('short'))) || code === 'weak_password') {
    return 'Parola trebuie să aibă minim 8 caractere.';
  }
  if (
    code === '23505'
    || msg.includes('duplicate key')
    || msg.includes('unique constraint')
  ) {
    return 'Username-ul e deja luat.';
  }
  return err.message || 'A apărut o eroare.';
}
