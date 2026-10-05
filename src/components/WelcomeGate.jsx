import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { markWelcomeShown, shouldShowWelcome } from '../lib/welcome';
import { WelcomeIntro } from './SplashScreen';

/**
 * Pornește animația de bun venit când apare sesiunea unui cont nou.
 * Montat lângă `<App />` (main.jsx), deci nu depinde de ce ecran e randat.
 */
export default function WelcomeGate() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user && shouldShowWelcome(user)) {
        markWelcomeShown(user.id);
        setUserId(user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const done = useCallback(() => setUserId(null), []);

  return userId ? <WelcomeIntro onDone={done} /> : null;
}
