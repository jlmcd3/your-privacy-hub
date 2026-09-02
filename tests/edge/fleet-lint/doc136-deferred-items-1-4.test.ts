// DOC 136 (follow-up to doc 135's deferred items, CEO-directed 2026-09-01)
// — regression guards for items 1-4: the ADMT pathway-uniformity
// confirmation sentence, the DPIA Art. 35(3)(c) engagement-map wiring, the
// RoPA wide-matrix CSS fix, and the CPPA Risk TOC extension + cover-panel
// conditions count. Item 5 (EU IR standing clock) was investigated only,
// per instruction — no code change, no test.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type Bag = Record<string, unknown>;

// ── ADMT — pathway-uniformity confirmation sentence ─────────────────────────

import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";

Deno.test("doc136 — ADMT: pathway-dependent condition asks for pathway-uniformity confirmation", () => {
  const base = CPPA_ADMT_GOLDEN.find((g) => g.id === "admt-hr-significant-tuning")!.intake as Bag;
  const pathwayIntake: Bag = {
    ...base,
    system_description:
      "TalentRank scores résumés against role profiles; scores below 40 are automatically declined and scores above 85 are automatically approved, with human review only in between.",
  };
  const computed = computeAdmtV2(pathwayIntake);
  const scopeFinding = computed.scope.findings.find((f) => f.criterion === "Automated decision pathways");
  assert(scopeFinding, "pathway-dependent finding missing");
  assert(scopeFinding!.action_text.includes("Either extend qualifying human review"), "original choice-of-remedy sentence must remain");
  assert(
    scopeFinding!.action_text.includes(
      "the Company should confirm that each of these processes operates identically there as it does where a human reviews the decision.",
    ),
    "pathway-uniformity confirmation sentence missing",
  );
  assert(!/notice_delivery|opt_out_exception|access_submission_methods/.test(scopeFinding!.action_text), "must not quote raw intake field names");
});

// ── DPIA — Art. 35(3)(c) engagement-map wiring ──────────────────────────────

import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDpiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";

function triggerRow(document: ReturnType<typeof assembleDpiaSkeletonDocument>["document"]): string | undefined {
  const appendix = document.sections.find((s) => s.id === "table_of_authorities");
  const matrix = appendix?.paragraphs.find((p) => p.kind === "table")?.table;
  return matrix?.rows.find((r) => r[0] === "DPIA requirement / high-risk trigger")?.[1];
}

Deno.test("doc136 — DPIA: Appendix A surfaces the Art. 35(3)(c) fact-walk when imagery_capture is answered", () => {
  const intake: Bag = {
    organization_name: "North Gold GmbH",
    processing_activity_name: "Drone-based magnetic and visual surveys",
    description: "Fixed-wing and multirotor drones capture magnetometry and visual imagery over prospecting permits.",
    imagery_capture: "Imagery or video in which identifiable individuals appear incidentally",
    imagery_capture_spaces: "Both",
  };
  const engagement_map = buildDpiaEngagementMap(intake, {});
  const report: Bag = { engagement_map };
  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const cell = triggerRow(document);
  assert(cell, "trigger row missing entirely");
  assert(cell!.includes("Article 35(3)(c) requires an assessment"), "fact-walk lead sentence missing from Appendix A");
  assert(cell!.includes("incidental"), "incidental-branch rationale missing");
});

Deno.test("doc136 — DPIA: legacy records (no imagery_capture answered) are unaffected, byte-identical trigger cell", () => {
  const intake: Bag = {
    organization_name: "Northwind Clinics Ltd",
    reasons_to_conduct: ["large_scale_special_category"],
  };
  const { document } = assembleDpiaSkeletonDocument({}, intake);
  const cell = triggerRow(document);
  if (cell) assert(!cell.includes("35(3)(c)"), "legacy path must not gain new Art. 35(3)(c) text");
});

// ── RoPA — wide matrix uses the bordered "grid" class + header repeat ───────

Deno.test("doc136 — RoPA: the Art. 30(1)(a)-(g) matrix uses the grid class, not the fixed-width kv class", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-ropa-document/index.ts", import.meta.url),
  );
  assert(src.includes('<table class="grid"><thead><tr>${registerTableAoa'), "matrix table not switched to the grid class");
  assert(src.includes("table.grid thead { display: table-header-group; }"), "header-repeat CSS missing for table.grid");
  assert(!src.includes("wide-landscape") && !/@page\s+\w*landscape/.test(src), "landscape orientation must not be reintroduced (doc 66 Rule 10)");
});

// ── CPPA Risk — TOC extension + conditions-count cover row ──────────────────

import { deriveExecStatusPanel } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

function panel(over: Partial<Bag> = {}): Parameters<typeof deriveExecStatusPanel>[0] {
  return {
    assessment_required: true,
    inherent: "High",
    residual: "High",
    disposition: "do not proceed - remediable",
    disposition_label: "Do Not Proceed",
    path_forward: "To continue with the processing, the Company should satisfy the Conditions for Reassessment in § 4.D.",
    has_unassessed: false,
    conditions_count: 0,
    ...over,
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test("doc136 — CPPA Risk: cover panel shows Number of conditions only when there are conditions (no-padding law)", () => {
  const withConditions = deriveExecStatusPanel(panel({ conditions_count: 2 }));
  assert(withConditions);
  assertEquals(withConditions.rows.find((r) => r[0] === "Number of conditions")?.[1], "2");

  const withoutConditions = deriveExecStatusPanel(panel({ conditions_count: 0 }));
  assert(withoutConditions);
  assert(!withoutConditions.rows.some((r) => r[0] === "Number of conditions"), "must not render a zero count");
});

Deno.test("doc136 — CPPA Risk: TOC gate now includes cppa-risk alongside cppa-cyber, page numbers still not attempted", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-report-pdf/index.ts", import.meta.url),
  );
  assert(src.includes('(product === "cppa-cyber" || product === "cppa-risk")'), "TOC gate not extended to cppa-risk");
});
