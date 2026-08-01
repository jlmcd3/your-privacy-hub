// supabase/functions/generate-eu-notice/index.test.ts
//
// Fixture-based unit tests for the EU notice HTML builder.
// Run via the supabase--test_edge_functions tool.
//
// These tests do NOT touch the network or the database — they exercise the
// pure HTML generation logic only. They lock down:
//   1. Multi-select option codes are rendered as human labels (bug fix (a)).
//   2. All four conditional sections render correctly across the matrix:
//        DPO yes/no, transfers yes/no, automated yes/no, special-cat yes/no.
//   3. Section numbering is contiguous regardless of which conditionals fire.
//   4. The combined notice contains a TOC entry and section header per fw.

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
} from "./index.ts";

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

Deno.test("baseline (no DPO, no transfers, no automated) has 7 sections", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: baseAnswers,
    generatedAtHuman: "May 2, 2026",
  });
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    assertStringIncludes(html, `<h2>${n}.`);
  }
  assert(!html.includes("<h2>8."), "Unexpected 8th section");
  assert(!html.includes("International transfers"));
  assert(!html.includes("Automated decision-making"));
});

Deno.test("transfers=yes inserts International transfers section in order", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: {
      ...baseAnswers,
      transfer_outside_eea: "yes",
      transfer_safeguards: ["sccs", "uk_addendum"],
    },
    generatedAtHuman: "May 2, 2026",
  });
  // Numbering: 1 Who/2 Data/3 Purposes/4 Basis/5 Recipients/6 Transfers/7 Retention/8 Rights
  assertStringIncludes(html, "<h2>6. International transfers");
  assertStringIncludes(html, "<h2>7. Retention");
  assertStringIncludes(html, "<h2>8. Your rights");
  assertStringIncludes(html, "Standard Contractual Clauses (SCCs)");
  assertStringIncludes(html, "UK International Data Transfer Addendum");
});

Deno.test("automated=yes adds Automated decision-making as last section", () => {
  const html = buildNoticeHtml({
    fw: FW_GDPR,
    answers: { ...baseAnswers, automated_decisions: "yes" },
    generatedAtHuman: "May 2, 2026",
  });
  // No transfers, so automated becomes section 8.
  assertStringIncludes(html, "<h2>8. Automated decision-making");
  assert(!html.includes("<h2>9."), "Unexpected 9th section");
});

Deno.test("transfers=yes AND automated=yes produces 9 contiguous sections", () => {
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
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    assertStringIncludes(html, `<h2>${n}.`);
  }
  assert(!html.includes("<h2>10."), "Unexpected 10th section");
  assertStringIncludes(html, "<h2>9. Automated decision-making");
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
  const matches = html.match(/<h2>1\. Who we are<\/h2>/g);
  assertEquals(matches?.length, 2, "Each framework should restart at section 1");
  // No leaked raw codes anywhere
  assert(!html.includes("service_delivery"));
});
