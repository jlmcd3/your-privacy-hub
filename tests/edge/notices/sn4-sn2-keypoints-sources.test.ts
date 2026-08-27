// S-N4 / S-N2 (doc 80, 2026-08-27) — the Key points first layer (both
// generators) and the generic source-disclosure block for non-GDPR
// frameworks. Every Key points line derives from the same answers as the
// body; blank answers are absent, never padded.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildKeyPointsHtml, buildNoticeHtml } from "../../../supabase/functions/generate-us-notice/_local/render.ts";
import { buildEuKeyPointsHtml } from "../../../supabase/functions/generate-eu-notice/_local/key-points.ts";

const CA = { state_code: "CA", state_name: "California", framework_type: "ccpa" } as never;

const US = {
  business_name: "Acme Co",
  contact_email: "privacy@acme.example",
  data_categories: "contact details, order history",
  collection_purposes: "order fulfilment",
  sale_or_sharing: "no",
  retention_general: "24 months",
};

Deno.test("S-N4 — the US Key points block renders atop the notice with working section anchors", () => {
  const html = buildNoticeHtml(CA, US, "1 Jan 2026");
  assertStringIncludes(html, "Key points");
  assertStringIncludes(html, 'href="#sec-collect"');
  assertStringIncludes(html, 'id="sec-collect"');
  assertStringIncludes(html, 'id="sec-retain"');
  assertStringIncludes(html, "do not sell or share");
  assertStringIncludes(html, "for orientation only");
});

Deno.test("S-N4 — a sell/share posture flips the Key points line and blank answers are absent", () => {
  const html = buildKeyPointsHtml({ ...US, sale_or_sharing: "sell_and_share", retention_general: "" });
  assertStringIncludes(html, "you can opt out");
  assert(!html.includes("How long:"), "blank retention must not render a line");
});

Deno.test("S-N4 — the EU Key points block renders the formatted bag; blanks are absent, transfers always definite", () => {
  const html = buildEuKeyPointsHtml({
    controller: "Acme GmbH",
    categories: "Identifiers (name, email, IP, account ID)",
    purposes: "Service or product delivery",
    basis: "Contractual necessity (Art.6(1)(b))",
    recipients: "Service providers (hosting, payments, email)",
    transfers: false,
    retention: "24 months",
    contactEmail: "privacy@acme.example",
  });
  assertStringIncludes(html, "Who we are:");
  assertStringIncludes(html, "Acme GmbH");
  assertStringIncludes(html, "none outside the originating regime are reported");
  // The label deliberately avoids the "International transfers" section title.
  assert(!html.includes("International transfers"));
  const empty = buildEuKeyPointsHtml({ controller: "", categories: "", purposes: "", basis: "", recipients: "", transfers: false, retention: "", contactEmail: "" });
  assertStringIncludes(empty, "Transfers:");
  assert(!empty.includes("Who we are:"));
});
