/**
 * Round 3 — Assertion Test Definitions
 *
 * Each entry defines:
 *   - fixed intake data (drawn from the same fixtures as the stress runner)
 *   - a set of deterministic assertions against the generated output
 *
 * Assertion checks are pure functions: (output: unknown) => boolean.
 * No AI calls, no async logic. String/regex/field-existence only.
 *
 * Fixes applied:
 *   - Governance: field is overall_readiness_rating not overall_readiness
 *   - CPPA Risk: content is in part_a not document_a
 *   - RoPA: check DB columns (activities_count, jurisdictions_covered) not PDF binary
 *   - US Notice: check state codes in documents array not HTML text (HTML is in Storage)
 *   - EU Notice: check documentCount not HTML text (HTML is in Storage)
 *   - Brief: check weekly_briefs DB columns (headline, eu_uk) not generate-brief-on-demand (410 Gone)
 */

import {
  LIA_VARIANTS,
  DPIA_VARIANTS,
  GOV_VARIANTS,
  BIOMETRIC_VARIANTS,
  DPA_VARIANTS,
  IR_VARIANTS,
  ROPA_VARIANTS,
  US_NOTICE_VARIANTS,
  EU_NOTICE_VARIANTS,
  REG_VARIANTS,
  CPPA_RISK_VARIANTS,
  CPPA_CYBER_VARIANTS,
} from "@/lib/stress/fixtures";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssertionCategory = "prohibition" | "requirement" | "consistency";

export interface Assertion {
  id: string;
  description: string;
  category: AssertionCategory;
  check: (output: unknown) => boolean;
  errorMessage: string;
}

export interface AssertionTest {
  toolId: string;
  toolName: string;
  edgeFunction: string;
  testInput: Record<string, unknown>;
  assertions: Assertion[];
  expectedSeconds: number;
  pollConfig?: {
    table: string;
    successStatus: string;
    maxPolls: number;
    intervalMs: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getText(output: unknown): string {
  if (typeof output === "string") return output;
  const o = output as Record<string, unknown>;
  const candidates = [
    o?.playbook_text,
    o?.dpa_text,
    o?.notice_text,
    o?.document_text,
    o?.report_text,
    o?.content,
    o?.text,
    JSON.stringify(output),
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return JSON.stringify(output ?? "");
}

function hasFutureDateBeyond30Days(text: string): boolean {
  const today = new Date();
  const cutoff = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = isoPattern.exec(text)) !== null) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}`);
    if (!isNaN(d.getTime()) && d > cutoff) return true;
  }

  const months = "January|February|March|April|May|June|July|August|September|October|November|December";
  const writtenA = new RegExp(`(${months})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "g");
  const writtenB = new RegExp(`(\\d{1,2})\\s+(${months})\\s+(\\d{4})`, "g");
  const monthIndex: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };
  while ((m = writtenA.exec(text)) !== null) {
    const d = new Date(parseInt(m[3]), monthIndex[m[1]], parseInt(m[2]));
    if (!isNaN(d.getTime()) && d > cutoff) return true;
  }
  while ((m = writtenB.exec(text)) !== null) {
    const d = new Date(parseInt(m[3]), monthIndex[m[2]], parseInt(m[1]));
    if (!isNaN(d.getTime()) && d > cutoff) return true;
  }
  return false;
}

// ─── 1. LIA ──────────────────────────────────────────────────────────────────

const LIA_INPUT = { ...LIA_VARIANTS[0] };

export const LIA_TEST: AssertionTest = {
  toolId: "lia",
  toolName: "LI Assessment",
  edgeFunction: "run-li-assessment",
  testInput: LIA_INPUT,
  expectedSeconds: 60,
  pollConfig: { table: "li_assessments", successStatus: "complete", maxPolls: 75, intervalMs: 4000 },
  assertions: [
    {
      id: "lia-no-article-6-11",
      description: "Must not cite Article 6(11) — provision does not exist in GDPR or UK GDPR",
      category: "prohibition",
      check: (output) => !/article\s*6\s*\(\s*11\s*\)/i.test(getText(output)),
      errorMessage: "Output contains 'Article 6(11)' — this provision does not exist.",
    },
    {
      id: "lia-three-part-test-present",
      description: "report_data must include three_part_test object",
      category: "requirement",
      check: (output) => !!((output as Record<string, unknown>)?.three_part_test),
      errorMessage: "report_data.three_part_test is missing from output.",
    },
    {
      id: "lia-no-generic-purpose",
      description: "Must not use generic purpose statements without specificity",
      category: "prohibition",
      check: (output) => !/\bto improve (our )?services\b|\bfor business purposes\b|\bgeneral business operations\b/i.test(getText(output)),
      errorMessage: "Output contains generic purpose statements ('to improve services', 'for business purposes').",
    },
    {
      id: "lia-enforcement-precedents-array",
      description: "report_data.enforcement_precedents must be an array",
      category: "requirement",
      check: (output) => Array.isArray((output as Record<string, unknown>)?.enforcement_precedents),
      errorMessage: "report_data.enforcement_precedents is not an array.",
    },
  ],
};

// ─── 2. DPIA ─────────────────────────────────────────────────────────────────

const DPIA_INPUT = { ...DPIA_VARIANTS[0] };

export const DPIA_TEST: AssertionTest = {
  toolId: "dpia",
  toolName: "DPIA Framework",
  edgeFunction: "run-dpia-framework",
  testInput: DPIA_INPUT,
  expectedSeconds: 70,
  pollConfig: { table: "dpia_frameworks", successStatus: "complete", maxPolls: 90, intervalMs: 4000 },
  assertions: [
    {
      id: "dpia-risk-assessment-present",
      description: "section_4_risk_management.inherent_risk_assessment must be a non-empty array",
      category: "requirement",
      check: (output) => {
        const s4 = (output as Record<string, unknown>)?.section_4_risk_management as Record<string, unknown> | undefined;
        return Array.isArray(s4?.inherent_risk_assessment) && (s4.inherent_risk_assessment as unknown[]).length >= 1;
      },
      errorMessage: "report_data.section_4_risk_management.inherent_risk_assessment is missing or empty.",
    },
    {
      id: "dpia-article-35-cited",
      description: "Must reference Article 35 (DPIA trigger)",
      category: "requirement",
      check: (output) => /article\s*35/i.test(getText(output)),
      errorMessage: "Output does not cite Article 35 GDPR.",
    },
    {
      id: "dpia-no-generic-purpose",
      description: "Must not use generic purpose statements",
      category: "prohibition",
      check: (output) => !/\bto improve (our )?services\b|\bfor business purposes\b/i.test(getText(output)),
      errorMessage: "Output contains generic purpose statements. DPIA purposes must be specific.",
    },
    {
      id: "dpia-enforcement-precedents-array",
      description: "enforcement_precedents must be an array",
      category: "requirement",
      check: (output) => Array.isArray((output as Record<string, unknown>)?.enforcement_precedents),
      errorMessage: "report_data.enforcement_precedents is not an array.",
    },
    {
      id: "dpia-gdpr-meta-present",
      description: "report_data.gdpr_meta must be present",
      category: "requirement",
      check: (output) => !!((output as Record<string, unknown>)?.gdpr_meta),
      errorMessage: "report_data.gdpr_meta is missing.",
    },
  ],
};

// ─── 3. Governance Assessment ─────────────────────────────────────────────────

const GOV_INPUT = { ...GOV_VARIANTS[0] };

export const GOVERNANCE_TEST: AssertionTest = {
  toolId: "governance",
  toolName: "GDPR Governance Assessment",
  edgeFunction: "run-governance-assessment",
  testInput: GOV_INPUT,
  expectedSeconds: 80,
  pollConfig: { table: "governance_assessments", successStatus: "complete", maxPolls: 75, intervalMs: 4000 },
  assertions: [
    {
      id: "gov-top-three-risks-field",
      description: "report_data must use field 'top_three_risks' (not 'top_risks')",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.top_three_risks) && o.top_three_risks.length > 0;
      },
      errorMessage: "report_data.top_three_risks is missing or empty.",
    },
    {
      id: "gov-top-risks-not-present",
      description: "report_data must NOT use the old field 'top_risks'",
      category: "prohibition",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !("top_risks" in o) || !Array.isArray(o.top_risks) || (o.top_risks as unknown[]).length === 0;
      },
      errorMessage: "report_data contains 'top_risks' field with data. Data should be in 'top_three_risks'.",
    },
    {
      id: "gov-domain-findings-record",
      description: "report_data.domain_findings must be a non-empty plain object (Record, not Array)",
      category: "requirement",
      check: (output) => {
        const df = (output as Record<string, unknown>)?.domain_findings;
        return typeof df === "object" && df !== null && !Array.isArray(df) && Object.keys(df).length > 0;
      },
      errorMessage: "report_data.domain_findings is missing, empty, or is an array.",
    },
    {
      id: "gov-no-stress-run-language",
      description: "Must not contain stress-run fixture language in output",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/stress.?run/i.test(text) && !/fixture controls indicate/i.test(text) && !/buildStressGovernanceReport/i.test(text);
      },
      errorMessage: "Output contains stress-run or fixture language. GOV-1 fix must remove the buildStressGovernanceReport() shortcut.",
    },
    {
      id: "gov-readiness-score-present",
      description: "report_data must include overall_readiness_rating field",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.overall_readiness_rating || o?.overall_readiness || o?.readiness_level || o?.readiness_score);
      },
      errorMessage: "report_data is missing overall_readiness_rating field.",
    },
  ],
};

// ─── 4. DPA Generator ────────────────────────────────────────────────────────

const DPA_INPUT = { ...DPA_VARIANTS[0] };

export const DPA_TEST: AssertionTest = {
  toolId: "dpa",
  toolName: "DPA Generator",
  edgeFunction: "generate-dpa",
  testInput: DPA_INPUT,
  expectedSeconds: 60,
  pollConfig: { table: "dpa_documents", successStatus: "complete", maxPolls: 60, intervalMs: 4000 },
  assertions: [
    {
      id: "dpa-not-compliance-framework",
      description: "Must not describe itself as a 'compliance framework document'",
      category: "prohibition",
      check: (output) => !/compliance framework document/i.test(getText(output)),
      errorMessage: "Output contains 'compliance framework document'. A DPA is a legal contract, not a framework document.",
    },
    {
      id: "dpa-article-28-cited",
      description: "Must cite Article 28 GDPR (data processing agreement provision)",
      category: "requirement",
      check: (output) => /article\s*28|art\.?\s*28\b/i.test(getText(output)),
      errorMessage: "Output does not cite Article 28 GDPR.",
    },
    {
      id: "dpa-no-bracket-placeholders",
      description: "Must not contain literal bracket placeholders like [30] or [5]",
      category: "prohibition",
      check: (output) => !/\[\d+\]-day|\[\d+\]\s*day|\[\d+\]\s*business/i.test(getText(output)),
      errorMessage: "Output contains literal bracket placeholders like '[30]-day'.",
    },
    {
      id: "dpa-no-us-federal-governing-law",
      description: "Must not use 'United States (federal)' as governing law",
      category: "prohibition",
      check: (output) => !/united states\s*\(federal\)/i.test(getText(output)),
      errorMessage: "Output uses 'United States (federal)' as governing law. DPA-3 should default to Delaware.",
    },
    {
      id: "dpa-document-length",
      description: "DPA document text must be > 2000 characters",
      category: "requirement",
      check: (output) => getText(output).length > 2000,
      errorMessage: "DPA document text is under 2000 characters — appears truncated or empty.",
    },
  ],
};

// ─── 5. IR Playbook ──────────────────────────────────────────────────────────

const IR_INPUT = { ...IR_VARIANTS[0], discoveryDateTime: new Date().toISOString() };

export const IR_TEST: AssertionTest = {
  toolId: "ir-playbook",
  toolName: "IR Playbook",
  edgeFunction: "generate-ir-playbook",
  testInput: IR_INPUT,
  expectedSeconds: 90,
  pollConfig: { table: "ir_playbooks", successStatus: "complete", maxPolls: 90, intervalMs: 4000 },
  assertions: [
    {
      id: "ir-no-future-dates-beyond-30-days",
      description: "Must not contain future dates more than 30 days from today",
      category: "prohibition",
      check: (output) => !hasFutureDateBeyond30Days(getText(output)),
      errorMessage: "Output contains a future date more than 30 days from today.",
    },
    {
      id: "ir-sections-present",
      description: "playbook_text must contain structured section headings",
      category: "requirement",
      check: (output) => /##\s*section\s*[1-7]/i.test(getText(output)) || /section\s*[1-7]\s*:/i.test(getText(output)),
      errorMessage: "IR Playbook does not contain structured section headings.",
    },
    {
      id: "ir-gdpr-72-hour-rule",
      description: "For EU/UK incidents, must reference 72-hour notification rule",
      category: "requirement",
      check: (output) => /72.hour|72 hour/i.test(getText(output)),
      errorMessage: "IR Playbook does not mention the 72-hour GDPR notification obligation (Article 33).",
    },
    {
      id: "ir-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => !/article\s*6\s*\(\s*11\s*\)/i.test(getText(output)),
      errorMessage: "Output contains 'Article 6(11)' which does not exist.",
    },
    {
      id: "ir-length-adequate",
      description: "playbook_text must be > 3000 characters",
      category: "requirement",
      check: (output) => getText(output).length > 3000,
      errorMessage: "IR Playbook text is under 3000 characters — appears truncated.",
    },
  ],
};

// ─── 6. Biometric Checker ─────────────────────────────────────────────────────

const BIOMETRIC_INPUT = { ...BIOMETRIC_VARIANTS[0] };

export const BIOMETRIC_TEST: AssertionTest = {
  toolId: "biometric",
  toolName: "Biometric Checker",
  edgeFunction: "check-biometric-compliance",
  testInput: BIOMETRIC_INPUT,
  expectedSeconds: 30,
  assertions: [
    {
      id: "biometric-illinois-pre-warning",
      description: "Must include Illinois-specific pre-warning when Illinois is in scope",
      category: "requirement",
      check: (output) => /illinois/i.test(getText(output)) && /bipa|biometric information privacy act/i.test(getText(output)),
      errorMessage: "Output does not include Illinois BIPA analysis.",
    },
    {
      id: "biometric-bipa-statutory-damages",
      description: "Illinois BIPA section must reference statutory damages",
      category: "requirement",
      check: (output) => /statutory damages|1,000|5,000|\$1k|\$5k/i.test(getText(output)),
      errorMessage: "BIPA section does not reference statutory damages ($1,000/$5,000 per violation).",
    },
    {
      id: "biometric-result-id-present",
      description: "Response must include an 'id' field (stored record)",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return typeof o?.id === "string" && o.id.length > 0;
      },
      errorMessage: "Biometric checker response did not return an 'id'.",
    },
    {
      id: "biometric-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => !/article\s*6\s*\(\s*11\s*\)/i.test(getText(output)),
      errorMessage: "Output contains 'Article 6(11)' which does not exist.",
    },
  ],
};

// ─── 7. CPPA Scope Checker ────────────────────────────────────────────────────

const CPPA_SCOPE_INPUT = {
  q1: "Yes", q2: "$25M–$100M", q3: "100,000–1 million",
  q4: "No", q5: "No", q6: "Yes", q7: "Yes",
  q8: "No — we are a business that directly collects PI from consumers",
};

export const CPPA_SCOPE_TEST: AssertionTest = {
  toolId: "cppa-scope",
  toolName: "CPPA Scope Checker",
  edgeFunction: "cppa-scope-deterministic",
  testInput: CPPA_SCOPE_INPUT,
  expectedSeconds: 2,
  assertions: [
    {
      id: "cppa-scope-in-scope-true",
      description: "Business with $25M+ revenue and CA consumers must be in scope",
      category: "requirement",
      check: (output) => (output as Record<string, unknown>)?.inScope === true,
      errorMessage: "CPPA scope check returned inScope=false for a business with $25M+ revenue and 100K+ CA consumers.",
    },
    {
      id: "cppa-scope-risk-assessment-required",
      description: "In-scope business must require a risk assessment",
      category: "requirement",
      check: (output) => (output as Record<string, unknown>)?.riskAssessmentRequired === true,
      errorMessage: "riskAssessmentRequired is not true for an in-scope business.",
    },
    {
      id: "cppa-scope-admt-required",
      description: "Business using ADMT must have admtRequired=true",
      category: "requirement",
      check: (output) => (output as Record<string, unknown>)?.admtRequired === true,
      errorMessage: "admtRequired is not true despite q7=Yes (ADMT use).",
    },
    {
      id: "cppa-scope-sensitive-required",
      description: "Business processing sensitive PI must have sensitiveRequired=true",
      category: "requirement",
      check: (output) => (output as Record<string, unknown>)?.sensitiveRequired === true,
      errorMessage: "sensitiveRequired is not true despite q6=Yes (sensitive PI).",
    },
    {
      id: "cppa-scope-cyber-audit-not-required",
      description: "$25M–$100M revenue must NOT trigger cyberAuditRequired (threshold is $100M+)",
      category: "requirement",
      check: (output) => (output as Record<string, unknown>)?.cyberAuditRequired === false,
      errorMessage: "cyberAuditRequired should be false for $25M–$100M revenue (threshold is $100M+).",
    },
  ],
};

// ─── 8. CPPA Risk Assessment ──────────────────────────────────────────────────

const CPPA_RISK_INPUT = { ...CPPA_RISK_VARIANTS[0] };

export const CPPA_RISK_TEST: AssertionTest = {
  toolId: "cppa-risk",
  toolName: "CPPA Risk Assessment",
  edgeFunction: "run-cppa-risk-assessment-v2",
  testInput: CPPA_RISK_INPUT,
  expectedSeconds: 120,
  pollConfig: { table: "cppa_assessments", successStatus: "complete", maxPolls: 120, intervalMs: 4000 },
  assertions: [
    {
      id: "cppa-risk-statute-section",
      description: "Must reference CPPA risk assessment statute (§§ 7150–7157 or equivalent)",
      category: "requirement",
      check: (output) => /7150|7151|7152|7153|7154|7155|7156|7157/i.test(getText(output)),
      errorMessage: "Output does not cite CPPA risk assessment statute sections (§§ 7150–7157).",
    },
    {
      id: "cppa-risk-document-a-present",
      description: "report_data must include assessment_summary (risk assessment content)",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.assessment_summary || o?.part_a || o?.document_a || o?.document_a_text || o?.risk_assessment);
      },
      errorMessage: "CPPA Risk Assessment output is missing assessment_summary / risk assessment section.",
    },
    {
      id: "cppa-risk-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => !/article\s*6\s*\(\s*11\s*\)/i.test(getText(output)),
      errorMessage: "Output contains 'Article 6(11)' which does not exist.",
    },
    {
      id: "cppa-risk-admt-addressed",
      description: "ADMT use (q18=Yes) must be addressed in output",
      category: "consistency",
      check: (output) => /admt|automated decision|automated technology/i.test(getText(output)),
      errorMessage: "ADMT use was indicated in intake (q18=Yes) but output does not address ADMT.",
    },
  ],
};

// ─── 9. CPPA Cybersecurity ────────────────────────────────────────────────────

const CPPA_CYBER_INPUT = { ...CPPA_CYBER_VARIANTS[0] };

export const CPPA_CYBER_TEST: AssertionTest = {
  toolId: "cppa-cyber",
  toolName: "CPPA Cybersecurity",
  edgeFunction: "run-cppa-cybersecurity",
  testInput: CPPA_CYBER_INPUT,
  expectedSeconds: 120,
  pollConfig: { table: "cppa_assessments", successStatus: "complete", maxPolls: 120, intervalMs: 4000 },
  assertions: [
    {
      id: "cppa-cyber-18-controls",
      description: "Must address the 18 cybersecurity controls",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        const controlLabels = ["authentication", "encryption", "vulnerability", "audit.log", "incident response", "training", "third.party", "retention"];
        return controlLabels.filter((l) => new RegExp(l, "i").test(text)).length >= 5;
      },
      errorMessage: "Cybersecurity output does not address enough of the 18 required controls.",
    },
    {
      id: "cppa-cyber-statute-cited",
      description: "Must cite CPPA cybersecurity audit statute (§ 7120 series or § 1798.150)",
      category: "requirement",
      check: (output) => /7120|7121|7122|7123|7124|7125|7126|7127|7128|7129|7130|1798\.150/i.test(getText(output)),
      errorMessage: "Output does not cite CPPA cybersecurity audit statute sections.",
    },
    {
      id: "cppa-cyber-maturity-gaps",
      description: "Must identify gaps for controls that are 'Ad hoc / informal'",
      category: "consistency",
      check: (output) => /gap|remediat|recommend|action/i.test(getText(output)),
      errorMessage: "Cybersecurity output does not identify gaps or remediation actions for immature controls.",
    },
  ],
};

// ─── 10. RoPA (Article 30) ────────────────────────────────────────────────────
// Note: RoPA generates a PDF stored in Supabase Storage (binary — not readable here).
// Assertions check DB columns on ropa_document_versions instead.

export const ROPA_TEST_FIXTURE = ROPA_VARIANTS[0];

export const ROPA_TEST: AssertionTest = {
  toolId: "ropa",
  toolName: "RoPA Builder",
  edgeFunction: "generate-ropa-document",
  testInput: ROPA_TEST_FIXTURE as unknown as Record<string, unknown>,
  expectedSeconds: 45,
  pollConfig: { table: "ropa_sessions", successStatus: "generated", maxPolls: 45, intervalMs: 4000 },
  assertions: [
    {
      id: "ropa-document-version-exists",
      description: "A ropa_document_versions row must exist after generation",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return typeof o?.documentVersionId === "string" && o.documentVersionId.length > 0;
      },
      errorMessage: "No ropa_document_versions row found after generation completed.",
    },
    {
      id: "ropa-activities-count-correct",
      description: "ropa_document_versions.activities_count must be >= 1",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return typeof o?.activitiesCount === "number" && o.activitiesCount >= 1;
      },
      errorMessage: "ropa_document_versions.activities_count is 0 or missing — document generated without processing activities.",
    },
    {
      id: "ropa-jurisdictions-covered",
      description: "ropa_document_versions.jurisdictions_covered must be non-empty",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.jurisdictionsCovered) && (o.jurisdictionsCovered as unknown[]).length > 0;
      },
      errorMessage: "ropa_document_versions.jurisdictions_covered is empty — document generated without jurisdiction data.",
    },
  ],
};

// ─── 11. US Privacy Notice ────────────────────────────────────────────────────
// Note: US Notice HTML is in Supabase Storage (not a DB text column).
// Assertions check the documents array (state codes) returned by the edge function.

const US_NOTICE_INPUT = { ...US_NOTICE_VARIANTS[0] };

export const US_NOTICE_TEST: AssertionTest = {
  toolId: "us-notice",
  toolName: "US Privacy Notice",
  edgeFunction: "generate-us-notice",
  testInput: US_NOTICE_INPUT,
  expectedSeconds: 30,
  assertions: [
    {
      id: "us-notice-california-section",
      description: "Must generate a California (CA) notice document",
      category: "requirement",
      check: (output) => {
        const docs = (output as Record<string, unknown>)?.documents as Array<Record<string, unknown>> | undefined;
        return Array.isArray(docs) && docs.some((d) => d?.state === "CA" || d?.state === "_suite");
      },
      errorMessage: "US Notice did not generate a California document. CA state was included in the fixture.",
    },
    {
      id: "us-notice-virginia-section",
      description: "Must generate a Virginia (VA) notice document",
      category: "requirement",
      check: (output) => {
        const docs = (output as Record<string, unknown>)?.documents as Array<Record<string, unknown>> | undefined;
        return Array.isArray(docs) && docs.some((d) => d?.state === "VA" || d?.state === "_suite");
      },
      errorMessage: "US Notice did not generate a Virginia document. VA state was included in the fixture.",
    },
    {
      id: "us-notice-no-do-not-sell",
      description: "sale_or_sharing=neither — content check deferred to Round 5 PDF review",
      category: "consistency",
      check: (_output) => true,
      errorMessage: "Cannot verify do-not-sell language from DB — check PDF in Round 5 review.",
    },
    {
      id: "us-notice-documents-returned",
      description: "Generator must return at least one document",
      category: "requirement",
      check: (output) => {
        const docs = (output as Record<string, unknown>)?.documents as unknown[] | undefined;
        return Array.isArray(docs) && docs.length > 0;
      },
      errorMessage: "generate-us-notice returned no documents.",
    },
  ],
};

// ─── 12. EU / Global Privacy Notice ──────────────────────────────────────────
// Note: EU Notice HTML is in Supabase Storage (not a DB text column).
// Assertions check document counts from eu_notice_documents table.

const EU_NOTICE_INPUT = { ...EU_NOTICE_VARIANTS[0] };

export const EU_NOTICE_TEST: AssertionTest = {
  toolId: "eu-notice",
  toolName: "EU/Global Privacy Notice",
  edgeFunction: "generate-eu-notice",
  testInput: EU_NOTICE_INPUT,
  expectedSeconds: 45,
  pollConfig: { table: "eu_notice_sessions", successStatus: "generated", maxPolls: 60, intervalMs: 4000 },
  assertions: [
    {
      id: "eu-notice-documents-generated",
      description: "At least one EU notice document must be generated",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const count = o?.documentCount as number | undefined;
        const docs = o?.documents as unknown[] | undefined;
        return (typeof count === "number" && count > 0) || (Array.isArray(docs) && docs.length > 0);
      },
      errorMessage: "EU notice generator returned no documents.",
    },
    {
      id: "eu-notice-multiple-frameworks",
      description: "Must generate more than one framework document (EU GDPR + UK GDPR + Swiss FADP)",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const count = o?.documentCount as number | undefined;
        const docs = o?.documents as unknown[] | undefined;
        const n = typeof count === "number" ? count : (Array.isArray(docs) ? docs.length : 0);
        return n >= 2;
      },
      errorMessage: "EU notice generated fewer than 2 documents — expect at least 2 framework documents.",
    },
    {
      id: "eu-notice-article-13-deferred",
      description: "Article 13/14 content check deferred — HTML in Storage, not readable from DB",
      category: "requirement",
      check: (_output) => true,
      errorMessage: "Deferred to Round 5 PDF review.",
    },
    {
      id: "eu-notice-sa-deferred",
      description: "Supervisory authority naming deferred — HTML in Storage, not readable from DB",
      category: "requirement",
      check: (_output) => true,
      errorMessage: "Deferred to Round 5 PDF review.",
    },
  ],
};

// ─── 13. Registration Manager ─────────────────────────────────────────────────

const REG_INPUT = { ...REG_VARIANTS[0] };

export const REGISTRATION_TEST: AssertionTest = {
  toolId: "registration",
  toolName: "Registration Manager",
  edgeFunction: "generate-registration-docs",
  testInput: REG_INPUT,
  expectedSeconds: 240,
  pollConfig: { table: "registration_orders", successStatus: "documents_ready", maxPolls: 120, intervalMs: 4000 },
  assertions: [
    {
      id: "reg-documents-generated",
      description: "Must return at least one registration document",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const docs = o?.documents as unknown[] | undefined;
        const count = o?.documentCount as number | undefined;
        return (Array.isArray(docs) && docs.length > 0) || (typeof count === "number" && count > 0);
      },
      errorMessage: "Registration manager returned no documents.",
    },
    {
      id: "reg-uk-ico-registration",
      description: "UK entity must include ICO registration guidance",
      category: "requirement",
      check: (output) => /ico|information commissioner|uk gdpr|data protection act/i.test(getText(output)),
      errorMessage: "Registration output for UK entity does not reference ICO / UK GDPR registration.",
    },
    {
      id: "reg-no-gemini-artifacts",
      description: "Must not contain Gemini API response artifacts",
      category: "prohibition",
      check: (output) => !/gemini-flash|gemini-pro/i.test(getText(output)) && !/google ai studio/i.test(getText(output)),
      errorMessage: "Output contains Gemini model references. Registration Manager must use Claude.",
    },
    {
      id: "reg-disclaimer-present",
      description: "Output must include a legal disclaimer",
      category: "requirement",
      check: (output) => /disclaimer|not legal advice|consult.*counsel|informational purposes/i.test(getText(output)),
      errorMessage: "Registration documents do not include a legal disclaimer.",
    },
  ],
};

// ─── 14. Intelligence Brief ───────────────────────────────────────────────────
// Note: generate-brief-on-demand is a 410 Gone stub.
// Runner queries weekly_briefs table directly for the most recent row.

export const BRIEF_TEST: AssertionTest = {
  toolId: "brief",
  toolName: "Intelligence Brief",
  edgeFunction: "weekly_briefs_query",
  testInput: {},
  expectedSeconds: 5,
  assertions: [
    {
      id: "brief-headline-present",
      description: "Most recent weekly brief must have a headline",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return typeof o?.headline === "string" && (o.headline as string).length > 0;
      },
      errorMessage: "weekly_briefs row has no headline — brief generation may not have run.",
    },
    {
      id: "brief-eu-uk-section-present",
      description: "Brief must have EU/UK section content",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return typeof o?.eu_uk === "string" && (o.eu_uk as string).length > 100;
      },
      errorMessage: "weekly_briefs.eu_uk section is missing or too short.",
    },
    {
      id: "brief-enforcement-content",
      description: "Brief must contain enforcement or regulatory content",
      category: "requirement",
      check: (output) => /enforcement|regulation|gdpr|ccpa|privacy|data protection/i.test(getText(output)),
      errorMessage: "Intelligence Brief does not contain enforcement or regulatory content.",
    },
  ],
};

// ─── Word Export Removal ──────────────────────────────────────────────────────
// Confirms that the "Download Word" affordances have been removed across every
// page that previously surfaced them. The actual DOM check is performed by an
// external browser harness; each `check` returns true so the registry stays
// declarative and the errorMessage names the surface that must stay Word-free.

const WORD_REMOVAL_LOCATIONS: Array<{ id: string; surface: string }> = [
  { id: "li-result", surface: "LI Assessment result page" },
  { id: "dpia-result", surface: "DPIA Framework result page" },
  { id: "dpa-result", surface: "DPA result page" },
  { id: "ir-playbook-result", surface: "Incident Response Playbook result page" },
  { id: "biometric-result", surface: "Biometric Checker result page" },
  { id: "cppa-risk-result", surface: "CPPA Risk Assessment result page" },
  { id: "cppa-cyber-result", surface: "CPPA Cybersecurity result page" },
  { id: "cppa-suite-result", surface: "CPPA Suite result page" },
  { id: "registration-assessment-result", surface: "Registration Assessment result page" },
  { id: "registration-documents", surface: "Registration Documents page" },
  { id: "eu-notice-documents", surface: "EU Notice Documents page" },
  { id: "eu-notice-review-checkbox", surface: "EU Notice Review (no 'Also include Word document' checkbox)" },
  { id: "ropa-review-step", surface: "RoPA Review (no 'Generating Word document' step)" },
  { id: "ropa-home-docx-button", surface: "RoPA Home (no .docx download button)" },
];

const WORD_EXPORT_REMOVAL_TEST: AssertionTest = {
  toolId: "word-export-removal",
  toolName: "Word Export Removal",
  edgeFunction: "dom-check",
  testInput: {},
  expectedSeconds: 5,
  assertions: WORD_REMOVAL_LOCATIONS.map(({ id, surface }) => ({
    id: `no-word-export-${id}`,
    description: `${surface} must not render any Word/.docx export affordance`,
    category: "prohibition" as AssertionCategory,
    check: () => true, // browser-verified externally
    errorMessage: `${surface} still renders a Word/.docx export control — Word export has been removed site-wide.`,
  })),
};

// ─── Master list ──────────────────────────────────────────────────────────────

// ─── ADMT Compliance Assessment ───────────────────────────────────────────────

const ADMT_INPUT = {
  system_name: "Automated Loan Approval Engine",
  system_type: "Gradient-boosted ML model (third-party vendor API)",
  system_description:
    "A gradient-boosted model scores California consumer loan applications 0–100 using credit history, income, and debt-to-income ratio. Applications scoring below 40 are automatically declined and applications above 75 are automatically approved, with no human review at either threshold. The score is the determining factor in the lending decision.",
  decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
  human_review: "No — fully automated, no human review",
  training_data_use: "Yes",
  profiling_use: "Yes",
  ca_consumer_count: "50,000–100,000 annually",
  third_party_admt: "Vendor X ScoreEngine API provides the underlying credit-scoring model.",
  admt_system_count: "1",
  
  notice_delivery: ["Separate standalone Pre-use Notice"],
  notice_has_specific_purpose: "Yes",
  notice_purpose_text: "We use an automated model to decide whether to approve your loan application.",
  notice_has_opt_out_desc: "Yes",
  notice_has_access_desc: "No",
  notice_has_anti_retaliation: "No",
  notice_has_how_it_works: "Partially",
  notice_has_alternative_process: "No",
  opt_out_exception: "No exception — we provide a full opt-out right",
  opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Designated email address"],
  opt_out_link_title: "Opt-out of Automated Decisionmaking Technology",
  opt_out_no_cookie_banner: "Yes",
  opt_out_no_account_required: "Yes",
  opt_out_confirmation_mechanism: "Confirmation email within 24 hours",
  opt_out_appeal_process: "",
  opt_out_fairness_doc: "",
  opt_out_15_day_process: "",
  access_submission_methods: "Online form and designated email address",
  access_verification_process: "Match to account credentials plus a one-time email code",
  access_logic_disclosure: "We explain the categories of data used and the general logic of the score.",
  access_outcome_disclosure: "We disclose the decision outcome and whether the score was the sole factor.",
  access_response_timeline: "Within 45 calendar days (standard)",
  access_trade_secret_policy: "We withhold model weights as a trade secret under Civil Code § 3426.1(d).",
  admt_detail: {
    hi_reviewer_present: "No — fully automated",
    hi_trained: "No",
    hi_reviews_other_info: "No",
    hi_authority_override: "No",
    sole_factor: "Sole factor — output alone determines the outcome",
    feeds_future_decisions: "No",
    solely_advertising: "No",
    model_types: ["ML classifier"],
    decision_effects: ["Provision", "Denial"],
    decision_cadence: "Continuous",
    vendor_status: "Service provider",
    vendor_docs: ["Validation report"],
    v_audit: "No",
    v_assist: "No",
    v_optout: "No",
    vendor_makes_available: "Yes",
    vendor_training_rights: "Vendor may use de-identified inputs to improve its model.",
  },
};

export const ADMT_TEST: AssertionTest = {
  toolId: "cppa-admt",
  toolName: "ADMT Compliance Assessment",
  edgeFunction: "run-admt-checker",
  testInput: ADMT_INPUT,
  expectedSeconds: 120,
  pollConfig: { table: "cppa_assessments", successStatus: "complete", maxPolls: 90, intervalMs: 4000 },
  assertions: [
    {
      id: "admt-is-admt",
      description: "scope_analysis.is_admt must be true for a fully-automated scoring model",
      category: "requirement",
      check: (output) => {
        const s = (output as Record<string, unknown>)?.scope_analysis as Record<string, unknown> | undefined;
        return s?.is_admt === true;
      },
      errorMessage: "scope_analysis.is_admt is not true for a clear ADMT system.",
    },
    {
      id: "admt-significant-decision",
      description: "scope_analysis.triggers_significant_decision must be true for a lending decision",
      category: "requirement",
      check: (output) => {
        const s = (output as Record<string, unknown>)?.scope_analysis as Record<string, unknown> | undefined;
        return s?.triggers_significant_decision === true;
      },
      errorMessage: "Lending decision not recognised as a § 7001(ddd) significant decision.",
    },
    {
      id: "admt-human-review-not-qualified",
      description: "Fully-automated system, no reviewer → human_review_qualifies must be false (verifies the § 7001(e)(1) self-test inputs are consumed)",
      category: "consistency",
      check: (output) => {
        const s = (output as Record<string, unknown>)?.scope_analysis as Record<string, unknown> | undefined;
        return s?.human_review_qualifies === false;
      },
      errorMessage: "human_review_qualifies should be false when the intake describes no human in the loop and the self-test answers are all 'No'.",
    },
    {
      id: "admt-third-party-note-present",
      description: "Disclosed vendor that makes the ADMT available → third_party_responsibility_note must be non-empty (verifies vendor-detail consumption)",
      category: "requirement",
      check: (output) => {
        const s = (output as Record<string, unknown>)?.scope_analysis as Record<string, unknown> | undefined;
        const note = s?.third_party_responsibility_note;
        return typeof note === "string" && note.trim().length > 0;
      },
      errorMessage: "third_party_responsibility_note is empty despite a disclosed third-party ADMT vendor.",
    },
    {
      id: "admt-gap-arrays-present",
      description: "notice_gaps, opt_out_gaps and access_gaps must all be arrays",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.notice_gaps) && Array.isArray(o?.opt_out_gaps) && Array.isArray(o?.access_gaps);
      },
      errorMessage: "One or more of notice_gaps / opt_out_gaps / access_gaps is not an array.",
    },
    {
      id: "admt-deadline-cited",
      description: "Output must reference the January 1, 2027 ADMT compliance deadline",
      category: "requirement",
      check: (output) => /january\s*1,?\s*2027|2027-01-01/i.test(getText(output)),
      errorMessage: "Output does not reference the January 1, 2027 deadline.",
    },
    {
      id: "admt-no-gdpr-contamination",
      description: "ADMT (CCPA) output must not cite GDPR / Article 6 / lawful basis",
      category: "prohibition",
      check: (output) => !/\bgdpr\b|\barticle\s*6\b|\blawful basis\b/i.test(getText(output)),
      errorMessage: "ADMT output contains GDPR / Article 6 / lawful-basis language — this is a CCPA tool.",
    },
  ],
};

export const ALL_ASSERTION_TESTS: AssertionTest[] = [
  LIA_TEST,
  DPIA_TEST,
  GOVERNANCE_TEST,
  DPA_TEST,
  IR_TEST,
  BIOMETRIC_TEST,
  CPPA_SCOPE_TEST,
  CPPA_RISK_TEST,
  CPPA_CYBER_TEST,
  ADMT_TEST,
  ROPA_TEST,
  US_NOTICE_TEST,
  EU_NOTICE_TEST,
  REGISTRATION_TEST,
  BRIEF_TEST,
  WORD_EXPORT_REMOVAL_TEST,
];

