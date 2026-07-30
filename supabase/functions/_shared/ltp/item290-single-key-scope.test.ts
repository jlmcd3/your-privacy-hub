/**
 * ITEM 290 — SINGLE-KEY SCOPE EMISSION (no-twin pin).
 *
 * CEO ruling 2026-07-30: "emit one key only, and keep the detector untouched."
 * The Track-2 emitters previously rendered composeScope() under BOTH
 * `scope_and_triggers` and `scope_confirmation`, producing byte-identical
 * content and a GTM block on
 * `section_cross_duplication:scope_confirmation=scope_and_triggers`.
 *
 * Renderer evidence for the surviving key (both surfaces read
 * `scope_and_triggers` FIRST, `scope_confirmation` only as fallback):
 *   src/components/cppa/RiskAssessmentReportLTP.tsx:130
 *   supabase/functions/generate-report-pdf/index.ts:1249
 *
 * This test pins that no emitter path can reintroduce the twin.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CPPA_RISK_SECTION_SHARDS,
  CPPA_RISK_SECTION_EMISSION_POLICY,
} from "./section-shards/cppa-risk.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";

Deno.test("ITEM 290 — no scope_confirmation shard is declared", () => {
  const keys = CPPA_RISK_SECTION_SHARDS.map((s) => s.key);
  assert(!keys.includes("scope_confirmation"), "retired key must not be a shard");
  assert(keys.includes("scope_and_triggers"), "surviving key must remain a shard");
});

Deno.test("ITEM 290 — no emission policy entry for the retired key (no empty stub)", () => {
  const policy = CPPA_RISK_SECTION_EMISSION_POLICY as Record<string, unknown>;
  assertEquals(policy["scope_confirmation"], undefined);
  assertEquals(policy["scope_and_triggers"], "conditional");
});

Deno.test("ITEM 290 — composer dispatch returns null for the retired key", () => {
  const plan = {} as never;
  assertEquals(composeSection("scope_confirmation", plan), null);
});
