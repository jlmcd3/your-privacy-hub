// Colocated tests for H7-ADMT-BLANKET-RANGE.
// Regression pins on quality_run doc-2a8f5bda and doc-f140f3c6 shapes.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyH7AdmtBlanketRange,
  BLANKET_RANGE_RE,
  H7_ADMT_BLANKET_RANGE_STAMP,
  hasBlanketRange,
  relabelBlanketRange,
  splitSentences,
  stripBlanketCitation,
} from "../../../supabase/functions/run-admt-checker/_h7_admt_blanket_range.ts";

Deno.test("hasBlanketRange detects hyphen, en-dash, em-dash, and spacing variants", () => {
  assert(hasBlanketRange("Under 11 CCR §§ 7200-7222 the controller must ..."));
  assert(hasBlanketRange("(11 CCR §§ 7200 – 7222)"));
  assert(hasBlanketRange("see 11 CCR §§7200—7222"));
  assert(hasBlanketRange("11 CCR § § 7200 -7222"));
  assert(hasBlanketRange("11 ccr §§ 7200–7222")); // case-insensitive
  assert(!hasBlanketRange("11 CCR § 7220"));
  assert(!hasBlanketRange("11 CCR §§ 7201-7205"));
  assert(!hasBlanketRange(""));
});

Deno.test("BLANKET_RANGE_RE resets lastIndex safely for repeated use", () => {
  BLANKET_RANGE_RE.lastIndex = 0;
  assert(BLANKET_RANGE_RE.test("11 CCR §§ 7200–7222"));
  assert(hasBlanketRange("11 CCR §§ 7200-7222"));
  assert(hasBlanketRange("11 CCR §§ 7200-7222"));
});

Deno.test("relabelBlanketRange substitutes to § 7220 for notice context", () => {
  const r = relabelBlanketRange(
    "Update pre-use notice per 11 CCR §§ 7200–7222.",
    "11 CCR § 7220",
  );
  assertEquals(r.count, 1);
  assertStringIncludes(r.out, "11 CCR § 7220");
  assert(!hasBlanketRange(r.out));
});

Deno.test("relabelBlanketRange substitutes to § 7221 for opt-out context", () => {
  const r = relabelBlanketRange(
    "Add opt-out mechanism (11 CCR §§ 7200-7222).",
    "11 CCR § 7221",
  );
  assertEquals(r.count, 1);
  assertStringIncludes(r.out, "11 CCR § 7221");
  assert(!hasBlanketRange(r.out));
});

Deno.test("stripBlanketCitation removes whole parenthetical without residue", () => {
  const r = stripBlanketCitation(
    "The controller must document its logic (see 11 CCR §§ 7200–7222) before deployment.",
  );
  assertEquals(r.parenthetical_strips, 1);
  assertEquals(r.sentence_drops, 0);
  assert(!hasBlanketRange(r.out));
  assertEquals(
    r.out,
    "The controller must document its logic before deployment.",
  );
});

Deno.test("stripBlanketCitation whole-sentence excises when citation is load-bearing", () => {
  const r = stripBlanketCitation(
    "Controllers should keep records. This is required by 11 CCR §§ 7200-7222. Retain them for four years.",
  );
  assertEquals(r.sentence_drops, 1);
  assert(!hasBlanketRange(r.out));
  assertStringIncludes(r.out, "Controllers should keep records.");
  assertStringIncludes(r.out, "Retain them for four years.");
});

Deno.test("splitSentences handles trailing fragments", () => {
  const parts = splitSentences("A. B! C? D");
  assertEquals(parts.length, 4);
});

Deno.test("applyH7AdmtBlanketRange — notice_gaps entry relabels to § 7220 (doc-2a8f5bda pin)", () => {
  const report: any = {
    notice_gaps: [
      {
        gap: "Pre-use notice missing ADMT purpose",
        remediation:
          "Update pre-use notice per 11 CCR §§ 7200–7222 before deployment.",
      },
    ],
  };
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.notice_relabels, 1);
  assertEquals(diag.optout_relabels, 0);
  assertEquals(diag.parenthetical_strips, 0);
  assertStringIncludes(report.notice_gaps[0].remediation, "11 CCR § 7220");
  assert(!hasBlanketRange(report.notice_gaps[0].remediation));
});

Deno.test("applyH7AdmtBlanketRange — opt_out_gaps entry relabels to § 7221 (doc-f140f3c6 pin)", () => {
  const report: any = {
    opt_out_gaps: [
      {
        gap: "No opt-out mechanism for ADMT",
        remediation:
          "Implement an opt-out mechanism consistent with 11 CCR §§ 7200-7222.",
      },
    ],
  };
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.optout_relabels, 1);
  assertEquals(diag.notice_relabels, 0);
  assertStringIncludes(report.opt_out_gaps[0].remediation, "11 CCR § 7221");
  assert(!hasBlanketRange(report.opt_out_gaps[0].remediation));
});

Deno.test("applyH7AdmtBlanketRange — elsewhere buckets strip parenthetical", () => {
  const report: any = {
    top_3_actions: [
      {
        action: "Complete governance review (per 11 CCR §§ 7200-7222) this quarter.",
      },
    ],
  };
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.parenthetical_strips, 1);
  assert(!hasBlanketRange(report.top_3_actions[0].action));
  assertStringIncludes(report.top_3_actions[0].action, "Complete governance review");
});

Deno.test("applyH7AdmtBlanketRange — never emits subdivision pinpoints", () => {
  const report: any = {
    notice_gaps: [{ r: "Fix per 11 CCR §§ 7200–7222." }],
    opt_out_gaps: [{ r: "Fix per 11 CCR §§ 7200–7222." }],
  };
  applyH7AdmtBlanketRange(report, "test-build");
  const combined =
    report.notice_gaps[0].r + " " + report.opt_out_gaps[0].r;
  assert(!/§\s*7220\s*\(/.test(combined));
  assert(!/§\s*7221\s*\(/.test(combined));
});

Deno.test("applyH7AdmtBlanketRange — recursion into nested objects and arrays", () => {
  const report: any = {
    notice_gaps: [
      {
        nested: {
          list: [
            "See 11 CCR §§ 7200-7222 for pre-use notice content.",
            "Unrelated text here.",
          ],
        },
      },
    ],
  };
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.notice_relabels, 1);
  assertStringIncludes(
    report.notice_gaps[0].nested.list[0],
    "11 CCR § 7220",
  );
  assertEquals(report.notice_gaps[0].nested.list[1], "Unrelated text here.");
});

Deno.test("applyH7AdmtBlanketRange — anchor keys and _-prefixed subtrees are NOT mutated", () => {
  const report: any = {
    notice_gaps: [
      {
        remediation: "Update per 11 CCR §§ 7200-7222.",
        citation: "11 CCR §§ 7200-7222", // anchor — must be preserved verbatim
        _va_stamp: { subsection: "11 CCR §§ 7200-7222" }, // reserved — untouched
      },
    ],
  };
  applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(report.notice_gaps[0].citation, "11 CCR §§ 7200-7222");
  assertEquals(
    report.notice_gaps[0]._va_stamp.subsection,
    "11 CCR §§ 7200-7222",
  );
  assertStringIncludes(report.notice_gaps[0].remediation, "11 CCR § 7220");
});

Deno.test("applyH7AdmtBlanketRange — idempotent second run", () => {
  const report: any = {
    notice_gaps: [{ r: "Fix per 11 CCR §§ 7200-7222." }],
  };
  const d1 = applyH7AdmtBlanketRange(report, "test-build");
  const snapshot = report.notice_gaps[0].r;
  const d2 = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(d1.notice_relabels, 1);
  assertEquals(d2.notice_relabels, 0);
  assertEquals(report.notice_gaps[0].r, snapshot);
});

Deno.test("applyH7AdmtBlanketRange — fail-open on malformed input", () => {
  const d1 = applyH7AdmtBlanketRange(null as any, "test-build");
  const d2 = applyH7AdmtBlanketRange(undefined as any, "test-build");
  const d3 = applyH7AdmtBlanketRange("not a report" as any, "test-build");
  const d4 = applyH7AdmtBlanketRange({ notice_gaps: "not-an-array" }, "test-build");
  assertEquals(d1.notice_relabels + d1.errors, 0);
  assertEquals(d2.notice_relabels + d2.errors, 0);
  assertEquals(d3.notice_relabels + d3.errors, 0);
  assertEquals(d4.notice_relabels + d4.errors, 0);
});

Deno.test("applyH7AdmtBlanketRange — unrelated fields untouched", () => {
  const report: any = {
    notice_gaps: [
      {
        gap: "The controller must document its logic before deployment.",
        remediation: "Nothing to fix here.",
      },
    ],
    opt_out_gaps: [{ note: "See § 7221." }],
    executive_summary: "This report analyses ADMT controls.",
  };
  const before = JSON.parse(JSON.stringify(report));
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.notice_relabels, 0);
  assertEquals(diag.optout_relabels, 0);
  assertEquals(diag.parenthetical_strips, 0);
  assertEquals(report.notice_gaps[0].gap, before.notice_gaps[0].gap);
  assertEquals(report.opt_out_gaps[0].note, before.opt_out_gaps[0].note);
  assertEquals(report.executive_summary, before.executive_summary);
});

Deno.test("applyH7AdmtBlanketRange — bucket-as-object with rows[]", () => {
  const report: any = {
    notice_gaps: {
      rows: [{ r: "Update per 11 CCR §§ 7200-7222." }],
    },
  };
  const diag = applyH7AdmtBlanketRange(report, "test-build");
  assertEquals(diag.notice_relabels, 1);
  assertStringIncludes(report.notice_gaps.rows[0].r, "11 CCR § 7220");
});

Deno.test("applyH7AdmtBlanketRange — _meta.internal.admt_h7_blanket_range written with stamp", () => {
  const report: any = { notice_gaps: [{ r: "Fix per 11 CCR §§ 7200-7222." }] };
  const diag = applyH7AdmtBlanketRange(report, "build-xyz");
  assertEquals(diag.stamp, H7_ADMT_BLANKET_RANGE_STAMP);
  assertEquals(diag.build_stamp, "build-xyz");
  assertEquals(
    report._meta.internal.admt_h7_blanket_range.stamp,
    H7_ADMT_BLANKET_RANGE_STAMP,
  );
});
