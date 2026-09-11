// DOC 259A (2026-09-11) — batch 7134671b: the combined fix plan (doc 259 +
// ChatGPT Prose Review v3), approved by the CEO in full. One pin per fix; the
// spine-hash re-pins live beside their spines.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { datedCommitments, datedMentions, pastDatedCommitments, pastDatesProse } from "../../../../supabase/functions/_shared/prose/temporal.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { CYBER_PERFECT } from "../../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildProgramReadiness } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { CPPA_ADMT_GOLDEN } from "../../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { composeNoticeAnalysis } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-generated.ts";
import { assembleAdmtV2Document } from "../../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { assembleRiskSkeletonDocument } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { buildRegistrationDeliverables } from "../../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { buildDomainFindingsTyped, composeExecutiveSummaryTyped } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { buildGovernanceDeliverables } from "../../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { buildLiaDeliverables } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { applyApprovalCurrency, buildDpiaDeliverables } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { AUTOMATED_DECISION_HUMAN_REVIEW_RE, DPIA_RISK_SPECS } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/elements.ts";
import { DPIA_AUTOMATED_DECISION_NATURE, dpiaFrameworkContract } from "../../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { buildNoticeHtml as buildEuNoticeHtml } from "../../../../supabase/functions/generate-eu-notice/index.ts";
import { EU_NOTICE_AUTOMATED_DECISIONS, euNoticeContract } from "../../../../supabase/functions/run-stress-job/_local/intake-contracts/eu-notice.ts";
import { resolveTransfer } from "../../../../supabase/functions/generate-ropa-document/register/assemble-input.ts";
import { transferDisplayForActivity } from "../../../../supabase/functions/generate-ropa-document/register/activity-answer-display.ts";
import { assembleRopaRegister, type RopaActivityInput, type RopaAssembleInput } from "../../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { assembleBiometricSkeletonDocument, TEXAS_DESTRUCTION_CLOCK_SENTENCE } from "../../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";
import { attachIrPlaybookDeliverables } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { buildNoticeHtml as buildUsNoticeHtml, type StateRow } from "../../../../supabase/functions/generate-us-notice/_local/render.ts";

type Bag = Record<string, unknown>;
const AS_OF = "2026-09-11";

// ── 3.11 — the temporal helper ────────────────────────────────────────────

Deno.test("doc259 — dated mentions resolve to period ends; only a cued mention is a commitment; a past commitment is reported", () => {
  const sprint = "Two legacy environments still expose non-standard ports pending a scheduled remediation sprint in Q3 2025.";
  assertEquals(datedMentions(sprint).map((d) => d.iso), ["2025-09-30"]);
  assertEquals(pastDatedCommitments(sprint, AS_OF).map((d) => d.raw), ["Q3 2025"]);
  // An event is not a commitment.
  const event = "A documented incident response plan was exercised in a tabletop simulation in April 2025; the single incident in the past 12 months was managed.";
  assertEquals(datedMentions(event).map((d) => d.raw), ["April 2025"]);
  assertEquals(datedCommitments(event), []);
  assertEquals(datedCommitments("The assessment was reviewed by Dr. Marta Voss on 12 September 2024."), []);
  // The batch's own sentences.
  assertEquals(pastDatedCommitments("Platform Privacy Notice at example.com/privacy; update scheduled for 2024-11-30 to include explicit reference to churn scoring.", AS_OF).map((d) => d.iso), ["2024-11-30"]);
  assertEquals(pastDatedCommitments("an updated privacy notice published no later than 2024-11-30, and the 90-day score purge validated by internal audit within six months", AS_OF).map((d) => d.raw), ["2024-11-30"]);
  // "by the end of" resolves to 31 December; a bare year and "24 months" never count.
  const eoy = "Migration will complete by the end of 2025. We retain 24 months of logs from the 2023 report.";
  assertEquals(datedMentions(eoy).map((d) => d.iso), ["2025-12-31"]);
  assertEquals(pastDatedCommitments(eoy, "2025-12-01"), []);
  assertEquals(pastDatesProse(pastDatedCommitments("scheduled for Q3 2025 and due by 2024-11-30", AS_OF)), "Q3 2025 and 2024-11-30");
});

// ── 3.1 — Cyber: the program-level sentence follows the Section 7 conclusion ──

Deno.test("doc259 — Cyber: with an untestable component under a ready-subject-to cover, § 3 no longer says the program cannot be described as prepared", () => {
  const c = CYBER_PERFECT[0];
  const built = buildCyberDeliverables(c.intake);
  const evidence = built.evidence_sufficiency.map((r, i) => i === 0 ? { ...r, sufficiency: "insufficient" as const, testable_artifacts: [] } : r);
  const subjectTo = buildProgramReadiness(c.intake, {
    ...built,
    evidence_sufficiency: evidence,
    readiness_determination: { ...built.readiness_determination, conclusion: "ready_subject_to_named_remediation" },
  } as never);
  assert(!subjectTo.conclusion.includes("cannot yet be described as prepared"), subjectTo.conclusion);
  assertStringIncludes(subjectTo.conclusion, "subject to the named remediation items, which include retaining those artifacts");
  const notReady = buildProgramReadiness(c.intake, {
    ...built,
    evidence_sufficiency: evidence,
    readiness_determination: { ...built.readiness_determination, conclusion: "not_ready" },
  } as never);
  assertStringIncludes(notReady.conclusion, "cannot yet be described as prepared for the independent audit");
});

// ── 3.2 — ADMT ────────────────────────────────────────────────────────────

function admtFixture(id: string): Bag {
  const f = CPPA_ADMT_GOLDEN.find((g) => g.id === id);
  if (!f) throw new Error(`fixture not found: ${id}`);
  return { ...(f.intake as Bag) };
}

Deno.test("doc259 — ADMT: a 'not yet provided' notice folds the missing elements into Condition 1; the specific-purpose prose keys on status; the delivery sentence never concatenates", () => {
  const intake: Bag = {
    ...admtFixture("admt-credit-significant-tuning"),
    notice_delivery: ["Included in our Notice at Collection", "We have not yet provided a Pre-use Notice"],
    notice_has_specific_purpose: "No — uses generic language",
    notice_purpose_text: "We use technology to help us make decisions about applications.",
    notice_has_anti_retaliation: "Not yet",
  };
  const c = computeAdmtV2(intake);
  assert(!c.notice.findings.some((f) => f.criterion === "Specific purpose"), "the element finding is folded into Condition 1");
  assert(!c.notice.findings.some((f) => f.criterion === "Anti-retaliation"));
  const delivery = c.notice.findings.find((f) => f.criterion === "Notice delivery")!;
  assertEquals(delivery.priority, 1);
  assertStringIncludes(delivery.action_text, "the notice must supply the specific decision the ADMT informs");
  assertStringIncludes(delivery.closure_condition, "the § 7220(c)(4) anti-retaliation statement");
  const analysis = composeNoticeAnalysis(c.notice);
  assertStringIncludes(analysis, "reports that it uses generic language");
  assert(!analysis.includes("records that element as satisfied"), analysis);
  const doc = assembleAdmtV2Document({ intake, computed: c, exhibit: null, organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? "") });
  const text = skeletonDocumentToText(doc);
  assertStringIncludes(text, "The Company states that it has not yet provided a Pre-use Notice.");
  assert(!text.includes("Included in our Notice at Collection; We have not yet"), "no concatenated notice-state sentence");
  assert(!text.includes("by the current intake"), "no intake vocabulary");
  // A supplied notice with a "Yes" answer keeps the satisfied sentence.
  const met = computeAdmtV2({ ...intake, notice_delivery: ["Separate standalone Pre-use Notice"], notice_has_specific_purpose: "Yes" });
  assertStringIncludes(composeNoticeAnalysis(met.notice), "records that element as satisfied");
});

// ── 3.3 — Risk ────────────────────────────────────────────────────────────

const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
function riskFixture(): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL("../../fixtures/batch13/nestwave.json", import.meta.url))) as Bag;
}
function riskText(intake: Bag): string {
  return skeletonDocumentToText(assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: [B1] } } as never, intake as never).document);
}

Deno.test("doc259 — Risk: the signature-block lead no longer asserts a completed review; a recipient category outside the collected inventory draws a Follow-Up; a planned ADMT opt-out is a Condition, not also a Recommendation", () => {
  const base = riskFixture();
  const text = riskText(base);
  assertStringIncludes(text, "The individuals below record their review of this assessment by signature and date.");
  assert(!text.includes("reviewed this assessment as of the date indicated"));
  const withOutside = riskText({
    ...base,
    recipients: [
      ...(base.recipients as Bag[]),
      { recipient_name_or_category: "VerifyID Partners Inc.", recipient_type: "Contractor", contractual_protections: "Written contract with the CCPA-required restrictions in place", pi_categories_made_available: ["Government identifiers"], disclosure_purpose: "Identity verification." },
    ],
  });
  assertStringIncludes(withOutside, "Reconcile the recipients table with the categories recorded as collected: “Government identifiers” is recorded as made available to “VerifyID Partners Inc.” but is not among the categories the Company records collecting");
  // Planned ADMT opt-out row + q20 "Planned": one Condition, no "Strengthen the ADMT opt-out" Recommendation.
  const planned = riskText({
    ...base,
    q20_admt_opt_out: "Planned for implementation",
    a6_safeguards: [
      ...(base.a6_safeguards as Bag[]),
      { safeguard: "A dedicated ADMT opt-out interface will be deployed within the applicant portal, linked from the Pre-use Notice.", safeguard_status: "Planned, not yet implemented", harm: "(C) Impairment of consumer control over personal information", risk_pathway_ids: ["(C) Impairment of consumer control over personal information"], effectiveness_basis: "Consistent with an industry standard or framework", planned_timeline: "No committed timeline", residual: "Until deployed, candidates cannot opt out." },
    ],
  });
  assertStringIncludes(planned, "Complete implementation of the planned safeguard: “A dedicated ADMT opt-out interface");
  assert(!/Strengthen [^.]*the ADMT opt-out/.test(planned), "the Condition is not repeated as a Recommendation");
});

// ── 3.4 + 5.3 — Registration ──────────────────────────────────────────────

function regIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Meridian AI Health", organization_country: "IE", organization_size: "small", employee_count: 25, industry: "Healthcare", role: "controller",
    processes_personal_data: true, has_uk_establishment: false, has_eu_establishment: true, eu_lead_member_state: "IE", markets_served: ["IE"],
    is_public_authority: false, processes_special_categories: false, large_scale_monitoring: false, acts_as_data_broker: false, sells_or_shares_personal_info: false,
    uses_ai_systems: true, ai_high_risk: true, ...over,
  };
}

Deno.test("doc259 — Registration: the deployer sentence reads the recorded public-authority answer; the cover names the sector as a sector", () => {
  const deployer = buildRegistrationDeliverables(regIntake({ ai_high_risk_role: "deployer" }) as never).ai_act_registration!;
  assertStringIncludes(deployer.headline, "which the company has indicated it is not");
  assertStringIncludes(deployer.findings[0].record_fact, "and that it is not a public authority");
  const unstated = buildRegistrationDeliverables(regIntake({ ai_high_risk_role: "deployer", is_public_authority: null }) as never).ai_act_registration!;
  assertStringIncludes(unstated.headline, "which the record does not state");
  const intake = regIntake({ industry: "SaaS / Software" });
  const built = buildRegistrationDeliverables(intake as never);
  const text = skeletonDocumentToText(assembleRegistrationSkeletonDocument({ registration_deliverables: built, jurisdictions: [] } as never, intake as never).document);
  assertStringIncludes(text, "operating in the SaaS / Software sector");
});

// ── 3.5 + 5.5 — Governance and LIA ────────────────────────────────────────

const GOV_THIN: Bag = { organization_name: "Thin Records Ltd", sector: "Technology/SaaS", org_size: "51-250", jurisdictions: ["EU (GDPR)"], eu_uk_data: "Yes" };

Deno.test("doc259 — Governance: the accountability roll-up row is not a register item beside the rows it points at; counts read as words; Art. 9 leaves the submission basis", () => {
  const built = buildGovernanceDeliverables(GOV_THIN);
  assert(built.remediation_plan.length > 0);
  assert(!built.remediation_plan.some((r) => r.finding_key === "accountability_determination"), "no roll-up row");
  const exec = composeExecutiveSummaryTyped(buildDomainFindingsTyped(GOV_THIN));
  assert(/leaves (none|one|two|three|four|five|six|seven|eight|nine|ten) of the ten fully evidenced/.test(exec), exec);
  assert(!/\b\d+ of the ten\b/.test(exec));
  const withSpecial = buildDomainFindingsTyped({ ...GOV_THIN, special_category: "Yes", technical_controls: "Partial — some tools or categories" });
  assertEquals(withSpecial["data_submission"].regulatory_basis, "GDPR Arts. 5(1)(f), 32(1)");
});

Deno.test("doc259 — LIA: accountability entries are not safeguards against a material harm; the objection recommendation is the Art. 21(4) notice duty", () => {
  const intake: Bag = {
    organization_name: "Synthara Intelligence Ltd", sector: "Online & Web Services", jurisdictions: ["EU (GDPR)"],
    data_categories: ["Customer records"], processing_description: "API usage metadata is scored for anomalous behaviour.",
    stated_purpose: "To detect and prevent abuse of the platform.",
    purpose_details: { beneficiary: "Our business and the individuals", controller_is_public_authority: "No", interest_holder: "Our organisation only", interest_statement: "Synthara analyses API usage metadata to detect abuse.", interest_type: "Fraud prevention / security", public_task_processing: "Not applicable", specific_benefit: "Fewer abusive accounts" },
    necessity_details: { alternatives: "Manual review only", alternatives_rationale: "Manual review only — cannot scale to request volume", data_minimised: "Only request metadata is retained.", why_consent_not_used: "Security monitoring cannot depend on consent." },
    balancing_details: {
      potential_harm: "Significant — discrimination, financial loss, reputational damage",
      potential_harms: ["Exclusion from a service"],
      safeguards: ["DPIA completed", "Independent oversight (DPO / privacy committee)"],
      opt_out_available: "Yes — but conditional or subject to review",
      opt_out_mechanism: "Customers may submit an objection via the privacy portal; processing is paused pending a manual security review.",
      collection_context: "Metadata is collected automatically at the API gateway each time an authenticated user makes a request.",
      reasonable_expectation: "Probably — disclosed in privacy notice and consistent with the relationship",
      reasonable_expectation_detail: "The privacy notice references security monitoring.",
      relationship_category: "Customer", children_data_subjects: "No", vulnerable_subjects: ["None"], special_category_data: false,
    },
  };
  const d = buildLiaDeliverables(intake) as unknown as Bag;
  const json = JSON.stringify(d);
  assertStringIncludes(json, "names no safeguard against it beyond accountability measures (DPIA completed, Independent oversight (DPO / privacy committee)), which evidence oversight rather than reduce the harm");
  assertStringIncludes(json, "bring that route to the data subjects' attention at the point where they first encounter the use");
  assertStringIncludes(json, "as Article 21(4) requires");
  assert(!json.includes("so the choice is available before the processing runs"));
});

// ── 3.7 + 5.1 — DPIA ──────────────────────────────────────────────────────

function dpiaIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Synthara Intelligence Ltd", processing_activity_name: "AI Churn Prediction and Customer Scoring",
    description: "A churn-risk score (0–100) and a recommended intervention are produced for enterprise customer contacts.",
    purpose: "To enable proactive retention outreach.", data_subjects: "Named contacts of enterprise customers", jurisdictions: ["EU (GDPR)"],
    data_categories: ["Customer records", "Contact details"], retention_period: "Churn scores: 90 days.", legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    reasons_to_conduct: ["Evaluation or scoring (incl. profiling / prediction)"],
    existing_safeguards: ["Encryption at rest", "Access controls"],
    nature_scope_context: "Each churn score receives a human decision by the account manager, who has authority to override or dismiss the recommendation, before any retention action is taken.",
    dpia_approved_by_name: "Priya Nambiar", dpia_approved_by_title: "DPO", dpia_approval_date: "2026-08-01",
    dpia_signoff_basis: "Approved subject to an updated privacy notice published no later than 2024-11-30 and the 90-day purge validated by internal audit within six months.",
    ...over,
  };
}

Deno.test("doc259 — DPIA: the nature of the decision gates the Art. 22 row; human review carries the scoring risk instead; the contract carries the question", () => {
  const nature = dpiaFrameworkContract.fields.find((f) => f.key === "automated_decision_nature")!;
  assertEquals([...(nature.options ?? [])], [...DPIA_AUTOMATED_DECISION_NATURE]);
  assert(DPIA_RISK_SPECS.some((s) => s.risk_id === "r8b_scoring_informs_human_decisions"));
  assert(AUTOMATED_DECISION_HUMAN_REVIEW_RE.test(DPIA_AUTOMATED_DECISION_NATURE[1]));
  const ids = (intake: Bag) => buildDpiaDeliverables(intake).risk_register.map((r) => r.risk_id);
  const legacy = ids(dpiaIntake());
  assert(legacy.includes("r8_automated_significant_effect") && !legacy.includes("r8b_scoring_informs_human_decisions"), "legacy records are unchanged");
  const solely = ids(dpiaIntake({ automated_decision_nature: DPIA_AUTOMATED_DECISION_NATURE[0] }));
  assert(solely.includes("r8_automated_significant_effect") && !solely.includes("r8b_scoring_informs_human_decisions"));
  const reviewed = ids(dpiaIntake({ automated_decision_nature: DPIA_AUTOMATED_DECISION_NATURE[1] }));
  assert(!reviewed.includes("r8_automated_significant_effect") && reviewed.includes("r8b_scoring_informs_human_decisions"), reviewed.join(","));
  const none = ids(dpiaIntake({ automated_decision_nature: DPIA_AUTOMATED_DECISION_NATURE[2] }));
  assert(!none.includes("r8_automated_significant_effect") && !none.includes("r8b_scoring_informs_human_decisions"));
  const r8b = buildDpiaDeliverables(dpiaIntake({ automated_decision_nature: DPIA_AUTOMATED_DECISION_NATURE[1] })).risk_register.find((r) => r.risk_id === "r8b_scoring_informs_human_decisions")!;
  assertEquals(r8b.severity, "Significant");
  assertEquals(r8b.likelihood, "Unlikely");
});

Deno.test("doc259 — DPIA: a past dated commitment in the sign-off basis conditions a current approval; the minimisation justification is stated once", () => {
  const decision = { determination: "approved", why: "The controller approves the processing.", conditions: [] } as never;
  const out = applyApprovalCurrency(dpiaIntake(), decision, new Date(`${AS_OF}T00:00:00Z`)) as unknown as Bag;
  assertEquals(out.determination, "conditionally_approved");
  assertEquals((out.conditions as string[]).length, 1);
  assertStringIncludes((out.conditions as string[])[0], "recording whether the dated commitments in the sign-off basis — 2024-11-30 — were met, each being past at the date of this report");
  assertStringIncludes(String(out.why), "on one condition: recording whether the dated commitments");
  const current = applyApprovalCurrency(dpiaIntake({ dpia_signoff_basis: "Approved on the full record; annual re-review." }), decision, new Date(`${AS_OF}T00:00:00Z`)) as unknown as Bag;
  assertEquals(current.determination, "approved");
  const intake = dpiaIntake({ data_minimisation_justification: "Only the fields the churn model reads are collected." });
  const report = buildDpiaDeliverables(intake) as unknown as Bag;
  const doc = assembleDpiaSkeletonDocument(report as never, intake as never).document;
  const tables = doc.sections.flatMap((s) => s.paragraphs.filter((p) => p.kind === "table" && p.table).map((p) => p.table!));
  const min = tables.find((t) => t.title === "Data minimisation and retention")!;
  assert(min, "minimisation table present");
  assert(!min.columns.includes("Why the company says it is needed"), min.columns.join("|"));
  assertStringIncludes(String(min.note), "Why the company says these data are needed (stated once for every item above): Only the fields the churn model reads are collected.");
});

// ── 5.1 — EU notice ───────────────────────────────────────────────────────

Deno.test("doc259 — EU notice: 'human_review' renders the review sentence and no Art. 22 decision, high-impact row or Art. 22 right; 'yes' is unchanged", () => {
  assertEquals([...EU_NOTICE_AUTOMATED_DECISIONS], ["yes", "human_review", "no", "unsure"]);
  const field = euNoticeContract.fields.find((f) => f.key === "automated_decisions_detail")!;
  assertEquals([...(field.trigger?.equals ?? [])], ["yes", "human_review"]);
  const answers: Bag = {
    controller_name: "Synthara Intelligence Ltd", controller_address: "1 Example Street, Dublin, Ireland", contact_email: "privacy@synthara.example",
    establishment_jurisdiction: "eea", lawful_basis: ["legitimate_interests"], processing_purposes: ["service_delivery"],
    automated_decisions: "human_review",
    automated_decisions_detail: "Each churn score is reviewed by an account manager with authority to override it before any retention action is taken.",
  };
  const text = buildEuNoticeHtml({ fw: { framework_code: "EU_GDPR", framework_name: "EU GDPR" } as never, answers, generatedAtHuman: "September 11, 2026" }).replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  assertStringIncludes(text, "a member of our staff with authority to change the outcome reviews each such decision before it takes effect");
  assertStringIncludes(text, "How this processing works and what it means for you: Each churn score is reviewed by an account manager");
  assert(!text.includes("We make decisions based solely on automated processing"), "no Art. 22 sentence");
  assert(!text.includes("solely automated decisions with legal or similarly significant effects"), "no high-impact row");
  assert(!text.includes("Automated-decision safeguards"), "no Art. 22 right");
  const yes = buildEuNoticeHtml({ fw: { framework_code: "EU_GDPR", framework_name: "EU GDPR" } as never, answers: { ...answers, automated_decisions: "yes" }, generatedAtHuman: "September 11, 2026" }).replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
  assertStringIncludes(yes, "We make decisions based solely on automated processing");
});

// ── 3.8 + 3.11 — RoPA ─────────────────────────────────────────────────────

const ROPA_ACTIVITY: RopaActivityInput = {
  id: "11111111-1111-4111-8111-111111111111", name: "AI Churn Prediction and Customer Scoring", owner: "Account management leads",
  purpose: "generating churn-risk scores for enterprise customers", lawfulBasis: "Legitimate interests", dataSubjects: "named contacts of enterprise customers",
  dataCategories: "customer records, contact details", collectionSources: "the CRM", processingOperations: "collection, storage, analysis",
  recipients: "Salesforce (processor)", retention: "90 days", retentionByCategory: null, security: "encryption at rest and in transit",
  accessControls: "role-based CRM access", transferDestination: "", transferMechanism: "", transferBasis: "", transfersDeclaredNone: true,
  transferWithinRegion: "European Economic Area (GCP EU region only)",
  rightsHandling: "through the privacy inbox within one month", rightsOverride: "", relatedAssessments: [],
  noticesDisplayed: "Platform Privacy Notice at synthara.example/privacy; update scheduled for 2024-11-30 to include explicit reference to churn scoring",
  incidentLog: "logged in the privacy incident register",
} as RopaActivityInput;
const ROPA_INPUT: RopaAssembleInput = {
  documentDate: AS_OF, organisationName: "Synthara Intelligence Ltd", legalEntityType: "private_limited", incorporationJurisdiction: "", registrationNumber: "", registeredAddress: "",
  isController: true, isProcessor: false, dpoName: "Priya Nambiar", dpoEmail: "dpo@synthara.example", dpoPhone: "", euRepName: "", euRepEmail: "", ukRepName: "", ukRepEmail: "",
  homeBase: "EU_EEA", employeeBand: "50-249", jurisdictionCodes: ["EU"], jurisdictionLabels: ["EU GDPR"], activities: [ROPA_ACTIVITY],
};

Deno.test("doc259 — RoPA: an EEA-region destination is where the data stay; unrecorded identity fields drop their clauses; a past scheduled notice update is stated as past", () => {
  const inRegion = resolveTransfer({ transfer_destination: "European Economic Area (GCP EU region only)", transfer_mechanism: "Data Processing Agreement under Art. 28 GDPR; processing restricted to EEA infrastructure" });
  assertEquals(inRegion.declaredNone, true);
  assertStringIncludes(inRegion.withinRegion, "European Economic Area");
  assertStringIncludes(transferDisplayForActivity({ transfer_destination: "European Economic Area (GCP EU region only)", transfer_mechanism: "Art. 28 DPA; processing restricted to EEA infrastructure" }), "None — the data are held at");
  const scc = resolveTransfer({ transfer_destination: "United States", transfer_mechanism: "Standard Contractual Clauses (EU SCCs, 2021 form) with HubSpot Inc." });
  assertEquals(scc.declaredNone, false);
  const out = assembleRopaRegister(ROPA_INPUT);
  const text = JSON.stringify(out);
  assertStringIncludes(text, "The jurisdiction of incorporation and registered address are not recorded");
  assert(!text.includes("a jurisdiction it has not recorded") && !text.includes("an address it has not recorded"));
  assertStringIncludes(text, "the update recorded as scheduled for 2024-11-30 is past at the date of this register; confirm whether it was made");
  const recorded = assembleRopaRegister({ ...ROPA_INPUT, incorporationJurisdiction: "Ireland", registeredAddress: "1 Example Street, Dublin" });
  const t2 = JSON.stringify(recorded);
  assertStringIncludes(t2, "incorporated in Ireland, with its registered address at 1 Example Street, Dublin.");
  assert(!t2.includes("are not recorded"));
});

// ── 3.9 — Biometric ───────────────────────────────────────────────────────

Deno.test("doc259 — Biometric: the record line never doubles provenance or leaks a label; the BIPA clock is Illinois-only; the action panel folds its type into the action", () => {
  const report: Bag = {
    duty_findings: [
      { statute_key: "us_tx_cubi", key: "cubi_c1_disclosure", label: "No sale, lease, or other disclosure except as listed", citation: "Tex. Bus. & Com. Code § 503.001(c)(1)", verdict: "satisfied", record_fact: "The company reports that it does not disclose biometric data to third parties: Internal security team only.", application: "Because the company makes no disclosures, the limits do not come into play." },
      { statute_key: "us_tx_cubi", key: "cubi_c2_security", label: "Reasonable care in storage and transmission", citation: "Tex. Bus. & Com. Code § 503.001(c)(2)", verdict: "satisfied", record_fact: "Security measures: AES-256 encryption at rest; TLS 1.3 in transit. Parity with other confidential information: yes.", application: "The record describes reasonable care." },
      { statute_key: "us_tx_cubi", key: "cubi_c3_destruction", label: "Destruction within one year of expiry of the collection purpose", citation: "Tex. Bus. & Com. Code § 503.001(c)(3)", verdict: "not_satisfied", record_fact: "Retention: indefinite.", application: "The record describes retention past the first anniversary." },
    ],
    consequence_determination: {
      unlawful_now: [{ duty: "Destruction within one year of expiry of the collection purpose", citation: "Tex. Bus. & Com. Code § 503.001(c)(3)", statute_short: "CUBI" }],
      unresolved_on_record: [],
    },
  };
  const intake: Bag = { orgName: "Synthara Intelligence Ltd", orgType: "Employer (employee biometrics)", jurisdictions: ["Texas (CUBI)"] };
  const out = assembleBiometricSkeletonDocument(report as never, intake as never);
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Record. The company reports that it does not disclose biometric data to third parties");
  assert(!text.includes("has answered that the company reports"), "no double provenance");
  assertStringIncludes(text, "Record. Security measures: AES-256 encryption at rest");
  assert(!text.includes("has answered that security measures"), "no label leak");
  assertStringIncludes(text, TEXAS_DESTRUCTION_CLOCK_SENTENCE);
  assert(!text.includes("whichever occurs first"), "the BIPA clock needs an Illinois row");
  const panel = out.document.sections.flatMap((s) => s.paragraphs).find((p) => p.kind === "table" && p.table?.title === "Action panel")!.table!;
  assertEquals(panel.columns, ["#", "Action", "Owner"]);
  assertStringIncludes(panel.rows[0][1], "Immediate remediation — remedy");
});

// ── 3.10 — IR ─────────────────────────────────────────────────────────────

Deno.test("doc259 — IR: a generic sector drops the clause; the SEC row asks for the Item 1.05 materiality determination, not the state facts", () => {
  const intake: Bag = {
    organizationName: "Syntherion Intelligence Corp.", organisationType: "Company", discoveryDateTime: "2026-09-10T10:00", cause: "Ransomware or malware",
    dataTypes: ["Government IDs / SSN", "Financial / payment data"], affectedCount: "1,000–10,000", jurisdictions: ["California", "United States (SEC)"], contained: "No",
    responseTeamRoster: [{ role: "Incident Lead", name: "J. Ortiz", alternate: "P. Chen" }],
  };
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(report, intake).document);
  assert(!text.includes("sector not recorded") && !text.includes("in its sector ()"), "generic sector drops the clause");
  assertStringIncludes(text, "the company has recorded.");
  assertStringIncludes(text, "resolve the outstanding materiality determination under Item 1.05");
  assertStringIncludes(text, "resolve the outstanding encryption and acquisition facts");
  const named: Bag = { ...intake, organisationType: "Logistics operator" };
  const namedReport: Bag = {};
  attachIrPlaybookDeliverables(namedReport, named);
  assertStringIncludes(skeletonDocumentToText(assembleIRSkeletonDocument(namedReport, named).document), "for an organisation in its sector (Logistics operator)");
});

// ── 3.12 — US notice ──────────────────────────────────────────────────────

const CA: StateRow = { state_code: "CA", state_name: "California", framework_type: "ccpa" };
const VA: StateRow = { state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" };
const US_ANSWERS: Bag = {
  business_name: "Syntherion Intelligence Corp.", business_description: "A large-scale online platform providing cloud-based software.", contact_email: "privacy@syntherion.example",
  data_categories: ["identifiers", "internet_activity"], collection_purposes: ["service_delivery", "advertising"], data_sources: "Directly from you",
  third_party_sharing: "yes", third_party_categories: ["service_providers"], sale_or_sharing: "sell_and_share", retention_general: "24 months",
  ccpa_sensitive_data: "no", ccpa_minors: "no", ccpa_financial_incentive: "no", ccpa_admt: "no",
};

Deno.test("doc259 — US notice: the Section 6 title names California sharing only where California is in the edition", () => {
  const va = buildUsNoticeHtml(VA, US_ANSWERS, "September 11, 2026");
  assertStringIncludes(va, "Sale and Targeted Advertising");
  assert(!va.includes("California Sharing"), "no California-only title outside California");
  assertStringIncludes(buildUsNoticeHtml(CA, US_ANSWERS, "September 11, 2026"), "Sale, California Sharing and Targeted Advertising");
});

// ── 3.13 — DPA: the detector lives in generate-dpa/index.ts, which boots the
// edge runtime on import; the lint-filter change is covered by deno check and
// by the next all-products batch (the Synthara DPA run).
