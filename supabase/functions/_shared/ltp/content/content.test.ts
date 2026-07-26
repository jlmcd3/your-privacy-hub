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
    "T.risk.balance.firm",
    "T.risk.balance.hedged",
    "T.risk.closing.reserved",
    "T.risk.cohort",
    "T.risk.documentation.gap",
    "T.risk.documentation.present",
    "T.risk.review_items",
  ];
  assertEquals(ids, expected);
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
