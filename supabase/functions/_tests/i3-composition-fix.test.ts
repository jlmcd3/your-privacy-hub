// Regression test for the i3 enum-composition fix.
// - Historical open_items using `i3_ca_consumer_band` must still resolve as
//   `re-select` against CONSUMER_OPTS (enum_ref `cppa_risk_assessment:consumer_opts`).
// - NEW open_items using `i3_ca_consumer_band_composition` must resolve as
//   `structured` (category composition object), NOT as re-select.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildOpenItems } from "../_shared/open-items.ts";

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
