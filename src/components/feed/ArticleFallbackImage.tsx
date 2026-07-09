// ArticleFallbackImage v3 — "signal glyph": deterministic, text-free, branded
// SVG placeholder for articles without artwork.
//
// Design rules (learned from v1/v2 failures in production slots):
// - NO TEXT. The live slots are 40-64px squares and 112x80 rects; letters at
//   that scale read as rendering bugs. Meaning is carried by color + geometry.
// - CROP-PROOF. Square canvas, radial composition centered at (240,240) with
//   all meaningful geometry inside r<=190, so preserveAspectRatio="slice" in
//   any slot aspect (square, 16:9, 4:3) only trims empty margin.
// - Deterministic: same article id => same glyph, forever.
// - Brand: EUP v7 — navy #0d2a45, teal #2a9d8f, mist #b5ccd6, cloud #e8eff2;
//   category tints the accent. Zero deps, zero network.

import { useMemo } from "react";

export type FallbackCategory =
  | "legislation"
  | "enforcement"
  | "guidance"
  | "analysis"
  | "default";

interface ArticleFallbackImageProps {
  /** Stable identifier — article id or URL. Same seed ⇒ same glyph, always. */
  seed: string;
  /** Tints the accent geometry. Defaults to teal. */
  category?: FallbackCategory;
  className?: string;
  /** Accessible description, e.g. the article title. */
  alt?: string;
}

/* ---------- deterministic PRNG (xmur3 hash → mulberry32) ---------- */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- brand constants ---------- */

const NAVY = "#0d2a45";
const CLOUD = "#e8eff2";

const ACCENT: Record<FallbackCategory, string> = {
  legislation: "#2a9d8f", // brand teal
  enforcement: "#d9a441", // gold
  guidance: "#b5ccd6",    // brand mist
  analysis: "#69c9be",    // brand teal-on-navy
  default: "#2a9d8f",
};

const MIDS = ["#123a52", "#1f6674", "#14324e", "#1c5a63"];

/* ---------- pure glyph-spec builder (exported for tests) ---------- */

const C = 240; // center of the 480x480 canvas

export interface GlyphSpec {
  mid: string;
  family: "orbits" | "burst" | "crescents";
  rings: Array<{ r: number; w: number; o: number; dash?: string }>;
  orbitDots: Array<{ x: number; y: number; r: number; o: number }>;
  burstTicks: Array<{ x1: number; y1: number; x2: number; y2: number; w: number; o: number }>;
  crescents: Array<{ r: number; start: number; sweep: number; w: number; o: number }>;
  coreR: number;
  coreRingR: number;
}

export function buildGlyphSpec(seed: string): GlyphSpec {
  const rand = mulberry32(xmur3(seed)());
  const mid = MIDS[Math.floor(rand() * MIDS.length)];
  const family = (["orbits", "burst", "crescents"] as const)[Math.floor(rand() * 3)];

  // Concentric base rings (all families get 2-3, faint)
  const rings: GlyphSpec["rings"] = [];
  const nRings = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nRings; i++) {
    const r = 70 + i * (38 + rand() * 22);
    rings.push({
      r: +r.toFixed(1),
      w: rand() < 0.4 ? 2 : 1,
      o: +(0.35 - i * 0.08).toFixed(2),
      dash: rand() < 0.45 ? `${(4 + rand() * 10).toFixed(0)} ${(6 + rand() * 12).toFixed(0)}` : undefined,
    });
  }

  // Family: orbiting dots on the rings
  const orbitDots: GlyphSpec["orbitDots"] = [];
  const nDots = 5 + Math.floor(rand() * 5);
  for (let i = 0; i < nDots; i++) {
    const ring = rings[Math.floor(rand() * rings.length)];
    const a = rand() * Math.PI * 2;
    orbitDots.push({
      x: +(C + ring.r * Math.cos(a)).toFixed(1),
      y: +(C + ring.r * Math.sin(a)).toFixed(1),
      r: +(3 + rand() * 6).toFixed(1),
      o: +(0.5 + rand() * 0.45).toFixed(2),
    });
  }

  // Family: radial burst ticks
  const burstTicks: GlyphSpec["burstTicks"] = [];
  const nTicks = 14 + Math.floor(rand() * 10);
  for (let i = 0; i < nTicks; i++) {
    const a = (i / nTicks) * Math.PI * 2 + rand() * 0.2;
    const r0 = 80 + rand() * 40;
    const r1 = r0 + 22 + rand() * 60;
    burstTicks.push({
      x1: +(C + r0 * Math.cos(a)).toFixed(1),
      y1: +(C + r0 * Math.sin(a)).toFixed(1),
      x2: +(C + Math.min(r1, 188) * Math.cos(a)).toFixed(1),
      y2: +(C + Math.min(r1, 188) * Math.sin(a)).toFixed(1),
      w: rand() < 0.3 ? 3 : 2,
      o: +(0.3 + rand() * 0.5).toFixed(2),
    });
  }

  // Family: nested crescent arcs
  const crescents: GlyphSpec["crescents"] = [];
  const nCr = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < nCr; i++) {
    crescents.push({
      r: +(70 + i * (30 + rand() * 14)).toFixed(1),
      start: +(rand() * 360).toFixed(0),
      sweep: +(90 + rand() * 180).toFixed(0),
      w: rand() < 0.4 ? 5 : 3,
      o: +(0.55 - i * 0.08).toFixed(2),
    });
  }

  return {
    mid,
    family,
    rings,
    orbitDots,
    burstTicks,
    crescents,
    coreR: +(7 + rand() * 6).toFixed(1),
    coreRingR: +(22 + rand() * 12).toFixed(1),
  };
}

function arcPath(r: number, startDeg: number, sweepDeg: number): string {
  const s = (startDeg * Math.PI) / 180;
  const e = ((startDeg + sweepDeg) * Math.PI) / 180;
  const large = sweepDeg > 180 ? 1 : 0;
  return `M ${(C + r * Math.cos(s)).toFixed(1)} ${(C + r * Math.sin(s)).toFixed(1)} A ${r} ${r} 0 ${large} 1 ${(C + r * Math.cos(e)).toFixed(1)} ${(C + r * Math.sin(e)).toFixed(1)}`;
}

/* ---------- component ---------- */

export default function ArticleFallbackImage({
  seed,
  category = "default",
  className,
  alt,
}: ArticleFallbackImageProps) {
  const spec = useMemo(() => buildGlyphSpec(seed), [seed]);
  const accent = ACCENT[category] ?? ACCENT.default;
  const gid = useMemo(() => `fbg-${xmur3(seed)().toString(36)}`, [seed]);

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
        <radialGradient id={gid} cx="50%" cy="46%" r="75%">
          <stop offset="0%" stopColor={spec.mid} />
          <stop offset="100%" stopColor={NAVY} />
        </radialGradient>
      </defs>

      <rect width="480" height="480" fill={`url(#${gid})`} />

      {spec.rings.map((rg, i) => (
        <circle
          key={`r${i}`}
          cx={C}
          cy={C}
          r={rg.r}
          fill="none"
          stroke={CLOUD}
          strokeWidth={rg.w}
          strokeDasharray={rg.dash}
          opacity={rg.o * 0.5}
        />
      ))}

      {spec.family === "orbits" &&
        spec.orbitDots.map((d, i) => (
          <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={accent} opacity={d.o} />
        ))}

      {spec.family === "burst" &&
        spec.burstTicks.map((t, i) => (
          <line
            key={`t${i}`}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={accent}
            strokeWidth={t.w}
            strokeLinecap="round"
            opacity={t.o}
          />
        ))}

      {spec.family === "crescents" &&
        spec.crescents.map((cr, i) => (
          <path
            key={`c${i}`}
            d={arcPath(cr.r, cr.start, cr.sweep)}
            fill="none"
            stroke={accent}
            strokeWidth={cr.w}
            strokeLinecap="round"
            opacity={cr.o}
          />
        ))}

      {/* core: accent dot inside a cloud ring — the constant brand anchor */}
      <circle cx={C} cy={C} r={spec.coreRingR} fill="none" stroke={CLOUD} strokeWidth="2" opacity="0.8" />
      <circle cx={C} cy={C} r={spec.coreR} fill={accent} />
    </svg>
  );
}
