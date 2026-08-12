// PROMPT 9A (CEO-RATIFIED 2026-08-12) — compact ask labels + composition rules.
//
// The registry bytes and hash; the Britannia executive paragraph end-to-end;
// the doc-4 "Matters holding sign-off open" cell (R4 merge); the invariant that
// no full ask text renders outside the gap table; the gap table's own ask
// column byte-unchanged; and the R3 seam assertions.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeAskLabelsHash,
  DPIA_ASK_CLASSES,
  DPIA_ASK_LABELS,
  DPIA_ASK_LABELS_HASH,
  boundParenthetical,
  hasSeamDefect,
  mergeLabeledAsks,
  quotedOp,
  renderMergedLabel,
  resolveAskLabel,
  stripTerminal,
} from "../../../supabase/functions/_shared/ltp/dpia-ask-labels.ts";
import {
  buildDpiaDeliverables,
  blockerSlot,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

// ── 1. THE RATIFIED BYTES ───────────────────────────────────────────────────

const RATIFIED: Record<string, string> = {
  ask_necessity_purpose: "the specific purpose pursued by {op}, stated as an outcome",
  ask_necessity_alternatives: "the alternatives considered for {op}, each with its rejection reason",
  ask_necessity_reasons: "the rejection reason for each alternative already named",
  ask_proportionality_impact:
    "the impact of the processing on the data subjects, stated separately from the benefit",
  ask_risk_measures: "the measures applied against {risk}",
  ask_art36_description: "a description of the processing sufficient to identify the risks",
  ask_art36_open_measures: "the measures applied to the risks still open, and the effect of each",
  ask_lb_consent: "how consent is collected for this processing, and how withdrawal is offered",
  ask_lb_contract: "the contract relied on, and the data subject's status as a party to it",
  ask_lb_legal_obligation: "the specific law establishing the legal obligation, named as an instrument",
  ask_lb_vital: "the life or safety circumstance the processing protects",
  ask_lb_public_task: "the specific law laying down the public task, named as an instrument",
  ask_lb_basis_unresolved: "the Art. 6(1) basis relied on for {op}",
  ask_lb_purpose_for_test: "the specific purpose pursued by {op}, stated as an outcome",
  ask_lia_purpose: "the interest pursued by {op}, stated as an outcome",
  ask_lia_necessity:
    "each less intrusive means considered for {op}, with the reason it would not achieve the interest",
  ask_lia_balancing: "the effect of the processing on the data subjects, and the measures that reduce it",
  ask_lia_art9: "the Art. 9 condition relied on for the special-category items",
  ask_dpo: "whether a data protection officer is designated, and their contact details",
  ask_processor_contract: "a written Art. 28 contract with {name}, and the date it was signed",
  ask_art9_condition: "the Art. 9(2) condition relied on for {item}",
  ask_transfer_mechanism: "the Chapter V mechanism relied on for the transfer to {dest}",
  ask_dpa_contracts:
    "whether a written processing contract is in place with each named processor, and the date it was signed",
  ask_retention: "the retention period for {item}, and the record type it applies to",
  ask_dpbd: "the measures built into the design of this processing, and when each was implemented",
  ask_data_quality: "the measures that keep the data accurate, and how quality is checked",
  ask_art5_table: "the measures supporting each Article 5(1) principle, and whether each is deployed",
  ask_rights_table: "how each data-subject right can be exercised for this processing",
};

Deno.test("9A — all 28 registry entries are byte-exact", () => {
  assertEquals(DPIA_ASK_CLASSES.length, 28);
  assertEquals(Object.keys(RATIFIED).length, 28);
  for (const [id, bytes] of Object.entries(RATIFIED)) {
    assertEquals(DPIA_ASK_LABELS[id as keyof typeof DPIA_ASK_LABELS], bytes, id);
  }
});

Deno.test("9A — the registry hash is pinned and recomputes", async () => {
  assertEquals(await computeAskLabelsHash(), DPIA_ASK_LABELS_HASH);
});

Deno.test("9A (R2) — an operation is only ever named quoted", () => {
  assertEquals(
    resolveAskLabel("ask_lb_basis_unresolved", { op: "Workforce sentiment analytics" }),
    'the Art. 6(1) basis relied on for "Workforce sentiment analytics"',
  );
  assertEquals(quotedOp(""), "the processing");
});

// ── 2. THE BRITANNIA PARAGRAPH, END TO END ──────────────────────────────────

const BRITANNIA = {
  processing_activity_name: "Workforce sentiment analytics",
  purpose:
    "To measure workforce sentiment across the retail estate so that staffing and engagement decisions can be taken on evidence rather than anecdote.",
  data_subjects: "Employees of the retail estate",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Free-text survey responses", "Employment records"],
  legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  necessity_proportionality:
    "Sentiment analytics is necessary because no other source gives an estate-wide view; a sampled manual survey was considered and rejected because it could not produce comparable results across sites.",
  third_party_processors: ["Britannia Insight Ltd"],
  retention_period: "24 months from collection",
  existing_safeguards: ["Access controls", "Pseudonymisation of survey identifiers"],
};

Deno.test("9A — the Britannia executive paragraph renders the ratified labels", () => {
  // The Britannia shape: exactly two open points — the 6(1)(f) balancing part
  // and the Art. 28 contract ask — each rendered as its ratified compact label
  // with the existing "— which completes" suffix, bytes unchanged.
  const report = {
    risk_register: [
      { risk_label: "Loss of confidentiality", residual_band: "medium" },
      { risk_label: "Inaccurate sentiment inference", residual_band: "medium" },
    ],
    gap_ledger: [
      {
        field: "necessity_proportionality",
        dimensions:
          "For \"Workforce sentiment analytics\": the effect the processing has on the data subjects and the measures that reduce that effect, so the balancing test under Art. 6(1)(f) can be completed.",
        provision: "GDPR Art. 6(1)(f)",
        enables: 'the lawful-basis finding for "Workforce sentiment analytics"',
        ask_class: "ask_lia_balancing",
        display_label: DPIA_ASK_LABELS.ask_lia_balancing,
        scope_op: '"Workforce sentiment analytics"',
      },
      {
        field: "existing_safeguards",
        dimensions:
          "Whether a written processing contract meeting Art. 28(3) is in place with each named processor, and the date each was signed.",
        provision: "GDPR Art. 28(3)",
        enables: "the Art. 28 processing-contract determination",
        ask_class: "ask_dpa_contracts",
        display_label: DPIA_ASK_LABELS.ask_dpa_contracts,
      },
    ],
  };
  const text = skeletonDocumentToText(
    assembleDpiaSkeletonDocument(report as unknown as Record<string, unknown>, BRITANNIA).document,
  );
  assert(
    text.includes(
      'They are: the effect of the processing on the data subjects, and the measures that reduce it — which completes the lawful-basis finding for "Workforce sentiment analytics"; whether a written processing contract is in place with each named processor, and the date it was signed — which completes the Art. 28 processing-contract determination.',
    ),
    text.slice(0, 2000),
  );
});

Deno.test("9A — the built Britannia report renders labels, never full asks, in the executive list", () => {
  const report = buildDpiaDeliverables(BRITANNIA) as unknown as Record<string, unknown>;
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, BRITANNIA).document);
  const exec = text.slice(0, text.indexOf("Section 0"));
  assert(
    exec.includes(
      'the effect of the processing on the data subjects, and the measures that reduce it — which completes the lawful-basis finding for "Workforce sentiment analytics"',
    ),
    exec,
  );
});

Deno.test("9A — no full-ask text renders in composed prose; the gap table keeps every ask", () => {
  const report = buildDpiaDeliverables(BRITANNIA) as unknown as Record<string, unknown>;
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, BRITANNIA).document);
  const ledger = (report.gap_ledger ?? []) as { dimensions: string }[];
  const at = text.indexOf("Matters outstanding on the record");
  assert(at > 0, "the gap table must render");
  const gapTable = text.slice(at);
  // The composed prose surfaces: the executive body and the Section 6 cells.
  const exec = text.slice(0, text.indexOf("Section 0"));
  const decision = report.decision as { why: string; blockers: string[] };
  const composed = [exec, decision.why, ...decision.blockers].join("\n");
  for (const e of ledger) {
    assert(gapTable.includes(e.dimensions), `gap table is missing the full ask: ${e.dimensions}`);
    assert(!composed.includes(e.dimensions), `full ask leaked into composed prose: ${e.dimensions}`);
  }
});

Deno.test("9A (R1) — every ledger entry carries both forms", () => {
  const report = buildDpiaDeliverables(BRITANNIA) as unknown as Record<string, unknown>;
  const ledger = (report.gap_ledger ?? []) as { dimensions: string; display_label?: string; ask_class?: string }[];
  assert(ledger.length > 0);
  for (const e of ledger) {
    assert(e.dimensions.length > 0);
    assert((e.ask_class ?? "").length > 0, `untagged ask: ${e.dimensions}`);
    assert((e.display_label ?? "").length > 0, `unlabelled ask: ${e.dimensions}`);
  }
});

// ── 3. THE doc-4 MATTERS CELL (R4 MERGE) ────────────────────────────────────

const DOC4 = {
  ...BRITANNIA,
  processing_activity_name: "Customer churn scoring",
  purpose: "To score customers for churn risk so that retention offers can be targeted.",
  secondary_use:
    "The same scores are re-used to prioritise outbound sales calls, which is a separate operation.",
  necessity_proportionality: "",
  alternatives_considered: [],
  third_party_processors: ["Helvetia Analytics AG"],
};

Deno.test("9A (R4) — the Matters cell renders short labelled lines, merged across operations", () => {
  const report = buildDpiaDeliverables(DOC4) as unknown as Record<string, unknown>;
  const decision = report.decision as { blockers: string[] };
  assert(decision.blockers.length > 0);
  for (const b of decision.blockers) {
    // A compact label, never the full ask (asks run well past 120 characters).
    assert(b.length <= 180, `blocker is not a compact label: ${b}`);
    assert(!hasSeamDefect(b), `seam defect: ${b}`);
  }
  // Merged entries carry the ratified scope suffix, never a repeated line.
  assertEquals(new Set(decision.blockers).size, decision.blockers.length);
});

Deno.test("9A (R4) — merge suffixes are the ratified bytes", () => {
  const two = mergeLabeledAsks([
    { ask_class: "ask_proportionality_impact", label: DPIA_ASK_LABELS.ask_proportionality_impact, scope_op: '"A"' },
    { ask_class: "ask_proportionality_impact", label: DPIA_ASK_LABELS.ask_proportionality_impact, scope_op: '"B"' },
  ]);
  assertEquals(two.length, 1);
  assertEquals(
    renderMergedLabel(two[0]),
    `${DPIA_ASK_LABELS.ask_proportionality_impact} — for both the primary and the secondary use`,
  );

  const three = mergeLabeledAsks(
    ['"A"', '"B"', '"C"'].map((op) => ({
      ask_class: "ask_proportionality_impact",
      label: DPIA_ASK_LABELS.ask_proportionality_impact,
      scope_op: op,
    })),
  );
  assertEquals(
    renderMergedLabel(three[0]),
    `${DPIA_ASK_LABELS.ask_proportionality_impact} — across all three operations named in this assessment`,
  );
});

// ── 4. SEAM RULES (R3) ──────────────────────────────────────────────────────

Deno.test("9A (R3) — terminal punctuation is stripped and no doubled stop is produced", () => {
  assertEquals(stripTerminal("the measures applied against Data loss."), "the measures applied against Data loss");
  const slot = blockerSlot([
    "the measures applied against Data loss.",
    "the Art. 9(2) condition relied on for health data;",
  ]);
  assertEquals(
    slot,
    "the measures applied against Data loss; the Art. 9(2) condition relied on for health data.",
  );
  assert(!hasSeamDefect(slot), slot);
});

Deno.test("9A (R3) — a parenthetical splice is bounded to 12 words at a word boundary", () => {
  const long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen";
  assertEquals(boundParenthetical(long), "one two three four five six seven eight nine ten eleven twelve…");
  assertEquals(boundParenthetical("short enough"), "short enough");
});

Deno.test("9A (R3) — the Britannia and doc-4 shapes carry no seam defect", () => {
  for (const intake of [BRITANNIA, DOC4]) {
    const report = buildDpiaDeliverables(intake) as unknown as Record<string, unknown>;
    const why = (report.decision as { why: string }).why;
    assert(!hasSeamDefect(why), why);
  }
});
