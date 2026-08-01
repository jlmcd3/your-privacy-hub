// BIO-REG-W1 T2(c) D1 FIX — Washington REGISTERED-path unit test.
//
// Root cause (documented in check-biometric-compliance/index.ts near the
// new `if (isWA)` branch): `stressSection` had per-jurisdiction branches
// for IL/TX/CA/VA/EU/UK/FR/IE/ES/OtherUS/US but no `if (isWA)` branch, so
// jurisdictions like "Washington state, USA" fell through to the generic
// fallback prose and produced the 24.5 boilerplate score observed in the
// T2(c) evidence-gate batch (ec0df4c1) — the composer fell through to
// generic prose exactly as the CEO's suspect list called out.
//
// This test does NOT re-prove the pinpoint-in-verbatim-quote self-
// consistency contract (that is enforced elsewhere by the "for every row"
// registry test). It proves the narrower predicate the CEO asked for:
// the WA fixture's intake must select the expected WA rows via
// selectApplicableRows — i.e. the registry gate is closed on WA, not open.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  selectApplicableRows,
  resolveJurisdictions,
} from "../../../supabase/functions/check-biometric-compliance/_local/registry/biometric-select.ts";
import { BIOMETRIC_REGISTRY_VERSION } from "../../../supabase/functions/_shared/registry/biometric-statute-registry.ts";

// The WA golden fixture intake shape from _shared/golden/biometric-extra.ts
// (Wave-1 registered: Washington HB1493). We rebuild only the intake fields
// selectApplicableRows reads — no test coupling to unrelated fields.
const WA_FIXTURE_INTAKE = {
  jurisdictions: ["Washington state, USA"],
  biometricTypes: ["facial recognition"],
  generation_date: "2026-07-24",
};

Deno.test("BIO-REG-W1 T2(c) D1 — WA fixture resolves to us_wa_hb1493 with source=direct_selection", () => {
  const resolved = resolveJurisdictions(WA_FIXTURE_INTAKE);
  assertEquals(resolved.registered.length, 1, "expected exactly one registered jurisdiction");
  assertEquals(resolved.registered[0].jurisdiction_id, "us_wa_hb1493");
  assertEquals(resolved.registered[0].display, "Washington");
  assertEquals(resolved.registered[0].source, "direct_selection");
  assertEquals(resolved.namedButUnregistered.length, 0);
  assertEquals(resolved.otherUsStateSelectedButNoNames, false);
});

Deno.test("BIO-REG-W1 T2(c) D1 — WA fixture selects the expected RCW 19.375 rows", () => {
  const rows = selectApplicableRows(WA_FIXTURE_INTAKE);
  assert(rows.length > 0, "WA fixture must select at least one WA row (registry gate must not be closed on WA)");

  // Every selected row must be a WA row — no cross-jurisdiction leak.
  for (const r of rows) {
    assertEquals(r.jurisdiction_id, "us_wa_hb1493", `unexpected non-WA row selected: ${r.id}`);
    assertEquals(r.jurisdiction_display, "Washington");
    assertStringIncludes(r.statute_short, "RCW 19.375");
  }

  // The five Wave-1 WA pinpoints (definition, notice/consent, sale/disclosure,
  // security/retention, enforcement) must all be present so downstream
  // composition has the full RCW 19.375 slice.
  const pinpoints = new Set(rows.map((r) => r.pinpoint));
  const requiredPinpoints = [
    "RCW 19.375.010",
    "RCW 19.375.020",
    "RCW 19.375.020(3)",
    "RCW 19.375.020(4)",
    "RCW 19.375.030",
  ];
  for (const p of requiredPinpoints) {
    assert(
      pinpoints.has(p),
      `WA fixture missing required pinpoint ${p} — got: ${JSON.stringify([...pinpoints])}`,
    );
  }
});

Deno.test("BIO-REG-W1 T2(c) D1 — WA fixture is unaffected by generation_date after the WA effective date", () => {
  // Regression guard: predicates suspect list called out selectApplicableRows
  // date/predicate filtering excluding all WA rows. Assert the current-date
  // path selects the same WA row set as an explicit 2026 date.
  const rowsWithDate = selectApplicableRows(WA_FIXTURE_INTAKE);
  const rowsNoDate = selectApplicableRows({ ...WA_FIXTURE_INTAKE, generation_date: undefined });
  assertEquals(rowsWithDate.length, rowsNoDate.length, "date-defaulted selection must match explicit-date selection for WA");
});

Deno.test("BIO-REG-W1 T2(c) D1 — WA registry_version stamp is exported for envelope persistence (D2 guard)", () => {
  assert(BIOMETRIC_REGISTRY_VERSION.length > 0, "BIOMETRIC_REGISTRY_VERSION must be a non-empty exported string");
  assertStringIncludes(BIOMETRIC_REGISTRY_VERSION, "bio-reg-w1");
});
