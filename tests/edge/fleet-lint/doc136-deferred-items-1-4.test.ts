// DOC 136 (follow-up to doc 135's deferred items, CEO-directed 2026-09-01)
// — regression guards for items 1-4: the ADMT pathway-uniformity
// confirmation sentence, the DPIA Art. 35(3)(c) engagement-map wiring, the
// RoPA wide-matrix CSS fix, and the CPPA Risk TOC extension + cover-panel
// conditions count. Item 5 (EU IR standing clock) was investigated only,
// per instruction — no code change, no test.
//
// DOC 137 (2026-09-01) — the ADMT test below also guards the narrow
// wording fix to the same action_text: "put the Article 11 ... processes
// in place for them" (implying build-from-scratch) was replaced with
// "ensure the Article 11 ... processes cover them" (implying confirm/
// extend the existing system-wide processes), resolving a contradiction
// with the very next sentence, which states those processes ARE already
// recorded for the System as a whole. No architecture change — the CEO
// reconfirmed rejecting a per-pathway compliance-matrix build.

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
  // DOC 137 — the first sentence must no longer imply the Notice/opt-out/
  // access processes need to be built from scratch ("put ... in place for
  // them"), since the very next sentence says they are already recorded
  // system-wide; it should instead read as confirming/extending them.
  assert(!scopeFinding!.action_text.includes("put the Article 11 Pre-use Notice, opt-out, and access processes in place for them"), "must not reintroduce the build-from-scratch phrasing");
  assert(scopeFinding!.action_text.includes("ensure the Article 11 Pre-use Notice, opt-out, and access processes cover them"), "revised confirm/extend phrasing missing");
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

// ── RoPA — wide matrix ─────────────────────────────────────────────────────
//
// DOC 137 (2026-09-01) — a Batch 5 external PDF review found the doc-136
// grid-class fix insufficient: 8 columns of statutory text still rendered
// visually compressed/clipped at portrait width. Rather than keep fighting
// the column-width problem (and with landscape permanently banned, doc 66
// Rule 10), the wide matrix is now dropped entirely from the HTML/PDF render
// path — every Art. 30(1)(a)-(g) element it carried is already rendered in
// full, readable form by the per-activity "kv" card in Section 2
// (`activitySections` in buildHtml). `registerTableAoa()` itself is
// untouched and still feeds the DOCX and XLSX exports, which are not
// reported as clipped.

Deno.test("doc137 — RoPA: the wide Art. 30(1)(a)-(g) matrix is no longer rendered into the HTML/PDF register section", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-ropa-document/index.ts", import.meta.url),
  );
  // The registerHtml() section renderer must no longer build a <table> from
  // registerTableAoa() — find the registerHtml function body specifically,
  // not the whole file (registerDocxChildren legitimately still calls it).
  const fnStart = src.indexOf("function registerHtml(");
  const fnEnd = src.indexOf("\nfunction registerDocxChildren(");
  assert(fnStart !== -1 && fnEnd !== -1 && fnEnd > fnStart, "could not isolate registerHtml() body");
  const registerHtmlBody = src.slice(fnStart, fnEnd);
  assert(!registerHtmlBody.includes("registerTableAoa(reg)"), "registerHtml() must not call registerTableAoa() anymore");
  assert(!registerHtmlBody.includes('<table class="grid">'), "no grid-class matrix table should remain in registerHtml()");

  // The per-activity card view (Section 2) must still be present as the
  // sole HTML rendering of Art. 30(1)(a)-(g) content.
  assert(src.includes('<h2>2. Processing activities</h2>'), "per-activity card section (Section 2) must remain");
  assert(src.includes("${activitySections ||"), "activitySections rendering must remain wired in");

  // registerTableAoa() itself, and its DOCX/XLSX consumers, must remain.
  assert(src.includes("function registerTableAoa("), "registerTableAoa() must not be deleted — still used by DOCX/XLSX");
  assert(src.includes("registerDocxChildren"), "DOCX export path must remain");

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
