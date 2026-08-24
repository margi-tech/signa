/* Iconițe inline partajate între shell și pagini — fără librării. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

/* Navigație */
export const HomeIcon = (p) => <svg {...stroke} {...p}><path d="M3 10.5 12 3.5l9 7" /><path d="M5.5 9.5V20h13V9.5" /></svg>;
export const BookIcon = (p) => <svg {...stroke} {...p}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M9 4v16" /></svg>;
export const CamIcon = (p) => <svg {...stroke} {...p}><rect x="2.5" y="6.5" width="13" height="11" rx="2.5" /><path d="m15.5 11.5 6-3v7l-6-3z" /></svg>;
export const UserIcon = (p) => <svg {...stroke} {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" /></svg>;
export const ChartIcon = (p) => <svg {...stroke} {...p}><path d="M5 20V12" /><path d="M12 20V5" /><path d="M19 20v-5" /></svg>;

/* Unelte de dev */
export const DownloadIcon = (p) => <svg {...stroke} {...p}><path d="M12 3.5v11" /><path d="m8 10.5 4 4 4-4" /><path d="M4.5 18.5h15" /></svg>;
export const TrendIcon = (p) => <svg {...stroke} {...p}><path d="M4 16.5 9 9l4 4.5L20 5.5" /><circle cx="9" cy="9" r="1.6" /></svg>;
export const PulseIcon = (p) => <svg {...stroke} {...p}><path d="M3.5 12h4l2-4 2.5 8 2.5-6 1.5 2h4.5" /></svg>;
export const HandIcon = (p) => (
  <svg {...stroke} {...p}>
    <path d="M8 11V7.2a1.6 1.6 0 1 1 3.2 0V11" />
    <path d="M11.2 11V5.8a1.6 1.6 0 1 1 3.2 0V11" />
    <path d="M14.4 11V7.5a1.6 1.6 0 1 1 3.2 0V13a6 6 0 0 1-12 0v-1.2A1.6 1.6 0 0 1 8 10.2" />
  </svg>
);

/* Conținut */
export const BarsIcon = (p) => <svg {...stroke} strokeWidth="2.2" {...p}><path d="M5 19v-7" /><path d="M12 19V6" /><path d="M19 19v-4" /></svg>;
export const LinesIcon = (p) => <svg {...stroke} strokeWidth="2.2" {...p}><path d="M4 7h16" /><path d="M4 12h11" /><path d="M4 17h7" /></svg>;
export const RepeatIcon = (p) => <svg {...stroke} strokeWidth="2.2" {...p}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v4h-4" /></svg>;
export const ArrowIcon = (p) => <svg {...stroke} strokeWidth="2.6" {...p}><path d="M5 12h13" /><path d="m12.5 6 6 6-6 6" /></svg>;
export const ChevronIcon = (p) => <svg {...stroke} strokeWidth="2.6" {...p}><path d="M9 6l6 6-6 6" /></svg>;

export const FlameIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2s5 4.6 5 9.3A5 5 0 0 1 7 11.5C7 8 9 6 9 6s-.5 2.5 1 3.5c0-3 2-6.5 2-7.5Z" />
  </svg>
);

export const SoundIcon = ({ on, ...p }) => (
  <svg {...stroke} {...p}>
    <path d="M11 5.5 6.5 9.5H3.5v5h3L11 18.5z" />
    {on
      ? <><path d="M15.5 9.2a4 4 0 0 1 0 5.6" /><path d="M18.4 6.6a8 8 0 0 1 0 10.8" /></>
      : <><path d="m15.5 10 5 4" /><path d="m20.5 10-5 4" /></>}
  </svg>
);

export function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function BookmarkIcon({ filled, size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 3.5h12a1 1 0 011 1V21l-7-4-7 4V4.5a1 1 0 011-1z" />
    </svg>
  );
}

export const UsersIcon = (p) => (
  <svg {...stroke} {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.5 20c1.2-3.2 3.6-4.7 6.5-4.7s5.3 1.5 6.5 4.7" />
    <path d="M16 5.4a3.2 3.2 0 0 1 0 5.6" />
    <path d="M18.5 14.6c1.6.7 2.7 1.9 3.4 3.6" />
  </svg>
);
