// W15 RISK-FACT-LEDGER-WIRING — colocated wiring tests. Guards the three
// wave-15 hallucination classes (contradiction, unsupported-positive,
// negative-from-silence), telemetry placement, and fail-open behaviour.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildFactLedger,
  enforceLedger,
  FACT_LEDGER_VERSION,
} from "../_shared/intake/fact-ledger.ts";
import { BUILD_STAMP } from "./index.ts";

Deno.test("W15-FL: BUILD_STAMP restamped (accepts w15 or later hotfix variants)", () => {
  assert(
    /^(w15-risk-factledger|w16-risk-flfix|w16-risk-collapsecov|w18-risk-collapsecov2|w18-risk-vocabscrub|w19-risk-turnb|w20-risk-turnb)@\d{4}-\d{2}-\d{2}T/.test(BUILD_STAMP),
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W15-FL: index.ts imports fact-ledger and inserts pre-VA-stamp pass", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(src.includes("../_shared/intake/fact-ledger.ts"), "fact-ledger import missing");
  assert(src.includes("buildFactLedger("), "buildFactLedger call missing");
  assert(src.includes("enforceLedger("), "enforceLedger call missing");
  assert(src.includes("fact_ledger_pass"), "fact_ledger_pass telemetry log missing");
  assert(src.includes("fact_ledger_loaded"), "fact_ledger_loaded boot log missing");
  const flIdx = src.indexOf("S-B INTAKE-FACT-LEDGER (sb-fl-w1) wiring");
  const vaIdx = src.indexOf("W15 RISK-REGISTRY-WIRING — L1 REGISTRY-STAMPED CITATIONS pass");
  assert(flIdx > 0 && vaIdx > 0 && flIdx < vaIdx, "fact-ledger must run before risk_va stamp pass");
});

// ── Class-1 (contradiction, wave-15 sensitive-location) ────────────────────
Deno.test("W15-FL class-1: contradiction of denied fact is blocked with reconciliation rewrite", () => {
  const intake = {
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
  };
  const ledger = buildFactLedger(intake);
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "the sensitive-location trigger applies to this processing",
      field: "sensitive_location_basis",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 1);
  assert(res.rewrites[0].to.length > 0);
});

// W16-HOTFIX (WAVE-16 REGRESSION GUARD): unresolvable field ⇒ SKIP.
Deno.test("W15-FL class-2/3: unsupported-positive with UNRESOLVABLE field is SKIPPED (wave-16 guard)", () => {
  const ledger = buildFactLedger({ some_other_field: "x" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "worker/applicant adverse-employment outcomes are projected",
      field: "worker_impact_field",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_field_unknown, 1);
});

// W16-HOTFIX: field must be present in the ledger as silent.
Deno.test("W15-FL: silence never supports a negative assertion (field in ledger as silent)", () => {
  const ledger = buildFactLedger({
    some_other_field: "x",
    free_tier_projection: "",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "no tier-assignment or feature-availability projection is documented",
      field: "free_tier_projection",
      direction: "negative",
    }],
  });
  assertEquals(res.counters.negative_from_silence_blocked, 1);
});

Deno.test("W15-FL positive path: claim matching an asserted fact passes unchanged", () => {
  const ledger = buildFactLedger({
    i1_processing_purpose: "Continuous video analytics of storefront",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "the processing purpose is continuous video analytics of storefront",
      field: "i1_processing_purpose",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 0);
});

// ── Fail-open ──────────────────────────────────────────────────────────────
Deno.test("W15-FL fail-open: null intake/report/claims never throw", () => {
  const l = buildFactLedger(null as unknown as Record<string, unknown>);
  assertEquals(l.length, 0);
  const r1 = enforceLedger(null, [], { claims: [{ text: "x", direction: "positive" }] });
  assertEquals(r1.counters.claims_scanned, 0);
  const report: Record<string, unknown> = {};
  const r2 = enforceLedger(report, [], {
    claims: [null as unknown as { text: string; direction: "positive" }],
  });
  assert(typeof r2.counters.claims_scanned === "number");
});

// ── Telemetry placement guard ──────────────────────────────────────────────
Deno.test("W15-FL telemetry: counters land only under _meta.internal.fact_ledger", () => {
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
  const meta = report._meta as Record<string, unknown>;
  const internal = meta.internal as Record<string, unknown>;
  const fl = internal.fact_ledger as Record<string, unknown>;
  assertEquals(fl.version, FACT_LEDGER_VERSION);
});
