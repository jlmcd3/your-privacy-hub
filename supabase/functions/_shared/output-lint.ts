// output-lint.ts — deterministic post-generation checks for report text.
// Zero LLM calls. Returns cleaned text plus a list of violations.
// "auto_fixed" violations are corrected in the returned text;
// "hard" violations cannot be safely auto-fixed and should trigger
// one regeneration retry by the caller.

export interface LintResult {
  clean: string;
  violations: { code: string; severity: "auto_fixed" | "hard"; detail: string }[];
}

export function lintReportText(text: string, opts?: { checkClauseNumbering?: boolean }): LintResult {
  const violations: LintResult["violations"] = [];
  let clean = text;

  // 1. Meta-commentary / self-correction notes — the "(This sub-clause number
  //    is incorrect and should be 10.3.8)" class. Cannot be safely auto-fixed:
  //    the surrounding numbering may also be wrong. HARD violation.
  const metaRe = /\((This|Note:?|NB:?)[^)]{0,100}(incorrect|should be|error|mistake|typo)[^)]{0,60}\)/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(text)) !== null) {
    violations.push({ code: "meta_commentary", severity: "hard", detail: m[0].slice(0, 120) });
  }

  // 2. Leaked internal status tags — [REJECTED] etc. Safe to strip.
  const tagRe = /\[(REJECTED|ACCEPTED|PENALISED|PENALIZED|REQUIRED|UNKNOWN)\]\s*/g;
  if (tagRe.test(clean)) {
    violations.push({ code: "status_tag_leak", severity: "auto_fixed", detail: "stripped bracketed outcome tags" });
    clean = clean.replace(tagRe, "");
  }

  // 3. Raw enum tokens in prose — e.g. "likely_passes" appearing in narrative
  //    text. Safe to humanize.
  const enumRe = /\b(likely_passes|likely_fails|not_applicable|in_progress|likely_pass|likely_fail)\b/g;
  if (enumRe.test(clean)) {
    violations.push({ code: "raw_enum_in_prose", severity: "auto_fixed", detail: "humanized snake_case enum tokens" });
    clean = clean.replace(enumRe, (t) => t.replace(/_/g, " "));
  }

  // 4. Clause-numbering collision (DPA documents) — any sub-clause whose first
  //    segment has 3+ digits (e.g. "100.3.8") is a numbering collision. HARD:
  //    renumbering safely requires context.
  if (opts?.checkClauseNumbering) {
    const collisionRe = /\b\d{3,}\.\d+(\.\d+)?\b/g;
    while ((m = collisionRe.exec(text)) !== null) {
      // Exclude things that look like legislation years or amounts (e.g. 2021/914 handled by slash, not dot)
      violations.push({ code: "clause_numbering_collision", severity: "hard", detail: m[0] });
    }
  }

  return { clean, violations };
}

/** True if any violation requires a regeneration retry. */
export function hasHardViolations(r: LintResult): boolean {
  return r.violations.some((v) => v.severity === "hard");
}
