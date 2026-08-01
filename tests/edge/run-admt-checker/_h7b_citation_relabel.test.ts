import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyH7bAdmtCitationRelabel,
  H7B_ADMT_CITATION_RELABEL_STAMP,
  isBlanketOnlyCitation,
} from "../../../supabase/functions/run-admt-checker/_h7b_citation_relabel.ts";
import { applyH7AdmtBlanketRange } from "../../../supabase/functions/run-admt-checker/_h7_admt_blanket_range.ts";

// ────────────────────────────────────────────────────────────────────
// Fixture VERBATIM from quality_run_documents (SELECT-only read
// 2026-07-26T01:17Z) — wave-27 admt docs 523107f3 and 233b0a2f.
// The `citation` anchor field carries the blanket range. Only the
// four entries below (two per doc) are pinned; all other fields
// abbreviated with a marker to keep the fixture readable, but the
// `citation` values are byte-identical to source. The purpose of
// these tests is to prove H7b relabels ONLY `citation` on
// notice_gaps/opt_out_gaps and does NOT touch anything else.
// ────────────────────────────────────────────────────────────────────

const BLANKET = "11 CCR §§ 7200–7222"; // en-dash, byte-identical to fixture

function fixtureReport523107f3() {
  return {
    notice_gaps: [
      {
        element_id: "notice_purpose",
        citation: "11 CCR § 7220(c)(1)",
        finding: "…verbatim from fixture (abbrev)…",
        status: "gap",
      },
      {
        element_id: "notice_optout",
        citation: BLANKET,
        finding: "The intake did not include enough detail on notice optout to support a specific finding. Provide the missing details and refresh the assessment.",
        status: "insufficient_basis",
        information_needed: true,
      },
      {
        element_id: "notice_howworks",
        citation: BLANKET,
        finding: "The intake did not include enough detail on notice howworks to support a specific finding. Provide the missing details and refresh the assessment.",
        status: "insufficient_basis",
        information_needed: true,
      },
      {
        element_id: "notice_alternative_process",
        citation: "11 CCR § 7220(c)(5)(C)",
        finding: "…verbatim from fixture (abbrev)…",
        status: "gap",
      },
    ],
    opt_out_gaps: [
      { element_id: "optout_offer", citation: BLANKET, status: "insufficient_basis" },
      { element_id: "optout_designated_methods", citation: BLANKET, status: "insufficient_basis" },
      { element_id: "optout_account_barrier", citation: BLANKET, status: "insufficient_basis" },
      { element_id: "optout_confirmation", citation: BLANKET, status: "insufficient_basis" },
      { element_id: "optout_processing", citation: BLANKET, status: "insufficient_basis" },
    ],
    // Sibling bucket that also carries the blanket in prose to prove H7b
    // does NOT reach outside notice_gaps/opt_out_gaps.
    access_gaps: [
      { element_id: "access_x", citation: BLANKET, finding: `See ${BLANKET} for context.` },
    ],
  } as any;
}

Deno.test("H7B stamp is exported and stable", () => {
  assertEquals(H7B_ADMT_CITATION_RELABEL_STAMP, "h7b-admt-citation-relabel@2026-07-26T01:20:00Z");
});

Deno.test("isBlanketOnlyCitation matches blanket range only", () => {
  assertEquals(isBlanketOnlyCitation("11 CCR §§ 7200–7222"), true);
  assertEquals(isBlanketOnlyCitation("11 CCR §§ 7200-7222"), true);
  assertEquals(isBlanketOnlyCitation("11 CCR §§ 7200 — 7222"), true);
  assertEquals(isBlanketOnlyCitation("11 CCR § 7220"), false);
  assertEquals(isBlanketOnlyCitation("11 CCR § 7220(c)(1)"), false);
  assertEquals(isBlanketOnlyCitation("11 CCR § 7221(a)"), false);
  assertEquals(isBlanketOnlyCitation(""), false);
  assertEquals(isBlanketOnlyCitation(null), false);
  assertEquals(isBlanketOnlyCitation(123), false);
});

Deno.test("H7 (prose module) leaves blanket in `citation` anchor field UNCHANGED", () => {
  const report = fixtureReport523107f3();
  applyH7AdmtBlanketRange(report, "test");
  // Anchor citations still carry the blanket range — this is the
  // wave-27 residual class H7b was created to close.
  assertEquals(report.notice_gaps[1].citation, BLANKET);
  assertEquals(report.notice_gaps[2].citation, BLANKET);
  assertEquals(report.opt_out_gaps[0].citation, BLANKET);
  assertEquals(report.opt_out_gaps[4].citation, BLANKET);
});

Deno.test("H7b relabels notice_gaps[].citation to '11 CCR § 7220' only when blanket", () => {
  const report = fixtureReport523107f3();
  const diag = applyH7bAdmtCitationRelabel(report, "test");
  // Blanket entries relabeled.
  assertEquals(report.notice_gaps[1].citation, "11 CCR § 7220");
  assertEquals(report.notice_gaps[2].citation, "11 CCR § 7220");
  // Pre-existing subdivision citations untouched (never widened,
  // never narrowed).
  assertEquals(report.notice_gaps[0].citation, "11 CCR § 7220(c)(1)");
  assertEquals(report.notice_gaps[3].citation, "11 CCR § 7220(c)(5)(C)");
  assertEquals(diag.citation_relabeled_notice, 2);
  assertEquals(diag.entries_scanned_notice, 4);
});

Deno.test("H7b relabels opt_out_gaps[].citation to '11 CCR § 7221' — all five blanket entries", () => {
  const report = fixtureReport523107f3();
  const diag = applyH7bAdmtCitationRelabel(report, "test");
  for (const entry of report.opt_out_gaps) {
    assertEquals(entry.citation, "11 CCR § 7221");
  }
  assertEquals(diag.citation_relabeled_optout, 5);
  assertEquals(diag.entries_scanned_optout, 5);
});

Deno.test("H7b does NOT touch other buckets (access_gaps.citation preserved)", () => {
  const report = fixtureReport523107f3();
  applyH7bAdmtCitationRelabel(report, "test");
  assertEquals(report.access_gaps[0].citation, BLANKET);
  // Prose in access_gaps.finding also preserved (not H7b's scope).
  assertEquals(report.access_gaps[0].finding, `See ${BLANKET} for context.`);
});

Deno.test("H7b writes telemetry under _meta.internal.admt_h7b", () => {
  const report = fixtureReport523107f3();
  applyH7bAdmtCitationRelabel(report, "test-stamp");
  const t = report._meta?.internal?.admt_h7b;
  assertEquals(t?.stamp, H7B_ADMT_CITATION_RELABEL_STAMP);
  assertEquals(t?.build_stamp, "test-stamp");
  assertEquals(t?.citation_relabeled_notice, 2);
  assertEquals(t?.citation_relabeled_optout, 5);
  assertEquals(t?.errors, 0);
});

Deno.test("H7b is idempotent (second pass is a no-op)", () => {
  const report = fixtureReport523107f3();
  applyH7bAdmtCitationRelabel(report, "test");
  const diag2 = applyH7bAdmtCitationRelabel(report, "test");
  // Second pass sees zero relabels because entries carry the
  // idempotence tag.
  assertEquals(diag2.citation_relabeled_notice, 0);
  assertEquals(diag2.citation_relabeled_optout, 0);
});

Deno.test("H7b + H7 composition — prose stays H7's domain, citations become H7b's", () => {
  const report = fixtureReport523107f3();
  applyH7AdmtBlanketRange(report, "test"); // prose pass first (production order)
  applyH7bAdmtCitationRelabel(report, "test");
  // notice_gaps blanket citations relabeled.
  assertEquals(report.notice_gaps[1].citation, "11 CCR § 7220");
  assertEquals(report.notice_gaps[2].citation, "11 CCR § 7220");
  // opt_out_gaps blanket citations relabeled.
  assertEquals(report.opt_out_gaps[0].citation, "11 CCR § 7221");
  // access_gaps: H7 stripped the parenthetical/prose, but H7b leaves
  // its citation anchor untouched (out of scope).
  assertEquals(report.access_gaps[0].citation, BLANKET);
});

Deno.test("H7b fail-open on malformed report (returns empty diag, no throw)", () => {
  const d1 = applyH7bAdmtCitationRelabel(null as any, "test");
  assertEquals(d1.citation_relabeled_notice, 0);
  const d2 = applyH7bAdmtCitationRelabel({} as any, "test");
  assertEquals(d2.citation_relabeled_optout, 0);
  const d3 = applyH7bAdmtCitationRelabel({ notice_gaps: "not an array" } as any, "test");
  assertEquals(d3.errors, 0); // bucketRows returns [] on non-array
});
