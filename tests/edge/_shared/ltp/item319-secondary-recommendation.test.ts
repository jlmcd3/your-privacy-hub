/**
 * ITEM 319 (PRIMARY ACTIVITY FEATURE, PROMPT A) — THRESHOLD LOCK.
 *
 * Pins the shipped § 7156(a) comparable-set recommendation threshold so it
 * cannot drift silently:
 *
 *   ANY-DIVERGENCE — one or more of the five § 7156(a)(1)-derived dimensions
 *   answered "Different" ⇒ recommend a SEPARATE risk assessment.
 *   All five "Same" ⇒ recommend addressing the activity within this single
 *   assessment.
 *   No "Different" but one or more "Not sure" ⇒ recommend resolving the open
 *   dimensions first (never a bundling green light).
 *
 * Scope: secondary-activity bundling ONLY. Primary-activity § 7152 analysis
 * (necessity / harm / safeguards / weighing / consequence) is out of scope and
 * is not exercised here.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { composeSection, secondaryRecommendation } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { renderTemplate } from "../../../../supabase/functions/_shared/ltp/pass2-render.ts";

const DIMS = ["data", "purpose", "systems", "people", "risks"] as const;

const all = (answer: string) =>
  Object.fromEntries(DIMS.map((d) => [d, answer])) as Record<string, string>;

const BASE_INTAKE: Record<string, unknown> = {
  entity_name: "ClearPath Credit Solutions, Inc.",
  q1_revenue: "$100M–$500M",
  q2_consumers: "250,000–1 million",
  q3_sector: "Financial services",
  q4_pi_categories: ["Financial information"],
  q5_sell_share: "Yes — share for advertising only",
  q15_sensitive_pi: "Yes",
  q18_admt_use: "Yes",
  i1_processing_purpose: "to underwrite personal-loan applications",
  i2_retention_period: "seven years from account closure",
  primary_activity_name: "credit-decisioning on loan applications",
  primary_activity_purpose: "assessing applicant creditworthiness for personal loans",
  has_secondary_uses: "Yes — there are other uses",
};

function renderScope(divergence: Record<string, string>): string {
  const intake = {
    ...BASE_INTAKE,
    secondary_activities: [
      { name: "marketing look-alike modelling", purpose: "prospecting", divergence },
    ],
  };
  const plan = derivePlan({ intake, report_data: {}, buildStamp: "item319@test" });
  return (composeSection("scope_and_triggers", plan) ?? [])
    .map((i) => renderTemplate(i.template_id, plan, i.ctx).text)
    .join("\n");
}

Deno.test("ITEM 319: threshold — no divergence recommends a single assessment", () => {
  assertEquals(secondaryRecommendation(all("Same")).verdict, "single");
  const text = renderScope(all("Same"));
  assert(
    text.includes(
      "Recommended: marketing look-alike modelling can be addressed within this single assessment.",
    ),
    text.slice(-800),
  );
});

Deno.test("ITEM 319: threshold — ANY single divergence recommends a separate assessment", () => {
  for (const dim of DIMS) {
    const divergence = { ...all("Same"), [dim]: "Different" };
    assertEquals(
      secondaryRecommendation(divergence).verdict,
      "separate",
      `one divergent dimension (${dim}) must trip the threshold`,
    );
    const text = renderScope(divergence);
    assert(
      text.includes(
        "Recommended: conduct a separate risk assessment for marketing look-alike modelling.",
      ),
      `divergence on ${dim} must recommend a separate assessment`,
    );
  }
});

Deno.test("ITEM 319: the diverging dimension(s) are named in the recommendation", () => {
  const text = renderScope({ ...all("Same"), purpose: "Different", people: "Different" });
  assert(text.includes("2 dimensions of the comparison diverge"), text.slice(-800));
  assert(text.includes("the purpose of the processing"), "diverging dimension must be named");
  assert(
    text.includes("the consumers whose information is processed"),
    "second diverging dimension must be named",
  );
});

Deno.test("ITEM 319: unresolved-only records never green-light bundling", () => {
  const divergence = { ...all("Same"), systems: "Not sure" };
  assertEquals(secondaryRecommendation(divergence).verdict, "unresolved");
  const text = renderScope(divergence);
  assert(text.includes("Recommended: resolve the open dimensions"), text.slice(-800));
  assert(
    !text.includes("can be addressed within this single assessment"),
    "an unresolved dimension must not produce a bundling recommendation",
  );
});

Deno.test("ITEM 319: recommendation is additive — the comparison is still shown", () => {
  const text = renderScope({ ...all("Same"), purpose: "Different" });
  for (const label of [
    "the personal information used",
    "the purpose of the processing",
    "the systems, technology, and service providers used",
    "the consumers whose information is processed",
    "the risks to consumers' privacy and the safeguards applied",
  ]) {
    assert(text.includes(label), `comparison dimension must still render: ${label}`);
  }
  assert(
    text.includes("recorded as the same as the assessed activity"),
    "per-dimension verdicts must still render",
  );
});

Deno.test("ITEM 319: recommendation framing is advisory, not statutory", () => {
  const text = renderScope({ ...all("Same"), purpose: "Different" });
  assert(text.includes("We recommend this because"), "must read as a recommendation");
  assert(
    text.includes(
      "this tool's operational recommendation on the record as submitted — it is not a statement of what the law requires, is not legal advice, and does not replace review by qualified counsel",
    ),
    "closing not-legal-advice line must render",
  );
  // The § 7156(a) DEFINITIONAL sentence stays the only stated legal standard
  // (Item 276 RIDER). No operational rule may be dressed up as statutory text.
  assert(
    text.includes(
      "\u201ca set of similar processing activities that present similar risks to consumers\u2019 privacy.\u201d",
    ),
    "definitional standard must still be quoted verbatim",
  );
  for (const forbidden of [
    "the law requires a separate",
    "§ 7156(a) requires a separate",
    "you must conduct a separate",
    "is required to conduct a separate",
  ]) {
    assert(!text.includes(forbidden), `must not state the recommendation as law: ${forbidden}`);
  }
});

Deno.test("ITEM 319: MANDATORY DEGRADATION — no secondary rows, no emission", () => {
  const plan = derivePlan({
    intake: { ...BASE_INTAKE, has_secondary_uses: "No" },
    report_data: {},
    buildStamp: "item319@test",
  });
  const emitted = (composeSection("scope_and_triggers", plan) ?? []).map((i) => i.template_id);
  assert(
    !emitted.includes("T.risk.scope.secondary_segmentation"),
    "segmentation item must not emit without secondary activities",
  );
});

// ITEM 336 (a) — MALFORMED DIVERGENCE VALUE MUST BE UNRESOLVED, NEVER "Same".
// Before this fix, a value the intake never emits (typo, stale enum, injected
// payload) fell through both filters and the record scored a bundling
// green-light on data nobody had actually compared.
Deno.test("ITEM 336: unrecognized divergence value counts as UNRESOLVED, not Same", () => {
  const r = secondaryRecommendation({
    data: "Same",
    purpose: "Same",
    systems: "maybe?",
    people: "Same",
    risks: "Same",
  });
  assertEquals(r.verdict, "unresolved");
  assertEquals(r.diverging.length, 0);
  assertEquals(r.unresolved, ["systems"]);
});

Deno.test("ITEM 336: a divergent dimension still wins over a malformed one", () => {
  const r = secondaryRecommendation({
    data: "Different",
    purpose: "Same",
    systems: "???",
    people: "Same",
    risks: "Same",
  });
  assertEquals(r.verdict, "separate");
  assertEquals(r.diverging, ["data"]);
});
