// ITEM 265 — GTM grader tests. Deterministic; no network.
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { evaluateGtm } from "../../../supabase/functions/replay-cppa-risk-harness/_local/ltp/replay/gtm-grader.ts";
import { GTM_MATERIALITY_REGISTER_VERSION } from "../../../supabase/functions/replay-cppa-risk-harness/_local/ltp/replay/gtm-materiality-register.ts";
import type { PerDocResult } from "../../../supabase/functions/_shared/ltp/replay/types.ts";

function doc(hard: string[], extra: Partial<PerDocResult["substance"]> = {}): PerDocResult {
  return {
    doc_id: "d1",
    provider_kind: "model",
    pass1_telemetry_summary: {
      ok: true, attempts: 1, write_around: false,
      grounded_note_replacement_rate: 0,
    },
    substance: {
      presence_rate: 0.5,
      present_factor_count: 8,
      factors_with_ledger_refs: 8,
      note_token_diversity: 40,
      action_kind_diversity_ok: true,
      golden_shape: { review_flag: false, shortfall_keys: [] },
      ...extra,
    },
    structure: { sections_emitted: 9, sections_omitted_by_class: {} },
    hard_failures: hard,
  };
}

Deno.test("GTM: clean doc → release", () => {
  const r = evaluateGtm(doc([]));
  assertEquals(r.verdict, "release");
  assertEquals(r.material_defects.length, 0);
  assertEquals(r.logged_defects.length, 0);
  assertEquals(r.unclassified.length, 0);
  assertEquals(r.register_version, GTM_MATERIALITY_REGISTER_VERSION);
});

Deno.test("GTM: only golden_shape shortfall → release_with_logged_defects", () => {
  const r = evaluateGtm(doc(["golden_shape:risk_assessment_by_activity"]));
  assertEquals(r.verdict, "release_with_logged_defects");
  assertEquals(r.logged_defects, ["golden_shape:risk_assessment_by_activity"]);
  assertEquals(r.material_defects.length, 0);
});

Deno.test("GTM: presence_rate failure → block", () => {
  const r = evaluateGtm(doc(["presence_rate:0.100<0.25"]));
  assertEquals(r.verdict, "block");
  assertEquals(r.material_defects, ["presence_rate:0.100<0.25"]);
});

Deno.test("GTM: unknown defect → block + unclassified (fail-closed)", () => {
  const r = evaluateGtm(doc(["some_new_gate:whatever"]));
  assertEquals(r.verdict, "block");
  assertEquals(r.unclassified, ["some_new_gate:whatever"]);
});

Deno.test("GTM: advisory band flags are logged, not material", () => {
  const r = evaluateGtm(doc([], { review_band_low: true }));
  assertEquals(r.verdict, "release_with_logged_defects");
  assertEquals(r.logged_defects, ["review_band_low"]);
});

Deno.test("GTM: deterministic-check failure via extra_defects → block", () => {
  const r = evaluateGtm(doc([]), { extra_defects: ["qc_r1_3:citation_pinpoint"] });
  assertEquals(r.verdict, "block");
  assertEquals(r.material_defects, ["qc_r1_3:citation_pinpoint"]);
});
