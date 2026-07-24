// S-B INTAKE-FACT-LEDGER — tests (Deno, colocated with _shared module).
//
// Mirrors sibling _shared test conventions (see _w12_c1_leak_guard.test.ts).
// Covers d73f4d44 (cross-attribution), 7bfb69fc (contradiction / inverse
// D2), and eefadb3f (fabricated-negative from silence), plus positive-path
// preservation, fail-open behavior, and telemetry placement.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildFactLedger,
  checkAssertion,
  enforceLedger,
  FACT_LEDGER_VERSION,
  rewriteUnsupported,
} from "./fact-ledger.ts";

Deno.test("version stamp is authoring turn tag", () => {
  assertEquals(FACT_LEDGER_VERSION, "sb-fl-w1-2026-07-24");
});

Deno.test("buildFactLedger classifies polarity and emits explicit silent rows", () => {
  const raw = {
    q5b_profiling_observation: "No",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
    systematic_observation_basis: "Continuous video analytics of storefront",
    trade_secret_carveout_policy: "", // silent
  };
  const ledger = buildFactLedger(raw);
  const byKey = Object.fromEntries(ledger.map((r) => [r.key, r]));
  assertEquals(byKey.q5b_profiling_observation.polarity, "denied");
  assertEquals(byKey.sensitive_location_basis.polarity, "not_applicable");
  assertEquals(byKey.systematic_observation_basis.polarity, "asserted");
  assertEquals(byKey.trade_secret_carveout_policy.polarity, "silent");
  // Verbatim preserved on every row (including empty for silent).
  assertEquals(byKey.sensitive_location_basis.verbatim, raw.sensitive_location_basis);
  assertEquals(byKey.trade_secret_carveout_policy.verbatim, "");
});

Deno.test("d73f4d44 — cross-attribution is blocked with reconciliation rewrite", () => {
  const ledger = buildFactLedger({
    systematic_observation_basis: "Continuous video analytics of storefront",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
  });
  const report: Record<string, unknown> = { executive_summary: "…" };
  const res = enforceLedger(report, ledger, {
    claims: [{
      surfacePath: "top_risks[0]",
      text: "the sensitive-location basis is continuous video analytics of storefront",
      field: "sensitive_location_basis",
      direction: "positive",
      needle: "continuous video analytics of storefront",
    }],
  });
  assertEquals(res.counters.cross_attribution_blocked, 1);
  assertEquals(res.counters.claims_downgraded, 1);
  assertEquals(res.rewrites.length, 1);
  assertEquals(res.rewrites[0].reason, "cross_attributed");
  assert(res.rewrites[0].to.includes("must be reconciled"));
});

Deno.test("7bfb69fc — contradiction of denied fact is blocked (inverse of D2)", () => {
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "profiling and inferences are generated on the record",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.contradiction_blocked, 1);
  assertEquals(res.rewrites[0].reason, "contradicted");
  assert(res.rewrites[0].to.includes("not supported by the intake"));
});

Deno.test("eefadb3f — silence never supports a negative assertion", () => {
  const ledger = buildFactLedger({ some_other_field: "x" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "no trade-secret or security carve-out policy is documented",
      field: "trade_secret_carveout_policy",
      direction: "negative",
    }],
  });
  assertEquals(res.counters.negative_from_silence_blocked, 1);
  assertEquals(res.rewrites[0].reason, "silence_supports_negative");
  assert(res.rewrites[0].to.includes("must be confirmed"));
});

Deno.test("positive path — claim matching an asserted fact passes unchanged", () => {
  const ledger = buildFactLedger({
    systematic_observation_basis: "Continuous video analytics of storefront",
  });
  const res = checkAssertion(ledger, {
    text: "systematic observation is continuous video analytics of storefront",
    field: "systematic_observation_basis",
    direction: "positive",
  });
  assert(res.ok);
  assertEquals(res.reason, "supported");
});

Deno.test("negative supported by explicit denial passes", () => {
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const res = checkAssertion(ledger, {
    text: "the record does not describe profiling",
    field: "q5b_profiling_observation",
    direction: "negative",
  });
  assert(res.ok);
  assertEquals(res.reason, "supported");
});

Deno.test("fail-open — malformed/null inputs never throw and return input unchanged", () => {
  // Null inputs — buildFactLedger returns [], enforceLedger returns zeroed counters.
  const l1 = buildFactLedger(null as unknown as Record<string, unknown>);
  assertEquals(l1.length, 0);
  const r1 = enforceLedger(null, [], { claims: [{ text: "x", direction: "positive" }] });
  assertEquals(r1.counters.claims_scanned, 0);
  // Malformed claim entry — inner try/catch fail-open.
  const r2 = enforceLedger({}, [], { claims: [null as unknown as { text: string; direction: "positive" }] });
  assertEquals(r2.counters.claims_scanned, 1);
  assertEquals(r2.rewrites.length, 1); // null claim yields unresolved rewrite
});

Deno.test("telemetry — counters land only under _meta.internal.fact_ledger, no leaked underscore keys", () => {
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const report: Record<string, unknown> = { executive_summary: "…" };
  enforceLedger(report, ledger, {
    claims: [{
      text: "profiling is generated",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  // No top-level _w* or fact_ledger key on customer surface.
  const topKeys = Object.keys(report);
  const leaked = topKeys.filter((k) => k !== "_meta" && k.startsWith("_"));
  assertEquals(leaked, []);
  assert(!("fact_ledger" in report));
  // Present under _meta.internal.fact_ledger with the version stamp.
  const meta = report._meta as Record<string, unknown>;
  const internal = meta.internal as Record<string, unknown>;
  const fl = internal.fact_ledger as Record<string, unknown>;
  assertEquals(fl.version, FACT_LEDGER_VERSION);
  assertEquals(fl.contradiction_blocked, 1);
});

Deno.test("rewriteUnsupported produces D2-consistent phrasing", () => {
  const s1 = rewriteUnsupported("X is true");
  assert(s1.includes("does not address") && s1.includes("must be confirmed"));
  const s2 = rewriteUnsupported("X is true", {
    key: "f", source_field: "f", verbatim: "No", value: "No", polarity: "denied",
  });
  assert(s2.includes(`"No"`) && s2.includes("must be reconciled"));
});
