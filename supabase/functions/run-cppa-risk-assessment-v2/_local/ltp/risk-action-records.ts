/**
 * ITEM 421 — TYPING PROGRAM, STEP 2: THE RISK PRIORITY-ACTION WRITER.
 *
 * The composer no longer pre-composes a headline string. It emits the
 * canonical ACTION RECORD (`_shared/report-contracts/action-record.ts`) with
 * ONE HOME PER FACT:
 *
 *   • the statutory pinpoint  → `statutory_basis` ONLY
 *   • the owner               → `owner_role` ONLY
 *   • the reserved holder     → `reserved_to` ONLY
 *   • the deadline + basis    → `deadline` / `deadline_basis` ONLY
 *
 * The headline is NOT stored: renderers compose it with
 * `formatActionHeadline`. With one home per fact, the item399 FIX-2 defect
 * class (a pinpoint printed twice, or a headline role that disagrees with the
 * body role) cannot be REPRESENTED, let alone shipped.
 */
import type { ActionRecord } from "../../../_shared/report-contracts/action-record.ts";
import type { DeadlineRow } from "../legal-test/cppa-risk-deadlines.ts";

export const RISK_ACTION_RECORD_WRITER_VERSION = "risk-action-records@item421-2026-08-09";

/** Escape a pinpoint for literal use inside a RegExp. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ONE PINPOINT PER ACTION. The first occurrence stays where the prose put it;
 * every later occurrence of the SAME pinpoint becomes "that provision".
 */
export function dedupePinpoint(text: string, pinpoint: string): string {
  const pin = String(pinpoint ?? "").trim();
  const t = String(text ?? "");
  if (!pin || pin.startsWith("(")) return t;
  const re = new RegExp(esc(pin), "g");
  let seen = false;
  return t.replace(re, () => {
    if (!seen) {
      seen = true;
      return pin;
    }
    return "that provision";
  });
}

/** "Ongoing — 2027-12-31 (§ 7155(b))" → "Ongoing — 2027-12-31". */
export function deadlineFields(row: DeadlineRow): { deadline: string; deadline_basis?: string } {
  const label = String(row?.deadline_label ?? "").trim();
  const basis = String(row?.anchor_pinpoint ?? "").trim();
  // Trailing statutory parenthetical, tolerant of nested parens ("(11 CCR § 7155(b))").
  const stripped = label.replace(/\s*\((?:[^()]|\([^()]*\))*§(?:[^()]|\([^()]*\))*\)\s*$/, "").trim();
  return {
    deadline: stripped || label,
    deadline_basis: basis && !basis.startsWith("(") ? basis : undefined,
  };
}

export interface RiskActionRecordInput {
  /** Headline label as composed by the KIND opener / reserved register. */
  readonly headline_label: string;
  readonly entity_name: string;
  readonly customer_recorded_fact_clause: string;
  readonly gap_or_consequence_clause: string;
  readonly compliance_guidance_sentence: string;
  readonly pinpoint: string;
  /** The ONE role value; also the headline's role for reserved rows. */
  readonly owner: string;
  readonly is_reserved: boolean;
  readonly deadline_row: DeadlineRow;
  readonly rank: number;
}

function terminate(s: string): string {
  const t = String(s ?? "").trim().replace(/[;,]\s*$/, "");
  if (!t) return "";
  return /[.!?:]$/.test(t) ? t : `${t}.`;
}

/** Compose the stored record. No headline apparatus, no markdown. */
export function buildRiskActionRecord(input: RiskActionRecordInput): ActionRecord {
  const head = terminate(input.headline_label);
  const fact = String(input.customer_recorded_fact_clause ?? "").trim();
  const gap = String(input.gap_or_consequence_clause ?? "").trim();
  const guidance = terminate(input.compliance_guidance_sentence);

  const parts: string[] = [head];
  if (fact) parts.push(terminate(`On ${input.entity_name}'s record, ${fact}`));
  if (gap) parts.push(terminate(`The gap is ${gap}`));
  if (guidance) parts.push(`The regulation requires the following: ${guidance}`);

  const action = dedupePinpoint(parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), input.pinpoint);
  const { deadline, deadline_basis } = deadlineFields(input.deadline_row);

  const record: ActionRecord = {
    action,
    statutory_basis: input.pinpoint,
    deadline,
    ...(deadline_basis ? { deadline_basis } : {}),
    // ONE ROLE VALUE. Reserved rows carry it under `reserved_to`; every other
    // KIND carries it under `owner_role`. It is never written to both.
    ...(input.is_reserved ? { reserved_to: input.owner } : { owner_role: input.owner }),
    rank: input.rank,
  };
  return record;
}
