// ITEM 346 (FRAME LIBRARY REVISION) — ENGINE-CONCLUSION SLOT SOURCE.
//
// SLOT TYPE 3 of 3. The engine decides WHICH conclusion the record supports; the
// library supplies HOW IT READS. This module is a FINITE, PINNED mapping from a
// computed determination type to an authored consequence clause and, where the
// determination blocks reasoning, the authored blocked-reasoning clause.
//
// LAWS.
//   * FINITE — a determination type with no row here resolves to null and the
//     slot is silent (FILL-OR-OMIT). Nothing is generated at render time.
//   * ENGINE OWNS THE CHOICE — no row here inspects the record. The key handed
//     in comes from the engine's own computed output (`Consequence.decision`,
//     the necessity verdicts, the weighing sufficiency classes).
//   * NO NEW OBLIGATION — a clause describes what this assessment can and cannot
//     conclude. It never asserts a legal duty; duties come from the pinned
//     registry-legal phrasings.

export const ENGINE_CONCLUSION_VERSION = "prose-conclusions-2026-08-01-item346";

export interface EngineConclusion {
  readonly key: string;
  /** Reads after "so without that analysis this assessment …". */
  readonly consequence_clause: string;
  /**
   * The CEO pattern's second half. It carries its own connector ("— it can
   * describe … but it cannot …") so that a determination which blocks NOTHING
   * resolves to null and the sentence simply ends, rather than leaving a
   * dangling "but it cannot" in the render.
   */
  readonly blocked_reasoning_clause: string | null;
  /** Where the key comes from in the engine's output. */
  readonly determined_by: string;
  readonly status: "pinned";
  readonly reviewed_in_ledger_item: string;
}

const C = (
  key: string,
  determined_by: string,
  consequence_clause: string,
  blocked_reasoning_clause: string | null,
): EngineConclusion => ({
  key,
  consequence_clause,
  blocked_reasoning_clause,
  determined_by,
  status: "pinned",
  reviewed_in_ledger_item: "Item 346",
});

const DEC = "activity_analytics[].consequence.decision";
const WEIGH = "activity_analytics[].weighing[].sufficiency";
const NEC = "activity_analytics[].necessity_analysis[].verdict";

/** cppa-risk determination → authored phrasing. */
export const CPPA_RISK_ENGINE_CONCLUSIONS: Record<string, EngineConclusion> = {
  // ── Consequence decisions (§ 7152(a)(7)) ───────────────────────────
  "consequence.initiate": C(
    "consequence.initiate",
    DEC,
    "records the processing as supportable on the record before it",
    null,
  ),
  "consequence.initiate_with_conditions": C(
    "consequence.initiate_with_conditions",
    DEC,
    "records the processing as supportable only while the conditions set out below are met",
    "— it can describe the exposure the record supports, but it cannot treat the conditions below as optional, because the conclusion rests on them",
  ),
  "consequence.do_not_initiate_absent_change": C(
    "consequence.do_not_initiate_absent_change",
    DEC,
    "does not support initiating the processing as the record currently describes it",
    "— it can describe the exposure the record supports, but it cannot conclude that the benefits outweigh the negative impacts, because the impacts remaining after the recorded safeguards are not offset on this record",
  ),
  "consequence.reserved_insufficient_record": C(
    "consequence.reserved_insufficient_record",
    DEC,
    "cannot reach the weighing conclusion and reserves it",
    "— it can describe the exposure the record supports, but it cannot complete the weighing the regulation calls for, or state whether the processing should be initiated",
  ),

  // ── Weighing sufficiency (§ 7152(a)(4)) ────────────────────────────
  "weighing.benefit_not_stated": C(
    "weighing.benefit_not_stated",
    WEIGH,
    "cannot weigh benefits against the negative impacts it identifies",
    "— it can describe the exposure the record supports, but it cannot conclude anything about whether the processing is justified, because one side of the comparison is absent from the record",
  ),
  "weighing.benefit_generic": C(
    "weighing.benefit_generic",
    WEIGH,
    "cannot give the asserted benefit any weight as stated",
    "— it can describe the exposure the record supports, but it cannot treat a generic benefit statement as an offset to a specific identified impact",
  ),
  "weighing.benefit_supported": C(
    "weighing.benefit_supported",
    WEIGH,
    "carries the weighing through on the benefits the record states",
    null,
  ),

  // ── Necessity verdicts (§ 7152(a)(2)) ──────────────────────────────
  "necessity.minimisation_candidate": C(
    "necessity.minimisation_candidate",
    NEC,
    "records those elements as collected beyond what the stated purpose needs",
    "— it can describe the exposure the record supports, but it cannot treat the current collection set as the minimum the purpose requires",
  ),
  "necessity.undetermined_on_the_record": C(
    "necessity.undetermined_on_the_record",
    NEC,
    "cannot determine whether the collection set is the minimum the purpose requires",
    "— it can describe the exposure the record supports, but it cannot confirm that the information collected is limited to what the stated purpose needs",
  ),
  "necessity.supported_as_necessary": C(
    "necessity.supported_as_necessary",
    NEC,
    "records those elements as necessary to the stated purpose",
    null,
  ),

  // ── Record sufficiency (§ 7152(a) generally) ───────────────────────
  "record.insufficient_for_balancing": C(
    "record.insufficient_for_balancing",
    "record_sufficiency",
    "stops short of the balancing the regulation is directed at",
    "— it can describe the exposure the record supports, but it cannot reach the balancing conclusion until the items listed for review are supplied",
  ),
  "record.sufficient_for_balancing": C(
    "record.sufficient_for_balancing",
    "record_sufficiency",
    "proceeds to the balancing on a complete record",
    null,
  ),
};

export interface EngineConclusionBook {
  readonly product: string;
  readonly version: string;
  readonly conclusions: Record<string, EngineConclusion>;
}

export const ENGINE_CONCLUSION_BOOKS: Record<string, EngineConclusionBook> = {
  "cppa-risk": {
    product: "cppa-risk",
    version: ENGINE_CONCLUSION_VERSION,
    conclusions: CPPA_RISK_ENGINE_CONCLUSIONS,
  },
};

export type ConclusionPart = "consequence" | "blocked";

/**
 * Resolve an engine determination to its authored clause. `key` may be a bare
 * determination key ("consequence.initiate") or that key suffixed with the part
 * ("consequence.initiate#blocked"), which is how a frame addresses the two
 * halves of the CEO pattern from one pinned row.
 */
export function resolveEngineConclusion(product: string, key: string): string | null {
  const [base, partRaw] = String(key ?? "").split("#");
  const part: ConclusionPart = partRaw === "blocked" ? "blocked" : "consequence";
  const row = ENGINE_CONCLUSION_BOOKS[product]?.conclusions?.[base];
  if (!row) return null;
  const value = part === "blocked" ? row.blocked_reasoning_clause : row.consequence_clause;
  return value && value.trim() ? value : null;
}

export function engineConclusionKeys(product: string): string[] {
  return Object.keys(ENGINE_CONCLUSION_BOOKS[product]?.conclusions ?? {});
}
