// COUNSEL-VOICE-1 E-completion — deterministic format checks per generative
// tool. Each function returns a list of `{ check_id, dimension, severity,
// passed, evidence }` findings shaped to feed straight into run-quality-batch
// state.allDocFindings (check_type: "deterministic"), and thus into
// checks_total / checks_passed.
//
// Coverage:
//   E1 — required top-level sections present + in template order
//   E2 — heading-hierarchy sanity (no level skips)
//   E3 — "[TO BE COMPLETED" blocks correctly closed with "]"
//   E4 — zero sentinel / meta-leakage (existing INSTRUCTION_LEAK_RE + blacklist)
//   E5 — advisory-formula integrity (canonical close preceded by named fact)
//   E6 — counsel-referral prohibition (from COUNSEL-VOICE-1 §1c)

import {
  ADVISORY_CLOSE_ANY_RE,
  COUNSEL_REFERRAL_RE,
  splitSentences,
} from "../advisory-voice.ts";

export type FormatFinding = {
  check_id: string;
  check_type: "deterministic";
  dimension: string;
  severity: "high" | "medium" | "low";
  passed: boolean;
  evidence: string | null;
};

const pass = (id: string, dimension: string): FormatFinding => ({
  check_id: id, check_type: "deterministic",
  dimension, severity: "medium", passed: true, evidence: null,
});
const fail = (
  id: string, dimension: string, severity: "high" | "medium" | "low",
  evidence: string,
): FormatFinding => ({
  check_id: id, check_type: "deterministic",
  dimension, severity, passed: false, evidence: evidence.slice(0, 400),
});

/**
 * DPA required sections in template order (matches generate-dpa assembly).
 * Kept intentionally coarse — matches on presence of the section title as
 * a heading line in the document text.
 */
export const DPA_REQUIRED_SECTIONS = [
  "Parties and Recitals",
  "Definitions",
  "Subject Matter",
  "Data Processing",
  "Sub-processing",
  "Data Subject Rights",
  "Security",
  "Data Transfers",
  "Return or Deletion",
  "Term and Termination",
];

/**
 * IR Playbook required top-level parts (matches PART A..PART F structure).
 */
export const IR_REQUIRED_SECTIONS = [
  "PART A",
  "PART B",
  "PART C",
  "PART D",
  "PART E",
  "PART F",
];

function findHeadingLines(text: string): { level: number; title: string; line: string }[] {
  const lines = (text ?? "").split(/\r?\n/);
  const out: { level: number; title: string; line: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    // Markdown headings
    const md = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (md) {
      out.push({ level: md[1].length, title: md[2].trim(), line });
      continue;
    }
    // ALLCAPS PART A / SECTION 1. headings (best-effort for IR/DPA prose)
    if (/^(PART\s+[A-F]|SECTION\s+\d+|Schedule\s+\d+)\b.*/i.test(line)) {
      out.push({ level: 1, title: line, line });
    }
  }
  return out;
}

function checkE1(sections: string[], text: string, dim = "formatting"): FormatFinding[] {
  const headings = findHeadingLines(text).map((h) => h.title.toLowerCase());
  const flat = (text ?? "").toLowerCase();
  const findings: FormatFinding[] = [];
  let lastIdx = -1;
  for (const s of sections) {
    const needle = s.toLowerCase();
    const foundInHeading = headings.some((h) => h.includes(needle));
    const foundInFlat = flat.includes(needle);
    if (!foundInHeading && !foundInFlat) {
      findings.push(fail("e1_section_present", dim, "high", `missing section: ${s}`));
      continue;
    }
    // Order — best-effort by first-occurrence in flat text.
    const idx = flat.indexOf(needle);
    if (idx >= 0 && idx < lastIdx) {
      findings.push(fail("e1_section_order", dim, "medium",
        `section "${s}" appears out of template order`));
    }
    lastIdx = Math.max(lastIdx, idx);
  }
  if (findings.length === 0) findings.push(pass("e1_sections_ok", dim));
  return findings;
}

function checkE2(text: string, dim = "formatting"): FormatFinding[] {
  const headings = findHeadingLines(text).filter((h) => h.level >= 1 && h.level <= 6);
  const findings: FormatFinding[] = [];
  let prev = 0;
  for (const h of headings) {
    if (prev > 0 && h.level > prev + 1) {
      findings.push(fail("e2_heading_skip", dim, "low",
        `heading level jumped ${prev}→${h.level} at "${h.title}"`));
    }
    prev = h.level;
  }
  if (findings.length === 0) findings.push(pass("e2_heading_hierarchy_ok", dim));
  return findings;
}

function checkE3(text: string, dim = "formatting"): FormatFinding[] {
  const findings: FormatFinding[] = [];
  // Any "[TO BE COMPLETED" not eventually closed by "]" on the same line
  // (allowing colons, dashes, verbs in between).
  const re = /\[TO BE COMPLETED[^\]\n]{0,400}$/gim;
  let m: RegExpExecArray | null;
  let hits = 0;
  while ((m = re.exec(text ?? "")) !== null) {
    hits++;
    findings.push(fail("e3_tbc_unclosed", dim, "medium",
      `unclosed [TO BE COMPLETED bracket at "${m[0].slice(0, 80)}…"`));
    if (hits > 20) break;
  }
  if (findings.length === 0) findings.push(pass("e3_tbc_brackets_ok", dim));
  return findings;
}

// Sentinel / meta leakage — reuse existing patterns. INSTRUCTION_LEAK_RE
// lives per-generator; here we ship a conservative shared version.
const INSTRUCTION_LEAK_RE =
  /\b(as an? (?:ai|language|large language) model|i (?:cannot|can'?t) (?:provide|advise)|per (?:the )?system (?:prompt|message)|the user (?:has )?asked|my (?:instructions|training|knowledge cutoff)|internal reasoning|chain[- ]of[- ]thought)\b/i;

function checkE4(text: string, dim = "hallucination"): FormatFinding[] {
  const findings: FormatFinding[] = [];
  if (INSTRUCTION_LEAK_RE.test(text ?? "")) {
    const sample = (text.match(INSTRUCTION_LEAK_RE) ?? [""])[0];
    findings.push(fail("e4_instruction_leak", dim, "high",
      `sentinel/meta leakage: ${sample}`));
  } else {
    findings.push(pass("e4_no_instruction_leak", dim));
  }
  return findings;
}

function checkE5(text: string, dim = "hallucination"): FormatFinding[] {
  // CV1-ALL T5 — named-fact predicate now scans the ENTIRE closing sentence,
  // not only the pre-close clause. A close is "bare" only if no substantive
  // noun material precedes it anywhere in the sentence. Threshold: >=6 words
  // of non-boilerplate text before "further ... is advisable." anywhere in
  // the sentence. This allows em-dash-joined closes ("<fact> — further ...")
  // and comma/period-separated named facts to pass while still catching
  // bare closes like "; further clarification is advisable." with no fact.
  const findings: FormatFinding[] = [];
  const sentences = splitSentences(text ?? "");
  let bare = 0;
  const CLOSE_RE = /further (?:clarification|internal investigation) is advisable\./i;
  for (const s of sentences) {
    if (!CLOSE_RE.test(s)) continue;
    const preClose = s.replace(CLOSE_RE, "").trim();
    // Strip trailing punctuation/dashes/semicolons/hyphens
    const trimmed = preClose.replace(/[\s;:,\-—–]+$/g, "").trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 6) {
      bare++;
      findings.push(fail("e5_bare_advisory_close", dim, "medium",
        `advisory close without named fact: "${s.slice(0, 200)}"`));
      if (bare > 10) break;
    }
  }
  if (findings.length === 0) findings.push(pass("e5_advisory_formula_ok", dim));
  return findings;
}

// CV1-ALL T4a — role-roster / named-person exemption. A stakeholder listing
// ("Miriam Schulz — Legal Counsel", "Legal Counsel (HIPAA gap analysis)",
// "Role: Senior Legal Counsel", DPIA consultation-record rosters) is NOT a
// counsel referral. Directive verbs (consult, review with, confirm with,
// seek advice from) still fail; passive role labels do not.
export const ROLE_ROSTER_EXEMPT_RE =
  /(?:^|[\n\r])\s*(?:[-•*]|\d+\.)?\s*[A-Z][A-Za-z.'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]+){0,3}\s*[—\-:(]\s*(?:(?:outside|external|internal|senior)\s+)?(?:legal|qualified|privacy|outside\s+privacy)\s+(?:counsel|officer)\b/i;
export const ROLE_LABEL_EXEMPT_RE =
  /\b(?:outside|external|internal|senior)?\s*(?:legal|privacy|qualified)\s+(?:counsel|officer)\s*\((?:[^)]{1,200})\)/i;
export const ROLE_FIELD_EXEMPT_RE =
  /\b(?:role|title|position|assigned\s+to|owner|responsible|participant|contributor|consulted|stakeholder)\s*[:\-]\s*[^.\n]{0,120}\b(?:legal|privacy|qualified)\s+(?:counsel|officer)\b/i;
// CPPA-HF2 Task C: participant-roster exemption — "assessment participants
// include ... outside privacy counsel", "the § 7152(a) stakeholder roster
// lists ... legal counsel". A passive listing of counsel as a participant
// is required content, not a referral.
export const PARTICIPANT_ROSTER_EXEMPT_RE =
  /\b(?:assessment\s+participants?|stakeholder\s+roster|consulted(?:\s+parties)?|contributors?|participants?\s+included?|(?:internal|external)\s+contributors?|§\s*7152\(a\)|risk\s+assessment\s+team)\b[^.\n]{0,200}\b(?:legal|privacy|outside\s+privacy)\s+(?:counsel|officer)\b/i;
// Directive verbs — these override any exempt hit and force the finding.
const DIRECTIVE_VERB_RE =
  /\b(?:consult|review(?:ed)?\s+(?:with|by)|seek\s+advice\s+from|confirm\s+with|discuss\s+with|obtain\s+advice\s+from|before\s+relying|should\s+be\s+reviewed\s+by|before\s+filing.{0,40}consult|before\s+publishing.{0,40}with)\b/i;

function checkE6(text: string, dim = "hallucination", opts: { exemptRe?: RegExp } = {}): FormatFinding[] {
  const findings: FormatFinding[] = [];
  const sentences = splitSentences(text ?? "");
  let hits = 0;
  for (const s of sentences) {
    if (COUNSEL_REFERRAL_RE.test(s)) {
      // COUNSEL-VOICE-1B Task 3 — narrow carve-out. IR playbook's legal-
      // privilege guidance stays. Sentences matching opts.exemptRe skip.
      if (opts.exemptRe && opts.exemptRe.test(s)) continue;
      // CV1-ALL T4a — role-roster / named-person exemption. A stakeholder
      // listing is not a referral UNLESS the sentence also contains a
      // directive verb (consult, review with, etc.).
      const rosterMatch = ROLE_ROSTER_EXEMPT_RE.test(s) ||
                          ROLE_LABEL_EXEMPT_RE.test(s) ||
                          ROLE_FIELD_EXEMPT_RE.test(s);
      if (rosterMatch && !DIRECTIVE_VERB_RE.test(s)) continue;
      hits++;
      findings.push(fail("e6_counsel_referral", dim, "high",
        `body-text counsel referral: "${s.slice(0, 200)}"`));
      if (hits > 10) break;
    }
  }
  // CV1-ALL T4b — unified check_id. Both pass and fail share
  // "e6_counsel_referral"; the `passed` boolean carries the state.
  // Legacy id "e6_no_counsel_referral" is retired; harnesses read the
  // unified id and inspect `passed`.
  if (findings.length === 0) findings.push(pass("e6_counsel_referral", dim));
  return findings;
}

// IR privilege-carveout regex — scoped tightly to sentences that discuss
// privilege determination, privilege labelling, the secure/restricted
// incident-communication channel, or the IR-role assignment of Senior
// Legal Counsel (Incident Response Team role). See advisory-voice.ts
// §"IR carve-out".
export const IR_PRIVILEGE_EXEMPT_RE =
  /\b(privileg(?:e|ed)|secure,?\s+restricted\s+communication|privilege\s+determination|LEGALLY\s+PRIVILEGED|Senior\s+Legal\s+Counsel|Incident\s+Response\s+Team|role[:\-]\s*(?:legal|counsel))\b/i;

export function runFormatChecksDPA(text: string): FormatFinding[] {
  return [
    ...checkE1(DPA_REQUIRED_SECTIONS, text),
    ...checkE2(text),
    ...checkE3(text),
    ...checkE4(text),
    ...checkE5(text),
    ...checkE6(text),
  ];
}

export function runFormatChecksIR(text: string): FormatFinding[] {
  return [
    ...checkE1(IR_REQUIRED_SECTIONS, text),
    ...checkE2(text),
    ...checkE3(text),
    ...checkE4(text),
    ...checkE5(text),
    ...checkE6(text, "hallucination", { exemptRe: IR_PRIVILEGE_EXEMPT_RE }),
  ];
}

/**
 * Generic per-tool format-check runner for tools without a fixed section
 * template. Applies E2..E6 universally; E1 runs only when `sections` is
 * supplied. Used by DPIA / Governance / CPPA-Risk / CPPA-Cyber / Biometric
 * / LI / ADMT.
 */
export function runFormatChecksGeneric(
  text: string,
  opts: { sections?: string[]; exemptRe?: RegExp } = {},
): FormatFinding[] {
  const out: FormatFinding[] = [];
  if (opts.sections && opts.sections.length) {
    out.push(...checkE1(opts.sections, text));
  }
  out.push(
    ...checkE2(text),
    ...checkE3(text),
    ...checkE4(text),
    ...checkE5(text),
    ...checkE6(text, "hallucination", { exemptRe: opts.exemptRe }),
  );
  return out;
}

/** Exposed for tests. */
export const _internals = { checkE1, checkE2, checkE3, checkE4, checkE5, checkE6 };
