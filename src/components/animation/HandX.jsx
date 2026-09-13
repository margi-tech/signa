import React from "react";
import xFrameStatic from "./x-static.png";
import xFrameMoving from "./x-moving.png";

/**
 * Animație pentru litera 'X' din LSR.
 * O mână (arătător) stă fixă, poziționată mai spre stânga; a doua apare
 * (fade in) mai la dreapta și mai jos, se suprapune parțial peste prima
 * formând un X, apoi dispare (fade out) înainte de reluare.
 */
export default function HandX() {
    return (
        <div style={styles.wrapper}>
            <svg
                viewBox="0 0 300 260"
                style={styles.svg}
                role="img"
                aria-label="Animație literă X"
            >
                {/* Mâna fixă — mutată mai la stânga, ușor mai mare */}
                <g>
                    <image href={xFrameStatic} x="30" y="27" width="175" height="205" />
                </g>

                {/* Mâna care apare/dispare — puțin mai mare, mutată mai la stânga */}
                <g className="x-moving">
                    <image href={xFrameMoving} x="75" y="22" width="215" height="250" />
                </g>
            </svg>

            <style>{`
        /* Total ciclu: 3.5s
           0%     -> 20%    invizibilă
           20%    -> 30%    fade in (apare)
           30%    -> 70%    vizibilă (pauză, X format)
           70%    -> 80%    fade out (dispare)
           80%    -> 100%   invizibilă, pregătită de reluare
        */
        @keyframes xMovingAnim {
          0%    { opacity: 0; }
          20%   { opacity: 0; }
          30%   { opacity: 1; }
          70%   { opacity: 1; }
          80%   { opacity: 0; }
          100%  { opacity: 0; }
        }

        .x-moving {
          animation: xMovingAnim 3.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .x-moving { animation: none; opacity: 1; }
        }
      `}</style>
        </div>
    );
}

const styles = {
    wrapper: { width: "100%", maxWidth: 420 },
    svg: { width: "100%", height: "auto", display: "block" },
};