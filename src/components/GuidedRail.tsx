// src/components/GuidedRail.tsx
// Tier-gated wrapper around StatuteRail for GDPR tools.
//
// Anonymous: renders RailRegisterPrompt (the soft inline sign-in card).
// Registered: renders StatuteRail with showAgencyReasoning=false
//             (plain summary + regulation text visible; agency reasoning gated).
// Paid: renders StatuteRail with showAgencyReasoning=true (full content).

import StatuteRail from "@/components/admt/StatuteRail";
import type { RailEntry } from "@/components/admt/StatuteRail";
import RailRegisterPrompt from "@/components/RailRegisterPrompt";
import type { GuidanceTier } from "@/hooks/useGuidanceTier";

interface GuidedRailProps {
  entry: RailEntry | null;
  guidanceTier: GuidanceTier;
  /** True when the user has focused a field — activates the register prompt for anonymous users. */
  promptTriggered?: boolean;
  className?: string;
}

export default function GuidedRail({
  entry,
  guidanceTier,
  promptTriggered = false,
  className,
}: GuidedRailProps) {
  if (guidanceTier === "anonymous") {
    return <RailRegisterPrompt triggered={promptTriggered} />;
  }

  return (
    <StatuteRail
      entry={entry}
      showAgencyReasoning={guidanceTier === "paid"}
      className={className}
    />
  );
}
