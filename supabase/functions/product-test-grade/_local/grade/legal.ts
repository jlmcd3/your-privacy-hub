// product-test-grade — legal family (doc 272 §6.4).

import { lintDocument } from "../review/lint.ts";
import { LINT_PROFILES } from "../review/lint-profiles.ts";
import type { RenderedSkeletonDocument } from "../../../_shared/prose/skeleton-render.ts";
import type { Check, ProductTestTool } from "../types.ts";
import { SKELETON_TOOLS } from "../variants/contracts-registry.ts";
import { runCppaChecks } from "../rules/cppa-checks.ts";
import { customerTextOf } from "./text-extract.ts";

type Bag = Record<string, unknown>;

// ── 1. cross-regime contamination (critical) ────────────────────────────────

const GDPR_MARKERS_RE = /\b(GDPR|Article\s?6(?:\(\d\))?|lawful\s+basis|Recital\s?\d+|EDPB)\b/i;
const CPPA_MARKERS_RE = /(§\s?7150|§\s?7120|\bCPPA\b|\bCCPA\b)/;

const CPPA_TOOLS: ReadonlySet<ProductTestTool> = new Set(["cppa-risk", "cppa-cyber", "cppa-admt", "registration"]);
const GDPR_TOOLS: ReadonlySet<ProductTestTool> = new Set(["dpia", "lia", "governance"]);

function contaminationCheck(tool: ProductTestTool, text: string): Check[] {
  if (CPPA_TOOLS.has(tool)) {
    const m = GDPR_MARKERS_RE.exec(text);
    return [{
      check_id: "legal.cross_regime_contamination",
      family: "legal",
      severity: "critical",
      passed: !m,
      quote: m?.[0],
      expected: "no GDPR/Article 6/lawful-basis vocabulary in a CCPA/CPPA product",
      actual: m ? m[0] : "clean",
    }];
  }
  if (GDPR_TOOLS.has(tool)) {
    const m = CPPA_MARKERS_RE.exec(text);
    return [{
      check_id: "legal.cross_regime_contamination",
      family: "legal",
      severity: "critical",
      passed: !m,
      quote: m?.[0],
      expected: "no § 7150/§ 7120/CPPA/CCPA vocabulary in a GDPR product",
      actual: m ? m[0] : "clean",
    }];
  }
  return [];
}

// ── 2. citations in registry (cppa-risk/cyber/admt: reuse lint L-CITE) ─────

function citationRegistryCheck(tool: ProductTestTool, doc: RenderedSkeletonDocument | undefined): Check[] {
  const profile = LINT_PROFILES[tool];
  if (!profile || !doc) return [];
  const result = lintDocument(doc, profile);
  const citeHits = result.hits.filter((h) => h.rule === "L-CITE");
  if (citeHits.length === 0) {
    return [{ check_id: "legal.citation_registry", family: "legal", severity: "high", passed: true, rule_ref: "L-CITE" }];
  }
  return citeHits.map((h) => ({
    check_id: "legal.citation_registry",
    family: "legal" as const,
    severity: (h.severity === "defect" ? "high" : "editorial") as Check["severity"],
    passed: false,
    block_key: h.block_key,
    quote: h.quote,
    actual: h.detail,
    rule_ref: "L-CITE",
  }));
}

// ── 4a. five CPPA scope truth-table rows ────────────────────────────────────
//
// doc 271 §4 defect 3: `cppa-scope-deterministic` names no edge function, and
// the evaluators in src/pages/CPPAScopeChecker.tsx are computed inside a
// React `useMemo` callback (CPPAScopeChecker.tsx:395-458) — not an exported
// pure function, so they are NOT importable from Deno. Per the brief's
// "else re-declare the rows against report_data and note it": these five
// rows are RE-DECLARED here against the cppa-risk intake's own q1/q5/q7/q15
// fields and the rendered document text, mirroring the five assertions in
// src/lib/tests/assertionTests.ts CPPA_SCOPE_TEST (:426-469) rather than the
// unreachable component logic. This is a documented simplification, not a
// verified parity claim with the live scope checker; the lead should verify
// these against CPPAScopeChecker.tsx before relying on them.

function cppaScopeRows(intake: Bag, output: Bag, text: string): Check[] {
  const q1 = String(intake?.q1_revenue ?? "");
  const q5 = String(intake?.q5_sell_share ?? "");
  const q7 = String(intake?.q15_sensitive_pi ?? ""); // sensitive-PI trigger, mirrors CPPA_SCOPE_INPUT's q6/q7 role
  const q18 = String(intake?.q18_admt_use ?? "");
  const revenueAtOrAbove25M = q1 !== "Under $25M" && q1 !== "";

  const inScopeExpected = revenueAtOrAbove25M && (q5.startsWith("Yes") || q7 === "Yes");
  const riskAssessmentMentioned = /risk assessment/i.test(text);
  const admtMentioned = q18 === "Yes" ? /automated\s+decision|\badmt\b/i.test(text) : true;
  const sensitiveMentioned = q7 === "Yes" ? /sensitive\s+personal\s+information|sensitive\s+pi/i.test(text) : true;
  const cyberAuditThreshold = q1 === "Over $100M";

  const rows: Check[] = [
    {
      check_id: "legal.cppa_scope.in_scope",
      family: "legal", severity: "high",
      passed: !inScopeExpected || riskAssessmentMentioned,
      expected: "a risk-assessment-required intake produces risk-assessment language",
      actual: riskAssessmentMentioned ? "present" : "absent",
      rule_ref: "cppa-scope-in-scope",
    },
    {
      check_id: "legal.cppa_scope.admt_required",
      family: "legal", severity: "high",
      passed: admtMentioned,
      expected: "q18_admt_use=Yes produces ADMT language",
      actual: admtMentioned ? "present" : "absent",
      rule_ref: "cppa-scope-admt-required",
    },
    {
      check_id: "legal.cppa_scope.sensitive_required",
      family: "legal", severity: "high",
      passed: sensitiveMentioned,
      expected: "sensitive-PI intake produces sensitive-PI language",
      actual: sensitiveMentioned ? "present" : "absent",
      rule_ref: "cppa-scope-sensitive-required",
    },
    {
      check_id: "legal.cppa_scope.cyber_audit_threshold",
      family: "legal", severity: "editorial",
      passed: true, // informational: the $100M+ cyber-audit threshold is cppa-cyber's own concern, not cppa-risk's; recorded for visibility only.
      expected: "n/a (informational)",
      actual: `revenue band "${q1}"; cyber-audit threshold ${cyberAuditThreshold ? "met" : "not met"}`,
      rule_ref: "cppa-scope-cyber-audit-not-required",
    },
    {
      check_id: "legal.cppa_scope.risk_assessment_required_flag",
      family: "legal", severity: "high",
      passed: !inScopeExpected || riskAssessmentMentioned,
      expected: "riskAssessmentRequired mirrors inScope for a $25M+ business with a triggering answer",
      actual: `inScopeExpected=${inScopeExpected}`,
      rule_ref: "cppa-scope-risk-assessment-required",
    },
  ];
  return rows;
}

// ── 4b. three ADMT v2 truth-table rows ──────────────────────────────────────

function admtV2Rows(intake: Bag, output: Bag, text: string): Check[] {
  const internal = ((output?._meta as Bag | undefined)?.internal as Bag | undefined) ?? {};
  const domains: string[] = Array.isArray(intake?.decision_domains) ? (intake.decision_domains as string[]) : [];
  const isFullyAutomated = intake?.human_review === "No — fully automated, no human review";
  const isSignificantDomain = domains.length > 0 && !domains.some((d) => /^none of these categories/i.test(d));
  const expectInScope = isFullyAutomated && isSignificantDomain;

  const isFullOptOut = intake?.opt_out_exception === "No exception — we provide a full opt-out right";

  const rows: Check[] = [
    {
      check_id: "legal.admt_v2.in_scope",
      family: "legal", severity: "high",
      passed: !expectInScope || internal.scope_state === "IN_SCOPE",
      expected: expectInScope ? "_meta.internal.scope_state === IN_SCOPE" : "n/a (not a fully automated significant decision)",
      actual: String(internal.scope_state ?? "absent"),
      rule_ref: "admt-v2-in-scope",
    },
    {
      check_id: "legal.admt_v2.full_opt_out_path",
      family: "legal", severity: "high",
      passed: !isFullOptOut || internal.opt_out_path === "FULL_OPT_OUT",
      expected: isFullOptOut ? "_meta.internal.opt_out_path === FULL_OPT_OUT" : "n/a (no-exception option not selected)",
      actual: String(internal.opt_out_path ?? "absent"),
      rule_ref: "admt-v2-full-opt-out-path",
    },
    {
      check_id: "legal.admt_v2.duties_sentence",
      family: "legal", severity: "high",
      passed: internal.scope_state !== "IN_SCOPE" || /ADMT duties apply to this decision/i.test(text),
      expected: internal.scope_state === "IN_SCOPE" ? '"ADMT duties apply to this decision" present' : "n/a (not IN_SCOPE)",
      actual: /ADMT duties apply to this decision/i.test(text) ? "present" : "absent",
      rule_ref: "admt-v2-duties-sentence",
    },
  ];
  return rows;
}

export function checkLegal(
  tool: ProductTestTool,
  intake: Bag,
  output: Bag,
): Check[] {
  const checks: Check[] = [];
  const { text } = customerTextOf(tool, output);
  const doc = SKELETON_TOOLS.has(tool) ? (output?.skeleton_document as RenderedSkeletonDocument | undefined) : undefined;

  checks.push(...contaminationCheck(tool, text));
  checks.push(...citationRegistryCheck(tool, doc));

  if (tool === "cppa-risk" || tool === "cppa-cyber" || tool === "cppa-admt") {
    checks.push(...runCppaChecks(tool, intake, output));
  }
  // The five CPPA Scope Checker rows are NOT run (lead, 2026-09-18): the scope
  // checker is a separate free tool, not one of the thirteen products, and
  // the re-declaration above reads intake keys the risk contract does not
  // carry, so every row would pass vacuously and inflate the check pass rate.
  // `cppaScopeRows` is kept for the day the scope checker's evaluators are
  // exported as pure functions and the rows can be verified against them.
  void cppaScopeRows;
  if (tool === "cppa-admt") {
    checks.push(...admtV2Rows(intake, output, text));
  }

  return checks;
}
