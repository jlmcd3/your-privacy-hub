// ─────────────────────────────────────────────────────────────────────────────
// ITEM 413 — REGISTRATION PROSE GOLD (R1–R11 for a DETERMINISTIC product).
//
// Registration makes no model calls, so there is no refinement leg and no
// critic here. Everything below is a deterministic repair over the assembled
// report, applied at the single finalize seam of `run-registration-assessment`.
//
// THE WORK LIST came from the render walk of `quality_run_documents`
// ad4d1532-3d87-4386-8636-2dc94237c353 (full-batch render, 88.95). The four
// register defects it evidences:
//
//   RG-1  BULLET-GLYPH ASSEMBLY ARTIFACT. `registration-engine.ts` joined two
//         merged reasons with " • ", producing reader prose such as
//         "Offers goods/services to residents of UK • UK GDPR applies; ICO
//         annual data-protection fee required". A glyph is not a conjunction.
//
//   RG-2  FIELD-LABEL LITANY. The Art. 27 record_fact rendered as
//         "Establishment in EU: yes Markets served include EU: not stated.
//         Public authority: no" — form labels, colons, and a missing stop.
//
//   RG-3  HOLLOW FACT. "The record does not state this." names nothing. The
//         reader cannot act on it because it does not say what "this" is.
//
//   RG-4  APPARATUS-FIRST OPENING. narrative.overview opened "This assessment
//         examines whether …" — the method before the answer (the G-2 rule).
//
// NOT A DEFECT, stated so it is not "fixed" later by mistake: the tokens
// R1_HOME / R3_MARKET / R4_UK_ICO appear in that document ONLY as values of
// the `rule_id` key. That is determination machinery, not reader prose, and it
// is protected here. The R11 lint asserts they never reach a prose surface.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReferencePassage } from "../prose/registration-reference-passages.ts";

export const REGISTRATION_PROSE_GOLD_VERSION =
  "registration-prose-gold-2026-08-08-item413";

export const REGISTRATION_PIPELINE_STAMP = "registration-pipeline@item413-2026-08-08";

// ── PROTECTED LEAVES ────────────────────────────────────────────────────────
// Determination machinery, verbatim corpus bytes and identity fields. A repair
// that touches any of these is a defect, not an improvement.

const PROTECTED_KEYS = new Set<string>([
  "citation",
  "citations",
  "window_citation",
  "fee_citation",
  "pinpoint",
  "corpus_key",
  "standard",
  "window_standard",
  "fee_standard",
  "verbatim_quote",
  "verbatim_excerpt",
  "primary_source_url",
  "official_source_url",
  "source_url",
  "verdict",
  "status",
  "decision",
  "rule_id",
  "rule_ids",
  "rules_fired",
  "code",
  "key",
  "intake_key",
  "jurisdiction",
  "role",
  "met",
  "ready",
  "ready_to_file",
  "confidence",
  "named_provisions",
  "engaged_branches",
  "engaged_markets",
  "data_broker_registrations",
  "_meta",
  "_staging",
]);

export function isProtectedRegistrationKey(key: string): boolean {
  return PROTECTED_KEYS.has(key) || /_stamp$|_version$|_id$|_at$|_url$/.test(key);
}

/** A string is protected when it IS, or sits entirely inside, a corpus passage. */
export function isProtectedRegistrationString(
  value: string,
  passages: readonly ReferencePassage[],
): boolean {
  const v = value.trim();
  if (!v) return false;
  return passages.some((p) => p.bytes && (p.bytes === v || p.bytes.includes(v)));
}

// ── RG-1 — BULLET-GLYPH ASSEMBLY ARTIFACT ───────────────────────────────────

export function repairGlyphJoiner(text: string): string {
  if (!text.includes("•")) return text;
  return text
    .split("•")
    .map((part) => part.trim())
    .filter((p) => p.length > 0)
    .map((p) => (/[.!?;]$/.test(p) ? p : `${p}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── RG-2 — FIELD-LABEL LITANY ───────────────────────────────────────────────
// "Label: value Label: value" is a form, not a sentence. The repair keeps every
// value and drops the colons, so nothing is lost and nothing is invented.

const LABEL_LITANY_RE = /(^|[.\s])([A-Z][A-Za-z][^:.]{2,48}):\s(yes|no|not stated|not recorded)(\.)?/g;

export function repairLabelColonLitany(text: string): string {
  if (!/: (yes|no|not stated|not recorded)/.test(text)) return text;
  const out = text.replace(LABEL_LITANY_RE, (_m, lead, label, value) => {
    const l = String(label).trim();
    const head = l.charAt(0).toLowerCase() + l.slice(1);
    const v = String(value);
    const clause = v === "yes"
      ? `the record states ${head}`
      : v === "no"
      ? `the record states ${head} does not apply`
      : `the record does not state ${head}`;
    return `${lead}${clause.charAt(0).toUpperCase()}${clause.slice(1)}.`;
  });
  return out.replace(/\s+/g, " ").replace(/\.\s*\./g, ".").trim();
}

// ── RG-3 — HOLLOW FACT ──────────────────────────────────────────────────────
// The repair of record is at the emission site (`build.ts` derives the unknown
// sentence from the affirmative one, so it always names the fact). This is the
// belt-and-braces detector and the residual last-resort rewrite.

export const REGISTRATION_HOLLOW_PHRASINGS: readonly string[] = [
  "The record does not state this.",
  "The record does not state this",
  "Not stated.",
  "Unknown.",
  "N/A.",
];

export function detectHollowFacts(text: string): string[] {
  const t = text.trim();
  return REGISTRATION_HOLLOW_PHRASINGS.filter((p) => t === p);
}

export function repairHollowFact(text: string): string {
  if (text.trim() !== "The record does not state this.") return text;
  return "The record does not state the fact this limb turns on.";
}

// ── RG-4 — VERDICT-LED OPENING ──────────────────────────────────────────────

const APPARATUS_OPENERS: ReadonlyArray<[RegExp, string]> = [
  [
    /^This assessment examines whether /,
    "This assessment determines whether ",
  ],
  [/^The purpose of this section is to /, "This section "],
  [/^Below,? (?:we|this report) (?:set out|sets out|examine|examines) /, "This report sets out "],
];

export function repairApparatusOpener(text: string): string {
  let out = text;
  for (const [re, rep] of APPARATUS_OPENERS) out = out.replace(re, rep);
  return out;
}

/**
 * The verdict-led overview opener (G-2 class). The engine's overview described
 * its own method first; the ratified register puts the answer first. Composed
 * from facts the caller already holds — nothing is inferred here.
 */
export function verdictLedOverviewOpener(
  orgName: string,
  registrableStates: readonly string[],
  euRepEngaged: boolean,
  ukRepEngaged: boolean,
): string {
  const parts: string[] = [];
  if (registrableStates.length) {
    parts.push(
      `${orgName} is registrable in ${registrableStates.join(", ")} on the facts recorded`,
    );
  } else {
    parts.push(
      `No US state data-broker registration regime in this product's verified corpus is in scope for ${orgName} on the facts recorded`,
    );
  }
  const reps: string[] = [];
  if (euRepEngaged) reps.push("an EU representative under GDPR Art. 27");
  if (ukRepEngaged) reps.push("a UK representative under UK GDPR Art. 27");
  if (reps.length) parts.push(`and ${reps.join(" and ")} must be designated`);
  return `${parts.join(", ")}.`;
}

// ── THE CUSTOMER REGISTER (one voice per surface) ───────────────────────────

const INTERNAL_VOCABULARY: ReadonlyArray<[RegExp, string]> = [
  [/\brecord_insufficient\b/g, "the record does not support a conclusion"],
  [/\binformation_needed\b/g, "the information still needed"],
  [/\bintake_key\b/g, "the recorded answer"],
  [/\bobligations_summary\b/g, "the jurisdiction matrix"],
  [/\bregistration_deliverables\b/g, "the determinations below"],
];

export function stripInternalVocabulary(text: string): string {
  let out = text;
  for (const [re, rep] of INTERNAL_VOCABULARY) out = out.replace(re, rep);
  return out;
}

/** All of the above, in the order the register applies them. */
export function repairRegistrationProse(text: string): string {
  if (!text || text.length < 2) return text;
  let out = text;
  out = repairGlyphJoiner(out);
  out = repairLabelColonLitany(out);
  out = repairHollowFact(out);
  out = repairApparatusOpener(out);
  out = stripInternalVocabulary(out);
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;])/g, "$1");
  return out;
}

// ── THE PASS ────────────────────────────────────────────────────────────────

export interface RegistrationProseGoldResult {
  readonly report: Record<string, unknown>;
  readonly repaired_paths: readonly string[];
}

export function applyRegistrationProseGold(
  input: Record<string, unknown>,
  passages: readonly ReferencePassage[] = [],
): RegistrationProseGoldResult {
  const repaired: string[] = [];

  const walk = (value: unknown, key: string, path: string): unknown => {
    if (typeof value === "string") {
      if (isProtectedRegistrationKey(key)) return value;
      if (isProtectedRegistrationString(value, passages)) return value;
      const next = repairRegistrationProse(value);
      if (next !== value) repaired.push(path);
      return next;
    }
    if (Array.isArray(value)) return value.map((v, i) => walk(v, key, `${path}[${i}]`));
    if (value && typeof value === "object") {
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        out[k] = isProtectedRegistrationKey(k) ? v : walk(v, k, `${path}.${k}`);
      }
      return out;
    }
    return value;
  };

  let report = walk(input, "", "$") as Record<string, unknown>;
  report = stampRegistrationPipeline(report);
  return { report, repaired_paths: repaired };
}

/** The finalize-point stamp. Idempotent. */
export function stampRegistrationPipeline(
  report: Record<string, unknown>,
): Record<string, unknown> {
  const meta = { ...((report._meta as Record<string, unknown> | undefined) ?? {}) };
  const internal = { ...((meta.internal as Record<string, unknown> | undefined) ?? {}) };
  internal.registration_pipeline_stamp = REGISTRATION_PIPELINE_STAMP;
  internal.registration_prose_gold_version = REGISTRATION_PROSE_GOLD_VERSION;
  meta.internal = internal;
  return { ...report, _meta: meta };
}
