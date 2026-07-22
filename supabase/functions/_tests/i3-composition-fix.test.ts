// Regression test for the i3 enum-composition fix.
// - Historical open_items using `i3_ca_consumer_band` must still resolve as
//   `re-select` against CONSUMER_OPTS (enum_ref `cppa_risk_assessment:consumer_opts`).
// - NEW open_items using `i3_ca_consumer_band_composition` must resolve as
//   `structured` (category composition object), NOT as re-select.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOpenItems, rewriteI3CompositionAsks } from "../_shared/open-items.ts";

Deno.test("i3 legacy band key stays a re-select (historical open_items resolve)", () => {
  const items = buildOpenItems(
    [{ field: "i3_ca_consumer_band", class: "record-completeness", provision: "CCPA §1798.140" }],
    "cppa_risk_assessment",
  );
  assertEquals(items.length, 1);
  assertEquals(items[0].input_spec.kind, "re-select");
  // The enum_ref is registered in T_CLASS_FIELDS and points at CONSUMER_OPTS.
  assertEquals(
    (items[0].input_spec as { enum_ref: string }).enum_ref,
    "cppa_risk_assessment:i3_ca_consumer_band",
  );
});

Deno.test("i3 composition key routes to structured (new asks)", () => {
  const items = buildOpenItems(
    [{ field: "i3_ca_consumer_band_composition", class: "record-completeness", provision: "CCPA §1798.140" }],
    "cppa_risk_assessment",
  );
  assertEquals(items.length, 1);
  assertEquals(items[0].input_spec.kind, "structured");
});

// EMITTER-FIX: new-doc information_needed asks about volume band when the
// intake ALREADY answered it are rewritten to the composition field before
// freeze — so the frozen open_item carries `i3_ca_consumer_band_composition`
// and routes to structured. Historical (already-frozen) open_items are
// untouched by this path because rewrite runs BEFORE freeze.
Deno.test("emitter rewrite: band ask + answered intake → composition field", () => {
  const intake = { annual_consumer_volume: "100,000–1,000,000" };
  const infoNeeded = [
    { field: "i3_ca_consumer_band", class: "record-completeness", provision: "CCPA §1798.140", dimensions: "category mix" },
  ];
  const rewritten = rewriteI3CompositionAsks(infoNeeded, intake) as any[];
  assertEquals(rewritten[0].field, "i3_ca_consumer_band_composition");
  const items = buildOpenItems(rewritten, "cppa_risk_assessment");
  assertEquals(items[0].input_spec.kind, "structured");
});

Deno.test("emitter rewrite: band ask + unanswered intake → left as-is (band re-select)", () => {
  const intake = { annual_consumer_volume: "" };
  const infoNeeded = [
    { field: "i3_ca_consumer_band", class: "record-completeness", provision: "CCPA §1798.140" },
  ];
  const rewritten = rewriteI3CompositionAsks(infoNeeded, intake) as any[];
  assertEquals(rewritten[0].field, "i3_ca_consumer_band");
  const items = buildOpenItems(rewritten, "cppa_risk_assessment");
  assertEquals(items[0].input_spec.kind, "re-select");
});

Deno.test("emitter rewrite: alternative intake shapes (i3_ca_consumer_band, normalised_intake)", () => {
  for (const intake of [
    { i3_ca_consumer_band: "Fewer than 10,000" },
    { normalised_intake: { annual_consumer_volume: "More than 1,000,000" } },
  ]) {
    const rewritten = rewriteI3CompositionAsks(
      [{ field: "i3_ca_consumer_band", class: "record-completeness", provision: "CCPA §1798.140" }],
      intake,
    ) as any[];
    assertEquals(rewritten[0].field, "i3_ca_consumer_band_composition");
  }
});

Deno.test("emitter rewrite: band ask + intake band 'Unsure' → left as-is (re-select)", () => {
  const intake = { i3_ca_consumer_band: "  Unsure  " };
  const infoNeeded = [
    { field: "i3_ca_consumer_band", class: "record-completeness", provision: "CCPA §1798.140" },
  ];
  const rewritten = rewriteI3CompositionAsks(infoNeeded, intake) as any[];
  assertEquals(rewritten[0].field, "i3_ca_consumer_band");
  const items = buildOpenItems(rewritten, "cppa_risk_assessment");
  assertEquals(items[0].input_spec.kind, "re-select");
});
