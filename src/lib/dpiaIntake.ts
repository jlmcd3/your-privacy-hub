// DPIA intake — pure helpers behind src/pages/DPIAFramework.tsx.
//
// DPIA Intake Master Review (2026-09-15). Everything here is deterministic
// and page-free so it can be unit-tested (the page module cannot be imported
// under vitest because the Supabase client needs an environment).
//
//   F01  screening prompts: shared enum labels, clause-scoped negation, and
//        "potential trigger" wording — a screening cue is never presented as
//        a conclusion that a mandatory trigger is satisfied.
//   F04  the folded "Other: …" supplier is restored to its own control.
//   F05  one transfer-row schema (the contract's snake_case keys) with a
//        lossless reader for the legacy camelCase rows the page used to emit.
//   F08  special-category status: health data is special-category as such;
//        biometric data only when used to uniquely identify a person
//        (Art. 9(1)); an unstated purpose leaves the classification OPEN.
//   F11  transfer presence and row completeness are explicit states.

import {
  ARTICLE_9_CONDITIONS,
  BIOMETRIC_UNIQUE_ID,
  TRANSFER_PRESENCE,
} from "@/pages/DPIAFramework.enums";

// ── Negation (mirrors supabase/functions/_shared/lia/lia-use-case-classifier.ts) ──

/** Clause boundaries: sentence punctuation, line breaks and contrastive connectors. */
const CLAUSE_BOUNDARY = /[.;!?\n]|,?\s+(?:but|however|whereas|although|while)\s+/gi;
/** Negation cues; "no" and "not" as whole words so "note"/"notice" never trigger. */
const NEGATION_CUE =
  /\b(?:do(?:es)?\s+not|don['’]t|doesn['’]t|did\s+not|didn['’]t|is\s+not|isn['’]t|are\s+not|aren['’]t|was\s+not|wasn['’]t|will\s+not|won['’]t|cannot|can['’]t|never|no|not|none|nor|without|exclud(?:e|es|ed|ing)|except(?:ing)?|rules?\s+out|ruled\s+out|other\s+than|free\s+of|absence\s+of|instead\s+of|rather\s+than|refrain(?:s|ed)?\s+from|prohibit(?:s|ed)?)\b/gi;

interface Clause { text: string; start: number }

function splitClauses(text: string): Clause[] {
  const out: Clause[] = [];
  let last = 0;
  for (const m of text.matchAll(CLAUSE_BOUNDARY)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx), start: last });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), start: last });
  return out;
}

/**
 * How often `pattern` occurs ASSERTED (no negation cue earlier in the same
 * clause) and how often NEGATED. Case-insensitive; `pattern` is a literal
 * stem such as "profil".
 */
export function assertedMentions(text: string, pattern: string): { asserted: number; negated: number } {
  const hay = (text ?? "").toLowerCase();
  const needle = pattern.toLowerCase();
  let asserted = 0;
  let negated = 0;
  for (const clause of splitClauses(hay)) {
    const cues = [...clause.text.matchAll(NEGATION_CUE)].map((m) => m.index ?? 0);
    let from = 0;
    for (;;) {
      const at = clause.text.indexOf(needle, from);
      if (at === -1) break;
      if (cues.some((c) => c < at)) negated++; else asserted++;
      from = at + Math.max(1, needle.length);
    }
  }
  return { asserted, negated };
}

// ── Special-category status (F08) ────────────────────────────────────────

export const HEALTH_CATEGORY = "Health or medical data";
export const BIOMETRIC_CATEGORY = "Biometric data";
/** The data_categories labels that can put Art. 9 in play (the contract's SPECIAL_CATEGORY_CATS). */
export const SPECIAL_CATEGORY_CATS: readonly string[] = [HEALTH_CATEGORY, BIOMETRIC_CATEGORY];

export const BIOMETRIC_YES = BIOMETRIC_UNIQUE_ID[0];
export const BIOMETRIC_NO = BIOMETRIC_UNIQUE_ID[1];
export const BIOMETRIC_UNSURE = BIOMETRIC_UNIQUE_ID[2];

/** The Art. 9 answer recorded when biometric data is the only candidate and is not used to identify people. */
export const ART9_NOT_APPLICABLE_BIOMETRIC =
  "Not applicable — the biometric data is not used to uniquely identify individuals";
/** The honest "not yet established" Art. 9 answer. */
export const ART9_NOT_YET_ESTABLISHED = "Not yet established — condition still to be identified";

export type SpecialCategoryStatus = "none" | "established" | "open" | "not_established";

/**
 * "established": health data, or biometric data used to uniquely identify.
 * "not_established": biometric data only, and the company says it is NOT used
 *   to identify — no Art. 9(2) condition is needed and the record says why.
 * "open": biometric data only, purpose unstated or unsure — Art. 9 stays in play.
 * "none": no candidate category.
 */
export function specialCategoryStatus(dataCategories: readonly string[], biometricAnswer: string): SpecialCategoryStatus {
  const health = dataCategories.includes(HEALTH_CATEGORY);
  const biometric = dataCategories.includes(BIOMETRIC_CATEGORY);
  if (health) return "established";
  if (!biometric) return "none";
  if (biometricAnswer === BIOMETRIC_YES) return "established";
  if (biometricAnswer === BIOMETRIC_NO) return "not_established";
  return "open";
}

/** Whether the Art. 9(2) selector is asked (and required) for this status. */
export function art9Asked(status: SpecialCategoryStatus): boolean {
  return status === "established" || status === "open";
}

/**
 * The article_9_condition value the payload carries. A hidden selector
 * travels "" (the contract's hiddenValue); a biometric "No" travels the
 * explicit not-applicable answer so the record says why no condition is named.
 */
export function art9PayloadValue(status: SpecialCategoryStatus, selected: string): string {
  if (status === "not_established") return ART9_NOT_APPLICABLE_BIOMETRIC;
  if (!art9Asked(status)) return "";
  return ARTICLE_9_CONDITIONS.includes(selected) ? selected : "";
}

// ── Screening prompts (F01) ──────────────────────────────────────────────

export interface ScreeningPrompt {
  citation: string;
  /** What to check — phrased as a check, never as a finding. */
  label: string;
  /** Which recorded fact raised the check. */
  basis: string;
  /** The facts still needed before the trigger could be assessed. */
  stillNeeded: string;
}

export interface ScreeningInput {
  dataCategories: readonly string[];
  description: string;
  biometricAnswer?: string;
  reasonsToConduct?: readonly string[];
  imageryCapture?: string;
  imageryCaptureSpaces?: string;
}

export interface ScreeningResult {
  prompts: ScreeningPrompt[];
  /** Cues found only in negated form — shown so the customer can see what was read. */
  negated: string[];
}

const PROFILING_STEMS = ["profil", "scor", "automated decision", "automatically decid", "predict"];

/**
 * Potential Art. 35 triggers to CHECK, drawn from the facts recorded so far.
 * A prompt is raised on a cue; it never states that a trigger is met, because
 * the deciding facts (scale, systematic character, effects) are not in this
 * screening. Negated cues ("we do not perform profiling") raise nothing.
 */
export function dpiaScreeningPrompts(input: ScreeningInput): ScreeningResult {
  const prompts: ScreeningPrompt[] = [];
  const negated: string[] = [];
  const cats = input.dataCategories ?? [];
  const status = specialCategoryStatus(cats, input.biometricAnswer ?? "");

  if (status === "established" || status === "open") {
    const named = cats.filter((c) => SPECIAL_CATEGORY_CATS.includes(c));
    prompts.push({
      citation: "Art. 35(3)(b) GDPR",
      label: "Check whether the special-category processing is large-scale",
      basis: status === "open"
        ? `${named.join(", ")} selected; whether the biometric data identifies people is not yet stated`
        : `${named.join(", ")} selected`,
      stillNeeded: "Large scale is a separate fact: how many people, how much data, for how long, over what area. Record those in the volume and data-subject answers; the report tests them.",
    });
  }

  const desc = input.description ?? "";
  const assertedStems: string[] = [];
  for (const stem of PROFILING_STEMS) {
    const occ = assertedMentions(desc, stem);
    if (occ.asserted > 0) assertedStems.push(stem);
    else if (occ.negated > 0) negated.push(stem);
  }
  const reasons = input.reasonsToConduct ?? [];
  const reasonCue = reasons.some((r) => /Evaluation or scoring|Automated decision-making|Systematic, extensive evaluation/.test(r));
  if (assertedStems.length > 0 || reasonCue) {
    prompts.push({
      citation: "Art. 35(3)(a) GDPR",
      label: "Check whether the evaluation or profiling is systematic and extensive, and whether decisions with legal or similarly significant effects follow from it",
      basis: reasonCue
        ? "an evaluation, scoring or automated-decision reason is selected"
        : `your description mentions ${assertedStems.map((s) => `"${s}…"`).join(", ")}`,
      stillNeeded: "Art. 35(3)(a) needs all three elements: systematic and extensive evaluation, automated processing including profiling, and decisions with legal or similarly significant effects. State each in the description and the automated-decision question.",
    });
  }

  if (cats.some((c) => /child/i.test(c))) {
    prompts.push({
      citation: "Recital 38 · WP248 criterion 7 (vulnerable data subjects)",
      label: "Check the protections for children's data",
      basis: "Children's data selected",
      stillNeeded: "Children's data is not an Art. 35(3) trigger on its own. It counts towards the WP248 high-risk criteria (vulnerable data subjects); the report weighs it with the other criteria you record.",
    });
  }

  if (input.imageryCapture && !/^No imagery/i.test(input.imageryCapture)) {
    const publicSpace = /Publicly accessible|Both/i.test(input.imageryCaptureSpaces ?? "");
    prompts.push({
      citation: "Art. 35(3)(c) GDPR",
      label: publicSpace
        ? "Check whether the monitoring of the publicly accessible area is systematic and large-scale"
        : "Check where the imagery is captured and whether the monitoring is systematic",
      basis: publicSpace ? "imagery captured in a publicly accessible space" : "imagery of identifiable people captured",
      stillNeeded: "Art. 35(3)(c) requires systematic monitoring of a publicly accessible area on a large scale. Capture alone establishes none of those; the imagery detail and volume answers carry the facts.",
    });
  }

  return { prompts, negated };
}

// ── Suppliers (F04) ──────────────────────────────────────────────────────

/** The "Other: …" entry the page folds into third_party_processors, restored to its own control. */
export function splitOtherProcessor(value: unknown): { processors: string[]; otherProcessor: string } {
  const arr = Array.isArray(value) ? value.filter((t): t is string => typeof t === "string") : [];
  const other = arr.find((t) => t.startsWith("Other: "));
  return {
    processors: arr.filter((t) => !t.startsWith("Other: ")),
    otherProcessor: other ? other.slice("Other: ".length) : "",
  };
}

// ── Transfer rows (F05 / F11) ────────────────────────────────────────────

export type OriginRegime = "EU" | "UK" | "";

/** The one transfer-row schema the page emits: the contract's snake_case keys. */
export interface TransferRow {
  recipient: string;
  /** ISO 3166-1 alpha-2 as stored by the picker ("GB" for the UK), or "OTHER" / "UNKNOWN". */
  destination_country: string;
  origin_regime: OriginRegime;
  transfer_mechanism: string;
  notes: string;
  dpf_certified: boolean;
  uk_extension_certified: boolean;
}

export const TRANSFER_PRESENCE_YES = TRANSFER_PRESENCE[0];
export const TRANSFER_PRESENCE_NO = TRANSFER_PRESENCE[1];
export const TRANSFER_PRESENCE_UNASSESSED = TRANSFER_PRESENCE[2];

export function emptyTransferRow(): TransferRow {
  // F11 — the origin is confirmed by the customer, never defaulted.
  return { recipient: "", destination_country: "", origin_regime: "", transfer_mechanism: "", notes: "", dpf_certified: false, uk_extension_certified: false };
}

function s(v: unknown): string { return typeof v === "string" ? v : v == null ? "" : String(v); }
function b(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

/**
 * Lossless reader: accepts the canonical snake_case row, the legacy camelCase
 * row the page used to emit (importer / destination / originRegime /
 * dpfCertified / ukExtensionCertified), and the resolver's own shape
 * (importerEntity / destinationCountry / importerDpfCertified). Nothing is
 * dropped; an unknown origin stays "" (unconfirmed).
 */
export function normaliseTransferRow(raw: unknown): TransferRow {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const originRaw = s(r.origin_regime ?? r.originRegime).toUpperCase();
  const origin: OriginRegime = originRaw === "EU" || originRaw === "UK" ? originRaw : "";
  return {
    recipient: s(r.recipient ?? r.importer ?? r.importerEntity ?? r.importer_entity),
    destination_country: s(r.destination_country ?? r.destination ?? r.destinationCountry).toUpperCase().trim(),
    origin_regime: origin,
    transfer_mechanism: s(r.transfer_mechanism ?? r.mechanism ?? r.transferMechanism ?? r.safeguard),
    notes: s(r.notes ?? r.note),
    dpf_certified: b(r.dpf_certified ?? r.dpfCertified ?? r.importerDpfCertified) ?? false,
    uk_extension_certified: b(r.uk_extension_certified ?? r.ukExtensionCertified ?? r.importerUkExtensionCertified) ?? false,
  };
}

export function normaliseTransferRows(raw: unknown): TransferRow[] {
  return Array.isArray(raw) ? raw.map(normaliseTransferRow) : [];
}

/** The fields a row still needs before the resolver can name a mechanism for it. */
export function transferRowMissing(row: TransferRow): Array<keyof TransferRow> {
  const missing: Array<keyof TransferRow> = [];
  if (!row.recipient.trim()) missing.push("recipient");
  if (!row.destination_country.trim()) missing.push("destination_country");
  if (!row.origin_regime) missing.push("origin_regime");
  return missing;
}

export function transferRowComplete(row: TransferRow): boolean {
  return transferRowMissing(row).length === 0;
}

export interface TransferIssue { index: number; field: string; message: string }

/**
 * Proportionate row validation: an added row must say who receives the data,
 * in which country, and from which regime; a "Yes" presence needs at least
 * one row; "No" or "Not yet assessed" with rows is a contradiction to resolve.
 */
export function transferRowsIssue(rows: readonly TransferRow[], presence: string): TransferIssue | null {
  if (presence === TRANSFER_PRESENCE_YES && rows.length === 0) {
    return { index: -1, field: "transfer_presence", message: "You said the data leaves the EEA or the UK. Add at least one transfer, or change the answer." };
  }
  if ((presence === TRANSFER_PRESENCE_NO || presence === TRANSFER_PRESENCE_UNASSESSED) && rows.length > 0) {
    return { index: -1, field: "transfer_presence", message: presence === TRANSFER_PRESENCE_NO
      ? "You said all processing stays within the EEA and the UK, but a transfer is listed. Remove the transfer or change the answer."
      : "You said transfers are not yet assessed, but a transfer is listed. Choose \"Yes\" if the listed transfer is real, or remove it." };
  }
  for (let i = 0; i < rows.length; i++) {
    const missing = transferRowMissing(rows[i]);
    if (missing.length === 0) continue;
    const field = missing[0];
    const message = field === "recipient"
      ? `Transfer ${i + 1}: say who receives the data.`
      : field === "destination_country"
        ? `Transfer ${i + 1}: choose the destination country (or "Another country not listed" / "Not sure").`
        : `Transfer ${i + 1}: say whether the data is sent from the EU/EEA or from the UK.`;
    return { index: i, field, message };
  }
  return null;
}

// ── Alternatives (F09) ───────────────────────────────────────────────────

export interface AlternativeRow {
  processing_operation: string;
  alternative: string;
  rejection_reason: string;
  /** One of ALTERNATIVE_OUTCOMES; "" means rejected (the historical meaning). */
  outcome?: string;
}

export function normaliseAlternativeRow(raw: unknown): AlternativeRow {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    processing_operation: s(r.processing_operation),
    alternative: s(r.alternative),
    // PROMPT 8H item 1(a): reason_rejected is the drifted spelling; read it, never emit it.
    rejection_reason: s(r.rejection_reason ?? r.reason_rejected),
    ...(typeof r.outcome === "string" && r.outcome ? { outcome: r.outcome } : {}),
  };
}

export function normaliseAlternativeRows(raw: unknown): AlternativeRow[] {
  return Array.isArray(raw) ? raw.map(normaliseAlternativeRow) : [];
}

/** A row that carries notes but names no alternative is a draft the customer must finish or remove. */
export function alternativesIssue(rows: readonly AlternativeRow[]): { index: number; field: string; message: string } | null {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.alternative.trim()) {
      return { index: i, field: "alternative", message: `Alternative ${i + 1}: name the option you considered (or remove the row). Notes copied from your necessity answer do not identify an option by themselves.` };
    }
    const rejected = !r.outcome || /^Rejected/.test(r.outcome);
    if (rejected && !r.rejection_reason.trim()) {
      return { index: i, field: "rejection_reason", message: `Alternative ${i + 1}: say why it would not achieve the purpose, or record a different outcome.` };
    }
  }
  return null;
}

// ── Countries (F06) ──────────────────────────────────────────────────────

/** Sentinel picker values; the stored value stays a text token the contract accepts. */
export const COUNTRY_OTHER = "OTHER";
export const COUNTRY_UNKNOWN = "UNKNOWN";

/** Uppercased, trimmed; sentinels preserved; anything else returned as typed (the engine canonicalises GB/UK). */
export function normaliseCountryToken(v: unknown): string {
  const t = s(v).trim().toUpperCase();
  return t;
}

/** The EEA members plus the UK, as stored by the picker (GB for the UK). */
export const EEA_ISO2: readonly string[] = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT",
  "LV", "LI", "LT", "LU", "MT", "NL", "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
];

/** An EU/EEA establishment (the UK is not in the Union; Art. 4(16) does not reach it). */
export function isEeaCountry(code: string): boolean {
  return EEA_ISO2.includes(normaliseCountryToken(code));
}
