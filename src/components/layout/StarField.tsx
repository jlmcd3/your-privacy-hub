import { useMemo } from "react";

interface StarFieldProps {
  count?: number;
  className?: string;
}

/**
 * Decorative twinkling star overlay. Place inside a `relative` parent.
 * Uses deterministic pseudo-random positions so layout stays stable.
 */
export default function StarField({ count = 40, className = "" }: StarFieldProps) {
  const stars = useMemo(() => {
    // Deterministic LCG so SSR/CSR match and re-renders don't reshuffle.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      size: 1 + rand() * 2,
      duration: `${(3 + rand() * 4).toFixed(2)}s`,
      delay: `${(rand() * 5).toFixed(2)}s`,
    }));
  }, [count]);

  return (
    <div className={`star-field ${className}`} aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            ["--star-duration" as any]: s.duration,
            ["--star-delay" as any]: s.delay,
          }}
        />
      ))}
    </div>
  );
}
