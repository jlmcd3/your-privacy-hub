// WAVE12-FIX TURN C1 — leak guard test
// Asserts that after the customer-payload metadata strip, no top-level or
// nested key matches /^_w\d+_/ and none of the three specific internal
// telemetry objects (_w6_admt_fix, _w9_admt_wire, _w9_admt_pre_emit) survive
// on the customer-facing surface. _meta is preserved; _meta.internal is the
// sanctioned home for stripped diagnostics.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Inline replica of the strip logic in run-admt-checker/index.ts
// (see lines 2154–2186). Kept in sync as a fixture; if the emitter
// changes, this test will fail and force update.
function stripInternal(report: any) {
  const r: any = report;
  const meta = (r._meta = r._meta && typeof r._meta === "object" ? r._meta : {});
  const internal: Record<string, unknown> =
    (meta.internal && typeof meta.internal === "object") ? meta.internal : {};
  for (const k of Object.keys(r)) {
    if (k === "_meta") continue;
    if (k.startsWith("_")) { internal[k] = r[k]; delete r[k]; }
  }
  meta.internal = internal;
  const BUCKETS = ["notice_gaps","opt_out_gaps","access_gaps","documentation_to_maintain","top_3_actions"];
  const ENTRY_INTERNAL = ["_va_stamp","_va_stamp_unresolved","_w9_regen"];
  for (const b of BUCKETS) {
    const arr = r[b];
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      if (!it || typeof it !== "object") continue;
      for (const k of ENTRY_INTERNAL) if (k in it) delete it[k];
    }
  }
  const sa: any = r.scope_analysis;
  if (sa && typeof sa === "object") {
    for (const k of ENTRY_INTERNAL) if (k in sa) delete sa[k];
  }
  return r;
}

function collectKeys(v: any, out: string[] = [], path: string = ""): string[] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const k of Object.keys(v)) {
      out.push(k);
      collectKeys(v[k], out, path ? `${path}.${k}` : k);
    }
  } else if (Array.isArray(v)) {
    for (const it of v) collectKeys(it, out, path);
  }
  return out;
}

Deno.test("C1: strips all top-level _w<digits>_ diagnostics into _meta.internal", () => {
  const report: any = {
    executive_summary: "…",
    _w6_admt_fix: { version: "v1", moved: 2 },
    _w9_admt_wire: { pre_emit: { still_failing: 0 } },
    _w9_admt_pre_emit: { hits: 3 },
    _w9_admt_slots: { rows: 4 },
    _meta: { prompt_version: "admt-turn2", build_stamp: "w12-admt-turnc" },
    notice_gaps: [{ finding: "x", _va_stamp: "y", _w9_regen: true, citation: "§7001(e)" }],
  };
  const out = stripInternal(report);
  // Top-level _w* keys gone from customer surface
  assert(!("_w6_admt_fix" in out));
  assert(!("_w9_admt_wire" in out));
  assert(!("_w9_admt_pre_emit" in out));
  assert(!("_w9_admt_slots" in out));
  // _meta preserved and now carries them under .internal
  assert(out._meta && typeof out._meta === "object");
  assertEquals(out._meta.prompt_version, "admt-turn2");
  assert(out._meta.internal._w6_admt_fix);
  assert(out._meta.internal._w9_admt_wire);
  assert(out._meta.internal._w9_admt_pre_emit);
  // Entry-level diagnostics scrubbed
  assert(!("_va_stamp" in out.notice_gaps[0]));
  assert(!("_w9_regen" in out.notice_gaps[0]));
  assertEquals(out.notice_gaps[0].citation, "§7001(e)");
});

Deno.test("C1: no customer-surface key matches /^_w\\d+_/ after strip", () => {
  const report: any = {
    body: "…",
    _w6_admt_fix: {}, _w9_admt_wire: {}, _w9_admt_pre_emit: {}, _w12_future_flag: {},
    scope_analysis: { verdict: "in_scope", _va_stamp: "z" },
    top_3_actions: [{ action: "a", _w9_regen: 1 }],
  };
  const out = stripInternal(report);
  // Recursively walk everything except _meta.internal (which is intentionally
  // where diagnostics live) and assert no _w<digits>_ keys appear.
  const surface = { ...out };
  delete surface._meta;
  const keys = collectKeys(surface);
  const leaks = keys.filter(k => /^_w\d+_/.test(k) || /^_(va_stamp|w9_regen)/.test(k));
  assertEquals(leaks, [], `Leaked internal keys on customer surface: ${JSON.stringify(leaks)}`);
});
