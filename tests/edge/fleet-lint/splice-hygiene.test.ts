// FLEET LINT — quote/splice hygiene (doc 109 §1.8; doc 66 "The fleet lint").
// Landed with Batch 15 of the A-Team Session 1 implementation queue
// (doc 111). Every §1.8 pattern below shipped in a reviewed sample at least
// once; this lint keeps the classes dead.
//
// COVERAGE: the seven products with pure, fixture-driven assemblers —
// Risk, Cyber, ADMT, Biometric, DPA, LIA, Registration. Governance, DPIA
// and IR extend in Batch 17 (their assemble harnesses need typed report
// fixtures this lint does not yet carry).
//
// ALLOWANCES: a pattern hit is either fixed at its composer or explicitly
// triaged in the per-product ALLOWANCES table below with a reason — never
// ignored (doc 66). An allowance names the exact token it excuses.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

import { assembleBiometricSkeletonDocument } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";

import { assembleDpaDocument, type DpaAssembleInput } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";

import { LIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/lia-perfect-pinned.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

import { REGISTRATION_GOLDEN } from "../../../supabase/functions/_shared/golden/registration.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

interface LintDoc {
  product: string;
  headings: string[];
  subtitle: string;
  text: string;
}

function fromSkeleton(product: string, doc: { title?: string; subtitle?: string; sections: Array<{ title: string; paragraphs: Array<{ text: string }> }> }): LintDoc {
  return {
    product,
    headings: doc.sections.map((s) => s.title),
    subtitle: String(doc.subtitle ?? ""),
    text: skeletonDocumentToText(doc as never),
  };
}

async function collectDocs(): Promise<LintDoc[]> {
  const docs: LintDoc[] = [];

  // Risk (golden, deterministic pass-1).
  {
    const c = CPPA_RISK_PERFECT[0];
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: "fleet-lint",
      mode: "enforce",
    });
    const sk = assembleRiskSkeletonDocument(result.report as Bag, c.intake as Bag);
    docs.push(fromSkeleton("cppa_risk", sk.document as never));
  }

  // Cyber (published-sample-shaped fixture; policy-only + continuous mix).
  {
    const POLICY_ONLY = new Set([4, 8, 10, 17]);
    const CONTINUOUS = new Set([2, 8]);
    const intake: Bag = {
      profile: {
        entity_name: "Tomorrow4Cariboo, Inc.",
        industry: "Advertising / Marketing technology",
        framework: "SOC 2",
        last_audit: "Within 12 months",
        incidents_12mo: "None",
        in_scope_frameworks: ["SOC 2", "NIST CSF"],
        audit_scope_rationale: "In scope: the ad-tech production estate.",
      },
      controls: CYBER_7123_COMPONENTS.map((c) => ({
        key: c.slug,
        label: c.label,
        maturity: CONTINUOUS.has(c.number) ? "Implemented with continuous monitoring" : "Implemented across organization",
        notes: `Documented ${c.label} controls operated by the security team.`,
        evidence: POLICY_ONLY.has(c.number)
          ? ["Policy / procedure document"]
          : ["Policy / procedure document", "SOC 2 or auditor letter", "Screenshot / config export"],
      })),
    };
    const d = buildCyberDeliverables(intake);
    const out = assembleCyberSkeletonDocumentV4(d as unknown as Bag, intake, "", "2026-08-30");
    docs.push(fromSkeleton("cppa_cyber", out.document as never));
  }

  // ADMT (golden, both scope paths).
  for (const id of ["admt-hr-perfect-record", "admt-credit-significant-tuning"]) {
    const g = CPPA_ADMT_GOLDEN.find((x) => x.id === id)!;
    const computed = computeAdmtV2(g.intake as Bag);
    const doc = assembleAdmtV2Document({
      intake: g.intake as Bag,
      computed,
      organizationName: String((g.intake as Bag).organization_name ?? "Test Org"),
      systemName: String((g.intake as Bag).system_name ?? "the System"),
    });
    docs.push(fromSkeleton(`cppa_admt:${id}`, doc as never));
  }

  // Biometric (duty-bearing fixture from the batch-6 harness).
  {
    const REPORT: Bag = {
      duty_findings: [
        {
          statute_key: "us_il_bipa",
          key: "bipa_15b1_notice",
          label: "Written notice before collection",
          citation: "740 ILCS 14/15(b)(1)",
          standard:
            "(1) informs the subject or the subject's legally authorized representative in writing that a biometric identifier or biometric information is being collected or stored;",
          record_fact: "Written notice given before collection",
          application: "The company's answer states written notice is given before collection, which is what the provision requires.",
          verdict: "satisfied",
        },
        {
          statute_key: "us_il_bipa",
          key: "bipa_15a_retention_schedule",
          label: "Public written retention schedule and destruction guidelines",
          citation: "740 ILCS 14/15(a)",
          standard:
            "A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information",
          record_fact: "Retention policy published",
          application: "The recorded schedule destroys templates at purpose satisfaction or three years after last interaction, whichever occurs first.",
          verdict: "record_insufficient",
          information_needed: "whether the written policy has been in place since first possession of biometric data",
        },
      ],
    };
    const INTAKE: Bag = {
      orgName: "Busted Sled Solutions, Inc.",
      orgType: "Employer (employee biometrics)",
      biometricTypes: ["Fingerprint / palm print"],
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Illinois, USA (BIPA)"],
      retention_schedule_text: "Templates destroyed at purpose satisfaction or 3 years after last interaction.",
      security_measures_description: "Encrypted template storage",
    };
    const out = assembleBiometricSkeletonDocument(REPORT, INTAKE);
    docs.push(fromSkeleton("biometric", out.document as never));
  }

  // DPA (UK↔EEA pair and pure-EEA pair).
  {
    const BASE: DpaAssembleInput = {
      documentType: "gdpr",
      controllerName: "Frostbyte Payroll Ltd",
      controllerJurisdiction: "United Kingdom",
      processorName: "Zugspitze HR Systems GmbH",
      processorJurisdiction: "Germany",
      services: "payroll processing and HR records hosting",
      dataCategories: ["Employee / HR data"],
      retention: "Active employment plus 6 years post-termination",
      hasSubProcessors: false,
      subProcessorList: "",
      subprocessorAuthorizationModel: "general",
      subprocessorNoticeDays: 30,
      auditRights: "Annual third-party audit summary plus on-site inspection on reasonable notice",
      includeTransferClause: false,
      transferMechanism: "",
      securityMeasuresSelected: ["encryption_at_rest"],
      securityMeasuresDetails: "",
      californiaEngaged: false,
    };
    for (const [tag, input] of [["uk-de", BASE], ["de-de", { ...BASE, controllerName: "Acme GmbH", controllerJurisdiction: "Germany" }]] as const) {
      const doc = assembleDpaDocument(input as DpaAssembleInput);
      docs.push({ product: `dpa:${tag}`, headings: [], subtitle: "", text: doc.document_text });
    }
  }

  // LIA (pinned golden, deterministic path).
  {
    const g = LIA_PERFECT_PINNED[0];
    const out = assembleLiaSkeletonDocument({} as never, g.intake as never, { deterministic: true });
    docs.push(fromSkeleton("li_assessment", (out as { document: never }).document));
  }

  // Registration (golden).
  {
    const g = REGISTRATION_GOLDEN[0];
    const d = buildRegistrationDeliverables(g.intake as never) as unknown as Bag;
    const report: Bag = { registration_deliverables: d, ...d };
    const out = assembleRegistrationSkeletonDocument(report, g.intake as Bag) as unknown as { document?: never } & Bag;
    const doc = (out.document ?? out) as never;
    docs.push(fromSkeleton("registration", doc));
  }

  return docs;
}

// ── §1.8 pattern set ─────────────────────────────────────────────────────────

interface LintPattern {
  id: string;
  re: RegExp;
  scope: "text" | "headings";
}

const PATTERNS: LintPattern[] = [
  { id: "double-semicolon", re: /;;/g, scope: "text" },
  { id: "double-period", re: /(?<!\.)\.\.(?!\.)/g, scope: "text" },
  { id: "semicolon-period", re: /;\./g, scope: "text" },
  { id: "machine-plural", re: /\b\w+\(s\)/g, scope: "text" },
  { id: "camelCase-in-prose", re: /\b[a-z]+[A-Z][a-zA-Z]*\b/g, scope: "text" },
  { id: "adjacent-trigram-repeat", re: /\b(\w+ \w+ \w+) \1\b/gi, scope: "text" },
  { id: "us-state-code", re: /\bUS-[A-Z]{2}\b/g, scope: "text" },
  { id: "spliced-fallback-sentence", re: /\b(?:is|are) (?:We could not verify|The record answers)/g, scope: "text" },
  { id: "spaced-hyphen-in-heading", re: / - /g, scope: "headings" },
];

// Per-product allowances: exact matched token → reason. A hit is excused
// only when its matched string appears here for its product.
const ALLOWANCES: Record<string, Record<string, string>> = {
  "*": {
    // Fixture-world proper nouns with internal capitals (company/product
    // names are the customer's own words, not composer output).
    "Tomorrow4Cariboo": "fixture company name",
    "OrthoMosaic": "fixture processor name",
  },
};

// TRIAGE TABLE (doc 66 "clean-or-triaged"): known hits whose fixes are
// assigned to a later batch of the doc-111 implementation queue. Each entry
// is removed when its batch lands — a triaged pattern that stops hitting
// means the entry is stale and must go.
const TRIAGED: Array<{ product: string; id: string; token?: string; fixBatch: string; reason: string }> = [
  // Batch 17 (Wave C2) landed 2026-08-30: the risk trigger(s), ADMT
  // domain(s)/type(s), and biometric ';."' entries are FIXED and removed.
  { product: "cppa_cyber", id: "spaced-hyphen-in-heading", fixBatch: "Batch 21 (Wave C5)", reason: "'Appendix X - Title' + subtitle spaced hyphens → em-dash/en-dash (§1.3/§1.6)" },
  { product: "li_assessment", id: "spaced-hyphen-in-heading", fixBatch: "Batch 21 (Wave C5)", reason: "subtitle ' - scope:' spaced hyphen → fleet subtitle grammar (§1.6)" },
];

function allowed(product: string, patternId: string, token: string): boolean {
  const base = product.split(":")[0];
  if (ALLOWANCES[base]?.[token] ?? ALLOWANCES["*"]?.[token]) return true;
  return TRIAGED.some((t) =>
    t.product === base && t.id === patternId && (t.token === undefined || t.token === token)
  );
}

Deno.test("fleet lint — doc 109 §1.8 splice hygiene over the seven pure-assembler products", async () => {
  const docs = await collectDocs();
  const failures: string[] = [];
  for (const d of docs) {
    for (const p of PATTERNS) {
      const hay = p.scope === "headings" ? [...d.headings, d.subtitle].join("\n") : d.text;
      for (const m of hay.matchAll(p.re)) {
        const token = m[0];
        if (allowed(d.product, p.id, token)) continue;
        const at = Math.max(0, (m.index ?? 0) - 40);
        failures.push(`${d.product} [${p.id}] "${token}" …${hay.slice(at, (m.index ?? 0) + token.length + 40).replace(/\n/g, "\\n")}…`);
      }
    }
  }
  assert(failures.length === 0, `fleet lint hits (${failures.length}):\n${failures.slice(0, 40).join("\n")}`);
});
