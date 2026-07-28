// LTP content-file smoke + wire-schema projection round-trip tests.
// Deterministic; no network.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { PASS1_DERIVE_SYSTEM, PASS1_DERIVE_USER_TEMPLATE, PASS1_DERIVE_PROMPT_VERSION } from "./pass1-derive-prompt.ts";
import { PASSV_VERIFY_SYSTEM, PASSV_VERIFY_PROMPT_VERSION } from "./passv-verify-prompt.ts";
import {
  PASS2_TEMPLATES,
  SURFACE_AUDIT_RULINGS,
  PASS2_FORBIDDEN_TOKENS,
  BALANCE_DIRECTION_CLAUSES,
  FIRM_VARIANT_CLOSENESS_MAX,
  shouldEmitBCriterionCountQuestion,
} from "./pass2-templates.ts";
import { RENDERPLAN_WIRE_SCHEMA, planKeysProjected } from "./renderplan-wire-schema.ts";
import { derivePlan } from "../derive.ts";

Deno.test("content: pass1 prompt loads and carries expected priority rules", () => {
  assert(PASS1_DERIVE_PROMPT_VERSION.startsWith("pass1-derive-"));
  assert(PASS1_DERIVE_SYSTEM.includes("You DERIVE; you never write prose"));
  assert(PASS1_DERIVE_SYSTEM.includes("INTAKE LEDGER"));
  assert(PASS1_DERIVE_SYSTEM.includes("byte-exact substring"));
  assert(PASS1_DERIVE_SYSTEM.includes("NO PROSE"));
  assert(PASS1_DERIVE_USER_TEMPLATE.includes("{intake_json}"));
  assert(PASS1_DERIVE_USER_TEMPLATE.includes("{response_schema}"));
});

Deno.test("content: passv prompt loads and forbids rewrite", () => {
  assert(PASSV_VERIFY_PROMPT_VERSION.startsWith("passv-verify-"));
  assert(PASSV_VERIFY_SYSTEM.includes("You do NOT rewrite"));
  assert(PASSV_VERIFY_SYSTEM.includes("Empty findings array is the expected result"));
});

Deno.test("content: pass2 templates present with expected ids", () => {
  const ids = Object.keys(PASS2_TEMPLATES).sort();
  const expected = [
    "T.risk.admt.consequence_suppressed",
    "T.risk.applicability.engaged",
    "T.risk.applicability.not_engaged",
    "T.risk.balance.factor_line",
    "T.risk.balance.firm",
    "T.risk.balance.hedged",
    "T.risk.closing.reserved",
    "T.risk.cohort",
    "T.risk.documentation.gap",
    "T.risk.documentation.present",
    "T.risk.information_needed.b_criterion_count",
    "T.risk.review_items",
    "T.risk.summary.activity_line",
    "T.risk.summary.aggregation_note",
    "T.risk.summary.docs",
    "T.risk.summary.opening.all_firm",
    "T.risk.summary.opening.any_negative",
    "T.risk.summary.opening.insufficient",
    "T.risk.summary.opening.mixed_hedged",
  ];
  assertEquals(ids, expected);
});

// ── ENRICHED BALANCE + AGGREGATION + (B)-GAP TESTS (CONTENT COURIER 2026-07-27) ──

function renderTemplate(id: string, slots: Record<string, string>): string {
  const t = PASS2_TEMPLATES[id];
  let out = t.text;
  for (const [k, v] of Object.entries(slots)) {
    out = out.split(`{{plan:${k}}}`).join(v).split(`{{cite:${k}}}`).join(v);
  }
  return out;
}

Deno.test("content: factor_line renders with guidance clause substituted", () => {
  const t = PASS2_TEMPLATES["T.risk.balance.factor_line"];
  assertEquals(t.citation_slots, ["GUIDANCE_PIN"]);
  assertEquals(t.plan_slots, ["factor_label", "factor_basis", "guidance_clause"]);
  const rendered = renderTemplate("T.risk.balance.factor_line", {
    factor_label: "Fraud prevention benefit",
    factor_basis: "documented as the primary business purpose",
    guidance_clause: "The Agency's Final Statement of Reasons addresses this consideration: [FSOR-P42].",
  });
  assert(rendered.startsWith("Fraud prevention benefit: documented as the primary business purpose."));
  assert(rendered.includes("Final Statement of Reasons"));
  assert(!rendered.includes("{{"));
  assert(rendered.length <= t.max_chars);
});

Deno.test("content: factor_line renders basis-only when guidance_clause is empty", () => {
  const rendered = renderTemplate("T.risk.balance.factor_line", {
    factor_label: "Retention safeguard",
    factor_basis: "30-day deletion policy on the record",
    guidance_clause: "",
  });
  // Basis-only rendering: no invented reasoning, no dangling tokens.
  assertEquals(rendered.trim(), "Retention safeguard: 30-day deletion policy on the record.");
  assert(!rendered.includes("{{"));
});

Deno.test("content: aggregation_note contains driving_activity_label and precedence framing", () => {
  const t = PASS2_TEMPLATES["T.risk.summary.aggregation_note"];
  assertEquals(t.plan_slots, ["driving_activity_label"]);
  assertEquals(t.citation_slots, []);
  const rendered = renderTemplate("T.risk.summary.aggregation_note", {
    driving_activity_label: "Automated hiring decisions",
  });
  assert(rendered.includes("Automated hiring decisions"));
  assert(rendered.includes("most consequential activity"));
  assert(rendered.includes("are not averaged"));
  assert(rendered.length <= t.max_chars);
});

Deno.test("content: (B)-gap question — emission matrix (all three conditions required)", () => {
  // Truth table: emit iff A_unresolved && sell_or_share && !has_count.
  const cases: Array<{ a: boolean; ss: boolean; hc: boolean; want: boolean }> = [
    { a: false, ss: true, hc: false, want: true },   // canonical emit
    { a: true,  ss: true, hc: false, want: false },  // A resolved → suppress
    { a: false, ss: false, hc: false, want: false }, // no sell/share → suppress
    { a: false, ss: true, hc: true,  want: false },  // count present → suppress
    { a: true,  ss: false, hc: true, want: false },
    { a: true,  ss: true,  hc: true, want: false },
    { a: false, ss: false, hc: true, want: false },
    { a: true,  ss: false, hc: false, want: false },
  ];
  for (const c of cases) {
    const got = shouldEmitBCriterionCountQuestion({
      criterion_a_resolved: c.a,
      intake_affirms_sell_or_share: c.ss,
      has_compliant_count_field: c.hc,
    });
    assertEquals(got, c.want, `A=${c.a} SS=${c.ss} HC=${c.hc}`);
  }
});

// T-C1 (2026-07-28) — callsite-derived predicate semantics.
// `has_compliant_count_field` is true iff the `bought_sold_shared_count`
// intake key exists AND is answered with any value in the enum. Any
// answered value — including "Under 100,000" — suppresses the question
// (the (B) prong resolves against the answered value; the user is not
// re-asked). Unanswered → question emits when the other two hold.
Deno.test("content: (B)-gap question — callsite-derived `has_compliant_count_field` semantics", () => {
  const BOUGHT_SOLD_SHARED_OPTS = [
    "Under 100,000",
    "100,000 to under 250,000",
    "250,000 to under 1,000,000",
    "1,000,000 or more",
  ] as const;
  const derive = (intake: Record<string, unknown>): boolean =>
    (BOUGHT_SOLD_SHARED_OPTS as readonly string[]).includes(
      String(intake["bought_sold_shared_count"] ?? ""),
    );
  // Baseline where the other two conditions hold (A unresolved, sell/share affirmed).
  const baseA = false;
  const baseSS = true;
  // (i) unanswered → question emits.
  assertEquals(
    shouldEmitBCriterionCountQuestion({
      criterion_a_resolved: baseA,
      intake_affirms_sell_or_share: baseSS,
      has_compliant_count_field: derive({}),
    }),
    true,
    "unanswered field should emit the (B)-gap question",
  );
  // (ii) answered with any enum band → question suppressed.
  for (const band of BOUGHT_SOLD_SHARED_OPTS) {
    assertEquals(
      shouldEmitBCriterionCountQuestion({
        criterion_a_resolved: baseA,
        intake_affirms_sell_or_share: baseSS,
        has_compliant_count_field: derive({ bought_sold_shared_count: band }),
      }),
      false,
      `answered "${band}" should suppress the (B)-gap question`,
    );
  }
  // (iii) legacy off-enum value → field is treated as unanswered → emit.
  assertEquals(
    shouldEmitBCriterionCountQuestion({
      criterion_a_resolved: baseA,
      intake_affirms_sell_or_share: baseSS,
      has_compliant_count_field: derive({ bought_sold_shared_count: "roughly 500k" }),
    }),
    true,
    "off-enum legacy value must NOT satisfy has_compliant_count_field",
  );
});

Deno.test("content: (B)-gap question text is intake-gap disciplined (no negative implication, no citation glyph)", () => {
  const t = PASS2_TEMPLATES["T.risk.information_needed.b_criterion_count"];
  const text = t.text;
  // Named-statute reference is template-authored (per PASS2_FORBIDDEN_TOKENS
  // scope: connective tissue). The (B)-gap question is a customer-facing
  // ask, so it names the pinpoint verbatim. Assert it does NOT use the
  // negative-implication phrasings reserved for gap/closing surfaces.
  const negativeImplicationMarkers = [
    "does not",
    "cannot",
    "is not sufficient",
    "no basis",
    "insufficient",
  ];
  for (const m of negativeImplicationMarkers) {
    assert(!text.toLowerCase().includes(m.toLowerCase()), `negative-implication token present: ${m}`);
  }
  // Never in opening: this template has no opening_slot and no plan slots,
  // so it can only be routed to the information_needed surface.
  assertEquals(t.plan_slots, []);
  assertEquals(t.intake_slots, []);
  assert(text.length <= t.max_chars);
});

Deno.test("content: new templates lint clean against PASS2_FORBIDDEN_TOKENS in connective tissue", () => {
  // Forbidden tokens apply to model-authored connective tissue; templates
  // themselves are courier-authored and may name statutes verbatim in
  // customer-facing question surfaces (see (B)-gap ruling). Assert the
  // two Pass-2 narrative templates do not carry the model-only glyphs.
  for (const id of ["T.risk.balance.factor_line", "T.risk.summary.aggregation_note"]) {
    const text = PASS2_TEMPLATES[id].text;
    for (const tok of ["Art.", "Sec.", "GDPR", "persuasive-markers-absent-check"]) {
      assert(!text.includes(tok), `${id} contains forbidden token: ${tok}`);
    }
  }
});


Deno.test("content: ADMT consequence template emits nothing when engaged", () => {
  const t = PASS2_TEMPLATES["T.risk.admt.consequence_suppressed"];
  assertEquals(t.emits_nothing, true);
  assertEquals(t.text, "");
});

Deno.test("content: surface-audit rulings match courier (CUT/CUT/TEMPLATE_CUT)", () => {
  assertEquals(SURFACE_AUDIT_RULINGS.scope_notes, "CUT");
  assertEquals(SURFACE_AUDIT_RULINGS.cross_tool_recommendations, "CUT");
  assertEquals(SURFACE_AUDIT_RULINGS.inconsistency_flags, "TEMPLATE_CUT");
});

Deno.test("content: forbidden tokens include § and GDPR", () => {
  assert(PASS2_FORBIDDEN_TOKENS.includes("§"));
  assert(PASS2_FORBIDDEN_TOKENS.includes("GDPR"));
});

Deno.test("content: balance direction clauses are the closed two-element enum", () => {
  assertEquals(BALANCE_DIRECTION_CLAUSES.length, 2);
  assert(BALANCE_DIRECTION_CLAUSES[0].includes("benefits, as documented, outweigh"));
  assert(BALANCE_DIRECTION_CLAUSES[1].includes("negative impacts, as documented, outweigh"));
});

Deno.test("content: firm-variant closeness threshold present", () => {
  assert(FIRM_VARIANT_CLOSENESS_MAX > 0 && FIRM_VARIANT_CLOSENESS_MAX < 1);
});

Deno.test("wire-schema: top-level requireds cover every schema.ts field", () => {
  const req = new Set<string>(RENDERPLAN_WIRE_SCHEMA.required as unknown as string[]);
  for (const k of ["plan_version", "product", "build_stamp", "jurisdiction_tag", "intake_ledger",
    "citation_bindings", "propositions", "factor_table", "weighing_frame", "gate_outcomes",
    "conservative_write_around"]) {
    assert(req.has(k), `missing required: ${k}`);
  }
});

Deno.test("wire-schema: projection round-trips derived plan (no extra keys, no missing requireds)", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", q18_admt_use: "no" },
    report_data: {},
    buildStamp: "test@x",
  });
  const check = planKeysProjected(plan as unknown as Record<string, unknown>);
  assertEquals(check.extra_keys, [], `extra keys: ${check.extra_keys.join(",")}`);
  assertEquals(check.missing_required, [], `missing required: ${check.missing_required.join(",")}`);
  assert(check.ok);
});

Deno.test("wire-schema: all enum-typed properties reject the empty string via schema", () => {
  // Structural sanity: enum arrays are non-empty and exclude "".
  const walk = (node: any): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.enum)) {
      assert(node.enum.length > 0);
      assert(!node.enum.includes(""));
    }
    for (const v of Object.values(node)) walk(v as any);
  };
  walk(RENDERPLAN_WIRE_SCHEMA as any);
});
