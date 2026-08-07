// ITEM 402 ITEM 4 — THE TYPED READINESS DETERMINATION (the durable GV-1 fix).
//
// ── THE ITEM 313 QUESTION, ANSWERED ─────────────────────────────────────────
// Item 313's DEMOTION LAW (see `governance-deliverables/build.ts`, header) is
// explicit about its reason: the maturity tier ("Initial | Developing |
// Defined | Managed | Optimised") "has NO statutory basis. It may survive only
// as a secondary, explicitly-labelled readability aid. The headline conclusion
// is `accountability_determination` — Art. 5(2) demonstrability plus Art. 24(1)
// risk-appropriateness." The tier was ALSO model-authored, which is why it
// could contradict the determinations sitting beside it.
//
// This restoration satisfies that reason on both limbs and does not reinstate
// what item313 removed:
//   * NO TIER. `readiness_determination.rating` is not a maturity band. It is a
//     one-word restatement of the STATUTORY determination the deliverables
//     builder already wrote, in the Art. 5(2)/24(1) vocabulary item313 named as
//     the headline conclusion.
//   * NOT MODEL-AUTHORED. The rating is a pure function of the typed
//     determination objects. No model writes it, and `determined_from` lists
//     the exact inputs that decided it, so any reader can re-derive it.
//   * THE TIER STAYS DEMOTED. `maturity_tier_readability_aid` is untouched,
//     and `overall_readiness_rating` / `readiness_rationale` stay deleted.
// Nothing here edits determination OUTCOMES; this module only reads them.
//
// ── THE RULE (inspectable, testable, both directions) ───────────────────────
// PRIMARY INPUT  `accountability_determination.verdict`.
// SECONDARY INPUT the count of ADVERSE sibling determinations, where the
//   siblings are exactly READINESS_SIBLING_KEYS (in that order) and ADVERSE
//   means verdict/status ∈ {"not_satisfied", "record_insufficient"}.
//
//   primary = "satisfied"            and adverse siblings = 0  → "Evidenced"
//   primary = "satisfied"            and adverse siblings ≥ 1  → "Partly evidenced"
//   primary = "partially_satisfied"                            → "Partly evidenced"
//   primary = "not_satisfied"                                  → "Not evidenced"
//   primary = "record_insufficient"                            → "Not determinable"
//   primary = "not_applicable"                                 → "Not engaged"
//   primary missing / unknown                                  → no record written
//
// A satisfied headline can never outrank an adverse sibling: that is the one
// rule the loop2-era tier broke every time it shipped beside a
// `record_insufficient` DPO determination.

export const GOVERNANCE_READINESS_VERSION = "governance-readiness@item402-2026-08-07";

/** The sibling determinations the rule reads, in the order it reads them. */
export const READINESS_SIBLING_KEYS: readonly string[] = [
  "demonstrability_findings",
  "art30_exemption_determination",
  "dpo_determination",
  "risk_calibration_finding",
  "review_and_update_finding",
  "transfer_analysis",
];

const ADVERSE = new Set(["not_satisfied", "record_insufficient"]);

export type ReadinessRating =
  | "Evidenced"
  | "Partly evidenced"
  | "Not evidenced"
  | "Not determinable"
  | "Not engaged";

export interface ReadinessDetermination {
  /** The one-word restatement of the statutory determination. */
  rating: ReadinessRating;
  /** The provision the rating restates. */
  rating_basis: string;
  /** One deterministic sentence naming the inputs that decided it. */
  rationale: string;
  /** `key:verdict` for every input actually read. */
  determined_from: string[];
}

function verdictOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const o = node as Record<string, unknown>;
  const v = o.verdict ?? o.status;
  return typeof v === "string" ? v.trim() : "";
}

/** Every adverse verdict found under a sibling node (the node or its children). */
function adverseVerdicts(node: unknown): string[] {
  const found: string[] = [];
  const top = verdictOf(node);
  if (top) {
    if (ADVERSE.has(top)) found.push(top);
    return found;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const v = verdictOf(child);
      if (v && ADVERSE.has(v)) found.push(v);
    }
    return found;
  }
  if (node && typeof node === "object") {
    for (const child of Object.values(node as Record<string, unknown>)) {
      const v = verdictOf(child);
      if (v && ADVERSE.has(v)) found.push(v);
    }
  }
  return found;
}

const BASIS = "GDPR Articles 5(2) and 24(1)";

/**
 * Derive the typed readiness determination. Returns null when the record
 * carries no accountability determination — no rating is ever invented, and a
 * document without one renders exactly as it does today.
 */
export function deriveReadinessDetermination(
  report: unknown,
): ReadinessDetermination | null {
  const r = (report ?? null) as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return null;
  const primary = verdictOf(r.accountability_determination);
  if (!primary) return null;

  const determined_from: string[] = [`accountability_determination:${primary}`];
  let adverse = 0;
  for (const key of READINESS_SIBLING_KEYS) {
    if (!(key in r)) continue;
    const hits = adverseVerdicts(r[key]);
    const v = verdictOf(r[key]);
    determined_from.push(`${key}:${v || (hits.length ? hits.join("+") : "none_adverse")}`);
    adverse += hits.length;
  }

  let rating: ReadinessRating;
  switch (primary) {
    case "satisfied":
      rating = adverse === 0 ? "Evidenced" : "Partly evidenced";
      break;
    case "partially_satisfied":
      rating = "Partly evidenced";
      break;
    case "not_satisfied":
      rating = "Not evidenced";
      break;
    case "record_insufficient":
      rating = "Not determinable";
      break;
    case "not_applicable":
      rating = "Not engaged";
      break;
    default:
      return null;
  }

  const rationale = adverse > 0
    ? `The accountability determination is "${primary.replace(/_/g, " ")}" and ${adverse} of the determinations read alongside it are adverse, so the rating follows the weaker of the two.`
    : `The accountability determination is "${primary.replace(/_/g, " ")}" and no determination read alongside it is adverse.`;

  return { rating, rating_basis: BASIS, rationale, determined_from };
}

/**
 * The ONE readiness line every surface reads. Never computed twice, and the
 * wording is byte-identical to the item400 line class so the restoration adds
 * a typed SOURCE without changing a single reader-facing string.
 */
export const READINESS_RATING_LINES: Record<ReadinessRating, string> = {
  "Evidenced": "Accountability evidenced",
  "Partly evidenced": "Accountability partly evidenced",
  "Not evidenced": "Accountability not evidenced",
  "Not determinable": "Accountability not yet determinable",
  "Not engaged": "Accountability duties not engaged",
};

export function readinessLine(rd: ReadinessDetermination | null | undefined): string {
  if (!rd) return "";
  return READINESS_RATING_LINES[rd.rating] ?? "";
}

/**
 * Write the typed record onto the report. Fail-open, single-writer: nothing
 * else in the pipeline may author `readiness_determination`.
 */
export function attachReadinessDetermination(
  report: Record<string, unknown> | null | undefined,
): ReadinessDetermination | null {
  if (!report || typeof report !== "object") return null;
  const rd = deriveReadinessDetermination(report);
  if (!rd) return null;
  report.readiness_determination = rd;
  return rd;
}

/**
 * The ONE line a RENDERER may print. Readers never derive a rating: they read
 * the typed record (or the line the pipeline already wrote) and print nothing
 * when a document carries neither — which is every document persisted before
 * item402, so legacy renders are byte-identical.
 */
export function readinessLineForRender(report: unknown): string {
  const r = (report ?? null) as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return "";
  const written = r.governance_readiness_line;
  if (typeof written === "string" && written.trim()) return written.trim();
  const rd = r.readiness_determination as { rating?: string } | undefined;
  const rating = rd && typeof rd === "object" ? String(rd.rating ?? "") : "";
  return (READINESS_RATING_LINES as Record<string, string>)[rating] ?? "";
}
