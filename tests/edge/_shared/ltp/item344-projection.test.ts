// ITEM 344 — PROJECTION TESTS for the two Item 342 smoke findings.
//
// Finding (b): the five § 7152 analytic deliverables (`activity_analytics`)
// and the Item 341 `eu_persuasive_authority` section are DETERMINISTIC_ONLY
// plan keys. `derivePlan` seeded them; `applySingleWriterInjection` (the
// model/shipped path) did not, so both surfaces silently dropped out of every
// shipped LTP report while the shadow derive path stayed green.
//
// Finding (a): the § 7156(a) secondary-use segmentation section with its
// directive recommendation must reach the composed report on a COMPLETE
// record (one that actually reports secondary uses). Absent secondary rows
// the section is correctly omitted under the degradation law.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { applySingleWriterInjection } from "../../../../supabase/functions/_shared/ltp/pass1-llm.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";

const COMPLETE_INTAKE: Record<string, unknown> = {
  entity_name: "Acme, Inc.",
  subject_anchor: "California consumers using the tracking page",
  primary_activity_name: "Shipment-tracking advertising profiles",
  primary_activity_purpose:
    "We combine shipment-tracking events with device identifiers to build advertising profiles.",
  q1_revenue: "Over $100M",
  q2_consumers: "1,000,000 or more",
  q5_sell_share: "Both",
  q15_sensitive_pi: "Yes",
  q18_admt_use: "Yes",
  i1_processing_purpose: "Generate audience-segment scores used for bid eligibility.",
  i2_retention_period: "13 months from last engagement",
  has_secondary_uses: "Yes — the same data is used for other purposes",
  secondary_activities: [
    {
      name: "Lookalike modelling",
      purpose: "Marketing expansion",
      divergence: { purpose: "Different", data: "Same", retention: "Not sure" },
    },
  ],
};

function renderBoth() {
  const input = { intake: COMPLETE_INTAKE, report_data: {}, buildStamp: "item344-test" } as never;
  const derived = derivePlan(input);
  const injected = applySingleWriterInjection({}, input).plan;
  return {
    derive: assembleReport(derived as never, {}, { exitMode: "observe" }),
    injection: assembleReport(injected as never, {}, { exitMode: "observe" }),
  };
}

Deno.test("ITEM 344 (b) — activity_analytics ships on BOTH the derive and the model path", () => {
  const { derive, injection } = renderBoth();
  for (const [label, res] of Object.entries({ derive, injection })) {
    const aa = (res as { report: Record<string, unknown> }).report.activity_analytics;
    assert(Array.isArray(aa), `${label}: activity_analytics missing from the projected report`);
    assert((aa as unknown[]).length > 0, `${label}: activity_analytics is empty`);
  }
});

Deno.test("ITEM 344 (b) — all five § 7152 deliverables present per activity on the model path", () => {
  const { injection } = renderBoth();
  const rows = (injection as { report: Record<string, unknown> }).report
    .activity_analytics as Record<string, unknown>[];
  const required = [
    "necessity_analysis",
    "harm_causation",
    "safeguard_map",
    "weighing",
    "consequence",
  ];

  for (const row of rows) {
    const keys = Object.keys(row).join(" ").toLowerCase();
    for (const r of required) {
      assert(keys.includes(r), `activity_analytics row is missing the "${r}" deliverable`);
    }
  }
});

Deno.test("ITEM 344 (b) — eu_persuasive_authority ships on BOTH paths", () => {
  const { derive, injection } = renderBoth();
  for (const [label, res] of Object.entries({ derive, injection })) {
    const eu = (res as { report: Record<string, unknown> }).report.eu_persuasive_authority;
    assert(eu && typeof eu === "object", `${label}: eu_persuasive_authority missing`);
  }
});

Deno.test("ITEM 344 (a) — § 7156(a) section with a directive recommendation ships on a complete record", () => {
  const { derive, injection } = renderBoth();
  for (const [label, res] of Object.entries({ derive, injection })) {
    const scope = JSON.stringify(
      (res as { report: Record<string, unknown> }).report.scope_and_triggers ?? "",
    );
    assert(scope.includes("7156(a)"), `${label}: no § 7156(a) pinpoint in scope_and_triggers`);
    assert(
      /we recommend/i.test(scope),
      `${label}: § 7156(a) section carries no directive recommendation`,
    );
  }
});

Deno.test("ITEM 344 — derive and injection projections agree on the deterministic-only keys", () => {
  const { derive, injection } = renderBoth();
  const d = (derive as { report: Record<string, unknown> }).report;
  const i = (injection as { report: Record<string, unknown> }).report;
  assertEquals(
    JSON.stringify(d.activity_analytics),
    JSON.stringify(i.activity_analytics),
  );
  assertEquals(
    JSON.stringify(d.eu_persuasive_authority),
    JSON.stringify(i.eu_persuasive_authority),
  );
});
