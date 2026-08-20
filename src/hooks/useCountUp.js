import { useEffect, useState } from 'react';

/** Animă o cifră de la 0 la `target` cu ease-out cubic — folosit în statisticile de profil. */
export function useCountUp(target, { duration = 1000, delay = 300 } = {}) {
  const [v, setV] = useState(0);
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
