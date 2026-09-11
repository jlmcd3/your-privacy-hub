// DOC 257 (2026-09-11) — response to the ChatGPT Report Prose Review v2.
// Pins the accepted changes: the Risk disclosure/safeguard quoted-name match,
// the pending review-table labels, the factor-matrix determination sentences,
// the plain-English ADMT explainer, the registration Art. 37(1)(c) conjunctive
// read and the duty-umbrella wording, the governance limb (c) degrade and the
// passed remediation date, the LIA stale-review clause and consent note, the
// DPIA team roster split and record-completion items, the RoPA controller-level
// completeness and UK transfer recommendation, the EU notice direct-marketing
// objection channel, the biometric scope-limit sentences and seams, the IR
// per-state outstanding facts, and the US notice California gating and
// sentence seams.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { disclosureCarriedBySafeguard } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts";
import { deriveReviewApprovalTable, matrixDeterminationSentence } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { RISK52_FIXED } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/prose/plans/cppa-risk.spine.ts";
import { deriveRemediationRegisterTable } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { staleReviewClause } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildAlternativesConsidered } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { parseTeamRoster } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";
import { completenessRecommendations, computeCompleteness } from "../../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { buildNoticeHtml as buildEuNoticeHtml } from "../../../../supabase/functions/generate-eu-notice/index.ts";
import { assembleBiometricSkeletonDocument } from "../../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";
import { buildBiometricDeliverables } from "../../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { outstandingStateFacts } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { buildNoticeHtml as buildUsNoticeHtml, type StateRow } from "../../../../supabase/functions/generate-us-notice/_local/render.ts";

type Bag = Record<string, unknown>;

async function src(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, import.meta.url));
}

// ── CPPA Risk ──────────────────────────────────────────────────────────────

Deno.test("doc257 — CPPA-R2-01: a disclosure and a safeguard that quote the same control name are one act", () => {
  const disclosure = "Separate disclosure to California consumers of the sale and sharing of behavioral data with advertising partners, including a \"Do Not Sell or Share\" link to be relocated to the site header";
  const safeguard = "A 'Do Not Sell or Share My Personal Information' link will be added to all Veridian web property headers (not footer only), and downstream partner contracts will be amended to prohibit re-sharing of segment data received from Veridian without consumer opt-out compliance";
  assertEquals(disclosureCarriedBySafeguard(disclosure, safeguard), true);
  // An unquoted overlap of ordinary words is not the same act (doc 167 NestWave).
  const nestDisclosure = "An updated privacy policy section will explicitly name Segment as an analytics service provider receiving device event data and describe the consumer's opt-out right.";
  const nestSafeguard = "Privacy policy will be updated to clearly disclose analytics vendor sharing and the consumer's opt-out right; a consumer-facing FAQ page on data practices will be published, and a press-inquiry protocol will be documented.";
  assertEquals(disclosureCarriedBySafeguard(nestDisclosure, nestSafeguard), false);
});

Deno.test("doc257 — CPPA-R2-03: with the assessment date known and no current approval date, named rows say the act is not yet recorded", () => {
  const intake: Bag = {
    a9_approval_date: "2024-07-18",
    assessment_reviewers_approvers: [
      { name: "Nathaniel R. Okafor", position: "Chief Privacy Officer", role: "Both" },
      { name: "Simone L. Andrade", position: "VP, Data Science", role: "Reviewed" },
      { name: "Derek W. Hsu", position: "Associate General Counsel", role: "Approved" },
    ],
  };
  const t = deriveReviewApprovalTable(intake, "2026-09-11");
  assertEquals(t.rows.map((r) => r[0]), [
    "Reviewer and approver — not yet recorded",
    "Reviewer — review of this assessment not yet recorded",
    "Approver — approval not yet recorded",
  ]);
  assertStringIncludes(String(t.note ?? ""), "recorded when the signature and date fields are completed");
  // A current date keeps the existing labels and carries no note.
  const current = deriveReviewApprovalTable({ ...intake, a9_approval_date: "2026-09-01" }, "2026-09-11");
  assertEquals(current.rows.map((r) => r[0]), ["Reviewed and approved by", "Reviewed by", "Approved by"]);
  assertEquals(current.note, undefined);
  // Without an assessment date (unit fixtures) the labels are unchanged.
  assertEquals(deriveReviewApprovalTable(intake).rows.map((r) => r[0]), ["Reviewed and approved by", "Reviewed by", "Approved by"]);
});

Deno.test("doc257 — CPPA-R2-04: the factor matrix carries a determination sentence, never the prior-assessments heading or a roster line", () => {
  const prior = `${RISK52_FIXED.prior_head} ${RISK52_FIXED.prior_none}`;
  const cell = matrixDeterminationSentence("prior_assessments", prior);
  assert(!cell.startsWith(RISK52_FIXED.prior_head), cell);
  assertEquals(cell, RISK52_FIXED.prior_none.split(/(?<=[.!?])\s+/)[0]);
  const roster = [
    RISK52_FIXED.providers_lead,
    "— Simone L. Andrade, “VP, Data Science & ML Engineering” — “Owns model development”.",
    "— Derek W. Hsu, “Associate General Counsel, Privacy” — “Reviews contracts”.",
    RISK52_FIXED.providers_close,
  ].join("\n");
  assertEquals(
    matrixDeterminationSentence("record_providers", roster),
    "The information was provided by Simone L. Andrade (VP, Data Science & ML Engineering) and Derek W. Hsu (Associate General Counsel, Privacy).",
  );
});

Deno.test("doc257 — CPPA-R2-04: the ADMT explainer and the balancing cell plural are plain English (both mirrors)", async () => {
  for (const rel of [
    "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts",
    "../../../../supabase/functions/ltp-risk-doc-gen/_local/ltp/risk-factor-engine.ts",
  ]) {
    const t = await src(rel);
    assert(!t.includes("stands or falls"), rel);
    assertStringIncludes(t, "is assessed on what it actually does, not on the label applied to it");
    assertStringIncludes(t, "atMaxResidual === 1 ? \"remaining risk\" : \"remaining risks\"");
  }
});

// ── CPPA ADMT ──────────────────────────────────────────────────────────────

Deno.test("doc257 — ADMT-R2-02: later not-reached stubs refer to the first", async () => {
  const t = await src("../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts");
  assertStringIncludes(t, "Not reached, for the reason stated in Section 3: ${dutyPhrase} in this report.");
});

// ── Governance ─────────────────────────────────────────────────────────────

Deno.test("doc257 — GOV-R2-02: a recorded target date that has passed is stated as passed, never as a forward plan", () => {
  const plan = [{
    finding_key: "records_of_processing.ropa_maintained",
    domain: "records_of_processing",
    action_type: "Compliance gap",
    accountable_owner: "Chief Privacy Officer",
    target_date: "2025-06-30",
    priority: "High — remediate this quarter",
    validation_method: "External audit or assurance report",
    validation_method_source: "recorded",
    status: "analysed",
  }];
  const t = deriveRemediationRegisterTable({ remediation_plan: plan, domain_element_findings: [] }, "2026-09-11")!;
  assertStringIncludes(String(t.note ?? ""), "Target date: 2025-06-30 (passed)");
  assertStringIncludes(String(t.note ?? ""), "The recorded target date has passed as at 2026-09-11; a revised, owner-approved date is required");
  const future = deriveRemediationRegisterTable({ remediation_plan: [{ ...plan[0], target_date: "2027-06-30" }], domain_element_findings: [] }, "2026-09-11")!;
  assert(!String(future.note ?? "").includes("passed"), String(future.note));
});

// ── LIA ────────────────────────────────────────────────────────────────────

Deno.test("doc257 — LIA-R2-01: a review more than twelve months old is stated, and an annual commitment makes the re-review due", () => {
  const asOf = new Date("2026-09-11T00:00:00Z");
  const annual = staleReviewClause("2024-03-15", { balancing_details: { safeguards: "DPO reviews the LIA annually" } }, asOf);
  assertEquals(annual, " As at 2026-09-11, more than twelve months have passed since that date; on the annual review the company's own record commits to, the re-review is due.");
  const plain = staleReviewClause("2024-03-15", { balancing_details: { safeguards: "Opt-out in settings" } }, asOf);
  assertStringIncludes(plain, "the company should confirm that the assessment remains current");
  assertEquals(staleReviewClause("2026-03-15", {}, asOf), "");
  assertEquals(staleReviewClause("", {}, asOf), "");
});

Deno.test("doc257 — LIA-R2-03: consent among the alternatives is named as a different lawful basis, not a less intrusive means", () => {
  const f = buildAlternativesConsidered({
    necessity_details: {
      alternatives: "Aggregate cohort analysis\nConsent-based opt-in analytics",
      alternatives_rationale: "Aggregate cohort analysis — cannot identify individual users at risk\nConsent-based opt-in analytics — opt-in rates too low to model churn",
      why_consent_not_used: "Consent would leave material gaps in the model.",
    },
  }) as unknown as Bag;
  assertStringIncludes(String(f.application), "Every alternative the record names, consent included, carries a recorded reason for being inadequate.");
  assertStringIncludes(String(f.application), "Consent is an alternative lawful basis under Article 6(1)(a) rather than a less intrusive means of achieving the purpose");
});

// ── DPIA ───────────────────────────────────────────────────────────────────

Deno.test("doc257 — DPIA-R2-04: 'A (Role) and B (Role)' on one line is two team members", () => {
  assertEquals(parseTeamRoster("Marta Solberg (DPO) and Priya Nair (Senior Privacy Analyst)"), [
    { name: "Marta Solberg", role: "DPO" },
    { name: "Priya Nair", role: "Senior Privacy Analyst" },
  ]);
  assertEquals(parseTeamRoster("Privacy Counsel (Responsible)"), [{ name: "Privacy Counsel", role: "Responsible" }]);
});

Deno.test("doc257 — DPIA-R2-01/02: the r8 source names the human review it reads, and the gap ledger raises the stale approval and the DPO recommendation", async () => {
  const t = await src("../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts");
  assertStringIncludes(t, "The record describes human review of each decision, so the likelihood is assessed as unlikely");
  assertStringIncludes(t, "is more than twelve months old at the date of this report");
  assertStringIncludes(t, "The data protection officer's advice includes");
});

// ── RoPA ───────────────────────────────────────────────────────────────────

Deno.test("doc257 — ROPA-R2-01: an unrecorded registered address makes the register incomplete at the controller level", () => {
  const record = { activity_id: "a1", activity_name: "Payroll", sentence: "x", art30: [], missing: [] } as never;
  const input = { organisationName: "Velantrix Digital Ltd", registeredAddress: "", dpoName: "Marta Solberg", dpoEmail: "privacy@velantrix.io", dpoPhone: "" } as never;
  const c = computeCompleteness([record], input);
  assertEquals(c.complete, false);
  assertEquals(c.controller_missing, ["the controller's contact details (registered address) — Article 30(1)(a)"]);
  const ok = computeCompleteness([record], { ...(input as Bag), registeredAddress: "1 Example Street, London" } as never);
  assertEquals(ok.complete, true);
  assertEquals(ok.controller_missing, []);
  // Without an input (legacy callers) the activity-only rule stands.
  assertEquals(computeCompleteness([record]).complete, true);
});

Deno.test("doc257 — ROPA-R2-03: EU SCCs recorded on a UK register draw the IDTA / UK Addendum recommendation", () => {
  const input = {
    organisationName: "Velantrix Digital Ltd",
    homeBase: "EU_EEA",
    jurisdictionCodes: ["EU", "UK"],
    jurisdictionLabels: ["EU GDPR", "UK GDPR"],
    registeredAddress: "1 Example Street",
    activities: [
      { name: "Transactional Email", transferMechanism: "Standard Contractual Clauses (EU SCCs, 2021)", dataCategories: "Contact details", recipients: "SendGrid" },
      { name: "Payroll", transferMechanism: "EU SCCs with the UK Addendum", dataCategories: "Employee records", recipients: "Payroll processor" },
    ],
  } as never;
  const recs = completenessRecommendations(input);
  assertStringIncludes(recs, "Transactional Email records EU Standard Contractual Clauses as the transfer mechanism, and the register covers the United Kingdom");
  assertStringIncludes(recs, "UK GDPR Article 46(2)(d); Data Protection Act 2018 section 119A; in force 21 March 2022");
  assert(!recs.includes("Payroll records EU Standard"), "an activity already naming the UK Addendum draws no recommendation");
  const euOnly = completenessRecommendations({ ...(input as Bag), jurisdictionCodes: ["EU"], jurisdictionLabels: ["EU GDPR"] } as never);
  assert(!euOnly.includes("EU SCCs alone"), "no UK in scope, no UK recommendation");
});

// ── EU notice ──────────────────────────────────────────────────────────────

Deno.test("doc257 — EUN-R2-01: the direct-marketing objection reuses only the channel and states the absolute effect", () => {
  const answers: Bag = {
    controller_name: "Velantrix Digital Ltd", controller_address: "1 Example Street, London", contact_email: "privacy@velantrix.io",
    establishment_jurisdiction: "uk", lawful_basis: ["legitimate_interests"], processing_purposes: ["marketing"],
    gdpr_right_to_object: "You may object to processing based on legitimate interests at any time via the Account Settings page or by emailing privacy@velantrix.io; we will assess your objection and cease processing unless we can demonstrate compelling legitimate grounds.",
  };
  const html = buildEuNoticeHtml({ fw: { framework_code: "EU_GDPR", framework_name: "EU GDPR" } as never, answers, generatedAtHuman: "September 11, 2026" });
  const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  const start = text.indexOf("Your Right to Object to Direct Marketing");
  assert(start > 0, "direct-marketing section renders on a marketing purpose");
  const dm = text.slice(start, start + 900);
  assertStringIncludes(dm, "How to object: You may object to processing based on legitimate interests at any time via the Account Settings page or by emailing privacy@velantrix.io. The objection is honoured without any assessment of competing grounds");
  assert(!dm.includes("compelling"), dm);
});

// ── Biometric ──────────────────────────────────────────────────────────────

Deno.test("doc257 — BIO-R2-01: an EU/UK-only record states the scope limit, never a finding that no duty exists", () => {
  const sk = assembleBiometricSkeletonDocument(
    { duty_findings: [], consequence_determination: {} },
    { orgName: "Velantrix Digital Ltd", orgType: "Technology", purpose: "Customer authentication", biometricTypes: ["Facial geometry"], jurisdictions: ["EU / EEA (GDPR)", "United Kingdom (UK GDPR)"] },
  );
  const t = skeletonDocumentToText(sk.document);
  assertStringIncludes(t, "the statutes this assessment applies are Illinois BIPA, Texas CUBI and Washington RCW 19.375, and the jurisdictions named fall outside them");
  assertStringIncludes(t, "That is a limit of this assessment's scope, not a finding that no duty applies.");
  assertStringIncludes(t, "Beyond the statutes this assessment applies.");
  assert(!t.includes("No registered statute"), t);
});

Deno.test("doc257 — BIO-R2-02: a noun-phrase capture method reads in running text, and a sentence-valued security answer carries one stop", () => {
  const intake: Bag = {
    orgName: "Veridian Digital Solutions, Inc.", orgType: "Consumer app or platform", purpose: "Customer authentication",
    biometricTypes: ["Facial geometry / facial recognition"], jurisdictions: ["Illinois (BIPA)"],
    data_source_description: "Facial geometry and voiceprint templates captured during account login within the Veridian web and mobile platforms.",
    security_measures_description: "Templates are encrypted at rest and annual penetration testing is performed.",
  };
  const report = buildBiometricDeliverables(intake as never) as unknown as Bag;
  const text = skeletonDocumentToText(assembleBiometricSkeletonDocument(report, intake).document);
  assertStringIncludes(text, "by means of facial geometry and voiceprint templates captured during account login");
  assert(!/\.\./.test(text), "no doubled stop in the rendered document");
  assertStringIncludes(JSON.stringify(report.duty_findings), "Security measures: Templates are encrypted at rest and annual penetration testing is performed. Parity");
  // A method that opens with the company's own name keeps its capital.
  const namedIntake = { ...intake, data_source_description: "Veridian kiosk cameras at check-in" };
  const named = buildBiometricDeliverables(namedIntake as never) as unknown as Bag;
  assertStringIncludes(skeletonDocumentToText(assembleBiometricSkeletonDocument(named, namedIntake).document), "by means of Veridian kiosk cameras at check-in");
});

// ── IR Playbook ────────────────────────────────────────────────────────────

Deno.test("doc257 — IR-R2-01: the outstanding facts follow each state's own trigger", () => {
  assertEquals(outstandingStateFacts({ jurisdiction: "California" }), "encryption and acquisition facts");
  assertEquals(outstandingStateFacts({ jurisdiction: "Texas" }), "encryption and acquisition facts");
  assertEquals(outstandingStateFacts({ jurisdiction: "New York" }), "encryption and acquisition facts and the harm-threshold assessment");
});

// ── US notice ──────────────────────────────────────────────────────────────

const CA: StateRow = { state_code: "CA", state_name: "California", framework_type: "ccpa" };
const VA: StateRow = { state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" };
const US_ANSWERS: Bag = {
  business_name: "Veridian Digital Solutions, Inc.",
  business_description: "A large-scale online and web services platform providing cloud-based software to consumers.",
  contact_email: "privacy@veridian.example",
  data_categories: ["identifiers", "internet_activity"],
  collection_purposes: ["service_delivery", "advertising"],
  data_sources: "Directly from you",
  third_party_sharing: "yes",
  third_party_categories: ["service_providers"],
  sale_or_sharing: "sell_and_share",
  retention_general: "24 months",
  ccpa_sensitive_data: "no",
  ccpa_minors: "no",
  ccpa_financial_incentive: "no",
  ccpa_admt: "no",
};

Deno.test("doc257 — USN-R2-01: the California sharing subsection renders only where the notice covers California", () => {
  const va = buildUsNoticeHtml(VA, US_ANSWERS, "September 11, 2026");
  assert(!va.includes("California sharing"), "Virginia edition carries no California sharing subsection");
  assert(!va.includes("California residents may opt out"), va.slice(0, 200));
  const ca = buildUsNoticeHtml(CA, US_ANSWERS, "September 11, 2026");
  assertStringIncludes(ca, "<h3>California sharing</h3>");
});

Deno.test("doc257 — USN-R2-03: a noun-phrase business description is attributed, a sentence-valued purposes answer stands alone, and the signal labels read for the reader", () => {
  const html = buildUsNoticeHtml(CA, US_ANSWERS, "September 11, 2026");
  assertStringIncludes(html, "is responsible for this Notice. It describes itself as a large-scale online and web services platform providing cloud-based software to consumers.");
  assertStringIncludes(html, "Opt-out preference signals we recognise");
  assertStringIncludes(html, "How we apply the signal");
  assert(!html.includes("Signals recognised"), "the form label is gone");
  const sentencePurposes = buildUsNoticeHtml(CA, { ...US_ANSWERS, collection_purposes: "We collect personal information to deliver the service and to personalise advertising." }, "September 11, 2026");
  assert(!sentencePurposes.includes("purposes: We collect"), "a sentence-valued purposes answer never follows the colon");
  assertStringIncludes(sentencePurposes, "We collect personal information to deliver the service and to personalise advertising. We use personal information only for purposes reasonably related");
});

Deno.test("doc257 — USN-R2-02: a multi-category California table carries one per-category confirmation item", () => {
  const html = buildUsNoticeHtml(CA, US_ANSWERS, "September 11, 2026");
  assertStringIncludes(html, "[confirm, for each category, the sources, purposes and retention that apply to it; the entries above restate the general answers recorded]");
  const one = buildUsNoticeHtml(CA, { ...US_ANSWERS, data_categories: ["identifiers"] }, "September 11, 2026");
  assert(!one.includes("confirm, for each category, the sources"), "a single category row needs no per-category confirmation");
});

// ── DPA / PDF ──────────────────────────────────────────────────────────────

Deno.test("doc257 — DPA-R2-01/03: the coverage schedule carries fixed column widths and the DPA cover names the engaged regimes", async () => {
  const t = await src("../../../../supabase/functions/generate-report-pdf/index.ts");
  assertStringIncludes(t, "widths: [\"11%\", \"47%\", \"11%\", \"31%\"]");
  assertStringIncludes(t, "e.ukEngaged === true ? \"UK GDPR\" : \"\"");
  assertStringIncludes(t, "dpaMetaLineFor(record, generatedLine, frameworkLabel)");
});
