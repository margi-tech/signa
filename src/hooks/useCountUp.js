import { useEffect, useState } from 'react';

/** Animă o cifră de la 0 la `target` cu ease-out cubic — folosit în statisticile de profil. */
export function useCountUp(target, { duration = 1000, delay = 300 } = {}) {
  // Pornește de la valoarea finală, nu de la 0: dacă animația nu apucă să
  // ruleze (reduced-motion, tab în fundal), cifra rămâne corectă, nu pe 0.
  const [v, setV] = useState(target);
  useEffect(() => {
    let raf;
    const t0 = performance.now() + delay;
    const tick = (now) => {
      const p = Math.min(Math.max((now - t0) / duration, 0), 1);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return v;
}
