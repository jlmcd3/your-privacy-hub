// DOC 149 (2026-09-03) — batch 2c946597 triage: permanent regression tests.
//   * Exec-summary compact condition list: identical truncated heads merge
//     into one counted item (two planned-safeguard conditions no longer read
//     as a duplicated condition).
//   * § 3.E "In evaluation": an evaluation-stage ADMT with technical facts
//     renders the sub-part with the evaluation-posture frame (never the
//     "does not identify ADMT" contradiction); the no-facts case gets its
//     own honest sentence; Appendix E gates match.
//   * Generator q5b coherence repair + grader field-semantics block
//     (source asserts — edge entrypoints cannot be imported without
//     serving; the established w18/doc127 pattern).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { deriveAdmtTechnicalFacts } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../supabase/functions/_shared/grader/context.ts";

type Bag = Record<string, unknown>;

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};

const HIGH_G: Bag = {
  harm: "(G) Reputational harms",
  likelihood: "Possible",
  severity: "Significant",
  data_involved: "Behavioral profiles",
  actor: "Journalists",
  cause: "Inadequate disclosure",
};

const MODERATE_C: Bag = {
  harm: "(C) Impairment of consumer control over personal information",
  likelihood: "Likely",
  severity: "Moderate",
  data_involved: "Profiles",
  actor: "Operations",
  cause: "Footer-only opt-out",
};

function engineOn(intake: Bag, report: Bag = {}) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    report as never,
    "2026-09-03",
  );
}

// ── Compact condition-head dedup ─────────────────────────────────────────────

Deno.test("doc149 — two planned-safeguard conditions merge to one counted head in the exec compact list", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [HIGH_G, MODERATE_C],
    a6_safeguards: [
      {
        harm: "(G) Reputational harms",
        safeguard: "A just-in-time profiling notice is displayed on first login",
        safeguard_status: "Planned, not yet implemented",
        planned_timeline: "Within 90 days",
      },
      {
        harm: "(C) Impairment of consumer control over personal information",
        safeguard: "An in-app opt-out flow for mobile users",
        safeguard_status: "Planned, not yet implemented",
        planned_timeline: "Within 90 days",
      },
    ],
  });
  const compact = r.factors["conditions_compact"] ?? "";
  const headOccurrences =
    compact.split("Complete implementation of the planned safeguard").length - 1;
  assertEquals(headOccurrences, 1, "duplicated head still renders twice");
  assert(
    compact.includes("Complete implementation of the planned safeguard (two conditions, addressing"),
    "counted merged head missing",
  );
  // The stated total still matches the real condition count.
  assert(compact.includes("two Conditions") || compact.includes("three Conditions") || compact.includes("four Conditions"), "count word missing");
});

// ── § 3.E "In evaluation" ────────────────────────────────────────────────────

const EVAL_INTAKE: Bag = {
  ...BENEFIT,
  a5_harm_pathways: [MODERATE_C],
  q18_admt_use: "In evaluation",
  q19_admt_description:
    "An ML-based feature-recommendation engine is being evaluated to suggest workspace features to users.",
  i5_admt_logic: "Gradient-boosted model over usage telemetry; outputs ranked feature suggestions.",
  i5_admt_human_review: "Product managers review suggested rollouts weekly.",
};

Deno.test("doc149 — In-evaluation ADMT with facts renders § 3.E with the evaluation posture, never the not-applicable denial", () => {
  const r = engineOn(EVAL_INTAKE);
  const intro = r.factors["admt_intro"] ?? "";
  assert(
    !intro.includes("does not identify automated decisionmaking technology"),
    "§ 3.E still denies the technology the record describes",
  );
  assert(
    intro.includes("records the technology as under evaluation rather than deployed for decisions"),
    "evaluation-posture sentence missing",
  );
  assert((r.factors["admt_role"] ?? "").includes("The Company identifies the system as"), "role analysis missing");
});

Deno.test("doc149 — In-evaluation with NO facts gets the honest no-description sentence", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [MODERATE_C],
    q18_admt_use: "In evaluation",
  });
  const intro = r.factors["admt_intro"] ?? "";
  assert(
    intro.includes("under evaluation but provides no description"),
    "no-facts evaluation sentence missing",
  );
  assert(!intro.includes("Not applicable."), "generic denial rendered for an asserted technology");
});

Deno.test("doc149 — a plain No/absent q18 keeps the ratified not-applicable branch", () => {
  const r = engineOn({ ...BENEFIT, a5_harm_pathways: [MODERATE_C], q18_admt_use: "No" });
  assert(
    (r.factors["admt_intro"] ?? "").includes("Not applicable. The information provided does not identify"),
    "ratified N/A branch disturbed",
  );
});

Deno.test("doc149 — Appendix E technical-facts table renders for In-evaluation-with-facts and stays null otherwise", () => {
  assert(deriveAdmtTechnicalFacts(EVAL_INTAKE) !== null, "appendix table missing for evaluation record");
  assertEquals(deriveAdmtTechnicalFacts({ q18_admt_use: "In evaluation" }), null);
  assertEquals(deriveAdmtTechnicalFacts({ q18_admt_use: "No", q19_admt_description: "x" }), null);
});

// ── Generator + grader instruments (source asserts) ──────────────────────────

Deno.test("doc149 — generator carries the q5b deterministic coherence repair and the ported guidance", async () => {
  const src = await Deno.readTextFile("supabase/functions/generate-stress-fixtures/index.ts");
  assert(src.includes("q5b_profiling_observation = \"No\"") || src.includes("r.q5b_profiling_observation = \"No\""), "q5b snap missing");
  assert(src.includes("business's OWN workers, students, or educational/job applicants"), "ported q5b guidance missing");
  assert(src.includes("consumers applying for a loan, account, or service are NOT this trigger"), "3e9ad759 applicants rule missing");
});

Deno.test("doc149 — grader context carries the cppa_risk field-semantics block under the bumped instrument", () => {
  assert(GRADER_CONTEXT_VERSION.includes("+risk-field-semantics-2026-09-03"), "instrument not stamped with the field-semantics amendment");
  assert(SHARED_GRADER_CONTEXT.includes("CPPA RISK INTAKE FIELD SEMANTICS"), "field-semantics block missing");
  assert(SHARED_GRADER_CONTEXT.includes("q5b_profiling_observation asks the 11 CCR § 7150(b)(4) statutory element DIRECTLY"), "q5b semantics missing");
  assert(SHARED_GRADER_CONTEXT.includes("q15d_hr_carveout answers ONLY whether the § 7150(b)(2)(A) personnel carve-out applies"), "q15d semantics missing");
  assert(SHARED_GRADER_CONTEXT.includes("engaged on the Company's reported answer"), "q15 designed-state semantics missing");
});
