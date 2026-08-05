// TEMPORARY — ITEM 381 Layer 1 walk-through harness (screenshot evidence only).
import { useState } from "react";
import IntakeCoachStep from "@/components/intake/IntakeCoachStep";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { DPIA_GOLDEN } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk";

const dpia = (DPIA_GOLDEN as unknown as Array<{ id: string; intake: Record<string, unknown> }>)[0];
const risk = (CPPA_RISK_GOLDEN as unknown as Array<{ id: string; intake: Record<string, unknown> }>)[0];

const CoachPreview = () => {
  const [which, setWhich] = useState<"dpia" | "cppa_risk">(new URLSearchParams(window.location.search).get("p") === "risk" ? "cppa_risk" : "dpia");
  return (
    <div className="p-8">
      <button onClick={() => setWhich("dpia")}>dpia</button>
      <button onClick={() => setWhich("cppa_risk")}>risk</button>
      <IntakeCoachStep
        open
        product={which}
        contract={COACH_CONTRACTS[which]}
        intake={which === "dpia" ? dpia.intake : risk.intake}
        onClose={() => {}}
        onContinue={() => {}}
      />
    </div>
  );
};

export default CoachPreview;
