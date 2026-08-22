// ArticleFallbackImage — VARIANT A ("vivid signal glyph").
// Same deterministic geometry engine as v3, retuned for punch:
// - brighter accent ramp (accent + accent-glow two-stop gradient on the marks)
// - deeper, more saturated ground with an off-center light source
// - higher stroke opacity/weight, fewer faint elements
// Preview-only for now — wired at /fallback-preview for side-by-side review.

import { useMemo } from "react";
import { buildGlyphSpec, type FallbackCategory } from "./ArticleFallbackImage";

interface Props {
  seed: string;
  category?: FallbackCategory;
  className?: string;
  alt?: string;
}

const C = 240;

// Two-stop accent ramps: [core, glow]
const ACCENT_RAMP: Record<FallbackCategory, [string, string]> = {
  legislation: ["#2ad4b8", "#7cf0dc"],
  enforcement: ["#ffb020", "#ffd977"],
  guidance: ["#5fd2ff", "#b8ecff"],
  analysis: ["#69f0d6", "#c6fff3"],
  default: ["#2ad4b8", "#7cf0dc"],
};

// Deeper grounds — more separation from the bright marks.
const GROUND: Record<FallbackCategory, [string, string]> = {
  legislation: ["#12506b", "#061826"],
  enforcement: ["#3a2a10", "#0d0a05"],
  guidance: ["#14405f", "#061826"],
  analysis: ["#0f4f57", "#04161c"],
  default: ["#123f5e", "#061826"],
};

function arcPath(r: number, startDeg: number, sweepDeg: number): string {
  const s = (startDeg * Math.PI) / 180;
  const e = ((startDeg + sweepDeg) * Math.PI) / 180;
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${(C + r * Math.cos(s)).toFixed(1)} ${(C + r * Math.sin(s)).toFixed(1)} A ${r} ${r} 0 ${large} 1 ${(C + r * Math.cos(e)).toFixed(1)} ${(C + r * Math.sin(e)).toFixed(1)}`;
}

export default function ArticleFallbackImageVivid({
  seed,
  category = "default",
  className,
  alt,
}: Props) {
  const spec = useMemo(() => buildGlyphSpec(seed), [seed]);
  const uid = useMemo(
    () => `fbv-${Math.abs([...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36)}`,
    [seed],
  );
  const [accent, glow] = ACCENT_RAMP[category] ?? ACCENT_RAMP.default;
  const [g0, g1] = GROUND[category] ?? GROUND.default;

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
        <radialGradient id={`${uid}-bg`} cx="34%" cy="30%" r="92%">
          <stop offset="0%" stopColor={g0} />
          <stop offset="100%" stopColor={g1} />
        </radialGradient>
        <linearGradient id={`${uid}-ac`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={glow} />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>
      </defs>

      <rect width="480" height="480" fill={`url(#${uid}-bg)`} />

      {/* structural rings — brighter and heavier than v3 */}
      {spec.rings.map((rg, i) => (
        <circle
          key={`r${i}`}
          cx={C}
          cy={C}
          r={rg.r}
          fill="none"
          stroke="#ffffff"
          strokeWidth={rg.w + 1}
          strokeDasharray={rg.dash}
          opacity={Math.min(0.55, rg.o + 0.2)}
        />
      ))}

      {spec.family === "orbits" &&
        spec.orbitDots.map((d, i) => (
          <circle
            key={`d${i}`}
            cx={d.x}
            cy={d.y}
            r={d.r + 2}
            fill={`url(#${uid}-ac)`}
            opacity={Math.min(1, d.o + 0.25)}
          />
        ))}

      {spec.family === "burst" &&
        spec.burstTicks.map((t, i) => (
          <line
            key={`t${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={`url(#${uid}-ac)`}
            strokeWidth={t.w + 2}
            strokeLinecap="round"
            opacity={Math.min(1, t.o + 0.35)}
          />
        ))}

      {spec.family === "crescents" &&
        spec.crescents.map((cr, i) => (
          <path
            key={`c${i}`}
            d={arcPath(cr.r, cr.start, cr.sweep)}
            fill="none"
            stroke={`url(#${uid}-ac)`}
            strokeWidth={cr.w + 3}
            strokeLinecap="round"
            opacity={Math.min(1, cr.o + 0.3)}
          />
        ))}

      {/* core anchor — bright halo + solid accent dot */}
      <circle cx={C} cy={C} r={spec.coreRingR} fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
      <circle cx={C} cy={C} r={spec.coreR + 3} fill={glow} />
    </svg>
  );
}
