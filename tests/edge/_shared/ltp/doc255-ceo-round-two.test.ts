// DOC 255 (2026-09-11) — the CEO's round on doc 254/254A: § 7155's own terms
// for the Risk deadline (254A item 1), the universal disclaimer (254A item 2),
// DPA clause 3.2 (254A item 3), ledger F5–F9 and B1 wording, L19 plain
// English, and the five accepted recommendations (LIA L1, EU notice N1/N2,
// RoPA P1/P2 and the activity-by-activity completeness review, the DPIA
// synthesis sentence, the harness sector write).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deriveInitialAssessmentDeadline, DOC252_C1_C2_SENTENCE } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-timing.ts";
import { REPORT_DISCLAIMER } from "../../../../supabase/functions/_shared/report-disclaimer.ts";
import { composeLiaRecommendation } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import {
  assembleRopaRegister,
  completenessRecommendations,
  rightsByBasisSentence,
} from "../../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { composeRiskSynthesis } from "../../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-skeleton-assemble.ts";
import { buildNoticeHtml } from "../../../../supabase/functions/generate-eu-notice/index.ts";
import { buildTransferAnalysis } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { UK_JURISDICTION } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/elements.ts";
import { harvestGovernanceCitations } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// ── 254A item 1 — § 7155's own terms, order of obligations explicit ─────────

Deno.test("doc255 — the Risk deadline lines use the regulation's term and cite the rule that sets each date", () => {
  assertStringIncludes(DOC252_C1_C2_SENTENCE, "Under 11 CCR § 7155(b) the risk assessment for that processing must be conducted and documented by December 31, 2027");
  assertStringIncludes(DOC252_C1_C2_SENTENCE, "reviewed and updated at least once every three years (§ 7155(a)(2)) and within 45 calendar days of any material change (§ 7155(a)(3))");
  assert(!/initial|subsequent/i.test(DOC252_C1_C2_SENTENCE), "neither 'initial' nor 'subsequent' is the regulation's word");
  const pre2026 = deriveInitialAssessmentDeadline({ processing_status: "Ongoing", processing_start_date: "2025-06-01" }) ?? "";
  assert(pre2026.startsWith("Risk assessment deadline: December 31, 2027, under 11 CCR § 7155(b)"), pre2026);
  const planned = deriveInitialAssessmentDeadline({ processing_status: "Planned", planned_start_date: "2026-11-01" }) ?? "";
  assertStringIncludes(planned, "before the processing is initiated, under 11 CCR § 7155(a)(1)");
});

// ── 254A item 2 — the disclaimer ────────────────────────────────────────────

Deno.test("doc255 — the universal disclaimer states the provider processing plainly", () => {
  assertStringIncludes(REPORT_DISCLAIMER, "processes the information you supply with third-party service providers");
  assertStringIncludes(REPORT_DISCLAIMER, "do not retain your information for their own purposes");
  assert(!/utilizes|Accordingly|for any purpose/.test(REPORT_DISCLAIMER));
});

// ── L1 — the partly-expected mitigation surfaces as a Recommendation ────────

Deno.test("doc255 — LIA: an Available outcome with a partly-expected mitigation renders a Recommendation; other outcomes do not", () => {
  const measure = "Give the data subjects an unconditional, standing means of stopping this specific use at the point where they would first encounter it, going beyond the Article 21 objection right the GDPR already requires.";
  const report: Bag = {
    lia_determination: {
      outcome: "legitimate_interests_available",
      mitigations: [{ factor: "reasonable_expectations", measure }],
    },
  };
  const rec = composeLiaRecommendation(report);
  assert(rec.startsWith("Recommendation. The balance holds on the record without this step"), rec);
  assertStringIncludes(rec, measure);
  assertEquals(composeLiaRecommendation({ lia_determination: { outcome: "available_only_with_mitigations", mitigations: [{ factor: "reasonable_expectations", measure }] } }), "");
  assertEquals(composeLiaRecommendation({ lia_determination: { outcome: "legitimate_interests_available", mitigations: [{ factor: "balancing", measure }] } }), "");
});

// ── P1 — rights by lawful basis ─────────────────────────────────────────────

const ACTIVITY: Bag = {
  id: "a1", name: "Account Registration", owner: "Head of Platform", purpose: "resolving support requests", lawfulBasis: "Consent — Art. 6(1)(a)",
  dataSubjects: "Registered users", dataCategories: "Contact details", collectionSources: "the data subject", processingOperations: "collection, storage",
  recipients: "Internal engineering", retention: "24 months", security: "Encryption at rest", accessControls: "RBAC",
  transfersDeclaredNone: true, transferWithinRegion: "the EU", rightsHandling: "Requests reach privacy@example.com and are answered within 30 days",
  activityRole: "controller", relatedAssessments: [], noticesDisplayed: "", incidentLog: "", templateKey: "",
};

Deno.test("doc255 — RoPA rights by basis: consent adds withdrawal and portability; legitimate interests adds objection; a processor activity says nothing", () => {
  assertStringIncludes(rightsByBasisSentence(ACTIVITY as never), "withdraw consent at any time (Article 7(3))");
  assertStringIncludes(rightsByBasisSentence(ACTIVITY as never), "receive the data in a portable form (Article 20)");
  const li = rightsByBasisSentence({ ...ACTIVITY, lawfulBasis: "Legitimate interests — Art. 6(1)(f)" } as never);
  assertStringIncludes(li, "object to the processing (Article 21)");
  assert(!li.includes("Article 7(3)"), li);
  assertEquals(rightsByBasisSentence({ ...ACTIVITY, activityRole: "processor" } as never), "");
  assertEquals(rightsByBasisSentence({ ...ACTIVITY, lawfulBasis: "" } as never), "");
});

// ── P2 + ROPA-04 — completeness recommendations and activity-by-activity lines

const INPUT: Bag = {
  organisationName: "Example Ltd", legalEntityType: "Private Limited Company", incorporationJurisdiction: "England and Wales", registeredAddress: "1 Example Street", roles: ["controller"],
  isController: true, isProcessor: false, hasDpo: false, dpoName: "", dpoEmail: "", dpoPhone: "", euRepName: "", euRepEmail: "", ukRepName: "", ukRepEmail: "",
  homeBase: "", jurisdictionLabels: ["the UK GDPR"], employeeBand: "1000+", rightsHandling: "",
  activities: [
    { ...ACTIVITY, id: "a1", name: "Fleet Telematics", dataCategories: "Precise GPS location data; vehicle identifiers", noticesDisplayed: "Driver privacy notice at onboarding", incidentLog: "Logged in the security incident register", relatedAssessments: ["DPIA-2026-03 Fleet telematics"] },
    { ...ACTIVITY, id: "a2", name: "Occupational Health Referrals", recipients: "Occupational health provider (external)", dataCategories: "Health data; employee identifiers", noticesDisplayed: "Employee privacy notice", incidentLog: "", relatedAssessments: [] },
  ],
};

Deno.test("doc255 — RoPA completeness: precise location, health recipients and an unrecorded home base each draw a recommendation", () => {
  const recs = completenessRecommendations(INPUT as never);
  assert(recs.startsWith("Recommendations. "), recs);
  assertStringIncludes(recs, "Fleet Telematics records precise location data");
  assertStringIncludes(recs, "Article 35(1) GDPR; WP248 rev.01");
  assertStringIncludes(recs, "Occupational Health Referrals involves health data or health-related recipients");
  assertStringIncludes(recs, "Article 9(2)(h)");
  assertStringIncludes(recs, "Record the company's home base");
  assertEquals(completenessRecommendations({ ...INPUT, homeBase: "UK", activities: [ACTIVITY] } as never), "");
});

Deno.test("doc255 — RoPA completeness review reads activity by activity when two or more activities carry the facts", () => {
  const out = assembleRopaRegister(INPUT as never);
  assertStringIncludes(out.text, "the record reads activity by activity.");
  assertStringIncludes(out.text, "— Fleet Telematics: notices displayed — Driver privacy notice at onboarding; incident log — Logged in the security incident register; related assessments — DPIA-2026-03 Fleet telematics.");
  assertStringIncludes(out.text, "— Occupational Health Referrals: notices displayed — Employee privacy notice.");
  assert(!out.text.includes("On notices, the company has indicated"), "the three-sentence dump must not render beside the per-activity lines");
  assertEquals(out.conformance.ok, true, JSON.stringify(out.conformance.findings));
  // Ledger F5 — "no personal data is".
  assertStringIncludes(out.text, "no personal data is transferred to a third country or an international organisation");
});

// ── DPIA-04 — the synthesis sentence over the risk table ────────────────────

Deno.test("doc255 — DPIA synthesis names how many risks fall to low and which remain higher; one row composes nothing", () => {
  const report: Bag = {
    risk_register: [
      { risk_label: "Unauthorised access", residual_band: "low" },
      { risk_label: "Loss of control in the processor chain", residual_band: "low" },
      { risk_label: "Automated evaluation producing legal effects", residual_band: "moderate" },
    ],
  };
  assertEquals(
    composeRiskSynthesis(report),
    "Taken together, two of the three risks fall to a low remaining risk level after the recorded measures (Unauthorised access and Loss of control in the processor chain); Automated evaluation producing legal effects remains moderate.",
  );
  assertEquals(composeRiskSynthesis({ risk_register: [{ risk_label: "Only one", residual_band: "low" }] }), "");
  assertStringIncludes(composeRiskSynthesis({ risk_register: [{ risk_label: "A", residual_band: "low" }, { risk_label: "B", residual_band: "low" }] }), "all two risks fall to a low remaining risk level");
});

// ── N1 / N2 — EU notice Art. 22 route pre-fill and the Art. 27 trigger note ─

Deno.test("doc255 — EU notice: the Art. 22 route is pre-filled from the recorded detail, and a non-EEA controller without a representative is told why Article 27 is engaged", () => {
  const answers: Bag = {
    controller_name: "Example Ltd", controller_address: "1 Example Street, London, United Kingdom", contact_email: "privacy@example.com",
    establishment_jurisdiction: "uk", lawful_basis: ["contract"], processing_purposes: ["service_delivery"],
    automated_decisions: "yes",
    automated_decisions_detail: "Accounts are suspended automatically when the risk score exceeds the threshold. Users may submit an appeal via the in-platform appeal form and a human reviewer decides within 24 hours.",
  };
  const html = buildNoticeHtml({ fw: { framework_code: "EU_GDPR", framework_name: "EU GDPR" } as never, answers, generatedAtHuman: "September 11, 2026" });
  const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  assertStringIncludes(text, "How to request human intervention or contest a decision: Users may submit an appeal via the in-platform appeal form and a human reviewer decides within 24 hours. [confirm this route");
  assertStringIncludes(text, "Article 27(1) of the GDPR requires us to designate a representative in the Union unless the exemption in Article 27(2) applies");
  // With a representative named, the trigger note does not render.
  const withRep = buildNoticeHtml({ fw: { framework_code: "EU_GDPR", framework_name: "EU GDPR" } as never, answers: { ...answers, eu_rep_name: "Example Rep GmbH" }, generatedAtHuman: "September 11, 2026" })
    .replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  assert(!withRep.includes("Article 27(1) of the GDPR requires us to designate"), "no trigger note when a representative is named");
});

// ── F9 — the omission sentence never manufactures an Article 44 citation ────

Deno.test("doc255 — governance: 'Article 44 was omitted' is a negated mention, never a harvested citation", () => {
  const out = buildTransferAnalysis({
    jurisdictions: [UK_JURISDICTION],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK Addendum to EU SCCs",
  } as never) as unknown as { application: string };
  assertStringIncludes(out.application, "Article 44 was omitted from the UK GDPR on 5 February 2026");
  const cites = harvestGovernanceCitations({ application: out.application });
  assert(!cites.some((c) => /Art(?:icle|\.)\s*44\b(?!A)/.test(c)), JSON.stringify(cites));
});
