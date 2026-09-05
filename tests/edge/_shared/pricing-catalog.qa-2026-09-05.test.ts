// QA batch 2026-09-05 — the edge-side price catalog reads every amount from
// the GENERATED snapshot of src/config/pricing.ts. These pins hold the v13
// launch amounts the QA review saw contradicted at Stripe, and prove the
// catalog's slug wiring resolves against the snapshot.
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ANNUAL_GATED_TOOLS,
  PROFESSIONAL_INCLUDED_TOOLS,
  SUBSCRIPTION_ONLY_TOOLS,
  TOOL_CATALOG,
  describePriceDrift,
  resolveToolSlug,
  toolStandaloneCents,
  toolSubscriberCents,
} from "../../../supabase/functions/_shared/pricing.ts";
import {
  PRICING_REGISTRY_SNAPSHOT,
  PRICING_SNAPSHOT_SOURCE_HASH,
  registryCents,
} from "../../../supabase/functions/_shared/pricing-snapshot.ts";

Deno.test("pricing snapshot — carries a source hash and every catalog lookup key", () => {
  assert(/^[0-9a-f]{64}$/.test(PRICING_SNAPSHOT_SOURCE_HASH));
  for (const [slug, tool] of Object.entries(TOOL_CATALOG)) {
    assert(PRICING_REGISTRY_SNAPSHOT[tool.standalone_lookup], `${slug}: standalone lookup ${tool.standalone_lookup} missing from snapshot`);
    if (tool.subscriber_lookup) {
      assert(PRICING_REGISTRY_SNAPSHOT[tool.subscriber_lookup], `${slug}: subscriber lookup ${tool.subscriber_lookup} missing from snapshot`);
    }
  }
});

Deno.test("pricing catalog — v13 amounts the QA review saw contradicted at Stripe", () => {
  // site price → observed Stripe (pre-fix)
  assertEquals(toolSubscriberCents("cppa_risk_assessment"), 17900);   // $179 → $139
  assertEquals(toolSubscriberCents("cppa_cybersecurity"), 23900);     // $239 → $169
  assertEquals(toolSubscriberCents("cppa_admt"), 9900);               // $99  → $59
  assertEquals(toolSubscriberCents("dpia_framework"), 9900);          // $99  → $59
  assertEquals(toolSubscriberCents("li_assessment"), 8900);           // $89  → $59
  assertEquals(toolStandaloneCents("dpa_generator"), 6900);           // $69  → $49
  assertEquals(registryCents("registration_standalone"), 7900);       // $79  → $45
  assertEquals(registryCents("registration_additional_filing"), 4900);
  // Standalone rates of the same tools.
  assertEquals(toolStandaloneCents("cppa_risk_assessment"), 29900);
  assertEquals(toolStandaloneCents("cppa_cybersecurity"), 39900);
  assertEquals(toolStandaloneCents("cppa_suite"), 59900);
  assertEquals(toolStandaloneCents("ir_playbook"), 8900);
  assertEquals(toolStandaloneCents("biometric_checker"), 7900);
  assertEquals(toolStandaloneCents("governance_assessment"), 11900);
  // RoPA paid variants used by create-tool-checkout.
  assertEquals(registryCents("ropa_paid_generation"), 4900);
  assertEquals(registryCents("ropa_annual_additional"), 3900);
});

Deno.test("pricing catalog — Professional-included tools carry a $0 subscriber rate; subscription-only tools report $0", () => {
  for (const slug of PROFESSIONAL_INCLUDED_TOOLS) assertEquals(toolSubscriberCents(slug), 0, slug);
  for (const slug of SUBSCRIPTION_ONLY_TOOLS) {
    assertEquals(toolStandaloneCents(slug), 0, slug);
    assertEquals(toolSubscriberCents(slug), 0, slug);
  }
  assertEquals([...PROFESSIONAL_INCLUDED_TOOLS].sort(), ["biometric_checker", "dpa_generator", "ir_playbook"]);
  assert(ANNUAL_GATED_TOOLS.has("cppa_admt") && ANNUAL_GATED_TOOLS.has("li_assessment"));
});

Deno.test("pricing catalog — legacy slug aliases resolve; unknown keys fail loudly", () => {
  assertEquals(resolveToolSlug("healthcheck"), "governance_assessment");
  assertEquals(resolveToolSlug("li_analyzer"), "li_assessment");
  assertEquals(resolveToolSlug("dpia_builder"), "dpia_framework");
  assertEquals(toolStandaloneCents("healthcheck"), toolStandaloneCents("governance_assessment"));
  assertThrows(() => registryCents("not_a_real_lookup_key"));
  assertThrows(() => toolStandaloneCents("not_a_tool"));
});

Deno.test("describePriceDrift — silent when Stripe agrees, records the stale or missing price otherwise", () => {
  assertEquals(describePriceDrift("li_standalone_v2", 13900, 13900), null);
  const stale = describePriceDrift("li_standalone_v2", 13900, 10900);
  assertEquals(stale?.evt, "pricing_drift");
  assertEquals(stale?.stripe_cents, 10900);
  assertEquals(stale?.registry_cents, 13900);
  const missing = describePriceDrift("li_standalone_v2", 13900, null);
  assertEquals(missing?.stripe_cents, null);
});
