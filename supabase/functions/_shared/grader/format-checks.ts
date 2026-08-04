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
import { REPORT_DISCLAIMER } from "../report-disclaimer.ts";

/**
 * UNIVERSAL DISCLAIMER EXEMPTION — the CEO-locked REPORT_DISCLAIMER constant
 * is sanctioned boilerplate. Any sentence that is a byte-exact fragment of it
 * is exempt from e6; nothing else is relaxed.
 */
const DISCLAIMER_SENTENCES: readonly string[] = splitSentences(REPORT_DISCLAIMER);

function isUniversalDisclaimerSentence(sentence: string): boolean {
  const s = (sentence ?? "").trim();
  if (!s) return false;
  if (DISCLAIMER_SENTENCES.includes(s)) return true;
  return s.length >= 20 && REPORT_DISCLAIMER.includes(s);
}

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
  dimension, severity, passed: false, evidence: evidence.slice(0, 1000),
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
 * IR Playbook required top-level sections. SWEEP-2R R1: the shipped
 * instrument (generate-ir-playbook v3.9.1) emits seven numbered "## Section
 * N:" H2 headings; the earlier "PART A".."PART F" list was stale grader
 * config and produced false-positive e1_section_present / e1_section_order
 * findings on every current IR document. Needle strings below are lowercase
 * substrings of the exact heading text emitted by PROMPT_PART_A/B/C.
 * checkE1's order test is a monotonic first-occurrence indexOf, which
 * remains valid because the seven headings are numbered 1..7 and therefore
 * appear in ascending textual order in a well-formed document.
 */
export const IR_REQUIRED_SECTIONS = [
  "Section 1: IMMEDIATE ACTIONS",
  "Section 2: BREACH ASSESSMENT CHECKLIST",
  "Section 3: REGULATORY NOTIFICATION TIMELINE",
  "Section 4: INDIVIDUAL NOTIFICATION DECISION TREE",
  "Section 5: NOTIFICATION TEMPLATES",
  "Section 6: DOCUMENTATION & ACCOUNTABILITY CHECKLIST",
  "Section 7: POST-INCIDENT ACTIONS",
];


type HeadingRec = {
  level: number;
  title: string;
  line: string;
  isSection: boolean;   // valid top-level or nested section heading (excludes doc titles)
  isSubHeading: boolean; // decimal-numbered sub-clause (e.g. "4.5 …")
  charOffset: number;
};

function findHeadingLines(text: string): HeadingRec[] {
  const raw = text ?? "";
  const lines = raw.split(/\r?\n/);
  const out: HeadingRec[] = [];
  let cursor = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lineOffset = cursor;
    cursor += rawLine.length + 1;
    if (!line) continue;
    // Markdown headings
    const md = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (md) {
      const level = md[1].length;
      out.push({
        level, title: md[2].trim(), line,
        isSection: true, isSubHeading: level >= 3,
        charOffset: lineOffset,
      });
      continue;
    }
    // Decimal-numbered sub-heading: "1.2 …", "4.5 Assistance with …", "10.3.7 …"
    const numSub = line.match(/^(\d+(?:\.\d+)+)[.)]?\s+(.+?)\s*$/);
    if (numSub) {
      out.push({
        level: 2 + (numSub[1].split(".").length - 2),
        title: numSub[2].trim(), line,
        isSection: false, isSubHeading: true,
        charOffset: lineOffset,
      });
      continue;
    }
    // Top-level numbered plain-text heading: "1. PARTIES AND RECITALS"
    // Body prose is filtered out by requiring the trailing title to be
    // ALLCAPS (with common punctuation/space allowed) — matches DPA/IR
    // section headings, excludes prose sentences that start "1. The party…".
    const numTop = line.match(/^(\d+)[.)]\s+(.+?)\s*$/);
    if (numTop && numTop[2] === numTop[2].toUpperCase() && /[A-Z]/.test(numTop[2])) {
      out.push({
        level: 1, title: numTop[2].trim(), line,
        isSection: true, isSubHeading: false,
        charOffset: lineOffset,
      });
      continue;
    }
    // Legacy PART A / SECTION 1 / Schedule 1 shapes.
    if (/^(PART\s+[A-F]|SECTION\s+\d+|Schedule\s+\d+)\b.*/i.test(line)) {
      out.push({
        level: 1, title: line, line,
        isSection: true, isSubHeading: false,
        charOffset: lineOffset,
      });
    }
  }
  return out;
}

// Strip leading section numbering (e.g. "1.", "4.5", "Section 3:", "Part A —")
// before comparing a heading title to a template needle.
function stripHeadingNumbering(title: string): string {
  return title
    .replace(/^\s*(?:\d+(?:\.\d+)*[.)]?\s+|section\s+\d+[:.]?\s*|part\s+[a-z]+[:.—-]?\s*|schedule\s+\d+[:.—-]?\s*)/i, "")
    .trim();
}

function checkE1(sections: string[], text: string, dim = "formatting"): FormatFinding[] {
  // GRADER-CAL-3 Task 1 — anchored heading match + strict mixed-mode handling.
  //
  // Prior defect classes (GC2-E1-MIXED, ratified 2026-07-20 13:44Z, and the
  // substring-heading-match false positive observed on quality_run 7159218c,
  // qa_pdf_exports d59a5c49):
  //   (a) headingSeq.findIndex((h) => h.includes(needle)) matched a needle
  //       against ANY substring of ANY heading. That caused:
  //         - "Data Processing"  matched the doc TITLE "DATA PROCESSING
  //           AGREEMENT" at heading index 0 (before every real section).
  //         - "Data Subject Rights" / "Security" matched §4.x sub-clause
  //           headings ("4.5 Assistance with Data Subject Rights…",
  //           "4.6 Assistance with Security…") that appear before the §6/§7
  //           section-level headings.
  //   (b) The order key `(headingIdx + 1) * 1e9` mixed a heading-anchored
  //       namespace with a flat-text char-offset namespace, guaranteeing a
  //       spurious e1_section_order MEDIUM fail whenever a needle resolved
  //       through the flat-text fallback after any heading-anchored needle.
  //
  // Fix (a): restrict heading candidates to `isSection && !isSubHeading` (drops
  // sub-clauses like "4.5 …" and prose lines) AND require a stripped-numbering
  // prefix match on the heading title. The doc title "DATA PROCESSING
  // AGREEMENT" is not numbered, has no markdown level, and does not match
  // PART/SECTION/Schedule, so `findHeadingLines` never records it as a
  // section — the substring-title collision is impossible by construction.
  //
  // Fix (b): when a needle resolves in flat-text only (present but unheaded),
  // do NOT compare its position against heading-anchored `lastPos`; keep the
  // presence check but skip the ordering assertion for that needle.
  const sectionHeadings = findHeadingLines(text).filter(
    (h) => h.isSection && !h.isSubHeading,
  );
  const flat = (text ?? "").toLowerCase();
  const findings: FormatFinding[] = [];
  let lastHeadingPos = -1;
  for (const s of sections) {
    const needle = s.toLowerCase();
    const headingHit = sectionHeadings.find((h) => {
      const stripped = stripHeadingNumbering(h.title).toLowerCase();
      return stripped.startsWith(needle);
    });
    if (headingHit) {
      if (headingHit.charOffset < lastHeadingPos) {
        findings.push(fail("e1_section_order", dim, "medium",
          `section "${s}" appears out of template order`));
      }
      lastHeadingPos = Math.max(lastHeadingPos, headingHit.charOffset);
      continue;
    }
    // No section heading matched — accept flat-text presence but do NOT
    // participate in heading-anchored ordering (Fix (b)).
    if (!flat.includes(needle)) {
      findings.push(fail("e1_section_present", dim, "high", `missing section: ${s}`));
    }
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
  // QB-P26 Item 3 — NESTING-AWARE. Prior implementation bounded the
  // search window at the next "[TO BE COMPLETED" opener, so a legitimate
  // nested placeholder (e.g. IR breach-notice template where the outer
  // "[TO BE COMPLETED: if X, include: '...[TO BE COMPLETED: describe Y]...']"
  // wraps inner placeholders) was flagged as unclosed because the outer's
  // closing "]" sits AFTER the inner opener.
  // Evidence: IR run 474ac70f doc 02d9dca8 — outer "[TO BE COMPLETED: if
  // Meridian Health Systems..." spans two inner placeholders and closes
  // properly at the end. The matcher misread the first inner opener as
  // the boundary.
  //
  // New logic: walk char-by-char, tracking TBC-opener depth. Every
  // "[TO BE COMPLETED" occurrence increments depth; every "]" decrements
  // (never below 0 — stray "]" ignored). If we reach EOF or a 4000-char
  // ceiling from the outermost opener with depth > 0, flag as unclosed.
  const findings: FormatFinding[] = [];
  const src = text ?? "";
  const openRe = /\[TO BE COMPLETED/gi;
  const MAX_SPAN = 4000;
  const opens: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(src)) !== null) opens.push(m.index);
  let hits = 0;
  let i = 0;
  while (i < opens.length) {
    const start = opens[i];
    let depth = 1;
    // Positions of subsequent openers within span.
    let j = i + 1;
    const bound = Math.min(src.length, start + MAX_SPAN);
    let pos = start + "[TO BE COMPLETED".length;
    let closed = false;
    while (pos < bound) {
      const nextClose = src.indexOf("]", pos);
      const nextOpen = j < opens.length ? opens[j] : -1;
      if (nextClose === -1 || nextClose >= bound) break;
      if (nextOpen !== -1 && nextOpen < nextClose && nextOpen < bound) {
        depth++;
        j++;
        pos = nextOpen + "[TO BE COMPLETED".length;
        continue;
      }
      depth--;
      pos = nextClose + 1;
      if (depth === 0) { closed = true; break; }
    }
    if (!closed) {
      hits++;
      const window = src.slice(start, Math.min(src.length, start + 120));
      findings.push(fail("e3_tbc_unclosed", dim, "medium",
        `unclosed [TO BE COMPLETED bracket at "${window.slice(0, 80)}…"`));
      if (hits > 20) break;
    }
    // Advance outer walker past every opener consumed by this span.
    i = j;
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
        `advisory close without named fact: "${s.slice(0, 1000)}"`));
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
// GRADER-CAL-2 Task 1 — bare owner-cell / pipe-roster exemptions. A
// governance remediation table cell containing only role titles ("Legal
// Counsel", "DPO, Legal Counsel") or a pipe-delimited role roster
// ("DPO | Compliance Manager | Legal Counsel | CISO") is passive content,
// not a referral. DIRECTIVE_VERB_RE override still forces the finding.
// (a) Bare role cell — the entire trimmed line consists of one or more
// role titles (counsel/officer/DPO/CISO/Compliance Manager/Privacy
// Officer/etc.), optionally comma- or slash-separated. Table markdown
// pipes at the line edges are allowed.
export const BARE_ROLE_CELL_EXEMPT_RE =
  /^\s*\|?\s*(?:(?:outside|external|internal|senior|deputy|chief|acting)\s+)*(?:legal\s+counsel|privacy\s+counsel|qualified\s+counsel|privacy\s+officer|data\s+protection\s+officer|dpo|ciso|cpo|compliance\s+(?:manager|officer|lead)|general\s+counsel|counsel)\s*(?:[,/&]\s*(?:(?:outside|external|internal|senior|deputy|chief|acting)\s+)*(?:legal\s+counsel|privacy\s+counsel|qualified\s+counsel|privacy\s+officer|data\s+protection\s+officer|dpo|ciso|cpo|compliance\s+(?:manager|officer|lead)|general\s+counsel|counsel)\s*)*\|?\s*$/im;
// (b) Pipe-separated role roster — three or more pipe segments where at
// least one contains a counsel/officer token. Governance rosters shape.
export const PIPE_ROSTER_EXEMPT_RE =
  /(?:^|\n)[^|\n]{0,80}\|[^|\n]{0,80}\|[^|\n]{0,120}\b(?:legal\s+counsel|privacy\s+counsel|qualified\s+counsel|privacy\s+officer|data\s+protection\s+officer|dpo|ciso|general\s+counsel)\b[^|\n]{0,120}(?:\|[^|\n]{0,120})*/i;
// Directive verbs — these override any exempt hit and force the finding.
const DIRECTIVE_VERB_RE =
  /\b(?:consult|review(?:ed)?\s+(?:with|by)|seek\s+advice\s+from|confirm\s+with|discuss\s+with|obtain\s+advice\s+from|before\s+relying|should\s+be\s+reviewed\s+by|before\s+filing.{0,40}consult|before\s+publishing.{0,40}with)\b/i;

// GRADER-CAL-4 — advice-delegation forms that override owner-directive exemption.
// A sentence that assigns the DECISION or REVIEW to counsel is still a referral
// even if a qualifying internal role is the grammatical subject.
const ADVICE_DELEGATION_RE =
  /\b(?:consult(?:ed|ing)?\b|seek(?:ing)?\s+advice|be\s+reviewed\s+by\s+(?:counsel|an?\s+attorney|a\s+lawyer|legal\s+counsel|qualified\s+counsel)|review(?:ed)?\s+by\s+(?:counsel|an?\s+attorney|a\s+lawyer|legal\s+counsel|qualified\s+counsel)|resolved\s+by\s+legal\s+counsel|approved\s+by\s+(?:counsel|legal\s+counsel)|review,?\s+complete,?\s+and\s+own)\b/i;

// Second-person reader-directed constructions ("your ... counsel/DPO must") —
// these are counsel referrals addressed to the reader, never exempted.
const READER_DIRECTED_RE =
  /\byour\s+(?:qualified\s+)?(?:legal\s+counsel|counsel|attorney|lawyer|data\s+protection\s+officer|dpo|privacy\s+officer|privacy\s+counsel)\b/i;

// GRADER-CAL-4 Task 1 — OWNER-DIRECTIVE exemption. Skip a COUNSEL_REFERRAL_RE
// hit when an internal-role token (DPO / Privacy Officer / CISO / Compliance
// Officer / privacy lead / privacy manager) is the acting subject of a modal
// directive, including passive operational forms ("must be notified"). Bare
// counsel tokens do NOT qualify as the acting subject; counsel may appear only
// as a named COLLABORATOR ("The DPO, working with Legal Counsel and the CTO,
// must ...").
//
// Regex captures: subject phrase containing an internal-role token, then any
// intervening clause (up to ~200 chars, allowing "working with X and Y",
// commas, parentheticals), then a modal directive verb. Passive form is
// handled by the alternation `must\s+be\s+\w+ed?` (e.g. "must be notified",
// "must be updated", "should be escalated").
const OWNER_DIRECTIVE_RE =
  /\b(?:the\s+)?(?:privacy\s+officers?|privacy\s+lead|privacy\s+manager|data\s+protection\s+officer|dpo|chief\s+information\s+security\s+officer|ciso|compliance\s+(?:officer|manager|lead))\b[^.\n]{0,200}?\b(?:must|shall|should|needs\s+to|will|is\s+responsible\s+for)\b/i;

// GRADER-CAL-4 Task 2 — DESCRIPTIVE-STATUS exemption. Skip when the role
// token appears only in a parenthetical, past-tense, or status clause with
// no modal directive addressed to that role or the reader. Examples:
//   "The informal privacy lead (a senior legal counsel carrying privacy
//    responsibilities part-time) has flagged the gap but no remediation
//    timeline has been set."
//   "The DPO was appointed last quarter."
//   "The Privacy Officer currently serves as the incident escalation point."
const DESCRIPTIVE_STATUS_RE =
  /\b(?:has\s+flagged|had\s+flagged|was\s+appointed|were\s+appointed|currently\s+serves?|carries?\s+(?:privacy|compliance)\s+responsibilit|carrying\s+(?:privacy|compliance)\s+responsibilit|previously\s+held|historically\s+served|has\s+been\s+designated|was\s+designated)\b/i;


// GRADER-CAL-3 Task 2 — sanctioned ownership-disclaimer zone.
//
// Run-2 dpia doc (quality_run 7c1a20ef, run #93; qa_pdf_exports 64855c6e)
// failed e6_counsel_referral HIGH on the page-1 preamble and closing block:
//   "Your qualified Data Protection Officer or legal counsel must review,
//    complete, and own it."
// Verification-layer ruling (Legal sway, logged 2026-07-20 18:06Z): this is
// the deliberate ownership / anti-reliance disclaimer and remains in every
// document. The grader must stop flagging it while keeping body-text
// counsel referrals (governance run-1 e6 flood class) fully detectable.
//
// Narrow carve-out: exempt COUNSEL_REFERRAL_RE hits only when BOTH
//   (i) the sentence matches the ownership-language allowlist below, AND
//   (ii) the sentence sits in the document's preamble (before the first
//        numbered/major section heading) or trailing disclaimer block
//        (from the last section heading onward).
// Neither condition is sufficient alone: a mid-document ownership-shaped
// sentence outside the zone still fails, and a mid-document referral inside
// a hypothetical "preamble" of a short doc without any sections is not
// exempted (zonesActive requires ≥1 detected section).
export const OWNERSHIP_DISCLAIMER_RE =
  /must\s+review,?\s+complete,?\s+and\s+own\b/i;

function computeDisclaimerZones(text: string): {
  active: boolean; preambleEnd: number; closingStart: number;
} {
  const sectionHeadings = findHeadingLines(text).filter(
    (h) => h.isSection && !h.isSubHeading,
  );
  if (sectionHeadings.length === 0) {
    return { active: false, preambleEnd: 0, closingStart: (text ?? "").length };
  }
  const preambleEnd = sectionHeadings[0].charOffset;
  const last = sectionHeadings[sectionHeadings.length - 1];
  // Closing zone: the trailing block after the last major section. Anchored
  // as `max(lastSectionOffset, docLength - 1500)` so long documents get the
  // final ~1.5 kB (typical space for a closing disclaimer + signature block)
  // while short documents fall back to "everything after the last section
  // heading" — narrow enough that mid-body counsel referrals are unaffected
  // because the ownership-pattern AND-guard is required in addition.
  const closingStart = Math.max(last.charOffset, (text ?? "").length - 1500);
  return { active: true, preambleEnd, closingStart };
}

function normalizeForRosterMatch(s: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

// QB-P5 Item 4 — DIRECTIVE-verb detector reused for the intake-echo carve-out
// below. A model-added counsel-referral directive ("consult legal counsel",
// "review with outside counsel", "engage external counsel") MUST still fail
// even if part of the sentence matches an intake roster string. The check is
// only relaxed when the sentence is a pure echo of intake roster content.
const INTAKE_ECHO_DIRECTIVE_RE =
  /\b(?:consult|engage|retain|escalate to|refer to|obtain (?:advice|guidance) from|review with|seek (?:advice|guidance) from|should\s+(?:consult|engage|retain|review))\b/i;

function checkE6(
  text: string,
  dim = "hallucination",
  opts: { exemptRe?: RegExp; intakeRoster?: string } = {},
): FormatFinding[] {
  const findings: FormatFinding[] = [];
  const doc = text ?? "";
  const sentences = splitSentences(doc);
  const zones = computeDisclaimerZones(doc);
  // QB-P5 Item 4 — pre-normalize the intake roster once so we can substring-
  // match sentences against it in O(1) per sentence. When intake supplies a
  // roster string like "Legal Counsel (external, Kanzlei Berger & Stein)"
  // and the report echoes that verbatim, the sentence is not a model-added
  // counsel referral and must not fail e6. Model-added advice-delegation
  // directives ("consult legal counsel", "engage outside counsel") continue
  // to fail even when part of the sentence overlaps roster text.
  const intakeRosterNorm = opts.intakeRoster
    ? normalizeForRosterMatch(opts.intakeRoster)
    : "";
  let hits = 0;
  for (const s of sentences) {
    if (COUNSEL_REFERRAL_RE.test(s)) {
      // UNIVERSAL DISCLAIMER EXEMPTION (CEO-locked constant). The shared
      // REPORT_DISCLAIMER is sanctioned boilerplate, not a model-authored
      // referral; byte-match against the imported constant only.
      if (isUniversalDisclaimerSentence(s)) continue;
      // COUNSEL-VOICE-1B Task 3 — narrow carve-out. IR playbook's legal-
      // privilege guidance stays. Sentences matching opts.exemptRe skip.
      if (opts.exemptRe && opts.exemptRe.test(s)) continue;
      // GRADER-CAL-3 Task 2 — sanctioned ownership-disclaimer zone.
      if (zones.active && OWNERSHIP_DISCLAIMER_RE.test(s)) {
        const pos = doc.indexOf(s);
        if (pos >= 0 && (pos < zones.preambleEnd || pos >= zones.closingStart)) {
          continue;
        }
      }
      // QB-P5 Item 4 — intake-echo carve-out. Skip when the sentence
      // (normalized) is a substring of the intake roster AND does not
      // itself contain a model-added counsel-referral directive verb.
      if (intakeRosterNorm) {
        const sNorm = normalizeForRosterMatch(s);
        if (sNorm.length >= 20 && intakeRosterNorm.includes(sNorm) &&
            !INTAKE_ECHO_DIRECTIVE_RE.test(s)) {
          continue;
        }
      }
      // CV1-ALL T4a — role-roster / named-person exemption. A stakeholder
      // listing is not a referral UNLESS the sentence also contains a
      // directive verb (consult, review with, etc.).
      const rosterMatch = ROLE_ROSTER_EXEMPT_RE.test(s) ||
                          ROLE_LABEL_EXEMPT_RE.test(s) ||
                          ROLE_FIELD_EXEMPT_RE.test(s) ||
                          PARTICIPANT_ROSTER_EXEMPT_RE.test(s) ||
                          // GRADER-CAL-2 Task 1 — bare cell / pipe roster.
                          BARE_ROLE_CELL_EXEMPT_RE.test(s) ||
                          PIPE_ROSTER_EXEMPT_RE.test(s);
      if (rosterMatch && !DIRECTIVE_VERB_RE.test(s)) continue;
      // GRADER-CAL-4 Task 1 — OWNER-DIRECTIVE exemption. Internal role is
      // the acting subject of a modal directive; skip unless the sentence
      // is advice-delegation or reader-directed.
      if (
        OWNER_DIRECTIVE_RE.test(s) &&
        !DIRECTIVE_VERB_RE.test(s) &&
        !ADVICE_DELEGATION_RE.test(s) &&
        !READER_DIRECTED_RE.test(s)
      ) {
        continue;
      }
      // GRADER-CAL-4 Task 2 — DESCRIPTIVE-STATUS exemption. Role token
      // appears only in a status / parenthetical / past-tense clause and
      // no modal directive addresses the role or the reader.
      if (
        DESCRIPTIVE_STATUS_RE.test(s) &&
        !OWNER_DIRECTIVE_RE.test(s) &&
        !DIRECTIVE_VERB_RE.test(s) &&
        !ADVICE_DELEGATION_RE.test(s) &&
        !READER_DIRECTED_RE.test(s)
      ) {
        continue;
      }
      hits++;
      findings.push(fail("e6_counsel_referral", dim, "high",
        `body-text counsel referral: "${s.slice(0, 1000)}"`));
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
  opts: { sections?: string[]; exemptRe?: RegExp; intakeRoster?: string } = {},
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
    ...checkE6(text, "hallucination", { exemptRe: opts.exemptRe, intakeRoster: opts.intakeRoster }),
  );
  return out;
}

/** Exposed for tests. */
export const _internals = { checkE1, checkE2, checkE3, checkE4, checkE5, checkE6 };
