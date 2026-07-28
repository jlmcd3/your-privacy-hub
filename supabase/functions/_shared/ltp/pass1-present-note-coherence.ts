/**
 * ITEM 242 CP-C (wiring) — Pass-1 present/note coherence validator.
 *
 * Deterministic post-injection screen. Rewrites factor rows whose
 * `present_in_intake=true` weight_note names ONLY evidence that
 * contradicts the field-semantics glossary for the row's driving
 * intake field. Rewrites are RECORDED under a dedicated telemetry
 * key `pass1_coherence_rewrites[]` — this is NOT a write-around and
 * MUST NOT overload `wa_origin` (controller correction, CP-C §ii).
 *
 * Pattern registry uses the CANONICAL contract field ids verified
 * against `_shared/intake-contracts/cppa-risk-assessment.ts`:
 *   • q18b_admt_training           (NOT q18b_admt_trains_on_pi)
 *   • i7_external_consultees        (NOT i7_external_consultation)
 *   • i7_internal_contributors
 *   • q15_sensitive_pi / q15c_spi_volume  (NOT q5b_sensitive_categories)
 *   • i1_processing_purpose
 *
 * The screen is fail-open by design: unrecognized rows/fields pass through.
 */
import type { FactorTableEntry, RenderPlan } from "../render-plan/schema.ts";

export const PASS1_COHERENCE_VERSION = "pass1-present-note-coherence@2026-07-28-item243-present-requires-refs";

export interface CoherenceRewrite {
  readonly factor_id: string;
  readonly field_id: string;
  readonly reason: string;
  readonly original_note: string;
}

interface Pattern {
  readonly field_id: string;
  readonly hit: RegExp;
  /** Optional exculpation — if any of these tokens appears the row is coherent. */
  readonly exculpates?: readonly RegExp[];
  readonly reason: string;
  /** Which factor_id patterns this rule applies to (test against factor_id). */
  readonly appliesTo: RegExp;
}

const PATTERNS: readonly Pattern[] = [
  {
    field_id: "q18b_admt_training",
    hit: /\b(employee|staff|workforce|personnel)\s+training\b/i,
    reason: "weight_note conflates ADMT-training-on-PI with an employee training program",
    appliesTo: /(admt|training)/i,
  },
  {
    field_id: "i7_external_consultees",
    hit: /\b(internal|in[-\s]house|staff|employees?|team)\s+(contributors?|stakeholders?|members?)\b/i,
    exculpates: [/\bexternal\b/i, /\bthird[-\s]party\b/i, /\bconsumer/i, /\badvocate/i, /\bregulator/i],
    reason: "weight_note names only internal contributors as evidence of external consultation",
    appliesTo: /(external_consult|external_stakeholder|consultation)/i,
  },
  {
    field_id: "q15c_spi_volume",
    hit: /\b(general\s+financial|general\s+employment)\s+information\b/i,
    exculpates: [/§\s*7001\(bbb\)/i, /\bprecise geolocation\b/i, /\bracial or ethnic origin\b/i],
    reason: "weight_note names general financial/employment information as § 7001(bbb) SPI",
    appliesTo: /(sensitive|spi)/i,
  },
  {
    field_id: "i1_processing_purpose",
    hit: /\b(to improve our services|for security purposes|business purposes)\b/i,
    reason: "weight_note relies solely on a generic purpose formulation",
    appliesTo: /(purpose|benefit)/i,
  },
];

/**
 * Screen and rewrite. Pure function — returns a new factor_table and a
 * list of rewrites. Never throws.
 */
export function screenPresentNoteCoherence(
  factor_table: readonly FactorTableEntry[],
): { factor_table: FactorTableEntry[]; rewrites: CoherenceRewrite[] } {
  const rewrites: CoherenceRewrite[] = [];
  const out: FactorTableEntry[] = factor_table.map((row) => {
    if (!row.present_in_intake) return row;
    // ITEM 243 defect 3 — PRESENT-REQUIRES-REFS. A factor row marked
    // present_in_intake=true with an empty intake_ledger_refs array has
    // no record substantiation and is deterministically rewritten to
    // absent with the canonical no-evidence weight_note. Runs BEFORE
    // the glossary patterns so downstream screens see a coherent row.
    if (!row.intake_ledger_refs || row.intake_ledger_refs.length === 0) {
      rewrites.push({
        factor_id: row.factor_id,
        field_id: "(intake_ledger_refs)",
        reason: "present_in_intake=true with empty intake_ledger_refs — no record substantiation",
        original_note: (row.weight_note ?? "").toString().slice(0, 200),
      });
      return { ...row, present_in_intake: false, weight_note: "no record evidence" } as FactorTableEntry;
    }
    const note = (row.weight_note ?? "").toString();
    if (!note) return row;
    for (const p of PATTERNS) {
      if (!p.appliesTo.test(row.factor_id)) continue;
      if (!p.hit.test(note)) continue;
      const exculpated = (p.exculpates ?? []).some((r) => r.test(note));
      if (exculpated) continue;
      rewrites.push({
        factor_id: row.factor_id,
        field_id: p.field_id,
        reason: p.reason,
        original_note: note.slice(0, 200),
      });
      return { ...row, present_in_intake: false, weight_note: "no record evidence" } as FactorTableEntry;
    }
    return row;
  });
  return { factor_table: out, rewrites };
}


/** Convenience: screen a whole plan and return a new plan + rewrites. */
export function applyCoherenceScreen(plan: RenderPlan): { plan: RenderPlan; rewrites: CoherenceRewrite[] } {
  const { factor_table, rewrites } = screenPresentNoteCoherence(plan.factor_table);
  return { plan: { ...plan, factor_table }, rewrites };
}
