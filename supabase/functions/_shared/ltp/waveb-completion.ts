/**
 * LTP WAVE-B COMPLETION — deterministic post-generation surface closure.
 *
 * Closes the three surfaces that ran old-path in Wave-B measurement
 * (quality_run #145 evidence: paraphrased purpose, meta-string in
 * priority_actions, free-prose fragment in inconsistency_flags) and
 * adds two standing rules:
 *   (b) PII field-class rendering rule — CONTACT/PERSONNEL intake values
 *       render verbatim ONLY in attestation_block / document_metadata.
 *   (c) Cyber-audit crosswalk — deterministic per-prong § 7120(b)
 *       linkage clauses appended to submission_summary.submission_basis.
 *
 * Zero LLM. Registry-anchored. Fail-open by design.
 */

import { computeTestStates, classifyRevenueBand } from "../cppa-test-states.ts";

export const WAVEB_COMPLETION_STAMP = "ltp-waveb-completion@2026-07-27T02:15:00Z";
export const WAVEB_COMPLETION_VERSION = "waveb-completion-v1";

/** Narrative-class surfaces are EVERY rendered surface EXCEPT these. */
const PII_EXEMPT_TOP_LEVEL: ReadonlySet<string> = new Set([
  "attestation_block",
  "document_metadata",
  "_meta",
]);

/** Meta / first-person prose patterns that must never appear in rendered surfaces. */
const META_STRING_PATTERNS: readonly RegExp[] = [
  /\bwe\s+(?:could|cannot|can'?t|were\s+unable\s+to|are\s+unable\s+to|have\s+not\s+been\s+able\s+to)\s+(?:verify|confirm|assess|determine|establish|validate)\b[^.?!]*[.?!]?/gi,
  /\b(?:I|we)\s+(?:recommend|suggest|believe|think|find|note|would\s+recommend|would\s+suggest)\b[^.?!]*[.?!]?/gi,
  /\bcould\s+not\s+verify\s+this\s+item\s+from\s+the\s+information\s+provided\b[^.?!]*[.?!]?/gi,
];

/** Duplicated-connective classes observed in Wave-B (e.g. "established on the record on the current record"). */
const DUP_CONNECTIVE_PATTERNS: readonly [RegExp, string][] = [
  [/\bon\s+the\s+record\s+on\s+the\s+current\s+record\b/gi, "on the current record"],
  [/\bon\s+the\s+current\s+record\s+on\s+the\s+record\b/gi, "on the current record"],
  [/\bon\s+the\s+record\s+on\s+the\s+record\b/gi, "on the record"],
  [/\bestablished\s+on\s+the\s+record\s+on\s+the\s+current\s+record\b/gi, "established on the current record"],
];

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,2}[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/g;

export interface WaveBCompletionCounters {
  purpose_activities_rewritten: number;
  inconsistency_flags_dropped: number;
  meta_strings_scrubbed: number;
  dup_connectives_scrubbed: number;
  pii_narrative_hits_scrubbed: number;
  submission_basis_prongs_added: number;
}

export interface WaveBCompletionResult {
  readonly report: unknown;
  readonly counters: WaveBCompletionCounters;
  readonly stamp: string;
  readonly version: string;
}

/* ─────────────────────────── (a)(i) purpose verbatim ─────────────────────────── */

export function enforcePurposeVerbatim(
  report: any,
  intake: Record<string, any>,
): number {
  if (!report || typeof report !== "object") return 0;
  const activities = report.risk_assessment_by_activity;
  if (!Array.isArray(activities)) return 0;
  const details: any[] = Array.isArray(intake?.activity_details) ? intake.activity_details : [];
  const fallback = typeof intake?.i1_processing_purpose === "string" ? intake.i1_processing_purpose : "";
  let rewritten = 0;
  activities.forEach((act: any, i: number) => {
    if (!act || typeof act !== "object") return;
    const detail = details[i];
    const verbatim = String(detail?.purpose_description ?? fallback ?? "").trim();
    if (!verbatim) return;
    if (act.purpose !== verbatim) {
      act.purpose = verbatim;
      rewritten++;
    }
  });
  return rewritten;
}

/* ─────────────────────────── (a)(iii) inconsistency_flags TEMPLATE_CUT ─────────────────────────── */

export function enforceInconsistencyFlagsTemplateCut(report: any): number {
  if (!report || typeof report !== "object") return 0;
  const flags = report.inconsistency_flags;
  if (!Array.isArray(flags)) return 0;
  const kept: any[] = [];
  let dropped = 0;
  for (const f of flags) {
    if (!f || typeof f !== "object") { dropped++; continue; }
    const isValidator =
      f.template_id === "T.risk.review_items" ||
      f.provenance === "validator" ||
      f.source === "validator" ||
      typeof f.source_field_a === "string" && typeof f.source_field_b === "string";
    if (isValidator) kept.push(f); else dropped++;
  }
  report.inconsistency_flags = kept;
  return dropped;
}

/* ─────────────────────────── (a)(ii) meta-string ban ─────────────────────────── */

function scrubMetaFromString(s: string, counter: { n: number }): string {
  let out = s;
  for (const re of META_STRING_PATTERNS) {
    out = out.replace(re, () => { counter.n++; return ""; });
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

/* ─────────────────────────── dup-connective scrubber ─────────────────────────── */

function scrubDupConnectivesString(s: string, counter: { n: number }): string {
  let out = s;
  for (const [re, repl] of DUP_CONNECTIVE_PATTERNS) {
    out = out.replace(re, () => { counter.n++; return repl; });
  }
  return out;
}

/* ─────────────────────────── PII narrative ban ─────────────────────────── */

const PII_TOKENS: readonly { re: RegExp; replacement: string }[] = [
  { re: EMAIL_RE, replacement: "the certifying executive's contact on the record" },
  { re: PHONE_RE, replacement: "the certifying executive's contact on the record" },
];

function collectPiiVerbatim(intake: Record<string, any>): { re: RegExp; replacement: string }[] {
  const rules: { re: RegExp; replacement: string }[] = [];
  const add = (val: unknown, replacement: string) => {
    if (typeof val !== "string") return;
    const v = val.trim();
    if (v.length < 2) return;
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    rules.push({ re: new RegExp(escaped, "g"), replacement });
  };
  add(intake?.i8_certifying_exec_name, "the certifying executive");
  add(intake?.i8_certifying_exec_title, "the certifying executive");
  add(intake?.i8_contact_email, "the certifying executive's contact on the record");
  add(intake?.i8_contact_phone, "the certifying executive's contact on the record");
  const roster = intake?.i7_internal_contributors;
  if (typeof roster === "string" && roster.trim().length > 1) {
    // Split on commas / semicolons — replace each name token individually.
    for (const name of roster.split(/[;,\n]+/).map((s) => s.trim()).filter((s) => s.length > 2)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      rules.push({ re: new RegExp(escaped, "g"), replacement: "the internal contributors identified in the record" });
    }
  }
  const consultees = intake?.i7_external_consultees;
  if (typeof consultees === "string" && consultees.trim().length > 1) {
    for (const name of consultees.split(/[;,\n]+/).map((s) => s.trim()).filter((s) => s.length > 2)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      rules.push({ re: new RegExp(escaped, "g"), replacement: "the external consultees identified in the record" });
    }
  }
  return rules;
}

function scrubPiiFromString(
  s: string,
  verbatimRules: { re: RegExp; replacement: string }[],
  counter: { n: number },
): string {
  let out = s;
  for (const { re, replacement } of verbatimRules) {
    out = out.replace(re, () => { counter.n++; return replacement; });
  }
  for (const { re, replacement } of PII_TOKENS) {
    out = out.replace(re, () => { counter.n++; return replacement; });
  }
  return out;
}

/** POST-RENDER ASSERTION: any remaining email/phone in a narrative surface is a hard reject. */
export function assertNoPiiInNarrative(report: any): string[] {
  const errors: string[] = [];
  if (!report || typeof report !== "object") return errors;
  for (const [key, val] of Object.entries(report)) {
    if (PII_EXEMPT_TOP_LEVEL.has(key)) continue;
    walk(val, key);
  }
  function walk(node: unknown, path: string): void {
    if (typeof node === "string") {
      if (EMAIL_RE.test(node)) errors.push(`pii_email_in_narrative:${path}`);
      EMAIL_RE.lastIndex = 0;
      if (PHONE_RE.test(node)) errors.push(`pii_phone_in_narrative:${path}`);
      PHONE_RE.lastIndex = 0;
      return;
    }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, `${path}.${k}`);
    }
  }
  return errors;
}

/* ─────────────────────────── walker that applies string transforms ─────────────────────────── */

function walkStrings(
  node: unknown,
  parentKey: string,
  narrativeScope: boolean,
  transform: (s: string, narrative: boolean) => string,
): unknown {
  if (typeof node === "string") return transform(node, narrativeScope);
  if (Array.isArray(node)) return node.map((v, i) => walkStrings(v, `${parentKey}[${i}]`, narrativeScope, transform));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const childNarrative = narrativeScope; // scope is fixed at top-level entry
      out[k] = walkStrings(v, k, childNarrative, transform);
    }
    return out;
  }
  return node;
}

/* ─────────────────────────── priority_actions meta-string filter ─────────────────────────── */

function filterPriorityActions(report: any, counter: { n: number }): void {
  if (!report || !Array.isArray(report.priority_actions)) return;
  const kept: any[] = [];
  for (const a of report.priority_actions) {
    const text = String(a?.action ?? a?.title ?? a?.description ?? a?.rationale ?? "");
    let violates = false;
    for (const re of META_STRING_PATTERNS) {
      re.lastIndex = 0;
      if (re.test(text)) { violates = true; break; }
    }
    if (violates) counter.n++; else kept.push(a);
  }
  report.priority_actions = kept;
}

/* ─────────────────────────── (c) submission_basis § 7120(b) crosswalk ─────────────────────────── */

const PRONG_LABELS: Record<"b1" | "b2A" | "b2B", { pinpoint: string; label: string }> = {
  b1: { pinpoint: "§ 7120(b)(1)", label: "50%-from-sale/share prong" },
  b2A: { pinpoint: "§ 7120(b)(2)(A)", label: "consumer-volume + revenue prong" },
  b2B: { pinpoint: "§ 7120(b)(2)(B)", label: "sensitive-PI volume prong" },
};

type ProngOutcome = "met" | "not met" | "not applicable" | "indeterminate";

export function computeProngOutcomes(intake: Record<string, any>): Record<"b1" | "b2A" | "b2B", ProngOutcome> {
  const fiveStage = { triggers: {}, exceptions: {}, activity_details: [], impact: {}, org_context: {} } as any;
  let states: Record<string, any> = {};
  try { states = computeTestStates(fiveStage, intake) as any; } catch { /* fail-open */ }
  const mapM = (m: any): ProngOutcome => {
    switch (m?.state) {
      case "resolved_met": return "met";
      case "resolved_not_met": return "not met";
      case "resolved_not_applicable": return "not applicable";
      default: return "indeterminate";
    }
  };
  // b1 = M5; b2B = M4; b2A derived from consumer-band + revenue band.
  const q2 = String(intake?.q2_consumers ?? "").trim();
  const band = classifyRevenueBand(intake?.q1_revenue);
  const over250k = /^(250,000\s+to\s+under\s+1,000,000|1,000,000\s+or\s+more|250,000–1\s+million|1–10\s+million|Over\s+10\s+million)$/i.test(q2);
  const under100k = /^(Under\s+100,000|Fewer\s+than\s+100,000)$/i.test(q2);
  let b2A: ProngOutcome;
  if (!q2 || band.over_25m === "indeterminate") b2A = "indeterminate";
  else if (under100k || band.over_25m === false) b2A = "not met";
  else if (over250k && band.over_25m === true) b2A = "met";
  else b2A = "indeterminate";
  return {
    b1: mapM(states.M5),
    b2A,
    b2B: mapM(states.M4),
  };
}

export function extendSubmissionBasisCrosswalk(report: any, intake: Record<string, any>): number {
  if (!report || typeof report !== "object") return 0;
  const summary = report.submission_summary;
  if (!summary || typeof summary !== "object") return 0;
  const base = String(summary.submission_basis ?? "");
  // Idempotent: skip if we already appended prong clauses.
  if (base.includes("cybersecurity-audit linkage — § 7120(b)(1)")) return 0;
  const outcomes = computeProngOutcomes(intake);
  const clauses: string[] = [];
  let added = 0;
  for (const key of ["b1", "b2A", "b2B"] as const) {
    const { pinpoint, label } = PRONG_LABELS[key];
    const outcome = outcomes[key];
    clauses.push(`cybersecurity-audit linkage — ${pinpoint} (${label}) ${outcome} on the record`);
    added++;
  }
  const glue = base && !/;\s*$/.test(base) ? "; " : "";
  summary.submission_basis = `${base}${glue}${clauses.join("; ")}`;
  return added;
}

/* ─────────────────────────── orchestrator ─────────────────────────── */

export function applyWaveBCompletion(
  report: any,
  intake: Record<string, any>,
): WaveBCompletionResult {
  const counters: WaveBCompletionCounters = {
    purpose_activities_rewritten: 0,
    inconsistency_flags_dropped: 0,
    meta_strings_scrubbed: 0,
    dup_connectives_scrubbed: 0,
    pii_narrative_hits_scrubbed: 0,
    submission_basis_prongs_added: 0,
  };
  if (!report || typeof report !== "object") {
    return { report, counters, stamp: WAVEB_COMPLETION_STAMP, version: WAVEB_COMPLETION_VERSION };
  }

  // (a)(i) purpose verbatim
  counters.purpose_activities_rewritten = enforcePurposeVerbatim(report, intake);

  // (a)(iii) template cut
  counters.inconsistency_flags_dropped = enforceInconsistencyFlagsTemplateCut(report);

  // (a)(ii) meta-string ban on priority_actions (drop entries) + all narrative surfaces (scrub sentence).
  const metaCounter = { n: 0 };
  filterPriorityActions(report, metaCounter);

  // Walk narrative surfaces for meta-string + dup-connective + PII scrubs.
  const dupCounter = { n: 0 };
  const piiCounter = { n: 0 };
  const piiRules = collectPiiVerbatim(intake);

  for (const [key, val] of Object.entries(report)) {
    if (PII_EXEMPT_TOP_LEVEL.has(key)) continue;
    const rewritten = walkStrings(val, key, true, (s) => {
      let out = s;
      out = scrubMetaFromString(out, metaCounter);
      out = scrubDupConnectivesString(out, dupCounter);
      out = scrubPiiFromString(out, piiRules, piiCounter);
      return out;
    });
    (report as any)[key] = rewritten;
  }

  counters.meta_strings_scrubbed = metaCounter.n;
  counters.dup_connectives_scrubbed = dupCounter.n;
  counters.pii_narrative_hits_scrubbed = piiCounter.n;

  // (c) crosswalk — deterministic per-prong § 7120(b) clauses.
  counters.submission_basis_prongs_added = extendSubmissionBasisCrosswalk(report, intake);

  return { report, counters, stamp: WAVEB_COMPLETION_STAMP, version: WAVEB_COMPLETION_VERSION };
}
