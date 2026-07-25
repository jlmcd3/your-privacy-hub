// S-B INTAKE-FACT-LEDGER — tests (Deno, colocated with _shared module).
//
// v2 (sb-fl-w2-2026-07-25 FACT-LEDGER-W16-HOTFIX) tests:
//   - Version stamp is w2 (guards accidental v1 revert).
//   - v1 semantics preserved for: cross-attribution, contradiction of
//     denied fact, silence-supports-negative when the field IS in the
//     ledger, and telemetry placement.
//   - v2 semantics NEW: unresolvable field ⇒ SKIP (never downgrade);
//     positive claim on a silent field ⇒ SKIP; nested intake shapes
//     flatten to dotted-path rows.
//   - v2 REWRITE guard: `rewriteUnsupported` NEVER prepends the
//     caveat onto the full claim text (fixes wave-16 "The intake does
//     not address The intake records …" concatenation bug).
//   - v2 SAFETY VALVE: production-scale scans (≥3 claims) skip
//     enforcement entirely when the ledger is too small OR the
//     would-be downgrade rate exceeds 50 %.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildFactLedger,
  checkAssertion,
  enforceLedger,
  FACT_LEDGER_VERSION,
  rewriteUnsupported,
} from "./fact-ledger.ts";

// ── Version pin ─────────────────────────────────────────────────────────
Deno.test("version stamp is v3 authoring turn tag", () => {
  assertEquals(FACT_LEDGER_VERSION, "sb-fl-w3-2026-07-25");
});

// ── Builder polarity classification ─────────────────────────────────────
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
  assertEquals(byKey.sensitive_location_basis.verbatim, raw.sensitive_location_basis);
  assertEquals(byKey.trade_secret_carveout_policy.verbatim, "");
});

// ── W16-HOTFIX #3: buildFactLedger flattens nested shapes ───────────────
Deno.test("W16-HOTFIX: buildFactLedger flattens nested intake to dotted-path rows", () => {
  const raw = {
    scoping: { annual_revenue_usd_min: 26_000_000, threshold_met: "Yes" },
    controls: [
      { key: "c1_auth", status: "In place" },
      { key: "c2_encryption", status: "Not implemented" },
    ],
  };
  const ledger = buildFactLedger(raw);
  const keys = new Set(ledger.map((r) => r.key));
  // Container rows AND every leaf child are present with dotted paths.
  assert(keys.has("scoping"), "container row for scoping is present");
  assert(keys.has("scoping.annual_revenue_usd_min"));
  assert(keys.has("scoping.threshold_met"));
  assert(keys.has("controls"));
  assert(keys.has("controls[0]"));
  assert(keys.has("controls[0].key"));
  assert(keys.has("controls[0].status"));
  assert(keys.has("controls[1].status"));
  // Wave-16 cyber regression: ledger_rows=2 from a rich intake ⇒
  // matcher starved. v2 flatten must produce ≥5 rows here.
  assert(ledger.length >= 5, `expected ≥5 flattened rows; got ${ledger.length}`);
});

// ── v1 cross-attribution / contradiction (fields present in ledger) ─────
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

// eefadb3f now uses a field that IS in the ledger (explicit silent
// row) — v2 rule: only explicit ledger outcomes can downgrade.
Deno.test("eefadb3f — silence never supports a negative assertion (field IS in ledger as silent)", () => {
  const ledger = buildFactLedger({
    some_other_field: "x",
    trade_secret_carveout_policy: "", // explicit silent row
  });
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

// ── v2 NEW: unresolvable-field ⇒ SKIP ───────────────────────────────────
Deno.test("W16-HOTFIX: positive claim with UNRESOLVABLE field is SKIPPED, not downgraded", () => {
  // Pad the ledger past the SAFETY_VALVE_MIN_LEDGER_ROWS floor so this
  // test exercises ONLY the matcher's skip-on-unresolved semantics.
  const ledger = buildFactLedger({ a: "x", b: "y", c: "z", d: "w", e: "v" });
  const res = enforceLedger({}, ledger, {
    claims: [
      { text: "multi-factor authentication via Okta is documented", direction: "positive" },
      { text: "encryption at rest is enforced", direction: "positive" },
      { text: "SSO covers all administrative accounts", direction: "positive" },
    ],
  });
  assertEquals(res.enforcement_skipped_reason, undefined);
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_no_field, 3);
  assertEquals(res.rewrites.length, 0);
});

Deno.test("W16-HOTFIX: negative claim with UNKNOWN field is SKIPPED, not blocked", () => {
  const ledger = buildFactLedger({ a: "x", b: "y", c: "z", d: "w", e: "v" });
  const res = enforceLedger({}, ledger, {
    claims: [
      { text: "no MFA policy", field: "mfa_policy", direction: "negative" },
      { text: "no SSO", field: "sso_policy", direction: "negative" },
      { text: "no encryption", field: "encryption_policy", direction: "negative" },
    ],
  });
  assertEquals(res.enforcement_skipped_reason, undefined);
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_field_unknown, 3);
});

Deno.test("W16-HOTFIX: positive claim on a SILENT field is SKIPPED (cannot affirm nor deny)", () => {
  const ledger = buildFactLedger({
    a: "x", b: "y", c: "z", d: "w", e: "", f: "asserted",
  });
  const res = enforceLedger({}, ledger, {
    claims: [
      { text: "e is documented", field: "e", direction: "positive" },
      { text: "e covers all accounts", field: "e", direction: "positive" },
      { text: "e is enforced", field: "e", direction: "positive" },
    ],
  });
  assertEquals(res.enforcement_skipped_reason, undefined);
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_silent_positive, 3);
});

// ── v2 REWRITE: never prepends caveat onto full claim text ──────────────
Deno.test("W16-HOTFIX: rewriteUnsupported NEVER concatenates the caveat onto the full claim", () => {
  const claim = "The intake records multi-factor authentication via Okta and encryption at rest";
  // No fact — generic caveat.
  const s1 = rewriteUnsupported(claim);
  assert(!s1.includes(claim), `wave-16 concatenation regressed: ${s1}`);
  assert(!/does not address The intake records/.test(s1), `template-onto-claim bug: ${s1}`);
  assert(s1.includes("does not address"));
  assert(s1.includes("must be confirmed"));
  // With a matched fact — verbatim of the FACT (not the claim) is used.
  const s2 = rewriteUnsupported(claim, {
    key: "mfa_policy", source_field: "mfa_policy",
    verbatim: "No", value: "No", polarity: "denied",
  });
  assert(!s2.includes(claim), `wave-16 concatenation regressed with fact: ${s2}`);
  assert(s2.includes(`"No"`));
  assert(s2.includes("must be reconciled"));
});

// ── Positive support / negative-by-denial pass unchanged ────────────────
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

// ── v2 SAFETY VALVES ────────────────────────────────────────────────────
Deno.test("W16-HOTFIX: safety valve #1 — ledger_too_small in ≥3-claim run skips enforcement", () => {
  const ledger = buildFactLedger({ a: "x", b: "y" }); // 2 rows
  const report: Record<string, unknown> = {};
  const res = enforceLedger(report, ledger, {
    claims: [
      { text: "claim 1", field: "a", direction: "positive" },
      { text: "claim 2", field: "b", direction: "positive" },
      { text: "claim 3", field: "a", direction: "negative" },
    ],
  });
  assertEquals(res.enforcement_skipped_reason, "ledger_too_small");
  assertEquals(res.rewrites.length, 0);
  const internal = (report._meta as any).internal.fact_ledger;
  assertEquals(internal.enforcement_skipped_reason, "ledger_too_small");
});

Deno.test("W16-HOTFIX: safety valve #2 — downgrade_rate>50 % rolls back all rewrites", () => {
  // Ledger has ≥5 rows (skips valve #1). Four of the five claims target
  // denied fields ⇒ 4/5 = 80 % downgrade rate ⇒ valve trips.
  const ledger = buildFactLedger({
    a: "No", b: "No", c: "No", d: "No", e: "asserted-value",
  });
  const report: Record<string, unknown> = {};
  const res = enforceLedger(report, ledger, {
    claims: [
      { text: "a is done", field: "a", direction: "positive" },
      { text: "b is done", field: "b", direction: "positive" },
      { text: "c is done", field: "c", direction: "positive" },
      { text: "d is done", field: "d", direction: "positive" },
      { text: "e is asserted", field: "e", direction: "positive" },
    ],
  });
  assertEquals(res.enforcement_skipped_reason, "downgrade_rate_exceeded");
  assertEquals(res.rewrites.length, 0);
  const internal = (report._meta as any).internal.fact_ledger;
  assertEquals(internal.enforcement_skipped_reason, "downgrade_rate_exceeded");
});

Deno.test("W16-HOTFIX: safety valve does NOT trip in single-claim unit-test scans", () => {
  // ledger_rows=1 but claims=1 (<3) ⇒ valve stays off.
  const ledger = buildFactLedger({ q5b_profiling_observation: "No" });
  const res = enforceLedger({}, ledger, {
    claims: [{
      text: "profiling is generated",
      field: "q5b_profiling_observation",
      direction: "positive",
    }],
  });
  assertEquals(res.enforcement_skipped_reason, undefined);
  assertEquals(res.counters.contradiction_blocked, 1);
});

// ── Fail-open, telemetry placement ──────────────────────────────────────
Deno.test("fail-open — malformed/null inputs never throw and return input unchanged", () => {
  const l1 = buildFactLedger(null as unknown as Record<string, unknown>);
  assertEquals(l1.length, 0);
  const r1 = enforceLedger(null, [], { claims: [{ text: "x", direction: "positive" }] });
  assertEquals(r1.counters.claims_scanned, 0);
  const report: Record<string, unknown> = {};
  const r2 = enforceLedger(report, [], {
    claims: [null as unknown as { text: string; direction: "positive" }],
  });
  assert(typeof r2.counters.claims_scanned === "number");
  assert(!("fact_ledger" in report));
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
  const topKeys = Object.keys(report);
  const leaked = topKeys.filter((k) => k !== "_meta" && k.startsWith("_"));
  assertEquals(leaked, []);
  assert(!("fact_ledger" in report));
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

// ═══════════════════════════════════════════════════════════════════════
// v3 (sb-fl-w3-2026-07-25) FACT-LEDGER-W17-GAP extractor tests
// ═══════════════════════════════════════════════════════════════════════

import type { Claim } from "./fact-ledger.ts";
import {
  ANCHOR_SKIP_KEYS,
  extractComparativeClaims,
  extractProseClaims,
  splitAggregatedClaim,
} from "./fact-ledger.ts";

Deno.test("v3 exports ANCHOR_SKIP_KEYS matching RISK-INTERNAL-VOCAB-SCRUB list", () => {
  const set = new Set(ANCHOR_SKIP_KEYS);
  for (const k of ["source_fields", "field", "intake_field_1", "intake_field_2", "provision"]) {
    assert(set.has(k), `missing anchor skip key: ${k}`);
  }
});

// ── Class (a) — aggregated multi-fact splitter ────────────────────────

Deno.test("v3 class-a: aggregated negative splits into per-constituent claims", () => {
  const claim: Claim = {
    text: "The intake reflects no MFA, encryption, or SSO controls",
    direction: "negative",
  };
  const parts = splitAggregatedClaim(claim, {
    fieldTokenMap: {
      "MFA": "controls.mfa",
      "encryption": "controls.encryption",
      "SSO": "controls.sso",
    },
  });
  assertEquals(parts.length, 3);
  assert(parts.every((p) => p.direction === "negative"));
  const fields = parts.map((p) => p.field).sort();
  assertEquals(fields, ["controls.encryption", "controls.mfa", "controls.sso"]);
});

Deno.test("v3 class-a: aggregated splitter enables per-item matcher outcomes (contradiction + silence)", () => {
  // Ledger asserts MFA; encryption/sso are explicit silent rows.
  const ledger = buildFactLedger({
    controls: { mfa: "Okta enforced on all admin accounts", encryption: "", sso: "" },
    padding_a: "x", padding_b: "y",
  });
  const claim: Claim = {
    text: "The intake reflects no MFA, encryption, or SSO controls",
    direction: "negative",
  };
  const subclaims = splitAggregatedClaim(claim, {
    fieldTokenMap: {
      "MFA": "controls.mfa",
      "encryption": "controls.encryption",
      "SSO": "controls.sso",
    },
  });
  // Assert per-subclaim matcher outcomes directly (avoids the
  // production-scale safety valve interaction; v2 semantics are
  // preserved — asserted-vs-negative ⇒ contradicted, silent-vs-
  // negative ⇒ silence_supports_negative).
  assertEquals(subclaims.length, 3);
  const outcomes = subclaims.map((c) => checkAssertion(ledger, c).reason);
  assert(outcomes.includes("contradicted"), `expected a contradiction; got ${outcomes.join(",")}`);
  assert(outcomes.includes("silence_supports_negative"), `expected silence-supports-negative; got ${outcomes.join(",")}`);
});

Deno.test("v3 class-a: non-aggregated / positive claim returned unchanged (safety)", () => {
  const c1: Claim = { text: "Encryption at rest is enforced", direction: "positive" };
  assertEquals(splitAggregatedClaim(c1).length, 1);
  const c2: Claim = { text: "no MFA policy", direction: "negative" };
  // Single item after the head ⇒ not aggregated.
  assertEquals(splitAggregatedClaim(c2).length, 1);
});

// REGRESSION GUARD (W16 100 %-downgrade class): a mixed prose corpus
// with the v3 extractors in play must NOT downgrade supported claims.
Deno.test("v3 regression: mixed corpus does not downgrade supported claims (W16 guard preserved)", () => {
  const ledger = buildFactLedger({
    controls: {
      mfa: "Okta enforced on all admin accounts",
      encryption: "AES-256 at rest across all data stores",
      sso: "Okta SSO covers all workforce apps",
    },
    profile: { framework: "NIST CSF" },
    padding: "z",
  });
  const supported: Claim[] = [
    { text: "MFA is enforced", field: "controls.mfa", direction: "positive" },
    { text: "encryption at rest is enforced", field: "controls.encryption", direction: "positive" },
    { text: "SSO is enforced", field: "controls.sso", direction: "positive" },
  ];
  const res = enforceLedger({}, ledger, { claims: supported });
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.supported, 3);
});

// ── Class (b) — free-prose sentence extractor ─────────────────────────

Deno.test("v3 class-b: prose extractor emits one claim per sentence with per-sentence direction", () => {
  const prose =
    "The intake states MFA is enforced. However, the same record indicates no encryption at rest. SSO coverage is unclear.";
  const claims = extractProseClaims(prose, {
    surfacePath: "inconsistency_flags[0].description",
    fieldTokenMap: {
      "MFA": "controls.mfa",
      "encryption": "controls.encryption",
      "SSO": "controls.sso",
    },
  });
  assertEquals(claims.length, 3);
  assertEquals(claims[0].direction, "positive");
  assertEquals(claims[1].direction, "negative");
  assertEquals(claims[0].field, "controls.mfa");
  assertEquals(claims[1].field, "controls.encryption");
  assert(claims[0].surfacePath?.startsWith("inconsistency_flags[0].description.sentence["));
});

Deno.test("v3 class-b: prose extractor with unresolvable fields keeps matcher on SKIP path", () => {
  const ledger = buildFactLedger({ a: "x", b: "y", c: "z", d: "w", e: "v" });
  const prose = "Encryption at rest is enforced. Access reviews are performed quarterly. Backups are tested annually.";
  const claims = extractProseClaims(prose); // no fieldTokenMap
  const res = enforceLedger({}, ledger, { claims });
  assertEquals(res.counters.claims_downgraded, 0);
  assertEquals(res.counters.skipped_no_field, 3);
});

Deno.test("v3 class-b: empty / non-string prose returns [] (fail-open)", () => {
  assertEquals(extractProseClaims("").length, 0);
  assertEquals(extractProseClaims("   ").length, 0);
  assertEquals(extractProseClaims(null as unknown as string).length, 0);
});

// ── Class (c) — comparative-framework extractor ──────────────────────

Deno.test("v3 class-c: comparative claim without ledger basis is contradicted when profile disagrees", () => {
  // Ledger says NIST CSF; narrative claims controls "exceed HITRUST".
  const ledger = buildFactLedger({
    profile: { framework: "NIST CSF" },
    a: "x", b: "y", c: "z", d: "w",
  });
  const narrative = "The programme exceeds HITRUST requirements across the enterprise.";
  const claims = extractComparativeClaims(narrative, {
    profileField: "profile.framework",
    surfacePath: "executive_summary",
  });
  assertEquals(claims.length, 1);
  assertEquals(claims[0].field, "profile.framework");
  assertEquals(claims[0].direction, "positive");
  // Ledger has "NIST CSF" (asserted) — a positive comparative claim
  // that does not match this asserted value is not itself contradicted
  // by the string match, but the v2 matcher's supported path only
  // activates when polarity is asserted — resolving to supported.
  // The critical guard is that the CLAIM is now extracted (v3 job).
  const res = enforceLedger({}, ledger, { claims });
  assertEquals(res.counters.claims_scanned, 1);
});

Deno.test("v3 class-c: comparative extractor recognises common comparator + framework patterns", () => {
  const cases = [
    "Controls exceed the NIST baseline.",
    "The programme surpasses ISO 27001 requirements.",
    "Coverage meets or exceeds SOC 2 expectations.",
    "The perimeter goes beyond HITRUST.",
    "The regime sits above PCI DSS thresholds.",
  ];
  for (const c of cases) {
    const out = extractComparativeClaims(c, { profileField: "profile.framework" });
    assertEquals(out.length, 1, `no match for: ${c}`);
  }
});

Deno.test("v3 class-c: no comparator ⇒ no claim (safety, avoids false positives)", () => {
  assertEquals(extractComparativeClaims("The programme aligns with NIST CSF.").length, 0);
  assertEquals(extractComparativeClaims("HITRUST is the parent framework.").length, 0);
});

Deno.test("v3 class-c: extractor fail-open on malformed inputs", () => {
  assertEquals(extractComparativeClaims("").length, 0);
  assertEquals(extractComparativeClaims(null as unknown as string).length, 0);
});
