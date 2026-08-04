// /admin/final-test — ITEM 325.
//
// CEO-confirmed as a genuinely separate page/route (not an in-place extension
// of /admin/quality-batch). It renders the SAME shared console component, so
// the full feature set — tool checkboxes, batch size, live status strip, live
// log, scores matrix, pinned rerun, resume run, PDF-zip and markdown exports,
// LaunchGateScoreboard, QualityFindingBacklogPanel, CertificationStatusPanel,
// and the campaign controls — is identical by construction, plus the per-tool
// Perfect/Messy fixture-variant toggle.
//
// Messy fixtures do not exist yet for any product (separate, upcoming work);
// starting a messy run today is rejected by the orchestrator with the tool
// name rather than silently falling back to the perfect set.

import { QualityConsole } from "@/components/admin/quality-console/QualityConsole";
import { RedeployPanel } from "@/components/admin/RedeployPanel";

export default function FinalTest() {
  return (
    <div className="space-y-6 pb-12">
      <QualityConsole
        title="Final Test"
        caption="quality-batch-orchestrator · variant-aware"
        showVariants
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RedeployPanel />
      </div>
    </div>
  );
}
