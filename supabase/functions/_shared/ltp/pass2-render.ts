/**
 * LTP Pass-2 Renderer (Wave-B enforcement mode).
 *
 * Substitutes {{cite:PINPOINT}}, {{plan:SLOT}}, and {{intake:LEDGER_ID}}
 * tokens into a Pass-2 template using: (a) plan.citation_bindings for
 * citation slots, (b) resolveSlot for plan slots, (c) plan.intake_ledger
 * for intake slots. Applies post-render assertions: no forbidden tokens,
 * no bare § from the substitution engine, max_chars respected.
 *
 * Pure; never throws (returns { text: "", errors: [...] } on failure).
 */
import type { RenderPlan } from "../render-plan/schema.ts";
import {
  PASS2_TEMPLATES,
  PASS2_FORBIDDEN_TOKENS,
  FIRM_VARIANT_CLOSENESS_MAX,
  type Pass2Template,
} from "./content/pass2-templates.ts";
import { resolveSlot, type SlotContext } from "./slot-resolver.ts";

export const PASS2_RENDER_VERSION = "ltp-pass2-render-2026-07-28-item235-fill-or-omit";

/**
 * ITEM 235 (T-M9.5) — FILL-OR-OMIT AT RENDER.
 *
 * Enforce the Item 206 law at the slot level: a template INSTANCE whose
 * required plan_slots resolve empty is OMITTED — never shipped with
 * blank interpolations. This eliminates the run #169 class where
 * "For ___, the benefits identified outweigh…" and
 * "— Deadline basis: ___ (11 CCR § 7150(b)(1))" reached the customer
 * surface. Required-slot set below is closed; extend by evidence only.
 *
 * A template with no entry defaults to "all plan_slots required".
 */
export const REQUIRED_PLAN_SLOTS: Readonly<Record<string, readonly string[]>> = {
  // Exec / summary openings — activity_count_phrase drives the sentence.
  "T.risk.exec.firm": ["activity_count_phrase", "each_or_this_clause"],
  "T.risk.exec.hedged": ["activity_count_phrase", "close_list", "what_would_tip_it"],
  "T.risk.exec.negative": ["activity_count_phrase", "negative_list"],
  "T.risk.exec.insufficient": ["activity_singplural_clause"],
  "T.risk.summary.opening.all_firm": ["activity_count_phrase", "each_or_this_clause"],
  "T.risk.summary.opening.mixed_hedged": ["activity_count_phrase", "firm_positive_list", "close_list"],
  "T.risk.summary.opening.any_negative": ["activity_count_phrase", "negative_list"],
  "T.risk.summary.opening.insufficient": ["activity_count_phrase", "activity_singplural_clause"],
  "T.risk.summary.activity_line": ["activity_label", "outcome_clause"],
  "T.risk.summary.docs": ["docs_completion_clause"],
  "T.risk.summary.aggregation_note": ["driving_activity_label"],
  // Per-item shards.
  "T.risk.priority_action": ["action_label", "action_basis", "deadline_basis"],
  "T.risk.next_step": ["step_label", "step_basis"],
  "T.risk.record_sufficiency.item": ["element_label", "element_status_clause"],
  "T.risk.review_items.entry": ["review_label", "review_basis"],
  "T.risk.balance.factor_line": ["factor_label", "factor_basis"],
  // Documentation.
  "T.risk.documentation.present": ["doc_element_label"],
  "T.risk.documentation.gap": ["doc_element_label", "customer_question"],
  // Balance sentences — need SOME summary tokens.
  "T.risk.balance.firm": ["benefit_summary_tokens", "negative_summary_tokens", "balance_direction_clause"],
  "T.risk.balance.hedged": ["benefit_summary_tokens", "negative_summary_tokens", "tipping_factors"],
};

/** Interpolation-residue regexes: catch blank template artifacts that
 *  slip past renderer omission (defense-in-depth for value-screen). */
export const INTERPOLATION_RESIDUE_PATTERNS: readonly RegExp[] = [
  / For , /,               // "For {{empty}}, ..."
  /: {2,}\(/,              // "Deadline basis:  ("
  /— {2,}/,                // dangling em-dash
  /: \./,                  // "Label: ."
  / \(\)/,                 // stray empty parens
];

// PRE-WAVED-EMITTER-FIXES-2026-07-27 (class 6, adjudication):
// Structured slots (owner, deadline_basis, exceptions_status,
// triggered_activities[]) must NEVER carry a sliced fragment such as
// bare "We" or a placeholder literal from pass2-templates.ts. Atomic-
// token law is extended to these slots: verbatim-complete or omit.
export const STRUCTURED_SLOT_MIN_CHARS = 8;
export const STRUCTURED_SLOT_FORBIDDEN_FRAGMENTS: readonly string[] = [
  "^We$", "^We\\.$", "^The$", "^A$", "^An$",
  "\\{\\{intake:", "\\{\\{plan:", "\\{\\{cite:",
];
export function assertStructuredSlotShape(
  slotName: string,
  value: unknown,
): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length === 0) return null; // omission is allowed
  if (v.length < STRUCTURED_SLOT_MIN_CHARS) {
    return `structured_slot_fragment:${slotName}:len=${v.length}`;
  }
  for (const re of STRUCTURED_SLOT_FORBIDDEN_FRAGMENTS) {
    if (new RegExp(re).test(v)) return `structured_slot_forbidden:${slotName}:${re}`;
  }
  return null;
}
const _PASS2_RENDER_VERSION_UNUSED = "ltp-pass2-render-2026-07-26";

export interface RenderResult {
  readonly template_id: string;
  readonly text: string;
  readonly errors: readonly string[];
  readonly slots_resolved: number;
  readonly slots_missing: number;
}

function substituteCitations(
  text: string,
  plan: RenderPlan,
  citation_slots: readonly string[],
  errors: string[],
): string {
  let out = text;
  for (const slot of citation_slots) {
    const token = `{{cite:${slot}}}`;
    // Resolve by pinpoint_ref suffix match (SLOT is a symbolic id like
    // PINPOINT_7152A5; the citation_bindings pinpoint_ref carries the
    // conclusion id — a downstream courier binds these formally.
    const found = plan.citation_bindings.find((b) =>
      b.pinpoint_ref.toUpperCase().includes(slot.replace(/^PINPOINT_?/, ""))
    ) ?? plan.citation_bindings[0];
    if (!found) {
      errors.push(`missing_citation:${slot}`);
      out = out.replaceAll(token, "");
    } else {
      out = out.replaceAll(token, found.pinpoint);
    }
  }
  return out;
}

function substituteIntake(
  text: string,
  plan: RenderPlan,
  intake_slots: readonly string[],
  errors: string[],
): string {
  let out = text;
  for (const slot of intake_slots) {
    const token = `{{intake:${slot}}}`;
    const found = plan.intake_ledger.find((l) => l.ledger_id === slot || l.intake_field === slot)
      ?? plan.intake_ledger[0];
    if (!found) {
      errors.push(`missing_intake:${slot}`);
      out = out.replaceAll(token, "");
    } else {
      out = out.replaceAll(token, found.display);
    }
  }
  return out;
}

function substitutePlanSlots(
  text: string,
  plan: RenderPlan,
  slots: readonly string[],
  ctx: SlotContext,
  errors: string[],
): { text: string; resolved: number; missing: number; empty_slots: string[] } {
  let out = text;
  let resolved = 0;
  let missing = 0;
  const empty_slots: string[] = [];
  for (const slot of slots) {
    const token = `{{plan:${slot}}}`;
    const value = resolveSlot(plan, slot, ctx);
    if (value === "" || value === "no items on the record") {
      missing++;
      empty_slots.push(slot);
    } else {
      resolved++;
    }
    out = out.replaceAll(token, value);
  }
  return { text: out, resolved, missing, empty_slots };
}

function checkForbiddenTokens(text: string, errors: string[]): void {
  for (const t of PASS2_FORBIDDEN_TOKENS) {
    if (text.includes(t)) errors.push(`forbidden_token:${t}`);
  }
}

/** ITEM 235 — check post-render text for interpolation residue. */
function hasInterpolationResidue(text: string): string | null {
  for (const re of INTERPOLATION_RESIDUE_PATTERNS) {
    if (re.test(text)) return re.toString();
  }
  return null;
}

export interface RenderOptions {
  /**
   * ITEM 235 — Fill-or-omit at render (DEFAULT true).
   * When any REQUIRED plan_slot for the template resolves empty, the
   * instance returns `text=""` and `omitted=true`. Callers treat empty
   * text as no emission. Set false only for legacy tests that rely on
   * partial rendering.
   */
  readonly fillOrOmit?: boolean;
}

export function renderTemplate(
  templateId: string,
  plan: RenderPlan,
  ctx: SlotContext = {},
  opts: RenderOptions = {},
): RenderResult & { omitted?: boolean; omit_reason?: string } {
  const fillOrOmit = opts.fillOrOmit !== false;
  const tpl: Pass2Template | undefined = PASS2_TEMPLATES[templateId];
  if (!tpl) {
    return { template_id: templateId, text: "", errors: [`unknown_template:${templateId}`], slots_resolved: 0, slots_missing: 0 };
  }
  if (tpl.emits_nothing) {
    return { template_id: templateId, text: "", errors: [], slots_resolved: 0, slots_missing: 0 };
  }
  const errors: string[] = [];
  let text = tpl.text;
  checkForbiddenTokens(text, errors);
  text = substituteCitations(text, plan, tpl.citation_slots, errors);
  text = substituteIntake(text, plan, tpl.intake_slots, errors);
  const planSub = substitutePlanSlots(text, plan, tpl.plan_slots, ctx, errors);
  text = planSub.text;

  // ITEM 235 — required-slot check. Default set = all plan_slots on the
  // template; override via REQUIRED_PLAN_SLOTS.
  const required = REQUIRED_PLAN_SLOTS[templateId] ?? tpl.plan_slots;
  const emptyRequired = planSub.empty_slots.filter((s) => required.includes(s));
  if (fillOrOmit && emptyRequired.length > 0) {
    errors.push(`omit_empty_required_slots:${emptyRequired.join(",")}`);
    return {
      template_id: templateId,
      text: "",
      errors,
      slots_resolved: planSub.resolved,
      slots_missing: planSub.missing,
      omitted: true,
      omit_reason: "required_slot_empty",
    };
  }

  // ITEM 235 — interpolation-residue defense-in-depth (catches templates
  // that don't declare a slot as required but still assemble to blanks).
  const residue = hasInterpolationResidue(text);
  if (fillOrOmit && residue) {
    errors.push(`omit_interpolation_residue:${residue}`);
    return {
      template_id: templateId,
      text: "",
      errors,
      slots_resolved: planSub.resolved,
      slots_missing: planSub.missing,
      omitted: true,
      omit_reason: "interpolation_residue",
    };
  }

  if (text.length > tpl.max_chars) errors.push(`over_max_chars:${text.length}/${tpl.max_chars}`);
  if (/\{\{[a-z]+:[A-Z0-9_]+\}\}/i.test(text)) errors.push("leaked_slot_marker");
  return {
    template_id: templateId,
    text,
    errors,
    slots_resolved: planSub.resolved,
    slots_missing: planSub.missing,
  };
}

/**
 * Firm/hedged calibration assert: when closeness ≥ FIRM_VARIANT_CLOSENESS_MAX,
 * the "firm" variant must NOT be selected. Callers pass the chosen template id
 * for the balance slot; returns null on OK, error string on violation.
 */
export function assertCalibrationMatch(
  chosenTemplateId: string,
  closeness: number,
): string | null {
  if (chosenTemplateId === "T.risk.balance.firm" && closeness >= FIRM_VARIANT_CLOSENESS_MAX) {
    return `calibration_violation:firm_variant_used_at_closeness_${closeness}`;
  }
  return null;
}
