// output-lint.ts — deterministic post-generation checks for report text.
// Zero LLM calls. Returns cleaned text plus a list of violations.
// "auto_fixed" violations are corrected in the returned text;
// "hard" violations cannot be safely auto-fixed and should trigger
// one regeneration retry by the caller.

export interface LintResult {
  clean: string;
  violations: { code: string; severity: "auto_fixed" | "hard"; detail: string }[];
}

export interface LintOptions {
  checkClauseNumbering?: boolean;
  /** Enable unresolved_reference_token (HARD). Only enable on FINAL
   *  user-facing narrative AFTER annotation extraction has run. */
  checkUnresolvedTokens?: boolean;
  /** Enable weekday_date_mismatch and past_deadline (HARD). */
  checkDates?: boolean;
  /** Reference "now" for past_deadline. ISO string or Date. Defaults to today. */
  referenceDate?: string | Date;
}

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS: Record<string, number> = {
  january:0, february:1, march:2, april:3, may:4, june:5, july:6,
  august:7, september:8, october:9, november:10, december:11,
  jan:0, feb:1, mar:2, apr:3, jun:5, jul:6, aug:7, sep:8, sept:8, oct:9, nov:10, dec:11,
};

function parseLooseDate(s: string): Date | null {
  // Accepts "12 June 2026", "June 12, 2026", "Friday, 12 June 2026", "Friday, June 12, 2026"
  const cleaned = s.replace(/^(?:Sun|Mon|Tues?|Wed(?:nes)?|Thur?s?|Fri|Sat(?:ur)?)(?:day)?,?\s+/i, "");
  // "12 June 2026"
  let m = cleaned.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[2].toLowerCase()];
    if (mo === undefined) return null;
    return new Date(Date.UTC(parseInt(m[3]), mo, parseInt(m[1])));
  }
  // "June 12, 2026"
  m = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo === undefined) return null;
    return new Date(Date.UTC(parseInt(m[3]), mo, parseInt(m[2])));
  }
  return null;
}

function resolveQuarterEnd(q: number, year: number): Date {
  // Q1→Mar 31, Q2→Jun 30, Q3→Sep 30, Q4→Dec 31
  const map = [
    { m: 2, d: 31 }, { m: 5, d: 30 }, { m: 8, d: 30 }, { m: 11, d: 31 },
  ];
  const e = map[q - 1];
  return new Date(Date.UTC(year, e.m, e.d));
}

export function lintReportText(text: string, opts?: LintOptions): LintResult {
  const violations: LintResult["violations"] = [];
  let clean = text;

  // 1. Meta-commentary / self-correction notes. HARD.
  const metaRe = /\((This|Note:?|NB:?)[^)]{0,100}(incorrect|should be|error|mistake|typo)[^)]{0,60}\)/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(text)) !== null) {
    violations.push({ code: "meta_commentary", severity: "hard", detail: m[0].slice(0, 120) });
  }

  // 2. Leaked internal status tags. Safe to strip.
  const tagRe = /\[(REJECTED|ACCEPTED|PENALISED|PENALIZED|REQUIRED|UNKNOWN)\]\s*/g;
  if (tagRe.test(clean)) {
    violations.push({ code: "status_tag_leak", severity: "auto_fixed", detail: "stripped bracketed outcome tags" });
    clean = clean.replace(tagRe, "");
  }

  // 3. Raw enum tokens in prose. Safe to humanize.
  const enumRe = /\b(likely_passes|likely_fails|not_applicable|in_progress|likely_pass|likely_fail)\b/g;
  if (enumRe.test(clean)) {
    violations.push({ code: "raw_enum_in_prose", severity: "auto_fixed", detail: "humanized snake_case enum tokens" });
    clean = clean.replace(enumRe, (t) => t.replace(/_/g, " "));
  }

  // 4. Clause-numbering collision. HARD.
  if (opts?.checkClauseNumbering) {
    const collisionRe = /\b\d{3,}\.\d+(\.\d+)?\b/g;
    while ((m = collisionRe.exec(text)) !== null) {
      violations.push({ code: "clause_numbering_collision", severity: "hard", detail: m[0] });
    }
  }

  // 5. unresolved_reference_token — [E#]/[D#]/[R#]/[REF#] in final narrative. HARD.
  //    Gated because some intermediate generations legitimately carry these
  //    until the annotation extractor runs.
  if (opts?.checkUnresolvedTokens) {
    const refRe = /\[(E|D|R|REF)\d+\]/g;
    let rm: RegExpExecArray | null;
    while ((rm = refRe.exec(clean)) !== null) {
      violations.push({ code: "unresolved_reference_token", severity: "hard", detail: rm[0] });
    }
  }

  // 6/7. Date checks.
  if (opts?.checkDates) {
    // 6. weekday_date_mismatch
    const weekdayDateRe = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})|([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4}))\b/g;
    let dm: RegExpExecArray | null;
    while ((dm = weekdayDateRe.exec(clean)) !== null) {
      const stated = dm[1];
      const d = parseLooseDate(dm[0]);
      if (d) {
        const actual = WEEKDAYS[d.getUTCDay()];
        if (actual.toLowerCase() !== stated.toLowerCase()) {
          violations.push({
            code: "weekday_date_mismatch",
            severity: "hard",
            detail: `"${dm[0]}" — stated ${stated}, actual ${actual}`,
          });
        }
      }
    }

    // 7. past_deadline — "by/deadline/target/recommended ... <date or Q# YYYY>"
    const ref = opts.referenceDate
      ? (opts.referenceDate instanceof Date ? opts.referenceDate : new Date(opts.referenceDate))
      : new Date();
    const refMs = ref.getTime();

    const phrase = /\b(?:by|deadline|target(?:ed)?|recommended|due|complete[d]? by|no later than)\b[^.\n]{0,80}?\b(Q([1-4])\s+(\d{4})|(\d{1,2}\s+[A-Za-z]+\s+\d{4})|([A-Za-z]+\s+\d{1,2},?\s+\d{4}))/gi;
    let pm: RegExpExecArray | null;
    while ((pm = phrase.exec(clean)) !== null) {
      let deadline: Date | null = null;
      if (pm[2] && pm[3]) {
        deadline = resolveQuarterEnd(parseInt(pm[2]), parseInt(pm[3]));
      } else {
        deadline = parseLooseDate(pm[4] || pm[5] || "");
      }
      if (deadline && deadline.getTime() < refMs) {
        violations.push({
          code: "past_deadline",
          severity: "hard",
          detail: `"${pm[0].slice(0, 100)}" resolved to ${deadline.toISOString().slice(0,10)} (before ${ref.toISOString().slice(0,10)})`,
        });
      }
    }
  }

  // 8. gdpr_typo — auto_fixed.
  const gdprTypoRe = /\b(?:GPDR|GDRP|GPDRP|GDPRP)\b/g;
  if (gdprTypoRe.test(clean)) {
    violations.push({ code: "gdpr_typo", severity: "auto_fixed", detail: "corrected GDPR spelling" });
    clean = clean.replace(gdprTypoRe, "GDPR");
  }

  return { clean, violations };
}

/** True if any violation requires a regeneration retry. */
export function hasHardViolations(r: LintResult): boolean {
  return r.violations.some((v) => v.severity === "hard");
}
