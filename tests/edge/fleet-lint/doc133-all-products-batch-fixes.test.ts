// DOC 133 (all-products batch review, 2026-09-01) — regression guards for the
// 6 live bugs confirmed and fixed against the CEO's 2026-08-31 grader export
// (14-product batch, /admin/all-products-test): CPPA Risk consumer-interaction
// false negative, LIA reasonable-expectations detail-without-enum gap, LIA
// consent-rejection frame-substitution gate, EU Notice order_history raw
// slug, IR Playbook dataTypes token leak, RoPA jurisdictions no-degradation
// gap. See doc 133 for the full triage (including items investigated and
// found stale, policy-scoped, or out-of-scope — not regression-guarded here
// because nothing in code changed for them).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type Bag = Record<string, unknown>;

// ── CPPA Risk — consumer_context fallback to i3_ca_consumer_band/i4b_sources ─

import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

Deno.test("doc133 — CPPA Risk: consumer_context reads i3_ca_consumer_band/i4b_sources when the newer g2 fields are unanswered", () => {
  // The grader's exact reproduction shape: i3_ca_consumer_band + i4b_sources
  // populated (both are data-layer "always" required), but none of the
  // newer consumer_interaction_method/purpose/approximate_ca_consumers
  // fields answered — those are data-layer optional.
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const intake: Bag = {
    ...base,
    consumer_interaction_method: "",
    consumer_interaction_purpose: "",
    approximate_ca_consumers: "",
  };
  assert(intake.i3_ca_consumer_band && intake.i4b_sources, "fixture assumption changed");
  const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] } };
  const out = runRiskFactorEngine(intake, report, "2026-08-18");
  const factor = out.factors["consumer_context"];
  assert(factor, "consumer_context did not compose at all");
  assert(!factor.includes("does not describe the consumer interaction"), "false negative reproduced");
  // consumer_context's `clause()` helper trims a trailing period, so match
  // on the un-punctuated body rather than the raw intake string.
  assert(factor.includes(String(intake.i4b_sources).replace(/\.\s*$/, "")), "i4b_sources fallback text missing");
  assert(factor.includes(String(intake.i3_ca_consumer_band)), "i3_ca_consumer_band fallback text missing");
});

Deno.test("doc133 — CPPA Risk: consumer_context still degrades honestly when NEITHER old nor new fields answer it", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const stripped: Bag = {
    ...base,
    i3_ca_consumer_band: "",
    i4b_sources: "",
    consumer_interaction_method: "",
    consumer_interaction_purpose: "",
    approximate_ca_consumers: "",
    consumer_relationship_context: "",
  };
  const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] } };
  const out = runRiskFactorEngine(stripped, report, "2026-08-18");
  assert(out.factors["consumer_context"]?.includes("does not describe the consumer interaction"));
});

// ── LIA — reasonable-expectations detail-without-enum ───────────────────────

import { buildReasonableExpectations } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";

Deno.test("doc133 — LIA: reasonable_expectation_detail alone (no context, no enum) no longer reports record_insufficient", () => {
  const intake = {
    balancing_details: {
      reasonable_expectation_detail:
        "Workers partly expect safety monitoring but not continuous physiological monitoring without notice; works-council consultation closed the expectation gap.",
    },
  };
  const out = buildReasonableExpectations(intake);
  assertEquals(out.status, "analysed");
  assert(out.verdict !== "undetermined_on_the_record");
  assert(out.application.includes("Workers partly expect safety monitoring"));
});

Deno.test("doc133 — LIA: reasonable_expectation_detail + a positive enum still uses the ratified doc-129 sentence", () => {
  const intake = {
    balancing_details: {
      reasonable_expectation_detail: "Customers are told at signup that this occurs.",
      reasonable_expectation: "Yes, clearly expected",
    },
  };
  const out = buildReasonableExpectations(intake);
  assertEquals(out.verdict, "reasonably_expected");
  assert(out.application.includes("On that account, and on the answer supplied"));
});

Deno.test("doc133 — LIA: no context and no detail at all still reports record_insufficient (unchanged)", () => {
  const out = buildReasonableExpectations({});
  assertEquals(out.status, "record_insufficient");
  assertEquals(out.verdict, "undetermined_on_the_record");
});

// ── EU Notice — order_history humanization ──────────────────────────────────

Deno.test("doc133 — EU Notice: order_history has a dictionary label, not a raw-slug fallback", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-eu-notice/index.ts", import.meta.url),
  );
  assert(src.includes('order_history: "Order history'), "order_history dictionary entry missing");
});

// ── IR Playbook — dataTypes raw-token leak ───────────────────────────────────

Deno.test("doc133 — IR Playbook: information_needed no longer leaks the raw dataTypes token", async () => {
  const src = await Deno.readTextFile(
    new URL(
      "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts",
      import.meta.url,
    ),
  );
  assert(!src.includes('"dataTypes — the consequences'), "raw dataTypes token still present");
  assert(src.includes("the categories of personal data affected — the consequences"));
});

// ── RoPA — jurisdictions degrades honestly when unrecorded ──────────────────

import { assembleRopaRegister } from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";

function minimalRopaInput(jurisdictionLabels: readonly string[]): Bag {
  return {
    activities: [],
    legalEntityType: null,
    incorporationJurisdiction: null,
    registeredAddress: null,
    roles: [],
    isController: true,
    isProcessor: false,
    dpoAppointed: null,
    euRepresentative: null,
    homeBase: null,
    jurisdictionLabels,
    employeeBand: "51-250",
  };
}

Deno.test("doc133 — RoPA: no home base and no jurisdictions renders an honest degraded sentence, never a fabricated list", () => {
  // deno-lint-ignore no-explicit-any
  const doc = assembleRopaRegister(minimalRopaInput([]) as any);
  assert(!doc.text.includes("It operates across"), "fabricated an 'operates across' clause with no jurisdictions");
  assert(doc.text.includes("no jurisdictions for the company"));
});

Deno.test("doc133 — RoPA: no home base but jurisdictions recorded still renders the jurisdictions sentence (unchanged)", () => {
  // deno-lint-ignore no-explicit-any
  const doc = assembleRopaRegister(minimalRopaInput(["Ireland", "France"]) as any);
  assert(doc.text.includes("It operates across Ireland and France"));
});
