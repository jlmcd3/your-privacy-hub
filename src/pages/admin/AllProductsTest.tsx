// /admin/all-products-test — ALL-PRODUCTS TEST.
//
// Carries over /admin/SO-final-test in full: the SAME <QualityConsole />
// component with the SAME props (showVariants, graderMode="skeleton",
// toolsOverride={SO_SKELETON_TOOLS}), so every batch control, the live status
// strip, live log, scores matrix, pinned rerun, resume, PDF-zip / markdown
// exports, launch-gate scoreboard and campaign controls are identical by
// construction and read/write the same grader_mode="skeleton" rows. Nothing
// about the SO row separation changes.
//
// Added below it: <AllProductsPanel />, which covers the products the SO batch
// cannot dispatch (DPA Generator, RoPA, US Notice, EU Notice) plus, optionally,
// the SO products themselves as an end-to-end sample-data run. Every run is
// gated by the intake preflight so no failure originates in intake data.

import { QualityConsole } from "@/components/admin/quality-console/QualityConsole";
import { AllProductsPanel } from "@/components/admin/AllProductsPanel";
import { SO_SKELETON_TOOLS } from "./SOFinalTest";

export default function AllProductsTest() {
  return (
    <div className="space-y-6 pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <AllProductsPanel />
      </div>
      <QualityConsole
        title="All Products Test"
        caption="quality-batch-orchestrator · skeleton_document grading"
        showVariants
        graderMode="skeleton"
        toolsOverride={SO_SKELETON_TOOLS}
        scoresAndLogFirst
        showLocalRunLog
        // Ungraded run history for EVERY testable product: Claude-intake jobs
        // (static_stress_jobs) plus pre-set-package runs executed in this page.
        // SO products appear twice on purpose — once graded by the batch
        // matrix above, once here as raw pass/fail run counts.
        extraHistoryTools={[
          "dpa", "ropa", "us-notice", "eu-notice",
          "lia", "dpia", "governance", "ir-playbook", "biometric",
          "registration", "cppa-risk", "cppa-cyber", "cppa-admt",
        ]}
      />
    </div>
  );
}

