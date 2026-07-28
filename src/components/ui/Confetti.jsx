import { useEffect, useState } from 'react';

const COLORS = ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#60a5fa', '#f472b6'];

/**
 * Confetti ușor CSS — fără librării.
 * Se demontează singur după `duration` ms.
 */
export default function Confetti({ active = true, duration = 2200, count = 36 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) return;
    const next = Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.4 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
      drift: (Math.random() - 0.5) * 80,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(t);
  }, [active, count, duration]);

  if (!pieces.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-sm animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.rotate + 720}deg`,
          }}
        />
      ))}
    </div>
  );
}
