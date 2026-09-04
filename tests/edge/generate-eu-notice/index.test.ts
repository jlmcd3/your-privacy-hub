// supabase/functions/generate-eu-notice/index.test.ts
//
// Fixture-based unit tests for the EU notice HTML builder.
// Run via the supabase--test_edge_functions tool.
//
// These tests do NOT touch the network or the database — they exercise the
// pure HTML generation logic only. They lock down:
//   1. Multi-select option codes are rendered as human labels (bug fix (a)).
//   2. The conditional sections render correctly across the matrix:
//        DPO yes/no, transfers yes/no, automated yes/no.
//   3. Section numbering is contiguous regardless of which conditionals fire.
//   4. The combined notice contains a TOC entry and section header per fw.
//
// DOC 180 (2026-09-04) — the GDPR family (EU_GDPR / UK_GDPR) now renders
// through the spine (_local/spine.ts): the section arc below is the spine's.
// International Transfers is ALWAYS a section (a no-transfer record states
// that no Chapter V mechanism is relied on); the Article 27 representative
// lives inside Section 1, not as its own section; "Profiling and Automated
// Decision-Making" is the conditional section; direct marketing gets its
// own Article 21(4) section. The pre-doc180 pins are in git history.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  buildNoticeHtml,
  buildCombinedHtml,
  formatAnswer,
  escapeHtml,
  type FwSel,
} from "../../../supabase/functions/generate-eu-notice/index.ts";

const FW_GDPR: FwSel = {
  framework_code: "EU_GDPR",
  framework_name: "EU GDPR",
  region: "EU",
};
const FW_UK: FwSel = {
  framework_code: "UK_GDPR",
  framework_name: "UK GDPR",
  region: "UK",
};

const baseAnswers = {
  controller_name: "Acme Ltd",
  controller_address: "1 High St, London",
  contact_email: "privacy@acme.test",
  dpo_details: "no",
  processing_purposes: ["service_delivery", "marketing"],
  data_categories: ["identifiers", "commercial"],
  lawful_basis: ["contract", "consent"],
  third_party_recipients: ["service_providers", "analytics"],
  transfer_outside_eea: "no",
  retention_period: "24 months after account closure",
  automated_decisions: "no",
};

// ----- (a) multi-select label rendering -------------------------------------

Deno.test("formatAnswer maps known codes to human labels", () => {
  assertEquals(
    formatAnswer("processing_purposes", ["service_delivery", "marketing"]),
    "Service or product delivery, Marketing communications",
  );
  assertEquals(
    formatAnswer("lawful_basis", ["contract", "consent"]),
    "Contractual necessity (Art.6(1)(b)), Consent (Art.6(1)(a))",
  );
});

Deno.test("formatAnswer falls back to raw value for unknown keys/codes", () => {
  assertEquals(formatAnswer("unknown_question", ["foo", "bar"]), "foo, bar");
  assertEquals(formatAnswer("processing_purposes", ["unknown_code"]), "unknown_code");
});

Deno.test("formatAnswer handles null, scalars, and objects safely", () => {
  assertEquals(formatAnswer("anything", null), "");
  assertEquals(formatAnswer("anything", undefined), "");
  assertEquals(formatAnswer("anything", "yes"), "yes");
  assertEquals(formatAnswer("anything", 42), "42");
});

Deno.test("escapeHtml escapes the five XML-significant chars", () => {
  assertEquals(
    escapeHtml(`<script>alert("x&y's")</script>`),
    "&lt;script&gt;alert(&quot;x&amp;y&#39;s&quot;)&lt;/script&gt;",
  );
});

// ----- buildNoticeHtml: minimal happy path ----------------------------------

Deno.test("buildNoticeHtml renders multi-select labels (no raw codes)", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: baseAnswers,
    generatedAtHuman: "May 2, 2026",
  });
  // Human labels present
  assertStringIncludes(html, "Service or product delivery");
  assertStringIncludes(html, "Marketing communications");
  assertStringIncludes(html, "Contractual necessity");
  // Raw codes must NOT leak — they would betray the (a) bug returning.
  assert(
    !html.includes("service_delivery"),
    "Raw option code 'service_delivery' leaked into rendered HTML",
  );
  assert(
    !html.includes(">consent<") && !html.includes(": consent,"),
    "Raw option code 'consent' leaked into rendered HTML",
  );
});

Deno.test("buildNoticeHtml escapes user-controlled controller name", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: { ...baseAnswers, controller_name: `Evil <img src=x onerror=1>` },
    generatedAtHuman: "May 2, 2026",
  });
  assert(!html.includes("<img src=x"), "Unescaped HTML found in output");
  assertStringIncludes(html, "Evil &lt;img src=x onerror=1&gt;");
});

// ----- conditional sections (matrix) ---------------------------------------
//
// DOC 180 spine arc for baseAnswers (no DPO, no transfers, no automated,
// marketing selected, no establishment answer):
//   1 Who Is Responsible / 2 What Personal Data / 3 Where Do We Obtain /
//   4 How and Why / 5 Who Receives / 6 International Transfers /
//   7 How Long / 8 Your Data Protection Rights /
//   9 Your Right to Object to Direct Marketing / 10 How Do We Protect /
//   11 Complaints / 12 Changes / 13 Contact Us.
// Cookies (needs internet_activity, analytics or advertising) and Children
// (needs the children category) do not fire for baseAnswers.

Deno.test("baseline (no DPO, no transfers, no automated) has 13 sections", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: baseAnswers,
    generatedAtHuman: "May 2, 2026",
  });
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
    assertStringIncludes(html, `<h2>${n}.`);
  }
  assert(!html.includes("<h2>14."), "Unexpected 14th section");
  assertStringIncludes(html, "<h2>1. Who Is Responsible for Your Personal Data?");
  assertStringIncludes(html, "<h2>6. International Transfers");
  assertStringIncludes(html, "<h2>7. How Long Do We Keep Personal Data?");
  assertStringIncludes(html, "<h2>8. Your Data Protection Rights");
  assertStringIncludes(html, "<h2>9. Your Right to Object to Direct Marketing");
  assertStringIncludes(html, "<h2>13. Contact Us");
  // The Article 27 representative is a sub-heading of Section 1 now, never
  // its own numbered section; with no establishment answer it renders.
  assertStringIncludes(html, "<h3>EU representative</h3>");
  assert(!html.includes("<h2>6. EU representative"), "representative must not be a numbered section");
  assert(!html.includes("Profiling and Automated Decision-Making"));
  assert(!html.includes("Cookies and Similar Technologies"));
});

Deno.test("transfers=yes fills the International Transfers section; UK Addendum stays out of the EU section", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: {
      ...baseAnswers,
      transfer_outside_eea: "yes",
      transfer_safeguards: ["sccs", "uk_addendum"],
    },
    generatedAtHuman: "May 2, 2026",
  });
  // The arc is unchanged — transfers is always section 6.
  assertStringIncludes(html, "<h2>6. International Transfers");
  assertStringIncludes(html, "<h2>7. How Long Do We Keep Personal Data?");
  assert(!html.includes("<h2>14."), "Unexpected 14th section");
  assertStringIncludes(html, "Standard Contractual Clauses (SCCs)");
  // The UK IDTA/Addendum is a UK-specific instrument with no status under EU
  // GDPR Art. 46 — it must not appear in the EU_GDPR section's safeguards
  // line (citation-misapplication fix, 2026-08-31).
  assert(!html.includes("UK International Data Transfer Addendum"), "UK Addendum should not appear under EU GDPR Art. 46");
  // DOC 180 P0s: no placeholder, no fabricated transfer impact assessment.
  assert(!html.includes("[destination countries to be specified]"));
  assert(!html.includes("Transfer Impact Assessment"));
});

Deno.test("automated=yes adds Profiling and Automated Decision-Making after transfers", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: { ...baseAnswers, automated_decisions: "yes" },
    generatedAtHuman: "May 2, 2026",
  });
  // No cookies section, so the conditional lands at 7 and pushes the arc to 14.
  assertStringIncludes(html, "<h2>7. Profiling and Automated Decision-Making");
  assertStringIncludes(html, "<h2>14. Contact Us");
  assert(!html.includes("<h2>15."), "Unexpected 15th section");
  assertStringIncludes(html, "human intervention");
});

Deno.test("transfers=yes AND automated=yes produces 14 contiguous sections", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: {
      ...baseAnswers,
      transfer_outside_eea: "yes",
      transfer_safeguards: ["sccs"],
      automated_decisions: "yes",
    },
    generatedAtHuman: "May 2, 2026",
  });
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    assertStringIncludes(html, `<h2>${n}.`);
  }
  assert(!html.includes("<h2>15."), "Unexpected 15th section");
  assertStringIncludes(html, "<h2>7. Profiling and Automated Decision-Making");
});

Deno.test("dpo_details=yes renders DPO contact line with name", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: {
      ...baseAnswers,
      dpo_details: "yes",
      dpo_name: "Jane Doe",
      dpo_email: "dpo@acme.test",
    },
    generatedAtHuman: "May 2, 2026",
  });
  assertStringIncludes(html, "Data Protection Officer");
  assertStringIncludes(html, "<strong>Jane Doe</strong>");
  assertStringIncludes(html, "mailto:dpo@acme.test");
});

Deno.test("dpo_details=no omits the DPO line entirely", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: baseAnswers,
    generatedAtHuman: "May 2, 2026",
  });
  assert(!html.includes("Data Protection Officer"));
});

// ----- combined international notice ----------------------------------------

Deno.test("buildCombinedHtml produces TOC + per-framework sections, no regex strip", () => {
  const html = buildCombinedHtml(
    "Acme Ltd",
    "privacy@acme.test",
    [FW_GDPR, FW_UK],
    baseAnswers,
    "May 2, 2026",
  );
  // TOC anchors
  assertStringIncludes(html, `href="#EU_GDPR"`);
  assertStringIncludes(html, `href="#UK_GDPR"`);
  // Section anchors
  assertStringIncludes(html, `id="EU_GDPR"`);
  assertStringIncludes(html, `id="UK_GDPR"`);
  // Each framework has its own first section header
  const matches = html.match(/<h2>1\. Who Is Responsible for Your Personal Data\?<\/h2>/g);
  assertEquals(matches?.length, 2, "Each framework should restart at section 1");
  // No leaked raw codes anywhere
  assert(!html.includes("service_delivery"));
});
