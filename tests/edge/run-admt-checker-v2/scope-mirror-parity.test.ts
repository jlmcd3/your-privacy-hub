// ADMT master review (2026-09-15, F01 / F06) — MIRROR PARITY.
//
// The intake page resolves scope and the opt-out path through frontend
// mirrors (src/lib/admtScopeMirror.ts, src/lib/admtOptOutPath.ts). This test
// runs the engine's own resolvers and the mirrors over the same matrix of
// records and fails on any divergence, so the preliminary banner, the
// optional-step rule, the review screen and the report can never disagree
// about scope again.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeOptOutPath, computeScope } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { ADMT_HOUSING_DOMAIN, ADMT_NONE_DOMAIN, ENGINE_STATE_FOR, resolveAdmtScope } from "../../../src/lib/admtScopeMirror.ts";
import { resolveAdmtOptOutPath } from "../../../src/lib/admtOptOutPath.ts";

const YES_HR = "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision";
const PARTIAL_HR = "Partial — reviewer sees the output but cannot override it";
const NO_HR = "No — fully automated, no human review";
const UNSURE_HR = "Not applicable / unsure";
const FIN = "Financial or lending services (credit decisions, loans, accounts)";
const HIRE = "Hiring or admission decisions";

type Rec = { decision_domains: string[]; human_review: string; admt_detail: Record<string, string> };

const DOMAIN_SETS: string[][] = [
  [], [FIN], [HIRE, FIN], [ADMT_NONE_DOMAIN], [ADMT_NONE_DOMAIN, FIN], [ADMT_HOUSING_DOMAIN], [ADMT_HOUSING_DOMAIN, FIN],
];
const HUMAN: string[] = ["", YES_HR, PARTIAL_HR, NO_HR, UNSURE_HR];
const DETAILS: Record<string, string>[] = [
  {},
  { housing_decision_basis: "Yes — based solely on availability or vacancy, or on receipt of payment" },
  { housing_decision_basis: "No — other factors are considered" },
  { solely_advertising: "Yes — solely advertising" },
  { solely_advertising: "No" },
  { hi_reviewer_present: "No — fully automated" },
  { hi_reviewer_present: "Sometimes / on a subset" },
  { hi_reviewer_present: "Yes — on every decision", hi_stage: "After the decision (review of completed decisions)" },
  { hi_reviewer_present: "Yes — on every decision", hi_stage: "Appeal only" },
  { hi_reviewer_present: "Yes — on every decision", hi_stage: "Before the decision is issued", hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "Yes" },
  { hi_reviewer_present: "Yes — on every decision", hi_stage: "Before the decision is issued", hi_trained: "No" },
  { hi_authority_override: "No" },
  { solely_advertising: "Yes — solely advertising", housing_decision_basis: "Yes — based solely on availability or vacancy, or on receipt of payment" },
];

function* matrix(): Generator<Rec> {
  for (const decision_domains of DOMAIN_SETS) for (const human_review of HUMAN) for (const admt_detail of DETAILS) {
    yield { decision_domains, human_review, admt_detail };
  }
}

Deno.test("scope mirror — agrees with the engine's computeScope on every record of the matrix", () => {
  let n = 0;
  for (const rec of matrix()) {
    const engine = computeScope(rec as unknown as Record<string, unknown>);
    const mirror = resolveAdmtScope({ decisionDomains: rec.decision_domains, humanReview: rec.human_review, detail: rec.admt_detail });
    assertEquals(ENGINE_STATE_FOR[mirror.state], engine.scopeState, JSON.stringify(rec));
    assertEquals(mirror.categoricalNone, engine.categoricalNone, `categoricalNone ${JSON.stringify(rec)}`);
    assertEquals(mirror.housingExcluded, engine.housingExcluded, `housingExcluded ${JSON.stringify(rec)}`);
    n++;
  }
  assertEquals(n, DOMAIN_SETS.length * HUMAN.length * DETAILS.length);
});

Deno.test("scope mirror — the four states are all reachable and a blank record is NOT_YET_ANSWERED, never a negative", () => {
  const seen = new Set<string>();
  for (const rec of matrix()) seen.add(resolveAdmtScope({ decisionDomains: rec.decision_domains, humanReview: rec.human_review, detail: rec.admt_detail }).state);
  assertEquals([...seen].sort(), ["INCONSISTENT_RECORD", "IN_SCOPE", "NOT_YET_ANSWERED", "OUT_OF_SCOPE"]);
  const blank = resolveAdmtScope({ decisionDomains: [], humanReview: "", detail: {} });
  assertEquals(blank.state, "NOT_YET_ANSWERED");
  assertEquals(blank.dutiesMayNotAttach, false);
  assertEquals(blank.missing.length > 0, true);
});

Deno.test("scope mirror — partial review coverage is a condition beside OUT_OF_SCOPE, not a state change (F01/F03)", () => {
  const r = resolveAdmtScope({ decisionDomains: [FIN], humanReview: YES_HR, detail: { hi_reviewer_present: "Sometimes / on a subset" } });
  assertEquals(r.state, "OUT_OF_SCOPE");
  assertEquals(r.conditions.length, 1);
  const engine = computeScope({ decision_domains: [FIN], human_review: YES_HR, admt_detail: { hi_reviewer_present: "Sometimes / on a subset" } });
  assertEquals(engine.scopeState, "OUT_OF_SCOPE");
  assertEquals(engine.findings.some((f) => f.criterion === "Review coverage"), true, "engine states the partial-coverage condition");
});

Deno.test("opt-out path mirror — agrees with computeOptOutPath, and unrecognised text is OTHER_UNRESOLVED", () => {
  const values = [
    "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
    "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
    "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination",
    "No exception — we provide a full opt-out right",
    "Other — my situation differs (describe)",
    "Other: we are still deciding",
    "",
    "Human appeal",
  ];
  for (const v of values) {
    assertEquals(resolveAdmtOptOutPath(v), computeOptOutPath({ opt_out_exception: v }), v);
  }
  assertEquals(resolveAdmtOptOutPath("Other — my situation differs (describe)"), "OTHER_UNRESOLVED");
});
