// BATCH ee860fd0 (2026-09-14) — /all-ptest agreed fixes for cppa-admt
// (run 2026-09-13, Online & Web Services, document 8d0638b5 / VeriAd — an
// out-of-scope, advertising-only report). Five items:
//
//   output-role-references-unreached-sections  the output-role phrase is conditioned
//   human-involvement-interp-pointer           the S4 lead-in points at Section 2's opening
//   appendix-a-malformed-citation-range        "(b)(3), (b)(3)(A)" as a list, with a range guard
//   section7-table-intro-dangling              the colon lead-in sits directly above the table
//   record-grade-qualified-vs-not-reached      one "Not reached" label across all three tables

import { assert, assertEquals, assertStringIncludes, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_NONE_DOMAIN, computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import {
  assembleAdmtV2Document,
  citationPinpointList,
  citationPinpointRange,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { NOTICE_TIMING_OPTS as C_NT, OPT_OUT_HANDLING_OPTS as C_OH } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";

type Bag = Record<string, unknown>;
type Doc = ReturnType<typeof assembleAdmtV2Document>;

const FINANCIAL = "Financial or lending services (credit decisions, loans, accounts)";
const NO_REVIEW = "No — fully automated, no human review";

function base(over: Bag = {}): Bag {
  return {
    organization_name: "Verilink", system_name: "VeriAd Interest Classifier", system_type: "ML classifier",
    system_description: "An ML classifier that assigns users to advertising interest segments and optimises ad delivery.",
    decision_domains: [FINANCIAL],
    human_review: NO_REVIEW,
    training_data_use: "Yes", profiling_use: "Yes",
    notice_delivery: ["Included in our Notice at Collection", "Account-creation or onboarding flow"],
    notice_timing: C_NT[0],
    notice_has_specific_purpose: "Yes", notice_purpose_text: "We classify your interests from how you use the platform.",
    notice_has_opt_out_desc: "Yes — with specific opt-out instructions", notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes", notice_has_how_it_works: "Yes — included inline in the notice", notice_has_alternative_process: "Yes",
    opt_out_exception: "No exception — we provide a full opt-out right",
    opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Toll-free phone number"],
    opt_out_link_title: "Opt-out of Automated Decisionmaking Technology",
    opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
    opt_out_no_account_required: "Confirmed — no account required",
    opt_out_confirmation_mechanism: "Confirmation email within one business day",
    opt_out_15_day_process: "Processing stops within 15 business days; the log records the date.",
    opt_out_handling_confirmations: [...C_OH.slice(0, 5)],
    access_submission_methods: "Webform and toll-free number", access_verification_process: "Email plus account login",
    access_logic_disclosure: "Score, top factors, thresholds", access_outcome_disclosure: "Outcome and factors",
    access_response_timeline: "Within 45 calendar days (standard)",
    access_readiness: {
      b1_purpose_ready: "Yes — we can produce this today", b2_logic_ready: "Yes — we can produce this today",
      b3_output_use_ready: "Yes — we can produce this today", b3_outcome_ready: "Yes — we can produce this today",
      b3_human_role_ready: "Yes — we can produce this today", b4_rights_ready: "Yes — we can produce this today",
    },
    third_party_admt: "No",
    admt_detail: {
      solely_advertising: "No",
      sole_factor: "Material factor — heavily weighted alongside others",
      access_secure_transmission: "Encrypted self-service portal",
      hi_reviewer_present: "No — fully automated",
    },
    ...over,
  };
}

/** The VeriAd shape: advertising only, no significant-decision category ⇒ out of scope. */
function outOfScope(over: Bag = {}): Bag {
  return base({
    decision_domains: [ADMT_NONE_DOMAIN],
    admt_detail: { ...(base().admt_detail as Bag), solely_advertising: "Yes — solely advertising" },
    ...over,
  });
}

function build(intake: Bag): { doc: Doc; text: string; computed: ReturnType<typeof computeAdmtV2> } {
  const computed = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? "") });
  return { doc, text: skeletonDocumentToText(doc as never), computed };
}
function section(doc: Doc, id: string) {
  return doc.sections.find((s) => s.id === id)!;
}
function tableRows(doc: Doc, id: string): string[][] {
  return section(doc, id).paragraphs.flatMap((p) => p.kind === "table" ? p.table!.rows : []);
}

const REACHED_PHRASE = "No independent effect on applicability; establishes the factual record for the Notice and Access sections.";
const NOT_REACHED_PHRASE = "No independent effect on applicability; recorded as part of the factual record (the Notice and Access sections are not reached in this report).";

// ── output-role-references-unreached-sections ──────────────────────────────

Deno.test("ee860fd0 — out of scope: neither Section 2 nor Appendix A claims the output role establishes the Notice/Access record; both carry the identical conditioned string", () => {
  const { doc, text, computed } = build(outOfScope());
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE");
  assert(!text.includes("establishes the factual record for the Notice and Access sections"), text);
  const s2 = tableRows(doc, "applicability").find((r) => r[0] === "Role of ADMT output")!;
  assertEquals(s2[2], NOT_REACHED_PHRASE);
  const appA = tableRows(doc, "appendix_a").find((r) => r[0] === "Output role")!;
  assertStringIncludes(appA[1], NOT_REACHED_PHRASE);
  assertEquals(appA[1].split(" — ").pop(), s2[2]);
});

Deno.test("ee860fd0 — in scope: the original output-role wording is retained in both Section 2 and Appendix A, byte-identical", () => {
  const { doc, computed } = build(base());
  assertEquals(computed.scope.scopeState, "IN_SCOPE");
  const s2 = tableRows(doc, "applicability").find((r) => r[0] === "Role of ADMT output")!;
  assertEquals(s2[2], REACHED_PHRASE);
  const appA = tableRows(doc, "appendix_a").find((r) => r[0] === "Output role")!;
  assertEquals(appA[1].split(" — ").pop(), REACHED_PHRASE);
});

// ── human-involvement-interp-pointer ───────────────────────────────────────

Deno.test("ee860fd0 — the human-involvement interpretation lead-in points at the opening paragraph of Section 2, where the § 7001(e)(1) test is actually rendered", () => {
  const { doc, text } = build(outOfScope());
  const frame = section(doc, "applicability").paragraphs.find((p) => /^Regulatory interpretation of the human-involvement standard/.test(p.text ?? ""));
  assert(frame, "human-involvement S4 frame expected on this record");
  assert(!frame!.text.includes("this factor's determination above"), frame!.text);
  assertStringIncludes(frame!.text, "the operative test is stated in the opening paragraph of Section 2.");
  assertStringIncludes(frame!.text, "nonbinding interpretive context");
  // The pointer resolves: Section 2's opening legal paragraph states the three conditions.
  const opening = section(doc, "applicability").paragraphs[0].text;
  assertStringIncludes(opening, "knows how to interpret the system's output, reviews that output together with other relevant information, and has authority to make or change the decision (11 CCR § 7001(e)(1))");
  assert(!text.includes("this factor's determination above"));
});

// ── appendix-a-malformed-citation-range ────────────────────────────────────

Deno.test("ee860fd0 — the output-role authority renders '§ 7222(b)(3), (b)(3)(A)' and no en-dash range whose endpoints share a parent", () => {
  for (const intake of [base(), outOfScope()]) {
    const { doc } = build(intake);
    const row = tableRows(doc, "appendix_a").find((r) => r[0] === "Output role")!;
    const authority = row[row.length - 1];
    assertStringIncludes(authority, "7222(b)(3), (b)(3)(A)");
    assert(!authority.includes("7222(b)(3)–(3)(A)"), authority);
    for (const r of tableRows(doc, "appendix_a")) {
      const auth = r[r.length - 1];
      for (const m of auth.matchAll(/(\([a-z0-9]+\)(?:\([A-Za-z0-9]+\))*)–(\([a-z0-9]+\)(?:\([A-Za-z0-9]+\))*)/g)) {
        assert(!m[1].startsWith(m[2]) && !m[2].startsWith(m[1]), `nested range survived: ${m[0]} in ${auth}`);
      }
    }
  }
});

Deno.test("ee860fd0 — the formatter: a sibling range still renders; a parent/child range is rejected in either order; lists render comma-separated", () => {
  assertEquals(citationPinpointRange("(b)(1)", "(3)"), "(b)(1)–(3)");
  assertEquals(citationPinpointRange("(c)(1)", "(c)(5)"), "(c)(1)–(c)(5)");
  assertThrows(() => citationPinpointRange("(b)(3)", "(b)(3)(A)"));
  assertThrows(() => citationPinpointRange("(b)(3)(A)", "(b)(3)"));
  assertThrows(() => citationPinpointRange("(b)(3)", "(b)(3)"));
  assertEquals(citationPinpointList(["(b)(3)"]), "(b)(3)");
  assertEquals(citationPinpointList(["(b)(3)", "(b)(3)(A)"]), "(b)(3), (b)(3)(A)");
  assertEquals(citationPinpointList(["(a)", "(d)"]), "(a), (d)");
});

// ── section7-table-intro-dangling ──────────────────────────────────────────

Deno.test("ee860fd0 — in Section 7 the colon lead-in is the last block before the record-quality table, with the overall-grade sentence before it", () => {
  for (const intake of [base(), outOfScope(), base({ notice_purpose_text: "" })]) {
    const { doc } = build(intake);
    const paras = section(doc, "governance").paragraphs;
    const tableIdx = paras.findIndex((p) => p.kind === "table" && p.table?.surface === "record_grades");
    assert(tableIdx > 0, "record-quality table expected");
    const before = paras[tableIdx - 1];
    assert(before.kind !== "table", "prose block expected before the table");
    assert(/:$/.test(before.text.trim()), `lead-in must end with a colon: ${before.text}`);
    assertStringIncludes(before.text, "The overall record supporting this assessment is graded ");
    assertStringIncludes(before.text, ". The following table shows the record quality supporting each section of this assessment:");
    // No other prose block ends with a colon without the table following it.
    for (let i = 0; i < paras.length; i++) {
      if (paras[i].kind !== "table" && /:$/.test((paras[i].text ?? "").trim())) assertEquals(paras[i + 1]?.kind, "table", `dangling colon at block ${i}: ${paras[i].text}`);
    }
  }
});

// ── record-grade-qualified-vs-not-reached ──────────────────────────────────

Deno.test("ee860fd0 — out of scope: Notice, Opt-out / exception and Access read 'Not reached' in the Executive Summary, Section 7 and the fact record; nothing unassessed is graded", () => {
  const { doc, text } = build(outOfScope());
  const exec = tableRows(doc, "executive_summary");
  for (const area of ["Pre-use Notice", "Opt-out / exception", "Access and explanation"]) {
    const row = exec.find((r) => r[0] === area)!;
    assertEquals(row[1], "Not reached");
    assertEquals(row[2], "Not reached");
  }
  const gov = tableRows(doc, "governance");
  for (const area of ["Pre-use Notice", "Opt-out / exception", "Access"]) assertEquals(gov.find((r) => r[0] === area)![1], "Not reached");
  const fact = tableRows(doc, "appendix_c");
  for (const area of ["Notice", "Opt-out / exception", "Access"]) {
    const cell = fact.find((r) => r[0] === area)![1];
    assertStringIncludes(cell, "Record quality: Not reached (intake data recorded; not assessed).");
    assert(!/Record quality: (Qualified|Complete|Materially incomplete)/.test(cell), cell);
  }
  assertStringIncludes(fact.find((r) => r[0] === "Notice")![1], "Delivery: Included in our Notice at Collection; Account-creation or onboarding flow.");
  assert(!/Record quality: Qualified/.test(text), "an unassessed area was graded Qualified");
  // The overall record-sufficiency grade is a separate attribute and still renders.
  assertStringIncludes(text, "The overall record supporting this assessment is graded ");
});

Deno.test("ee860fd0 — in scope: the fact record shows the real per-area grades and they match Section 7 and the Executive Summary", () => {
  const { doc } = build(base({ notice_purpose_text: "" }));
  const exec = tableRows(doc, "executive_summary");
  const gov = tableRows(doc, "governance");
  const fact = tableRows(doc, "appendix_c");
  const pairs: Array<[string, string, string]> = [["Pre-use Notice", "Pre-use Notice", "Notice"], ["Opt-out / exception", "Opt-out / exception", "Opt-out / exception"], ["Access and explanation", "Access", "Access"]];
  for (const [e, g, f] of pairs) {
    const grade = gov.find((r) => r[0] === g)![1];
    assert(["Complete", "Qualified", "Materially incomplete"].includes(grade), grade);
    assertEquals(exec.find((r) => r[0] === e)![2], grade);
    assertStringIncludes(fact.find((r) => r[0] === f)![1], `Record quality: ${grade}.`);
  }
});
