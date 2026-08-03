// W15 ADMT-FACT-LEDGER-WIRING — colocated wiring tests. Guards the three
// wave-14/15 hallucination classes on ADMT (contradiction,
// unsupported-positive, negative-from-silence), telemetry placement, and
// fail-open behaviour. Mirrors the RISK wiring test on the same module.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildFactLedger,
  enforceLedger,
  FACT_LEDGER_VERSION,
} from "../../../supabase/functions/_shared/intake/fact-ledger.ts";
import { BUILD_STAMP } from "../../../supabase/functions/run-admt-checker/index.ts";

Deno.test("W15-ADMT-FL: BUILD_STAMP restamped (accepts w15, w16-hotfix, or w19 fallback-join variants)", () => {
  assert(
    /^(w15-admt-factledger|w19-admt-turna|w20-admt-turna|w16-admt-flfix|w19-admt-fallbackjoin2|w23-admt-turna|w24-admt-attr|w24-admt-audit|w24-admt-h6|w25-admt-sanitizer|w26-admt-citation-audit|h7-admt-blanket-range|h7b-admt-citation-relabel|h6-admt-governing-anchor|w27-admt-upgrade3)@\d{4}-\d{2}-\d{2}T/.test(BUILD_STAMP),
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W15-ADMT-FL: index.ts imports fact-ledger and inserts pre-VA-stamp pass", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-admt-checker/index.ts", import.meta.url));
  assert(src.includes("../_shared/intake/fact-ledger.ts"), "fact-ledger import missing");
  assert(src.includes("buildFactLedger("), "buildFactLedger call missing");
  assert(src.includes("enforceLedger("), "enforceLedger call missing");
  assert(src.includes("fact_ledger_pass"), "fact_ledger_pass telemetry log missing");
  assert(src.includes("fact_ledger_loaded"), "fact_ledger_loaded boot log missing");
  const flIdx = src.indexOf("S-B INTAKE-FACT-LEDGER (sb-fl-w1) wiring");
  const vaIdx = src.indexOf("W9-ADMT-WIRE — L1 REGISTRY-STAMPED CITATIONS");
  assert(flIdx > 0 && vaIdx > 0 && flIdx < vaIdx, "fact-ledger must run before VA L1 stamp pass");
});

// W16-HOTFIX: field must be present in the ledger (as silent) for the
// negative-from-silence rule to fire. v2 rule: unresolvable field ⇒ SKIP.
Deno.test("W15-ADMT-FL: silence never supports a negative assertion (field in ledger as silent)", () => {
  const ledger = buildFactLedger({
    some_other_field: "x",
    trade_secret_carveout_policy: "",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "no trade-secret or security carve-out policy is documented",
      field: "trade_secret_carveout_policy",
      direction: "negative",
    }],
  });
  assertEquals(res.counters.negative_from_silence_blocked, 1);
  assert(res.rewrites[0].to.includes("must be confirmed"));
});

// W16-HOTFIX (WAVE-16 REGRESSION GUARD).
Deno.test("W15-ADMT-FL: unsupported-positive with UNRESOLVABLE field is SKIPPED (wave-16 guard)", () => {
  const ledger = buildFactLedger({ some_other_field: "x" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "a significant-decision profiling model is generating adverse-employment outcomes",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_field_unknown, 1);
});

// ── Contradiction ──────────────────────────────────────────────────────────
Deno.test("W15-ADMT-FL: contradiction of denied fact is blocked with reconciliation rewrite", () => {
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "profiling and inferences are generated on the record",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.contradiction_blocked, 1);
  assert(res.rewrites[0].to.includes("not supported by the intake"));
});

// ── Cross-attribution ──────────────────────────────────────────────────────
Deno.test("W15-ADMT-FL: cross-attribution is blocked with reconciliation rewrite", () => {
  const ledger = buildFactLedger({
    systematic_observation_basis: "Continuous video analytics of storefront",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      surfacePath: "notice_gaps[0]",
      text: "the sensitive-location basis is continuous video analytics of storefront",
      field: "sensitive_location_basis",
      direction: "positive",
      needle: "continuous video analytics of storefront",
    }],
  });
  assertEquals(res.counters.cross_attribution_blocked, 1);
  assert(res.rewrites[0].to.includes("must be reconciled"));
});

// ── Fail-open ──────────────────────────────────────────────────────────────
Deno.test("W15-ADMT-FL: fail-open on null intake/report/claims", () => {
  const l = buildFactLedger(null as unknown as Record<string, unknown>);
  assertEquals(l.length, 0);
  const r1 = enforceLedger(null, [], { claims: [{ text: "x", direction: "positive" }] });
  assertEquals(r1.counters.claims_scanned, 0);
});

// ── Telemetry placement guard ──────────────────────────────────────────────
Deno.test("W15-ADMT-FL: counters land only under _meta.internal.fact_ledger", () => {
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const report: Record<string, unknown> = { executive_summary: "…" };
  enforceLedger(report, ledger, {
    claims: [{
      text: "profiling and inferences are generated on the record",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  const topLeaks = Object.keys(report).filter((k) => k !== "_meta" && k.startsWith("_"));
  assertEquals(topLeaks, []);
  const leakW = Object.keys(report).filter((k) => /^_w\d+_/.test(k));
  assertEquals(leakW, []);
  const meta = report._meta as Record<string, unknown>;
  const internal = meta.internal as Record<string, unknown>;
  const fl = internal.fact_ledger as Record<string, unknown>;
  assertEquals(fl.version, FACT_LEDGER_VERSION);
  assertEquals(fl.contradiction_blocked, 1);
});

// ── Positive path passes unchanged ─────────────────────────────────────────
Deno.test("W15-ADMT-FL: claim matching an asserted fact passes unchanged", () => {
  const ledger = buildFactLedger({
    systematic_observation_basis: "Continuous video analytics of storefront",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "systematic observation is continuous video analytics of storefront",
      field: "systematic_observation_basis",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 0);
});
