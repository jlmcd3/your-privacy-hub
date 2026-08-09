/**
 * ITEM 426 — RISK `exception_analysis` CANONICAL CONTRACT.
 *
 * The surface was TRI-SHAPED in the wild (verified live 2026-08-09):
 *   • absent            — legacy anchors bd76fc07-…, ae70c6f0-… (no key)
 *   • empty array       — 7e023e1e-… (padding, NOT omission)
 *   • string[]          — 23261656-… (2 elements, first carries a hole defect)
 *   • legacy object[]   — 996e895e-…, 2ee65e68-… (statutory_basis/facts_supporting/flags)
 *   • canonical record  — the loop2 nine leaves, restored by this item
 *
 * Readers MUST tolerate all five states; `coerceExceptionView` is the ONE
 * discriminator every reader consumes (edge + frontend mirror at
 * src/lib/risk-exceptions.ts).
 *
 * LAW (item 422-B/C): `statutory_basis` is DETERMINISTIC — resolved from
 * `EXCEPTION_PIN`, never model-authored. An unknown or mis-anchored exception
 * type takes the honest downgrade (`EXCEPTION_DOWNGRADE_BASIS`).
 *
 * ANTI-PADDING RULE: the section is PRESENT only when an exception is claimed
 * OR the record explicitly claims none. With neither, the key is OMITTED — not
 * an empty array, not a "none apply" litany.
 */

export const RISK_EXCEPTIONS_CONTRACT_VERSION = "risk-exceptions@2026-08-09-item426";

// ---------------------------------------------------------------------------
// Deterministic pinpoint registry (single home; previously private to
// _shared/cppa-test-states.ts — values are byte-preserved).
// ---------------------------------------------------------------------------

export const EXCEPTION_PIN: Readonly<Record<string, string>> = {
  fraud_detection:
    "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
  security_integrity:
    "Cal. Civ. Code § 1798.140(e)(2) (security-and-integrity business purpose; see § 1798.140(ac)); deletion requests: § 1798.105(d)(2)",
  debugging: "Cal. Civ. Code § 1798.140(e)(3); deletion requests: § 1798.105(d)(3)",
  transient_use: "Cal. Civ. Code § 1798.140(e)(4)",
  internal_research:
    "Cal. Civ. Code § 1798.140(e)(7); deletion requests: § 1798.105(d)(6) (informed consent) or (d)(7)",
  legal_compliance:
    "Cal. Civ. Code § 1798.145(a)(1)(A)–(B); deletion requests: § 1798.105(d)(8)",
  consumer_request:
    "Cal. Civ. Code § 1798.105(d)(1) (complete the transaction / provide the requested good or service)",
  employment_context:
    "NO CURRENT STATUTORY EXEMPTION — § 1798.145(m) inoperative since 2023-01-01; flag for counsel review",
};

/** Honest downgrade for an unknown / unresolvable exception type. */
export const EXCEPTION_DOWNGRADE_BASIS =
  "Statutory basis not resolved on this record — counsel review required before relying on this exception";

/** The ONE honest sentence for an explicit no-exceptions record. */
export const EXCEPTION_EXPLICIT_NONE_SENTENCE =
  "The record claims no statutory exception for the activities assessed, so no exception is analysed here.";

export const EXCEPTION_LABELS: Readonly<Record<string, string>> = {
  fraud_detection: "Fraud detection",
  security_integrity: "Security and integrity",
  debugging: "Debugging",
  transient_use: "Transient use",
  internal_research: "Internal research",
  legal_compliance: "Legal compliance",
  consumer_request: "Consumer-requested transaction",
  employment_context: "Employment context",
};

export function exceptionLabel(key: string): string {
  return EXCEPTION_LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Registry resolution with the honest downgrade. Never returns empty. */
export function resolveExceptionPinpoint(key: unknown): {
  statutory_basis: string;
  resolved: boolean;
} {
  const k = typeof key === "string" ? key.trim().toLowerCase() : "";
  const pin = k ? EXCEPTION_PIN[k] : undefined;
  return pin
    ? { statutory_basis: pin, resolved: true }
    : { statutory_basis: EXCEPTION_DOWNGRADE_BASIS, resolved: false };
}

// ---------------------------------------------------------------------------
// The canonical record — the loop2 NINE leaves.
// ---------------------------------------------------------------------------

export interface RiskException {
  exception_name: string;
  claimed: boolean;
  /** DETERMINISTIC — registry-resolved, never model-authored. */
  statutory_basis: string;
  scope_described: string;
  safeguards_described: string;
  documentation_status: string;
  missing_elements: string[];
  validity_assessment: string;
  flags: string[];
  /** Provenance for audit; not part of the nine leaves. */
  _exception_key?: string;
  _basis_source?: "registry" | "registry_downgrade_unresolved";
}

export const RISK_EXCEPTION_LEAVES: readonly (keyof RiskException)[] = [
  "exception_name",
  "claimed",
  "statutory_basis",
  "scope_described",
  "safeguards_described",
  "documentation_status",
  "missing_elements",
  "validity_assessment",
  "flags",
];

export function isRiskException(v: unknown): v is RiskException {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.exception_name === "string" &&
    typeof o.claimed === "boolean" &&
    typeof o.statutory_basis === "string" &&
    typeof o.documentation_status === "string" &&
    Array.isArray(o.missing_elements) &&
    typeof o.validity_assessment === "string" &&
    Array.isArray(o.flags)
  );
}

// ---------------------------------------------------------------------------
// THE reader — five states.
// ---------------------------------------------------------------------------

export type ExceptionShape = "absent" | "empty" | "strings" | "legacy_objects" | "typed";

export interface ExceptionView {
  shape: ExceptionShape;
  /** true when there is renderable content (strings or object rows). */
  present: boolean;
  /** Prose elements — populated on the `strings` shape only. */
  texts: string[];
  /** Object rows — legacy objects and canonical records alike. */
  rows: Record<string, unknown>[];
  /** Rows that satisfy the canonical nine-leaf contract. */
  typed: RiskException[];
}

const EMPTY_VIEW: ExceptionView = Object.freeze({
  shape: "absent",
  present: false,
  texts: [],
  rows: [],
  typed: [],
}) as ExceptionView;

export function coerceExceptionView(value: unknown): ExceptionView {
  if (value === undefined || value === null) return { ...EMPTY_VIEW, shape: "absent" };

  // Bare string — a single prose element.
  if (typeof value === "string") {
    const t = value.trim();
    return t
      ? { shape: "strings", present: true, texts: [value], rows: [], typed: [] }
      : { ...EMPTY_VIEW, shape: "empty" };
  }

  // Single object (never seen in the wild but tolerated).
  if (!Array.isArray(value) && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return {
      shape: isRiskException(row) ? "typed" : "legacy_objects",
      present: true,
      texts: [],
      rows: [row],
      typed: isRiskException(row) ? [row] : [],
    };
  }

  if (!Array.isArray(value)) return { ...EMPTY_VIEW, shape: "absent" };
  if (value.length === 0) return { ...EMPTY_VIEW, shape: "empty" };

  const texts: string[] = [];
  const rows: Record<string, unknown>[] = [];
  for (const el of value) {
    if (typeof el === "string") {
      if (el.trim()) texts.push(el);
    } else if (el && typeof el === "object" && !Array.isArray(el)) {
      rows.push(el as Record<string, unknown>);
    }
  }
  if (rows.length === 0 && texts.length === 0) return { ...EMPTY_VIEW, shape: "empty" };
  if (rows.length === 0) return { shape: "strings", present: true, texts, rows: [], typed: [] };
  const typed = rows.filter(isRiskException) as unknown as RiskException[];
  return {
    shape: typed.length === rows.length ? "typed" : "legacy_objects",
    present: true,
    texts,
    rows,
    typed,
  };
}

/** Prose projection every list-shaped reader can render without dropping rows. */
export function exceptionViewText(view: ExceptionView): string[] {
  if (view.shape === "strings") return view.texts.slice();
  const out = view.texts.slice();
  for (const r of view.rows) {
    const name = typeof r.exception_name === "string" && r.exception_name.trim()
      ? r.exception_name.trim()
      : "Exception";
    const basis = typeof r.statutory_basis === "string" ? r.statutory_basis.trim() : "";
    const claimed = r.claimed === true ? "Claimed" : r.claimed === false ? "Not claimed" : "";
    const body = [
      typeof r.facts_supporting === "string" ? r.facts_supporting.trim() : "",
      typeof r.scope_described === "string" ? r.scope_described.trim() : "",
      typeof r.safeguards_described === "string" ? r.safeguards_described.trim() : "",
      typeof r.documentation_status === "string" ? r.documentation_status.trim() : "",
      typeof r.validity_assessment === "string" ? r.validity_assessment.trim() : "",
      typeof r.argument_strength_rationale === "string" ? r.argument_strength_rationale.trim() : "",
    ].filter(Boolean).join(" ");
    const head = [name, claimed, basis].filter(Boolean).join(" — ");
    out.push(body ? `${head}. ${body}` : `${head}.`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// CONDITIONALITY — the anti-padding rule.
// ---------------------------------------------------------------------------

export type ExceptionTrigger = "claimed" | "explicit_none" | "absent";

function intakeExceptionsBlock(intake: unknown): Record<string, unknown> | undefined {
  const rec = (intake as Record<string, unknown> | null | undefined) ?? undefined;
  if (!rec || typeof rec !== "object") return undefined;
  if (!("exceptions_intake" in rec)) return undefined;
  const block = rec.exceptions_intake;
  if (block === null || block === undefined) return {};
  if (typeof block !== "object" || Array.isArray(block)) return {};
  return block as Record<string, unknown>;
}

/** Exception keys the record actually claims. */
export function claimedExceptionKeys(intake: unknown): string[] {
  const block = intakeExceptionsBlock(intake);
  if (!block) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(block)) {
    if (v === true) out.push(k);
    else if (v && typeof v === "object" && (v as Record<string, unknown>).claimed) out.push(k);
  }
  return out;
}

/**
 * ITEM 380-r5c LAW: a blank `exceptions_intake` block presented unconditionally
 * is a SUBSTANTIVE negative answer (emptyIsAnswer), not an unanswered question.
 * Presence of the key ⇒ the record explicitly claims none. Absence ⇒ the
 * question was never reached and the section is OMITTED.
 */
export function exceptionTrigger(intake: unknown): ExceptionTrigger {
  const block = intakeExceptionsBlock(intake);
  if (!block) return "absent";
  return claimedExceptionKeys(intake).length > 0 ? "claimed" : "explicit_none";
}

// ---------------------------------------------------------------------------
// THE WRITER helpers — canonical emission (LAW 3: one write site, in the
// caller named at the emission seam).
// ---------------------------------------------------------------------------

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

/** Build ONE canonical record for a claimed exception key. */
export function buildExceptionRecord(
  key: string,
  raw: unknown,
  legacy?: Record<string, unknown>,
): RiskException {
  const detail = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pin = resolveExceptionPinpoint(key);
  const scope = str(detail.scope) || str(detail.scope_described) || str(legacy?.scope_described);
  const safeguards = str(detail.safeguards) || str(detail.safeguards_described) ||
    str(legacy?.safeguards_described);
  const docs = str(detail.documentation) || str(detail.documentation_status) ||
    str(legacy?.documentation_status) || str(legacy?.facts_supporting);
  const missing: string[] = [];
  if (!scope) missing.push("the scope of the processing the exception is claimed to cover");
  if (!safeguards) missing.push("the safeguards applied to the processing under the exception");
  if (!docs) missing.push("the documentation on which the exception rests");
  const validity = missing.length === 0
    ? "The record supplies scope, safeguards, and documentation for this exception; counsel can assess it on the record as it stands."
    : "The record does not yet carry every element needed to assess this exception; the items named above complete it.";
  const flags = strList(legacy?.flags);
  if (!pin.resolved) {
    flags.push("Statutory basis unresolved on the exception registry — counsel review required.");
  }
  return {
    exception_name: str(detail.exception_name) || str(legacy?.exception_name) ||
      exceptionLabel(key),
    claimed: true,
    statutory_basis: pin.statutory_basis,
    scope_described: scope,
    safeguards_described: safeguards,
    documentation_status: docs,
    missing_elements: missing,
    validity_assessment: validity,
    flags,
    _exception_key: key,
    _basis_source: pin.resolved ? "registry" : "registry_downgrade_unresolved",
  };
}

export interface ExceptionNormalizeSummary {
  trigger: ExceptionTrigger;
  action: "typed" | "explicit_none" | "omitted" | "left_legacy";
  emitted: number;
  downgraded: number;
  padding_removed: boolean;
}

/**
 * SINGLE WRITE SITE for the SHAPE of `exception_analysis`.
 *
 * • claimed        ⇒ canonical nine-leaf records with registry pinpoints
 * • explicit none  ⇒ the ONE honest sentence
 * • neither        ⇒ the key is DELETED (padding ends here)
 *
 * Legacy prose already on the report is preserved when the trigger is
 * `claimed` but the record supplies no exception detail we can type (fail-open,
 * never destructive on a document we did not author).
 */
export function normalizeRiskExceptions(
  report: Record<string, unknown>,
  intake: unknown,
): ExceptionNormalizeSummary {
  const trigger = exceptionTrigger(intake);
  const view = coerceExceptionView(report.exception_analysis);
  const hadKey = "exception_analysis" in report;

  if (trigger === "absent") {
    const padding = hadKey && !view.present;
    if (padding || !view.present) delete report.exception_analysis;
    return {
      trigger,
      action: "omitted",
      emitted: 0,
      downgraded: 0,
      padding_removed: padding,
    };
  }

  if (trigger === "explicit_none") {
    if (view.present && view.rows.length > 0) {
      // A document that already carries exception rows is not rewritten here;
      // the CSC's r2 check owns the claimed-vs-record contradiction.
      return {
        trigger,
        action: "left_legacy",
        emitted: view.rows.length,
        downgraded: 0,
        padding_removed: false,
      };
    }
    const padding = hadKey && !view.present;
    report.exception_analysis = [EXCEPTION_EXPLICIT_NONE_SENTENCE];
    return { trigger, action: "explicit_none", emitted: 1, downgraded: 0, padding_removed: padding };
  }

  // trigger === "claimed"
  const block = intakeExceptionsBlock(intake) ?? {};
  const keys = claimedExceptionKeys(intake);
  const byName = new Map<string, Record<string, unknown>>();
  for (const r of view.rows) {
    const n = str(r.exception_name).toLowerCase();
    if (n) byName.set(n, r);
  }
  const records: RiskException[] = [];
  let downgraded = 0;
  for (const key of keys) {
    const legacy = byName.get(exceptionLabel(key).toLowerCase()) ??
      byName.get(key.replace(/_/g, " ").toLowerCase());
    const rec = buildExceptionRecord(key, block[key], legacy);
    if (rec._basis_source === "registry_downgrade_unresolved") downgraded++;
    records.push(rec);
  }
  if (records.length === 0) {
    return {
      trigger,
      action: "left_legacy",
      emitted: view.rows.length + view.texts.length,
      downgraded: 0,
      padding_removed: false,
    };
  }
  const padding = hadKey && !view.present;
  report.exception_analysis = records;
  return { trigger, action: "typed", emitted: records.length, downgraded, padding_removed: padding };
}
