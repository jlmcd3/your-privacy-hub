// LIA master review (2026-09-15, F03) — the classifier honours negation.
//
// The live observation: a monthly customer newsletter whose description said
// "It does not use health data, children's data, behavioural tracking, or
// automated decisions" classified as behavioural advertising (Weak) because
// "behavioural" and "tracking" scored despite sitting inside "does not use".
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyLiaUseCase, classifyLiaUseCaseDetailed } from "../../../supabase/functions/_shared/lia/lia-use-case-classifier.ts";
import { heuristicLiaStrength, precedentMatchesJurisdictions, selectLiaPrecedents } from "../../../supabase/functions/_shared/lia/lia-preview-selection.ts";

const HARBORLIGHT =
  "Harborlight Retail Ltd sends a monthly email offering similar household products to existing adult customers in Ireland. " +
  "The marketing team uses email addresses and purchase categories collected during checkout. It does not use health data, " +
  "children's data, behavioural tracking, or automated decisions. Customers can unsubscribe in each message.";

Deno.test("F03 — a negated activity does not score: the newsletter is direct marketing, not behavioural advertising", () => {
  const d = classifyLiaUseCaseDetailed(HARBORLIGHT);
  assertEquals(d.code, "direct_marketing");
  assert(d.negated.behavioral_advertising.includes("behavioural"), JSON.stringify(d.negated));
  assert(d.negated.behavioral_advertising.includes("tracking"), JSON.stringify(d.negated));
  assertEquals(d.matched.behavioral_advertising, []);
  assert(d.matched.direct_marketing.includes("marketing"));
});

Deno.test("F03 — the same words asserted DO score", () => {
  assertEquals(classifyLiaUseCase("We use behavioural tracking across sites to target advertising"), "behavioral_advertising");
});

Deno.test("F03 — a contrastive clause resets the negation: 'we do not track, but we do send a newsletter'", () => {
  const d = classifyLiaUseCaseDetailed("We do not use behavioural tracking, but we do send a promotional newsletter to customers.");
  assertEquals(d.code, "direct_marketing");
  assert(d.negated.behavioral_advertising.includes("tracking"));
});

Deno.test("F03 — 'no advertising use' in a security description stays negated (LIA 01 regression kept)", () => {
  const description =
    "Account-takeover prevention: we analyse device fingerprints, IP addresses and failed-login logs to detect " +
    "unauthorised access attempts against customer accounts. Alerts are reviewed by a human analyst. " +
    "Around 5,000 German adult customers; logs deleted after 30 days; no advertising use.";
  const d = classifyLiaUseCaseDetailed(description);
  assertEquals(d.code, "it_security");
  assert(d.negated.behavioral_advertising.includes("advertis"));
});

Deno.test("F03 — ties are reported, not hidden, and the first class in table order is chosen", () => {
  const d = classifyLiaUseCaseDetailed("Fraud screening of customer accounts");
  // fraud_prevention: "fraud" (1); contractual_administration: "account", "customer" (2) → no tie here.
  assertEquals(d.tie, false);
  const t = classifyLiaUseCaseDetailed("A marketing newsletter and a workplace staff survey");
  // direct_marketing: marketing, newsletter (2); employee_monitoring: workplace, staff (2) → tie.
  assertEquals(t.tie, true);
  assertEquals(t.candidates, ["direct_marketing", "employee_monitoring"]);
  assertEquals(t.code, "direct_marketing");
});

Deno.test("F03 — unrelated text is 'other' with no candidates", () => {
  const d = classifyLiaUseCaseDetailed("Something entirely unrelated");
  assertEquals(d.code, "other");
  assertEquals(d.candidates, []);
});

Deno.test("F04 — jurisdiction labels are normalised to tokens, never to the first word", () => {
  assert(precedentMatchesJurisdictions("Ireland (DPC)", ["EU (GDPR)"]));
  assert(precedentMatchesJurisdictions("United Kingdom", ["United Kingdom (UK GDPR)"]));
  assert(!precedentMatchesJurisdictions("United States", ["United Kingdom (UK GDPR)"]));
  assert(!precedentMatchesJurisdictions("United Kingdom", ["United States — Federal"]));
  assert(precedentMatchesJurisdictions("US (FTC)", ["United States — Federal"]));
  assert(!precedentMatchesJurisdictions("Australia", ["EU (GDPR)"]));
});

Deno.test("F04 — selection rates the pool it shows and states a jurisdiction fallback", () => {
  const pool = [
    { processing_activity: "Marketing newsletter to customers", outcome: "accepted", jurisdiction: "Australia", dpa_source: "OAIC", summary: "" },
    { processing_activity: "Promotional campaign emails", outcome: "rejected", jurisdiction: "Australia", dpa_source: "OAIC", summary: "" },
    { processing_activity: "Fraud screening", outcome: "accepted", jurisdiction: "Ireland", dpa_source: "DPC", summary: "" },
  ];
  const sel = selectLiaPrecedents({ useCase: "direct_marketing", jurisdictions: ["EU (GDPR)"], pool });
  assertEquals(sel.matched.length, 2);
  assertEquals(sel.preferred.length, 0);
  assertEquals(sel.method.jurisdiction_fallback, true);
  assert(sel.method.not_compared.length >= 3);
  const s = heuristicLiaStrength({ useCase: "direct_marketing", dataCategories: [], relationship: "Existing customer", selection: sel });
  assertEquals(s.pool, "all_jurisdictions");
  assertEquals(s.rating, "Moderate");
  assert(s.rationale.includes("none from a selected jurisdiction matched"), s.rationale);

  const sel2 = selectLiaPrecedents({ useCase: "direct_marketing", jurisdictions: ["Australia"], pool });
  assertEquals(sel2.preferred.length, 2);
  assertEquals(sel2.method.jurisdiction_fallback, false);
  const s2 = heuristicLiaStrength({ useCase: "direct_marketing", dataCategories: [], relationship: "Existing customer", selection: sel2 });
  assertEquals(s2.pool, "selected_jurisdictions");
  assertEquals(s2.accepted, 1);
  assertEquals(s2.rejected, 1);
});

Deno.test("F04 — the special-category rule still leads, and contradictory precedents are counted", () => {
  const sel = selectLiaPrecedents({ useCase: "direct_marketing", jurisdictions: [], pool: [] });
  const s = heuristicLiaStrength({ useCase: "direct_marketing", dataCategories: ["Health or medical data"], relationship: "", selection: sel });
  assertEquals(s.rating, "High Risk");
  assertEquals(s.basis, "special_category_rule");
});
