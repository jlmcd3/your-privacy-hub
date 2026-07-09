// ArticleFallbackImage — deterministic, branded SVG placeholder for ingested
// articles that arrive without artwork. Seeded by article id: the same article
// always renders the same tile; different articles get visibly different
// geometry, so a feed of fallbacks never looks like a wall of identical logos.
//
// Brand: EUP v7 — navy #0d2a45, teal #2a9d8f, mist #b5ccd6, cloud #e8eff2.
// Text is brand-cloud on navy (≈12:1, WCAG AA with margin). Decorative strokes
// are exempt from contrast requirements (non-text).
//
// Zero dependencies, zero network requests, renders anywhere an <img> would.

import { useMemo } from "react";

export type FallbackCategory =
  | "legislation"
  | "enforcement"
  | "guidance"
  | "analysis"
  | "default";

interface ArticleFallbackImageProps {
  /** Stable identifier — article id or URL. Same seed ⇒ same tile, always. */
  seed: string;
  /** Optional anchor text: regulator, statute, or jurisdiction (e.g. "CNIL", "GDPR", "California"). */
  label?: string;
  /** Optional small eyebrow above the label (e.g. "Enforcement", "Legislation"). */
  eyebrow?: string;
  /** Tints the accent geometry. Defaults to teal. */
  category?: FallbackCategory;
  className?: string;
  /** Accessible description; defaults to the label or a generic alt. */
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
  enforcement: "#d9a441", // gold — matches CTA gold family
  guidance: "#b5ccd6",    // brand mist
  analysis: "#69c9be",    // brand teal-on-navy
  default: "#2a9d8f",
};

// Gradient mid-stops the geometry sits on — all deep, all AA-safe under cloud text.
const MIDS = ["#123a52", "#1f6674", "#14324e", "#1c5a63"];

/* ---------- pure tile-spec builder (exported for tests) ---------- */

export interface TileSpec {
  angle: number;
  mid: string;
  pattern: "contours" | "dots" | "arcs";
  paths: string[];
  dots: Array<{ x: number; y: number; r: number; o: number }>;
  arcs: Array<{ r: number; o: number }>;
  arcCorner: { x: number; y: number };
}

export function buildTileSpec(seed: string): TileSpec {
  const rand = mulberry32(xmur3(seed)());
  const angle = Math.floor(rand() * 360);
  const mid = MIDS[Math.floor(rand() * MIDS.length)];
  const pattern = (["contours", "dots", "arcs"] as const)[Math.floor(rand() * 3)];

  // Flowing contour lines (topographic feel)
  const paths: string[] = [];
  const lines = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < lines; i++) {
    const y0 = 60 + rand() * 340;
    const c1x = 150 + rand() * 200;
    const c1y = y0 - 80 + rand() * 160;
    const c2x = 450 + rand() * 200;
    const c2y = y0 - 80 + rand() * 160;
    const y1 = 60 + rand() * 340;
    paths.push(`M -20 ${y0.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, 820 ${y1.toFixed(1)}`);
  }

  // Data-field dot grid with per-dot jitter and fade
  const dots: TileSpec["dots"] = [];
  const cols = 12, rows = 7;
  const fx = rand() * 800, fy = rand() * 450;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const x = 40 + cx * 66 + (rand() - 0.5) * 14;
      const y = 40 + cy * 60 + (rand() - 0.5) * 14;
      const d = Math.hypot(x - fx, y - fy);
      const o = Math.max(0.06, 0.5 - d / 900);
      dots.push({ x: +x.toFixed(1), y: +y.toFixed(1), r: +(1.2 + rand() * 2).toFixed(1), o: +o.toFixed(2) });
    }
  }

  // Concentric arcs radiating from a corner (horizon/radar feel)
  const corners = [
    { x: 0, y: 0 }, { x: 800, y: 0 }, { x: 0, y: 450 }, { x: 800, y: 450 },
  ];
  const arcCorner = corners[Math.floor(rand() * 4)];
  const arcs: TileSpec["arcs"] = [];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    arcs.push({ r: 90 + i * (70 + rand() * 30), o: +(0.28 - i * 0.03).toFixed(2) });
  }

  return { angle, mid, pattern, paths, dots, arcs, arcCorner };
}

/* ---------- component ---------- */

export default function ArticleFallbackImage({
  seed,
  label,
  eyebrow,
  category = "default",
  className,
  alt,
}: ArticleFallbackImageProps) {
  const spec = useMemo(() => buildTileSpec(seed), [seed]);
  const accent = ACCENT[category] ?? ACCENT.default;
  const gid = useMemo(
    () => `fbg-${xmur3(seed)().toString(36)}`,
    [seed],
  );
  const rad = (spec.angle * Math.PI) / 180;
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  return (
    <svg
      viewBox="0 0 800 450"
      role="img"
      aria-label={alt ?? (label ? `${label} — End User Privacy` : "End User Privacy article")}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2={`${x2}%`} y2={`${y2}%`}>
          <stop offset="0%" stopColor={NAVY} />
          <stop offset="62%" stopColor={spec.mid} />
          <stop offset="100%" stopColor={NAVY} />
        </linearGradient>
      </defs>

      <rect width="800" height="450" fill={`url(#${gid})`} />

      {spec.pattern === "contours" &&
        spec.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={accent}
            strokeWidth={i % 2 === 0 ? 2 : 1}
            opacity={0.22 - i * 0.02}
          />
        ))}

      {spec.pattern === "dots" &&
        spec.dots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={accent} opacity={p.o * 0.55} />
        ))}

      {spec.pattern === "arcs" &&
        spec.arcs.map((a, i) => (
          <circle
            key={i}
            cx={spec.arcCorner.x}
            cy={spec.arcCorner.y}
            r={a.r}
            fill="none"
            stroke={accent}
            strokeWidth={i === 0 ? 2 : 1}
            opacity={a.o}
          />
        ))}

      {/* subtle accent baseline */}
      <rect x="0" y="444" width="800" height="6" fill={accent} opacity="0.85" />

      {eyebrow && (
        <text
          x="48"
          y="330"
          fill={CLOUD}
          opacity="0.72"
          fontFamily="'DM Sans', system-ui, sans-serif"
          fontSize="19"
          fontWeight="600"
          letterSpacing="3.5"
        >
          {eyebrow.toUpperCase()}
        </text>
      )}

      {label && (
        <text
          x="46"
          y="392"
          fill={CLOUD}
          fontFamily="'DM Serif Display', Georgia, serif"
          fontSize="58"
        >
          {label}
        </text>
      )}

      {!label && (
        <text
          x="48"
          y="392"
          fill={CLOUD}
          opacity="0.85"
          fontFamily="'DM Serif Display', Georgia, serif"
          fontSize="30"
        >
          End User Privacy
        </text>
      )}
    </svg>
  );
}
