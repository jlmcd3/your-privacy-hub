// S-N3 (doc 80, 2026-08-27) — 11 CCR § 7012(e)(4): the US notice's
// retention section states the PERIOD, or where none is possible the
// CRITERIA used to determine it; a wholly-unanswered record renders a
// visible missing-disclosure warning (California names the regulation),
// never a silent "Not specified".

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNoticeHtml } from "../../../supabase/functions/generate-us-notice/_local/render.ts";

const CA = { state_code: "CA", state_name: "California", framework_type: "ccpa" } as never;
const VA = { state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" } as never;

const BASE = {
  business_name: "Acme Co",
  contact_email: "privacy@acme.example",
  data_categories: "contact details",
  collection_purposes: "order fulfilment",
};

Deno.test("S-N3 — a stated period renders as before", () => {
  const html = buildNoticeHtml(CA, { ...BASE, retention_general: "24 months from last order" }, "1 Jan 2026");
  assertStringIncludes(html, "24 months from last order");
  assert(!html.includes("Retention disclosure missing"));
});

Deno.test("S-N3 — no period + criteria renders the criteria limb", () => {
  const html = buildNoticeHtml(CA, { ...BASE, retention_criteria: "active account plus the limitation period for contract claims" }, "1 Jan 2026");
  assertStringIncludes(html, "criteria we use to determine how long");
  assertStringIncludes(html, "active account plus the limitation period");
  assert(!html.includes("Not specified"));
});

Deno.test("S-N3 — California with neither answer renders the § 7012(e)(4) warning, never a silent gap", () => {
  const html = buildNoticeHtml(CA, { ...BASE }, "1 Jan 2026");
  assertStringIncludes(html, "Retention disclosure missing");
  assertStringIncludes(html, "7012(e)(4)");
  assert(!html.includes("Not specified"));
});

Deno.test("S-N3 — a non-CCPA state with neither answer gets the honest recommendation, not the CA regulation cite", () => {
  const html = buildNoticeHtml(VA, { ...BASE }, "1 Jan 2026");
  assertStringIncludes(html, "has not been stated in the record");
  assert(!html.includes("7012(e)(4)"));
});
