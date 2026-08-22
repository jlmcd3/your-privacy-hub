// ArticleFallbackImage — VARIANT B ("meridian mark tile").
// Renders the EUP globe mark (frame + latitudes + meridian + node) as the
// article tile, on a deterministic ground, with the accent varied by category
// and the mark's rotation/node position varied by seed so tiles in a feed are
// recognisably related but not identical.
// Preview-only for now — wired at /fallback-preview for side-by-side review.

import { useMemo } from "react";
import type { FallbackCategory } from "./ArticleFallbackImage";

interface Props {
  seed: string;
  category?: FallbackCategory;
  className?: string;
  alt?: string;
}

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

// [ground start, ground end, mark ink, accent]
const SCHEME: Record<FallbackCategory, [string, string, string, string]> = {
  legislation: ["#1a4a6e", "#0b2136", "#ffffff", "#5ce0c8"],
  enforcement: ["#5a3410", "#1b0f04", "#ffffff", "#ffc247"],
  guidance: ["#17587a", "#08202f", "#ffffff", "#7fe0ff"],
  analysis: ["#12666e", "#04222a", "#ffffff", "#8affe4"],
  default: ["#2d7a8a", "#0b2a33", "#ffffff", "#8affe4"],
};

const C = 240;

export default function ArticleFallbackImageLogo({
  seed,
  category = "default",
  className,
  alt,
}: Props) {
  const h = useMemo(() => hash(seed), [seed]);
  const uid = `fbl-${h.toString(36)}`;
  const [g0, g1, ink, accent] = SCHEME[category] ?? SCHEME.default;

  // Seeded variation: meridian width, node angle, tilt.
  const rx = 55 + (h % 5) * 13;            // 55..107
  const nodeAngle = ((h >>> 3) % 360) * (Math.PI / 180);
  const tilt = -18 + ((h >>> 7) % 37);     // -18..18 deg
  const R = 150;
  const nodeR = 118;
  const nx = C + nodeR * Math.cos(nodeAngle);
  const ny = C + nodeR * Math.sin(nodeAngle) * 0.55;

  return (
    <svg
      viewBox="0 0 480 480"
      role="img"
      aria-label={alt ?? "End User Privacy article"}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={g0} />
          <stop offset="100%" stopColor={g1} />
        </linearGradient>
      </defs>

      <rect width="480" height="480" fill={`url(#${uid}-bg)`} />

      <g transform={`rotate(${tilt} ${C} ${C})`}>
        {/* frame */}
        <circle cx={C} cy={C} r={R} fill="none" stroke={ink} strokeWidth="9" />
        {/* equator */}
        <line x1={C - R - 12} y1={C} x2={C + R + 12} y2={C} stroke={ink} strokeWidth="7" strokeLinecap="round" />
        {/* latitudes */}
        <path
          d={`M ${C - R + 12} ${C - 62} Q ${C} ${C - 88} ${C + R - 12} ${C - 62}`}
          fill="none"
          stroke={ink}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.65"
        />
        <path
          d={`M ${C - R + 12} ${C + 62} Q ${C} ${C + 88} ${C + R - 12} ${C + 62}`}
          fill="none"
          stroke={ink}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.65"
        />
        {/* meridian — accent */}
        <ellipse cx={C} cy={C} rx={rx} ry={R} fill="none" stroke={accent} strokeWidth="10" />
        {/* node — accent */}
        <circle cx={nx} cy={ny} r="17" fill={accent} />
      </g>
    </svg>
  );
}
