import { FlameIcon, SoundIcon, UserIcon } from './icons.jsx';

const EASE = 'cubic-bezier(.22,1,.36,1)';

/**
 * Header comun pentru cele 5 ecrane din shell (sub `lg`) — logo, streak,
 * sunet, avatar. Mutat din `HomePage`, ca să nu se remonteze la navigare.
 */
export default function MobileHeader({
  streak, soundEnabled, onToggleSound, initials, avatarUrl, onProfile,
}) {
  return (
    <header
      className="lg:hidden flex-none sticky top-0 z-20 flex items-center justify-between
        px-5 py-2 bg-cream/[.82] backdrop-blur-[14px]"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative w-[30px] h-[30px] flex-none">
          <span
            aria-hidden
            className="absolute inset-0 rounded-[9px] border-2 border-signa-500/55"
            style={{ animation: `sg-pulse-ring 3.6s ${EASE} infinite` }}
          />
          <img src="/icon.svg" alt="" className="relative w-[30px] h-[30px] rounded-[9px] block" />
        </span>
        <span className="font-black text-[15px] tracking-[.16em] text-ink-900">SIGNA</span>
      </div>
      <div className="flex items-center gap-2">
        {streak > 0 && (
          <span
            className="flex items-center gap-[5px] bg-amber-50 border border-amber-600/[.16] text-amber-700
              rounded-full px-[11px] py-1.5 text-[12px] font-extrabold tabular-nums"
            title="Zile consecutive"
          >
            <FlameIcon className="w-[13px] h-[13px]" />
            {streak}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleSound}
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center text-ink-400
            hover:text-ink-700 transition-colors duration-[160ms]"
          aria-label={soundEnabled ? 'Oprește sunetul' : 'Pornește sunetul'}
          title={soundEnabled ? 'Sunet pornit' : 'Sunet oprit'}
        >
          <SoundIcon on={soundEnabled} className="w-[18px] h-[18px]" />
        </button>
        <button
          type="button"
          onClick={onProfile}
          className="w-[34px] h-[34px] rounded-xl bg-signa-100 text-signa-900 font-black text-[12.5px]
            flex items-center justify-center overflow-hidden transition-transform duration-[160ms] active:scale-95"
          aria-label="Deschide profilul"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            : (initials || <UserIcon className="w-4 h-4" />)}
        </button>
      </div>
    </header>
  );
}
