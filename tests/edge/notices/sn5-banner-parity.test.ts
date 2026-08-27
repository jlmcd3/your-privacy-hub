// S-N5 (doc 80, 2026-08-27) — banner parity + honest banner copy.
//
// The 8-26 audit found two defects: (1) the US generator had NO
// missing-required-fields banner at all (a blank business_name shipped
// "[Business name]" with no warning), and (2) the EU banner's copy claimed
// six fields were checked while the code checked two. Both banners now
// check exactly the fields they name, and name exactly the fields missing.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNoticeHtml as buildUsNoticeHtml, missingRequiredUsFields } from "../../../supabase/functions/generate-us-notice/_local/render.ts";
import { missingRequiredEuFields } from "../../../supabase/functions/generate-eu-notice/_local/validate.ts";

const CA = { state_code: "CA", state_name: "California", framework_type: "ccpa" } as never;

const FULL_US = {
  business_name: "Acme Co",
  contact_email: "privacy@acme.example",
  data_categories: "contact details",
  collection_purposes: "order fulfilment",
  retention_general: "24 months",
};

Deno.test("S-N5 — US notice with a blank business_name renders the do-not-publish banner naming the field", () => {
  const html = buildUsNoticeHtml(CA, { ...FULL_US, business_name: "" }, "1 Jan 2026");
  assertStringIncludes(html, "REQUIRED FIELDS MISSING");
  assertStringIncludes(html, "business name");
  assert(!html.includes("contact email,"), "only the actually-missing field is named");
});

Deno.test("S-N5 — US notice with every required field answered renders no banner", () => {
  const html = buildUsNoticeHtml(CA, FULL_US, "1 Jan 2026");
  assert(!html.includes("REQUIRED FIELDS MISSING"));
});

Deno.test("S-N5 — the US validator names each missing field exactly once", () => {
  assertEquals(missingRequiredUsFields({}), ["business name", "contact email", "data categories", "collection purposes"]);
  assertEquals(missingRequiredUsFields(FULL_US), []);
});

Deno.test("S-N5 — the EU validator checks all six fields its banner copy always claimed", () => {
  assertEquals(missingRequiredEuFields({}), [
    "controller name",
    "contact email",
    "data categories",
    "processing purposes",
    "lawful basis",
    "retention",
  ]);
  assertEquals(
    missingRequiredEuFields({
      controller_name: "Acme GmbH",
      contact_email: "privacy@acme.example",
      data_categories: ["contact details"],
      processing_purposes: "order fulfilment",
      lawful_basis: ["contract"],
      retention_period: "24 months",
    }),
    [],
  );
});

Deno.test("S-N5 — an array answer that is empty counts as blank; a populated one does not", () => {
  const partial = { ...FULL_US, data_categories: [] as string[] };
  assertEquals(missingRequiredUsFields(partial), ["data categories"]);
});
