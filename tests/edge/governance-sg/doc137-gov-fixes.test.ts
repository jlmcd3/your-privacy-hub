// DOC 137 (2026-09-01) — two confirmed Governance defects:
//
//   FIX 1  the Art. 30(1)(c) element walk conflated the special-category
//          data list (`special_categories_list`) with the general
//          Art. 30(1)(c) categories. An intake that answers
//          `special_category: "No"` with `special_categories_list: []` had
//          correctly and completely answered the sub-element by recording
//          nothing to list, but the walk classified the empty list as
//          MISSING and asked the customer to "supply the special-category
//          data list" — a remediation item for information that does not
//          exist and was never asked for.
//
//   FIX 2  the DPO determination overclaimed Article 38/39 operational
//          compliance from designation alone: "the assessment takes the
//          Article 38 position as evidenced on that basis" and "the
//          assessment takes Article 39 task coverage as evidenced on that
//          basis" (A-Team Batch 5). A formal designation establishes that
//          Articles 38-39 APPLY, not that the specific operational
//          safeguards (timely involvement, resources, no instructions,
//          protection from dismissal, direct reporting, conflict
//          management) or the untested Art. 39(1) tasks are being met in
//          practice. Only tasks the intake specifically evidences
//          (training -> 39(1)(b), DPIA activity -> 39(1)(c)) may read as
//          supported; the rest must read "not independently assessed".
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt30ElementFindings,
  buildDpoDetermination,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/_shared/golden/governance-perfect.ts";

type Bag = Record<string, unknown>;

// ---------------------------------------------------------------------------
// FIX 1 — special_category: "No" is a correctly-answered, not a missing, list
// ---------------------------------------------------------------------------

Deno.test("DOC137-F1 — special_category=No with an empty list is CORRECTLY ANSWERED, not missing", () => {
  const findings = buildArt30ElementFindings({
    data_categories: ["Customer records", "Employee records"],
    special_category: "No",
    special_categories_list: [],
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assert(el, "the art30_c finding must exist");
  assertEquals(el.verdict, "satisfied");
  assertEquals(el.status, "analysed");
  assert(
    el.information_needed === undefined,
    `no remediation item should fire when special_category is answered "No": got ${JSON.stringify(el.information_needed)}`,
  );
  // The record_fact may describe the "No" state, but must never ask the
  // customer to supply the list.
  const infoText = JSON.stringify(el);
  assert(
    !/[Ss]upply the special-category data list/.test(infoText),
    "must not ask to supply a list of nothing",
  );
});

Deno.test("DOC137-F1 — special_category genuinely unanswered still flags the existing missing-field gap (unchanged)", () => {
  const findings = buildArt30ElementFindings({
    data_categories: ["Customer records"],
    // special_category and special_categories_list both absent — genuinely unanswered
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assert(el, "the art30_c finding must exist");
  assertEquals(el.verdict, "partially_satisfied");
  assertStringIncludes(String(el.information_needed ?? ""), "the special-category data list");
  assertStringIncludes(String(el.information_needed ?? ""), "Article 30(1)(c)");
});

Deno.test("DOC137-F1 — special_category=Yes with an empty list is still treated as missing (unchanged)", () => {
  const findings = buildArt30ElementFindings({
    data_categories: ["Customer records"],
    special_category: "Yes",
    special_categories_list: [],
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assertEquals(el.verdict, "partially_satisfied");
  assertStringIncludes(String(el.information_needed ?? ""), "the special-category data list");
});

Deno.test("DOC137-F1 — general Art. 30(1)(c) data_categories evaluation is unaffected by the special_category=No fix", () => {
  // With data_categories genuinely absent AND special_category answered
  // "No", the element must still flag as missing/partial on the strength
  // of the general categories, not be pulled to "satisfied" by the
  // special-category fix.
  const findings = buildArt30ElementFindings({
    special_category: "No",
    special_categories_list: [],
  } as never);
  const el = findings.find((f) => f.key === "art30_c") as unknown as Bag;
  assertEquals(el.verdict, "partially_satisfied");
  assertStringIncludes(String(el.information_needed ?? ""), "the categories of personal data");
});

// ---------------------------------------------------------------------------
// FIX 2 — DPO Art. 38/39: "not independently assessed", not "evidenced"
// ---------------------------------------------------------------------------

Deno.test("DOC137-F2 — Art. 38 operational safeguards read 'not independently assessed', never 'evidenced'", () => {
  const dpo = buildDpoDetermination(GOVERNANCE_PERFECT[0].intake as Record<string, unknown>);
  const art38 = dpo.position_and_independence as unknown as Bag;
  const app = String(art38.application);
  assertStringIncludes(app, "not independently assessed");
  assert(
    !/takes the Article 38 position as evidenced/i.test(app),
    "must not claim the Article 38 position is evidenced by designation alone",
  );
  // The formal designation itself remains a factual, unhedged statement.
  assertStringIncludes(app, "A formal designation carries the Article 38 duties with it");
});

Deno.test("DOC137-F2 — Art. 39: only the specifically-evidenced tasks read as supported; the rest are not independently assessed", () => {
  const dpo = buildDpoDetermination(GOVERNANCE_PERFECT[0].intake as Record<string, unknown>);
  const art39 = dpo.task_coverage as unknown as Bag;
  const app = String(art39.application);
  assert(
    !/takes Article 39 task coverage as evidenced/i.test(app),
    "must not claim overall Article 39 task coverage is evidenced by designation alone",
  );
  // Training -> 39(1)(b) and DPIA activity -> 39(1)(c) are specifically
  // evidenced and may read as supported.
  assertStringIncludes(app, "training activity supports 39(1)(b)");
  assertStringIncludes(app, "DPIA activity supports 39(1)(c)");
  // The remaining three tasks must read as not independently assessed.
  assertStringIncludes(app, "not independently assessed");
  assertStringIncludes(app, "39(1)(a)");
  assertStringIncludes(app, "39(1)(d)");
  assertStringIncludes(app, "39(1)(e)");
});

Deno.test("DOC137-F2 — an unrequested Art. 38/39 operating fact is neither a compliance failure nor a presumed success", () => {
  const dpo = buildDpoDetermination(GOVERNANCE_PERFECT[0].intake as Record<string, unknown>);
  const art38 = dpo.position_and_independence as unknown as Bag;
  // Verdict/status machinery is unchanged by this refinement — the panel-
  // ratified unrequested-fact rule (ITEM 403-A DEFECT 2) still applies: a
  // fact never asked for carries no adverse weight.
  assertEquals(art38.verdict, "satisfied");
  assertEquals(art38.status, "analysed");
  const info = String(art38.information_needed ?? "");
  assert(/would let/i.test(info), info);
  assert(
    !/None of those five is evidenced/i.test(String(art38.application ?? "")),
    "must not penalise facts the intake never requested",
  );
});
