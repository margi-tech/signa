import { BookIcon, CamIcon, ChartIcon, HomeIcon, UserIcon } from './icons.jsx';

const EASE = 'cubic-bezier(.22,1,.36,1)';

const TABS = [
  { icon: HomeIcon, label: 'Acasă', page: 'home' },
  { icon: BookIcon, label: 'Lecții', page: 'lessons' },
  { icon: CamIcon, label: 'Cameră', page: 'camera' },
  { icon: ChartIcon, label: 'Clasament', page: 'leaderboard' },
  { icon: UserIcon, label: 'Profil', page: 'profile' },
];

const PAGE_INDEX = {
  home: 0, lessons: 1, camera: 2, leaderboard: 3, profile: 4,
};

/**
 * Bara de jos cu 5 taburi — înlocuiește sidebar-ul sub `lg`. Trăiește în
 * `AppShell`, o singură dată pentru toate cele 5 ecrane.
 */
export default function MobileTabBar({
  page, onNavigate, totalLessonsCount, rank, isGuest = false,
}) {
  const activeIndex = PAGE_INDEX[page] ?? 0;

  return (
    <nav
      className="lg:hidden flex-none relative z-30 bg-cream/90 backdrop-blur-[14px]
        border-t border-ink-900/[.07] pt-2 px-2.5 pb-[max(26px,env(safe-area-inset-bottom))]"
    >
      <div className="relative grid grid-cols-5">
        {/* Pilula stă în grilă, nu în `nav`: `w-1/5` trebuie să fie o coloană,
            altfel padding-ul barei o face mai lată și se decalează tab cu tab. */}
        <span
          aria-hidden
          className="absolute left-0 top-0 w-1/5 h-[50px] pointer-events-none"
          style={{ transform: `translateX(${activeIndex * 100}%)`, transition: `transform .42s ${EASE}` }}
        >
          <span
            className="absolute inset-x-2 inset-y-0 rounded-[14px]
              bg-[linear-gradient(180deg,#E4F5EC,#EFFAF4)] shadow-[inset_0_0_0_1px_rgba(16,185,129,.12)]"
          />
        </span>

        {TABS.map(({ icon: Icon, label, page: target }) => {
          const active = page === target;
          return (
            <button
              key={target}
              type="button"
              onClick={() => onNavigate(target)}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[50px] text-[10px] font-extrabold
                transition-colors duration-[160ms] ${active ? 'text-signa-600' : 'text-ink-400'}`}
            >
              <Icon width="20" height="20" strokeWidth="2.1" />
              {label}
              {target === 'lessons' && (
                <span
                  className="absolute top-0.5 left-1/2 ml-[7px] text-[9px] font-black text-ink-500
                    bg-white border border-ink-900/[.08] rounded-full px-[5px] tabular-nums"
                >
                  {totalLessonsCount}
                </span>
              )}
              {target === 'camera' && (
                <span aria-hidden className="absolute top-[7px] left-1/2 ml-[11px] w-[7px] h-[7px]">
                  <span className="absolute inset-0 rounded-full bg-signa-500" />
                  <span className="absolute -inset-1 rounded-full border-[1.5px] border-signa-500/55 sg-dot-ring" />
                </span>
              )}
              {target === 'leaderboard' && rank && !isGuest && (
                <span
                  className="absolute top-0.5 left-1/2 ml-[7px] text-[9px] font-black text-amber-700
                    bg-[#FFF7E8] rounded-full px-[5px] tabular-nums"
                >
                  #{rank.place}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
