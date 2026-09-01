// PRODUCT PAGE CHANGES (2026-09-01) — access-aware hero price line for the
// Professional-included deliverable tools (DPA, IR Playbook, Biometric).
//
// Ratified wording rules:
//   • Price never appears in the eyebrow chip; it lives here.
//   • Registry is authoritative: these tools are $X standalone and included
//     with an active Professional plan (NOT with Intelligence, and NOT a
//     "subscriber rate" — subscribers pay nothing).
import { CheckCircle2 } from "lucide-react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PRICING, type ToolKey, isIncludedToolForPlan } from "@/config/pricing";

export default function HeroAccessLine({
  toolKey,
  className = "",
}: {
  toolKey: ToolKey;
  className?: string;
}) {
  const { isPremium, isPro, isLoading } = useSubscriptionTier();
  const tool = PRICING.tools[toolKey];
  const included = Boolean(isPremium) && isIncludedToolForPlan(toolKey, Boolean(isPro));

  if (isLoading) return null;

  if (included) {
    return (
      <div className={className}>
        <p className="text-white text-lg font-semibold">
          Included with your Professional plan
          <span className="ml-3 text-sm font-normal text-slate-400 line-through">
            {tool.display} standalone
          </span>
        </p>
        <p className="mt-1 text-sm font-medium text-emerald-300">
          <CheckCircle2
            aria-hidden="true"
            className="inline w-[1em] h-[1em] align-[-0.125em] mr-1"
            strokeWidth={1.75}
          />
          No additional charge for this run
        </p>
      </div>
    );
  }

  return (
    <p className={`text-white text-lg ${className}`}>
      <span className="font-semibold">{tool.display}</span>{" "}
      <span className="text-slate-300">standalone</span>
      <span className="mx-2 text-slate-400">·</span>
      <span className="text-slate-300">Included with an active Professional plan</span>
    </p>
  );
}
