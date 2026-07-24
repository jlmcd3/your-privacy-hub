// W15 CYBER-FACT-LEDGER-WIRING — colocated wiring tests (turn 3/3, S-B).
// Mirrors _w15_admt_fl.test.ts on the RUN-CPPA-CYBERSECURITY function.
// Guards the three wave-14/15 hallucination classes on cyber
// (contradiction, unsupported-positive, negative-from-silence), plus
// cross-attribution, telemetry placement, fail-open, and ordering
// (fact-ledger BEFORE the W15 cyber_va L1 stamp pass).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildFactLedger,
  enforceLedger,
  FACT_LEDGER_VERSION,
} from "../_shared/intake/fact-ledger.ts";
import { BUILD_STAMP } from "./index.ts";

Deno.test("W15-CYBER-FL: BUILD_STAMP restamped to w15-cyber-factledger@<iso>", () => {
  assert(
    /^w15-cyber-factledger@\d{4}-\d{2}-\d{2}T/.test(BUILD_STAMP),
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W15-CYBER-FL: index.ts imports fact-ledger and inserts pre-cyber-VA pass", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(src.includes("../_shared/intake/fact-ledger.ts"), "fact-ledger import missing");
  assert(src.includes("buildFactLedger("), "buildFactLedger call missing");
  assert(src.includes("enforceLedger("), "enforceLedger call missing");
  assert(src.includes("fact_ledger_pass"), "fact_ledger_pass telemetry log missing");
  assert(src.includes("fact_ledger_loaded"), "fact_ledger_loaded boot log missing");
  // Ordering: fact-ledger pass runs BEFORE the W15 cyber_va L1 stamp pass.
  const flIdx = src.indexOf("S-B INTAKE-FACT-LEDGER (sb-fl-w1) wiring");
  const vaIdx = src.indexOf("W15 CYBER-REGISTRY-WIRING — L1 verified-authority STAMP PASS");
  assert(flIdx > 0 && vaIdx > 0 && flIdx < vaIdx, "fact-ledger must run before cyber_va L1 stamp pass");
});

Deno.test("W15-CYBER-FL: silence never supports a negative assertion", () => {
  const ledger = buildFactLedger({ some_other_field: "x" });
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

Deno.test("W15-CYBER-FL: unsupported-positive claim downgraded with 'must be confirmed'", () => {
  const ledger = buildFactLedger({ some_other_field: "x" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "a documented MFA policy is enforced across all administrative accounts",
      field: "mfa_admin_policy",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.claims_downgraded, 1);
  assert(res.rewrites[0].to.includes("must be confirmed"));
});

Deno.test("W15-CYBER-FL: contradiction of denied fact is blocked with reconciliation rewrite", () => {
  const ledger = buildFactLedger({ mfa_admin_policy: "No" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "MFA is enforced on administrative accounts on the record",
      field: "mfa_admin_policy",
      direction: "positive",
    }],
  });
  assertEquals(res.counters.contradiction_blocked, 1);
  assert(res.rewrites[0].to.includes("not supported by the intake"));
});

Deno.test("W15-CYBER-FL: cross-attribution is blocked with reconciliation rewrite", () => {
  const ledger = buildFactLedger({
    authentication_control_basis: "168 admin plus 412 standard users on SSO",
    account_management_basis: "Not applicable — no formal account inventory maintained",
  });
  const res = enforceLedger({}, ledger, {
    claims: [{
      surfacePath: "controls[0]",
      text: "the account-management basis is 168 admin plus 412 standard users on sso",
      field: "account_management_basis",
      direction: "positive",
      needle: "168 admin plus 412 standard users on sso",
    }],
  });
  assertEquals(res.counters.cross_attribution_blocked, 1);
  assert(res.rewrites[0].to.includes("must be reconciled"));
});

Deno.test("W15-CYBER-FL: fail-open on null intake/report/claims", () => {
  const l = buildFactLedger(null as unknown as Record<string, unknown>);
  assertEquals(l.length, 0);
  const r1 = enforceLedger(null, [], { claims: [{ text: "x", direction: "positive" }] });
  assertEquals(r1.counters.claims_scanned, 0);
});

Deno.test("W15-CYBER-FL: counters land only under _meta.internal.fact_ledger; no _w* leak", () => {
  const ledger = buildFactLedger({ mfa_admin_policy: "No" });
  const report: Record<string, unknown> = { executive_summary: "…" };
  enforceLedger(report, ledger, {
    claims: [{
      text: "MFA is enforced on administrative accounts on the record",
      field: "mfa_admin_policy",
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
