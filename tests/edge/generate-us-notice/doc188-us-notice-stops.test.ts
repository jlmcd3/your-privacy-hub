// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), US Notice P8.
// An intake value that ends in its own full stop met the sentence's stop —
// "Inferences (delivery-window preferences)..", "transactional
// communications..", "retained until opt-out.." — three per document, the
// same seam class doc 187 closed on the EU spine (EU 03). The three seams
// strip trailing stops the way the sources sentence already did.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNoticeHtml, type StateRow } from "../../../supabase/functions/generate-us-notice/_local/render.ts";

const CA: StateRow = { state_code: "CA", state_name: "California", framework_type: "ccpa" };
const AT = "September 5, 2026";

// The batch fixture's free-text answers, each ending in a period.
const BATCH: Record<string, unknown> = {
  business_name: "Busted Sled Solutions, Inc.",
  business_description: "Busted Sled Solutions operates a consumer shipment-tracking app.",
  contact_email: "privacy@bustedsled.example",
  data_categories:
    "Identifiers (name, email, phone, account ID); Shipment and delivery history; Device identifiers (IP, app install ID); Internet/network activity (in-app behavior); Inferences (delivery-window preferences).",
  collection_purposes:
    "Providing shipment-tracking functionality; account management; fraud prevention; service improvement; transactional communications.",
  third_party_sharing: "yes",
  third_party_categories: "Carriers (for delivery handoff); cloud infrastructure providers; analytics processors.",
  sale_or_sharing: "no",
  retention_general:
    "Account data is retained while the account is active and for 36 months after last activity. Marketing contacts are retained until opt-out.",
  data_sources: "Directly from individuals (account signup and in-app); from carriers (delivery scans and exceptions).",
  ccpa_sensitive_data: "yes",
  ccpa_minors: "no",
  ccpa_financial_incentive: "no",
  ccpa_admt: "no",
};

Deno.test("doc188 P8 — no seam renders a double full stop after a period-terminated intake value", () => {
  const html = buildNoticeHtml(CA, BATCH, AT);
  assert(!/\.<\/strong>\./.test(html), "a value's own stop met the sentence stop");
  assert(!/\.\./.test(html.replace(/https?:\/\/\S+/g, "")), "double full stop in the rendered notice");
  assertStringIncludes(html, "Inferences (delivery-window preferences)</strong>.");
  assertStringIncludes(html, "transactional communications</strong>.");
  assertStringIncludes(html, "retained until opt-out</strong>.");
});

Deno.test("doc188 P8 — a value without a trailing stop is rendered verbatim", () => {
  const html = buildNoticeHtml(CA, { ...BATCH, retention_general: "24 months after your last order" }, AT);
  assertStringIncludes(html, "24 months after your last order</strong>.");
});
