// ITEM 411 LEG C — BIOMETRIC CROSS-SURFACE CONSISTENCY (CSC).
//
// BIOMETRIC ONLY. Deterministic post-pass in `check-biometric-compliance`, run
// AFTER the item409 prose-gold pass and the item399 R11 lint, BEFORE the
// biometric coverage matrix and the item410 record-complete gate. It reads the
// assembled report and the FULL record (for this product the record IS the
// request body — see the leg-B note at the gate call site) and asserts that
// what the document SAYS about the record agrees with what the record
// CONTAINS.
//
// LAWS (the dpia/lia/admt/governance/cyber CSC idiom, unchanged)
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true`; the report is untouched.
//   * SINGLE-WRITER RESPECTING — a repair restores the surface's own record
//     register (the builders at the head of this module). This module authors
//     no analysis of its own; it only restates what the record says.
//   * HONEST DEGRADATION — every check is predicated on the record ANSWERING
//     the backing question. On a genuinely unanswered question it does nothing
//     and the surface keeps its absence sentence byte-for-byte.
//   * DETERMINATION OUTCOMES ARE READ-ONLY — `verdict` / `status` /
//     `within_enumeration` enums are never flipped. Only reader surfaces
//     change.
//   * STATUTORY TEXT IS UNTOUCHABLE — this product renders statute AS TEMPLATE
//     (item409). `standard`, `definition_standard`, `citation`, `pinpoint` and
//     the rest of `BIOMETRIC_AUTHORITY_FIELD_KEYS` are EXCLUDED from prose
//     extraction, are never repaired, and — unlike the cyber pass — are never
//     DELETED. Deleting an authority field here would delete a verified corpus
//     passage, which is the one thing the item409 reference-passage discipline
//     forbids. B3 is therefore flag-only for this product.
//
// CHECKS
//   b1_duty_finding_vs_record  — a per-duty reader leaf claims the record does
//                                not state a fact the record does state.
//                                Single-writer repair in place; deliberately
//                                OUTSIDE the gate (the item403-A g1 precedent).
//   b2_absence_claim_vs_record — absence language on a surface the record
//                                backs, repaired from the record register.
//                                This is the id
//                                `FALSE_ABSENCE_CHECK_IDS.biometric` reads.
//   b3_authority_field_hygiene — an authority field carrying absence prose
//                                instead of authority. FLAG ONLY (see above).
//   b4_structured_leaf_hygiene — a structured leaf (verdict/status/statute_key
//                                …) carrying register or absence prose (flag).
//
// Telemetry rides `_meta.internal.biometric_csc`.

import { carriesAbsenceLanguage, frameBodyNeedles, PARTIAL_DISCHARGE_RE } from "../../../_shared/ltp/dpia-csc.ts";
import { BIOMETRIC_ABSENCE_LABEL_PHRASINGS } from "./biometric-prose-gold.ts";

export const BIOMETRIC_CSC_VERSION = "biometric-csc@item411-2026-08-08";

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The detector is BUILT FROM the phrasing class the item409 prose-gold pass can
 * write (`BIOMETRIC_ABSENCE_LABEL_PHRASINGS`), plus the generic biometric
 * absence family observed in the walked renders and the deliverable builders.
 */
export const BIOMETRIC_LABEL_ABSENCE_RE = new RegExp(
  [
    ...BIOMETRIC_ABSENCE_LABEL_PHRASINGS.map(escapeRe),
    "the (?:intake|record) supplies no\\b",
    "the (?:intake|record) describes no\\b",
    "the (?:intake|record) states no\\b",
    "the (?:intake|record) does not (?:yet )?(?:carry|state|supply|record|evidence|document|describe|establish)\\b",
    "the (?:intake|record) does not confirm\\b",
    "no (?:artefact|artifact|evidence|documentation|release|notice) (?:is |was )?(?:supplied|provided|recorded|named|obtained)\\b",
    "is not (?:established|evidenced) (?:from|on) the (?:information supplied|record)",
    "not determinable on this record",
    "cannot be (?:shown|determined) on (?:this|the) record",
    "insufficient information",
  ].join("|"),
  "i",
);

/**
 * Resolved determinations are NEVER absence. Guard strings that the register
 * writes for a settled outcome so a determination can never be "repaired".
 */
const BIOMETRIC_RESOLVED_LABELS: readonly string[] = [
  "met on the record",
  "not met on the record",
];

/** The biometric absence detector: shared emit-gate catalog + the label class. */
export function biometricCarriesAbsence(
  text: string,
  needles: readonly string[],
): string | null {
  const t = String(text ?? "").replace(/\s+/g, " ");
  if (!t.trim()) return null;
  const lower = t.toLowerCase();
  if (BIOMETRIC_RESOLVED_LABELS.some((l) => lower === l || lower === `${l}.`)) return null;
  const catalog = carriesAbsenceLanguage(t, needles);
  if (catalog) return catalog;
  const m = BIOMETRIC_LABEL_ABSENCE_RE.exec(t);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(", ");
  if (v && typeof v === "object") {
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return "";
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of String(path).split(".")) {
    if (!seg) continue;
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * KEYS EXCLUDED FROM PROSE EXTRACTION. Statutory template text, citations and
 * machine values are not reader prose and are never measured for absence.
 */
export const BIOMETRIC_AUTHORITY_FIELD_KEYS: readonly string[] = [
  "standard",
  "definition_standard",
  "definition_citation",
  "citation",
  "citations",
  "pinpoint",
  "verbatim_quote",
  "verbatim_excerpt",
  "excerpt",
  "corpus_key",
  "source_url",
];

export const BIOMETRIC_STRUCTURED_LEAF_KEYS: readonly string[] = [
  "verdict",
  "status",
  "key",
  "statute_key",
  "statute_short",
  "statute_long",
  "jurisdiction",
  "corpus_status",
  "severity",
  "priority",
];

const PROSE_EXCLUDED = new Set<string>([
  ...BIOMETRIC_AUTHORITY_FIELD_KEYS,
  ...BIOMETRIC_STRUCTURED_LEAF_KEYS,
  "_meta",
  "_staging",
  "_revision",
]);

/** Every READER string a surface carries, at any depth. Authority text and
 *  machine leaves are excluded — see the statutory-text law above. */
export function deepBiometricProse(node: unknown): string {
  const out: string[] = [];
  const walk = (n: unknown, key: string) => {
    if (PROSE_EXCLUDED.has(key)) return;
    if (typeof n === "string") { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach((x) => walk(x, key)); return; }
    if (n && typeof n === "object") {
      for (const [k, v] of Object.entries(n as Record<string, unknown>)) walk(v, k);
    }
  };
  walk(node, "");
  return out.join(" ");
}

function valueFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    // "No" is a real answer for this product's tri-state questions, but
    // "Not known" is not; the contract's tri list is Yes / No / Not known.
    return t.length > 0 && t !== "not known" && t !== "n/a" && t !== "unknown";
  }
  if (Array.isArray(v)) return v.filter((x) => valueFilled(x)).length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
}

/** Read a declared intake key (flat contract — dotted paths still supported). */
export function readBiometricKey(intake: unknown, key: string): unknown {
  return getPath(intake, key);
}

export function biometricKeyFilled(intake: unknown, key: string): boolean {
  return valueFilled(readBiometricKey(intake, key));
}

// ---------------------------------------------------------------------------
// THE RECORD REGISTER — the single writer for every repairable surface.
//
// One sentence template per contract key. Each RESTATES the record and nothing
// else (the record-states-only idiom); a surface's rebuild is the join of the
// sentences for the keys the record actually answers. A rebuild with nothing to
// restate returns "" and the caller logs the violation UNREPAIRED, leaving the
// surface byte-identical.
// ---------------------------------------------------------------------------

type Sentence = (value: string) => string;

// FD703575-B4 (2026-08-27, live batch fd703575) — sentence-safe truncation.
// The old hard slice cut a long description mid-sentence at the cap and the
// carried-forward quote shipped unterminated (the batch's security section
// dropped its final sentence and the closing punctuation mid-quote). A
// truncated value now ends at the last complete sentence inside the cap.
const q = (v: string, max = 700): string => {
  const t = v.length <= max
    ? v
    : (() => {
      const cut = v.slice(0, max);
      const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
      return lastStop > 40 ? cut.slice(0, lastStop + 1) : cut;
    })();
  return `"${t.trim()}"`;
};

export const BIOMETRIC_KEY_SENTENCES: Readonly<Record<string, Sentence>> = {
  orgName: (v) => `The record names the organisation as ${v}.`,
  orgType: (v) => `The recorded organisation type is ${q(v, 120)}.`,
  purpose: (v) => `The recorded purpose for the processing is ${q(v, 120)}.`,
  biometricTypes: (v) => `The modalities the record names are ${v}.`,
  jurisdictions: (v) => `The regimes the record puts in scope are ${v}.`,
  other_state_names: (v) => `The further states the record names are ${v}.`,

  data_source_description: (v) => `The record's account of how the data is generated is carried forward: ${q(v)}.`,
  healthcare_tpo_context: (v) => `On the health-care treatment, payment and operations context the record answers ${q(v, 200)}.`,
  entity_is_government: (v) => `On whether the entity is a government body the record answers ${q(v, 120)}.`,
  glba_financial_institution: (v) => `On GLBA financial-institution status the record answers ${q(v, 120)}.`,

  notice_before_collection: (v) => `The recorded notice position is ${q(v, 200)}.`,
  // S-B1 (doc 80, 2026-08-27) — § 15(b)(2) purpose-and-term writing.
  notice_purpose_and_term: (v) => `On whether the written notice states both the specific purpose and the length of term the record answers ${q(v, 120)}.`,
  consent_artifact_type: (v) => `The consent artefact the record names is ${q(v, 200)}.`,
  release_artifact_description: (v) => `The record's own description of the release is carried forward: ${q(v)}.`,

  retention_schedule_text: (v) => `The retention schedule the record supplies is ${q(v)}.`,
  retention_policy_public: (v) => `On whether the policy is made available to the public the record answers ${q(v, 120)}.`,
  // S-B2 (doc 80, 2026-08-27) — § 15(a) first-possession timing.
  retention_policy_predates_possession: (v) => `On whether the policy has been in place since the company first possessed biometric data the record answers ${q(v, 120)}.`,
  destruction_trigger: (v) => `The destruction trigger the record describes is ${q(v)}.`,

  protection_parity: (v) => `On protecting biometric data to at least the standard applied to other confidential information the record answers ${q(v, 120)}.`,
  sells_or_profits: (v) => `On sale, lease, trade or other profit from biometric data the record answers ${q(v, 120)}.`,
  security_measures_description: (v) => `The security measures the record describes are carried forward: ${q(v)}.`,

  disclosure_recipients: (v) => `The disclosure recipients the record names are ${q(v)}.`,
  disclosure_bases: (v) => `The disclosure bases the record selects are ${v}.`,

  tx_destruction_within_one_year: (v) => `On destruction within one year of purpose expiry the record answers ${q(v, 120)}.`,
  tx_longer_retention_required_by_law: (v) => `On a longer retention period required by law the record answers ${q(v, 120)}.`,
  tx_employer_security_collection: (v) => `On employer collection for security purposes the record answers ${q(v, 120)}.`,
  tx_ai_training_use: (v) => `On use of the data to train or develop AI the record answers ${q(v, 120)}.`,

  wa_enrolls_in_database: (v) => `On enrolment in a database the record answers ${q(v, 120)}.`,
  wa_commercial_purpose: (v) => `On a commercial purpose the record answers ${q(v, 120)}.`,
  wa_security_purpose_only: (v) => `On collection for a security purpose only the record answers ${q(v, 120)}.`,

  wa_mhmda_health_inference: (v) => `On whether the biometric data supports an inference about health the record answers ${q(v, 200)}.`,
  wa_mhmda_privacy_policy_published: (v) => `On a published consumer health data privacy policy the record answers ${q(v, 200)}.`,
  wa_mhmda_collection_consent: (v) => `On consent obtained before collection for a specified purpose the record answers ${q(v, 200)}.`,
  wa_mhmda_share_consent_separate: (v) => `On a separate sharing consent the record answers ${q(v, 200)}.`,
  wa_mhmda_geofence_health_facility: (v) => `On a geofence around an in-person health-care facility the record answers ${q(v, 200)}.`,
  // TURN 1d (2026-08-26) — the RCW 19.373.080 purpose element.
  wa_mhmda_geofence_purpose: (v) => `On whether that geofence is used to identify or track health-seeking consumers, collect consumer health data, or send notifications, messages, or advertisements, the record answers ${q(v, 200)}.`,

  approved_by_name: (v) => `The record names ${v} as the approver.`,
  approved_by_title: (v) => `The approver's recorded title is ${v}.`,
  approval_date: (v) => `The recorded approval date is ${v}.`,
  next_review_due: (v) => `The recorded next review date is ${v}.`,
};

/** Restate, in the record's own terms, every listed key the record answers. */
export function buildBiometricRecordStatement(
  intake: unknown,
  keys: readonly string[],
): string {
  const parts: string[] = [];
  for (const k of keys) {
    if (!biometricKeyFilled(intake, k)) continue;
    const tmpl = BIOMETRIC_KEY_SENTENCES[k];
    if (!tmpl) continue;
    const v = str(readBiometricKey(intake, k));
    if (!v) continue;
    parts.push(tmpl(v));
  }
  return parts.join(" ").trim();
}

/**
 * Replace the ONE sentence carrying the unsupported absence claim with the
 * record statement, leaving every other sentence byte-identical. Returns ""
 * when the swap cannot be made safely (no sentence located, or the result would
 * fall below the item384-r2 40-character substance floor), in which case the
 * caller leaves the text unchanged and logs the violation unrepaired.
 */
export function replaceBiometricAbsenceSentence(
  text: string,
  hit: string,
  replacement: string,
): string {
  const src = String(text ?? "");
  const idx = src.toLowerCase().indexOf(String(hit ?? "").toLowerCase());
  if (idx < 0 || !replacement.trim()) return "";
  let start = 0;
  for (let i = idx; i > 0; i--) {
    if (/[.!?]/.test(src[i - 1]) && /\s/.test(src[i] ?? " ")) { start = i; break; }
  }
  let end = src.length;
  for (let i = idx + hit.length; i < src.length; i++) {
    if (/[.!?]/.test(src[i])) { end = i + 1; break; }
  }
  const out = `${src.slice(0, start)}${replacement}${src.slice(end)}`
    .replace(/\s+/g, " ")
    .trim();
  if (out.replace(/\s+/g, "").length < 40) return "";
  return out;
}

// ---------------------------------------------------------------------------
// B-2 — surface → backing intake keys (the absence-claim map)
// ---------------------------------------------------------------------------

export interface BiometricCscSurface {
  /**
   * Report path. `duty_findings[<duty key>]` and
   * `identifier_characterizations[<statute key>]` are resolved by matching the
   * row's `key` / `statute_key`; anything else is dotted.
   */
  readonly path: string;
  /**
   * ITEM 403-A LESSON (b) — PRIMARY keys only. A key belongs here ONLY when it
   * is, on its own, sufficient evidence for the proposition the surface
   * asserts. Everything that merely colours the picture goes to
   * `corroborating`, which never backs the surface by itself.
   */
  readonly keys: readonly string[];
  readonly corroborating?: readonly string[];
  readonly mode: "any" | "all";
  /** Reader leaf the repair writes into. */
  readonly leaf: string;
}

/**
 * THE HOMOGENEITY AUDIT, SURFACE BY SURFACE (item403-A lesson (b)).
 *
 * Each duty row's proposition is "the record answers the question this duty
 * turns on". The PRIMARY key is the intake question the deliverable builder
 * itself branches on for that duty; anything the builder merely quotes
 * alongside it corroborates and never backs the surface on its own.
 *
 * ITEM 406-B DISCIPLINE, APPLIED TO THE MAP ITSELF. Every key below is a duty
 * row the pipeline ACTUALLY WRITES: the eighteen `mk(...)` row ids in
 * `check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts`,
 * confirmed against the rows the builder emits for `BIOMETRIC_PERFECT`. The
 * definitional and qualifier rows (`*.def_*`, `tx_cubi.c1_qualifier_other_law`,
 * `wa_19375.040_exclusions`, …) are NOT duty rows — the builder folds them into
 * `identifier_characterizations`, `entity_characterization` and `scope_gated` —
 * so naming them here would be the item406 defect over again: a map entry
 * pointing at a surface that does not exist.
 *
 * The three enforcement rows (`tx_cubi.d_enforcement`,
 * `wa_19373.090_cpa_enforcement`, `wa_19375.030_enforcement`) are likewise
 * absent, and for a second reason: they restate enforcement machinery rather
 * than the record, so an absence sentence on them is never a false absence.
 */
const DUTY_SURFACE_KEYS: Readonly<Record<string, {
  keys: readonly string[];
  corroborating?: readonly string[];
}>> = {
  // ── Illinois — BIPA (740 ILCS 14/15) ───────────────────────────────────
  "il_bipa.15a_written_policy": {
    keys: ["retention_schedule_text"],
    corroborating: ["retention_policy_public", "destruction_trigger"],
  },
  "il_bipa.15a_comply_with_schedule": {
    keys: ["destruction_trigger"],
    corroborating: ["retention_schedule_text"],
  },
  // S-B1 (doc 80, 2026-08-27) — the § 15(b) split: one entry per step.
  "il_bipa.15b1_notice_of_collection": {
    keys: ["notice_before_collection"],
  },
  "il_bipa.15b2_notice_purpose_term": {
    keys: ["notice_purpose_and_term"],
    corroborating: ["notice_before_collection"],
  },
  "il_bipa.15b3_written_release": {
    keys: ["consent_artifact_type"],
    corroborating: ["release_artifact_description"],
  },
  "il_bipa.15c_no_profit": { keys: ["sells_or_profits"] },
  "il_bipa.15d_disclosure_limits": {
    keys: ["disclosure_bases"],
    corroborating: ["disclosure_recipients"],
  },
  "il_bipa.15e_reasonable_care": {
    keys: ["security_measures_description"],
    corroborating: ["protection_parity"],
  },

  // ── Texas — CUBI (Tex. Bus. & Com. Code § 503.001) ─────────────────────
  "tx_cubi.b_notice_and_consent": {
    keys: ["notice_before_collection", "consent_artifact_type"],
    corroborating: ["release_artifact_description", "data_source_description"],
  },
  "tx_cubi.c1_disclosure_limits": {
    keys: ["disclosure_bases"],
    corroborating: ["disclosure_recipients"],
  },
  "tx_cubi.c2_reasonable_care": {
    keys: ["security_measures_description"],
    corroborating: ["protection_parity", "tx_employer_security_collection"],
  },
  "tx_cubi.c3_one_year_destruction": {
    keys: ["tx_destruction_within_one_year"],
    corroborating: ["tx_longer_retention_required_by_law", "destruction_trigger"],
  },

  // ── Washington — RCW 19.375 ────────────────────────────────────────────
  "wa_19375.020_1_enrollment_notice_consent": {
    keys: ["wa_enrolls_in_database"],
    corroborating: [
      "wa_commercial_purpose",
      "notice_before_collection",
      "consent_artifact_type",
    ],
  },
  "wa_19375.020_3_disclosure_limits": {
    keys: ["disclosure_bases"],
    corroborating: ["disclosure_recipients", "wa_commercial_purpose"],
  },
  "wa_19375.020_4_care_and_retention": {
    keys: ["security_measures_description"],
    corroborating: ["retention_schedule_text", "destruction_trigger"],
  },
  "wa_19375.020_5_material_inconsistency": {
    keys: ["wa_commercial_purpose"],
    corroborating: ["purpose", "notice_before_collection"],
  },

  // ── Washington — RCW 19.373 (MHMDA) ────────────────────────────────────
  "wa_19373.020_privacy_policy": {
    keys: ["wa_mhmda_privacy_policy_published"],
    corroborating: ["purpose"],
  },
  "wa_19373.030_collection_consent": {
    keys: ["wa_mhmda_collection_consent"],
    corroborating: ["purpose"],
  },
  "wa_19373.030_share_consent": {
    keys: ["wa_mhmda_share_consent_separate"],
    corroborating: ["disclosure_recipients"],
  },
  // TURN 1d (2026-08-26) — the purpose answer now also supports this duty.
  "wa_19373.080_geofence": { keys: ["wa_mhmda_geofence_health_facility", "wa_mhmda_geofence_purpose"] },
};


/** Every duty key the CSC map knows about. */
export const BIOMETRIC_DUTY_SURFACE_KEYS: readonly string[] = Object.keys(DUTY_SURFACE_KEYS);

const DUTY_SURFACES: readonly BiometricCscSurface[] = BIOMETRIC_DUTY_SURFACE_KEYS.map((k) => ({
  path: `duty_findings[${k}]`,
  keys: DUTY_SURFACE_KEYS[k].keys,
  corroborating: DUTY_SURFACE_KEYS[k].corroborating,
  mode: "any" as const,
  // ITEM 406-B DISCIPLINE — the leaf is one the builder writes on every duty
  // row (`record_fact`), never a key invented by this pass.
  leaf: "record_fact",
}));

/** The four statute-scoped identifier characterizations the builder emits. */
const IDENTIFIER_STATUTE_KEYS: readonly string[] = [
  "us_il_bipa", "us_tx_cubi", "us_wa_19375", "us_wa_19373",
];

const IDENTIFIER_SURFACES: readonly BiometricCscSurface[] = IDENTIFIER_STATUTE_KEYS.map((sk) => ({
  path: `identifier_characterizations[${sk}]`,
  // The proposition is "the record describes the data well enough to measure
  // it against this statute's definition". `data_source_description` is the
  // only key that establishes that; the modality list names the label, not the
  // data, so it corroborates.
  keys: ["data_source_description"],
  corroborating: ["biometricTypes", "purpose"],
  mode: "any" as const,
  leaf: "record_fact",
}));

export const BIOMETRIC_CSC_SURFACES: readonly BiometricCscSurface[] = [
  ...DUTY_SURFACES,
  ...IDENTIFIER_SURFACES,
  {
    // The proposition is "the record states what kind of actor this is".
    // `role_reasoning` is the reader leaf the builder writes here.
    path: "entity_characterization",
    keys: ["orgType"],
    corroborating: ["orgName", "entity_is_government", "glba_financial_institution", "healthcare_tpo_context"],
    mode: "any",
    leaf: "role_reasoning",
  },
  {
    // The proposition is "the record names an approver". HONEST DEGRADATION
    // matters most here: the four approval fields are `emptyIsAnswer`, so an
    // unapproved record legitimately prints the record_insufficient
    // attestation and this surface stays silent.
    path: "biometric_deliverables.attestation",
    keys: ["approved_by_name"],
    corroborating: ["approved_by_title", "approval_date", "next_review_due"],
    mode: "any",
    leaf: "statement",
  },
];


export function biometricSurfaceBacked(s: BiometricCscSurface, intake: unknown): boolean {
  return s.mode === "all"
    ? s.keys.every((k) => biometricKeyFilled(intake, k))
    : s.keys.some((k) => biometricKeyFilled(intake, k));
}

/**
 * ITEM 403-A LESSON (a) — EVIDENCE MAY NAME ONLY ANSWERED KEYS.
 */
export function answeredKeysForBiometricSurface(
  s: BiometricCscSurface,
  intake: unknown,
): string[] {
  return [...s.keys, ...(s.corroborating ?? [])].filter((k) => biometricKeyFilled(intake, k));
}

// Duty keys may carry dots (`il_bipa.15a_written_policy`), so the row-path
// grammar is wider than the cyber one.
const BIO_ROW_PATH_RE = /^([a-z_]+)\[([a-z0-9_.]+)\]$/;

/** Resolve a surface path against the report (row paths match on key/statute_key). */
export function resolveBiometricSurfaceNode(
  report: Record<string, unknown>,
  path: string,
): Record<string, unknown> | null {
  const m = BIO_ROW_PATH_RE.exec(path);
  if (m) {
    const rows = report[m[1]];
    if (!Array.isArray(rows)) return null;
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const o = r as Record<string, unknown>;
      if (String(o.key ?? o.statute_key ?? o.slug ?? "") === m[2]) return o;
    }
    return null;
  }
  const node = getPath(report, path);
  return node && typeof node === "object" && !Array.isArray(node)
    ? node as Record<string, unknown>
    : null;
}

// ---------------------------------------------------------------------------
// B-1 — per-duty reader leaves
// ---------------------------------------------------------------------------

/** Reader leaves B-1 reads on a duty row. */
export const BIOMETRIC_DUTY_CLAIM_LEAVES = [
  "record_fact",
  "application",
  "information_needed",
] as const;

/** Row collections whose entries are per-duty reader surfaces. */
export const BIOMETRIC_DUTY_ROW_KEYS = ["duty_findings"] as const;

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export type BiometricCscCheckId =
  | "b1_duty_finding_vs_record"
  | "b2_absence_claim_vs_record"
  | "b3_authority_field_hygiene"
  | "b4_structured_leaf_hygiene";

export interface BiometricCscViolation {
  check_id: BiometricCscCheckId;
  path: string;
  evidence: string;
  repaired: boolean;
}

export interface BiometricCscTelemetry {
  version: string;
  violations: BiometricCscViolation[];
  repairs: number;
  crashed: boolean;
  error?: string;
}

export interface BiometricCscOptions {
  /** The FULL biometric record the report was built from (the request body). */
  readonly intake: unknown;
}

export function runBiometricCsc(
  report: Record<string, unknown> | null | undefined,
  opts: BiometricCscOptions,
): BiometricCscTelemetry {
  const t: BiometricCscTelemetry = {
    version: BIOMETRIC_CSC_VERSION,
    violations: [],
    repairs: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = opts?.intake ?? {};
    const needles = frameBodyNeedles(null);
    const log = (v: BiometricCscViolation) => {
      t.violations.push(v);
      if (v.repaired) t.repairs += 1;
    };

    // ── B-1 — per-duty reader leaf vs the record facts that answer it ─────
    // Single-writer repair in place; flag-only for the GATE (deliberately
    // outside FALSE_ABSENCE_CHECK_IDS — the item403-A g1 precedent).
    for (const rowKey of BIOMETRIC_DUTY_ROW_KEYS) {
      const rows = report[rowKey];
      if (!Array.isArray(rows)) continue;
      rows.forEach((row, i) => {
        if (!row || typeof row !== "object") return;
        const node = row as Record<string, unknown>;
        const dutyKey = String(node.key ?? "");
        const cfg = DUTY_SURFACE_KEYS[dutyKey];
        if (!cfg) return; // no intake backing declared — never a false absence
        // A duty the statute does not reach on this record is designed
        // output; its "not applicable" prose is not an absence claim.
        if (String(node.verdict ?? "") === "not_applicable") return;
        const backing = [...cfg.keys, ...(cfg.corroborating ?? [])];
        const answered = backing.filter((k) => biometricKeyFilled(intake, k));
        if (!answered.length) return; // honest silence — the record says nothing
        for (const leaf of BIOMETRIC_DUTY_CLAIM_LEAVES) {
          const text = typeof node[leaf] === "string" ? node[leaf] as string : "";
          if (!text) continue;
          const hit = biometricCarriesAbsence(text, needles);
          if (!hit) continue;
          const built = buildBiometricRecordStatement(intake, answered);
          const repaired = built ? replaceBiometricAbsenceSentence(text, hit, built) : "";
          if (repaired && repaired !== text) node[leaf] = repaired;
          log({
            check_id: "b1_duty_finding_vs_record",
            path: `${rowKey}[${i}].${leaf}`,
            evidence:
              `the duty surface says "${clip(hit, 90)}" although the record supplies ${answered.join(", ")}.`,
            repaired: Boolean(repaired && repaired !== text),
          });
        }
      });
    }

    // ── B-2 — absence claim vs record, repaired from the record register ──
    for (const surface of BIOMETRIC_CSC_SURFACES) {
      if (!biometricSurfaceBacked(surface, intake)) continue; // honest degradation
      const node = resolveBiometricSurfaceNode(report, surface.path);
      if (!node) continue;
      if (String(node.verdict ?? "") === "not_applicable") continue;
      const prose = deepBiometricProse(node);
      if (!prose.trim()) continue;
      const partial = PARTIAL_DISCHARGE_RE.exec(prose);
      const hit = biometricCarriesAbsence(prose, needles) ?? (partial ? partial[0] : null);
      if (!hit) continue;

      const answered = answeredKeysForBiometricSurface(surface, intake);
      const built = buildBiometricRecordStatement(intake, answered);
      // NEVER change a surface's SHAPE and never flip a determination enum.
      // The repair rewrites the ONE sentence carrying the unsupported claim,
      // inside the leaf that carries it, and leaves every other key
      // byte-identical. Only when no existing leaf carries it does it fall
      // back to restating the record in the surface's declared reader leaf.
      let repaired = false;
      if (built) {
        for (const [k, v] of Object.entries(node)) {
          if (typeof v !== "string" || PROSE_EXCLUDED.has(k)) continue;
          const leafHit = biometricCarriesAbsence(v, needles);
          if (!leafHit) continue;
          const next = replaceBiometricAbsenceSentence(v, leafHit, built);
          if (next && next !== v) { node[k] = next; repaired = true; }
        }
        if (!repaired && typeof node[surface.leaf] === "string") {
          node[surface.leaf] = built;
          repaired = true;
        }
        if (repaired) node.record_backed = true;
      }
      log({
        check_id: "b2_absence_claim_vs_record",
        path: surface.path,
        evidence:
          `the surface says "${clip(hit, 90)}" although the record supplies ${answered.join(", ")}.`,
        repaired,
      });

    }

    // ── B-3 / B-4 — field hygiene. FLAG ONLY for both: this product renders
    // statute AS TEMPLATE, so no pass here may delete an authority field.
    const authority = new Set(BIOMETRIC_AUTHORITY_FIELD_KEYS);
    const structured = new Set(BIOMETRIC_STRUCTURED_LEAF_KEYS);
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (k === "_meta" || k === "_staging" || k === "_revision") continue;
        const p = path ? `${path}.${k}` : k;
        if (typeof v === "string") {
          if (!authority.has(k) && !structured.has(k)) continue;
          const hit = biometricCarriesAbsence(v, needles);
          if (!hit) continue;
          if (authority.has(k)) {
            log({
              check_id: "b3_authority_field_hygiene",
              path: p,
              evidence:
                `the authority field carries absence prose ("${clip(hit, 80)}") instead of authority; flagged, never removed — deleting it would delete a verified corpus passage.`,
              repaired: false,
            });
            continue;
          }
          log({
            check_id: "b4_structured_leaf_hygiene",
            path: p,
            evidence: `the structured leaf carries prose ("${clip(hit, 80)}") where a machine value belongs.`,
            repaired: false,
          });
        } else {
          walk(v, p);
        }
      }
    };
    walk(report, "");
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message?.slice(0, 200) ?? "unknown";
  }
  return t;
}

/** Run the pass and attach its telemetry at `_meta.internal.biometric_csc`. */
export function attachBiometricCsc(
  report: Record<string, unknown>,
  opts: BiometricCscOptions,
): BiometricCscTelemetry {
  const t = runBiometricCsc(report, opts);
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = ((meta as Record<string, unknown>).internal ??= {}) as Record<string, unknown>;
    internal.biometric_csc = t;
  } catch { /* non-fatal */ }
  return t;
}
