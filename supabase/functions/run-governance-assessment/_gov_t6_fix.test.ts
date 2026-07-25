// GOVERNANCE-T6-FIX-TURN — colocated Deno tests. Mirrors DPIA-T6-FIX-TURN
// (ledger item 92) and LIA-T6-FIX-TURN (ledger item 89) pin lists.
// Regression pins derived from T6 batch f2ac3a26 governance failure classes
// (citation_misapplied ×3 HIGH, unsupported_business_claim ×3 HIGH).

import {
  assert, assertEquals, assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyGovT6Fix, _internals, GOV_T6_FIX_STAMP } from "./_gov_t6_fix.ts";

// ── Class A: truncated citation string is nulled (no proposition_key) ──
Deno.test("Class A: truncated 'Art. 5(' citation is nulled", () => {
  const report: any = {
    section_accountability: {
      analysis: {
        annotations: [{ text: "..." }],
        citation: "GDPR Art. 5(",
        subsection: "GDPR Art. 5(",
        verbatim_quote: null,
      },
    },
  };
  const c = applyGovT6Fix(report);
  assertEquals(report.section_accountability.analysis.citation, null);
  assertEquals(report.section_accountability.analysis.pinpoint_omitted, true);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class A: unresolvable proposition_key nulls pinpoint fields ──
Deno.test("Class A: unresolvable key nulls invented pinpoint", () => {
  const report: any = {
    roles_matrix: {
      proposition_key: "this_key_does_not_exist_in_registry",
      citation: "Something Made Up (2019) § 3",
      subsection: "§ 3(a)",
      verbatim_quote: "controllers must consider …",
    },
  };
  const c = applyGovT6Fix(report);
  assertEquals(report.roles_matrix.citation, null);
  assertEquals(report.roles_matrix.subsection, null);
  assertEquals(report.roles_matrix.verbatim_quote, null);
  assertEquals(report.roles_matrix.citation_verified, false);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class A: resolved & verified node preserved verbatim ──
Deno.test("Class A: verified node (already substituted by W1) preserved", () => {
  // Use a real key from the governance registry so the audit registers it.
  const report: any = {
    section_1: {
      proposition_key: "art_5_1_a_lawfulness",
      citation: "GDPR Art. 5",
      subsection: "GDPR Art. 5(1)(a)",
      verbatim_quote: "Personal data shall be processed lawfully …",
      citation_verified: true,
    },
  };
  const before = JSON.stringify(report.section_1);
  applyGovT6Fix(report);
  const after = JSON.stringify(report.section_1);
  assertEquals(before, after);
});

// ── Class A: write-around node preserved (already null) ──
Deno.test("Class A: write-around node left alone", () => {
  const report: any = {
    node: {
      proposition_key: "some_unanchored_proposition",
      citation: null,
      subsection: null,
      verbatim_quote: null,
      write_around: true,
      citation_verified: false,
    },
  };
  applyGovT6Fix(report);
  assertEquals(report.node.citation, null);
  assertEquals(report.node.write_around, true);
});

// ── Class B: unsupported assertive sentence downgraded (whole sentence) ──
Deno.test("Class B: unsupported claim downgraded, prior sentence intact", () => {
  const report: any = {
    section_3: {
      reasoning:
        "The intake describes a marketing campaign. The record demonstrates comprehensive biometric safeguards throughout the workflow. Data subjects retain an opt-out.",
    },
  };
  const intake = { processing_description: "marketing campaign", data_categories: ["Contact data"] };
  const c = applyGovT6Fix(report, { intake });
  const out = report.section_3.reasoning as string;
  assertStringIncludes(out, "The intake describes a marketing campaign");
  assertStringIncludes(out, "Data subjects retain an opt-out");
  assertStringIncludes(out, "The organisation should confirm whether");
  assert(!out.includes("demonstrates comprehensive biometric"));
  assert(c.classB_downgrades >= 1);
});

// ── Class B: intake-supported claim preserved verbatim ──
Deno.test("Class B: intake-supported claim preserved", () => {
  const report: any = {
    section_3: {
      reasoning: "The record establishes lawful pseudonymisation of customer profiles.",
    },
  };
  const intake = { necessity_details: { pseudonymisation_options: "pseudonymised customer profiles" } };
  const c = applyGovT6Fix(report, { intake });
  assertStringIncludes(
    report.section_3.reasoning,
    "establishes lawful pseudonymisation",
  );
  assert(c.classB_preserved >= 1);
  assertEquals(c.classB_downgrades, 0);
});

// ── Class B: never emits "information needed" phrasing ──
Deno.test("Class B: downgrade text does not use 'information needed'", () => {
  const report: any = { section: { text: "The system confirms breach thresholds automatically." } };
  applyGovT6Fix(report, { intake: {} });
  const t = report.section.text as string;
  assert(!/information (is )?needed/i.test(t), `unexpected phrase: ${t}`);
});

// ── Whole-sentence excision doctrine: no partial splice residue ──
Deno.test("Doctrine: whole-sentence excision, no splice residue", () => {
  const report: any = {
    section: {
      text: "First sentence stands. The controller demonstrates unrelated dark-pattern mitigation across surfaces. Third sentence stands.",
    },
  };
  applyGovT6Fix(report, { intake: {} });
  const t = report.section.text as string;
  assertStringIncludes(t, "First sentence stands.");
  assertStringIncludes(t, "Third sentence stands.");
  assertStringIncludes(t, "The organisation should confirm whether");
  assert(!t.includes("demonstrates unrelated"));
  assert(!t.includes("mitigation across surfaces"));
});

// ── Anchor keys never mutated ──
Deno.test("Anchor keys (citation/verbatim_quote) never treated as prose", () => {
  const report: any = {
    node: {
      proposition_key: "art_5_1_a_lawfulness",
      citation_verified: true,
      citation: "GDPR Art. 5",
      subsection: "GDPR Art. 5(1)(a)",
      verbatim_quote: "the system demonstrates that processing is lawful for governance purposes",
    },
  };
  applyGovT6Fix(report, { intake: {} });
  assertStringIncludes(
    report.node.verbatim_quote as string,
    "demonstrates that processing is lawful",
  );
});

// ── Reserved subtrees skipped ──
Deno.test("Reserved subtrees (_meta, engagement_map, annotations) untouched", () => {
  const report: any = {
    _meta: { internal: { note: "The system demonstrates internal state." } },
    engagement_map: { entry: { text: "The record establishes engagement." } },
    annotations: [{ text: "The controller demonstrates something else." }],
    body: { text: "The record demonstrates something unrelated." },
  };
  applyGovT6Fix(report, { intake: {} });
  assertStringIncludes(report._meta.internal.note, "demonstrates internal state");
  assertStringIncludes(report.engagement_map.entry.text, "establishes engagement");
  assertStringIncludes(report.annotations[0].text, "demonstrates something else");
  assertStringIncludes(report.body.text, "The organisation should confirm whether");
});

// ── Idempotency (content-level; _meta telemetry updates each pass) ──
Deno.test("Idempotent: second pass makes no additional content changes", () => {
  const report: any = {
    body: { text: "The record demonstrates something totally unrelated to intake." },
    node: {
      proposition_key: "does_not_exist",
      citation: "Invented (2020) § 7",
    },
  };
  applyGovT6Fix(report, { intake: {} });
  const contentSnap = JSON.stringify({ body: report.body, node: report.node });
  const c2 = applyGovT6Fix(report, { intake: {} });
  assertEquals(JSON.stringify({ body: report.body, node: report.node }), contentSnap);
  assertEquals(c2.classB_downgrades, 0);
  assertEquals(c2.classA_pinpoint_omissions, 0);
});

// ── Fail-open: never throws on malformed input ──
Deno.test("Fail-open on malformed input", () => {
  const c1 = applyGovT6Fix(null as any);
  assertEquals(c1.errors, 0);
  const c2 = applyGovT6Fix({ circ: {} } as any);
  assertEquals(typeof c2.strings_scanned, "number");
});

// ── _meta.internal.gov_t6fix telemetry written ──
Deno.test("Telemetry: _meta.internal.gov_t6fix written", () => {
  const report: any = { body: { text: "hello" } };
  applyGovT6Fix(report, { intake: {}, buildStamp: "test-stamp" });
  assertEquals(typeof report._meta.internal.gov_t6fix, "object");
  assertEquals(report._meta.internal.gov_t6fix.stamp, GOV_T6_FIX_STAMP);
  assertEquals(report._meta.internal.gov_t6fix.build_stamp, "test-stamp");
});

// ── _meta preserved (not clobbered) ──
Deno.test("_meta.internal preexisting keys preserved", () => {
  const report: any = { _meta: { internal: { governance_w1: { existing: true } } } };
  applyGovT6Fix(report);
  assertEquals(report._meta.internal.governance_w1.existing, true);
  assert(report._meta.internal.gov_t6fix);
});

// ── Truncated-citation detector unit ──
Deno.test("isTruncatedCitation: shapes", () => {
  const f = _internals.isTruncatedCitation;
  assert(f("GDPR Art. 5("));
  assert(f("Article"));
  assert(f("GDPR Art."));
  assert(f("Regulation (EU) 2016/679, Art. 5(1)(f"));
  assert(f("§ 4,"));
  assert(!f("GDPR Art. 5(1)"));
  assert(!f("EDPB Guidelines 2/2019 § 2.4"));
});
