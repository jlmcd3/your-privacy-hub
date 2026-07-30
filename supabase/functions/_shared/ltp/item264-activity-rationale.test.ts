// ITEM 264 — ENRICHED BALANCE RATIONALE wiring into risk_assessment_by_activity.
//
// Asserts the ratified composition order lands as ONE shipped item per
// engaged activity: record-status → benefit factor_lines → negative
// factor_lines → safeguard factor_lines → calibrated conclusion.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import { renderTemplate } from "./pass2-render.ts";
import type { RenderPlan, FactorTableEntry } from "../render-plan/schema.ts";

function factor(
  id: string,
  kind: FactorTableEntry["kind"],
  label: string,
  note: string,
  withGuidance: boolean,
): FactorTableEntry {
  return {
    factor_id: id,
    kind,
    jurisdiction_tag: "cppa-ca",
    present_in_intake: true,
    intake_ledger_refs: ["L.entity_name"],
    guidance_refs: withGuidance
      ? [{
          source_table: "cppa_fsor_commentary",
          regulation_citation: "11 CCR § 7152(a)(3)",
          page_ref: "p. 42",
          anchor_hint: "benefit weighing",
          authority_weight: "binding",
        }]
      : [],
    anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" },
    display_label: label,
    weight_note: note,
  } as unknown as FactorTableEntry;
}

const PLAN: RenderPlan = {
  plan_version: "v1",
  product: "cppa-risk-assessment",
  build_stamp: "item264-test",
  jurisdiction_tag: "cppa-ca",
  intake_ledger: [
    { ledger_id: "L.entity_name", intake_field: "entity_name", value: "ClearPath Credit Solutions", display: "entity name" },
    { ledger_id: "L.i1b_min_pi", intake_field: "i1b_min_pi", value: "collection limited to income and identity fields", display: "minimum personal information" },
  ],
  citation_bindings: [{ pinpoint_ref: "PINPOINT_7152A", pinpoint: "11 CCR § 7152(a)" }],
  propositions: [
    {
      proposition_id: "P.appl.1",
      conclusion_id: "r.applicability.selling_sharing",
      epistemic_type: "R",
      polarity: "positive",
      display_label: "selling or sharing personal information",
    },
  ],
  factor_table: [
    factor("f.b1", "benefit", "Fraud reduction", "The record states a 31% reduction in disputed transactions since deployment", true),
    factor("f.b2", "benefit", "Faster credit decisions", "The record states decision turnaround fell from four days to under one hour", true),
    factor("f.b3", "benefit", "Reduced manual review cost", "The record states manual review volume declined by roughly half in the first year", false),
    factor("f.n1", "negative_impact", "Inaccuracy in scoring outputs", "The record states model outputs are not independently validated against outcome data", true),
    factor("f.n2", "negative_impact", "Loss of consumer control", "The record states consumers are not offered an opt-out of the scoring activity", true),
    factor("f.n3", "negative_impact", "Sensitive inference risk", "The record states income proxies may be inferred from transaction categories", false),
    factor("f.s1", "safeguard", "Retention limitation", "The record states scoring inputs are deleted after 30 days", false),
  ],
  weighing_frame: [],
  gate_outcomes: [
    { gate_id: "G.documentation.purpose_present", outcome: "pass" },
    { gate_id: "G.documentation.categories_present", outcome: "pass" },
    { gate_id: "G.documentation.operational_elements_present", outcome: "pass" },
    { gate_id: "G.documentation.approver_present", outcome: "pass" },
  ],
  conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
} as unknown as RenderPlan;

function renderItem(parts: readonly { template_id: string; ctx: unknown }[]): string {
  return parts
    .map((p) => renderTemplate(p.template_id, PLAN, p.ctx as Record<string, unknown>).text)
    .filter((t) => t.length > 0)
    .map((t) => t.trim())
    .join(" ");
}

Deno.test("item264 — one rationale item per engaged activity (plus the LIA line)", () => {
  const out = composeSection("risk_assessment_by_activity", PLAN) ?? [];
  const rationales = out.filter((i) => Array.isArray(i.parts) && i.parts!.length > 0);
  assertEquals(rationales.length, 1); // one engaged applicability proposition
  assertEquals(out.length, 2); // rationale + LIA line
  assert(!out[1].parts, "LIA line must remain its own single-template item");
});

Deno.test("item264 — ratified composition order inside the single item", () => {
  const out = composeSection("risk_assessment_by_activity", PLAN) ?? [];
  const parts = out[0].parts!;
  const ids = parts.map((p) => p.template_id);
  assertEquals(ids[0], "T.risk.summary.docs");
  assertEquals(ids.slice(1, 8), new Array(7).fill("T.risk.balance.factor_line"));
  assert(ids[ids.length - 1].startsWith("T.risk.balance."), ids.join(","));
  // Order within the factor_line block: benefit → negative → safeguard.
  const labels = parts.slice(1, 8).map((p) => String((p.ctx as Record<string, unknown>).factor_label));
  assertEquals(labels, [
    "Fraud reduction",
    "Faster credit decisions",
    "Reduced manual review cost",
    "Inaccuracy in scoring outputs",
    "Loss of consumer control",
    "Sensitive inference risk",
    "Retention limitation",
  ]);
});

Deno.test("item264 — weight_note verbatim as factor_basis; basis-only when no guidance", () => {
  const out = composeSection("risk_assessment_by_activity", PLAN) ?? [];
  const parts = out[0].parts!;
  const withG = parts.find((p) => (p.ctx as Record<string, unknown>).factor_label === "Fraud reduction")!;
  assertEquals(
    (withG.ctx as Record<string, unknown>).factor_basis,
    "The record states a 31% reduction in disputed transactions since deployment",
  );
  assertEquals(
    (withG.ctx as Record<string, unknown>).guidance_clause,
    "The Agency's Final Statement of Reasons addresses this consideration: 11 CCR § 7152(a)(3).",
  );
  const noG = parts.find((p) => (p.ctx as Record<string, unknown>).factor_label === "Retention limitation")!;
  assertEquals((noG.ctx as Record<string, unknown>).guidance_clause, "");
});

Deno.test("item264 — rendered item carries record status, factor lines, conclusion, and clears the 800-char floor", () => {
  const out = composeSection("risk_assessment_by_activity", PLAN) ?? [];
  const text = renderItem(out[0].parts!);
  assert(text.includes("The assessment record is complete against"), text);
  assert(text.includes("The record states a 31% reduction in disputed transactions since deployment"), text);
  assert(text.includes("Inaccuracy in scoring outputs:"), text);
  assert(/benefits|outweigh|balance|impacts/i.test(text), text);
  assert(text.length >= 800, `rendered item length ${text.length}: ${text}`);
});
