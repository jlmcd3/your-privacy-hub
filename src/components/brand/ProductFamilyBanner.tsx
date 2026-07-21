/**
 * UX-2d — Product-family Card Banners.
 *
 * Four family variants: `cppa`, `eu-uk`, `us-states`, `tools`. Each is a
 * fixed-tone banner surface with a mono statute/anchor microline slot
 * and a headline slot. Intended for use as a card header inside product
 * grids and comparison surfaces.
 */
import { cn } from "@/lib/utils";

export type ProductFamily = "cppa" | "eu-uk" | "us-states" | "tools";

const FAMILY_STYLES: Record<ProductFamily, {
  bg: string;
  accent: string;
  chip: string;
  label: string;
}> = {
  cppa: {
    bg: "bg-[linear-gradient(135deg,#0d2a45_0%,#1a4a6e_100%)]",
    accent: "#69c9be",
    chip: "California · CPPA",
    label: "text-white",
  },
  "eu-uk": {
    bg: "bg-[linear-gradient(135deg,#0d2a45_0%,#153a5f_60%,#185FA5_100%)]",
    accent: "#b5ccd6",
    chip: "EU · UK",
    label: "text-white",
  },
  "us-states": {
    bg: "bg-[linear-gradient(135deg,#1a4a6e_0%,#2d7a8a_100%)]",
    accent: "#69c9be",
    chip: "U.S. States",
    label: "text-white",
  },
  tools: {
    bg: "bg-[linear-gradient(135deg,#2d7a8a_0%,#2a9d8f_100%)]",
    accent: "#ffffff",
    chip: "Tools",
    label: "text-white",
  },
};

interface ProductFamilyBannerProps {
  family: ProductFamily;
  title: string;
  /** Roboto/DM Mono statute or anchor citation — kept short. */
  statuteCite?: string;
  /** Optional short subline. */
  subline?: string;
  className?: string;
}

export function ProductFamilyBanner({
  family,
  title,
  statuteCite,
  subline,
  className,
}: ProductFamilyBannerProps) {
  const s = FAMILY_STYLES[family];
  return (
    <div className={cn("relative overflow-hidden rounded-t-xl p-5 md:p-6", s.bg, className)}>
      {/* Corner accent bar — signals family without adding text. */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-1"
        style={{ backgroundColor: s.accent }}
      />
      <div className="relative">
        <div className="font-mono text-[11px] tracking-wider uppercase text-white/70 mb-2">
          {s.chip}
        </div>
        <h3 className={cn("text-[22px] leading-tight font-display m-0", s.label)}>{title}</h3>
        {statuteCite && (
          <p className="font-mono text-[12.5px] leading-snug text-white/75 mt-2 mb-0">
            {statuteCite}
          </p>
        )}
        {subline && <p className="text-sm text-white/85 mt-3 mb-0">{subline}</p>}
      </div>
    </div>
  );
}

export default ProductFamilyBanner;
