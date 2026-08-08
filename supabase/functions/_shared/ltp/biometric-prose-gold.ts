// ─────────────────────────────────────────────────────────────────────────────
// ITEM 409 — BIOMETRIC PROSE GOLD (register repairs).
//
// The walked renders establish that the biometric document is a single
// `assessment_text` string. So this layer is a REGISTER pass over rendered
// strings, not a section composer:
//
//   BG-1 (R1)  verdict-led openings — the determination takes the sentence's
//              first position; the intake qualifier follows it.
//   BG-2 (R2)  one voice per surface — the shouted emphases the generator
//              inherits from its prompt are spoken in the document's register.
//   BG-3 (R3)  no bare enum values and no field-label colons in prose. The
//              item408 intake contract's option lists are the source of truth
//              for what counts as an enum leak.
//   BG-4       internal vocabulary rendered customer-facing on reader surfaces;
//              machine-keyed fields are NAMED AND LEFT.
//   BG-5       hollow reader-surface fields omitted.
//
// PROTECTED LEAVES — never rewritten by any pass above:
//   • verified statutory passages (byte-identical, the product's whole idiom),
//   • citations, pinpoints, corpus keys, source urls,
//   • determination machinery: decisions, enums, risk ratings, rule ids,
//   • machine-keyed chrome: stamps, registry/build versions, deployment ids.
// ─────────────────────────────────────────────────────────────────────────────

import {
  BIO_ORG,
  BIO_PURPOSE,
  BIO_TYPES,
} from "../intake-contracts/biometric.ts";
import { BIOMETRIC_PIPELINE_STAMP } from "../prose/plans/biometric.spine.ts";
import type { ReferencePassage } from "../prose/biometric-reference-passages.ts";

export const BIOMETRIC_PROSE_GOLD_VERSION = "biometric-prose-gold-2026-08-08-item412b";

// ── PROTECTED KEYS ──────────────────────────────────────────────────────────

const PROTECTED_KEYS = new Set<string>([
  "citation",
  "citations",
  "pinpoint",
  "corpus_key",
  "source_url",
  "sources",
  "verbatim_quote",
  "verbatim_excerpt",
  "statute_key",
  "statute_short",
  "statute_long",
  "jurisdiction",
  "jurisdictions",
  "jurisdictions_analysed",
  "decision",
  "rule_ids",
  "risk_rating",
  "compliance_risk_rating",
  "status",
  "id",
  "registry_version",
  "build_stamp",
  "deployment_id",
  "prompt_version",
  "biometric_pipeline_stamp",
  "generated_at",
  "_meta",
  "envelope",
  "annotations",
  "lint_warnings",
]);

export function isProtectedBiometricKey(key: string): boolean {
  return PROTECTED_KEYS.has(key) || /_stamp$|_version$|_id$|_at$/.test(key);
}

/** A string is protected when it IS (or is entirely inside) a verified passage. */
export function isProtectedBiometricString(
  value: string,
  passages: readonly ReferencePassage[],
): boolean {
  const v = value.trim();
  if (!v) return false;
  return passages.some((p) => p.bytes && (p.bytes === v || p.bytes.includes(v)));
}

// ── ENUM DECODING (BG-3) ────────────────────────────────────────────────────
// Every key below is a verbatim option string from the item408 intake contract.

const ORG_PROSE: Record<string, string> = {
  "Employer (employee biometrics)": "an employer processing employee biometrics",
  "Consumer app or platform": "a consumer app or platform",
  "Healthcare provider": "a healthcare provider",
  "Financial institution / fintech": "a financial institution",
  "Security / access control provider": "a security and access-control provider",
  "Research organisation": "a research organisation",
  "Other": "an organisation of another kind",
};

const TYPE_PROSE: Record<string, string> = {
  "Facial geometry / facial recognition": "facial geometry",
  "Fingerprint / palm print": "fingerprint or palm-print data",
  "Voiceprint / speaker recognition": "voiceprints",
  "Iris or retina scan": "iris or retina scans",
  "Gait analysis": "gait analysis",
  "Vein pattern recognition": "vein-pattern data",
  "Other biometric identifier": "another biometric identifier",
};

const PURPOSE_PROSE: Record<string, string> = {
  "Time & attendance / workforce management": "time and attendance and workforce management",
  "Physical access control": "physical access control",
  "Customer authentication": "customer authentication",
  "Surveillance / monitoring": "surveillance and monitoring",
  "Research or product development": "research or product development",
  "Other": "the purpose the record describes",
};

/** The enum-leak test's source of truth: every contract option, in prose. */
export const BIOMETRIC_ENUM_PROSE: Readonly<Record<string, string>> = {
  ...ORG_PROSE,
  ...TYPE_PROSE,
  ...PURPOSE_PROSE,
};

/** Every option string that must never appear bare in prose. */
export const BIOMETRIC_ENUM_OPTIONS: readonly string[] = [
  ...BIO_ORG,
  ...BIO_TYPES,
  ...BIO_PURPOSE,
];

function orgPhrase(raw: string): string {
  const t = raw.trim();
  return ORG_PROSE[t] ?? `a ${t.toLowerCase()}`;
}

function typePhrase(raw: string): string {
  const t = raw.trim();
  return TYPE_PROSE[t] ?? t.toLowerCase();
}

function purposePhrase(raw: string): string {
  const t = raw.trim().replace(/[.\s]+$/, "");
  return PURPOSE_PROSE[t] ?? t.toLowerCase();
}

function joinPhrases(list: string[]): string {
  if (list.length <= 1) return list[0] ?? "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** Splits `A, B, C` on commas that separate whole contract options. */
function splitTypes(raw: string): string[] {
  const parts = raw.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [raw.trim()];
}

// ── BG-1 + BG-3: THE OPENER ─────────────────────────────────────────────────

/**
 * BEFORE (walked render 28583f46, verbatim):
 *   "On the intake as supplied, this framework applies conditionally — Employer
 *    (employee biometrics) organisation processing Fingerprint / palm print for
 *    the stated purpose: Time & attendance / workforce management."
 *
 * AFTER:
 *   "This framework applies to the processing described, conditionally on the
 *    intake as supplied. The organisation is an employer processing employee
 *    biometrics, and it processes fingerprint or palm-print data for time and
 *    attendance and workforce management."
 */
const OPENER_RE =
  /On the intake as supplied, this framework applies conditionally — ([^\n]*?)\.(?=\s|$)/g;

const DESC_RE = /^(.*?)\s+organisation processing\s+(.*?)\s+for the stated purpose:\s+(.*)$/s;
const DESC_IDLE_RE = /^(.*?)\s+organisation with no active biometric processing currently deployed$/s;

export function repairApparatusOpener(text: string): string {
  return text.replace(OPENER_RE, (_m, desc: string) => {
    const verdict = "This framework applies to the processing described, conditionally on the intake as supplied.";
    const sentence = describeProcessingAsProse(desc);
    return sentence ? `${verdict} ${sentence}` : verdict;
  });
}

export function describeProcessingAsProse(desc: string): string {
  const idle = DESC_IDLE_RE.exec(desc.trim());
  if (idle) {
    return `The organisation is ${orgPhrase(idle[1])}, and the record describes no biometric processing currently deployed.`;
  }
  const m = DESC_RE.exec(desc.trim());
  if (!m) {
    // Unrecognised shape: leave the description alone rather than mangle it.
    return desc.trim().replace(/\.$/, "") + ".";
  }
  const org = orgPhrase(m[1]);
  const types = joinPhrases(splitTypes(m[2]).map(typePhrase));
  const purpose = purposePhrase(m[3]);
  return `The organisation is ${org}, and it processes ${types} for ${purpose}.`;
}

// ── BG-3: THE REQUIREMENTS HEADING ──────────────────────────────────────────

const HEADING_RE = /^Key requirements for (.+?) using (.+?):$/gm;

export function repairRequirementsHeading(text: string): string {
  return text.replace(HEADING_RE, (_m, org: string, type: string) =>
    `The requirements that attach here, for ${orgPhrase(org)} using ${typePhrase(type)}:`
  );
}

// ── BG-3: RESIDUAL FIELD-LABEL COLONS ───────────────────────────────────────

const FIELD_LABEL_COLONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfor the stated purpose:\s*/g, "for "],
  [/\bApplies to this organisation:\s*/g, ""],
  [/\bApplicability:\s*Conditional\b/g, "The framework applies conditionally"],
  [/\bStatus:\s*Conditional\b/g, "The requirement remains open"],
];

export function stripFieldLabelColons(text: string): string {
  let out = text;
  for (const [re, to] of FIELD_LABEL_COLONS) out = out.replace(re, to);
  return out;
}

// ── BG-2: ONE VOICE PER SURFACE ─────────────────────────────────────────────
// Exact phrases only. Risk-rating enums (CRITICAL / HIGH / MODERATE / LOW) are
// determination machinery and are NOT in this list.

const DESHOUT: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bOUT OF SCOPE\b/g, "out of scope"],
  [/\bSEPARATE AND DISTINCT\b/g, "separate and distinct"],
  [/\bPRIVATE RIGHT OF ACTION\b/g, "private right of action"],
  [/\bNOT INGESTED\b/g, "not ingested"],
  [/\bBEFORE any\b/g, "before any"],
  [/\bBEFORE collection\b/g, "before collection"],
];

export function applyOneVoice(text: string): string {
  let out = text;
  for (const [re, to] of DESHOUT) out = out.replace(re, to);
  return out;
}

// ── BG-4: INTERNAL VOCABULARY → CUSTOMER-FACING ─────────────────────────────

const CUSTOMER_REGISTER: ReadonlyArray<readonly [RegExp, string]> = [
  [/\brecord_insufficient\b/g, "the record does not settle this"],
  [/\binsufficient_basis\b/g, "the record does not yet support a conclusion"],
  [/\bresolved_met\b/g, "met on the record"],
  [/\bresolved_not_met\b/g, "not met on the record"],
  [/\bINDETERMINATE\b/g, "open on the record"],
  [/\bcannot be determined\b/g, "is not settled by the record"],
  [/\bno basis to assess\b/g, "the record does not yet support an assessment"],
];

export function applyBiometricCustomerRegister(text: string): string {
  let out = text;
  for (const [re, to] of CUSTOMER_REGISTER) out = out.replace(re, to);
  return out;
}

/**
 * ITEM 411 LEG C — THE ABSENCE-LABEL PHRASING CLASS.
 *
 * ITEM 396 LESSON, APPLIED: the CSC absence detector is BUILT FROM the
 * phrasings THIS pass can write, so a relabel can never escape its own
 * detector. Every string below is a replacement value the BG-4 customer
 * register or the BG-1 opener repair emits verbatim. The linkage test in
 * `tests/edge/item411/biometric-csc-and-coverage.test.ts` enumerates this
 * array and asserts `biometricCarriesAbsence` matches each one.
 *
 * NOT in this list: resolved labels ("met on the record", "not met on the
 * record"), which are determinations and must never be read as absence.
 */
export const BIOMETRIC_ABSENCE_LABEL_PHRASINGS: readonly string[] = [
  "the record does not settle this",
  "the record does not yet support a conclusion",
  "the record does not yet support an assessment",
  "is not settled by the record",
  "open on the record",
  "the record describes no biometric processing currently deployed",
];


// ── THE STRING PASS, WITH PASSAGE SPANS PROTECTED ───────────────────────────

/**
 * Repairs run only OUTSIDE verified passages. The passage spans are cut out of
 * the string, the remainder is repaired, and the spans are put back byte for
 * byte — so no register pass can ever touch statutory text.
 */
export function repairBiometricProse(
  text: string,
  passages: readonly ReferencePassage[],
): string {
  const spans = passageSpans(text, passages);
  if (!spans.length) return repairSegment(text);

  let out = "";
  let cursor = 0;
  for (const [start, end] of spans) {
    out += repairSegment(text.slice(cursor, start));
    out += text.slice(start, end); // verbatim
    cursor = end;
  }
  out += repairSegment(text.slice(cursor));
  return out;
}

function repairSegment(segment: string): string {
  if (!segment) return segment;
  let out = segment;
  out = repairApparatusOpener(out);
  out = repairRequirementsHeading(out);
  out = stripFieldLabelColons(out);
  out = applyOneVoice(out);
  out = applyBiometricCustomerRegister(out);
  out = repairStatutoryTriggers(out);
  return out;
}

// ── ITEM 412-B (a) — MISSTATED STATUTORY TRIGGER, DETERMINISTIC REPAIR ──────
// Graded HIGH on the perfect pilot (document 1b608e10): the BIPA retention
// surface stated destruction "within 3 years of collection". 740 ILCS 14/15(a)
// measures the outer bound from the individual's LAST INTERACTION with the
// private entity, not from collection. W2 already names this class for the
// critic; a misstated statutory trigger is too load-bearing to leave to a
// model call, so it is also repaired deterministically here, on EVERY path.
// Reference passages are span-excluded upstream (`repairBiometricProse`), so
// this never touches quoted statutory text.
export const BIOMETRIC_STATUTORY_TRIGGER_REPAIRS: ReadonlyArray<
  { readonly id: string; readonly pattern: RegExp; readonly replacement: string }
> = [
  {
    id: "bipa_15a_last_interaction",
    // "within 3 years of collection" / "3 years from collection" / "…of the date of collection"
    pattern: /\b(?:with|wi)?(?:in|thin)?\s*(3|three)\s+years?\s+(?:of|from|after)\s+(?:the\s+)?(?:date\s+of\s+)?collection\b/gi,
    replacement: "within 3 years of the individual's last interaction with the entity",
  },
];

export function repairStatutoryTriggers(text: string): string {
  let out = text;
  for (const r of BIOMETRIC_STATUTORY_TRIGGER_REPAIRS) out = out.replace(r.pattern, r.replacement);
  return out;
}

/** Detector — the same vocabulary, read-only, for lint/telemetry callers. */
export function detectStatutoryTriggerDefects(text: string): string[] {
  const hits: string[] = [];
  for (const r of BIOMETRIC_STATUTORY_TRIGGER_REPAIRS) {
    const re = new RegExp(r.pattern.source, r.pattern.flags);
    if (re.test(text)) hits.push(r.id);
  }
  return hits;
}


/** Non-overlapping [start,end) spans of verified passages, in order. */
export function passageSpans(
  text: string,
  passages: readonly ReferencePassage[],
): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  for (const p of passages) {
    if (!p.bytes) continue;
    let from = 0;
    for (;;) {
      const i = text.indexOf(p.bytes, from);
      if (i < 0) break;
      found.push([i, i + p.bytes.length]);
      from = i + p.bytes.length;
    }
  }
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: Array<[number, number]> = [];
  for (const s of found) {
    const last = merged[merged.length - 1];
    if (last && s[0] < last[1]) {
      if (s[1] > last[1]) last[1] = s[1];
      continue;
    }
    merged.push([s[0], s[1]]);
  }
  return merged;
}

// ── BG-5: HOLLOW FIELD OMISSION ─────────────────────────────────────────────
// Reader surfaces only. Machine channels (annotations, lint_warnings) keep
// their empty arrays — they are consumed by QA, not by a reader.

export const BIOMETRIC_HOLLOW_READER_KEYS: readonly string[] = ["enforcement_precedents"];

export function applyBiometricHollowOmission(
  report: Record<string, unknown>,
  keys: readonly string[] = BIOMETRIC_HOLLOW_READER_KEYS,
): Record<string, unknown> {
  const out = { ...report };
  for (const k of keys) {
    const v = out[k];
    if (Array.isArray(v) ? v.length === 0 : typeof v === "string" ? !v.trim() : v == null) {
      delete out[k];
    }
  }
  return out;
}

// ── THE ENTRY POINT ─────────────────────────────────────────────────────────

export interface BiometricProseGoldResult {
  readonly report: Record<string, unknown>;
  readonly repaired_keys: readonly string[];
}

/**
 * Walks the report, repairs every unprotected reader string, omits hollow
 * reader fields, and writes the pipeline stamp into
 * `_meta.internal.biometric_pipeline_stamp`.
 */
export function applyBiometricProseGold(
  input: Record<string, unknown>,
  passages: readonly ReferencePassage[] = [],
): BiometricProseGoldResult {
  const repaired: string[] = [];

  const walk = (value: unknown, key: string, path: string): unknown => {
    if (typeof value === "string") {
      if (isProtectedBiometricKey(key)) return value;
      if (isProtectedBiometricString(value, passages)) return value;
      const next = repairBiometricProse(value, passages);
      if (next !== value) repaired.push(path);
      return next;
    }
    if (Array.isArray(value)) return value.map((v, i) => walk(v, key, `${path}[${i}]`));
    if (value && typeof value === "object") {
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        out[k] = isProtectedBiometricKey(k) && k !== "_meta" ? v : walk(v, k, `${path}.${k}`);
      }
      return out;
    }
    return value;
  };

  let report = walk(input, "", "$") as Record<string, unknown>;
  report = applyBiometricHollowOmission(report);
  report = stampBiometricPipeline(report);

  return { report, repaired_keys: repaired };
}

/** The finalize-point stamp. Idempotent. */
export function stampBiometricPipeline(
  report: Record<string, unknown>,
): Record<string, unknown> {
  const meta = { ...((report._meta as Record<string, unknown> | undefined) ?? {}) };
  const internal = { ...((meta.internal as Record<string, unknown> | undefined) ?? {}) };
  internal.biometric_pipeline_stamp = BIOMETRIC_PIPELINE_STAMP;
  internal.biometric_prose_gold_version = BIOMETRIC_PROSE_GOLD_VERSION;
  meta.internal = internal;
  return { ...report, _meta: meta };
}
