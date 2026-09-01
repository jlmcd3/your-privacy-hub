// DOC 127 PHASE B (2026-09-01) — presentation-batch guards: the engine table
// shapes ruled in doc 127 §§10/11/15, and source-level pins on the two
// renderers' Risk-gated presentation system (§§5-9, 12-13, 28-29). The
// renderer pins are source asserts (the edge-function entry cannot be
// imported without serving), following the established w18 pattern.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

const REPORT: Bag = {
  scope_and_triggers: {
    narrative: [
      "Engaged — Section 7150(b)(1) (selling or sharing): the Company sells consumer profiles to ad networks.",
      "Uncertain — whether ADMT is used for a significant decision.",
    ],
  },
};

const INTAKE: Bag = {
  processing_status: "Ongoing",
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
  a5_harm_pathways: [{
    harm: "(E) Economic harms",
    likelihood: "Possible",
    severity: "Moderate",
    data_involved: "Payment history",
    actor: "Ad networks",
    cause: "Price steering",
  }],
};

Deno.test("doc127 §10 — the exec trigger digest is two columns with the status word leading the Determination cell", () => {
  const r = runRiskFactorEngine(INTAKE as never, REPORT as never, "2026-09-01");
  const trig = r.tables["executive_summary:3"];
  assert(trig, "trigger digest missing");
  assertEquals([...trig.columns], ["Trigger", "Determination"]);
  const engaged = trig.rows.find((row) => row[1].startsWith("Engaged — "));
  assert(engaged, "engaged row lost its status lead");
  // The basis BYTES are carried verbatim after the merged status word.
  assert(
    engaged[1].includes("the Company sells consumer profiles to ad networks"),
    "basis bytes not carried into the merged cell",
  );
  assert(
    trig.rows.some((row) => row[1].startsWith("Unresolved — ")),
    "unresolved row lost its status lead",
  );
});

Deno.test("doc127 §11 — the exec ledger columns are Risk / Safeguard Status / Residual Risk", () => {
  const r = runRiskFactorEngine(INTAKE as never, REPORT as never, "2026-09-01");
  const exec = r.tables["executive_summary:6"];
  assert(exec, "exec ledger missing");
  assertEquals([...exec.columns], ["Risk", "Safeguard Status", "Residual Risk"]);
});

Deno.test("doc127 §15 — balance cells compress to Category — weight; the evidence stays in § 3.F", () => {
  const r = runRiskFactorEngine(INTAKE as never, REPORT as never, "2026-09-01");
  const balance = r.tables["iv_determination:8"];
  assert(balance, "balance summary missing");
  const flat = balance.rows.map((row) => row.join(" | ")).join("\n");
  assert(flat.includes("Consumer benefit — material"), "compressed benefit cell missing");
  assert(!flat.includes("Support tickets"), "evidence sentence still duplicated in the balance table");
  assert(
    (r.blocks["iii_analysis:20"] ?? "").includes("Support tickets about lost shipments fell 30%"),
    "§ 3.F no longer carries the supporting fact",
  );
});

// ── Renderer source pins (w18 pattern: the entrypoints cannot be imported) ──

const PDF_SRC = await Deno.readTextFile("supabase/functions/generate-report-pdf/index.ts");
const WEB_SRC = await Deno.readTextFile("src/components/reports/SkeletonDocumentView.tsx");
const PAGE_SRC = await Deno.readTextFile("src/pages/CPPARiskAssessmentResult.tsx");

Deno.test("doc127 §29 — the Risk render path is product-gated in both renderers and at both call sites", () => {
  assert(PDF_SRC.includes(`"CPPA Privacy Risk Assessment", "cppa-risk"`), "PDF risk call site lacks the product string");
  assert(PDF_SRC.includes(`opts?.product === "cppa-risk"`), "PDF renderer lacks the riskMode gate");
  assert(WEB_SRC.includes(`product === "cppa-risk"`), "web twin lacks the riskMode gate");
  assert(PAGE_SRC.includes(`product="cppa-risk"`), "Risk result page does not pass the product string");
});

Deno.test("doc127 §5/§6 — both renderers carry the marker/heading split, marker never underlined", () => {
  assert(PDF_SRC.includes("function riskSplitLeadHtml"), "PDF marker split missing");
  assert(WEB_SRC.includes("function riskSplitLead"), "web marker split missing");
  // The marker renders as a bare <strong> with NO underline declaration.
  assert(
    /min-width:1\.65em;">\$\{m\[1\]\}<\/strong>/.test(PDF_SRC),
    "PDF marker span shape changed — verify the marker is not underlined",
  );
});

Deno.test("doc127 §28 — table styling is surface-keyed, never matched on visible cell text", () => {
  assert(PDF_SRC.includes(`surface === "cover_summary"`), "profile panel not keyed on surface");
  assert(PDF_SRC.includes(`surface === "exec_status_panel"`), "result card not keyed on surface");
  assert(WEB_SRC.includes(`table.surface === "cover_summary"`), "web profile panel not keyed on surface");
  assert(!PDF_SRC.includes(`includes("Prepared for")`), "brittle visible-text table detection present");
});

Deno.test("doc127 §13 — the adverse reassessment head and callout are synced across both renderers", () => {
  for (const src of [PDF_SRC, WEB_SRC]) {
    assert(src.includes("(?:Conditions for Reassessment"), "H3 reassessment alternation missing");
    assert(
      src.includes("^The Activity should not proceed in its present form\\."),
      "adverse-conditions amber-callout trigger missing",
    );
  }
});

Deno.test("doc127 §9/§12 — methodology strip and determination card exist in both renderers", () => {
  assert(PDF_SRC.includes("risk-step"), "PDF methodology strip missing");
  assert(PDF_SRC.includes("risk-determination-card"), "PDF determination card missing");
  assert(WEB_SRC.includes("Determination"), "web determination card missing");
  assert(/Step \(\\d\+\) — |\^Step \\d\+ — /.test(WEB_SRC), "web methodology strip trigger missing");
});
