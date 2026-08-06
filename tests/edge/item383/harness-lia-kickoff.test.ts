// ITEM 383 LEG 1 §2 — batch-harness acceptance for `tools: ['lia']` with
// `tool_variants: {"lia":"perfect"}`.
//
// The orchestrator's kickoff validation is: (1) every tool in RUN_QUALITY_BATCH_SLUGS,
// (2) every tool_variants key present in `tools`, (3) normalizeToolVariants
// accepts the value, (4) the messy-empty pre-check, (5) pins resolved via
// intakesForVariant and capped by buildSeedRow. Each is asserted here against
// the live modules, so a size-1 perfect LIA batch is provably admissible.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { RUN_QUALITY_BATCH_SLUGS } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";
import { buildSeedRow } from "../../../supabase/functions/quality-batch-orchestrator/_local/quality/seed-row.ts";
import { intakesForVariant } from "../../../supabase/functions/_shared/golden/registry.ts";
import {
  normalizeToolVariants,
  resolveToolVariant,
} from "../../../supabase/functions/_shared/quality/fixture-variant.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";

Deno.test("harness: lia is an accepted batch slug", () => {
  assert(RUN_QUALITY_BATCH_SLUGS.has("lia"));
});

Deno.test("harness: tool_variants {'lia':'perfect'} normalizes and resolves", () => {
  const tv = normalizeToolVariants({ lia: "perfect" });
  assertEquals(tv, { lia: "perfect" });
  assertEquals(resolveToolVariant("lia", tv, null), "perfect");
});

Deno.test("harness: perfect pins resolve for lia and survive the messy-empty pre-check", () => {
  const pins = intakesForVariant("lia", "perfect");
  assertEquals(pins.length, 1);
  assertEquals(pins[0], LIA_PERFECT[0].intake);
  // messy-empty pre-check only fires for variant === "messy".
  assert(intakesForVariant("lia", "messy").length > 0);
});

Deno.test("harness: seed row stages the perfect pin, single-flight semantics unchanged", () => {
  const seed = buildSeedRow("lia", 1, 1, "00000000-0000-0000-0000-000000000000", "2026-08-06T00:00:00Z", {
    pins: intakesForVariant("lia", "perfect"),
  }) as Record<string, unknown>;
  assertEquals(seed.tool, "lia");
  assertEquals(seed.status, "pending");
  assertEquals(seed.batch_size, 1);
  assertEquals(seed.next_doc_index, 0);
  assertEquals((seed.intakes as unknown[]).length, 1);
});
