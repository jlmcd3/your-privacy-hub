// DOC 153 (2026-09-03) — Batch 736df0ad triage + A-Team Batch-10 review:
// permanent regression tests.
//   * Recipient contract status — three honest states (absent → "Not
//     recorded" + Follow-Up; "Unsure" → not confirmed BY THE COMPANY; a
//     non-enum value → the Company's own words), never a negative finding the
//     Company did not make.
//   * Retention — an uncovered q4 category under an OVERALL retention
//     statement is a category-specific gap, not "not stated".
//   * Executive compact heads name the harm the condition addresses.
//   * Sell/share scope reconciliation — the trigger stands; a missing
//     recipient of the reported sharing (or a purpose silent on it) is stated
//     in § 2.F and completed by Follow-Up.
//   * Planned safeguard described in operating terms → status Follow-Up
//     (the quote is never rewritten).
//   * Testing promise parity — the § 3.E testing sentence and its § 4.D
//     Recommendation share one derivation (evaluation-stage + recency-only).
//   * Company "significant decision" claim in the UNRESOLVED classifier
//     class → § 3.E determination + Follow-Up; Appendix E carries the same
//     EUP determination beside the Company's quoted description.
//   * Grader payload completeness trailer; instrument amendments.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { deriveAdmtTechnicalFacts } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../supabase/functions/_shared/grader/context.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

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

const ECON_PATHWAY: Bag = {
  harm: "(E) Economic harms",
  likelihood: "Possible",
  severity: "Moderate",
  data_involved: "Upgrade-likelihood scores",
  actor: "The Company through offer targeting",
  cause: "Differentiated pricing by predicted willingness to pay",
};

function engineOn(intake: Bag, report: Bag = {}) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [LOW_PATHWAY], ...intake } as never,
    report as never,
    "2026-09-03",
  );
}

const SP_ROW = (name: string, extra: Bag = {}): Bag => ({
  recipient_name_or_category: name,
  recipient_type: "Service provider",
  pi_categories_made_available: ["Device identifiers (IP, cookies, device IDs)"],
  disclosure_purpose: "Event ingestion and routing to analytics destinations",
  ...extra,
});

// ── Recipient contract status ────────────────────────────────────────────────

Deno.test("doc153 — an ABSENT contract status renders Not recorded and completes by Follow-Up (never 'Not confirmed')", () => {
  const r = engineOn({ recipients: [SP_ROW("Segment (event pipeline service provider)")] });
  const table = r.tables["ii_information:11"];
  assert(table, "recipients table missing");
  assertEquals(table.rows[0][4], "Not recorded — see the Follow-Ups in § 4.D");
  assert(!JSON.stringify(table.rows).includes('"Not confirmed"'), "bare negative finding rendered for an unanswered field");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Record the contractual status of the disclosure to “Segment (event pipeline service provider)”"),
    "contract-status follow-up missing",
  );
});

Deno.test("doc153 — Unsure is attributed to the Company; a non-enum value renders as the Company's own words with reduced reliance", () => {
  const r = engineOn({
    recipients: [
      SP_ROW("NimbusCore", { contractual_protections: "Unsure" }),
      SP_ROW("SplitLab", { contractual_protections: "service provider, DPA in place" }),
      SP_ROW("Amplitude", { contractual_protections: "Written contract with the CCPA-required restrictions in place" }),
    ],
  });
  const rows = r.tables["ii_information:11"]!.rows;
  assertEquals(rows[0][4], "Not confirmed by the Company");
  assertEquals(rows[1][4], "As recorded: “service provider, DPA in place”");
  assertEquals(rows[2][4], "Restrictions confirmed");
  const cons = r.factors["recipient_consequences"] ?? "";
  assert(cons.includes("For SplitLab, the recorded contract status does not confirm the CCPA-required restriction terms"), "unmapped-value consequence missing");
  assert(!(r.blocks["iv_determination:12"] ?? "").includes("Record the contractual status"), "follow-up fired for answered rows");
});

// ── Retention under an overall statement ─────────────────────────────────────

Deno.test("doc153 — an uncovered category under an overall retention statement is a category-specific gap, not 'not stated'", () => {
  const r = engineOn({
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Device identifiers (IP, cookies, device IDs)",
    ],
    retention_by_pi_category: [
      { pi_category: "Device identifiers (IP, cookies, device IDs)", retention_period: "24 months from collection", retention_criteria: "Fixed period from collection" },
    ],
    i2_retention_period: "24 months from collection",
    i2_retention_criteria: "Fixed period from collection",
  });
  const row = r.tables["ii_information:14"]!.rows.find((x) => x[0].startsWith("Contact identifiers"));
  assert(row, "uncovered category row missing");
  assert(row[1].startsWith("No category-specific period recorded — the Company’s overall retention statement applies"), row[1]);
  const basis = r.factors["retention_basis"] ?? "";
  assert(basis.includes("A category-specific retention period is not recorded for “Contact identifiers (name, email, phone)”"), basis);
  assert(!basis.includes("Retention is not stated for"), "overstated 'not stated' survived");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("specifically for “Contact identifiers (name, email, phone)”; only the Company’s overall retention statement in § 2.G currently covers it"),
    "category-specific follow-up missing",
  );
});

Deno.test("doc153 — without any overall statement the doc-148 'Not stated' state is unchanged", () => {
  const r = engineOn({
    q4_pi_categories: ["Contact identifiers (name, email, phone)", "General location (city, region, ZIP, IP-derived)"],
    retention_by_pi_category: [{ pi_category: "Contact identifiers (name, email, phone)", retention_period: "24 months" }],
  });
  const row = r.tables["ii_information:14"]!.rows.find((x) => x[0].startsWith("General location"));
  assertEquals(row?.[1], "Not stated — see the Follow-Ups in § 4.D");
  assert((r.factors["retention_basis"] ?? "").includes("Retention is not stated for"), "doc-148 sentence lost");
});

// ── Compact heads name the harm ──────────────────────────────────────────────

Deno.test("doc153 — the executive compact head names the harm a planned-safeguard condition addresses", () => {
  const one = engineOn({
    a5_harm_pathways: [ECON_PATHWAY],
    a6_safeguards: [{
      harm: "(E) Economic harms",
      safeguard: "A fairness review of offer segmentation logic will be conducted quarterly by the Product and Legal teams",
      safeguard_status: "Planned, not yet implemented",
      planned_timeline: "Within 12 months",
    }],
  });
  assert(
    (one.factors["conditions_compact"] ?? "").includes("Complete implementation of the planned safeguard addressing (E) Economic harms"),
    one.factors["conditions_compact"],
  );
  const two = engineOn({
    a5_harm_pathways: [ECON_PATHWAY, { ...ECON_PATHWAY, harm: "(G) Reputational harms" }],
    a6_safeguards: [
      { harm: "(E) Economic harms", safeguard: "A fairness review will be conducted quarterly", safeguard_status: "Planned, not yet implemented" },
      { harm: "(G) Reputational harms", safeguard: "A just-in-time notice will be displayed on first login", safeguard_status: "Planned, not yet implemented" },
    ],
  });
  assert(
    (two.factors["conditions_compact"] ?? "").includes("(two conditions, addressing (E) Economic harms and (G) Reputational harms)"),
    two.factors["conditions_compact"],
  );
});

// ── Sell/share scope reconciliation ──────────────────────────────────────────

Deno.test("doc153 — sharing affirmed with no third-party/advertising recipient states the gap in § 2.F and completes by Follow-Up", () => {
  const r = engineOn({
    q5_sell_share: "Yes — share for advertising only",
    primary_activity_purpose: "This activity generates aggregated analytics reports that inform product improvements.",
    recipients: [
      SP_ROW("Segment (event pipeline service provider)", { contractual_protections: "Written contract with the CCPA-required restrictions in place" }),
    ],
  });
  const cons = r.factors["recipient_consequences"] ?? "";
  assert(cons.includes("The Company reports sharing of personal information (“Yes — share for advertising only”; § 7150(b)(1), § 3.A), but no recipient of that sharing"), cons);
  // DOC 167 CEO RULING (2026-09-04) — pin inverted: the Purpose text's
  // silence about the sharing is not a scope finding once q5 identifies the
  // sharing as advertising; the recipient record is the only completing
  // object, so the purpose-silent clause no longer renders.
  assert(!cons.includes("stated purpose does not describe it"), "retired purpose-silent clause must not render");
  assert(cons.includes("If that sharing belongs to a separate processing activity, it should be scoped and assessed separately."), cons);
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Identify the recipient or recipient category, the personal information made available, and the purpose for the sharing the Company reports"),
    "recipient-record follow-up missing",
  );
});

// DOC 167 CEO RULING (2026-09-04) — the second half of this pin ("a silent
// purpose alone raises the scope confirmation") is retired: whether the
// Purpose mentions the sharing is not relevant once q5 identifies it, so a
// recorded advertising recipient raises nothing either way.
Deno.test("doc153 — a recorded advertising recipient raises nothing, whether or not the Purpose names the sharing (doc 167 CEO ruling)", () => {
  const complete = engineOn({
    q5_sell_share: "Yes — share for advertising only",
    primary_activity_purpose: "Cloverpath shares browsing behavior with advertising network partners to enable targeted advertising.",
    recipients: [
      SP_ROW("Digital advertising network partners", { recipient_type: "Third party", disclosure_purpose: "Audience segment targeting", contractual_protections: "Written contract with the CCPA-required restrictions in place" }),
    ],
  });
  assert(!(complete.factors["recipient_consequences"] ?? "").includes("§ 7150(b)(1)"), "gap sentence fired on a complete record");
  assert(!(complete.blocks["iv_determination:12"] ?? "").includes("the sharing the Company reports"), "follow-up fired on a complete record");

  const silent = engineOn({
    q5_sell_share: "Yes — share for advertising only",
    primary_activity_purpose: "This activity generates personalized content recommendations and analytics dashboards for business customers.",
    recipients: [
      SP_ROW("Advertising technology partners (ad network SDKs)", { recipient_type: "Third party", disclosure_purpose: "Cross-context behavioral advertising targeting", contractual_protections: "Written contract with the CCPA-required restrictions in place" }),
    ],
  });
  assert(!(silent.factors["recipient_consequences"] ?? "").includes("§ 7150(b)(1)"), "gap sentence fired although an advertising recipient is recorded");
  assert(!(silent.factors["recipient_consequences"] ?? "").includes("stated purpose does not itself describe"), "retired purpose-silent branch must not render");
  assert(!(silent.blocks["iv_determination:12"] ?? "").includes("Confirm that the sharing of personal information the Company reports"), "retired scope-confirmation follow-up must not render");
});

// ── Planned safeguard in operating terms ─────────────────────────────────────

Deno.test("doc153 — a PLANNED safeguard described in operating terms draws a status Follow-Up; future-tense planned text does not", () => {
  const conflict = engineOn({
    a5_harm_pathways: [ECON_PATHWAY],
    a6_safeguards: [{
      harm: "(E) Economic harms",
      safeguard: "A fairness review of offer segmentation logic is conducted quarterly by the Product and Legal teams",
      safeguard_status: "Planned, not yet implemented",
    }],
  });
  const fu = conflict.blocks["iv_determination:12"] ?? "";
  assert(fu.includes("Confirm the status of the safeguard recorded as planned but described in operating terms — “A fairness review of offer segmentation logic is conducted quarterly"), fu);
  assert(fu.includes("(addresses: (E) Economic harms)"), "harm not named");
  // The Condition still quotes the Company's words untouched.
  assert((conflict.blocks["iv_determination:11"] ?? "").includes("is conducted quarterly"), "quoted safeguard was rewritten");

  const clean = engineOn({
    a5_harm_pathways: [ECON_PATHWAY],
    a6_safeguards: [{
      harm: "(E) Economic harms",
      safeguard: "A dedicated opt-out link will be added to the account settings page",
      safeguard_status: "Planned, not yet implemented",
    }],
  });
  assert(!(clean.blocks["iv_determination:12"] ?? "").includes("described in operating terms"), "false conflict on future-tense text");
});

// ── Testing promise parity ───────────────────────────────────────────────────

Deno.test("doc153 — an In-evaluation record with provider-only testing gets the Recommendation its § 3.E sentence promises", () => {
  const r = engineOn({
    q18_admt_use: "In evaluation",
    q19_admt_description: "Claremont is evaluating a machine-learning user segmentation tool that would classify users into behavioral cohorts.",
    i5_admt_logic: "A supervised ML classifier trained on historical engagement features; vendor documentation requested.",
    admt_testing_facts: ["Testing performed by the provider rather than the Company"],
  });
  const testing = r.factors["admt_testing_analysis"] ?? "";
  assert(testing.includes("completing the identified testing appears among the Recommendations in § 4.D"), testing);
  const recs = r.blocks["iv_determination:13"] ?? "";
  assert(recs.includes("Complete the identified testing of the automated system — accuracy or validity testing, discriminatory-impact testing and testing within the last 12 months — and record the results"), recs);
});

Deno.test("doc153 — a deployed system tested for accuracy and bias but with a stale dated period still gets the recency Recommendation", () => {
  const r = engineOn({
    q18_admt_use: "Yes",
    q19_admt_description: "Velostream uses an ML recommendation engine that scores users on predicted feature affinity for upsell offers.",
    admt_role_type: "The ADMT is a substantial factor in a human decision",
    admt_testing_facts: [
      "Tested for accuracy or validity",
      "Tested for discriminatory impact or bias",
      "Testing performed or reviewed within the last 12 months",
    ],
    i5_admt_fairness_testing: "Bias testing against demographic proxies was conducted in Q3 2024 by the internal ML engineering team.",
  });
  const testing = r.factors["admt_testing_analysis"] ?? "";
  assert(testing.includes("does not confirm testing within the last 12 months"), testing);
  assert(testing.includes("appears among the Recommendations in § 4.D"), "promise missing");
  const recs = r.blocks["iv_determination:13"] ?? "";
  assert(recs.includes("Complete the identified testing of the automated system — testing within the last 12 months — and record the results"), recs);
  assert((r.blocks["iv_determination:12"] ?? "").includes("Resolve the testing-recency conflict"), "doc-148 recency follow-up lost");
});

// ── Company "significant decision" claim — unresolved class ─────────────────

const UNPLACED_CLAIM =
  "Velostream uses an ML-based recommendation engine that scores users on predicted feature affinity and upgrade likelihood, generating ranked product recommendations that are a material factor in determining which upsell offers are displayed to each user. The system constitutes a significant decision impacting consumers' access to promotional pricing and service tiers.";

Deno.test("doc153 — a significant-decision claim the classifier cannot place is answered in § 3.E and completed by Follow-Up", () => {
  const r = engineOn({
    q18_admt_use: "Yes",
    q19_admt_description: UNPLACED_CLAIM,
    admt_role_type: "The ADMT is a substantial factor in a human decision",
  });
  const role = r.factors["admt_role"] ?? "";
  assert(role.includes("That characterization is preserved as the Company’s own description."), role);
  assert(role.includes("does not identify a decision within the categories enumerated in § 7001(ddd)"), role);
  assert(role.includes("identifying the decision appears among the Follow-Ups in § 4.D"), "promise missing");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Identify the significant decision the automated decisionmaking technology makes or facilitates"),
    "promised follow-up missing",
  );
});

Deno.test("doc153 — Appendix E quotes the Company's description as its own and carries the EUP determination beside it", () => {
  const unplaced = deriveAdmtTechnicalFacts({ q18_admt_use: "Yes", q19_admt_description: UNPLACED_CLAIM } as never)!;
  const desc = unplaced.rows.find((x) => x[0] === "System description")!;
  assert(desc[1].startsWith("“Velostream uses"), desc[1]);
  assert(desc[1].endsWith("(the Company’s description, quoted as given)"), desc[1]);
  const det = unplaced.rows.find((x) => x[0] === "EUP determination");
  assert(det && det[1].includes("does not identify a decision within the categories enumerated in § 7001(ddd)"), JSON.stringify(unplaced.rows));

  const advertising = deriveAdmtTechnicalFacts({
    q18_admt_use: "Yes",
    q19_admt_description: "Audience-scoring models drive ad targeting and frequency caps. The system constitutes a significant decision.",
  } as never)!;
  assert(advertising.rows.find((x) => x[0] === "EUP determination")?.[1].includes("§ 7001(ddd)(6)"), "advertising exclusion row missing");

  const noClaim = deriveAdmtTechnicalFacts({ q18_admt_use: "Yes", q19_admt_description: "A churn model flags accounts for outreach." } as never)!;
  assert(!noClaim.rows.some((x) => x[0] === "EUP determination"), "determination row rendered without a claim");
});

// ── Grader payload completeness trailer ─────────────────────────────────────

Deno.test("doc153 — the skeleton payload ends with an END OF DOCUMENT trailer only when complete", () => {
  const report = {
    skeleton_document: {
      title: "T",
      sections: [{ id: "s1", title: "S", paragraphs: [{ kind: "skeleton", text: "Alpha." }, { kind: "generated", text: "Beta." }] }],
    },
  };
  const full = buildSkeletonGraderPayload(report);
  assert(full.text.endsWith("=== END OF DOCUMENT — 1 sections, 2 paragraphs; complete, nothing omitted ==="), full.text.slice(-120));
  const cut = buildSkeletonGraderPayload(report, 40);
  assertEquals(cut.truncated, true);
  assert(!cut.text.includes("END OF DOCUMENT"), "trailer on a truncated payload");
});

// ── Instrument ───────────────────────────────────────────────────────────────

Deno.test("doc153 — grader context carries the batch-10 amendments under the appended tag; rubric mirror stays byte-synced", async () => {
  assert(GRADER_CONTEXT_VERSION.includes("+batch10-cal-2026-09-03"), "instrument tag missing");
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204"), "calibration prefix lost");
  for (const needle of [
    "Never assert an intake value you cannot quote from the intake payload",
    "Not recorded — see the Follow-Ups in § 4.D",
    "the designed two-part state",
    "END OF DOCUMENT",
    "quoted record, never unsupported business claims",
  ]) {
    assert(SHARED_GRADER_CONTEXT.includes(needle), `context missing: ${needle}`);
  }
  const canonical = await Deno.readTextFile(new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url));
  const mirror = await Deno.readTextFile(new URL("../../../supabase/functions/grade-single-assessment/index.ts", import.meta.url));
  const marker = "DOC 153 (2026-09-03): the same rule covers, by name, the § 2.A customer-voice lead-in";
  assert(canonical.includes(marker), "canonical rubric missing the doc-153 sentence");
  assert(mirror.includes(marker), "mirror rubric missing the doc-153 sentence");
  const pick = (src: string) => src.match(/id: "rubric_generic_boilerplate",[\s\S]*?description: "([^"]*)"/)?.[1] ?? "";
  assertEquals(pick(canonical), pick(mirror), "rubric_generic_boilerplate drifted between canonical and mirror");
});
