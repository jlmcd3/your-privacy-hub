// ITEM 380 — RECORD-COMPLETE FRAMING. The affirmative claim may render ONLY
// when the deterministic truth gate holds. These tests exercise BOTH
// directions of the gate: the perfect fixtures pass it, the degraded goldens
// fail it and keep today's draft framing byte-identical.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DPIA_PERFECT, DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import {
  actionPlanBannerText,
  affirmativeParagraph,
  classifyOpenItem,
  classifyPlaceholders,
  computeRecordComplete,
  decideBanner,
  DRAFT_BANNER_HTML,
  emptyRequiredKeys,
  RECORD_COMPLETE_VERSION,
  renderBannerHtml,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { buildDeterminationBlock } from "../../../supabase/functions/_shared/report-exhibits/determination.ts";

const CLEAN_COVERAGE = { crashed: false, counts: { orphans: 0 } } as never;
const CLEAN_CSC = { crashed: false, violations: [] as unknown[] } as never;

const byId = (list: readonly { id: string }[], id: string) => {
  const hit = list.find((c) => c.id === id);
  assert(hit, `fixture ${id} must exist`);
  return hit as { id: string; intake: Record<string, unknown> };
};

// ---------------------------------------------------------------------------
// (a) CONTRACT COMPLETENESS ON THE PERFECT FIXTURES
// ---------------------------------------------------------------------------

for (const id of ["dpia-perfect-eu-complete", "dpia-perfect-uk-complete"]) {
  Deno.test(`truth gate: ${id} is record-complete`, () => {
    const fx = byId(DPIA_PERFECT as never, id);
    const t = computeRecordComplete({
      product: "dpia",
      contract: dpiaFrameworkContract,
      intake: fx.intake,
      coverage: CLEAN_COVERAGE,
      csc: CLEAN_CSC,
    });
    if (!t.value) console.error(id, "FAILED:", t.failed_conditions, t.empty_required_keys);
    assertEquals(t.failed_conditions, []);
    assertEquals(t.value, true);
    assertEquals(t.version, RECORD_COMPLETE_VERSION);
  });
}

Deno.test("truth gate: risk-perfect-complete is record-complete", () => {
  const fx = byId(CPPA_RISK_GOLDEN as never, "risk-perfect-complete");
  const t = computeRecordComplete({
    product: "cppa-risk",
    contract: cppaRiskContract,
    intake: fx.intake,
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
    recordNeedsMissingData: 0,
  });
  if (!t.value) console.error("risk FAILED:", t.failed_conditions, t.empty_required_keys);
  assertEquals(t.failed_conditions, []);
  assertEquals(t.value, true);
});

// ---------------------------------------------------------------------------
// EACH FAILED CONDITION, ONE AT A TIME
// ---------------------------------------------------------------------------

Deno.test("truth gate: every condition can fail independently", () => {
  const fx = byId(DPIA_PERFECT as never, "dpia-perfect-eu-complete");
  const base = {
    product: "dpia" as const,
    contract: dpiaFrameworkContract,
    intake: fx.intake,
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
  };

  const gutted = { ...(fx.intake as Record<string, unknown>) };
  const firstAlways = dpiaFrameworkContract.fields.find((f) => f.required === "always")!;
  gutted[firstAlways.key.split(".")[0].replace(/\[\]$/, "")] = "";
  assert(
    computeRecordComplete({ ...base, intake: gutted }).failed_conditions.includes("contract_incomplete"),
  );

  assert(
    computeRecordComplete({
      ...base,
      coverage: { crashed: false, counts: { orphans: 3 } } as never,
    }).failed_conditions.includes("coverage_orphans"),
  );

  assert(
    computeRecordComplete({
      ...base,
      csc: { crashed: false, violations: [{ check_id: "c2_absence_claim_vs_record" }] } as never,
    }).failed_conditions.includes("csc_false_absence"),
  );

  const riskFx = byId(CPPA_RISK_GOLDEN as never, "risk-perfect-complete");
  assert(
    computeRecordComplete({
      product: "cppa-risk",
      contract: cppaRiskContract,
      intake: riskFx.intake,
      coverage: CLEAN_COVERAGE,
      csc: CLEAN_CSC,
      recordNeedsMissingData: 2,
    }).failed_conditions.includes("risk_record_needs_missing_data"),
  );

  // Absent telemetry is NOT evidence of completeness.
  assertEquals(computeRecordComplete({ ...base, coverage: null, csc: null }).value, false);
});

Deno.test("truth gate: degraded goldens are NOT record-complete", () => {
  const dpia = byId(DPIA_GOLDEN as never, "dpia-eu-health-tuning");
  const t1 = computeRecordComplete({
    product: "dpia",
    contract: dpiaFrameworkContract,
    intake: dpia.intake,
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
  });
  assertEquals(t1.value, false);

  const risk = byId(CPPA_RISK_GOLDEN as never, "risk-adtech-sell-tuning");
  const t2 = computeRecordComplete({
    product: "cppa-risk",
    contract: cppaRiskContract,
    intake: risk.intake,
    coverage: CLEAN_COVERAGE,
    csc: CLEAN_CSC,
    recordNeedsMissingData: 0,
  });
  assertEquals(t2.value, false);
});

// ---------------------------------------------------------------------------
// CLASSIFICATION RULE
// ---------------------------------------------------------------------------

Deno.test("classification: a record-gap and an action-item are separated", () => {
  const intake = { data_retention_period: "", dpia_approved_by_name: "R. Okonjo" };

  const gap = classifyOpenItem(
    "State the retention period for the occupational-health records (data_retention_period).",
    intake,
  );
  assertEquals(gap.klass, "record_gap");

  const action = classifyOpenItem(
    "Confirm, before processing begins, that the quarterly permission recertification has been scheduled.",
    intake,
  );
  assertEquals(action.klass, "action_item");
  assertEquals(action.precondition, true);

  const later = classifyOpenItem(
    "Re-score the residual risk after the first post-launch audit.",
    intake,
  );
  assertEquals(later.klass, "action_item");
  assertEquals(later.precondition, false);
});

Deno.test("classification: counts roll up over the document", () => {
  const c = classifyPlaceholders(
    {
      information_needed: [
        "Confirm, prior to launch, that the DPO has signed the processing register entry.",
        "Schedule the annual penetration test after launch.",
      ],
    },
    { dpia_approved_by_name: "R. Okonjo" },
  );
  assertEquals(c.counts.record_gap, 0);
  assertEquals(c.counts.action_item, 2);
  assertEquals(c.counts.preconditions, 1);
});

// ---------------------------------------------------------------------------
// BANNER — three states
// ---------------------------------------------------------------------------

Deno.test("banner: state (i) is byte-identical to today's draft banner", () => {
  const d = decideBanner(false, { counts: { record_gap: 3, action_item: 1, preconditions: 0 } }, true);
  assertEquals(d.state, "draft_incomplete");
  assertEquals(renderBannerHtml(d), DRAFT_BANNER_HTML);
});

Deno.test("banner: state (ii) is neutral, carries N/M, and never says DO NOT SIGN", () => {
  const d = decideBanner(true, { counts: { record_gap: 0, action_item: 4, preconditions: 2 } }, false);
  assertEquals(d.state, "action_plan");
  const html = renderBannerHtml(d);
  assert(html.includes(actionPlanBannerText(4, 2)));
  assert(!/DO NOT SIGN/i.test(html));
  assert(!html.includes("#7c1a1a"), "the action-plan banner is not the red draft banner");
});

Deno.test("banner: state (iii) renders nothing", () => {
  const d = decideBanner(true, { counts: { record_gap: 0, action_item: 0, preconditions: 0 } }, false);
  assertEquals(d.state, "none");
  assertEquals(renderBannerHtml(d), "");
});

// ---------------------------------------------------------------------------
// DETERMINATION — both directions of the gate
// ---------------------------------------------------------------------------

function docWithAsks(asks: unknown[]): Record<string, unknown> {
  return {
    dpia_metadata: { processing_activity_name: "Occupational-health triage" },
    section_0_overview: {},
    section_6_conclusion: { decision: "Proceed subject to the measures recorded." },
    information_needed: asks,
    has_unresolved_placeholders: false,
  };
}

Deno.test("determination: record-complete replaces the draft framing", () => {
  const block = buildDeterminationBlock({
    report: docWithAsks(["Confirm the penetration test result before go-live."]),
    intake: byId(DPIA_PERFECT as never, "dpia-perfect-eu-complete").intake,
    recordComplete: true,
    actionItems: 3,
    preconditions: 1,
  })!;
  const joined = block.paragraphs.join(" ");
  assert(joined.includes(affirmativeParagraph(3, 1)));
  assert(!/is a draft|no one can sign it|foundations are missing/i.test(joined));
  assertEquals(block.missing_foundations, []);
  assertEquals(block.record_complete, true);
});

Deno.test("determination: N=0 ends the affirmative paragraph after 'answered.'", () => {
  const block = buildDeterminationBlock({
    report: docWithAsks([]),
    intake: {},
    recordComplete: true,
    actionItems: 0,
    preconditions: 0,
  })!;
  assert(block.paragraphs.some((p) => p.endsWith("every question the intake asks has been answered.")));
  assert(!block.paragraphs.some((p) => /action plan of/i.test(p)));
});

Deno.test("determination: NOT record-complete keeps today's draft framing", () => {
  const report = docWithAsks(["State the retention period for the health records (data_retention_period)."]);
  report.has_unresolved_placeholders = true;
  const before = buildDeterminationBlock({ report, intake: { data_retention_period: "" } })!;
  const after = buildDeterminationBlock({
    report,
    intake: { data_retention_period: "" },
    recordComplete: false,
    actionItems: 5,
    preconditions: 2,
  })!;
  assertEquals(after.paragraphs, before.paragraphs);
  assert(after.paragraphs.some((p) => /draft/i.test(p)));
});

Deno.test("determination: a generic ask against a supplied key is never a missing foundation", () => {
  const intake = { data_retention_period: "24 months from case closure" };
  const block = buildDeterminationBlock({
    report: docWithAsks([
      "Further detail on data_retention_period would assist the reviewer.",
    ]),
    intake,
  })!;
  assert((block.ask_against_supplied_key ?? 0) >= 1);
  assert(
    !block.missing_foundations.some((f) => /further detail the record does not supply/i.test(f)),
    "the generic category may not be enumerated against a supplied key",
  );
});

// ---------------------------------------------------------------------------
// emptyRequiredKeys — triggered conditionals
// ---------------------------------------------------------------------------

Deno.test("emptyRequiredKeys reports always-fields the record leaves empty", () => {
  const empties = emptyRequiredKeys(dpiaFrameworkContract, {});
  assert(empties.length > 0);
});
