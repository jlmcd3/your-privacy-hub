// DOC 129 §2 (Batch 3 A-Team ruling, 2026-09-01) — DETERMINISTIC PRE-GRADER
// QA. Runs BEFORE the model graders over the SAME customer-document text the
// payload builder extracts, and proves the defect classes no model should be
// needed to discover:
//
//   1. customer-vocabulary reject list (internal register in customer text);
//   2. raw schema-token leakage (camelCase / snake_case identifiers);
//   3. CPPA Risk cover-vs-body disposition equality (the §2 item-1 check,
//      provable from the skeleton payload itself).
//
// The remaining §2 state checks (fact-present-then-declared-absent, duty/
// action propagation, per-product status gates) are implemented as product
// regression tests where the normalized state lives — building a second
// state reader here would recreate the dual-source-of-truth problem this
// program exists to remove (doc 129 Part I §2 ruling).
//
// Findings are DETERMINISTIC facts, not model opinions: they are emitted
// alongside the model findings with classification "customer_visible_defect"
// and never gate or replace the model call.

import { extractCustomerDocument } from "./payload.ts";

export interface DeterministicQaFinding {
  readonly check_id: string;
  readonly severity: "high" | "medium";
  readonly classification: "customer_visible_defect";
  readonly evidence: string;
}

// Customer-vocabulary reject list (doc 129 / ChatGPT §2 item 12 + §6, as
// ruled). Word-bounded, case-insensitive. "skeleton"/"corpus"/"assembler"
// are internal apparatus nouns; "intake" is the internal name for the
// information the Company supplied; "record insufficient" (either spelling)
// is a typed enum value, never customer prose.
const REJECT_TERMS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: "vocab_intake", re: /\bintake\b/i },
  { id: "vocab_record_insufficient", re: /\brecord[ _]insufficient\b/i },
  { id: "vocab_corpus", re: /\bcorpus\b/i },
  { id: "vocab_skeleton", re: /\bskeleton\b/i },
  { id: "vocab_assembler", re: /\bassembler\b/i },
  { id: "vocab_engine_version", re: /\bengine version\b/i },
];

// Raw identifier detectors. camelCase compounds and snake_case compounds
// essentially never occur in drafted legal prose; the whitelist carries the
// few legitimate exceptions observed in shipping documents.
const CAMEL_RE = /\b[a-z]+(?:[A-Z][a-z0-9]+)+\b/g;
const SNAKE_RE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const TOKEN_WHITELIST = new Set([
  "eCommerce", "iPhone", "iPad", "iOS", "macOS", "JavaScript", "eDiscovery",
  "openId", "eIDAS",
]);

function excerptAround(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 80);
  return text.slice(start, index + len + 80).replace(/\s+/g, " ").trim();
}

/**
 * Run the deterministic QA checks over a report's customer document.
 * Returns [] when the report carries no extractable customer document
 * (legacy-shaped rows are not lintable this way).
 */
export function runDeterministicQa(report: unknown): DeterministicQaFinding[] {
  const rd = (report && typeof report === "object")
    ? (report as Record<string, unknown>)
    : {};
  const doc = extractCustomerDocument(rd);
  if (!doc) return [];
  const text = doc.text;
  const findings: DeterministicQaFinding[] = [];

  for (const term of REJECT_TERMS) {
    const m = term.re.exec(text);
    if (m) {
      findings.push({
        check_id: `deterministic_${term.id}`,
        severity: "medium",
        classification: "customer_visible_defect",
        evidence: excerptAround(text, m.index, m[0].length),
      });
    }
  }

  const tokenHits = new Set<string>();
  for (const re of [CAMEL_RE, SNAKE_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null && tokenHits.size < 5) {
      const tok = m[0];
      if (TOKEN_WHITELIST.has(tok)) continue;
      if (tokenHits.has(tok)) continue;
      tokenHits.add(tok);
      findings.push({
        check_id: "deterministic_raw_field_token",
        severity: "high",
        classification: "customer_visible_defect",
        evidence: `"${tok}" — ${excerptAround(text, m.index, tok.length)}`,
      });
    }
  }

  // CPPA Risk cover-vs-body disposition equality (§2 item 1): the cover's
  // Assessment Result row and § 4.C's cross-label sentence project the same
  // normalized state and must agree.
  const coverRow = /Assessment disposition \| ([^\n|]+)/.exec(text);
  const bodyLabel = /stated as "([^"]+)\."/.exec(text);
  if (coverRow && bodyLabel) {
    const cover = coverRow[1].trim();
    const body = bodyLabel[1].trim();
    if (cover.toLowerCase() !== body.toLowerCase()) {
      findings.push({
        check_id: "deterministic_disposition_mismatch",
        severity: "high",
        classification: "customer_visible_defect",
        evidence: `cover "${cover}" vs body "${body}"`,
      });
    }
  }

  return findings;
}
