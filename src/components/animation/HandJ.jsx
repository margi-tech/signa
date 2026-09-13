import React from "react";
import jFrame1 from "./j-frame1.png";
import jFrame2 from "./j-frame2.png";
import jFrame3 from "./j-frame3.png";

/**
 * Animație pentru litera 'J' din LSR.
 * 1) Poza 1 stă nemișcată (pauză), apoi se rotește 0° → 90°
 * 2) Poza 2 apare scurt (fără rotație)
 * 3) Poza 3 apare și se rotește 0° → 90°
 * 4) Toate dispar ~1s (pauză goală) înainte ca bucla să se reia
 */
export default function HandJ() {
    return (
        <div style={styles.wrapper}>
            <svg
                viewBox="0 0 300 260"
                style={styles.svg}
                role="img"
                aria-label="Animație literă J"
            >
                <g className="j-frame-1" style={{ transformOrigin: "150px 130px" }}>
                    <image href={jFrame1} x="73" y="40" width="153" height="180" />
                </g>
                <g className="j-frame-2" style={{ transformOrigin: "150px 130px" }}>
                    <image href={jFrame2} x="73" y="40" width="153" height="180" />
                </g>
                <g className="j-frame-3" style={{ transformOrigin: "150px 130px" }}>
                    <image href={jFrame3} x="73" y="40" width="153" height="180" />
                </g>
            </svg>

            <style>{`
        /* Total ciclu: 4.5s
           0%     -> 17.78%  poza 1 nemișcată (pauză, 0.8s)
           17.78% -> 35.56%  poza 1 se rotește 0deg -> 90deg (0.8s)
           35.56% -> 40%     poza 1 dispare / poza 2 apare (crossfade, 0.2s)
           40%    -> 48.89%  poza 2 vizibilă, statică (0.4s)
           48.89% -> 53.33%  poza 2 dispare / poza 3 apare (crossfade, 0.2s)
           53.33% -> 71.11%  poza 3 se rotește 0deg -> 90deg (0.8s)
           71.11% -> 75.56%  poza 3 dispare (0.2s)
           75.56% -> 100%    gol / pauză (~1.1s), apoi reia bucla
        */

        @keyframes jFrame1Anim {
          0%      { opacity: 1; transform: rotate(0deg); }
          17.78%  { opacity: 1; transform: rotate(0deg); }
          35.56%  { opacity: 1; transform: rotate(90deg); }
          40%     { opacity: 0; transform: rotate(90deg); }
          100%    { opacity: 0; transform: rotate(90deg); }
        }

        @keyframes jFrame2Anim {
          0%      { opacity: 0; }
          35.56%  { opacity: 0; }
          40%     { opacity: 1; }
          48.89%  { opacity: 1; }
          53.33%  { opacity: 0; }
          100%    { opacity: 0; }
        }

        @keyframes jFrame3Anim {
          0%      { opacity: 0; transform: rotate(0deg); }
          48.89%  { opacity: 0; transform: rotate(0deg); }
          53.33%  { opacity: 1; transform: rotate(0deg); }
          71.11%  { opacity: 1; transform: rotate(90deg); }
          75.56%  { opacity: 0; transform: rotate(90deg); }
          100%    { opacity: 0; transform: rotate(90deg); }
        }

        .j-frame-1 {
          animation: jFrame1Anim 4.5s ease-in-out infinite;
        }
        .j-frame-2 {
          animation: jFrame2Anim 4.5s ease-in-out infinite;
        }
        .j-frame-3 {
          animation: jFrame3Anim 4.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .j-frame-1, .j-frame-2, .j-frame-3 { animation: none; }
          .j-frame-1 { opacity: 1; }
          .j-frame-2, .j-frame-3 { opacity: 0; }
        }
      `}</style>
        </div>
    );
}

const styles = {
    wrapper: { width: "100%", maxWidth: 420 },
    svg: { width: "100%", height: "auto", display: "block" },
};