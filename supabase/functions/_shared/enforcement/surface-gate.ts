/**
 * ENFORCEMENT SURFACE GATE — Item 354 (CEO-approved; implements the Item 352
 * stratification memo's recommendation as ENFORCED CODE, not convention).
 *
 * ONE shared implementation (REUSE LAW). Every customer-facing enforcement /
 * precedent output routes its rows through this module.
 *
 * THE BAR (memo, verbatim intent). A row may surface only if ALL hold:
 *   1. verification_status = 'verified'
 *   2. document-backed — own `source_document_text` (>200 chars) OR a
 *      `source_document_cache` hit on `source_url` (>200 chars). The
 *      denormalised `strat_has_document` column carries exactly this
 *      predicate (Item 352 sweep) and is the SQL prefilter; the in-memory
 *      check re-verifies from row fields and never trusts the flag alone
 *      when the underlying evidence fields are present and empty.
 *   3. final instrument — disposition/instrument class in the FINAL set.
 *      Investigations, complaints, advisories and press summaries are NOT
 *      final instruments and never surface.
 *   4. authority_class on the explicit per-product allow-list below.
 *
 * ── NAMED, DATED GATE ────────────────────────────────────────────────────────
 * CPPA-INCLUSION-GATE (2026-08-01, CEO): `authority_class = 'cppa'` is
 * EXCLUDED from every product allow-list, including cppa-risk, pending
 * EXPLICIT CEO inclusion. Same pattern as the §7156(a) carve-out: the
 * exclusion is coded, named and dated; lifting it requires a CEO instruction
 * that names this gate. A cppa row that is verified + document-backed +
 * final still does NOT surface while this gate stands.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Closed authority-class vocabulary (Item 352 stratification sweep). */
export const AUTHORITY_CLASSES = [
  "cppa",
  "eu_dpa",
  "eea_dpa",
  "uk_dpa",
  "us_federal_agency",
  "us_state_ag",
  "ca_commissioner",
  "court",
  "other",
  "unclassified",
] as const;
export type AuthorityClass = (typeof AUTHORITY_CLASSES)[number];

/** Final-instrument set. Anything outside this set is not a final instrument. */
export const FINAL_INSTRUMENTS = [
  "administrative_fine",
  "final_decision",
  "settlement",
  "consent_order",
  "injunctive_relief",
] as const;

/** Explicitly non-final instrument classes (documentation + action_type guard). */
export const NON_FINAL_INSTRUMENTS = [
  "investigation",
  "complaint",
  "press_summary",
  "press_release",
  "advisory",
  "advisory_opinion",
  "proposed_fine_reported_to_police",
  "unknown",
  "other",
] as const;

const FINAL_SET = new Set<string>(FINAL_INSTRUMENTS as readonly string[]);

/**
 * Gate profiles.
 *  - `cppa_risk`  : the full memo bar. Allow-list = EU/EEA/UK DPA material for
 *                   persuasive context; cppa excluded (CPPA-INCLUSION-GATE).
 *  - `preserved`  : other products. Current behaviour preserved (moderator
 *                   `requires_review` rows stay hidden) but routed through
 *                   this same module, plus the CPPA-INCLUSION-GATE which is
 *                   global by CEO instruction.
 */
export type GateProfile = "cppa_risk" | "preserved";

export interface ProductGate {
  product: string;
  profile: GateProfile;
  /** null = no authority-class restriction beyond the global cppa exclusion. */
  allow_authority_classes: AuthorityClass[] | null;
}

/** Per-product allow-list table. */
export const PRODUCT_GATES: Record<string, ProductGate> = {
  "cppa-risk": {
    product: "cppa-risk",
    profile: "cppa_risk",
    allow_authority_classes: ["eu_dpa", "eea_dpa", "uk_dpa"],
  },
  default: {
    product: "default",
    profile: "preserved",
    allow_authority_classes: null,
  },
};

/** Tool identifiers that resolve to the cppa-risk product family. */
const CPPA_RISK_TOOLS = new Set([
  "cppa-risk",
  "cppa_risk",
  "cppa-risk-assessment",
  "run-cppa-risk-assessment",
  "ltp-risk-doc-gen",
  "cppa-risk-doc",
]);

export function resolveProductGate(toolOrProduct?: string | null): ProductGate {
  const key = String(toolOrProduct ?? "").trim().toLowerCase();
  if (CPPA_RISK_TOOLS.has(key)) return PRODUCT_GATES["cppa-risk"];
  return PRODUCT_GATES.default;
}

/** Row shape the gate reads. All fields optional; missing ⇒ fail closed. */
export interface GateRow {
  id?: string;
  verification_status?: string | null;
  disposition_type?: string | null;
  action_type?: string | null;
  authority_class?: string | null;
  strat_has_document?: boolean | null;
  source_document_text?: string | null;
  source_url?: string | null;
  [k: string]: unknown;
}

export interface GateOptions {
  /** Product / tool identifier. */
  product?: string | null;
  /** Source URLs known to have a >200-char `source_document_cache` hit. */
  documentCacheHits?: Set<string>;
}

export type GateReason =
  | "ok"
  | "not_verified"
  | "not_document_backed"
  | "not_final_instrument"
  | "authority_class_not_allowed"
  | "cppa_inclusion_gate";

const MIN_DOC_CHARS = 200;

export function isVerified(row: GateRow): boolean {
  return String(row.verification_status ?? "").trim() === "verified";
}

export function isDocumentBacked(row: GateRow, cacheHits?: Set<string>): boolean {
  const own = typeof row.source_document_text === "string"
    ? row.source_document_text.trim().length
    : -1;
  if (own >= MIN_DOC_CHARS) return true;
  const url = String(row.source_url ?? "").trim();
  if (url && cacheHits?.has(url)) return true;
  // The text column may not be selected on a given surface; fall back to the
  // denormalised sweep flag only when the text field was NOT selected at all.
  if (own === -1 && row.strat_has_document === true) return true;
  return false;
}

export function isFinalInstrument(row: GateRow): boolean {
  const disp = String(row.disposition_type ?? "").trim().toLowerCase();
  if (disp) return FINAL_SET.has(disp);
  // No disposition recorded: an action_type in the final set may stand in;
  // anything else (investigation, complaint, advisory, blank) is not final.
  const at = String(row.action_type ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return at ? FINAL_SET.has(at) : false;
}

export function gateRow(
  row: GateRow,
  opts: GateOptions = {},
): { allowed: boolean; reason: GateReason } {
  const gate = resolveProductGate(opts.product);
  const cls = String(row.authority_class ?? "").trim().toLowerCase();

  // CPPA-INCLUSION-GATE (2026-08-01) — global, checked first so the reason is
  // reported honestly even for a fully qualified row.
  if (cls === "cppa") return { allowed: false, reason: "cppa_inclusion_gate" };

  if (gate.profile === "preserved") {
    // Current behaviour preserved: moderator-review rows stay hidden.
    if (String(row.verification_status ?? "").trim() === "requires_review") {
      return { allowed: false, reason: "not_verified" };
    }
    if (gate.allow_authority_classes && !gate.allow_authority_classes.includes(cls as AuthorityClass)) {
      return { allowed: false, reason: "authority_class_not_allowed" };
    }
    return { allowed: true, reason: "ok" };
  }

  if (!isVerified(row)) return { allowed: false, reason: "not_verified" };
  if (!isDocumentBacked(row, opts.documentCacheHits)) {
    return { allowed: false, reason: "not_document_backed" };
  }
  if (!isFinalInstrument(row)) return { allowed: false, reason: "not_final_instrument" };
  if (gate.allow_authority_classes && !gate.allow_authority_classes.includes(cls as AuthorityClass)) {
    return { allowed: false, reason: "authority_class_not_allowed" };
  }
  return { allowed: true, reason: "ok" };
}

/** Filter a row set through the gate. */
export function filterSurfaceRows<T extends GateRow>(rows: T[], opts: GateOptions = {}): T[] {
  return (rows ?? []).filter((r) => gateRow(r, opts).allowed);
}

/** Per-reason drop counts, for telemetry. Never surfaced to customers. */
export function gateAudit(rows: GateRow[], opts: GateOptions = {}): Record<GateReason, number> {
  const out = {
    ok: 0,
    not_verified: 0,
    not_document_backed: 0,
    not_final_instrument: 0,
    authority_class_not_allowed: 0,
    cppa_inclusion_gate: 0,
  } as Record<GateReason, number>;
  for (const r of rows ?? []) out[gateRow(r, opts).reason]++;
  return out;
}

/** Columns every gated surface MUST select so the gate can evaluate a row. */
export const GATE_COLUMNS =
  "verification_status, disposition_type, action_type, authority_class, strat_has_document";

/**
 * SQL prefilter. Applies the gate's server-side portion to a PostgREST query
 * builder. The in-memory `gateRow` check still runs on the returned rows —
 * the SQL side is an optimisation, never the sole enforcement point.
 */
export function applyGateQuery<Q>(query: Q, product?: string | null): Q {
  const gate = resolveProductGate(product);
  let q = query as any;
  // Global CPPA-INCLUSION-GATE (2026-08-01).
  q = q.or("authority_class.is.null,authority_class.neq.cppa");
  if (gate.profile === "preserved") {
    q = q.not("verification_status", "eq", "requires_review");
    return q as Q;
  }
  q = q.eq("verification_status", "verified");
  q = q.eq("strat_has_document", true);
  q = q.in("disposition_type", FINAL_INSTRUMENTS as unknown as string[]);
  if (gate.allow_authority_classes) {
    q = q.in("authority_class", gate.allow_authority_classes);
  }
  return q as Q;
}
