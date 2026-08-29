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
import { useRunOutcomes } from "@/lib/allProductsOutcomes";
import {
  downloadBatchErrorsMarkdown,
  downloadBatchPdfZip,
} from "@/lib/allProductsBatchExports";

export default function AllProductsTest() {
  const outcomes = useRunOutcomes();

  // Per-batch exports for the in-page batch columns: "zip" renders and
  // downloads the batch's report PDFs; "md" downloads every error of the batch.
  const localBatchActions = (batchId: string) => (
    <>
      <button
        type="button"
        className="text-[10px] underline text-brand-teal-text hover:no-underline"
        onClick={() => void downloadBatchPdfZip(batchId, outcomes)}
        title="Create + download PDFs for this batch (zip)"
      >zip</button>
      <button
        type="button"
        className="text-[10px] underline text-brand-teal-text hover:no-underline"
        onClick={() => downloadBatchErrorsMarkdown(batchId, outcomes)}
        title="Download this batch's errors (.md)"
      >md</button>
    </>
  );

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
        // Graded rows (Claude + GPT scored by run-quality-batch). DPA Generator
        // is dispatchable and gradable by the orchestrator, so it belongs in the
        // scored matrix rather than in the ungraded tail.
        toolsOverride={[...SO_SKELETON_TOOLS, "dpa-generator"]}
        scoresAndLogFirst
        showLocalRunLog
        renderLocalBatchActions={localBatchActions}
        // Ungraded tail — ONLY the products the orchestrator cannot dispatch or
        // grade. No product appears in both lists.
        extraHistoryTools={["ropa", "us-notice", "eu-notice"]}

      />
    </div>
  );
}

