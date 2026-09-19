// /all-ptest v2 (DOC 261, 2026-09-14) — LINT PROFILES for the three CPPA products.
//
// Everything product-specific the shared lint needs, pinned as static data so
// `ptest-run-driver/_local/review/lint.ts` (moved out of `_shared` on 2026-09-17, doc 266 INV-5) never imports a function's `_local` tree (deploy
// cap). The registry-section lists are PINNED COPIES of what each product's
// verified-authority registry covers on 2026-09-14; the test
// tests/edge/ptest/lint.test.ts compares them against the live registries so
// a registry change that is not mirrored here fails the build, never drifts.
//
// By-design duplicate list: sentences the products render in more than one
// place ON PURPOSE (an executive-table stub that restates the body stub). Add
// a pattern here only with the ruling that created the repeat; each entry
// names its origin.

import type { LintHit, LintProfile } from "./lint.ts";
import type { RenderedSkeletonDocument } from "../../../_shared/prose/skeleton-render.ts";

// ── Registry coverage (pinned; guarded by test) ─────────────────────────────

export const RISK_REGISTRY_SECTIONS: readonly number[] = [7001, 7150, 7151, 7152, 7153, 7154, 7155, 7156, 7157];
export const ADMT_REGISTRY_SECTIONS: readonly number[] = [7001, 7021, 7050, 7051, 7150, 7155, 7157, 7200, 7220, 7221, 7222];
export const CYBER_REGISTRY_SECTIONS: readonly number[] = [7120, 7121, 7122, 7123, 7124];

// ── Cyber: executive snapshot vs Appendix B evidence index ──────────────────

function cyberEvidencePostureCheck(doc: RenderedSkeletonDocument): LintHit[] {
  const exec = doc.sections.find((s) => s.id === "executive_summary");
  const appx = doc.sections.find((s) => s.id === "appendix_b_evidence");
  if (!exec || !appx) return [];
  const snapshot = exec.paragraphs.find((p) => p.table?.key === "executive_summary:2")?.table;
  const index = appx.paragraphs.find((p) => p.table)?.table;
  if (!snapshot || !index) return [];
  const posture = snapshot.rows.find((r) => /evidence posture/i.test(String(r[0] ?? "")));
  const m = /for (\d{1,2}) of (\d{1,2}) components/i.exec(String(posture?.[1] ?? ""));
  if (!m) return [];
  const sufficiencyCol = index.columns.findIndex((c) => /sufficiency/i.test(c));
  if (sufficiencyCol < 0) return [];
  const sufficient = index.rows.filter((r) => /^sufficient\b/i.test(String(r[sufficiencyCol] ?? "").trim())).length;
  if (sufficient !== Number(m[1]) || index.rows.length !== Number(m[2])) {
    return [{
      rule: "L-LABEL", check: "evidence_posture_count", severity: "defect",
      section_id: "executive_summary", block_key: "executive_summary:2",
      quote: String(posture?.[1] ?? ""),
      detail: `executive snapshot says ${m[1]} of ${m[2]}; Appendix B index has ${sufficient} sufficient of ${index.rows.length}`,
    }];
  }
  return [];
}

// ── Profiles ────────────────────────────────────────────────────────────────

const PROMISE_PATTERNS: readonly RegExp[] = [
  // "(Follow-Ups, § 4.D)", "remains to be identified (Follow-Ups, § 4.D)"
  /\((Follow-Ups?|Conditions?|Recommendations?),?\s?§\s?4\.D\)/g,
  // "appears among the Follow-Ups in § 4.D", "listed among the Conditions in § 4.D"
  /\b(?:appears?|listed|recorded|stated|set out)\s+(?:among|in|under)\s+the\s+(Follow-Ups?|Conditions?|Recommendations?)\b[^.]{0,40}§\s?4\.D/g,
  // "subject to any conditions identified in § 4.D"
  /\b(?:the|any)\s+(conditions?|follow-ups?|recommendations?)\s+(?:identified|stated|recorded|listed)\s+in\s+§\s?4\.D/gi,
];

export const RISK_LINT_PROFILE: LintProfile = {
  product: "cppa-risk",
  registrySections: RISK_REGISTRY_SECTIONS,
  // Definitions and the general-provision articles the risk document cites
  // for vocabulary and consumer-rights context, not as risk-assessment law.
  citeAllowlist: [7002, 7021, 7050, 7051, 7053, 7200, 7220, 7221, 7222],
  byDesignDuplicates: [
    // Rev 2 §0A V4 — the retention register row and its body sentence.
    /^No category-specific period recorded/,
    // § 4.A per-risk ledger prose: the same credit sentence and the same
    // rating sentence recur for every risk with the same status/ratings — a
    // clause-library template, not an accidental double emission. Observed
    // on the PERFECT panel 2026-09-14; a style ruling to vary them belongs to
    // the CEO, not to lint.
    /^Safeguards supported by evidence that they operate earn the assessment’s full credit/,
    /^Safeguards (?:planned|in progress|reported)\b.*credit/,
    /^The Company assesses the likelihood as \w+ and the severity as \w+, and the risk is rated/,
    // § 4 per-risk determination prose on a THIN record (Product Test run
    // 6a7e6c84, thin-all variant): every risk with no safeguard directed at
    // it carries the same sentence — the same clause-library template class
    // as the ledger sentences above. Style ruling to vary it belongs to the CEO.
    /^No safeguard in the information provided is directed at this risk, so it enters the balance at its full level\./,
  ],
  labelPairs: [
    {
      name: "residual risk: executive table vs § 4.A ledger",
      a: { table: "executive_summary:6", joinCol: 0, valueCol: 2 },
      b: { table: "iv_determination:1", joinCol: 0, valueCol: 5 },
    },
    {
      name: "remaining level: § 4.A ledger vs Appendix D register",
      a: { table: "iv_determination:1", joinCol: 0, valueCol: 5 },
      b: { table: "appendix_c:1", joinCol: 0, valueCol: 5 },
    },
    {
      name: "level before safeguards: § 4.A ledger vs Appendix D register",
      a: { table: "iv_determination:1", joinCol: 0, valueCol: 3 },
      b: { table: "appendix_c:1", joinCol: 0, valueCol: 3 },
    },
  ],
  promise: {
    section_id: "iv_determination",
    patterns: PROMISE_PATTERNS,
    lists: {
      follow_ups: /(?:^|\n)Follow-Ups\.\s*\n\s*1\./,
      conditions: /(?:^|\n)Conditions\.\s*\n\s*1\./,
      recommendations: /(?:^|\n)Recommendations\.\s*\n\s*1\./,
    },
  },
  // iv_determination:8 is the two-column balance summary (benefits beside
  // remaining risks); the shorter column is empty below its last entry by
  // design.
  emptyCellExemptTables: [/^review_and_approval:/, /^cover:/, /^agency_submission_checklist:/, /^iv_determination:8$/],
  dateRule: {
    approvalSection: "v_governance",
    qualifier: /precedes the date of this assessment/,
    priorLanguage: /\b(?:prior version|earlier (?:internal )?(?:review|assessment)|prior review record)\b/g,
    priorIntakeKey: "prior_risk_assessment_date",
  },
};

export const ADMT_LINT_PROFILE: LintProfile = {
  product: "cppa-admt",
  registrySections: ADMT_REGISTRY_SECTIONS,
  citeAllowlist: [7002, 7053, 7152, 7154, 7156],
  byDesignDuplicates: [
    // Rev 2 §0A V4 — the § 6 vendor stub, restated in the executive table by design.
    /does not use a third-party ADMT/,
  ],
  labelPairs: [
    {
      name: "record grade: executive table vs § 7 record-quality table",
      a: { table: "executive_summary:2", joinCol: 0, valueCol: 2 },
      b: { table: "governance:1", joinCol: 0, valueCol: 1 },
      joinMode: "prefix",
    },
  ],
  promise: {
    section_id: "actions",
    patterns: [
      /\b(?:see|in|under)\s+(?:Section|§)\s?8\b[^.]{0,60}\b(Conditions?|Follow-Ups?|Recommendations?)\b/g,
      /\b(Conditions?|Follow-Ups?|Recommendations?)\b[^.]{0,40}\b(?:in|under|see)\s+(?:Section|§)\s?8\b/g,
    ],
    lists: {
      conditions: /(?:^|\n)Conditions(?: to proceed)?[.:]\s*\n\s*(?:1\.|•)/,
      follow_ups: /(?:^|\n)(?:Required )?Follow-[Uu]ps?[.:]\s*\n\s*(?:1\.|•)/,
      recommendations: /(?:^|\n)Recommendations[.:]\s*\n\s*(?:1\.|•)/,
    },
  },
  emptyCellExemptTables: [/^review_of_assessment:/, /^cover:/],
};

export const CYBER_LINT_PROFILE: LintProfile = {
  product: "cppa-cyber",
  registrySections: CYBER_REGISTRY_SECTIONS,
  citeAllowlist: [7001, 7002, 7150, 7152],
  // CEO 2026-09-16 (doc 262 §2.4): the per-component "auditor can examine
  // and test" sentence is no longer emitted.
  // Doc 269 §5 item 13 (held back 2026-09-17, still open): the ratified
  // attach rule (cyber-corpus-attach.test.ts) renders the general-FSOR
  // sentence once for EVERY component without a subsection-specific FSOR
  // row, so it repeats on every document with several such components. Until
  // the CEO rules on a one-sentence-per-document form, the repeat is the
  // ratified state and lint must not count it (run 72e9a63c: 88 hits, 8 on
  // golden). Remove this entry the day item 13 is decided the other way.
  byDesignDuplicates: [
    /^General § 7123 agency response; no subsection-specific discussion was identified/,
    // Per-component template sentences on a THIN record (Product Test run
    // 6a7e6c84, thin-all variant: notes, evidence and status removed from
    // all eighteen components): each component with no status, no evidence
    // and no record entry carries the same four sentences — 68 repeats on
    // one document. The same clause-library template class as the Risk
    // ledger; honest per component; a style ruling to vary or consolidate
    // them belongs to the CEO (doc 275 §13).
    /^The record does not state an implementation status for this component, so its coverage cannot be concluded either way\./,
    /^None recorded, so an auditor would test the assertion rather than accept it\./,
    /^No testable material is identified; a finding would rest primarily on management assertion/,
    /^Next action: Supply a record entry for this component; the record names the recorded entry for related components but not this one\./,
    // The evidence-retention recommendation template (cyber-recommendations.ts
    // "not itself a testable artifact") repeats verbatim for every component
    // whose evidence is a bare description — the authored messy case
    // "controls without evidence" renders it on nine components (Product Test
    // run 3d8ae582, 34 hits). Same clause-library class.
    /^Next action: The description \(.*\) is not itself a testable artifact; retain the underlying evidence/,
  ],
  labelPairs: [],
  emptyCellExemptTables: [/^signature:/, /^cover:/],
  customChecks: [cyberEvidencePostureCheck],
};

export const LINT_PROFILES: Readonly<Record<string, LintProfile>> = {
  "cppa-risk": RISK_LINT_PROFILE,
  "cppa-admt": ADMT_LINT_PROFILE,
  "cppa-cyber": CYBER_LINT_PROFILE,
};

export function lintProfileFor(product: string): LintProfile | null {
  return LINT_PROFILES[product] ?? null;
}
