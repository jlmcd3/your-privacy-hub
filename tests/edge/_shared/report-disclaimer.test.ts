// UNIVERSAL DISCLAIMER — HTML normalizer regression tests.
//
// The normalizer must strip legacy disclaimer banners while NEVER touching
// substantive report content that lawfully mentions counsel/legal advice
// (e.g. 11 CCR § 7152(a)(8)–(9) approval-block language).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyUniversalDisclaimerHtml,
  REPORT_DISCLAIMER,
  reportDisclaimerHtml,
} from "../../../supabase/functions/_shared/report-disclaimer.ts";

const SUBSTANTIVE =
  `<p>The assessment identifies the individuals who provided information for the assessment, except legal counsel who provided legal advice, together with their business titles under 11 CCR § 7152(a)(8).</p>`;

Deno.test("§ 7152(a)(8) approval-block content SURVIVES the normalizer", () => {
  const out = applyUniversalDisclaimerHtml(`<body>${SUBSTANTIVE}</body>`);
  assert(
    out.includes("except legal counsel who provided legal advice"),
    "substantive § 7152(a)(8) content was stripped:\n" + out,
  );
  assert(out.includes("11 CCR § 7152(a)(8)"), out);
});

Deno.test("legacy 'Not legal advice.' banner is stripped, universal tail appended once", () => {
  const html = `<body>
    <div class="notice"><span class="label">Not legal advice.</span> This report does not constitute legal advice.</div>
    <section><h2>Findings</h2><p>Substantive finding text.</p></section>
  </body>`;
  const out = applyUniversalDisclaimerHtml(html);
  assert(!/Not legal advice\./i.test(out), "legacy banner survived:\n" + out);
  assert(out.includes("Substantive finding text."), out);
  assertEquals(out.split(REPORT_DISCLAIMER).length - 1, 1, "disclaimer must appear exactly once");
  // Appended as the final element before </body>.
  assert(out.indexOf(reportDisclaimerHtml()) < out.indexOf("</body>"), out);
});

Deno.test("other legacy disclaimer shapes are stripped", () => {
  for (
    const block of [
      `<p>This document does not create an attorney-client relationship.</p>`,
      `<div>Generated for informational purposes only.</div>`,
      `<div>Provided for educational purposes only.</div>`,
      `<p>This is not a substitute for legal counsel.</p>`,
      `<footer>This assessment is a starting template based on your inputs.</footer>`,
    ]
  ) {
    const out = applyUniversalDisclaimerHtml(`<body>${block}<p>Keep me.</p></body>`);
    assert(!out.includes(block), "legacy block survived: " + block);
    assert(out.includes("Keep me."), out);
  }
});

Deno.test("normalizer is idempotent — no double tail", () => {
  const once = applyUniversalDisclaimerHtml(`<body><p>Body.</p></body>`);
  const twice = applyUniversalDisclaimerHtml(once);
  assertEquals(twice.split(REPORT_DISCLAIMER).length - 1, 1);
});

Deno.test("substantive block longer than the size guard is never stripped", () => {
  const long = `<section><p>${"Substantive analysis. ".repeat(60)} not legal advice</p></section>`;
  const out = applyUniversalDisclaimerHtml(`<body>${long}</body>`);
  assert(out.includes("Substantive analysis."), out);
});
