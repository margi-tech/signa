import React from "react";

/**
 * Componentă reutilizabilă pentru litere LSR cu mișcare stânga-dreapta (shake).
 * Primește imaginea și eticheta ca props, animația e comună.
 *
 * Exemplu de utilizare:
 * <ShakeHand image={fistUp} label="Î" />
 */
export default function ShakeHand({ image, label, width = 153, height = 180, x = 73, y = 40 }) {
    return (
        <div style={styles.wrapper}>
            <svg
                viewBox="0 0 300 260"
                style={styles.svg}
                role="img"
                aria-label={`Animație literă ${label}`}
            >
                <g className="shake-hand">
                    <image href={image} x={x} y={y} width={width} height={height} />
                </g>
            </svg>

            <style>{`
        @keyframes shake {
          0%   { transform: translateX(0px); }
          15%  { transform: translateX(-14px); }
          30%  { transform: translateX(12px); }
          45%  { transform: translateX(-10px); }
          60%  { transform: translateX(10px); }
          75%  { transform: translateX(-6px); }
          90%  { transform: translateX(4px); }
          100% { transform: translateX(0px); }
        }
        .shake-hand {
          animation: shake 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .shake-hand { animation: none; }
        }
      `}</style>
        </div>
    );
}

const styles = {
    wrapper: { width: "100%", maxWidth: 420 },
    svg: { width: "100%", height: "auto", display: "block" },
};