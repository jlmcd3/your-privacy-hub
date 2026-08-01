// W19-ADMT-FALLBACK-JOIN-2 — colocated tests. Covers:
//  • range-endpoints-both-fallback → single fallback
//  • hyphen / en-dash / em-dash joined double-fallback → single
//  • "subchapter-subchapter" / "subchapter subchapter" → "subchapter"
//  • legitimate real ranges ("§ 7220–§ 7222") untouched
//  • reworded insufficient-basis string present, old meta-commentary absent
//  • information_needed status semantics preserved
//  • fail-open on malformed report
//  • telemetry placement — no `_w<digits>_*` leakage on customer surface
//  • grep-style source assertion that the old meta-commentary string
//    is no longer authored anywhere in index.ts
//  • BUILD_STAMP regex acceptance for the w19 variant.

import { assert, assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW19AdmtJoin2,
  collapseFallbackJoinAndFusion,
  rewriteInsufficientBasisFinding,
  W19_ADMT_JOIN2_STAMP,
} from "../../../supabase/functions/run-admt-checker/_w19_admt_join2.ts";
import { BUILD_STAMP } from "../../../supabase/functions/run-admt-checker/index.ts";

const FALLBACK = "the applicable ADMT-subchapter provision";

Deno.test("W19: BUILD_STAMP accepts the fallback-join2 variant (fresh clock)", () => {
  assertMatch(
    BUILD_STAMP,
    /^(w15-admt-factledger|w19-admt-turna|w20-admt-turna|w16-admt-flfix|w19-admt-fallbackjoin2|w23-admt-turna|w24-admt-attr|w24-admt-audit|w24-admt-h6|w25-admt-sanitizer|w26-admt-citation-audit|h7-admt-blanket-range|h7b-admt-citation-relabel|h6-admt-governing-anchor)@\d{4}-\d{2}-\d{2}T/,
    `unexpected BUILD_STAMP: ${BUILD_STAMP}`,
  );
});

Deno.test("W19: stamp export shape", () => {
  assertMatch(W19_ADMT_JOIN2_STAMP, /^w19-admt-fallbackjoin2@\d{4}-\d{2}-\d{2}$/);
});

Deno.test("W19: en-dash-joined double fallback (range endpoints) collapses to single", () => {
  const s = `Any accrual note references ${FALLBACK}\u2013${FALLBACK} and treats it as the citation range.`;
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.join_collapsed >= 1, `expected collapse, got ${r.join_collapsed}`);
  assertEquals(
    r.out,
    `Any accrual note references ${FALLBACK} and treats it as the citation range.`,
  );
});

Deno.test("W19: hyphen-joined double fallback collapses", () => {
  const s = `${FALLBACK}-${FALLBACK} obligations attach on this record.`;
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.join_collapsed >= 1);
  assertEquals(r.out, `${FALLBACK} obligations attach on this record.`);
});

Deno.test("W19: em-dash join collapses", () => {
  const s = `${FALLBACK}\u2014${FALLBACK}`;
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.join_collapsed >= 1);
  assertEquals(r.out, FALLBACK);
});

Deno.test("W19: triple-fallback chain collapses to single", () => {
  const s = `${FALLBACK}\u2013${FALLBACK}\u2013${FALLBACK}`;
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.join_collapsed >= 1);
  assertEquals(r.out, FALLBACK);
});

Deno.test("W19: 'subchapter-subchapter' → 'subchapter'", () => {
  const s = "the ADMT subchapter-subchapter obligations are therefore not triggered";
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.subchapter_fused >= 1);
  assertEquals(
    r.out,
    "the ADMT subchapter obligations are therefore not triggered",
  );
});

Deno.test("W19: 'subchapter subchapter' (space-joined) → 'subchapter'", () => {
  const s = "the ADMT subchapter subchapter obligations apply";
  const r = collapseFallbackJoinAndFusion(s);
  assert(r.subchapter_fused >= 1);
  assertEquals(r.out, "the ADMT subchapter obligations apply");
});

Deno.test("W19: legitimate real range '§ 7220–§ 7222' is untouched", () => {
  const s = "the §§ 7220\u20137222 ADMT obligations attach and § 7220\u2013§ 7222 is a valid range";
  const r = collapseFallbackJoinAndFusion(s);
  assertEquals(r.join_collapsed, 0);
  assertEquals(r.subchapter_fused, 0);
  assertEquals(r.out, s);
});

Deno.test("W19: single fallback occurrence is untouched", () => {
  const s = `A finding grounded on ${FALLBACK} is retained as-is.`;
  const r = collapseFallbackJoinAndFusion(s);
  assertEquals(r.join_collapsed, 0);
  assertEquals(r.out, s);
});

Deno.test("W19: insufficient-basis reword replaces meta-commentary", () => {
  const old =
    `insufficient basis — post-W6 residual defect (finding underspecified). The generator did not resolve enough facts on this record to author a compliant finding; supply the missing intake dimensions and re-run.`;
  const r = rewriteInsufficientBasisFinding(old, "the opt-out confirmation element");
  assert(r.rewritten === 1);
  assertMatch(r.out, /^More information is needed before this item can be assessed\./);
  assert(!/post-W6 residual defect/.test(r.out));
  assert(!/generator/i.test(r.out));
  assert(!/re-run/.test(r.out));
  assert(!/pipeline/i.test(r.out));
  assert(r.out.includes("the opt-out confirmation element"));
});

Deno.test("W19: reword tolerates the shorter registry-row variant", () => {
  const old =
    `insufficient basis — unresolved proposition_key "access_secure_transmission" against VERIFIED-AUTHORITY REGISTRY (registry row: 11 CCR § 7222). The generator did not resolve enough facts on this record to author a compliant finding; supply the missing intake dimensions and re-run.`;
  const r = rewriteInsufficientBasisFinding(old);
  assert(r.rewritten === 1);
  assert(!/insufficient basis/i.test(r.out));
  assert(!/proposition_key/.test(r.out));
});

Deno.test("W19: reword ignores unrelated 'insufficient' uses", () => {
  const s = "The insufficient response window is unrelated to this scrubber.";
  const r = rewriteInsufficientBasisFinding(s);
  assertEquals(r.rewritten, 0);
  assertEquals(r.out, s);
});

Deno.test("W19: applyW19AdmtJoin2 walks report and preserves information_needed semantics", () => {
  const report: any = {
    scope_analysis: {
      summary: `the ADMT subchapter-subchapter obligations are therefore not triggered; ${FALLBACK}\u2013${FALLBACK} would otherwise attach.`,
      significant_decision_reasoning: `${FALLBACK}-${FALLBACK} obligations attach`,
    },
    enforcement_context: {
      aggregate_exposure_note: `See ${FALLBACK}\u2013${FALLBACK} for the range.`,
    },
    opt_out_gaps: [
      {
        element_id: "optout_confirmation",
        status: "insufficient_basis",
        information_needed: true,
        finding:
          `insufficient basis — post-W6 residual defect (finding underspecified). The generator did not resolve enough facts on this record to author a compliant finding; supply the missing intake dimensions and re-run.`,
      },
    ],
    priority_actions: [`Address ${FALLBACK}\u2013${FALLBACK} exposure.`],
    _meta: {
      internal: {
        // Must NOT be walked or rewritten.
        _w9_admt_regen: {
          note: `insufficient basis — post-W6 residual defect (finding underspecified).`,
        },
      },
    },
  };
  const diag = applyW19AdmtJoin2(report);

  // Fallback-join collapses
  assert(diag.join_collapsed >= 4, `expected ≥4 collapses, got ${diag.join_collapsed}`);
  assert(diag.subchapter_fused >= 1);
  assert(diag.insufficient_basis_reworded >= 1);

  const flat = JSON.stringify({
    a: report.scope_analysis,
    b: report.enforcement_context,
    c: report.opt_out_gaps,
    d: report.priority_actions,
  });
  assert(!new RegExp(`${FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s-\\u2013\\u2014]+${FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(flat),
    "doubled fallback survived on customer surface");
  assert(!/subchapter-subchapter/i.test(flat), "doubled subchapter survived");
  assert(!/post-W6 residual defect/.test(flat), "old meta-commentary survived on customer surface");
  assert(!/The generator did not resolve/.test(flat), "generator meta-vocab survived");
  assert(!/re-run/.test(flat), "re-run vocab survived");

  // information_needed semantics preserved
  const e = report.opt_out_gaps[0];
  assertEquals(e.information_needed, true);
  assertEquals(e.status, "insufficient_basis");
  assertMatch(e.finding, /^More information is needed before this item can be assessed\./);
  assert(e.finding.includes("optout confirmation") || e.finding.includes("the opt-out element"));

  // _meta.internal untouched
  const internalNote = report._meta.internal._w9_admt_regen.note;
  assert(/post-W6 residual defect/.test(internalNote), "internal note must not be rewritten");
});

Deno.test("W19: fail-open on malformed reports", () => {
  const cases: unknown[] = [null, undefined, "", 0, false, [], {}];
  for (const c of cases) {
    const diag = applyW19AdmtJoin2(c as any);
    assertEquals(typeof diag.join_collapsed, "number");
    assertEquals(typeof diag.subchapter_fused, "number");
  }
});

Deno.test("W19: telemetry-placement leak-guard — walker respects _meta.internal and underscore keys", () => {
  const report: any = {
    good: `${FALLBACK}\u2013${FALLBACK}`,
    _w9_admt_regen: { should_not_touch: `${FALLBACK}\u2013${FALLBACK}` },
    _meta: { internal: { keep: `${FALLBACK}\u2013${FALLBACK}` } },
  };
  applyW19AdmtJoin2(report);
  assertEquals(report.good, FALLBACK);
  // Underscore-prefixed sibling and _meta.internal payload untouched.
  assert(report._w9_admt_regen.should_not_touch.includes(`${FALLBACK}\u2013${FALLBACK}`));
  assert(report._meta.internal.keep.includes(`${FALLBACK}\u2013${FALLBACK}`));
});

Deno.test("W19: source assertion — old meta-commentary string not authored in index.ts", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-admt-checker/index.ts", import.meta.url));
  assert(
    !src.includes("supply the missing intake dimensions and re-run"),
    "old meta-commentary phrase still authored in index.ts",
  );
  assert(
    !src.includes("The generator did not resolve enough facts on this record"),
    "old generator-meta phrase still authored in index.ts",
  );
  // The new customer-safe wording is present.
  assert(
    src.includes("More information is needed before this item can be assessed"),
    "new reworded finding string is not authored in index.ts",
  );
  // W19 pass wired in.
  assert(src.includes("applyW19AdmtJoin2("), "W19 pass call missing from index.ts");
});
