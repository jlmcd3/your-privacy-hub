/**
 * T-M2 (Item 222) — Section-Shard Registry unit test for cppa-risk.
 *
 * Proves 100% coverage: every top-level key of CPPA_RISK_REPORT_SCHEMA
 * has an owner in the registry, no extras, no duplicates. Also asserts
 * the two Engine-A HARVEST bindings are present, subordinated, and
 * NOT on any deletion list.
 */
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  CPPA_RISK_SECTION_SHARDS,
  CPPA_RISK_TEMPLATE_GAPS,
  coverageReport,
  schemaTopLevelKeys,
  shardKeys,
} from "../../../../../supabase/functions/_shared/ltp/section-shards/cppa-risk.ts";
import { RISK_CUT_RULINGS } from "../../../../../supabase/functions/_shared/ltp/content/risk-surface-map.ts";

Deno.test("registry: every schema top-level key has an owner", () => {
  const rep = coverageReport();
  assertEquals(rep.missing_from_registry, [], `Unmapped keys: ${rep.missing_from_registry.join(", ")}`);
});

Deno.test("registry: no extra keys beyond the schema allow-list", () => {
  const rep = coverageReport();
  assertEquals(rep.extra_in_registry, [], `Extra keys: ${rep.extra_in_registry.join(", ")}`);
});

Deno.test("registry: no duplicate keys", () => {
  const rep = coverageReport();
  assertEquals(rep.duplicates_in_registry, [], `Duplicates: ${rep.duplicates_in_registry.join(", ")}`);
});

Deno.test("registry: key count equals schema top-level count", () => {
  assertEquals(shardKeys().length, schemaTopLevelKeys().length);
});

Deno.test("registry: every entry has a non-empty template_ids list", () => {
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    assert(s.owner.template_ids.length >= 1, `empty template_ids on ${s.key}`);
  }
});

Deno.test("registry: every entry exposes a callable projection", () => {
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    assertEquals(typeof s.project, "function", `${s.key}: project is not a function`);
  }
});

Deno.test("harvest: opening_summary binds to T7 emitter, subordinated", () => {
  const s = CPPA_RISK_SECTION_SHARDS.find((x) => x.key === "opening_summary");
  assert(s, "opening_summary missing");
  assertEquals(s!.owner.kind, "harvest");
  assertEquals(s!.owner.subordinated, true);
  assert(/risk-opening\.ts/.test(s!.owner.emitter ?? ""), "T7 emitter not referenced");
});

Deno.test("harvest: submission_summary binds to § 7121(a) + § 7120 crosswalk", () => {
  const s = CPPA_RISK_SECTION_SHARDS.find((x) => x.key === "submission_summary");
  assert(s, "submission_summary missing");
  assertEquals(s!.owner.kind, "harvest");
  assertEquals(s!.owner.subordinated, true);
  assert(/cyber-audit-schedule/.test(s!.owner.emitter ?? ""));
  assert(/7120/.test(s!.owner.emitter ?? ""));
});

Deno.test("harvest: neither opening_summary nor submission_summary is on any CUT list", () => {
  const cutPaths = new Set(RISK_CUT_RULINGS.map((r) => r.path));
  assert(!cutPaths.has("opening_summary"), "opening_summary must not be on any deletion list");
  assert(!cutPaths.has("submission_summary"), "submission_summary must not be on any deletion list");
});

Deno.test("gap-report: shape is valid and refers only to registry keys", () => {
  const keys = new Set(shardKeys());
  for (const g of CPPA_RISK_TEMPLATE_GAPS) {
    assert(keys.has(g.key), `gap references unknown key ${g.key}`);
    assert(typeof g.note === "string" && g.note.length > 0);
  }
});
