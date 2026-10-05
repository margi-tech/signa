/**
 * Sigla Signa — cele două mâini care formează „S” (`public/logo.png`).
 *
 * Plăcuța are un gradient alb → mentă și o umbră fină pe contur, ca mâinile
 * (desenate pastel) să nu se piardă pe fundal deschis. În tema întunecată
 * plăcuța devine suprafață închisă automat (postcss/signa-theme.js).
 * Dimensiunile și colțurile vin din `className`, la fel ca vechiul `icon.svg`,
 * deci inelul `sg-pulse-ring` din jur rămâne aliniat.
 */
export default function BrandMark({ className = '', style }) {
  return (
    <span
      style={style}
      className={`flex items-center justify-center overflow-hidden
        bg-[linear-gradient(150deg,#ffffff_20%,#ecfdf5)] border border-signa-500/[.18]
        shadow-[inset_0_1px_0_rgba(255,255,255,.8)] ${className}`}
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        className="h-[90%] w-auto object-contain select-none"
        style={{ filter: 'drop-shadow(0 0 .6px rgba(5,150,105,.9)) drop-shadow(0 1.5px 2px rgba(5,150,105,.35))' }}
      />
    </span>
  );
}
