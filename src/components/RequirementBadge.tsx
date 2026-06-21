type RequirementTier = "required" | "conditional" | "expected" | "supports" | "free";

const CARD_STYLES: Record<RequirementTier, string> = {
  required:    "bg-amber-100 text-amber-900 border border-amber-300",
  conditional: "bg-amber-100 text-amber-900 border border-amber-300",
  expected:    "bg-blue-50 text-blue-900 border border-blue-200",
  supports:    "bg-slate-100 text-slate-700 border border-slate-300",
  free:        "bg-emerald-50 text-emerald-800 border border-emerald-200",
};

// Hero variant sits on the dark page headers, so it uses light text.
const HERO_TEXT: Record<RequirementTier, string> = {
  required:    "text-amber-200",
  conditional: "text-amber-200",
  expected:    "text-blue-200",
  supports:    "text-slate-300",
  free:        "text-emerald-200",
};

export function RequirementBadge({
  tier,
  text,
  variant = "card",
  className = "",
}: {
  tier: RequirementTier;
  text: string;
  variant?: "card" | "hero";
  className?: string;
}) {
  if (variant === "hero") {
    return <p className={`text-sm font-medium ${HERO_TEXT[tier]} ${className}`}>{text}</p>;
  }
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${CARD_STYLES[tier]} ${className}`}>
      {text}
    </span>
  );
}
