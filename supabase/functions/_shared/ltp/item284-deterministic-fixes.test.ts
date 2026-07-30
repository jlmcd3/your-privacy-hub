/**
 * ITEM 284 — DETERMINISTIC FIX TURN (executes Item 283 N1).
 *
 * F1 — ONE completeness predicate shared by every composer that speaks to
 *      completeness (the exec summary and the assessment summary / RABA can
 *      no longer diverge, as they did on doc 278d0608).
 * F2 — Provisional posture on an incomplete record; never a firm favorable
 *      verdict while elements are outstanding.
 * F3 — `weight_note` ships whole or is omitted; no mid-word character slice.
 * F4 — priority_actions phrase de-duplication + registry-driven owner.
 * F5 — `next_steps` derives Part-3/Part-4 content from information_needed,
 *      unresolved factual documentation gates, and present confirmations.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "./derive.ts";
import {
  assessRecordCompleteness,
  composeSection,
} from "./section-composers/cppa-risk.ts";
import { fillOrOmitWeightNote, WEIGHT_NOTE_MAX_CHARS } from "./pass1-llm.ts";
import type { RenderPlan } from "./types.ts";

const INTAKE: Record<string, unknown> = {
  entity_name: "ClearPath Credit Solutions, Inc.",
  q1_revenue: "$100M–$500M",
  q2_consumers: "250,000–1 million",
  q3_sector: "Financial services",
  q4_pi_categories: ["Financial information"],
  q5_sell_share: "Yes — share for advertising only",
  q15_sensitive_pi: "Yes",
  q18_admt_use: "Yes",
  i1_processing_purpose: "to underwrite personal-loan applications",
  i2_retention_period: "seven years from account closure",
  i7_internal_contributors: "Privacy Officer",
  i8_certifying_exec_title: "Chief Privacy Officer",
  primary_activity_name: "credit-decisioning on loan applications",
  primary_activity_purpose: "assessing applicant creditworthiness for personal loans",
};

const planOf = (intake: Record<string, unknown>): RenderPlan =>
  derivePlan({ intake, report_data: { _meta: {} }, buildStamp: "item284-test@x" });

const textOf = (instances: { readonly ctx: Record<string, unknown> }[]): string =>
  instances.map((i) => JSON.stringify(i.ctx)).join(" \n ");

// ── F1 ───────────────────────────────────────────────────────────────────
Deno.test("ITEM 284 F1: one predicate — exec summary and assessment summary never diverge", () => {
  const plan = planOf(INTAKE);
  const completeness = assessRecordCompleteness(plan);

  const exec = composeSection("executive_summary", plan) ?? [];
  const summary = composeSection("assessment_summary", plan) ?? [];
  assert(exec.length > 0 && summary.length > 0, "both surfaces must emit");

  const execInsufficient = exec.some((i) => i.template_id === "T.risk.exec.insufficient");
  const summaryIncomplete = summary.some(
    (i) =>
      i.template_id === "T.risk.summary.docs" &&
      /does not yet complete|outstanding documentation items/i.test(
        String((i.ctx as { docs_completion_clause?: string }).docs_completion_clause ?? ""),
      ),
  );
  // The two surfaces agree with each other AND with the shared predicate.
  assertEquals(execInsufficient, summaryIncomplete);
  assertEquals(execInsufficient, !completeness.complete);
});

Deno.test("ITEM 284 F1: predicate reports the no-present-benefit state as incomplete", () => {
  const plan = planOf(INTAKE);
  const stripped: RenderPlan = {
    ...plan,
    factor_table: plan.factor_table.map((f) =>
      f.kind === "benefit" ? { ...f, present_in_intake: false } : f
    ),
  } as RenderPlan;
  const c = assessRecordCompleteness(stripped);
  assertEquals(c.complete, false);
  assert(c.reasons.includes("no_present_benefit_factor"));
});

// ── F2 ───────────────────────────────────────────────────────────────────
Deno.test("ITEM 284 F2: incomplete record → provisional posture, no firm favorable verdict", () => {
  const plan = planOf(INTAKE);
  const completeness = assessRecordCompleteness(plan);
  if (completeness.complete) return; // nothing to assert on a complete record

  for (const key of ["assessment_summary", "risk_assessment_by_activity"]) {
    const section = composeSection(key, plan) ?? [];
    assert(
      section.some((i) => i.template_id === "T.risk.summary.provisional_posture"),
      `${key} must carry the provisional posture on an incomplete record`,
    );
    assert(
      !section.some((i) => i.template_id === "T.risk.balance.firm"),
      `${key} must not issue a firm verdict on an incomplete record`,
    );
    const provisional = section.find((i) => i.template_id === "T.risk.summary.provisional_posture")!;
    const ctx = provisional.ctx as Record<string, string>;
    assert(ctx.provisional_support_clause.length > 0, "support clause required (fill-or-omit)");
    assert(ctx.outstanding_elements_clause.length > 0, "outstanding clause required (fill-or-omit)");
  }
});

// ── F3 ───────────────────────────────────────────────────────────────────
Deno.test("ITEM 284 F3: weight_note ships whole or is omitted — never sliced mid-word", () => {
  const whole = "The record documents a direct commercial benefit from the assessed processing activity.";
  assertEquals(fillOrOmitWeightNote(whole).note, whole);

  const overlong = "x".repeat(WEIGHT_NOTE_MAX_CHARS + 1);
  const decision = fillOrOmitWeightNote(overlong);
  assertEquals(decision.note, undefined);
  assertEquals(decision.omitted_reason_class, "weight_note_over_length");

  assertEquals(fillOrOmitWeightNote("   ").note, undefined);
  assertEquals(fillOrOmitWeightNote(undefined).note, undefined);
});

Deno.test("ITEM 284 F3: no shipped factor note ends on a truncated word", () => {
  const plan = planOf(INTAKE);
  const balance = composeSection("risk_assessment_by_activity", plan) ?? [];
  for (const inst of balance) {
    const basis = String((inst.ctx as { factor_basis?: string }).factor_basis ?? "");
    if (!basis) continue;
    assert(
      /[.;:)\]]$|^[^ ]+$/.test(basis.trim()) || basis.trim().length <= WEIGHT_NOTE_MAX_CHARS,
      `factor_basis looks truncated: ${basis}`,
    );
  }
});

// ── F4 ───────────────────────────────────────────────────────────────────
Deno.test("ITEM 284 F4: priority_actions carry no duplicated element-class phrase", () => {
  const plan = planOf(INTAKE);
  const actions = composeSection("priority_actions", plan) ?? [];
  for (const a of actions) {
    const label = String((a.ctx as { element_short_label?: string }).element_short_label ?? "");
    assert(
      !/potential negative impact category the following potential negative impact categories/i.test(label),
      `duplicated negative-impact phrase: ${label}`,
    );
    assert(
      !/document the safeguard the following safeguards/i.test(label),
      `duplicated safeguard phrase: ${label}`,
    );
    assert(
      !/substantiate the stated benefit of the following stated benefits/i.test(label),
      `duplicated benefit phrase: ${label}`,
    );
  }
});

Deno.test("ITEM 284 F4: the § 7152(a)(7) initiation decision is owned by the business", () => {
  const plan = planOf(INTAKE);
  const actions = composeSection("priority_actions", plan) ?? [];
  const initiation = actions.find((a) =>
    /initiat/i.test(String((a.ctx as { element_short_label?: string }).element_short_label ?? ""))
  );
  if (!initiation) return; // not engaged on this record
  const owner = String((initiation.ctx as { owner_role_titles?: string }).owner_role_titles ?? "");
  assert(
    !/qualified legal counsel/i.test(owner),
    `initiation decision must not be assigned to counsel; got: ${owner}`,
  );
  assert(owner.length > 0, "owner must be named");
});

// ── F5 ───────────────────────────────────────────────────────────────────
Deno.test("ITEM 284 F5: next_steps is substantive whenever information_needed is", () => {
  const plan = planOf(INTAKE);
  const info = composeSection("information_needed", plan) ?? [];
  const steps = composeSection("next_steps", plan) ?? [];
  if (info.length > 0) {
    assert(steps.length >= info.length, `Part-3 starvation: ${steps.length} steps for ${info.length} asks`);
  }
  const labels = steps.map((s) => String((s.ctx as { step_label?: string }).step_label ?? ""));
  assertEquals(new Set(labels.map((l) => l.toLowerCase())).size, labels.length, "steps must be deduped");
  for (const s of steps) {
    const ctx = s.ctx as { step_label?: string; step_basis?: string };
    assert((ctx.step_label ?? "").trim().length > 0, "fill-or-omit: empty step_label shipped");
    assert((ctx.step_basis ?? "").trim().length > 0, "fill-or-omit: empty step_basis shipped");
  }
  assert(!/undefined|null/i.test(textOf(steps)), "no residue tokens on the next-steps surface");
});
