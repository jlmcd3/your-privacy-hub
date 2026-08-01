// DPA-T6-FIX-TURN — colocated Deno tests. Regression pins derived from the
// T6 batch 072eef66 dpa-generator failure class described in dispatch id
// DPA-T6-FIX-TURN (unsupported_business_claim ×2 HIGH on quality_run
// 7650d69c). Mirrors _lia_t6_fix.test.ts / _dpia_t6_fix.test.ts.

import {
  assert, assertEquals, assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyDpaT6Fix, _internals, DPA_T6_FIX_STAMP } from "../../../supabase/functions/generate-dpa/_dpa_t6_fix.ts";

// ── Before-fixture pin #1: doc 02622011 Section 6.1 sub-processor claim ──
// "The Controller has confirmed that no Sub-processors are engaged for the
// Services as of the Effective Date of this DPA." — intake silent on
// sub-processors → downgrade to neutral confirmation prompt.
Deno.test("Regression pin: doc-02622011 §6.1 sub-processor confirmation downgraded", () => {
  const report: any = {
    sub_processing: {
      section_6_1: {
        text: "The Controller has confirmed that no Sub-processors are engaged for the Services as of the Effective Date of this DPA.",
      },
    },
  };
  const intake = {
    controller_name: "Acme Inc",
    services_description: "Employee photo storage for internal directory",
    data_categories: ["Employee / HR data", "Biometric data"],
  }; // NOTE: intake is silent on sub-processors
  const c = applyDpaT6Fix(report, { intake });
  const out = report.sub_processing.section_6_1.text as string;
  assertStringIncludes(out, "The parties should confirm whether");
  // No splice residue from the excised claim
  assert(!out.includes("has confirmed that no Sub-processors"));
  assert(!out.includes("Effective Date of this DPA"));
  assert(c.classB_downgrades >= 1);
});

// ── Before-fixture pin #2: doc-02622011 Section 3.4.1 enumerated sub-fields ──
// The intake specifies category "Employee / HR data" but the DPA elaborated
// "employee name, employee identifier, and job title" — the sentence carries
// no assertive verb, so it is preserved by this scrub (Class B triggers on
// assertive verbs only; enumerated-inference cases require a separate
// scrubber and are OUT OF SCOPE per dispatch). Fixture confirms we do NOT
// over-scrub descriptive sentences.
Deno.test("Regression pin: doc-02622011 §3.4.1 descriptive sub-field enumeration preserved (out of scope)", () => {
  const report: any = {
    schedule_2: {
      section_3_4_1: {
        text: "Employee and HR data: employee name, employee identifier, and job title associated with each photograph.",
      },
    },
  };
  const intake = { data_categories: ["Employee / HR data", "Biometric data"] };
  const before = report.schedule_2.section_3_4_1.text;
  applyDpaT6Fix(report, { intake });
  assertEquals(report.schedule_2.section_3_4_1.text, before);
});

// ── Before-fixture pin #3: doc-bf63fdc7 §2.15/§5.2 record-establishes claim ──
Deno.test("Regression pin: doc-bf63fdc7 'record establishes targeted advertising' downgraded", () => {
  const report: any = {
    body: {
      s215: "The record establishes that targeted advertising is not within the scope of the Services.",
      s52: "The record establishes that targeted advertising is not within the scope of the Services.",
    },
  };
  const intake = { services_description: "Employee photo storage for internal directory" };
  const c = applyDpaT6Fix(report, { intake });
  assertStringIncludes(report.body.s215, "The parties should confirm whether");
  assertStringIncludes(report.body.s52, "The parties should confirm whether");
  assert(!report.body.s215.includes("record establishes that targeted advertising"));
  assert(c.classB_downgrades >= 2);
});

// ── Before-fixture pin #4: doc-90bcffa5 §4.4.2 sub-processor record claim ──
Deno.test("Regression pin: doc-90bcffa5 §4.4.2 'confirmed on the record' downgraded", () => {
  const report: any = {
    sub_processing: {
      s442: "The Controller has confirmed on the record that no Sub-processors are engaged for the Services as at the Effective Date.",
    },
  };
  const c = applyDpaT6Fix(report, { intake: { controller_name: "X Ltd" } });
  assertStringIncludes(report.sub_processing.s442, "The parties should confirm whether");
  assert(c.classB_downgrades >= 1);
});

// ── Class A: truncated citation string is nulled (no proposition_key) ──
Deno.test("Class A: truncated 'Art. 6(' citation is nulled", () => {
  const report: any = {
    clause: {
      citation: "GDPR Art. 6(",
      subsection: "GDPR Art. 6(",
      verbatim_quote: null,
    },
  };
  const c = applyDpaT6Fix(report);
  assertEquals(report.clause.citation, null);
  assertEquals(report.clause.pinpoint_omitted, true);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class A: unresolvable proposition_key nulls pinpoint fields ──
Deno.test("Class A: unresolvable key nulls invented pinpoint", () => {
  const report: any = {
    clause: {
      proposition_key: "this_key_does_not_exist_in_registry",
      citation: "Something Made Up (2019) § 3",
      subsection: "§ 3(a)",
      verbatim_quote: "processors must consider …",
    },
  };
  const c = applyDpaT6Fix(report);
  assertEquals(report.clause.citation, null);
  assertEquals(report.clause.subsection, null);
  assertEquals(report.clause.verbatim_quote, null);
  assertEquals(report.clause.citation_verified, false);
  assert(c.classA_pinpoint_omissions >= 1);
});

// ── Class B: intake-supported claim preserved verbatim ──
Deno.test("Class B: intake-supported claim preserved", () => {
  const report: any = {
    body: { reasoning: "The record establishes lawful pseudonymisation of customer profiles." },
  };
  const intake = { necessity_details: { pseudonymisation_options: "pseudonymised customer profiles" } };
  const c = applyDpaT6Fix(report, { intake });
  assertStringIncludes(report.body.reasoning, "establishes lawful pseudonymisation");
  assert(c.classB_preserved >= 1);
  assertEquals(c.classB_downgrades, 0);
});

// ── Class B: never emits "information needed" phrasing ──
Deno.test("Class B: downgrade text does not use 'information needed'", () => {
  const report: any = { section: { text: "The Processor confirms breach thresholds automatically." } };
  applyDpaT6Fix(report, { intake: {} });
  const t = report.section.text as string;
  assert(!/information (is )?needed/i.test(t), `unexpected phrase: ${t}`);
});

// ── Whole-sentence excision doctrine: no partial splice residue ──
Deno.test("Doctrine: whole-sentence excision, no splice residue", () => {
  const report: any = {
    section: {
      text: "First sentence stands. The Processor demonstrates unrelated dark-pattern mitigation across surfaces. Third sentence stands.",
    },
  };
  applyDpaT6Fix(report, { intake: {} });
  const t = report.section.text as string;
  assertStringIncludes(t, "First sentence stands.");
  assertStringIncludes(t, "Third sentence stands.");
  assertStringIncludes(t, "The parties should confirm whether");
  assert(!t.includes("demonstrates unrelated"));
  assert(!t.includes("mitigation across surfaces"));
});

// ── Anchor keys never mutated ──
Deno.test("Anchor keys (citation/verbatim_quote/clause_id) never treated as prose", () => {
  const report: any = {
    node: {
      clause_id: "6.1",
      citation: "GDPR Art. 28",
      subsection: "GDPR Art. 28(3)",
      verbatim_quote: "the processor demonstrates sufficient guarantees to implement appropriate technical measures",
    },
  };
  applyDpaT6Fix(report, { intake: {} });
  assertStringIncludes(
    report.node.verbatim_quote as string,
    "demonstrates sufficient guarantees",
  );
  assertEquals(report.node.clause_id, "6.1");
});

// ── Reserved subtrees skipped ──
Deno.test("Reserved subtrees (_meta, engagement_map, annotations) untouched", () => {
  const report: any = {
    _meta: { internal: { note: "The Processor demonstrates internal state." } },
    engagement_map: { entry: { text: "The record establishes engagement." } },
    annotations: [{ text: "The Controller demonstrates something else." }],
    body: { text: "The record demonstrates something unrelated." },
  };
  applyDpaT6Fix(report, { intake: {} });
  assertStringIncludes(report._meta.internal.note, "demonstrates internal state");
  assertStringIncludes(report.engagement_map.entry.text, "establishes engagement");
  assertStringIncludes(report.annotations[0].text, "demonstrates something else");
  assertStringIncludes(report.body.text, "The parties should confirm whether");
});

// ── Idempotency ──
Deno.test("Idempotent: second pass makes no additional content changes", () => {
  const report: any = {
    body: { text: "The record demonstrates something totally unrelated to intake." },
    clause: { proposition_key: "does_not_exist", citation: "Invented (2020) § 7" },
  };
  applyDpaT6Fix(report, { intake: {} });
  const snap = JSON.stringify({ body: report.body, clause: report.clause });
  const c2 = applyDpaT6Fix(report, { intake: {} });
  assertEquals(JSON.stringify({ body: report.body, clause: report.clause }), snap);
  assertEquals(c2.classB_downgrades, 0);
  assertEquals(c2.classA_pinpoint_omissions, 0);
});

// ── Fail-open ──
Deno.test("Fail-open on malformed input", () => {
  const c1 = applyDpaT6Fix(null as any);
  assertEquals(c1.errors, 0);
  const c2 = applyDpaT6Fix({ circ: {} } as any);
  assertEquals(typeof c2.strings_scanned, "number");
});

// ── Telemetry written under _meta.internal.dpa_t6fix ──
Deno.test("Telemetry: _meta.internal.dpa_t6fix written", () => {
  const report: any = { body: { text: "hello" } };
  applyDpaT6Fix(report, { intake: {}, buildStamp: "test-stamp" });
  assertEquals(typeof report._meta.internal.dpa_t6fix, "object");
  assertEquals(report._meta.internal.dpa_t6fix.stamp, DPA_T6_FIX_STAMP);
  assertEquals(report._meta.internal.dpa_t6fix.build_stamp, "test-stamp");
});

// ── _meta preserved (not clobbered) ──
Deno.test("_meta.internal preexisting keys preserved (dpa_w1 sibling)", () => {
  const report: any = { _meta: { internal: { dpa_w1: { existing: true } } } };
  applyDpaT6Fix(report);
  assertEquals(report._meta.internal.dpa_w1.existing, true);
  assert(report._meta.internal.dpa_t6fix);
});

// ── Truncated-citation detector unit ──
Deno.test("isTruncatedCitation: shapes", () => {
  const f = _internals.isTruncatedCitation;
  assert(f("GDPR Art. 6("));
  assert(f("Article"));
  assert(f("GDPR Art."));
  assert(f("Regulation (EU) 2016/679, Art. 28(3"));
  assert(f("§ 4,"));
  assert(!f("GDPR Art. 28(3)(a)"));
  assert(!f("EDPB Guidelines 07/2020 § 2.4"));
});
