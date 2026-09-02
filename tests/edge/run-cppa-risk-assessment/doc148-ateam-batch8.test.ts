// DOC 148 (2026-09-02) — A-Team Batch-8 redesign review, agreed set.
// Permanent regression tests for:
//   * § 7150(b)(3) reconciliation at the render chokepoint (P0): an
//     advertising-only q19 description is a DETERMINED non-engagement
//     (§ 7001(ddd)(6)); an unresolved description degrades to Additional
//     Information Required; a significant-category description stays
//     engaged. The requirement answer never silently downgrades.
//   * Temporal validation (P0): an actual dated testing fact controls over
//     the generic recency selection; a planned safeguard whose recorded
//     target period has passed requires status confirmation.
//   * Material-change timeliness (P0): required/completed/timely are three
//     facts; timeliness is pending without the change date.
//   * Initial-assessment deadline fact-gating (P0, assembler).
//   * Retention category completeness (P1).
//   * SPI trigger qualification (P1) and condition deduplication (P1).
//   * § 7001(e) human-involvement framing, counsel exception, EUP
//     methodology attribution, question-number removal (P1/P2).
//   * Appendix A quote-clipping + reconciled derived-trigger slot (P2).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  latestExplicitPeriodEnd,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import {
  clipQuotedPassages,
  deriveApplicable7150Triggers,
  deriveInitialAssessmentDeadline,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};

const LOW_PATHWAY: Bag = {
  harm: "(H) Psychological harms",
  likelihood: "Unlikely",
  severity: "Minimal",
  data_involved: "Contact identifiers",
  actor: "Internal analytics team",
  cause: "Over-notification",
};

const HIGH_PATHWAY_G: Bag = {
  harm: "(G) Reputational harms",
  likelihood: "Possible",
  severity: "Significant",
  data_involved: "Behavioral profiles",
  actor: "Journalists",
  cause: "Inadequate disclosure",
};

function engineOn(intake: Bag, report: Bag = {}) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    report as never,
    "2026-09-02",
  );
}

const B3_ENGAGED_REPORT: Bag = {
  scope_and_triggers: {
    narrative: [
      "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.",
      "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    ],
  },
};

const ADVERTISING_DESC =
  "An ML-based audience segmentation system assigns users to advertising cohorts based on inferred interests and predicted purchase intent.";

// ── § 7150(b)(3) reconciliation ──────────────────────────────────────────────

Deno.test("doc148 — b(3) advertising-only description renders the FSOR non-engagement, never Engaged", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q5_sell_share: "Yes — sell only",
      q18_admt_use: "Yes",
      q19_admt_description: ADVERTISING_DESC,
    },
    B3_ENGAGED_REPORT,
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b3 = digest.rows.find((row) => row[0].includes("7150(b)(3)"));
  assert(b3, "b(3) digest row missing (silent drop)");
  assert(b3[1].startsWith("Not engaged — "), "b(3) row not the determined non-engagement");
  assert(b3[1].includes("§ 7001(ddd)(6)"), "FSOR exclusion cite missing");
  const b1 = digest.rows.find((row) => row[0].includes("7150(b)(1)"));
  assert(b1 && b1[1].startsWith("Engaged — "), "b(1) row disturbed");
  assertEquals(r.exec_panel.triggers_engaged_count, 1, "reconciled count wrong");
  assertEquals(r.exec_panel.assessment_required, true, "assessment_required flipped");
  const analysis = r.blocks["iii_analysis:2"] ?? "";
  assert(
    analysis.includes("excludes advertising to a consumer from the significant-decision categories"),
    "§ 3.A exclusion paragraph missing",
  );
});

Deno.test("doc148 — b(3) unresolved description degrades to Additional Information Required with a Follow-Up", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q5_sell_share: "Yes — sell only",
      q18_admt_use: "Yes",
      q19_admt_description: "The system routes records between internal teams.",
    },
    B3_ENGAGED_REPORT,
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b3 = digest.rows.find((row) => row[0].includes("7150(b)(3)"));
  assert(b3, "b(3) digest row missing");
  assert(b3[1].startsWith("Additional Information Required — "), "b(3) row not AIR");
  const followUps = r.blocks["iv_determination:12"] ?? "";
  assert(
    followUps.includes("Identify the significant decision the automated decisionmaking technology makes or facilitates"),
    "b(3) follow-up missing",
  );
  assertEquals(r.exec_panel.triggers_engaged_count, 1);
});

Deno.test("doc148 — b(3) significant-category description keeps the trigger Engaged", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q5_sell_share: "Yes — sell only",
      q18_admt_use: "Yes",
      q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
    },
    B3_ENGAGED_REPORT,
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b3 = digest.rows.find((row) => row[0].includes("7150(b)(3)"));
  assert(b3 && b3[1].startsWith("Engaged — "), "significant b(3) no longer engaged");
  assertEquals(r.exec_panel.triggers_engaged_count, 2);
});

Deno.test("doc148 — b(3) was the ONLY asserted trigger: requirement answer stays Yes, state is carried", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q18_admt_use: "Yes",
      q19_admt_description: ADVERTISING_DESC,
    },
    {
      scope_and_triggers: {
        narrative: [
          "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record supports this trigger and this activity falls within the risk-assessment obligation.",
        ],
      },
    },
  );
  assertEquals(r.exec_panel.assessment_required, true, "conservative requirement answer lost");
  assertEquals(r.exec_panel.triggers_engaged_count, 0);
  const digest = r.tables["executive_summary:3"];
  assert(digest, "digest suppressed despite the reconciled state");
  assert(digest.rows.some((row) => row[0].includes("7150(b)(3)")), "reconciled row missing");
});

// ── SPI trigger qualification ────────────────────────────────────────────────

Deno.test("doc148 — b(2) row carries the reported-answer qualifier when no statutory SPI category maps", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q15_sensitive_pi: "Yes",
      q4_pi_categories: ["Device identifiers (IP, cookies, device IDs)"],
    },
    {
      scope_and_triggers: {
        narrative: [
          "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.",
        ],
      },
    },
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b2 = digest.rows.find((row) => row[0].includes("7150(b)(2)"));
  assert(b2, "b(2) digest row missing");
  assert(b2[1].startsWith("Engaged — "), "b(2) must stay engaged on the reported answer");
  assert(
    b2[1].includes("engaged on the Company’s reported answer") &&
      b2[1].includes("qualifying statutory sensitive-PI category remains to be identified"),
    "b(2) qualifier missing",
  );
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("qualifying statutory sensitive-personal-information category"),
    "doc-139 SPI follow-up lost",
  );
});

// ── Condition deduplication ──────────────────────────────────────────────────

Deno.test("doc148 — a planned-covered material risk draws ONE condition; a bare material risk still draws the gap condition", () => {
  const planned = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [HIGH_PATHWAY_G],
    a6_safeguards: [{
      harm: "(G) Reputational harms",
      safeguard: "A just-in-time profiling notice is displayed on first login",
      safeguard_status: "Planned, not yet implemented",
      planned_timeline: "Within 90 days",
    }],
  });
  const conditionsText = planned.blocks["iv_determination:11"] ?? "";
  assert(
    conditionsText.includes("Complete implementation of the planned safeguard"),
    "planned-completion condition missing",
  );
  assert(
    !conditionsText.includes("Establish and implement a safeguard addressing the material risk: (G) Reputational harms"),
    "duplicate gap condition still generated for the planned-covered risk",
  );
  const bare = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [HIGH_PATHWAY_G],
  });
  assert(
    (bare.blocks["iv_determination:11"] ?? "").includes(
      "Establish and implement a safeguard addressing the material risk: (G) Reputational harms",
    ),
    "gap condition lost for the risk with no safeguard at all",
  );
});

// ── Temporal validation ──────────────────────────────────────────────────────

Deno.test("doc148 — latestExplicitPeriodEnd: quarters and month-years parse; bare years never do", () => {
  assertEquals(latestExplicitPeriodEnd("Bias testing was last conducted in Q2 2024."), "2024-06-30");
  assertEquals(latestExplicitPeriodEnd("Reviewed in June 2025, then again in Q1 2026."), "2026-03-31");
  assertEquals(latestExplicitPeriodEnd("Per the 2023 Advertiser Performance Report, 24 months of logs."), null);
  assertEquals(latestExplicitPeriodEnd(""), null);
});

Deno.test("doc148 — a dated testing fact older than 12 months defeats the generic recency claim", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
    admt_testing_facts: [
      "Tested for accuracy or validity",
      "Tested for discriminatory impact or bias",
      "Testing performed or reviewed within the last 12 months",
    ],
    i5_admt_fairness_testing: "Bias testing was last conducted in Q2 2024 using a disparate-impact analysis.",
  });
  const testing = r.factors["admt_testing_analysis"] ?? "";
  assert(
    !testing.includes("performed or reviewed within the last 12 months —"),
    "recency confirmation rendered despite the dated conflict",
  );
  assert(
    testing.includes("the recorded date controls"),
    "conflict sentence missing from § 3.E testing analysis",
  );
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Resolve the testing-recency conflict"),
    "recency-conflict follow-up missing",
  );
});

Deno.test("doc148 — a consistent dated testing fact leaves the recency confirmation untouched", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
    admt_testing_facts: [
      "Tested for accuracy or validity",
      "Tested for discriminatory impact or bias",
      "Testing performed or reviewed within the last 12 months",
    ],
    i5_admt_fairness_testing: "Bias testing was last conducted in Q1 2026 using a disparate-impact analysis.",
  });
  const testing = r.factors["admt_testing_analysis"] ?? "";
  assert(
    testing.includes("performed or reviewed within the last 12 months"),
    "recency confirmation lost on a consistent record",
  );
  assert(
    !(r.blocks["iv_determination:12"] ?? "").includes("Resolve the testing-recency conflict"),
    "false conflict follow-up",
  );
});

Deno.test("doc148 — a planned safeguard whose recorded target period has passed requires confirmation", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [HIGH_PATHWAY_G],
    a6_safeguards: [{
      harm: "(G) Reputational harms",
      safeguard: "A homepage-prominent opt-out banner is planned for Q1 2025",
      safeguard_status: "Planned, not yet implemented",
      planned_timeline: "Within 90 days",
    }],
  });
  const followUps = r.blocks["iv_determination:12"] ?? "";
  assert(
    followUps.includes("Confirm the implementation status of the planned safeguard") &&
      followUps.includes("through 2025-03-31") ,
    "stale planned-safeguard follow-up missing",
  );
});

// ── Material-change timeliness ───────────────────────────────────────────────

Deno.test("doc148 — material change without a date: update established, timeliness pending, no satisfied claim", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    material_change_since_prior: "Yes",
  });
  const cadence = r.factors["review_cadence"] ?? "";
  assert(!cadence.includes("cadence is satisfied"), "satisfied claim rendered without the change date");
  assert(
    cadence.includes("cannot be verified until the date of the material change is recorded"),
    "pending-timeliness sentence missing",
  );
});

Deno.test("doc148 — material change with a timely date keeps the satisfied cadence; a late date states the window honestly", () => {
  const timely = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    material_change_since_prior: "Yes",
    material_change_date: "2026-08-01",
  });
  assert(
    (timely.factors["review_cadence"] ?? "").includes("the governance cadence is satisfied by this assessment"),
    "timely satisfied sentence missing",
  );
  const late = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    material_change_since_prior: "Yes",
    material_change_date: "2026-01-10",
  });
  const lateText = late.factors["review_cadence"] ?? "";
  assert(!lateText.includes("cadence is satisfied"), "late update still claims satisfaction");
  assert(lateText.includes("falls outside the 45-calendar-day window"), "late-window sentence missing");
});

// ── Retention completeness ───────────────────────────────────────────────────

Deno.test("doc148 — every q4 category gets a retention row; the uncovered category states the open follow-up", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "General location (city, region, ZIP, IP-derived)",
    ],
    retention_by_pi_category: [
      { pi_category: "Contact identifiers (name, email, phone)", retention_period: "24 months" },
    ],
  });
  const table = r.tables["ii_information:14"];
  assert(table, "retention table missing");
  assertEquals(table.rows.length, 2, "uncovered category row missing");
  const missing = table.rows.find((row) => row[0].startsWith("General location"));
  assert(missing && missing[1].includes("Not stated — see the Follow-Ups"), "open-state row wrong");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Identify the retention period, or the criteria used to determine it, for"),
    "retention follow-up missing",
  );
  assert(
    (r.factors["retention_basis"] ?? "").includes("Retention is not stated for"),
    "per-category gap sentence missing from § 2.G",
  );
});

// ── Wording items ────────────────────────────────────────────────────────────

Deno.test("doc148 — no question numbers in any composed factor; counsel exception; § 7001(e) framing; EUP methodology; Mixed wording", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q5_sell_share: "Yes — sell only",
    q15_sensitive_pi: "Yes",
    q18_admt_use: "Yes",
    q18b_admt_training: "Yes — training ADMT for significant decisions",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
    admt_role_type: "The ADMT is a substantial factor in a human decision",
    consumer_relationship_context: "Mixed",
    i3_ca_consumer_band: "More than 1,000,000",
    i7_external_consultees: "Outside privacy counsel at Hartwell & Crane LLP reviewed the framework",
    a8_information_providers: [{ name: "Ad Products Team", role: "Processing operator" }],
  }, B3_ENGAGED_REPORT);
  const all = [...Object.values(r.blocks), ...Object.values(r.factors)].join("\n");
  assert(!/\(Q\d+b?\)/.test(all), "a question number leaked into composed prose");
  assert(
    all.includes("Legal counsel providing legal advice is excepted from the § 7152(a)(8) information-provider record"),
    "counsel-exception sentence missing",
  );
  assert(
    all.includes("The Company classifies the system as a substantial factor in a human decision"),
    "attributed role classification missing",
  );
  assert(
    all.includes("replaces or substantially replaces human decisionmaking"),
    "§ 7001(e) operative-test sentence missing",
  );
  assert(
    (r.tables["iv_determination:8"]?.note ?? "").includes("EUP’s conservative qualitative methodology") &&
      (r.tables["iv_determination:8"]?.note ?? "").includes("not a regulator-prescribed scoring formula"),
    "methodology attribution missing from the § 4.C balance-summary note",
  );
  assert(
    all.includes("spanning more than one relationship category"),
    "Mixed relationship wording missing",
  );
  assert(!all.includes("The affected consumers are mixed"), "old Mixed echo still renders");
});

// ── Assembler items ──────────────────────────────────────────────────────────

Deno.test("doc148 — initial-assessment deadline is fact-gated on the start date", () => {
  assertEquals(
    deriveInitialAssessmentDeadline({ processing_status: "Ongoing" }),
    "Initial-assessment deadline: determination pending — record when the covered processing began (before initiation applies to processing initiated on or after January 1, 2026; the December 31, 2027 transition deadline applies to covered processing already underway before that date and continuing afterward).",
  );
  assertEquals(
    deriveInitialAssessmentDeadline({ processing_status: "Ongoing", processing_start_date: "2025-06-01" }),
    "Initial-assessment deadline: December 31, 2027 (transition deadline for covered processing initiated before January 1, 2026 and continuing afterward).",
  );
  assertEquals(
    deriveInitialAssessmentDeadline({ processing_status: "Ongoing", processing_start_date: "2026-03-01" }),
    "Initial-assessment deadline: before initiation of the processing (processing initiated 2026-03-01).",
  );
  const planned = deriveInitialAssessmentDeadline({ processing_status: "Planned", planned_start_date: "2026-11-01" });
  assert(planned !== null && planned.includes("before the processing is initiated"), "planned branch disturbed");
});

Deno.test("doc148 — clipQuotedPassages bounds long embedded quotes and leaves short ones alone", () => {
  const short = "The Company identifies “a short quoted value” for the record.";
  assertEquals(clipQuotedPassages(short), short);
  const long = "The Company identifies “one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen” here.";
  const clipped = clipQuotedPassages(long);
  assert(clipped.includes("…”"), "no visible elision");
  assert(!clipped.includes("seventeen"), "quote not clipped");
  assert(clipped.startsWith("The Company identifies “one two three"), "quote head lost");
});

Deno.test("doc148 — deriveApplicable7150Triggers applies the b(3) reconciliation when intake is supplied", () => {
  const report = {
    scope_and_triggers: {
      narrative: [
        "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): basis.",
        "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): basis.",
      ],
    },
  };
  const reconciled = deriveApplicable7150Triggers(report, {
    q18_admt_use: "Yes",
    q19_admt_description: ADVERTISING_DESC,
  });
  assert(reconciled !== null && !reconciled.includes("7150(b)(3)"), "b(3) still listed");
  const unreconciled = deriveApplicable7150Triggers(report);
  assert(unreconciled !== null && unreconciled.includes("7150(b)(3)"), "no-intake fallback disturbed");
});
