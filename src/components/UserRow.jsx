import FollowButton from './FollowButton';

const initialsOf = (name) => (name || '?')
  .trim().split(/\s+/).map((w) => w[0]).filter(Boolean)
  .join('').toUpperCase()
  .slice(0, 2) || '?';

/** Rândul comun din căutare, cereri și lista de prieteni. */
export default function UserRow({
  user, subtitle, followLabel, onSelect, onStatusChange, onError, delay = 0,
}) {
  const xp = user.xp ?? 0;
  const streak = user.streak ?? 0;

  return (
    <div
      style={{ animation: `sg-row-in .5s cubic-bezier(.22,1,.36,1) ${delay}s backwards` }}
      className="group flex items-center gap-3.5 px-5 py-3.5 lg:px-6
        border-t border-ink-900/[.05] first:border-t-0
        transition-[background-color,transform] duration-[220ms] ease-out
        hover:bg-[#FBF7F0] hover:translate-x-[3px]"
    >
      <button
        type="button"
        onClick={() => onSelect?.(user.id)}
        className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
      >
        <span className="w-11 h-11 flex-none rounded-[13px] bg-signa-50 text-signa-600
          flex items-center justify-center font-black text-[13px] overflow-hidden
          transition-transform duration-[220ms] ease-out
          group-hover:scale-[1.08] group-hover:-rotate-[5deg]">
          {user.avatar_url
            ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            : initialsOf(user.display_name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-ink-900 truncate">
            {user.display_name || 'Jucător'}
          </span>
          {subtitle && (
            <span className="block text-[12px] font-semibold text-ink-400 truncate">
              {subtitle}
            </span>
          )}
        </span>

        <span className="hidden sm:flex items-center gap-2 flex-none">
          <span
            className={`text-[11px] font-extrabold rounded-full px-2.5 py-1 tabular-nums
              ${streak >= 7 ? 'bg-[#FFF7E8] text-amber-700' : 'bg-ink-900/[.05] text-ink-500'}`}
          >
            {streak >= 7 ? '🔥 ' : ''}{streak}
          </span>
          <span className="text-[13px] font-black text-signa-900 tabular-nums w-[68px] text-right">
            {xp.toLocaleString('ro-RO')} XP
          </span>
        </span>
      </button>

      <FollowButton
        userId={user.id}
        idleLabel={followLabel}
        onStatusChange={onStatusChange}
        onError={onError}
      />
    </div>
  );
}
