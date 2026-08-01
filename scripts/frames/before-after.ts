#!/usr/bin/env -S deno run --allow-read --allow-env
// ITEM 346 — BEFORE/AFTER RENDER PAIR for CEO sign-off, on a COMPLETE fixture.
//
// BEFORE = the Item 338 frame set as the CEO saw it (slot-walk prose).
// AFTER  = the revised Item 346 set: legal test and record facts interwoven,
//          registry-legal and engine-conclusion slots pinned, cites resolved
//          from the verified-authority registry (the "[registry: re-queried at
//          build time]" literal defect is fixed), and a CONTENT-COVERAGE report
//          proving no determination, contradiction flag, or gap was flattened.
//
//   deno run --allow-read --allow-env scripts/frames/before-after.ts

import { CPPA_RISK_FRAMES } from "../../supabase/functions/_shared/prose/frames/cppa-risk.frames.ts";
import { buildCppaRiskFrameValues } from "../../supabase/functions/_shared/prose/frames/cppa-risk.values.ts";
import { renderSectionFromFrames } from "../../supabase/functions/_shared/prose/frame-render.ts";
import { buildActivityAnalytics } from "../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import { checkCoverage, collectCoverageAtoms } from "../../supabase/functions/_shared/prose/frame-coverage.ts";
import { resolveEngineConclusion } from "../../supabase/functions/_shared/prose/engine-conclusions.ts";

// COMPLETE FIXTURE: the golden "Perfect Data" record — every required value
// present, so nothing renders as an omission and the pair judges the PROSE.
const intake = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;
const analytics = buildActivityAnalytics(intake)[0];
const { values, determinations } = buildCppaRiskFrameValues({ intake, analytics });

// Review-render gate: the on-disk set stays approved:false. Approval is
// simulated IN MEMORY ONLY so the CEO can read the candidate output.
const approved = {
  ...CPPA_RISK_FRAMES,
  approved: true,
  frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
};

const SECTIONS = [
  "opening_analysis",
  "processing_narrative",
  "record_echo",
  "scope_notes",
  "necessity_analysis",
  "harm_analysis",
  "benefits_rationale",
];

console.log("# ITEM 346 — cppa-risk frame set, before/after on a COMPLETE fixture\n");
console.log(`Fixture: \`${CPPA_RISK_GOLDEN[0].id}\` (all required record values present)`);
console.log(`Engine determinations: necessity=\`${determinations.necessity}\`, weighing=\`${determinations.weighing}\`, consequence=\`${determinations.consequence}\`\n`);

let framedAll = "";
for (const section of SECTIONS) {
  const after = renderSectionFromFrames(approved, section, { values, contract: "cppa-risk" });
  console.log(`\n## ${section}\n`);
  console.log(
    after.rendered ??
      `(omitted — FILL-OR-OMIT: required slots silent: ${after.missing_required.join(", ")})`,
  );
  if (after.rendered) framedAll += "\n" + after.rendered;
  console.log(
    `\n_slots: cites=[${after.cites_filled.join(", ")}] legal=[${after.legal_filled.join(", ")}] conclusions=[${after.conclusions_filled.join(", ")}]_`,
  );
}

// ── CONTENT-COVERAGE CHECK (CEO ruling: no flattening) ────────────────
const atoms = collectCoverageAtoms({ analytics });
const report = checkCoverage(atoms, framedAll, {
  clauseFor: (k) => resolveEngineConclusion("cppa-risk", k),
});
console.log(`\n\n## CONTENT-COVERAGE CHECK\n`);
console.log(`composer atoms: ${report.total} | carried into framed render: ${report.covered} | dropped: ${report.findings.length}`);
console.log(`RESULT: ${report.ok ? "PASS — nothing dropped" : "FAIL"}`);
for (const f of report.findings) console.log(`  DROPPED ${f.atom.kind} @ ${f.atom.path}: ${f.atom.value}`);
if (!report.ok) Deno.exit(1);
