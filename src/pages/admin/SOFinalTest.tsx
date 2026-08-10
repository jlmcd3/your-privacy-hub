// /admin/SO-final-test — SO-FINAL-TEST.
//
// Built exactly the way FinalTest.tsx documents itself as having been built
// relative to /admin/quality-batch: a thin wrapper around the SAME
// <QualityConsole /> component, so batch controls, live status strip, live log,
// scores matrix, pinned rerun, resume, PDF-zip / markdown exports, the launch
// gate scoreboard and the campaign controls all come for free and can never
// drift from the other consoles.
//
// Two differences, both props on the shared console:
//   1. graderMode="skeleton" — runs are graded on report.skeleton_document as
//      the WHOLE body (see _shared/grader/skeleton-payload.ts), not the legacy
//      per-product BODY_FIELDS list. The legacy grader path is untouched.
//   2. toolsOverride     — scoped to the SO-migrated products that have both a
//      skeleton_document and a quality-batch slug.
//
// Row separation: every batch and child run started here carries
// grader_mode="skeleton", and this console reads only grader_mode="skeleton"
// rows. /admin/final-test and /admin/quality-batch read only grader_mode IS
// NULL rows, so neither history can see or aggregate the other's results.

import { QualityConsole } from "@/components/admin/quality-console/QualityConsole";

// SO-migrated products with a quality-batch slug. SO-9 (Scope Checker) and
// SO-10 (RoPA) are skeleton-encoded but are NOT dispatchable tools in
// RUN_QUALITY_BATCH_SLUGS — adding them would mean touching the sequence's
// generators, which this item is forbidden from doing.
export const SO_SKELETON_TOOLS = [
  "cppa-risk",
  "cppa-cyber",
  "cppa-admt",
  "governance",
  "dpia",
  "lia",
  "ir-playbook",
  "biometric-checker",
  "registration",
];

export default function SOFinalTest() {
  return (
    <div className="space-y-6 pb-12">
      <QualityConsole
        title="SO Final Test"
        caption="quality-batch-orchestrator · skeleton_document grading"
        showVariants
        graderMode="skeleton"
        toolsOverride={SO_SKELETON_TOOLS}
      />
    </div>
  );
}
