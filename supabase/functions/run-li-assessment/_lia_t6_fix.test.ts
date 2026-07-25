// LIA-T6-FIX-TURN — colocated Deno tests. Regression pins derived from the
// T6 batch 6f90f7b8 lia failure classes described in dispatch id
// LIA-T6-FIX-TURN-2026-07-25 (citation_misapplied ×3 HIGH,
// unsupported_business_claim ×3 HIGH).

import {
  assert, assertEquals, assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyLiaT6Fix, _internals, LIA_T6_FIX_STAMP } from "./_lia_t6_fix.ts";

// ── Class A: truncated citation string is nulled (no proposition_key) ──
Deno.test("Class A: truncated 'Art. 6(' citation is nulled", () => {
  const report: any = {
    three_part_test: {
      interest_test: {
        annotations: [{ text: "..." }], // structural
        citation: "GDPR Art. 6(",
        subsection: "GDPR Art. 6(",
        verbatim_quote: null,
      },
    },
  };
  const c = applyLiaT6Fix(report);
  assertEquals(report.three_part_test.interest_test.citation, null);
  assertEquals(report.three_part_test.interest_test.pinpoint_omitted, true);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class A: unresolvable proposition_key nulls pinpoint fields ──
Deno.test("Class A: unresolvable key nulls invented pinpoint", () => {
  const report: any = {
    balancing_details: {
      proposition_key: "this_key_does_not_exist_in_registry",
      citation: "Something Made Up (2019) § 3",
      subsection: "§ 3(a)",
      verbatim_quote: "controllers must consider …",
    },
  };
  const c = applyLiaT6Fix(report);
  assertEquals(report.balancing_details.citation, null);
  assertEquals(report.balancing_details.subsection, null);
  assertEquals(report.balancing_details.verbatim_quote, null);
  assertEquals(report.balancing_details.citation_verified, false);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class A: resolved & verified node preserved verbatim ──
Deno.test("Class A: verified node (already substituted by W1) preserved", () => {
  const report: any = {
    three_part_test: {
      proposition_key: "li_lawful_basis_legitimate_interests",
      citation: "GDPR Art. 6",
      subsection: "GDPR Art. 6(1)(f)",
      verbatim_quote: "processing is necessary for the purposes of the legitimate interests …",
      citation_verified: true,
    },
  };
  const before = JSON.stringify(report.three_part_test);
  const c = applyLiaT6Fix(report);
  const after = JSON.stringify(report.three_part_test);
  assertEquals(before, after);
  assert(c.classA_pinpoint_substitutions >= 1);
});

// ── Class A: write-around node preserved (already null) ──
Deno.test("Class A: write-around node left alone", () => {
  const report: any = {
    node: {
      // Use a real unanchored key from LIA_UNANCHORED_PROPOSITIONS
      proposition_key: "edpb_1_2024_interest_lawful_articulated_real_present",
      citation: null,
      subsection: null,
      verbatim_quote: null,
      write_around: true,
      citation_verified: false,
    },
  };
  const c = applyLiaT6Fix(report);
  assertEquals(report.node.citation, null);
  assertEquals(report.node.write_around, true);
});

// ── Class B: unsupported assertive sentence downgraded (whole sentence) ──
Deno.test("Class B: unsupported claim downgraded, prior sentence intact", () => {
  const report: any = {
    balancing_details: {
      reasoning:
        "The intake describes a marketing campaign. The record demonstrates comprehensive biometric safeguards throughout the workflow. Data subjects retain an opt-out.",
    },
  };
  const intake = { processing_description: "marketing campaign", data_categories: ["Contact data"] };
  const c = applyLiaT6Fix(report, { intake });
  const out = report.balancing_details.reasoning as string;
  // Prior sentence intact
  assertStringIncludes(out, "The intake describes a marketing campaign");
  // Trailing sentence intact
  assertStringIncludes(out, "Data subjects retain an opt-out");
  // Downgrade replaces the biometric-safeguards claim
  assertStringIncludes(out, "The organisation should confirm whether");
  // Splice residue is not present
  assert(!out.includes("demonstrates comprehensive biometric"));
  assert(c.classB_downgrades >= 1);
});

// ── Class B: intake-supported claim preserved verbatim ──
Deno.test("Class B: intake-supported claim preserved", () => {
  const report: any = {
    balancing_details: {
      reasoning: "The record establishes lawful pseudonymisation of customer profiles.",
    },
  };
  const intake = { necessity_details: { pseudonymisation_options: "pseudonymised customer profiles" } };
  const c = applyLiaT6Fix(report, { intake });
  assertStringIncludes(
    report.balancing_details.reasoning,
    "establishes lawful pseudonymisation",
  );
  assert(c.classB_preserved >= 1);
  assertEquals(c.classB_downgrades, 0);
});

// ── Class B: never emits "information needed" phrasing ──
Deno.test("Class B: downgrade text does not use 'information needed'", () => {
  const report: any = { section: { text: "The system confirms breach thresholds automatically." } };
  applyLiaT6Fix(report, { intake: {} });
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
  applyLiaT6Fix(report, { intake: {} });
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
      proposition_key: "li_lawful_basis_legitimate_interests",
      citation_verified: true,
      citation: "GDPR Art. 6",
      subsection: "GDPR Art. 6(1)(f)",
      verbatim_quote: "the system demonstrates that processing is necessary for legitimate interests",
    },
  };
  applyLiaT6Fix(report, { intake: {} });
  assertStringIncludes(
    report.node.verbatim_quote as string,
    "demonstrates that processing is necessary",
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
  applyLiaT6Fix(report, { intake: {} });
  assertStringIncludes(report._meta.internal.note, "demonstrates internal state");
  assertStringIncludes(report.engagement_map.entry.text, "establishes engagement");
  assertStringIncludes(report.annotations[0].text, "demonstrates something else");
  // Body prose IS scrubbed
  assertStringIncludes(report.body.text, "The organisation should confirm whether");
});

// ── Idempotency ──
Deno.test("Idempotent: second pass makes no additional changes", () => {
  const report: any = {
    body: { text: "The record demonstrates something totally unrelated to intake." },
    node: {
      proposition_key: "does_not_exist",
      citation: "Invented (2020) § 7",
    },
  };
  applyLiaT6Fix(report, { intake: {} });
  const snap = JSON.stringify(report);
  const c2 = applyLiaT6Fix(report, { intake: {} });
  assertEquals(JSON.stringify(report), snap);
  assertEquals(c2.classB_downgrades, 0);
  assertEquals(c2.classA_pinpoint_omissions, 0);
});

// ── Fail-open: never throws on malformed input ──
Deno.test("Fail-open on malformed input", () => {
  const c1 = applyLiaT6Fix(null as any);
  assertEquals(c1.errors, 0);
  const c2 = applyLiaT6Fix({ circ: {} } as any);
  assertEquals(typeof c2.strings_scanned, "number");
});

// ── _meta.internal.lia_t6fix telemetry written ──
Deno.test("Telemetry: _meta.internal.lia_t6fix written", () => {
  const report: any = { body: { text: "hello" } };
  applyLiaT6Fix(report, { intake: {}, buildStamp: "test-stamp" });
  assertEquals(typeof report._meta.internal.lia_t6fix, "object");
  assertEquals(report._meta.internal.lia_t6fix.stamp, LIA_T6_FIX_STAMP);
  assertEquals(report._meta.internal.lia_t6fix.build_stamp, "test-stamp");
});

// ── _meta preserved (not clobbered) ──
Deno.test("_meta.internal preexisting keys preserved", () => {
  const report: any = { _meta: { internal: { lia_w1: { existing: true } } } };
  applyLiaT6Fix(report);
  assertEquals(report._meta.internal.lia_w1.existing, true);
  assert(report._meta.internal.lia_t6fix);
});

// ── Truncated-citation detector unit ──
Deno.test("isTruncatedCitation: shapes", () => {
  const f = _internals.isTruncatedCitation;
  assert(f("GDPR Art. 6("));
  assert(f("Article"));
  assert(f("GDPR Art."));
  assert(f("Regulation (EU) 2016/679, Art. 6(1)(f"));  // unbalanced paren
  assert(f("§ 4,"));
  assert(!f("GDPR Art. 6(1)(f)"));
  assert(!f("EDPB Guidelines 2/2019 § 2.4"));
});
