// DOC 237 (2026-09-09) — CPPA RISK DARK MODE, the parts doc 231's zero-call
// suite asserted in a comment but never tested.
//
// Doc 231's suite proves `attachRiskHookSelection` short-circuits with the
// flag off. It does NOT prove the `report_data` attachment point is dark:
// `finalizeCppaRiskPayload` wrote `_meta.internal.risk_v3 = {enabled:false,…}`
// UNCONDITIONALLY, and `serializeCustomerReport` keeps `_meta.internal`, so
// the persisted report_data was NOT byte-identical to its pre-build bytes
// with the flag off — the one thing the dark-mode law forbids, and the one
// thing DPIA's/ADMT's/LIA's own record blocks all get right (written only
// under the flag). Fixed in `attachRiskV3Record` (generate-cppa-risk.ts);
// this file pins it, mirroring DPIA's "true no-op AND does-append" pair.
//
// It also adds the static call-site containment proof DPIA and ADMT both
// carry and Risk lacked: the ONE `invokeGated("classify-propositions")` in
// this product's tree sits after the `RISK_V3_ENABLED` short-circuit, and
// `generate-cppa-risk.ts` gates its own V3 pre-computations on the same
// conditions the selection short-circuits on.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachRiskV3Record } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import type { RiskV3SelectionRecord } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-v3-selection.ts";

const DISABLED: RiskV3SelectionRecord = {
  enabled: false, hooks_available: 0, generation_no: null, cap: null,
  calls_this_generation: 0, considered: [], applications: [], information_needed_entries: [], error: null,
};

const ENABLED: RiskV3SelectionRecord = { ...DISABLED, enabled: true, generation_no: 1, cap: 8 };

// ── 1. The record block is a true no-op with the flag off ────────────────

Deno.test("doc237 — attachRiskV3Record: no record / enabled:false leaves report BYTE-UNTOUCHED (no _meta, no internal, no risk_v3 key created)", () => {
  for (const riskV3 of [undefined, null, DISABLED]) {
    const report: Record<string, unknown> = { schema_version: "1", information_needed: ["x"] };
    const before = JSON.stringify(report);
    assertEquals(attachRiskV3Record(report, riskV3), false);
    assertEquals(JSON.stringify(report), before);
    assertEquals("_meta" in report, false);
  }
});

Deno.test("doc237 — attachRiskV3Record: an existing _meta.internal is left byte-identical with the flag off (the pre-build report_data shape)", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { engine_path: "ltp", risk_refinement: { enabled: false } }, other: 1 },
  };
  const before = JSON.stringify(report);
  attachRiskV3Record(report, DISABLED);
  assertEquals(JSON.stringify(report), before);
  assertEquals("risk_v3" in (report._meta as Record<string, unknown>).internal as Record<string, unknown>, false);
});

// ── 2. …and DOES write when the selection ran enabled (the no-op is real) ─

Deno.test("doc237 — attachRiskV3Record: enabled:true writes _meta.internal.risk_v3 and preserves every existing _meta.internal key", () => {
  const report: Record<string, unknown> = { _meta: { internal: { engine_path: "ltp" } } };
  assertEquals(attachRiskV3Record(report, ENABLED), true);
  const internal = (report._meta as Record<string, unknown>).internal as Record<string, unknown>;
  assertEquals(internal.engine_path, "ltp");
  assertEquals(internal.risk_v3, ENABLED);
});

Deno.test("doc237 — attachRiskV3Record: enabled:true on a report with no _meta creates the block (never throws on a bare report)", () => {
  const report: Record<string, unknown> = {};
  assertEquals(attachRiskV3Record(report, ENABLED), true);
  assertEquals(((report._meta as Record<string, unknown>).internal as Record<string, unknown>).risk_v3, ENABLED);
});

// ── 3. Static call-site containment ──────────────────────────────────────

const ROOT = new URL("../../../supabase/functions/run-cppa-risk-assessment-v2/", import.meta.url);

// File URLs throughout (never `.pathname`): on Windows a pathname reads
// `/C:/…`, which Deno.readTextFile(string) rejects.
async function walk(dir: URL, out: URL[] = []): Promise<URL[]> {
  for await (const entry of Deno.readDir(dir)) {
    const child = new URL(entry.isDirectory ? `${entry.name}/` : entry.name, dir);
    if (entry.isDirectory) await walk(child, out);
    else if (entry.name.endsWith(".ts")) out.push(child);
  }
  return out;
}

Deno.test("doc237 — the ONE classify-propositions call in run-cppa-risk-assessment-v2 lives in risk-v3-selection.ts, after the RISK_V3_ENABLED short-circuit", async () => {
  const files = await walk(ROOT);
  const callers: URL[] = [];
  for (const url of files) {
    const src = await Deno.readTextFile(url);
    if (/invokeGated\(\s*["']classify-propositions["']/.test(src)) callers.push(url);
  }
  assertEquals(callers.length, 1, `expected exactly one classify-propositions call site, found: ${callers.map((u) => u.href).join(", ")}`);
  assert(callers[0].href.endsWith("/_local/ltp/risk-v3-selection.ts"), callers[0].href);

  const src = await Deno.readTextFile(callers[0]);
  const guard = src.indexOf("if (!RISK_V3_ENABLED) return");
  const emptyGuard = src.indexOf("if (RISK_HOOKS.length === 0) return");
  const call = src.search(/invokeGated\(\s*["']classify-propositions["']/);
  assert(guard >= 0 && emptyGuard >= 0 && call >= 0, "guards / call not found");
  assert(guard < call && emptyGuard < call, "both short-circuits must precede the classify-propositions call");
});

Deno.test("doc237 — generate-cppa-risk.ts gates its V3 pre-computations on RISK_V3_ENABLED && RISK_HOOKS.length > 0 and writes the record block only through attachRiskV3Record", async () => {
  const src = await Deno.readTextFile(new URL("_local/ltp/generate-cppa-risk.ts", ROOT));
  assert(src.includes("const riskV3Live = RISK_V3_ENABLED && RISK_HOOKS.length > 0;"), "the live gate must exist");
  assert(src.includes("riskV3Live ? riskDeterminativeSourceIds("), "determinative ids must be gated");
  assert(src.includes("riskV3Live ? riskPersuasiveRankedSourceIds("), "ranked ids must be gated");
  // No other write of the record block survives in this file.
  const writes = [...src.matchAll(/internal\.risk_v3\s*=/g)];
  assertEquals(writes.length, 1, "exactly one `internal.risk_v3 =` — inside attachRiskV3Record");
  const fn = src.indexOf("export function attachRiskV3Record(");
  assert(fn >= 0 && writes[0].index! > fn, "the one write must be inside attachRiskV3Record");
});
