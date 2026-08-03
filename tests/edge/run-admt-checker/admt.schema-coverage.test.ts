// UPGRADE-3 (CPPA ADMT) — schema-coverage guard for the §§ 7220-7222
// analytic deliverables.
//
// The serializer is a WHITELIST: any key not named in ADMT_REPORT_SCHEMA is
// dropped before the report reaches the customer. This test fails loudly if a
// deliverable key or entry field is missing from the schema, which would
// otherwise present as a silently blank section on screen and in the PDF.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/admt.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";

const top = new Set(ADMT_REPORT_SCHEMA.topLevel);

Deno.test("upgrade-3 deliverable keys are whitelisted at top level", () => {
  for (
    const k of [
      "determination",
      "notice_element_findings",
      "exception_identification",
      "exception_qualification",
      "access_readiness_findings",
      "authority_exhibit",
    ]
  ) {
    assert(top.has(k), `ADMT_REPORT_SCHEMA.topLevel missing "${k}"`);
  }
});

Deno.test("lawfulness precedes enforcement exposure in the schema order", () => {
  const order = ADMT_REPORT_SCHEMA.topLevel;
  assert(order.indexOf("determination") < order.indexOf("enforcement_context"));
});

Deno.test("authority_exhibit is the last substantive section before meta keys", () => {
  const order = ADMT_REPORT_SCHEMA.topLevel;
  assert(order.indexOf("authority_exhibit") > order.indexOf("access_readiness_findings"));
});

Deno.test("SHAPE-LAW fields survive serialization", () => {
  const report = {
    system_name: "Test",
    determination: {
      activity_id: "a1",
      activity_name: "Test",
      lawfulness: { finding: "F", citation: "11 CCR § 7220", status: "analysed" },
      exposure: { statement: "E", citation: "Cal. Civ. Code § 1798.155", status: "analysed" },
      source: "model",
    },
    notice_element_findings: [{
      element_id: "c1_purpose",
      element_label: "Specific purpose",
      citation: "11 CCR § 7220(c)(1)",
      standard: "S",
      record_fact: "R",
      application: "A",
      published_text: "P",
      verdict: "meets",
      why: "W",
      status: "analysed",
      _internal_scratch: "should be dropped",
    }],
    exception_identification: {
      finding_id: "notice_exception_identification",
      citation: "11 CCR § 7220(c)(2)(B)",
      standard: "S",
      record_fact: "R",
      application: "A",
      verdict: "not_applicable",
      why: "W",
      status: "analysed",
    },
    exception_qualification: [{
      proposition_key: "optout_exc_appeal",
      exception_label: "Human appeal",
      citation: "11 CCR § 7221(b)(1)",
      conditions: [{ condition_id: "authority", verdict: "meets", why: "W" }],
      qualifies: "qualifies",
      status: "analysed",
    }],
    access_readiness_findings: [{
      element_id: "b1_purpose",
      element_label: "Specific purpose",
      citation: "11 CCR § 7222(b)(1)",
      standard: "S",
      record_fact: "R",
      application: "A",
      verdict: "ready",
      why: "W",
      status: "analysed",
    }],
    authority_exhibit: {
      version: "v1",
      heading: "Appendix — Authorities Cited",
      entries: [{ citation: "11 CCR § 7222", authority_class: "regulation", excerpt: "X", pin_verified: true }],
    },
  };

  const out = serializeCustomerReport(report, ADMT_REPORT_SCHEMA) as Record<string, any>;

  assertEquals(out.determination.lawfulness.finding, "F");
  assertEquals(out.determination.exposure.statement, "E");
  assertEquals(out.notice_element_findings[0].published_text, "P");
  assertEquals(out.notice_element_findings[0]._internal_scratch, undefined);
  assertEquals(out.exception_identification.verdict, "not_applicable");
  assertEquals(out.exception_qualification[0].conditions.length, 1);
  assertEquals(out.access_readiness_findings[0].verdict, "ready");
  assertEquals(out.authority_exhibit.entries[0].citation, "11 CCR § 7222");
});
