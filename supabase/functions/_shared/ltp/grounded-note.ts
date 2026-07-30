/**
 * ITEM 242 CP-C RIDER (2026-07-28) — THE GROUNDED-NOTE LAW.
 *
 * Zero-hallucination by construction: every content-bearing token in a
 * factor `weight_note` MUST originate from one of three closed sources:
 *   (i)  the plan's intake-ledger verbatims (display + stringified value),
 *   (ii) the registry vocabulary (factor/proposition display labels,
 *        factor-kind terms, gate/law shorthand),
 *   (iii) the closed CONNECTIVE LEXICON below (curated analytic vocab
 *         — record verbs, neutral analytic terms, hedges, function words).
 *
 * Violating notes are DETERMINISTICALLY REPLACED — never model-mediated —
 * with the grounded form:
 *     the intake records "{ledger_verbatim}" for {field_display_label}
 * or the standard "no record evidence" when no ledger row supports the row.
 *
 * NORMALIZATION SPEC (test-asserted; positive AND negative fixtures):
 *   • case-fold (lowercase);
 *   • strip punctuation to word boundaries; keep intra-token hyphens and
 *     apostrophes;
 *   • inflection tolerance: token, token±s, token±es, token±ing, token±ed,
 *     and y↔ies (no stemming beyond these rules);
 *   • numerals: a numeric token is grounded iff the exact numeral string
 *     (post case-fold) appears as a substring of any ledger verbatim; no
 *     rounding, no unit rewriting;
 *   • quotation marks (", ", ", ', ', ') are treated as connective
 *     punctuation and never as content tokens — this is how ledger
 *     verbatims render "as marked quotations" per panel condition (2).
 *
 * TELEMETRY (panel condition 4): per-plan `grounded_note_replacements`
 * count + `grounded_note_replacement_rate` (over factor_table rows that
 * carried a non-empty weight_note pre-screen). Tuning threshold: a
 * batch-level rate > 25% flags the lexicon as too narrow — the CEO reviews
 * the data, we do not silently widen the lexicon.
 *
 * The check constrains EXPRESSION ONLY (panel condition 5); it does not
 * touch present_in_intake / intake_ledger_refs / guidance_refs / anchor.
 */

import type { FactorTableEntry, IntakeLedgerEntry, RenderPlan } from "../render-plan/schema.ts";
import { CPPA_RISK_FACTORS } from "../factors/cppa-risk-factors.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";

export const PASS1_GROUNDED_NOTE_VERSION =
  "pass1-grounded-note@2026-07-30-item267-calibration";


/**
 * ITEM 261 — SPEC §6 GUARD-LIFECYCLE LAW. The screen now DEFAULTS to
 * "observe": telemetry is built identically, but no `weight_note` is
 * modified and the mass-replace abort does not fire. Evidence and law
 * basis: docs/courier/ITEM261-GROUNDED-OBSERVE-DEMOTION-2026-07-29.md
 * (observed false-positive-ish rate ~82–100% across three model runs;
 * ungrounded tokens were ordinary derivational English — "setting",
 * "detection", "include", "human" — whose stems/facts ARE grounded).
 * SPEC §6: "every guard ships OBSERVE-FIRST against a regression corpus
 * of real prior outputs; promotion to enforce requires ~zero observed
 * false positives." The enforce path below is preserved UNCHANGED for
 * future promotion. The LEXICON is untouched — widening it remains a
 * CEO-reviewed courier informed by replay data.
 */
export type GroundedNoteMode = "observe" | "enforce";

/**
 * ITEM 243 defect 1(b) — WHITELIST: the canonical "no record evidence"
 * phrase is never a candidate for the screen. Historically the checker
 * flagged "evidence" ungrounded inside this exact canonical phrase.
 */
const CANONICAL_NO_EVIDENCE = /^\s*no\s+record\s+evidence\s*$/i;

/**
 * ITEM 243 defect 1(d) — INTAKE FIELD DISPLAY LABELS. Human labels for
 * canonical intake fields; used by buildGroundedForm as the
 * `{field_display_label}` slot AND fed into the grounded vocab. Absent
 * an entry, we humanize the key as a safe fallback.
 */
export const INTAKE_FIELD_DISPLAY_LABELS: Readonly<Record<string, string>> = {
  q1_revenue: "annual revenue band",
  q2_consumers: "annual California consumer volume",
  q4_pi_categories: "categories of personal information processed",
  q5_sell_share: "sale or sharing of personal information",
  q5b_profiling_observation: "profiling for behavioral advertising",
  q5c_share_revenue_50pct: "50%-of-revenue-from-sale-or-share threshold",
  q9_opt_out: "opt-out-of-sale/share mechanism",
  q15_sensitive_pi: "sensitive personal information in scope",
  q15c_spi_volume: "sensitive personal information consumer volume",
  q18_admt_use: "use of automated decisionmaking technology",
  q18b_admt_training: "ADMT training on personal information",
  i1_processing_purpose: "stated processing purpose",
  i1b_min_pi: "minimum personal information principle",
  i2_retention_period: "retention period",
  i4_disclosure_mechanisms: "disclosure mechanisms",
  i7_internal_contributors: "internal contributors to the assessment",
  i7_external_consultees: "external consultees to the assessment",
  entity_name: "entity name",
  bought_sold_shared_count: "annual bought/sold/shared consumer count",
};

function humanizeFieldKey(k: string): string {
  const s = k.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function displayLabelForField(intake_field: string): string {
  return INTAKE_FIELD_DISPLAY_LABELS[intake_field] ?? humanizeFieldKey(intake_field);
}

/**
 * ITEM 243 defect 1(e) — over-threshold ABORT. When the batch-level rate
 * exceeds this floor the checker itself is presumed malfunctioning; it
 * MUST fail loud rather than destroy the model's grounded prose.
 */
export class GroundedNoteCheckerAbort extends Error {
  readonly code = "grounded_note_over_threshold_abort";
  readonly telemetry: GroundedNoteTelemetry;
  constructor(t: GroundedNoteTelemetry) {
    super(`grounded_note_over_threshold_abort rate=${t.replacement_rate} threshold=${t.tuning_threshold_rate}`);
    this.telemetry = t;
  }
}

/**
 * ITEM 258 — SPEC §6 MASS-REPLACE ABORT. The 0.25 tuning threshold above
 * flags the LEXICON as too narrow (informational — CEO reviews the data).
 * This 0.5 threshold enforces SPEC §6's mass-action-guard rule: a
 * malfunction-scale replacement rate ABORTS fail-loud rather than mass-
 * rewriting customer prose. Empirical basis: ramp-1 attempt 3 (job
 * `a5c209d1`) replaced 8/8 factor notes (rate 1.0) with repetitive
 * quote-the-i1 boilerplate while the model's originals cited real
 * intake verbatims (vendors, fairness testing, human review, harm types)
 * that only failed grounding because LEDGER_KEYS was narrow — plus the
 * historical run-#180 destroyer-class incident. With the Item-258
 * full-contract ledger, legitimate rates should be near zero; 0.5 only
 * fires on malfunction. Same class as MassAbsenceRewriteAbort in
 * pass1-present-note-coherence.ts.
 */
export const GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD = 0.5;

export class GroundedNoteMassReplaceAbort extends Error {
  readonly code = "grounded_note_mass_replace_abort";
  readonly replacement_rate: number;
  readonly telemetry: GroundedNoteTelemetry;
  constructor(t: GroundedNoteTelemetry) {
    super(`[grounded-note] mass-replace replacement_rate=${t.replacement_rate.toFixed(3)} exceeds ${GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD}`);
    this.replacement_rate = t.replacement_rate;
    this.telemetry = t;
    this.name = "GroundedNoteMassReplaceAbort";
  }
}


/**
 * CONNECTIVE LEXICON — closed, curated analytic vocabulary. Verbatim
 * mirror of §5 of docs/courier/ITEM242-BC-WIRED-2026-07-28.md. Any
 * addition/removal is a courier turn.
 */
export const CONNECTIVE_LEXICON: readonly string[] = [
  // record verbs (what the intake DOES relative to the record)
  "states", "state", "stated", "record", "records", "recorded",
  "documents", "documented", "identifies", "identified",
  "reports", "reported", "describes", "described", "lists", "listed",
  "names", "named", "notes", "noted", "confirms", "confirmed",
  "provides", "provided", "indicates", "indicated", "shows", "showed",
  "supplies", "supplied", "attests", "attested",
  // neutral analytic terms (what the RECORD is or is not)
  "present", "absent", "silent", "unaddressed", "unclear",
  "documented", "undocumented", "unstated", "missing",
  "sufficient", "insufficient", "adequate", "inadequate",
  "specific", "general", "generic", "particular",
  "applicable", "inapplicable", "engaged", "not-engaged",
  // absence phrasings (also stated as fixed multi-word forms below)
  "does", "not", "no", "none", "without", "lacks", "lacked",
  "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "carries", "carried",
  // hedging function words
  "may", "might", "could", "would", "should", "likely", "unlikely",
  "appears", "appear", "seems", "seem", "suggests", "suggested",
  // quantity function words (numerals themselves are grounded via ledger)
  "one", "two", "three", "several", "multiple", "few", "many", "any",
  "all", "each", "every", "single", "additional",
  // scope function words
  "for", "the", "a", "an", "of", "in", "on", "at", "by", "to", "from",
  "with", "within", "under", "over", "per", "as", "and", "or", "but",
  "than", "then", "that", "this", "these", "those", "such", "which",
  "when", "where", "while", "because", "since", "if", "unless", "only",
  // register connectives (the fixed frames the replacement uses)
  "purpose", "stated-purpose", "for-the-stated-purpose-of",
  // canonical field labels used as analytic terms
  "record", "records", "intake", "assessment",
  // ── ITEM 267 PART 3(b) — EVIDENCE-MINED ADDITIONS (2026-07-30) ──
  // Every token below was observed in the accumulated grounded-note
  // telemetry (public.replay_harness_results → pass1_usage->grounded_note
  // ->details[]->ungrounded_tokens) AND is ordinary function / analytic /
  // record-descriptive English. Customer-specific nouns (vendor, product,
  // sector terms) are DELIBERATELY EXCLUDED — those must ground via the
  // intake ledger. Frequencies are recorded in
  // docs/courier/ITEM267-GROUNDED-CALIBRATION-2026-07-30.md.
  "type", "types", "service", "services", "support", "supports", "supported",
  "via", "limited", "limits", "recipient", "recipients", "receive",
  "receiving", "creating", "create", "commercial", "covering", "cover",
  "field", "fields", "operation", "operations", "outside", "active",
  "context", "enabling", "enable", "enables", "surface", "downstream",
  "logical", "shared", "sold", "appeal", "cause", "direct", "include",
  "including", "integrity", "percent", "request", "requests", "affect",
  "among", "apply", "applied", "area", "bear", "bears", "bearing",
  "conditioning", "conditioned", "conditions", "dependent", "detection",
  "detect", "driving", "eliminating", "eliminate", "exposure", "finding",
  "framing", "generating", "generate", "ongoing", "pathway", "pathways",
  "profiling", "raising", "reducing", "reduces", "required", "residual",
  "setting", "their", "though", "who", "across", "addresses", "address",
  "analysis", "available", "average", "beyond", "completed", "consideration",
  "correction", "degree", "deployment", "destruction", "determines",
  "disclosed", "distress", "evidencing", "exceeding", "exceeds", "exception",
  "expectations", "expected", "extends", "factor", "freely", "frustration",
  "fully", "handle", "hold", "human", "indicating", "infers", "infrastructure",
  "markets", "meets", "mitigate", "mitigating", "mitigants", "modification",
  "negatively", "output", "outputs", "part", "parties", "persistent",
  "potential", "prevention", "prior", "produce", "products", "prominent",
  "question", "reflecting", "reflects", "relevance", "represent", "role",
  "satisfy", "scrutiny", "self", "stigma", "stigmatizing", "systemic",
  "third", "tied", "unlawful", "unreviewed", "used", "vendors", "warrants",
  "ways", "window", "minimum", "necessary", "legal", "obligation",
];


/** Registry vocabulary — display labels + fixed factor/gate/law shorthand. */
const REGISTRY_VOCAB_TOKENS: readonly string[] = (() => {
  const bag: string[] = [];
  for (const f of CPPA_RISK_FACTORS) {
    if ((f as unknown as { display_label?: string }).display_label) {
      bag.push(String((f as unknown as { display_label?: string }).display_label));
    }
    bag.push(f.id);
    if (f.kind) bag.push(f.kind);
  }
  for (const c of CPPA_RISK_CONCLUSIONS) {
    if (c.display_label) bag.push(c.display_label);
    bag.push(c.id);
  }
  // Fixed law/register shorthand admissible in notes as vocabulary.
  bag.push(
    "cppa", "ccpa", "regulation", "regulations",
    "processing", "consumer", "consumers", "business",
    "personal", "information", "sensitive",
    "risk", "assessment", "safeguard", "safeguards",
    "benefit", "benefits", "harm", "harms", "impact", "impacts",
    "consultation", "external", "internal", "contributor", "contributors",
    "training", "admt", "automated", "decisionmaking",
    "retention", "purpose", "purposes", "category", "categories",
    "financial", "employment", "geolocation", "biometric",
  );
  return bag;
})();

// ────────────────────────────────────────────────────────────────────────
// Normalization
// ────────────────────────────────────────────────────────────────────────

const QUOTE_CHARS = /[\u201C\u201D\u201E\u2033\u2036\u2018\u2019\u201A\u2032"'`]/g;

/** Split arbitrary text into normalized content-bearing tokens. */
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Case-fold and strip quotes (treated as connective punctuation).
  const folded = text.toLowerCase().replace(QUOTE_CHARS, " ");
  // Keep letters, digits, intra-word hyphens/apostrophes; everything else is a boundary.
  const raw = folded.split(/[^a-z0-9\-']+/g).map((s) => s.replace(/^[-']+|[-']+$/g, ""));
  return raw.filter((t) => t.length >= 1);
}

/** Content-bearing predicate — everything except pure punctuation. */
function isContentToken(t: string): boolean {
  return t.length > 0 && /[a-z0-9]/.test(t);
}

/** Generate the inflection variants that count as "the same token" for grounding. */
function inflections(t: string): string[] {
  const set = new Set<string>([t]);
  // pluralization
  if (t.endsWith("ies") && t.length > 3) set.add(t.slice(0, -3) + "y");
  if (t.endsWith("y") && t.length > 1) set.add(t.slice(0, -1) + "ies");
  if (t.endsWith("es") && t.length > 2) set.add(t.slice(0, -2));
  if (t.endsWith("s") && t.length > 1) set.add(t.slice(0, -1));
  set.add(t + "s");
  set.add(t + "es");
  // verb forms
  if (t.endsWith("ing") && t.length > 4) set.add(t.slice(0, -3));
  if (t.endsWith("ed") && t.length > 3) set.add(t.slice(0, -2));
  set.add(t + "ing");
  set.add(t + "ed");
  return [...set];
}

/**
 * ITEM 267 PART 3(a) — NORMALIZATION EXTENSION (FEED SIDE ONLY).
 *
 * Conservative morphological expansion applied when a GROUNDED STEM is
 * fed into the vocabulary (ledger / registry / connective lexicon). It
 * NEVER relaxes the note side: a note token still has to land exactly on
 * a member of the expanded set, so invented content tokens (vendor names
 * absent from the intake, "blockchain" on a non-blockchain record) remain
 * ungrounded. Evidence basis: the mined ungrounded-token register in
 * docs/courier/ITEM267-GROUNDED-CALIBRATION-2026-07-30.md, where the bulk
 * of "ungrounded" tokens were ordinary derivations of grounded stems
 * ("setting" from "set", "detection" from "detect", "receiving" from
 * "receive").
 *
 * Rules (closed set — any widening is a courier turn):
 *   • consonant-gemination verb forms: set→setting/setted, ship→shipping/shipped
 *     (single final consonant, not w/x/y, CVC shape, stem length ≥ 3);
 *   • derivational suffixes off a grounded stem: -ion, -tion, -ation,
 *     -ment, -ly, -er, -ers (plus their plurals via inflections()).
 */
function geminationForms(t: string): string[] {
  const out: string[] = [];
  if (t.length >= 3 && /[bcdfgklmnprstvz]$/.test(t) && /[aeiou][bcdfgklmnprstvz]$/.test(t) && !/[aeiou]{2}[bcdfgklmnprstvz]$/.test(t)) {
    const dbl = t + t[t.length - 1];
    out.push(dbl + "ing", dbl + "ed");
  }
  return out;
}

const DERIVATIONAL_SUFFIXES = ["ion", "tion", "ation", "ment", "ly", "er", "ers"] as const;

function derivations(t: string): string[] {
  if (t.length < 3) return [];
  const out: string[] = [];
  for (const sfx of DERIVATIONAL_SUFFIXES) out.push(t + sfx);
  // -e verbs: receive→reception is NOT derivable mechanically, but
  // receive→receiver / detect→detection are. Drop a trailing "e" before
  // the vowel-initial suffixes (create→creation, receive→receiver).
  if (t.endsWith("e")) {
    const stem = t.slice(0, -1);
    out.push(stem + "ion", stem + "ation", stem + "er", stem + "ers", stem + "ing", stem + "ed");
  }
  return out;
}

/** Full FEED-side variant set for one grounded stem. */
export function feedVariants(t: string): string[] {
  const set = new Set<string>();
  const base = inflections(t);
  for (const b of base) set.add(b);
  for (const g of geminationForms(t)) set.add(g);
  for (const d of derivations(t)) {
    set.add(d);
    for (const dv of inflections(d)) set.add(dv);
  }
  return [...set];
}


// ────────────────────────────────────────────────────────────────────────
// Grounded set builder
// ────────────────────────────────────────────────────────────────────────

export interface GroundedSet {
  /** All non-numeric grounded tokens (post case-fold), inflection-expanded. */
  readonly tokens: ReadonlySet<string>;
  /** Substrings of ledger verbatims used to ground numerals. */
  readonly numeralSources: readonly string[];
}

function ledgerVerbatimStrings(ledger: readonly IntakeLedgerEntry[]): string[] {
  const out: string[] = [];
  for (const l of ledger) {
    // ITEM 243 defect 1(a) — feed EVERY content-bearing field of the
    // ledger row into the grounded vocabulary: display label, verbatim
    // value, AND the humanized intake_field key. Prior versions only
    // fed `display` (often == value), so vocab like "opt out", "revenue"
    // that lived in the field-key never grounded.
    if (l.display) out.push(String(l.display));
    if (l.value !== null && l.value !== undefined) out.push(String(l.value));
    if (l.intake_field) {
      out.push(displayLabelForField(l.intake_field));
      out.push(l.intake_field.replace(/_/g, " "));
    }
  }
  return out;
}

export function buildGroundedSet(ledger: readonly IntakeLedgerEntry[]): GroundedSet {
  const tokens = new Set<string>();
  const numeralSources: string[] = [];
  const feed = (text: string) => {
    for (const raw of tokenize(text)) {
      if (!isContentToken(raw)) continue;
      if (/^\d/.test(raw)) continue;
      for (const v of feedVariants(raw)) tokens.add(v);
    }
  };
  for (const t of CONNECTIVE_LEXICON) feed(t);
  for (const t of REGISTRY_VOCAB_TOKENS) feed(t);
  for (const v of ledgerVerbatimStrings(ledger)) {
    feed(v);
    numeralSources.push(v.toLowerCase());
  }
  return { tokens, numeralSources };
}

/** Is a single normalized token grounded against the set? */
export function isGrounded(token: string, set: GroundedSet): boolean {
  if (!isContentToken(token)) return true;
  if (/^\d/.test(token)) {
    return set.numeralSources.some((s) => s.includes(token));
  }
  return set.tokens.has(token);
}

// ────────────────────────────────────────────────────────────────────────
// Screen + deterministic replacement
// ────────────────────────────────────────────────────────────────────────

export interface GroundedNoteReplacement {
  readonly factor_id: string;
  readonly reason: "ungrounded_token";
  readonly ungrounded_tokens: readonly string[];
  readonly original_note: string;
  readonly replacement_note: string;
  readonly ledger_ref?: string;
}

export interface GroundedNoteTelemetry {
  readonly version: string;
  readonly candidates: number;
  /**
   * ITEM 261 — in "enforce" mode this is the count of notes actually
   * replaced; in "observe" mode (the default) it is the count of notes
   * that WOULD be replaced. The field name is kept for continuity of the
   * telemetry series across the demotion.
   */
  readonly replacements: number;
  readonly replacement_rate: number;
  readonly tuning_threshold_rate: number;
  readonly over_threshold: boolean;
  /** ITEM 261 — "observe" (default) reports only; "enforce" replaces + aborts. */
  readonly mode: GroundedNoteMode;
  readonly details: readonly GroundedNoteReplacement[];
}

/**
 * ITEM 243 defect 1(c) — pickDrivingLedger MUST NOT arbitrarily fall
 * back to the first ledger row with a value. That fallback bound
 * unrelated verbatims (e.g. "email address") onto factors about entirely
 * different intake fields, yielding false replacements that read as
 * hallucinations. On no explicit ref match we return undefined, and the
 * replacement collapses to the canonical "no record evidence".
 */
function pickDrivingLedger(
  row: FactorTableEntry,
  ledger: readonly IntakeLedgerEntry[],
): IntakeLedgerEntry | undefined {
  const refs = row.intake_ledger_refs ?? [];
  if (refs.length === 0) return undefined;
  const byId = new Map(ledger.map((l) => [l.ledger_id, l] as const));
  for (const r of refs) {
    const hit = byId.get(r);
    if (hit && hit.value !== null && hit.value !== "" && hit.value !== undefined) return hit;
  }
  return undefined;
}

function buildGroundedForm(driver: IntakeLedgerEntry | undefined): { note: string; ledger_ref?: string } {
  if (!driver) return { note: "no record evidence" };
  const value = String(driver.value ?? "").trim();
  if (!value) return { note: "no record evidence" };
  const label = displayLabelForField(driver.intake_field);
  return { note: `the intake records "${value}" for ${label}`, ledger_ref: driver.ledger_id };
}

const TUNING_THRESHOLD_RATE = 0.25;

/** Screen the full plan; returns a new plan + telemetry. Pure. */
export function applyGroundedNoteScreen(
  plan: RenderPlan,
  opts?: { mode?: GroundedNoteMode },
): { plan: RenderPlan; telemetry: GroundedNoteTelemetry } {
  const mode: GroundedNoteMode = opts?.mode ?? "observe";
  const set = buildGroundedSet(plan.intake_ledger ?? []);
  const details: GroundedNoteReplacement[] = [];
  let candidates = 0;
  const out: FactorTableEntry[] = (plan.factor_table ?? []).map((row) => {
    const note = (row.weight_note ?? "").toString();
    if (!note) return row;
    // ITEM 243 defect 1(b) — canonical no-evidence phrase whitelist.
    if (CANONICAL_NO_EVIDENCE.test(note)) return row;
    candidates++;
    const tokens = tokenize(note).filter(isContentToken);
    const ungrounded: string[] = [];
    for (const t of tokens) {
      if (!isGrounded(t, set)) {
        ungrounded.push(t);
        if (ungrounded.length >= 5) break;
      }
    }
    if (ungrounded.length === 0) return row;
    const driver = pickDrivingLedger(row, plan.intake_ledger ?? []);
    const { note: replacement, ledger_ref } = buildGroundedForm(driver);
    details.push({
      factor_id: row.factor_id,
      reason: "ungrounded_token",
      ungrounded_tokens: ungrounded,
      original_note: note.slice(0, 200),
      replacement_note: replacement,
      ...(ledger_ref ? { ledger_ref } : {}),
    });
    // ITEM 261 — observe mode records the would-replace decision but
    // leaves the model-authored note byte-identical.
    if (mode === "observe") return row;
    return { ...row, weight_note: replacement } as FactorTableEntry;
  });
  const replacements = details.length;
  const replacement_rate = candidates === 0 ? 0 : replacements / candidates;
  const telemetry: GroundedNoteTelemetry = {
    version: PASS1_GROUNDED_NOTE_VERSION,
    candidates,
    replacements,
    replacement_rate,
    tuning_threshold_rate: TUNING_THRESHOLD_RATE,
    over_threshold: replacement_rate > TUNING_THRESHOLD_RATE,
    mode,
    details,
  };
  // ITEM 258 — SPEC §6 MASS-REPLACE ABORT. Fail-loud when replacement_rate
  // exceeds the 0.5 malfunction-scale threshold; the caller's catch surfaces
  // this as attempt outcome "error" (same pattern as MassAbsenceRewriteAbort
  // in the coherence screen). The 0.25 tuning-threshold flag on the
  // telemetry above is retained UNCHANGED for lexicon-width review.
  // ITEM 261 — the abort is an ENFORCE-mode instrument only; in observe
  // mode a high rate is data, not a malfunction signal to fail on.
  if (mode === "enforce" && replacement_rate > GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD) {
    throw new GroundedNoteMassReplaceAbort(telemetry);
  }
  return { plan: { ...plan, factor_table: out }, telemetry };
}


