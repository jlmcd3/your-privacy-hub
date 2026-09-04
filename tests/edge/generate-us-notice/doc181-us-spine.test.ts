// DOC 181 (2026-09-04) — the U.S. Privacy Notice rebuilt onto the CEO-ratified
// spine: formal-instrument presentation, no new intake fields (every
// uncollected fact is a bracketed customer-completion prompt), state
// editions + a national notice, the California layer and companion notices
// as appendices, the Right to Limit gated on sensitive personal information,
// sale / CCPA sharing / targeted advertising as distinct derived states, and
// the four unverified 2026 enactments held out of every rendered list.
//
// Imports the pure render layer, never index.ts (Deno.serve port collision).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildNationalNoticeHtml,
  buildNoticeHtml,
  type StateRow,
} from "../../../supabase/functions/generate-us-notice/_local/render.ts";
import { UNVERIFIED_STATE_CODES } from "../../../supabase/functions/generate-us-notice/_local/spine.ts";
import { countFills } from "../../../supabase/functions/_shared/prose/formal-instrument.ts";

const CA: StateRow = { state_code: "CA", state_name: "California", framework_type: "ccpa" };
const VA: StateRow = { state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" };
const CO: StateRow = { state_code: "CO", state_name: "Colorado", framework_type: "virginia_model" };
const AL: StateRow = { state_code: "AL", state_name: "Alabama", framework_type: "virginia_model" };
const AT = "September 4, 2026";

const FULL: Record<string, unknown> = {
  business_name: "Acme Widgets, Inc.",
  business_description: "We sell widgets online.",
  contact_email: "privacy@acme.example",
  data_categories: ["identifiers", "commercial", "internet_activity"],
  collection_purposes: ["service_delivery", "analytics"],
  data_sources: "Directly from you; automatically from your use of our website",
  third_party_sharing: "yes",
  third_party_categories: ["service_providers", "analytics"],
  sale_or_sharing: "no",
  retention_general: "24 months after your last order",
  ccpa_sensitive_data: "no",
  ccpa_minors: "no",
  ccpa_financial_incentive: "no",
  ccpa_admt: "no",
  vam_controller_processor_role: "controller",
  vam_sensitive_data_consent: "no_sensitive",
  vam_targeted_advertising_optout: "not_applicable",
  vam_profiling: "no",
  vam_appeals_process: "yes",
  vam_appeals_method: "Email privacy@acme.example with the subject line Appeal; we reply in writing within 60 days.",
};

function headings(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
}

Deno.test("doc181 — formal-instrument wrapper: Georgia, numbered sections, no navy bar, no logo, completion banner", () => {
  const html = buildNoticeHtml(CA, FULL, AT);
  assertStringIncludes(html, "font-family: Georgia");
  assert(!html.includes("eup-bar"), "navy brand bar must be gone");
  assert(!html.includes("logo.png"), "logo must be gone");
  assert(!html.includes("[Business name]") && !html.includes("[contact email]") && !html.includes("Not specified"), "legacy placeholders must be gone");
  assertStringIncludes(html, "<h1>Acme Widgets, Inc. — U.S. Privacy Notice</h1>");
  assertStringIncludes(html, "Edition for residents of California");
  assertStringIncludes(html, "CUSTOMER COMPLETION REQUIRED");
  assert(!/\bdraft\b/i.test(html.replace(/usDraftBannerHtml/g, "")), "de-draft directive: the rendered document never says 'draft'");
  // Numbered sections are contiguous from 1; appendices carry no number.
  const numbered = headings(html).filter((h) => /^\d+\. /.test(h)).map((h) => Number(h.split(".")[0]));
  assertEquals(numbered, numbered.map((_, i) => i + 1));
  assert(headings(html).some((h) => h.startsWith("Appendix A — California Notice at Collection")));
});

Deno.test("doc181 — state editions: California carries the CA layer; Virginia does not; the national notice carries both states once", () => {
  const ca = buildNoticeHtml(CA, FULL, AT);
  const va = buildNoticeHtml(VA, FULL, AT);
  const national = buildNationalNoticeHtml([CA, VA], FULL, AT);

  assert(headings(ca).some((h) => h.endsWith("California Privacy Disclosures")));
  assert(!headings(va).some((h) => h.endsWith("California Privacy Disclosures")));
  assert(!va.includes("Appendix A"), "Virginia edition renders no California companion notice");
  assertStringIncludes(va, "<h3>Virginia</h3>");
  assert(!va.includes("<h3>California</h3>"), "a state edition's addendum is limited to that state");

  assertStringIncludes(national, "Covering residents of California, Virginia");
  assertStringIncludes(national, "<h3>California</h3>");
  assertStringIncludes(national, "<h3>Virginia</h3>");
  assertEquals(headings(national).filter((h) => h.endsWith("California Privacy Disclosures")).length, 1);
  assertStringIncludes(national, "<title>U.S. Privacy Notice — Acme Widgets, Inc.</title>");
});

Deno.test("doc181 — Right to Limit is gated on sensitive personal information (11 CCR § 7027)", () => {
  const no = buildNoticeHtml(CA, { ...FULL, ccpa_sensitive_data: "no" }, AT);
  assert(!no.includes("Right to Limit qualifying use"), "no Right to Limit line when no SPI is collected");
  assert(!no.includes("Appendix C — California Notice of Right to Limit"));
  assertStringIncludes(no, "we therefore do not offer the California Right to Limit");

  const yes = buildNoticeHtml(CA, { ...FULL, ccpa_sensitive_data: "yes" }, AT);
  assertStringIncludes(yes, "Appendix C — California Notice of Right to Limit");
  assertStringIncludes(yes, "7027(m)");
  assertStringIncludes(yes, "Right to Limit qualifying use or disclosure of sensitive personal information");

  const unsure = buildNoticeHtml(CA, { ...FULL, ccpa_sensitive_data: "unsure" }, AT);
  assertStringIncludes(unsure, "confirm whether sensitive personal information as defined by the CCPA is collected");
});

Deno.test("doc181 — sale, CCPA sharing and targeted advertising are distinct derived states", () => {
  const sellOnly = buildNoticeHtml(CA, { ...FULL, sale_or_sharing: "sell_only" }, AT);
  assertStringIncludes(sellOnly, "We sell certain personal information");
  assertStringIncludes(sellOnly, "We do not share personal information for cross-context behavioral advertising");
  assertStringIncludes(sellOnly, "Appendix B — California Notice of Right to Opt Out of Sale or Sharing");

  const shareOnly = buildNoticeHtml(CA, { ...FULL, sale_or_sharing: "share_only" }, AT);
  assertStringIncludes(shareOnly, "We do not sell personal information");
  assertStringIncludes(shareOnly, "We share certain personal information for cross-context behavioral advertising");

  const neither = buildNoticeHtml(CA, { ...FULL, sale_or_sharing: "neither" }, AT);
  assertStringIncludes(neither, "We do not sell personal information");
  assertStringIncludes(neither, "We have not sold or shared California consumers");
  assert(!neither.includes("Appendix B"), "no opt-out notice when nothing is sold or shared");

  const unknown = buildNoticeHtml(CA, { ...FULL, sale_or_sharing: "not_sure", vam_targeted_advertising_optout: "" }, AT);
  assertStringIncludes(unknown, "state whether personal information is sold as that term is defined");
  assertStringIncludes(unknown, "state whether personal information is shared for cross-context behavioral advertising");
  assert(!unknown.includes("We do not sell personal information"), "an unknown state is a prompt, never a claim");

  // Other-state targeted advertising follows the Virginia-model answer.
  const taNo = buildNoticeHtml(VA, { ...FULL, sale_or_sharing: "share_only", vam_targeted_advertising_optout: "not_applicable" }, AT);
  assertStringIncludes(taNo, "We do not process personal data for targeted advertising");
  const taYes = buildNoticeHtml(VA, { ...FULL, sale_or_sharing: "no", vam_targeted_advertising_optout: "yes_link_and_uoom" }, AT);
  assertStringIncludes(taYes, "We process personal data for targeted advertising");
  assert(headings(taYes).some((h) => h.endsWith("Universal Opt-Out Preference Signals")));
  assert(headings(taYes).some((h) => h.endsWith("Your Privacy Choices")));
});

Deno.test("doc181 — sources render the intake answer verbatim, else a prompt; no invented source list", () => {
  const withSources = buildNoticeHtml(CA, FULL, AT);
  assertStringIncludes(withSources, "Directly from you; automatically from your use of our website");
  const without = buildNoticeHtml(CA, { ...FULL, data_sources: "" }, AT);
  assertStringIncludes(without, "[insert the categories of sources");
  assert(!without.includes("when you create an account, make a purchase"), "the legacy invented source list is gone");
});

Deno.test("doc181 — free-text intake answers (the sample/stress fixtures) pass through verbatim; option codes render labels", () => {
  const html = buildNoticeHtml(CA, {
    ...FULL,
    data_categories: "Identifiers (name, email); Shipment data",
    collection_purposes: "Order fulfilment; Analytics",
  }, AT);
  assertStringIncludes(html, "Identifiers (name, email); Shipment data");
  assertStringIncludes(html, "Order fulfilment; Analytics");
  const coded = buildNoticeHtml(CA, FULL, AT);
  assertStringIncludes(coded, "Identifiers (name, email, IP address, account ID)");
  assertStringIncludes(coded, "<h3>To provide our product or service</h3>");
  assert(!coded.includes(">identifiers<"), "raw option codes never reach the reader");
});

Deno.test("doc181 — every customer value is escaped exactly once", () => {
  const html = buildNoticeHtml(CA, {
    ...FULL,
    business_name: `Acme <script>alert(1)</script> & Co`,
    data_sources: `"quoted" & <b>bold</b>`,
    vam_appeals_method: `<img src=x onerror=alert(1)>`,
  }, AT);
  assert(!html.includes("<script>alert"), "business_name must be escaped");
  assert(!html.includes("<b>bold</b>"), "data_sources must be escaped");
  assert(!html.includes("<img src=x"), "appeals method must be escaped");
  assertStringIncludes(html, "Acme &lt;script&gt;alert(1)&lt;/script&gt; &amp; Co");
  assert(!html.includes("&amp;amp;"), "no double escaping");
});

Deno.test("doc181 — the four unverified 2026 enactments render a prompt, never disclosures", () => {
  assertEquals([...UNVERIFIED_STATE_CODES].sort(), ["AL", "LA", "OK", "VT"]);
  const html = buildNationalNoticeHtml([VA, AL], FULL, AT);
  assertStringIncludes(html, "<h3>Alabama</h3>");
  assertStringIncludes(html, "pending legal verification of its enactment and citation");
  assert(!html.includes("Covering residents of Virginia, Alabama"), "the unverified state stays out of the coverage line");
  assertStringIncludes(html, "Covering residents of Virginia");
  assert(!html.includes("Alabama residents may exercise the rights provided by"));
});

Deno.test("doc181 — the law registry supplies the enforcement contact; the static table is the fallback", () => {
  const laws = {
    VA: {
      state_code: "VA",
      law_name: "Virginia Consumer Data Protection Act",
      effective_date: "2023-01-01",
      enforcement_body: "Office of the Attorney General of Virginia",
      enforcement_url: "https://www.oag.state.va.us",
    },
  };
  const withLaws = buildNoticeHtml(VA, FULL, AT, true, laws);
  assertStringIncludes(withLaws, "Office of the Attorney General of Virginia");
  assertStringIncludes(withLaws, 'href="https://www.oag.state.va.us"');
  assertStringIncludes(withLaws, "effective January 1, 2023");
  assertStringIncludes(withLaws, "you may contact the Virginia Attorney General to submit a complaint.");

  const without = buildNoticeHtml(VA, FULL, AT);
  assertStringIncludes(without, "Enforcement: the Virginia Attorney General");
  assertStringIncludes(without, "Virginia Consumer Data Protection Act (VCDPA) (Va. Code Ann. §59.1-571 et seq.)");
  assert(!without.includes(", effective "), "no effective date without a registry row");
});

Deno.test("doc181 — conditional sections and appendices track the intake", () => {
  const base = buildNoticeHtml(CA, FULL, AT);
  assert(!headings(base).some((h) => h.endsWith("Children and Minors")));
  assert(!headings(base).some((h) => h.endsWith("California Automated Decisionmaking Technology")));
  assert(!base.includes("Appendix D — California Notice of Financial Incentive"));
  assert(!base.includes("Appendix E — California ADMT Pre-use Notice"));
  assert(!headings(base).some((h) => h.endsWith("Profiling and Significant Decisions")));

  const rich = buildNoticeHtml(CA, {
    ...FULL,
    ccpa_minors: "yes",
    ccpa_admt: "yes",
    ccpa_financial_incentive: "yes",
    data_categories: ["identifiers", "children"],
  }, AT);
  assert(headings(rich).some((h) => h.endsWith("Children and Minors")));
  assert(headings(rich).some((h) => h.endsWith("California Automated Decisionmaking Technology")));
  assertStringIncludes(rich, "Appendix D — California Notice of Financial Incentive");
  assertStringIncludes(rich, "Appendix E — California ADMT Pre-use Notice");
  assertStringIncludes(rich, "January 1, 2027");

  const profiling = buildNoticeHtml(VA, { ...FULL, vam_profiling: "yes" }, AT);
  assert(headings(profiling).some((h) => h.endsWith("Profiling and Significant Decisions")));
  const health = buildNoticeHtml(CO, { ...FULL, ct_consumer_health_data: "yes" }, AT);
  assertStringIncludes(health, "Appendix A — Consumer Health Data Privacy Notice");
});

Deno.test("doc181 — the Colorado edition renders its state-specific intake answers in the addendum", () => {
  const html = buildNoticeHtml(CO, { ...FULL, co_uoom_honored: "yes" }, AT);
  assertStringIncludes(html, "<h3>Colorado</h3>");
  assertStringIncludes(html, "Universal opt-out mechanism (including Global Privacy Control): honoured");
  assertStringIncludes(html, "Colorado Privacy Act (CPA)");
  const notYet = buildNoticeHtml(CO, { ...FULL, co_uoom_honored: "no" }, AT);
  assertStringIncludes(notYet, "Colorado requires recognising universal opt-out mechanisms");
});

Deno.test("doc181 — a fully answered record still carries prompts only for facts the intake never collects", () => {
  const html = buildNoticeHtml(VA, FULL, AT);
  const n = countFills(html);
  assert(n >= 8 && n <= 30, `expected a bounded prompt count on a full Virginia record, got ${n}`);
  assertStringIncludes(html, "[insert the websites, applications, products, services or other activities this Notice covers]");
  assertStringIncludes(html, "[insert the effective date of this Notice]");
  // Facts the intake DOES collect never render as prompts.
  assert(!html.includes("[insert the legal name of the business]"));
  assert(!html.includes("[insert the email address for privacy questions"));
  assert(!html.includes("[insert the retention period"));
});
