// COUNSEL-VOICE-1 — canonical advisory-formula infrastructure.
//
// Per CEO directive (2026-07-19): product documents ARE the deliverable.
// Body text must never direct the reader to legal counsel or privacy
// professionals; page-level "not legal advice" disclaimers are retained
// verbatim and sufficient. Epistemic honesty is preserved via advisory
// sentences that name a specific fact and the current assumption, closed
// with one of two canonical strings.
//
// This module is imported by generators (system-prompt rule block +
// deterministic post-gen check) and by the grader (post-filter retarget).

/** The two canonical closes. All body-text advisories MUST end with one. */
export const ADVISORY_CLOSE_CLARIFICATION = "further clarification is advisable.";
export const ADVISORY_CLOSE_INVESTIGATION = "further internal investigation is advisable.";

/** Regexes that match those closes at the end of a sentence (case-insensitive). */
export const ADVISORY_CLOSE_CLARIFICATION_RE =
  /further clarification is advisable\./i;
export const ADVISORY_CLOSE_INVESTIGATION_RE =
  /further internal investigation is advisable\./i;
export const ADVISORY_CLOSE_ANY_RE =
  /further (?:clarification|internal investigation) is advisable\./i;

/**
 * Counsel-referral prohibition: body-text patterns that direct the reader
 * to seek human legal counsel or a privacy professional. Page-level
 * disclaimer components (see src/components/ToolDisclaimer.tsx) are
 * exempt — those are not scanned; only generator output is.
 */
export const COUNSEL_REFERRAL_RE =
  /\b(?:legal\s+counsel|qualified\s+counsel|consult\s+(?:a|an|your|with)?\s*(?:lawyer|attorney|counsel)|(?:review|reviewed|reviewing)\s+by\s+(?:counsel|an?\s+attorney|a\s+lawyer|legal\s+counsel|qualified\s+counsel)|privacy\s+(?:counsel|officer|consultant|professional)s?\s+(?:should|must|need)|counsel\s+should\s+(?:confirm|review|advise|verify|adapt|assess))\b/i;

/**
 * Prompt rule block. Inject into every generative-tool system prompt near
 * the drafting-voice section. Instructs the model to (a) recast former
 * "NOTE FOR LEGAL REVIEW" annotations as inline advisory prose using one
 * of the two canonical closes, (b) name a specific fact and assumption
 * before the close, and (c) never direct the reader to counsel/privacy
 * professionals in body text.
 */
export const ADVISORY_VOICE_RULES = `
COUNSEL-VOICE-1 — ADVISORY VOICE (BINDING, applies to every generated body sentence):
- Product documents ARE the deliverable. NEVER instruct the reader to consult legal counsel, an attorney, a lawyer, a privacy officer, a privacy consultant, or any human professional in body text. The page-level disclaimer is separate and sufficient.
- Do NOT emit "NOTE FOR LEGAL REVIEW — …" headed blocks or any equivalent counsel-referral heading. Recast such observations as ordinary drafting-voice prose.
- Epistemic honesty is preserved by ADVISORY SENTENCES using EXACTLY these two canonical closes:
    (i)  "<specific fact + what the record shows or was assumed>; further clarification is advisable."
         — use for record/document ambiguity.
    (ii) "<specific fact + context>; further internal investigation is advisable."
         — use for facts internal to the subscriber's organization (retention practice, vendor list, processing volumes, etc.).
- SPECIFICITY INVARIANT: every advisory sentence names the fact and the current assumption. Example: "The record identifies the Processor's jurisdiction of incorporation as Ireland; further clarification is advisable." A bare close without a named fact is a defect.
- [TO BE COMPLETED — …] hard blanks and verification-gated citation placeholders are unchanged; use them for missing statutory or party-identity data.
`.trim();

/** Split a body of text into sentences (best-effort, punctuation-based). */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z\[])/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type AdvisoryFinding = {
  code: string;
  detail: string;
  evidence?: string;
};

/**
 * Deterministic checks for COUNSEL-VOICE-1:
 *  - counsel_referral_in_body: any COUNSEL_REFERRAL_RE match in text.
 *  - bare_advisory_close: a canonical close with fewer than ~4 words of
 *    named-fact material before the semicolon in the same sentence.
 *  - note_for_legal_review_leftover: any "NOTE FOR LEGAL REVIEW" heading
 *    remaining in body text.
 */
export function scanAdvisoryVoice(text: string): AdvisoryFinding[] {
  const findings: AdvisoryFinding[] = [];
  if (!text) return findings;

  // NOTE-block leftovers
  const noteRe = /NOTE\s+FOR\s+LEGAL\s+REVIEW[^\n]*/gi;
  let m: RegExpExecArray | null;
  while ((m = noteRe.exec(text)) !== null) {
    findings.push({
      code: "note_for_legal_review_leftover",
      detail: "residual NOTE FOR LEGAL REVIEW heading in body text",
      evidence: m[0].slice(0, 200),
    });
    if (findings.length > 40) break;
  }

  // Counsel-referral prohibition
  const sentences = splitSentences(text);
  for (const s of sentences) {
    if (COUNSEL_REFERRAL_RE.test(s)) {
      findings.push({
        code: "counsel_referral_in_body",
        detail: "body-text counsel/privacy-professional referral",
        evidence: s.slice(0, 240),
      });
    }
    // Bare advisory close: canonical close present, but preceded by very
    // little named-fact material (heuristic: <=3 words between sentence
    // start / preceding semicolon and the close phrase).
    const closeMatch = s.match(/([^;]*);\s*further (?:clarification|internal investigation) is advisable\./i);
    if (closeMatch) {
      const preclause = closeMatch[1].trim();
      const words = preclause.split(/\s+/).filter(Boolean);
      if (words.length < 5) {
        findings.push({
          code: "bare_advisory_close",
          detail: `advisory close without named fact (pre-clause words=${words.length})`,
          evidence: s.slice(0, 240),
        });
      }
    }
  }

  return findings;
}

/**
 * True if the text contains any counsel-referral prohibition hit. Used
 * as a single-round regeneration gate in generators.
 *
 * IR carve-out (COUNSEL-VOICE-1B Task 3, logged): the IR playbook's
 * legal-privilege determination step and secure/restricted communication-
 * channel guidance are operational incident-response substance, NOT
 * counsel-referral framing. The E6 deterministic check accepts an
 * `exemptRe` (see grader/format-checks.ts → IR_PRIVILEGE_EXEMPT_RE) to
 * suppress hits in sentences whose context matches
 * `privilege|privileged|secure, restricted communication|LEGALLY PRIVILEGED`.
 * The regen-gate helper below is intentionally NOT carved out — regen
 * decisions are made downstream after the section-scoped E6 result.
 */
export function hasCounselReferral(text: string): boolean {
  return COUNSEL_REFERRAL_RE.test(text ?? "");
}

/**
 * Deterministic-checks emit helper. Given a report-data object and the
 * generated body text, computes the per-tool format checks and attaches
 * them under `_meta.deterministic_checks` (and mirrors to the legacy
 * `deterministic_checks` top-level key expected by run-quality-batch).
 * Returns the finding list so callers can decide on regen.
 */
export type DeterministicFinding = {
  check_id: string;
  check_type: "deterministic";
  dimension: string;
  severity: "high" | "medium" | "low";
  passed: boolean;
  evidence: string | null;
};

export function attachDeterministicChecks(
  reportData: Record<string, unknown> | null | undefined,
  findings: DeterministicFinding[],
): DeterministicFinding[] {
  if (!reportData || typeof reportData !== "object") return findings;
  const rd = reportData as Record<string, unknown>;
  rd.deterministic_checks = findings;
  const meta = (rd._meta as Record<string, unknown> | undefined) ?? {};
  meta.deterministic_checks = findings;
  rd._meta = meta;
  return findings;
}

/**
 * Extract concatenated body-text prose from a heterogenous report_data
 * shape. String leaves are joined with newlines; arrays and objects are
 * recursed. Reserved bookkeeping keys are skipped. Budget-bounded.
 */
const _RESERVED_KEYS = new Set([
  "_meta", "deterministic_checks", "prompt_version", "build_stamp",
  "generated_at", "enforcement_meta", "lint_warnings", "annotations",
  "citation_lints", "information_needed", "enforcement_precedents",
  // CPPA-HF5 Task F — structural ID/anchor keys never render in prose;
  // exclude so H2 internal-vocab scanning stays scoped to narrative.
  "citation_ids", "field_ids", "source_fields", "element_id",
  "intake_field_1", "intake_field_2", "canonical_fields",
  // QB-P25 Item 3 (DPA) — grader-invisible drafting record. Skipped from
  // prose extraction so lint/blacklist scanners never see it.
  "_drafting_record",
  // W3-T5 (a) — ADMT normalizer output; grader-invisible bookkeeping.
  "_normalized_intake",
]);

export function extractProseFromReport(report: unknown, budget = 200_000): string {
  const parts: string[] = [];
  let remaining = budget;
  const walk = (v: unknown, key?: string) => {
    if (remaining <= 0) return;
    if (key && _RESERVED_KEYS.has(key)) return;
    if (typeof v === "string") {
      const t = v.slice(0, Math.max(0, remaining));
      parts.push(t);
      remaining -= t.length + 1;
      return;
    }
    if (Array.isArray(v)) { for (const it of v) walk(it); return; }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) walk(val, k);
    }
  };
  walk(report);
  return parts.join("\n");
}


