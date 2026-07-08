import { cn } from "@/lib/utils";

export type Tier = "free" | "intelligence" | "professional";

const TIER_STYLES: Record<Tier, string> = {
  free: "bg-brand-cloud text-brand-steel border-brand-mist",
  intelligence: "bg-brand-teal-deep text-white border-brand-teal-deep",
  professional: "bg-brand-navy text-brand-light-teal border-brand-navy",
};

const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  intelligence: "Intelligence",
  professional: "Professional",
};

/**
 * Subscription tier badge — used wherever a tool, feature, or article is
 * gated by tier. See brand guidelines §11.
 */
export function TierBadge({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.12em] border",
        TIER_STYLES[tier],
        className
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

export default TierBadge;
