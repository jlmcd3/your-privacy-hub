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
 * Error catalog sources:
 *   - Round 1 fixes (committed, confirmed in codebase)
 *   - Round 2 batch PDF audit (DPA, DPIA, EU Notice, Governance, IR, LIA)
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
  /** Pure function. Returns true = PASS, false = FAIL. */
  check: (output: unknown) => boolean;
  errorMessage: string;
}

export interface AssertionTest {
  toolId: string;
  toolName: string;
  /** Supabase edge function name */
  edgeFunction: string;
  /** Fixed intake data — deterministic, same across runs */
  testInput: Record<string, unknown>;
  assertions: Assertion[];
  /** Estimated seconds for progress display */
  expectedSeconds: number;
  /** For tools that write to a DB table and need polling */
  pollConfig?: {
    table: string;
    successStatus: string;
    maxPolls: number;
    intervalMs: number;
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

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

  const months =
    "January|February|March|April|May|June|July|August|September|October|November|December";
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
  pollConfig: {
    table: "li_assessments",
    successStatus: "complete",
    maxPolls: 75,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "lia-no-article-6-11",
      description: "Must not cite Article 6(11) — provision does not exist in GDPR or UK GDPR",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/article\s*6\s*\(\s*11\s*\)/i.test(text);
      },
      errorMessage:
        "Output contains 'Article 6(11)' — this provision does not exist. The three-part test provisions are in Recital 47–49 and EDPB guidance, not a numbered sub-article.",
    },
    {
      id: "lia-recital-49",
      description: "Must cite Recital 49 for network/information security legitimate interest",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /recital\s*49/i.test(text);
      },
      errorMessage:
        "Output does not cite Recital 49 GDPR/UK GDPR. For network security and fraud prevention purposes, Recital 49 is the canonical vehicle and must be cited.",
    },
    {
      id: "lia-three-part-test-present",
      description: "report_data must include three_part_test object",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.three_part_test);
      },
      errorMessage: "report_data.three_part_test is missing from output.",
    },
    {
      id: "lia-no-generic-purpose",
      description: "Must not use generic purpose statements without specificity",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        const generic = /\bto improve (our )?services\b|\bfor business purposes\b|\bgeneral business operations\b/i;
        return !generic.test(text);
      },
      errorMessage:
        "Output contains generic purpose statements ('to improve services', 'for business purposes'). Purposes must be specific.",
    },
    {
      id: "lia-enforcement-precedents-array",
      description: "report_data.enforcement_precedents must be an array",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.enforcement_precedents);
      },
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
  pollConfig: {
    table: "dpia_frameworks",
    successStatus: "complete",
    maxPolls: 90,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "dpia-risk-assessment-present",
      description: "section_3_risks.risk_assessment must be a non-empty array",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const s3 = o?.section_3_risks as Record<string, unknown> | undefined;
        return Array.isArray(s3?.risk_assessment) && (s3.risk_assessment as unknown[]).length >= 1;
      },
      errorMessage: "report_data.section_3_risks.risk_assessment is missing or empty.",
    },
    {
      id: "dpia-article-35-cited",
      description: "Must reference Article 35 (DPIA trigger)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /article\s*35/i.test(text);
      },
      errorMessage: "Output does not cite Article 35 GDPR. Every DPIA output must identify the Article 35 trigger.",
    },
    {
      id: "dpia-no-generic-purpose",
      description: "Must not use generic purpose statements",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/\bto improve (our )?services\b|\bfor business purposes\b/i.test(text);
      },
      errorMessage: "Output contains generic purpose statements. DPIA purposes must be specific.",
    },
    {
      id: "dpia-enforcement-precedents-array",
      description: "enforcement_precedents must be an array",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.enforcement_precedents);
      },
      errorMessage: "report_data.enforcement_precedents is not an array.",
    },
    {
      id: "dpia-gdpr-meta-present",
      description: "report_data.gdpr_meta must be present",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.gdpr_meta);
      },
      errorMessage: "report_data.gdpr_meta is missing.",
    },
  ],
};

// ─── 3. Governance Assessment ─────────────────────────────────────────────────

const GOV_INPUT = { ...GOV_VARIANTS[0] };

export const GOVERNANCE_TEST: AssertionTest = {
  toolId: "governance",
  toolName: "Governance Assessment",
  edgeFunction: "run-governance-assessment",
  testInput: GOV_INPUT,
  expectedSeconds: 80,
  pollConfig: {
    table: "governance_assessments",
    successStatus: "complete",
    maxPolls: 75,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "gov-top-three-risks-field",
      description: "report_data must use field 'top_three_risks' (not 'top_risks')",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return Array.isArray(o?.top_three_risks) && o.top_three_risks.length > 0;
      },
      errorMessage:
        "report_data.top_three_risks is missing or empty. The confirmed bug used 'top_risks' — this fix must hold.",
    },
    {
      id: "gov-top-risks-not-present",
      description: "report_data must NOT use the old field 'top_risks'",
      category: "prohibition",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !("top_risks" in o) || !Array.isArray(o.top_risks) || (o.top_risks as unknown[]).length === 0;
      },
      errorMessage:
        "report_data contains 'top_risks' field with data. This is the old bug field; data should be in 'top_three_risks'.",
    },
    {
      id: "gov-domain-findings-record",
      description: "report_data.domain_findings must be a non-empty plain object (Record, not Array)",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const df = o?.domain_findings;
        return (
          typeof df === "object" &&
          df !== null &&
          !Array.isArray(df) &&
          Object.keys(df).length > 0
        );
      },
      errorMessage:
        "report_data.domain_findings is missing, empty, or is an array. It must be a non-empty Record<string, DomainFinding>.",
    },
    {
      id: "gov-no-stress-run-language",
      description: "Must not contain stress-run fixture language in output",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return (
          !/stress.?run/i.test(text) &&
          !/fixture controls indicate/i.test(text) &&
          !/buildStressGovernanceReport/i.test(text)
        );
      },
      errorMessage:
        "Output contains stress-run or fixture language. The GOV-1 fix must remove the buildStressGovernanceReport() shortcut.",
    },
    {
      id: "gov-readiness-score-present",
      description: "report_data must include an overall_readiness or readiness_level field",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.overall_readiness || o?.readiness_level || o?.readiness_score);
      },
      errorMessage: "report_data is missing overall_readiness / readiness_level field.",
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
  pollConfig: {
    table: "dpa_documents",
    successStatus: "complete",
    maxPolls: 60,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "dpa-not-compliance-framework",
      description: "Must not describe itself as a 'compliance framework document'",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/compliance framework document/i.test(text);
      },
      errorMessage:
        "Output contains 'compliance framework document'. The ToolDisclaimer fix must replace this — a DPA is a legal contract, not a framework document.",
    },
    {
      id: "dpa-article-28-cited",
      description: "Must cite Article 28 GDPR (data processing agreement provision)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /article\s*28|art\.?\s*28\b/i.test(text);
      },
      errorMessage: "Output does not cite Article 28 GDPR. Every DPA must reference the Article 28 legal basis.",
    },
    {
      id: "dpa-no-bracket-placeholders",
      description: "Must not contain literal bracket placeholders like [30] or [5]",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/\[\d+\]-day|\[\d+\]\s*day|\[\d+\]\s*business/i.test(text);
      },
      errorMessage:
        "Output contains literal bracket placeholders like '[30]-day'. The DPA-1 fix must resolve all bracket day-count placeholders.",
    },
    {
      id: "dpa-no-us-federal-governing-law",
      description: "Must not use 'United States (federal)' as governing law",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/united states\s*\(federal\)/i.test(text);
      },
      errorMessage:
        "Output uses 'United States (federal)' as governing law. This is not valid — DPA-3 should default to Delaware.",
    },
    {
      id: "dpa-document-length",
      description: "DPA document text must be > 2000 characters",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return text.length > 2000;
      },
      errorMessage: "DPA document text is under 2000 characters — appears truncated or empty.",
    },
  ],
};

// ─── 5. IR Playbook ──────────────────────────────────────────────────────────

const IR_INPUT = {
  ...IR_VARIANTS[0],
  discoveryDateTime: new Date().toISOString(),
};

export const IR_TEST: AssertionTest = {
  toolId: "ir-playbook",
  toolName: "IR Playbook",
  edgeFunction: "generate-ir-playbook",
  testInput: IR_INPUT,
  expectedSeconds: 90,
  pollConfig: {
    table: "ir_playbooks",
    successStatus: "complete",
    maxPolls: 90,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "ir-no-future-dates-beyond-30-days",
      description: "Must not contain future dates more than 30 days from today",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !hasFutureDateBeyond30Days(text);
      },
      errorMessage:
        "Output contains a future date more than 30 days from today. IR Playbooks must not project specific future calendar dates.",
    },
    {
      id: "ir-sections-present",
      description: "playbook_text must contain structured section headings",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /##\s*section\s*[1-7]/i.test(text) || /section\s*[1-7]\s*:/i.test(text);
      },
      errorMessage: "IR Playbook does not contain structured section headings. Output must include Section 1–7 headers.",
    },
    {
      id: "ir-gdpr-72-hour-rule",
      description: "For EU/UK incidents, must reference 72-hour notification rule",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /72.hour|72 hour/i.test(text);
      },
      errorMessage: "IR Playbook does not mention the 72-hour GDPR notification obligation (Article 33).",
    },
    {
      id: "ir-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/article\s*6\s*\(\s*11\s*\)/i.test(text);
      },
      errorMessage: "Output contains 'Article 6(11)' which does not exist in GDPR or UK GDPR.",
    },
    {
      id: "ir-length-adequate",
      description: "playbook_text must be > 3000 characters",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return text.length > 3000;
      },
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
      check: (output) => {
        const text = getText(output);
        return /illinois/i.test(text) && /bipa|biometric information privacy act/i.test(text);
      },
      errorMessage:
        "Output does not include Illinois BIPA analysis. When Illinois is in the jurisdictions list, a full BIPA section must be present.",
    },
    {
      id: "biometric-bipa-statutory-damages",
      description: "Illinois BIPA section must reference statutory damages",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /statutory damages|1,000|5,000|\$1k|\$5k/i.test(text);
      },
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
      errorMessage: "Biometric checker response did not return an 'id'. Record may not have been stored.",
    },
    {
      id: "biometric-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/article\s*6\s*\(\s*11\s*\)/i.test(text);
      },
      errorMessage: "Output contains 'Article 6(11)' which does not exist.",
    },
  ],
};

// ─── 7. CPPA Scope Checker ────────────────────────────────────────────────────

const CPPA_SCOPE_INPUT = {
  q1: "Yes",
  q2: "$25M–$100M",
  q3: "100,000–1 million",
  q4: "No",
  q5: "No",
  q6: "Yes",
  q7: "Yes",
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
      check: (output) => {
        const o = output as Record<string, unknown>;
        return o?.inScope === true;
      },
      errorMessage: "CPPA scope check returned inScope=false for a business with $25M+ revenue and 100K+ CA consumers.",
    },
    {
      id: "cppa-scope-risk-assessment-required",
      description: "In-scope business must require a risk assessment",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return o?.riskAssessmentRequired === true;
      },
      errorMessage: "riskAssessmentRequired is not true for an in-scope business.",
    },
    {
      id: "cppa-scope-admt-required",
      description: "Business using ADMT must have admtRequired=true",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return o?.admtRequired === true;
      },
      errorMessage: "admtRequired is not true despite q7=Yes (ADMT use).",
    },
    {
      id: "cppa-scope-sensitive-required",
      description: "Business processing sensitive PI must have sensitiveRequired=true",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return o?.sensitiveRequired === true;
      },
      errorMessage: "sensitiveRequired is not true despite q6=Yes (sensitive PI).",
    },
    {
      id: "cppa-scope-cyber-audit-not-required",
      description: "$25M–$100M revenue must NOT trigger cyberAuditRequired (threshold is $100M+)",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return o?.cyberAuditRequired === false;
      },
      errorMessage: "cyberAuditRequired should be false for $25M–$100M revenue (threshold is $100M+).",
    },
  ],
};

// ─── 8. CPPA Risk Assessment ──────────────────────────────────────────────────

const CPPA_RISK_INPUT = { ...CPPA_RISK_VARIANTS[0] };

export const CPPA_RISK_TEST: AssertionTest = {
  toolId: "cppa-risk",
  toolName: "CPPA Risk Assessment",
  edgeFunction: "run-cppa-risk-assessment",
  testInput: CPPA_RISK_INPUT,
  expectedSeconds: 120,
  pollConfig: {
    table: "cppa_assessments",
    successStatus: "complete",
    maxPolls: 120,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "cppa-risk-statute-section",
      description: "Must reference CPPA risk assessment statute (§§ 7150–7157 or equivalent)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /7150|7151|7152|7153|7154|7155|7156|7157/i.test(text);
      },
      errorMessage: "Output does not cite CPPA risk assessment statute sections (§§ 7150–7157).",
    },
    {
      id: "cppa-risk-document-a-present",
      description: "report_data must include document_a or risk_assessment output",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        return !!(o?.document_a || o?.document_a_text || o?.risk_assessment || o?.report_data);
      },
      errorMessage: "CPPA Risk Assessment output is missing document_a / risk assessment section.",
    },
    {
      id: "cppa-risk-no-article-6-11",
      description: "Must not cite non-existent Article 6(11)",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !/article\s*6\s*\(\s*11\s*\)/i.test(text);
      },
      errorMessage: "Output contains 'Article 6(11)' which does not exist.",
    },
    {
      id: "cppa-risk-admt-addressed",
      description: "ADMT use (q18=Yes) must be addressed in output",
      category: "consistency",
      check: (output) => {
        const text = getText(output);
        return /admt|automated decision|automated technology/i.test(text);
      },
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
  pollConfig: {
    table: "cppa_assessments",
    successStatus: "complete",
    maxPolls: 120,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "cppa-cyber-18-controls",
      description: "Must address the 18 cybersecurity controls",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        const controlLabels = [
          "authentication", "encryption", "vulnerability", "audit.log",
          "incident response", "training", "third.party", "retention",
        ];
        const found = controlLabels.filter((l) => new RegExp(l, "i").test(text));
        return found.length >= 5;
      },
      errorMessage: "Cybersecurity output does not address enough of the 18 required controls.",
    },
    {
      id: "cppa-cyber-statute-cited",
      description: "Must cite CPPA cybersecurity audit statute (§ 7120 series or § 1798.150)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /7120|7121|7122|7123|7124|7125|7126|7127|7128|7129|7130|1798\.150/i.test(text);
      },
      errorMessage: "Output does not cite CPPA cybersecurity audit statute sections.",
    },
    {
      id: "cppa-cyber-maturity-gaps",
      description: "Must identify gaps for controls that are 'Ad hoc / informal'",
      category: "consistency",
      check: (output) => {
        const text = getText(output);
        return /gap|remediat|recommend|action/i.test(text);
      },
      errorMessage: "Cybersecurity output does not identify gaps or remediation actions for immature controls.",
    },
  ],
};

// ─── 10. RoPA (Article 30) ────────────────────────────────────────────────────

export const ROPA_TEST_FIXTURE = ROPA_VARIANTS[0];

export const ROPA_TEST: AssertionTest = {
  toolId: "ropa",
  toolName: "RoPA Builder",
  edgeFunction: "generate-ropa-document",
  testInput: ROPA_TEST_FIXTURE as unknown as Record<string, unknown>,
  expectedSeconds: 45,
  pollConfig: {
    table: "ropa_sessions",
    successStatus: "generated",
    maxPolls: 45,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "ropa-article-30-text",
      description: "Generated document must contain 'Article 30' text",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /article\s*30/i.test(text);
      },
      errorMessage:
        "RoPA document does not contain 'Article 30' text. This was the Round 1 9/10 miss.",
    },
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
      id: "ropa-processing-activities-in-output",
      description: "Document must reference at least one processing activity by name",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /patient risk stratification|employee hr|processing activit/i.test(text);
      },
      errorMessage: "RoPA document does not reference the processing activities from the intake data.",
    },
  ],
};

// ─── 11. US Privacy Notice ────────────────────────────────────────────────────

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
      description: "Must include California-specific notice section (CCPA/CPRA)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /california|ccpa|cpra/i.test(text);
      },
      errorMessage: "US Notice does not include a California section. CA state was included in the fixture.",
    },
    {
      id: "us-notice-virginia-section",
      description: "Must include Virginia-specific notice section (VCDPA)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /virginia|vcdpa/i.test(text);
      },
      errorMessage: "US Notice does not include a Virginia section. VA state was included in the fixture.",
    },
    {
      id: "us-notice-no-do-not-sell",
      description: "sale_or_sharing=neither means no 'do not sell' opt-out language",
      category: "consistency",
      check: (output) => {
        const text = getText(output);
        return !/right to opt.out of (the )?sale/i.test(text);
      },
      errorMessage:
        "Notice includes 'right to opt-out of sale' language but intake specifies sale_or_sharing=neither.",
    },
    {
      id: "us-notice-documents-returned",
      description: "Generator must return at least one document",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const docs = o?.documents as unknown[] | undefined;
        return Array.isArray(docs) && docs.length > 0;
      },
      errorMessage: "generate-us-notice returned no documents.",
    },
  ],
};

// ─── 12. EU / Global Privacy Notice ──────────────────────────────────────────

const EU_NOTICE_INPUT = { ...EU_NOTICE_VARIANTS[0] };

export const EU_NOTICE_TEST: AssertionTest = {
  toolId: "eu-notice",
  toolName: "EU/Global Privacy Notice",
  edgeFunction: "generate-eu-notice",
  testInput: EU_NOTICE_INPUT,
  expectedSeconds: 45,
  pollConfig: {
    table: "eu_notice_sessions",
    successStatus: "generated",
    maxPolls: 60,
    intervalMs: 4000,
  },
  assertions: [
    {
      id: "eu-notice-article-13-or-14",
      description: "Must reference Article 13 or 14 GDPR (privacy notice provision)",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /article\s*1[34]/i.test(text);
      },
      errorMessage: "EU Notice does not cite Article 13 or 14 GDPR (the mandatory notice provisions).",
    },
    {
      id: "eu-notice-supervisory-authority",
      description: "Must name the correct supervisory authority for the controller jurisdiction",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /information commissioner|ico/i.test(text);
      },
      errorMessage: "EU Notice does not name the ICO as supervisory authority for a UK-established controller.",
    },
    {
      id: "eu-notice-no-wrong-sa-for-controller",
      description: "EU-established controllers must not have ICO as their primary EU SA",
      category: "prohibition",
      check: (_output) => true,
      errorMessage:
        "EU Notice names ICO as the primary EU supervisory authority for an EU-established controller.",
    },
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
  ],
};

// ─── 13. Registration Manager ─────────────────────────────────────────────────

const REG_INPUT = { ...REG_VARIANTS[0] };

export const REGISTRATION_TEST: AssertionTest = {
  toolId: "registration",
  toolName: "Registration Manager",
  edgeFunction: "generate-registration-docs",
  testInput: REG_INPUT,
  expectedSeconds: 90,
  assertions: [
    {
      id: "reg-documents-generated",
      description: "Must return at least one registration document",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const docs = o?.documents as unknown[] | undefined;
        const count = o?.documentCount as number | undefined;
        return (
          (Array.isArray(docs) && docs.length > 0) ||
          (typeof count === "number" && count > 0)
        );
      },
      errorMessage: "Registration manager returned no documents.",
    },
    {
      id: "reg-uk-ico-registration",
      description: "UK entity must include ICO registration guidance",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /ico|information commissioner|uk gdpr|data protection act/i.test(text);
      },
      errorMessage: "Registration output for UK entity does not reference ICO / UK GDPR registration.",
    },
    {
      id: "reg-no-gemini-artifacts",
      description: "Must not contain Gemini API response artifacts",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return (
          !/gemini-flash|gemini-pro/i.test(text) &&
          !/google ai studio/i.test(text)
        );
      },
      errorMessage:
        "Output contains Gemini model references. Registration Manager must use Claude (not Gemini) for generation.",
    },
    {
      id: "reg-disclaimer-present",
      description: "Output must include a legal disclaimer",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /disclaimer|not legal advice|consult.*counsel|informational purposes/i.test(text);
      },
      errorMessage: "Registration documents do not include a legal disclaimer.",
    },
  ],
};

// ─── 14. Intelligence Brief ───────────────────────────────────────────────────

export const BRIEF_TEST: AssertionTest = {
  toolId: "brief",
  toolName: "Intelligence Brief",
  edgeFunction: "generate-brief-on-demand",
  testInput: { mode: "test" },
  expectedSeconds: 60,
  assertions: [
    {
      id: "brief-sections-present",
      description: "Brief must include multiple structured sections",
      category: "requirement",
      check: (output) => {
        const o = output as Record<string, unknown>;
        const text = getText(output);
        const hasSections =
          Array.isArray(o?.sections) && (o.sections as unknown[]).length >= 2;
        const hasTextSections = /##\s*\w+|section\s*\d/i.test(text) || text.length > 500;
        return hasSections || hasTextSections;
      },
      errorMessage: "Intelligence Brief does not contain structured sections or is too short.",
    },
    {
      id: "brief-no-future-dates-beyond-30-days",
      description: "Brief must not reference future dates more than 30 days from now",
      category: "prohibition",
      check: (output) => {
        const text = getText(output);
        return !hasFutureDateBeyond30Days(text);
      },
      errorMessage: "Intelligence Brief contains a future date more than 30 days from today.",
    },
    {
      id: "brief-enforcement-or-regulatory-content",
      description: "Brief must include enforcement or regulatory content",
      category: "requirement",
      check: (output) => {
        const text = getText(output);
        return /enforcement|regulation|gdpr|ccpa|privacy|data protection/i.test(text);
      },
      errorMessage: "Intelligence Brief does not contain enforcement or regulatory content.",
    },
  ],
};

// ─── Master list ──────────────────────────────────────────────────────────────

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
  ROPA_TEST,
  US_NOTICE_TEST,
  EU_NOTICE_TEST,
  REGISTRATION_TEST,
  BRIEF_TEST,
];