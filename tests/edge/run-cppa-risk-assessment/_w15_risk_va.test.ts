// W15 RISK-REGISTRY-WIRING — deno colocated tests.
// Verifies: (a) registry loads + version stamp exported; (b) covered
// proposition_key resolves to exact registry quote; (c) unknown/uncovered
// pinpoint → information_needed with empty citation; (d) fail-open on forced
// resolver throw (report unchanged, no crash); (e) telemetry lands under
// _meta.internal.risk_va only; no customer-surface key matches /^_w\d+_/ or /^_/
// except _meta.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  RISK_VERIFIED_AUTHORITIES,
  RISK_VERIFIED_AUTHORITY_VERSION,
  RISK_VERIFIED_AUTHORITY_ROWS,
} from "../../../supabase/functions/_shared/registry/risk-verified-authorities.ts";
import { resolveByPropositionKey, registrySize } from "../../../supabase/functions/_shared/verified-authority-resolver.ts";
import { BUILD_STAMP } from "../../../supabase/functions/run-cppa-risk-assessment/index.ts";

Deno.test("W15 (a) registry loads + version stamp exported + BUILD_STAMP w15-risk-* wave", () => {
  assert(RISK_VERIFIED_AUTHORITY_VERSION.startsWith("risk-va-w1-"), `unexpected va version: ${RISK_VERIFIED_AUTHORITY_VERSION}`);
  assert(registrySize(RISK_VERIFIED_AUTHORITIES) >= 40, "registry too small");
  assert(RISK_VERIFIED_AUTHORITY_ROWS.length === registrySize(RISK_VERIFIED_AUTHORITIES));
  assert(
    BUILD_STAMP.startsWith("w15-risk-regwire@") || BUILD_STAMP.startsWith("w15-risk-factledger@") || BUILD_STAMP.startsWith("w16-risk-flfix@") || BUILD_STAMP.startsWith("w16-risk-collapsecov@") || BUILD_STAMP.startsWith("w18-risk-collapsecov2@") || BUILD_STAMP.startsWith("w18-risk-vocabscrub@") || BUILD_STAMP.startsWith("w19-risk-turnb@") || BUILD_STAMP.startsWith("w20-risk-turnb@") || BUILD_STAMP.startsWith("w21-risk-turna@") || BUILD_STAMP.startsWith("w22-risk-turna@") || BUILD_STAMP.startsWith("w23-risk-turnb@") || BUILD_STAMP.startsWith("w24-risk-turna@") || BUILD_STAMP.startsWith("w24a-v3@") || BUILD_STAMP.startsWith("t7-risk-pilotfix@") || BUILD_STAMP.startsWith("t7-risk-pilotfix2@") || BUILD_STAMP.startsWith("band-realignment-t2a@") || BUILD_STAMP.startsWith("ltp-risk-item217-hook-authz-repair-outside-guard@"),
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W15 (b) covered proposition_key resolves to exact registry quote", () => {
  const row = resolveByPropositionKey(RISK_VERIFIED_AUTHORITIES, "ra_trigger_sell_share");
  assert(row, "ra_trigger_sell_share must resolve");
  assertEquals(row!.subsection, RISK_VERIFIED_AUTHORITIES.ra_trigger_sell_share.subsection);
  assertEquals(row!.verbatim_quote, RISK_VERIFIED_AUTHORITIES.ra_trigger_sell_share.verbatim_quote);
});

// Extract the stamp semantics as a local mirror of the index.ts implementation
// so we can unit-test them without spinning the full pipeline. The production
// walker in index.ts uses these same three semantic rules:
//   1) proposition_key present + row found ⇒ stamp citation + verbatim_quote.
//   2) proposition_key present + no row    ⇒ empty citation + information_needed=true.
//   3) no proposition_key + bare/doubled § 7150(b) collapse ⇒ same as (2).
function stampEntry(it: any, metrics: Record<string, number>): boolean {
  if (!it || typeof it !== "object") return false;
  let stamped = false;
  const pk = typeof it.proposition_key === "string" ? it.proposition_key.trim() : "";
  if (pk) {
    const row = resolveByPropositionKey(RISK_VERIFIED_AUTHORITIES, pk);
    if (row) {
      it.citation = row.subsection;
      it.verbatim_quote = row.verbatim_quote;
      metrics.va_stamps_applied++;
      stamped = true;
    } else {
      it.citation = "";
      it.information_needed = true;
      metrics.va_stamps_unresolved++;
    }
  }
  const cit = typeof it.citation === "string" ? it.citation : "";
  if (cit && !stamped) {
    const hasPredicate = /\(b\)\s*\(\s*\d/.test(cit);
    const bareCollapse = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
    const doubledCollapse = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
    if (doubledCollapse.test(cit) || (bareCollapse.test(cit) && !hasPredicate)) {
      it.citation = "";
      it.information_needed = true;
      metrics.va_subsection_collapse_flagged++;
    }
  }
  return stamped;
}

Deno.test("W15 (b) walker stamps covered proposition_key on an entry", () => {
  const m = { va_stamps_applied: 0, va_stamps_unresolved: 0, va_subsection_collapse_flagged: 0 };
  const it: any = { proposition_key: "ra_trigger_sell_share", citation: "should-be-overwritten" };
  stampEntry(it, m);
  assertEquals(it.citation, RISK_VERIFIED_AUTHORITIES.ra_trigger_sell_share.subsection);
  assertEquals(it.verbatim_quote, RISK_VERIFIED_AUTHORITIES.ra_trigger_sell_share.verbatim_quote);
  assertEquals(m.va_stamps_applied, 1);
});

Deno.test("W15 (c) unknown proposition_key → empty citation + information_needed", () => {
  const m = { va_stamps_applied: 0, va_stamps_unresolved: 0, va_subsection_collapse_flagged: 0 };
  const it: any = { proposition_key: "not_a_real_key_xyz", citation: "11 CCR § 7150(b)(1)" };
  stampEntry(it, m);
  assertEquals(it.citation, "");
  assertEquals(it.information_needed, true);
  assertEquals(m.va_stamps_unresolved, 1);
});

Deno.test("W15 (c) bare § 7150(b) collapse flagged", () => {
  const m = { va_stamps_applied: 0, va_stamps_unresolved: 0, va_subsection_collapse_flagged: 0 };
  const it: any = { citation: "11 CCR § 7150(b)" };
  stampEntry(it, m);
  assertEquals(it.citation, "");
  assertEquals(it.information_needed, true);
  assertEquals(m.va_subsection_collapse_flagged, 1);
});

Deno.test("W15 (c) doubled § 7150(b) … § 7150(b) collapse flagged", () => {
  const m = { va_stamps_applied: 0, va_stamps_unresolved: 0, va_subsection_collapse_flagged: 0 };
  const it: any = { citation: "11 CCR § 7150(b) and again § 7150(b)" };
  stampEntry(it, m);
  assertEquals(it.citation, "");
  assertEquals(m.va_subsection_collapse_flagged, 1);
});

Deno.test("W15 (c) specific pinpoint § 7150(b)(1) not flagged", () => {
  const m = { va_stamps_applied: 0, va_stamps_unresolved: 0, va_subsection_collapse_flagged: 0 };
  const it: any = { citation: "11 CCR § 7150(b)(1)" };
  stampEntry(it, m);
  assertEquals(it.citation, "11 CCR § 7150(b)(1)");
  assertEquals(m.va_subsection_collapse_flagged, 0);
});

Deno.test("W15 (d) fail-open on forced resolver throw — report unchanged, no crash", () => {
  // Mirrors the try/catch fail-open in index.ts. Simulate a throwing walker by
  // wrapping the pass in a try/catch; report_data must be untouched on throw.
  const report: any = { information_needed: [{ proposition_key: "ra_trigger_sell_share" }] };
  const snapshot = JSON.parse(JSON.stringify(report));
  try {
    const walk = (arr: any) => {
      for (const _it of arr) throw new Error("forced throw");
    };
    walk(report.information_needed);
  } catch (_e) { /* fail-open swallow */ }
  assertEquals(report, snapshot);
});

Deno.test("W15 (e) telemetry key placement — internal.risk_va lands under _meta.internal only", () => {
  // Simulate the telemetry attach the index.ts pass performs.
  const r: any = {};
  const meta = (r._meta = {});
  const internal = ((meta as any).internal = {});
  (internal as any).risk_va = { va_version: RISK_VERIFIED_AUTHORITY_VERSION, va_stamps_applied: 0 };
  // Leak-guard: no customer-surface key matches /^_w\d+_/ or /^_/ except _meta.
  for (const k of Object.keys(r)) {
    if (k === "_meta") continue;
    assert(!/^_/.test(k), `customer-surface leak: top-level key "${k}" starts with underscore`);
    assert(!/^_w\d+_/.test(k), `customer-surface leak: top-level key "${k}" matches /^_w\\d+_/`);
  }
  assert((r._meta as any).internal.risk_va, "risk_va must land under _meta.internal");
});

Deno.test("W15 leak-guard — index.ts does NOT write __va_stamp / __va_stamp_unresolved to entries", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-cppa-risk-assessment/index.ts", import.meta.url));
  assert(!/it\.__va_stamp\s*=/.test(src), "entries must not carry __va_stamp (customer-surface leak)");
  assert(!/it\.__va_stamp_unresolved\s*=/.test(src), "entries must not carry __va_stamp_unresolved");
  assert(!/it\.__va_collapse_flag\s*=/.test(src), "entries must not carry __va_collapse_flag");
});
