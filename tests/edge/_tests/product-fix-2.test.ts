// PRODUCT-FIX-2 T1 — cppa-risk-normalise shim maps declared advertising
// sharing (q5_sell_share = "Yes — share for advertising only" / "Both")
// to targeted_advertising=true.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { shimLegacyIntake } from "../../../supabase/functions/_shared/cppa-risk-normalise.ts";

Deno.test("T1: 'share for advertising only' -> targeted_advertising=true", () => {
  const out = shimLegacyIntake({ q5_sell_share: "Yes — share for advertising only" });
  assertEquals(out.triggers.sells_or_shares_pi, true);
  assertEquals((out.triggers as any).targeted_advertising, true);
});

Deno.test("T1: 'Both' -> both flags true", () => {
  const out = shimLegacyIntake({ q5_sell_share: "Both" });
  assertEquals(out.triggers.sells_or_shares_pi, true);
  assertEquals((out.triggers as any).targeted_advertising, true);
});

Deno.test("T1: 'Yes — sell only' -> sells true, targeted_advertising false", () => {
  const out = shimLegacyIntake({ q5_sell_share: "Yes — sell only" });
  assertEquals(out.triggers.sells_or_shares_pi, true);
  assertEquals((out.triggers as any).targeted_advertising, false);
});

Deno.test("T1: 'No' -> both flags false", () => {
  const out = shimLegacyIntake({ q5_sell_share: "No" });
  assertEquals(out.triggers.sells_or_shares_pi, false);
  assertEquals((out.triggers as any).targeted_advertising, false);
});
