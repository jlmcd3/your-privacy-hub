// ITEM 384 r4 — GLOBAL GATE-TRUE PLACEHOLDER SWEEP (the class-ender).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskProseGold,
  DEGRADED_OPENER_RES,
  isPurePlaceholder,
  sweepDegradedPlaceholders,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";

const PH =
  "We could not verify this item from the information provided; it is listed under information needed.";
const AFFIRMATIVE =
  "The record before this assessment is complete: every question the intake asks has been answered.";

// The three nests verified on doc ae70c6f0-3329-487d-981e-624eea58b155.
const liveShape = () => ({
  executive_summary: "The assessment determines the processing may proceed as documented.",
  risk_assessment_by_activity: [
    PH,
    "The record states that Sierra Outfitters, Inc considered less-intrusive alternatives.",
  ],
  activity_analytics: [{
    activity_name: "Fleet telematics",
    weighing: [
      { beneficiary_class: "consumer", case_for: "The benefit is specific.", case_against: PH },
      { beneficiary_class: "business", case_for: "Route optimisation.", case_against: PH },
    ],
    consequence: {
      decision: "reserved_insufficient_record",
      rule_ids: ["§ 7152(a)(7)"],
      reasons: ["A reason of substance that stands on the record as documented today."],
    },
  }],
  eu_persuasive_authority: {
    section_title: "Persuasive authority from EU practice",
    topics: [{
      guidance: [
        { citation: "EDPB WP248 rev.01, § III.B", verbatim_quote: "A quotation of real substance from the Board." },
        { citation: "EDPB WP248 rev.01, § IV", verbatim_quote: PH },
      ],
    }],
  },
  _meta: { note: PH },
});

const matchesAnywhere = (node: unknown, path = "$"): string[] => {
  if (typeof node === "string") {
    return DEGRADED_OPENER_RES.some((re) => re.test(node)) ? [path] : [];
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => matchesAnywhere(v, `${path}[${i}]`));
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) =>
      k === "_meta" ? [] : matchesAnywhere(v, `${path}.${k}`)
    );
  }
  return [];
};

Deno.test("r4 CLASS-ENDER: gate-TRUE full pass leaves zero placeholders outside _meta", () => {
  const report = liveShape() as unknown as Record<string, unknown>;
  const t = applyRiskProseGold(report, {
    recordComplete: true,
    affirmative: AFFIRMATIVE,
    reservedCount: 0,
  });
  assertEquals(matchesAnywhere(report), []);
  assertEquals(t.placeholders_swept >= 4, true);
  assertEquals(t.placeholder_paths.length <= 20, true);
  // _meta is never swept.
  assertEquals((report._meta as any).note, PH);
});

Deno.test("r4: risk_assessment_by_activity — element removed, order and siblings intact", () => {
  const report = liveShape() as unknown as Record<string, unknown>;
  sweepDegradedPlaceholders(report, true);
  assertEquals(report.risk_assessment_by_activity, [
    "The record states that Sierra Outfitters, Inc considered less-intrusive alternatives.",
  ]);
});

Deno.test("r4: activity_analytics — case_against field deleted, case_for untouched", () => {
  const report = liveShape() as unknown as Record<string, unknown>;
  sweepDegradedPlaceholders(report, true);
  const w = (report.activity_analytics as any[])[0].weighing;
  assertEquals(w.length, 2);
  assertEquals("case_against" in w[0], false);
  assertEquals(w[0].case_for, "The benefit is specific.");
  assertEquals(w[1].beneficiary_class, "business");
});

Deno.test("r4: eu_persuasive_authority — hollow guidance row dropped, real quote kept", () => {
  const report = liveShape() as unknown as Record<string, unknown>;
  sweepDegradedPlaceholders(report, true);
  const g = (report.eu_persuasive_authority as any).topics[0].guidance;
  assertEquals(g.length, 1);
  assertEquals(g[0].citation, "EDPB WP248 rev.01, § III.B");
});

Deno.test("r4: determination machinery is never swept", () => {
  const report = {
    activity_analytics: [{
      consequence: { decision: PH, rule_ids: [PH], outcome: PH, modifications: [PH], conditions: [PH] },
    }],
  } as unknown as Record<string, unknown>;
  const r = sweepDegradedPlaceholders(report, true);
  const c = (report.activity_analytics as any[])[0].consequence;
  assertEquals(c.decision, PH);
  assertEquals(c.rule_ids, [PH]);
  assertEquals(c.outcome, PH);
  assertEquals(c.modifications, [PH]);
  assertEquals(c.conditions, [PH]);
  assertEquals(r.swept, 0);
});

Deno.test("r4: gate-FALSE is byte-untouched", () => {
  const report = liveShape() as unknown as Record<string, unknown>;
  const snapshot = JSON.stringify(report);
  const r = sweepDegradedPlaceholders(report, false);
  assertEquals(JSON.stringify(report), snapshot);
  assertEquals(r.swept, 0);

  const viaEntry = liveShape() as unknown as Record<string, unknown>;
  const before = JSON.stringify(viaEntry.risk_assessment_by_activity);
  const t = applyRiskProseGold(viaEntry, {
    recordComplete: false,
    affirmative: AFFIRMATIVE,
    reservedCount: 0,
  });
  assertEquals(JSON.stringify(viaEntry.risk_assessment_by_activity), before);
  assertEquals(t.placeholders_swept, 0);
});

Deno.test("r4: a placeholder carrying substance is not pure and survives", () => {
  assertEquals(isPurePlaceholder(PH), true);
  assertEquals(
    isPurePlaceholder(`${PH} Precise geolocation is collected for route optimisation across the fleet.`),
    false,
  );
  const report = {
    risk_assessment_by_activity: [
      `${PH} Precise geolocation is collected for route optimisation across the fleet.`,
    ],
  } as unknown as Record<string, unknown>;
  sweepDegradedPlaceholders(report, true);
  assertEquals((report.risk_assessment_by_activity as string[]).length, 1);
});
