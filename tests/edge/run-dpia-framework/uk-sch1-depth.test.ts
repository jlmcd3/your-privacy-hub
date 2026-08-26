// UK Sch. 1 depth + domestic-statute ToA ledgering (CEO-ratified 2026-08-26
// batch ruling; closes the fleet-standing "Art. 9(3)/DPA 2018 Sch. 1 depth"
// and "Second ToA Fix" items). Two halves, one landing, because they are one
// surface: the body sentence that states the Schedule 1 condition, and the
// Table of Authorities listing the iff-cited gate derives from it.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProcessingInventory,
  buildSection2Coverage,
  UK_SCH1_EMPLOYMENT_SENTENCE,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { dpiaToa } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";

const EMPLOYMENT_CONDITION = "Employment, social security & social protection law (Art. 9(2)(b))";

function intakeWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    organization_name: "Test Org Ltd",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    data_categories: ["Health or medical data"],
    article_9_condition: EMPLOYMENT_CONDITION,
    necessity_proportionality: "the processing is limited to occupational-health records.",
    ...overrides,
  };
}

function specialRows(intake: Record<string, unknown>) {
  const inv = buildProcessingInventory(intake);
  return buildSection2Coverage(intake, { processing_inventory: inv }).special_category_conditions;
}

Deno.test("UK + employment condition: the Sch. 1 sentence renders, byte-exact", () => {
  const rows = specialRows(intakeWith({}));
  assertEquals(rows.length, 1);
  assertStringIncludes(rows[0].justification, UK_SCH1_EMPLOYMENT_SENTENCE.trim());
  assertStringIncludes(rows[0].justification, "Schedule 1, Part 1, paragraph 1");
  assertStringIncludes(rows[0].justification, "Schedule 1, Part 4, paragraph 39");
  assertStringIncludes(rows[0].justification, "appropriate policy document");
});

Deno.test("EU regime: same condition, no Schedule 1 sentence", () => {
  const rows = specialRows(intakeWith({ jurisdictions: ["EU (GDPR)"] }));
  assertEquals(rows.length, 1);
  assert(!rows[0].justification.includes("Schedule 1"), rows[0].justification);
});

Deno.test("UK + non-employment condition (explicit consent): no Schedule 1 sentence", () => {
  const rows = specialRows(intakeWith({ article_9_condition: "Explicit consent (Art. 9(2)(a))" }));
  assertEquals(rows.length, 1);
  assert(!rows[0].justification.includes("Schedule 1"), rows[0].justification);
});

Deno.test("UK + missing condition: record_insufficient ask, no Schedule 1 sentence", () => {
  const rows = specialRows(intakeWith({ article_9_condition: "" }));
  assertEquals(rows.length, 1);
  assertEquals(rows[0].status, "record_insufficient");
  assert(!rows[0].justification.includes("Schedule 1"), rows[0].justification);
});

// ── The ToA half ─────────────────────────────────────────────────────────────

Deno.test("ToA lists both DPA 2018 pinpoints, house form, under Statutes, numeric order", () => {
  const body = `The company relies on the employment condition.${UK_SCH1_EMPLOYMENT_SENTENCE}`;
  const toa = dpiaToa({ authority_exhibit: { entries: [] } }, body, "UK");
  assertStringIncludes(toa, "Statutes");
  assertStringIncludes(toa, "Data Protection Act 2018, Sch. 1, Pt. 1, para. 1");
  assertStringIncludes(toa, "Data Protection Act 2018, Sch. 1, Pt. 4, para. 39");
  // Ratified numeric ordering: Pt. 1 para. 1 before Pt. 4 para. 39.
  assert(
    toa.indexOf("Pt. 1, para. 1") < toa.indexOf("Pt. 4, para. 39"),
    toa,
  );
  // HSWA is uncited by this body — the iff-cited gate keeps it out.
  assert(!toa.includes("Health and Safety"), toa);
});

Deno.test("iff-cited gate: a body without the Sch. 1 sentence lists no DPA 2018 entry", () => {
  const toa = dpiaToa(
    { authority_exhibit: { entries: [] } },
    "The processing is assessed under GDPR Art. 35(1).",
    "UK",
  );
  assert(!toa.includes("Data Protection Act 2018"), toa);
});

Deno.test("HSWA candidate lists iff a body cites it", () => {
  const toa = dpiaToa(
    { authority_exhibit: { entries: [] } },
    "The obligation arises under the Health and Safety at Work etc. Act 1974.",
    "UK",
  );
  assertStringIncludes(toa, "Health and Safety at Work etc. Act 1974");
});
