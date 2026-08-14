/* Ecran obligatoriu de autentificare — apare după onboarding, înainte de pagina principală. */

export default function AuthGate({ onLogin, onSignup }) {
  return (
    <div className="h-full bg-cream flex flex-col overflow-hidden animate-fade-in">
      <div className="h-[3px] bg-gradient-to-r from-signa-400 via-signa-500/40 to-transparent flex-shrink-0" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl mb-6 animate-float" aria-hidden>🤝</div>
        <h1 className="text-ink-900 text-2xl font-black mb-3 tracking-tight">Contul tău Signa</h1>
        <p className="text-ink-600 text-sm leading-relaxed max-w-xs">
          Intră în cont sau creează unul nou ca să-ți salvezi progresul, XP-ul și seria de zile.
        </p>
      </div>

      <div className="flex-shrink-0 px-6 pb-10 flex flex-col gap-2.5">
        <button
          onClick={onLogin}
          className="w-full py-[17px] bg-signa-500 text-white font-bold text-[15px] rounded-2xl
            shadow-button active:scale-[0.97] transition-transform"
        >
          Conectare
        </button>
        <button
          onClick={onSignup}
          className="w-full py-[15px] bg-white text-ink-700 font-semibold text-sm rounded-2xl
            border border-ink-900/[0.06] shadow-card active:scale-[0.97] transition-all"
        >
          Creează cont
        </button>
      </div>
    </div>
  );
}
