/**
 * UX-2d — Hero Panel motif.
 *
 * Renders a navy → ocean → teal gradient panel with a globe line-art
 * corner motif. Three crops are supported: `wide` (16:5 desktop hero),
 * `square` (1:1 card), `tall` (9:16 mobile hero). The globe SVG is
 * inlined (no external asset) and positioned per crop so it reads as a
 * corner emblem, not a background photo.
 */
import { cn } from "@/lib/utils";

type HeroPanelCrop = "wide" | "square" | "tall";

interface HeroPanelProps {
  crop?: HeroPanelCrop;
  className?: string;
  children?: React.ReactNode;
  /** Corner where the globe motif is anchored. Defaults to `br`. */
  motifAnchor?: "tl" | "tr" | "bl" | "br";
}

const ASPECT: Record<HeroPanelCrop, string> = {
  wide: "aspect-[16/5]",
  square: "aspect-square",
  tall: "aspect-[9/16]",
};

const ANCHOR_POS: Record<NonNullable<HeroPanelProps["motifAnchor"]>, string> = {
  tl: "top-0 left-0",
  tr: "top-0 right-0",
  bl: "bottom-0 left-0",
  br: "bottom-0 right-0",
};

const ANCHOR_TRANSFORM: Record<NonNullable<HeroPanelProps["motifAnchor"]>, string> = {
  tl: "-translate-x-1/3 -translate-y-1/3",
  tr: "translate-x-1/3 -translate-y-1/3",
  bl: "-translate-x-1/3 translate-y-1/3",
  br: "translate-x-1/3 translate-y-1/3",
};

export function HeroPanel({
  crop = "wide",
  className,
  children,
  motifAnchor = "br",
}: HeroPanelProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        ASPECT[crop],
        // Navy → ocean → teal gradient. Hex values are duplicated from the
        // frozen token palette (--brand-navy, --brand-ocean, --brand-teal).
        "bg-[linear-gradient(135deg,#0d2a45_0%,#1a4a6e_55%,#2d7a8a_100%)]",
        className,
      )}
    >
      {/* Globe line-art corner motif — pure SVG, no image asset. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className={cn(
          "absolute w-[70%] max-w-[520px] opacity-[0.22] pointer-events-none",
          ANCHOR_POS[motifAnchor],
          ANCHOR_TRANSFORM[motifAnchor],
        )}
      >
        <g fill="none" stroke="#69c9be" strokeWidth={1.25} strokeLinecap="round">
          <circle cx="200" cy="200" r="180" />
          <circle cx="200" cy="200" r="180" strokeWidth={0.75} strokeDasharray="2 6" opacity={0.7} />
          {/* Latitude arcs */}
          <path d="M 30 130 Q 200 100 370 130" />
          <path d="M 30 200 L 370 200" />
          <path d="M 30 270 Q 200 300 370 270" />
          <path d="M 65 90 Q 200 60 335 90" opacity={0.6} />
          <path d="M 65 310 Q 200 340 335 310" opacity={0.6} />
          {/* Meridian arcs */}
          <ellipse cx="200" cy="200" rx="70" ry="180" />
          <ellipse cx="200" cy="200" rx="130" ry="180" opacity={0.65} />
          <line x1="200" y1="20" x2="200" y2="380" opacity={0.5} />
        </g>
      </svg>
      {children && <div className="relative h-full w-full">{children}</div>}
    </div>
  );
}

export default HeroPanel;
