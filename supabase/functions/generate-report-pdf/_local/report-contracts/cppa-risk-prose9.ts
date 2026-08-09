/**
 * ITEM 369 — cppa-risk PROSE-9 CONTRACT (v2), BUILD-AND-PROVE ONLY.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 STEP 1 — THE SHAPE-MAPPING DECISION (recorded here, in code).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * VERDICT: (c) CONTRACT VERSION BUMP. Item 363's nine-section document plan
 * does NOT map onto `CPPA_RISK_SHAPE_VERSION` (v1, cppa-risk-shape.ts) without
 * a lossy fabrication. Three independent reasons, any one of which is fatal to
 * a same-contract swap:
 *
 *   1. `record_card` is LABELLED DATA (label/value lines produced by
 *      plan-render's record-card path), not narrative prose. v1's nearest key,
 *      `processing_narrative`, is declared a prose-block list. Rendering the
 *      card as sentences is exactly the "pseudo-sentence" defect Item 347
 *      rule 2 forbids. There is no honest v1 home for it.
 *   2. `corpus_analogies` (Item 363's comparable-regulator-decisions section)
 *      has NO key in v1 at all. v1 predates the analogies program.
 *   3. `risk_analysis` is ONE record-level five-paragraph section. v1's
 *      `risk_assessment_by_activity` is the § 7152 PER-ACTIVITY carrier.
 *      Collapsing one into the other silently changes what the § 7152 key
 *      asserts. That is a legal-meaning change, not a formatting change.
 *
 * Conversely six v1 keys have NO prose-9 producer at all (`submission_summary`,
 * `strengthen_items`, `exception_analysis`, `information_needed`,
 * `next_steps`, `processing_narrative`). A prose-9-only payload would be a
 * REGRESSION against the live surface contract.
 *
 * THEREFORE the v2 contract is ADDITIVE, not a replacement:
 *
 *   v2 payload = v1 payload (assembler-produced, unchanged, still complete)
 *              + `prose_document` envelope carrying the nine rendered sections
 *                verbatim, with their spans, degradation flags and titles
 *              + per-key OVERLAY of the five sections that DO map 1:1
 *
 * This keeps every downstream consumer that only knows v1 working (they see a
 * complete v1 payload and ignore an unknown key), while giving the PDF
 * exporter and the viewer a lossless, order-preserving prose-9 document to
 * render when the envelope is present. The live path never sets
 * `prose_document`, so live output is byte-for-byte unaffected.
 *
 * NOTE ON THE R6 DEFECT CLASS: the envelope is a SINGLE discriminator
 * (`prose_document.version`) consumed by BOTH the exporter and the viewer,
 * mirrored in src/lib/cppa-risk-shape.ts. Neither side may branch on anything
 * else.
 */

export const CPPA_RISK_PROSE9_SHAPE_VERSION = "cppa-risk-shape@2026-08-02-item369-prose9";

/** Mapping disposition for each v1 contract key. */
export type Prose9Disposition =
  /** (a) replaced verbatim by one prose-9 section's rendered text */
  | "replaced"
  /** (b) derived from prose-9 content, but NOT a faithful substitution */
  | "derived_lossy"
  /** (c) no honest mapping — the prose-9 section has no v1 home */
  | "no_mapping"
  /** v1 key with no prose-9 producer — carried over from the assembler */
  | "carried_over";

export interface Prose9MappingEntry {
  readonly contract_key: string | null;
  readonly prose9_section: string | null;
  readonly disposition: Prose9Disposition;
  readonly note: string;
}

/** THE mapping table. Reviewed content of the Phase-1 decision. */
export const CPPA_RISK_PROSE9_MAPPING: readonly Prose9MappingEntry[] = [
  {
    contract_key: "opening_summary",
    prose9_section: "executive_lead",
    disposition: "replaced",
    note: "Both are the document's opening determination sentence. 1:1.",
  },
  {
    contract_key: "executive_summary",
    prose9_section: "determination",
    disposition: "replaced",
    note: "Item 363 gives the holding one home: the Determination section.",
  },
  {
    contract_key: "assessment_summary",
    prose9_section: "general_conclusions",
    disposition: "replaced",
    note: "Overlaid onto .narrative only; literal fields keep assembler values.",
  },
  {
    contract_key: "scope_and_triggers",
    prose9_section: "why_required",
    disposition: "replaced",
    note: "Statute-first scope/trigger prose. Emitted as a one-element block list.",
  },
  {
    contract_key: "record_sufficiency",
    prose9_section: "record_completeness_summary",
    disposition: "replaced",
    note: "Both answer § 7152(a) completeness. 1:1.",
  },
  {
    contract_key: "priority_actions",
    prose9_section: "what_to_do_next",
    disposition: "derived_lossy",
    note:
      "v1 expects an ORDERED ACTION LIST; prose-9 emits one continuous section. " +
      "Overlay is prose, so ordinal priority is no longer machine-readable.",
  },
  {
    contract_key: "risk_assessment_by_activity",
    prose9_section: "risk_analysis",
    disposition: "derived_lossy",
    note:
      "v1 key is the § 7152 PER-ACTIVITY carrier; prose-9 risk_analysis is " +
      "record-level. NOT overlaid — the assembler value is retained and the " +
      "prose-9 text ships only inside the envelope.",
  },
  {
    contract_key: "processing_narrative",
    prose9_section: "record_card",
    disposition: "no_mapping",
    note:
      "record_card is labelled data (label/value lines), not prose. " +
      "Rendering it as sentences is the Item 347 rule-2 defect. Envelope only.",
  },
  {
    contract_key: null,
    prose9_section: "corpus_analogies",
    disposition: "no_mapping",
    note: "No v1 key exists for comparable regulator decisions. Envelope only.",
  },
  { contract_key: "submission_summary", prose9_section: null, disposition: "carried_over", note: "No prose-9 producer." },
  { contract_key: "next_steps", prose9_section: null, disposition: "carried_over", note: "No prose-9 producer." },
  { contract_key: "strengthen_items", prose9_section: null, disposition: "carried_over", note: "No prose-9 producer." },
  { contract_key: "exception_analysis", prose9_section: null, disposition: "carried_over", note: "No prose-9 producer." },
  { contract_key: "information_needed", prose9_section: null, disposition: "carried_over", note: "No prose-9 producer." },
];

/** Contract keys the overlay is permitted to write. Nothing else. */
export const PROSE9_OVERLAY_KEYS: readonly string[] = CPPA_RISK_PROSE9_MAPPING
  .filter((m) => m.disposition === "replaced" || m.contract_key === "priority_actions")
  .map((m) => m.contract_key!)
  .filter(Boolean);

// ---------------------------------------------------------------------------
// The envelope
// ---------------------------------------------------------------------------

export interface Prose9Span {
  readonly start: number;
  readonly end: number;
  readonly source_path?: string;
  readonly value?: string;
}

export interface Prose9Section {
  readonly section_id: string;
  readonly title: string;
  readonly text: string;
  readonly degraded: boolean;
  readonly determination_status: string;
  readonly record_card: readonly { label: string; value: string }[];
  readonly spans: readonly Prose9Span[];
}

export interface ProseDocumentEnvelope {
  readonly version: typeof CPPA_RISK_PROSE9_SHAPE_VERSION;
  readonly product: "cppa-risk";
  readonly plan_version: string;
  readonly frame_set_version: string;
  readonly compose_version: string;
  readonly sections: readonly Prose9Section[];
  readonly omitted_frames: readonly string[];
  readonly span_count: number;
}

/** True when a payload carries an Item-369 prose-9 document. THE discriminator. */
// deno-lint-ignore no-explicit-any
export function hasProse9Document(report: any): boolean {
  const d = report?.prose_document;
  return !!d && typeof d === "object" && d.version === CPPA_RISK_PROSE9_SHAPE_VERSION &&
    Array.isArray(d.sections) && d.sections.length > 0;
}

/**
 * Apply the Phase-1 mapping. Mutates nothing: returns a new payload equal to
 * `base` plus the envelope plus the permitted overlays.
 */
export function applyProse9Mapping(
  base: Record<string, unknown>,
  envelope: ProseDocumentEnvelope,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  const byId = new Map(envelope.sections.map((s) => [s.section_id, s]));
  const textOf = (id: string): string | null => {
    const t = byId.get(id)?.text?.trim();
    return t ? t : null;
  };

  const opening = textOf("executive_lead");
  if (opening) out.opening_summary = opening;

  const determination = textOf("determination");
  if (determination) out.executive_summary = determination;

  const general = textOf("general_conclusions");
  if (general) {
    const prev = (out.assessment_summary && typeof out.assessment_summary === "object" &&
        !Array.isArray(out.assessment_summary))
      ? out.assessment_summary as Record<string, unknown>
      : {};
    out.assessment_summary = { ...prev, narrative: general };
  }

  const why = textOf("why_required");
  if (why) out.scope_and_triggers = [why];

  const completeness = textOf("record_completeness_summary");
  if (completeness) out.record_sufficiency = [completeness];

  const next = textOf("what_to_do_next");
  if (next) out.priority_actions = [next];

  // risk_assessment_by_activity, processing_narrative and corpus_analogies are
  // DELIBERATELY NOT overlaid — see the mapping table.
  out.prose_document = envelope;
  out.prose_shape_version = CPPA_RISK_PROSE9_SHAPE_VERSION;
  return out;
}
