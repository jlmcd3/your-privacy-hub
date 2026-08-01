/**
 * ITEM 320 (PRIMARY ACTIVITY FEATURE, PROMPT B) — PROCESSING-NARRATIVE
 * EMPTY-RENDER LOCK.
 *
 * Root cause pinned here: the Item 244 (L1/L3/L5) and (E1 v2) slots were
 * declared on `SlotContext` but had no case in `resolveSlot`, so they fell
 * to `default: return ""`. FILL-OR-OMIT (pass2-render.ts, Item 235) then
 * omitted the whole template — a fully-populated composer ctx rendered as
 * nothing. Secondary defect: the composer read two intake keys that do not
 * exist in `cppaRiskContract` (`i3_sources`, `i2_deletion`), so those
 * sub-elements falsely read "not stated on the record".
 *
 * These tests fail if either regression returns.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "./derive.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import { renderTemplate } from "./pass2-render.ts";
import { resolveSlot } from "./slot-resolver.ts";
import { PASS2_TEMPLATES } from "./content/pass2-templates.ts";

const FULL_INTAKE: Record<string, unknown> = {
  entity_name: "ClearPath Credit Solutions, Inc.",
  q4_pi_categories: "Financial information",
  q7_right_delete: "Automated deletion with confirmation",
  i1_processing_purpose: "to underwrite personal-loan applications",
  i2_retention_period: "seven years from account closure",
  i2_retention_criteria: "Until purpose is fulfilled, then deletion",
  i4b_sources: "the consumer directly and consumer reporting agencies",
  i4_disclosure_mechanisms: "an encrypted API integration",
  i6_vendors: "a loan-origination platform vendor",
  primary_activity_name: "credit-decisioning on loan applications",
  primary_activity_purpose: "assessing applicant creditworthiness for personal loans",
};

const planFor = (intake: Record<string, unknown>) =>
  derivePlan({ intake, report_data: {}, buildStamp: "item320@test" });

function renderNarrative(intake: Record<string, unknown>) {
  const plan = planFor(intake);
  const instances = composeSection("processing_narrative", plan) ?? [];
  return instances.map((i) => renderTemplate(i.template_id, plan, i.ctx));
}

Deno.test("ITEM 320: processing narrative renders non-empty with zero missing slots", () => {
  const [r] = renderNarrative(FULL_INTAKE);
  assertEquals(r.template_id, "T.risk.processing_narrative");
  assertEquals(r.errors, []);
  assertEquals(r.slots_missing, 0, "every plan slot must resolve");
  assert(r.text.trim().length > 0, "narrative must not render empty (fill-or-omit regression)");
  assert(!r.text.includes("{{"), "no unsubstituted tokens may survive");
});

Deno.test("ITEM 320: every declared narrative slot has a resolver case", () => {
  // The defect class was a declared-but-unresolved slot. Assert directly
  // against resolveSlot so a future slot addition cannot silently repeat it.
  const tpl = PASS2_TEMPLATES["T.risk.processing_narrative"];
  const ctx: Record<string, string> = {};
  for (const slot of tpl.plan_slots) ctx[slot] = `VALUE_${slot}`;
  for (const slot of tpl.plan_slots) {
    // Some slots (e.g. entity_name) resolve from the plan rather than ctx;
    // what matters is that NO slot falls through to the empty default.
    const value = resolveSlot(slot, planFor(FULL_INTAKE), ctx as never);
    assert(
      value.length > 0,
      `resolveSlot has no case for "${slot}" — it falls to default ""`,
    );
  }
});

Deno.test("ITEM 320: answered sub-elements are not reported as unstated", () => {
  const [r] = renderNarrative(FULL_INTAKE);
  assert(
    r.text.includes("the consumer directly and consumer reporting agencies"),
    "i4b_sources is the contract key for collection sources",
  );
  assert(
    r.text.includes("Automated deletion with confirmation"),
    "q7_right_delete is the contract key for the deletion process",
  );
  assert(
    !r.text.includes("not stated on the record."),
    "no answered sub-element may read as unstated",
  );
});

Deno.test("ITEM 320: silent sub-elements still degrade to the reserved phrase", () => {
  const sparse = { ...FULL_INTAKE };
  delete sparse.i4b_sources;
  delete sparse.q7_right_delete;
  const [r] = renderNarrative(sparse);
  assert(r.text.trim().length > 0, "a partially silent record must still render");
  assert(
    r.text.includes("not stated on the record"),
    "silent sub-elements must read 'not stated on the record' (Item 244 Correction 1)",
  );
  assert(!r.text.includes("{{"), "no unsubstituted tokens may survive");
});

Deno.test("ITEM 320: narrative subject is the named primary activity", () => {
  const [r] = renderNarrative(FULL_INTAKE);
  assert(
    r.text.includes("credit-decisioning on loan applications"),
    "Item 276 subject law still holds after the render fix",
  );
});

Deno.test("ITEM 320: no regression — adjacent sections still render non-empty", () => {
  // Guards the Prompt A comparable-set item and the other Item 244
  // templates that shared the same missing-resolver-case root cause.
  const intake = {
    ...FULL_INTAKE,
    has_secondary_uses: "Yes — there are other uses",
    secondary_activities: [
      {
        name: "marketing look-alike modelling",
        purpose: "prospecting",
        divergence: {
          data: "Same",
          purpose: "Different",
          systems: "Same",
          people: "Same",
          risks: "Same",
        },
      },
    ],
  };
  const plan = planFor(intake);
  for (const section of [
    "executive_summary",
    "scope_and_triggers",
    "processing_narrative",
    "record_sufficiency",
    "information_needed",
  ]) {
    for (const inst of composeSection(section, plan) ?? []) {
      const r = renderTemplate(inst.template_id, plan, inst.ctx);
      assert(
        r.text.trim().length > 0,
        `${section}/${inst.template_id} rendered empty`,
      );
      assert(!r.text.includes("{{"), `${section}/${inst.template_id} left a raw token`);
    }
  }
  const scope = (composeSection("scope_and_triggers", plan) ?? [])
    .map((i) => renderTemplate(i.template_id, plan, i.ctx).text)
    .join("\n");
  assert(
    scope.includes("Recommended: conduct a separate risk assessment for"),
    "Prompt A comparable-set recommendation must still render",
  );
});
