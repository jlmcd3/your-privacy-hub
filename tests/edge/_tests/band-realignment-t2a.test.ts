// BAND-REALIGNMENT-T2A (2026-07-26) — pasted-green atomic test for the
// V2 semantic change end-to-end. Covers §4 T2A requirements (i)-(iv):
//   (i)   exhaustive V2 band → § 7121 cohort map (via classifyRevenueBand)
//   (ii)  legacy → V2 resolver on every REVENUE_LEGACY_MAP /
//         CONSUMER_LEGACY_MAP entry
//   (iii) `_meta.internal.band_legacy_ambiguous` stamped on every
//         ambiguous-legacy input via normaliseIntake / bandResolution
//   (iv)  contract-validator round-trip on golden fixtures (via
//         normaliseIntake — the only public entry the golden set traverses).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  REVENUE_BANDS_V2,
  CONSUMER_BANDS_V2,
  REVENUE_LEGACY_MAP,
  CONSUMER_LEGACY_MAP,
  resolveRevenueBand,
  resolveConsumerBand,
  isBandLegacyAmbiguous,
} from "../../../supabase/functions/_shared/bands/revenue-consumer.ts";
import { classifyRevenueBand } from "../../../supabase/functions/_shared/cppa-test-states.ts";
import { normaliseIntake } from "../../../supabase/functions/_shared/cppa-risk-normalise.ts";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

// (i) — exhaustive V2 revenue band → cohort map (matches classifier).
Deno.test("T2A (i) — every V2 revenue band resolves to exactly one § 7121 cohort", () => {
  const expected: Record<string, "2028-04-01" | "2029-04-01" | "2030-04-01"> = {
    "Under $25M":         "2030-04-01",
    "$25M to under $50M": "2030-04-01",
    "$50M to $100M":      "2029-04-01",
    "Over $100M":         "2028-04-01",
  };
  for (const band of REVENUE_BANDS_V2) {
    const cls = classifyRevenueBand(band);
    assertEquals(cls.audit_cohort, expected[band], `cohort mismatch for ${band}`);
    assertEquals(cls.label, band);
  }
});

// (ii) — legacy → V2 resolver on every entry of both maps.
Deno.test("T2A (ii) — REVENUE_LEGACY_MAP entries resolve identically via resolveRevenueBand", () => {
  for (const [legacy, expected] of Object.entries(REVENUE_LEGACY_MAP)) {
    assertEquals(resolveRevenueBand(legacy), expected, `mismatch for ${legacy}`);
  }
});

Deno.test("T2A (ii) — CONSUMER_LEGACY_MAP entries resolve identically via resolveConsumerBand", () => {
  for (const [legacy, expected] of Object.entries(CONSUMER_LEGACY_MAP)) {
    assertEquals(resolveConsumerBand(legacy), expected, `mismatch for ${legacy}`);
  }
});

// (iii) — normaliseIntake stamps band_legacy_ambiguous on every ambiguous legacy input.
Deno.test("T2A (iii) — every ambiguous legacy band stamps band_legacy_ambiguous=true", () => {
  const ambiguousRev = Object.entries(REVENUE_LEGACY_MAP).filter(([_, v]) => v === null).map(([k]) => k);
  const ambiguousCon = Object.entries(CONSUMER_LEGACY_MAP).filter(([_, v]) => v === null).map(([k]) => k);

  for (const q1 of ambiguousRev) {
    const { bandResolution } = normaliseIntake({ q1_revenue: q1 });
    assertEquals(bandResolution.q1_legacy_ambiguous, true, `q1=${q1} ambiguous flag`);
    assertEquals(bandResolution.q1_v1_to_v2_resolved, null, `q1=${q1} no v1->v2 stamp`);
    assertEquals(isBandLegacyAmbiguous(q1), true);
  }

  for (const q2 of ambiguousCon) {
    const { bandResolution } = normaliseIntake({ q2_consumers: q2 });
    assertEquals(bandResolution.q2_legacy_ambiguous, true, `q2=${q2} ambiguous flag`);
    assertEquals(bandResolution.q2_v1_to_v2_resolved, null, `q2=${q2} no v1->v2 stamp`);
  }
});

Deno.test("T2A (iii) — unambiguous legacy inputs stamp band_v1_to_v2_resolved with '<old> -> <new>'", () => {
  const unambRev = Object.entries(REVENUE_LEGACY_MAP).filter(([k, v]) => v !== null && k !== v);
  for (const [legacy, v2] of unambRev) {
    const { bandResolution } = normaliseIntake({ q1_revenue: legacy });
    assertEquals(bandResolution.q1_legacy_ambiguous, false);
    assertEquals(bandResolution.q1_v1_to_v2_resolved, `${legacy} -> ${v2}`);
  }
  const unambCon = Object.entries(CONSUMER_LEGACY_MAP).filter(([_, v]) => v !== null);
  for (const [legacy, v2] of unambCon) {
    const { bandResolution } = normaliseIntake({ q2_consumers: legacy });
    assertEquals(bandResolution.q2_legacy_ambiguous, false);
    assertEquals(bandResolution.q2_v1_to_v2_resolved, `${legacy} -> ${v2}`);
  }
});

Deno.test("T2A (iii) — V2 inputs emit NO v1->v2 resolution stamp and NO ambiguous flag", () => {
  for (const band of REVENUE_BANDS_V2) {
    const { bandResolution } = normaliseIntake({ q1_revenue: band });
    assertEquals(bandResolution.q1_v1_to_v2_resolved, null);
    assertEquals(bandResolution.q1_legacy_ambiguous, false);
  }
  for (const band of CONSUMER_BANDS_V2) {
    const { bandResolution } = normaliseIntake({ q2_consumers: band });
    assertEquals(bandResolution.q2_v1_to_v2_resolved, null);
    assertEquals(bandResolution.q2_legacy_ambiguous, false);
  }
});

// (iv) — golden fixtures round-trip cleanly through normaliseIntake and yield
// V2 band strings on content_detail.revenue_band, and the boundary-adversarial
// fixture retargets to the V2 "100,000 to under 250,000" label.
Deno.test("T2A (iv) — every golden fixture round-trips through normaliseIntake on V2 labels", () => {
  for (const golden of CPPA_RISK_GOLDEN) {
    const { intake, bandResolution } = normaliseIntake(golden.intake);
    // The v2/legacy resolver stamps must be defined on every intake.
    assertEquals(typeof bandResolution.q1_legacy_ambiguous, "boolean");
    assertEquals(typeof bandResolution.q2_legacy_ambiguous, "boolean");
    // For the retargeted goldens, q1/q2 are V2 already so no v1->v2 stamp.
    assertEquals(bandResolution.q1_v1_to_v2_resolved, null, `golden ${golden.id} q1 v1->v2 must be null`);
    assertEquals(bandResolution.q2_v1_to_v2_resolved, null, `golden ${golden.id} q2 v1->v2 must be null`);
    // Every retargeted golden's revenue_band label is a V2 label.
    const cd = intake.content_detail as Record<string, unknown>;
    if (typeof cd?.revenue_band === "string" && cd.revenue_band) {
      assertEquals(
        (REVENUE_BANDS_V2 as readonly string[]).includes(cd.revenue_band as string),
        true,
        `golden ${golden.id} revenue_band ${cd.revenue_band} must be a V2 label`,
      );
    }
  }
  // Boundary-adversarial fixture: consumer band must be the V2 boundary label.
  const boundary = CPPA_RISK_GOLDEN.find((g) => g.id === "risk-consumer-boundary-adversarial")!;
  assertEquals((boundary.intake as Record<string, unknown>).q2_consumers, "100,000 to under 250,000");
});
