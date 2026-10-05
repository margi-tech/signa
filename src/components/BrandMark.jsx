/**
 * Sigla Signa — cele două mâini care formează „S” (`public/logo.png`).
 *
 * Tema deschisă: plăcuță albă → mentă cu contur fin, ca mâinile (desenate
 * pastel) să nu se piardă pe crem. Tema întunecată: fără contur și fără
 * linia albă de sus — plăcuța devine verdele discului din clip, iar mâinile
 * primesc strălucirea verde de acolo. Dimensiunile și colțurile vin din
 * `className`, deci inelul `sg-pulse-ring` din jur rămâne aliniat.
 */
export default function BrandMark({ className = '', style }) {
  return (
    <span
      style={style}
      className={`flex items-center justify-center overflow-hidden
        bg-[linear-gradient(150deg,#ffffff_20%,#ecfdf5)] border border-signa-500/[.18]
        shadow-[inset_0_1px_0_rgba(255,255,255,.8)]
        dark:bg-[radial-gradient(circle_at_34%_28%,#2b8169,#0f5040_70%)] dark:border-transparent dark:shadow-none
        ${className}`}
    >
      <img
        src="/logo.png"
        alt=""
        draggable={false}
        className="h-[90%] w-auto object-contain select-none
          [filter:drop-shadow(0_0_.6px_rgba(5,150,105,.9))_drop-shadow(0_1.5px_2px_rgba(5,150,105,.35))]
          dark:[filter:drop-shadow(0_0_1px_#34d399)_drop-shadow(0_0_4px_rgba(52,211,153,.6))]"
      />
    </span>
  );
}
