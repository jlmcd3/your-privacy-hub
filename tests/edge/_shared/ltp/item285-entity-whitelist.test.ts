/**
 * ITEM 285 — 2R ENTITY-WHITELIST BUILDER FIX (Item 283 N2 / F7).
 *
 * Regression fixture reproducing the batch-1R doc `278d0608` reject:
 *   entity_whitelist / entity_not_in_plan
 *   evidence ["Ltd","SaaS","Cascade","Stripe","SendGrid"]
 *
 * Two failure modes covered:
 *   (1) UNDER-INCLUSIVE WHITELIST — vendor names carried in the plan's
 *       intake ledger / factor weight_notes were never harvested.
 *   (2) OVER-EAGER EXTRACTION — "Ltd" (corporate suffix), "SaaS" (generic
 *       category term) and "Cascade" (a token of "Cascade Data Ltd") were
 *       treated as independent proper names.
 *
 * No model is contacted anywhere in this file.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPass2rWhitelist,
  validateEntityWhitelist,
  type Pass2rProseDocument,
} from "../../../../supabase/functions/_shared/ltp/pass2r-validators.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

/** Minimal locked plan carrying the 278d0608 entity values. */
const PLAN_278d0608 = {
  plan_version: "v1",
  product: "cppa-risk-assessment",
  build_stamp: "item285-test",
  jurisdiction_tag: "cppa-ca",
  intake_ledger: [
    { ledger_id: "L.entity_name", intake_field: "entity_name", value: "Cascade Data Ltd", display: "Cascade Data Ltd" },
    // Raw value carried with a coded display — the builder must harvest BOTH.
    { ledger_id: "L.vendors", intake_field: "service_providers", value: "AWS, Stripe, SendGrid", display: "3 service providers" },
    { ledger_id: "L.activity", intake_field: "primary_activity_name", value: "SaaS analytics", display: "SaaS analytics" },
  ],
  citation_bindings: [
    { pinpoint_ref: "P1", corpus_key: "ccr.7152.a.5", pinpoint: "11 CCR § 7152(a)(5)", jurisdiction_tag: "cppa-ca" },
  ],
  propositions: [],
  factor_table: [
    {
      factor_id: "ben.a.commercial",
      kind: "benefit",
      jurisdiction_tag: "cppa-ca",
      present_in_intake: true,
      intake_ledger_refs: ["L.vendors"],
      guidance_refs: [],
      anchor: { pinpoint: "11 CCR § 7152(a)(5)" },
      display_label: "Commercial benefit",
      weight_note: "Payment processing is performed by Stripe and transactional mail by SendGrid.",
    },
  ],
  weighing_frame: [],
  gate_outcomes: [],
  conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
} as unknown as RenderPlan;

const WL = buildPass2rWhitelist(PLAN_278d0608, { verdict: "Moderate" });

function proseDoc(text: string): Pass2rProseDocument {
  return {
    parts: [{ part: 1, heading: "Part 1", prose: text, covered_keys: ["executive_summary"] }],
  };
}

Deno.test("ITEM 285 F7(1): builder harvests ledger values, raw values and weight_notes", () => {
  const joined = WL.entities.join(" | ");
  for (const v of ["Cascade Data Ltd", "Stripe", "SendGrid", "AWS", "SaaS analytics"]) {
    assert(joined.includes(v), `whitelist missing plan-carried entity value: ${v}`);
  }
});

Deno.test("ITEM 285 F7: the 278d0608 prose produces ZERO entity rejections", () => {
  const o = validateEntityWhitelist(
    proseDoc(
      "The assessment concerns Cascade Data Ltd, a SaaS analytics business. " +
        "Payments are processed by Stripe and transactional mail is sent through SendGrid.",
    ),
    WL,
  );
  assertEquals(o.rejections.map((r) => r.evidence).flat(), []);
  assert(o.passed);
});

Deno.test("ITEM 285 F7(2): corporate suffixes and generic category terms are not entities", () => {
  const o = validateEntityWhitelist(
    proseDoc("The record names Ltd and SaaS and Inc and LLC and Platform as descriptors."),
    { ...WL, entities: [] },
  );
  assertEquals(o.rejections, []);
});

Deno.test("ITEM 285 F7(1): a multi-word plan name matches by constituent token", () => {
  const o = validateEntityWhitelist(
    proseDoc("The business is Cascade, and the record turns on its retention practice."),
    WL,
  );
  assert(o.passed, `unexpected rejections: ${JSON.stringify(o.rejections)}`);
});

Deno.test("ITEM 285 COUNTER-CASE: a proper name NOT carried by the plan still rejects", () => {
  const o = validateEntityWhitelist(
    proseDoc("The business shares personal information with Acxiom under a written contract."),
    WL,
  );
  const r = o.rejections.find((x) => x.code === "entity_not_in_plan");
  assert(r, "expected entity_not_in_plan rejection");
  assert(r!.evidence.includes("Acxiom"), `evidence was ${JSON.stringify(r!.evidence)}`);
});
