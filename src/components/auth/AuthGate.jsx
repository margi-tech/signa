import { useState } from 'react';
import AuthPanel from './AuthPanel';
import { MessageBanner, SectionCard } from './AuthUi';

/**
 * Ecran full-screen de autentificare — blocat până la login/signup.
 */
export default function AuthGate() {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10 overflow-y-auto scrollbar-hide">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-ink-900 font-black text-2xl tracking-tight">SIGNA</h1>
            <p className="text-ink-500 text-sm mt-1">Limba Semnelor Române</p>
          </div>

          {banner && (
            <MessageBanner tone={banner.tone}>{banner.text}</MessageBanner>
          )}

          <SectionCard>
            <AuthPanel
              mode={mode}
              onModeChange={setMode}
              busy={busy}
              onBusy={setBusy}
              onMessage={setBanner}
              afterAuth={async () => {}}
            />
          </SectionCard>

          <p className="text-center text-ink-400 text-xs leading-relaxed px-4">
            Camera și semnele rămân pe dispozitiv. În cloud salvăm doar profilul și progresul.
          </p>
        </div>
      </div>
    </div>
  );
}
