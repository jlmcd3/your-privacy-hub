/**
 * UX-2d — OG / social preview template (1200×630).
 *
 * A React-rendered 1200×630 SVG that composes the standard social card:
 * navy → ocean gradient, globe corner motif, refreshed lockup, headline
 * slot, and an optional statute microline. Not used as the real
 * og:image (that is generated at deploy time by Lovable), but usable
 * for in-app social preview surfaces and internal QA.
 */

interface OGCardTemplateProps {
  headline: string;
  statuteCite?: string;
  eyebrow?: string;
}

export function OGCardTemplate({
  headline,
  statuteCite,
  eyebrow = "End User Privacy · Privacy Intelligence",
}: OGCardTemplateProps) {
  return (
    <svg
      width={1200}
      height={630}
      viewBox="0 0 1200 630"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={headline}
    >
      <title>{headline}</title>
      <defs>
        <linearGradient id="ogBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d2a45" />
          <stop offset="55%" stopColor="#1a4a6e" />
          <stop offset="100%" stopColor="#2d7a8a" />
        </linearGradient>
      </defs>
      <rect width={1200} height={630} fill="url(#ogBg)" />

      {/* Corner globe motif */}
      <g
        aria-hidden="true"
        transform="translate(940 470)"
        fill="none"
        stroke="#69c9be"
        strokeOpacity="0.22"
        strokeWidth={1.5}
        strokeLinecap="round"
      >
        <circle cx="0" cy="0" r="260" />
        <path d="M -260 -80 Q 0 -140 260 -80" />
        <path d="M -260 0 L 260 0" />
        <path d="M -260 80 Q 0 140 260 80" />
        <ellipse cx="0" cy="0" rx="100" ry="260" />
        <ellipse cx="0" cy="0" rx="180" ry="260" strokeOpacity="0.16" />
      </g>

      {/* Refreshed mark */}
      <g transform="translate(72 72)" aria-hidden="true">
        <circle cx="26" cy="26" r="23" fill="none" stroke="#ffffff" strokeWidth={2.5} />
        <line x1="3.5" y1="26" x2="48.5" y2="26" stroke="#ffffff" strokeWidth={1.75} strokeLinecap="round" />
        <path d="M 6 16 Q 26 12 46 16" fill="none" stroke="#ffffff" strokeWidth={1.25} strokeLinecap="round" opacity="0.7" />
        <path d="M 6 36 Q 26 40 46 36" fill="none" stroke="#ffffff" strokeWidth={1.25} strokeLinecap="round" opacity="0.7" />
        <ellipse cx="26" cy="26" rx="9" ry="23" fill="none" stroke="#69c9be" strokeWidth={2.5} />
        <circle cx="39" cy="26" r="3" fill="#69c9be" />
      </g>

      {/* Eyebrow */}
      <text
        x={140}
        y={108}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={20}
        fontWeight={600}
        fill="#b5ccd6"
        style={{ letterSpacing: "0.24em" }}
      >
        {eyebrow.toUpperCase()}
      </text>

      {/* Headline */}
      <foreignObject x={72} y={210} width={1056} height={260}>
        <div
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 68,
            lineHeight: 1.05,
            color: "#ffffff",
            letterSpacing: "-0.01em",
            maxWidth: 960,
          }}
        >
          {headline}
        </div>
      </foreignObject>


      {/* Mono statute slot */}
      {statuteCite && (
        <text
          x={72}
          y={548}
          fontFamily="'Roboto Mono', DM Mono, ui-monospace, monospace"
          fontSize={22}
          fill="#69c9be"
        >
          {statuteCite}
        </text>
      )}

      {/* Footer domain */}
      <text
        x={72}
        y={588}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={18}
        fontWeight={600}
        fill="#ffffff"
        opacity="0.8"
      >
        enduserprivacy.com
      </text>
    </svg>
  );
}

export default OGCardTemplate;
