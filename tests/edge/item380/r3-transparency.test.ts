// ITEM 380 r3 — DPIA transparency surface: repair writer + ask-category mapping.
//
// Proves:
//  1. the measures_rights c2 violation is REPAIRED when both backing keys are
//     supplied, and the rewritten surface carries the record's own content;
//  2. it stays UNREPAIRED when either key is empty (honest degradation);
//  3. the transparency ask category is dropped from foundations when both keys
//     are supplied, and KEPT when either is empty / absent (safety direction);
//  4. the pre-existing single-writer builders are untouched (snapshot);
//  5. the record-complete gate reaches TRUE on a document whose only false
//     absence was the (now repaired) measures_rights case.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  buildDpiaDataSubjectViews,
  buildDpiaMeasuresRights,
  DPIA_CSC_VERSION,
  runDpiaCsc,
} from "../../../supabase/functions/_shared/ltp/dpia-csc.ts";
import {
  categoryAnsweredByRecord,
  filterCategoriesAgainstRecord,
} from "../../../supabase/functions/_shared/prose/ask-categories.ts";
import { computeRecordComplete } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

const perfectIntake =
  (DPIA_PERFECT as readonly { intake: Record<string, unknown> }[])[0].intake;

const RIGHTS = perfectIntake.data_subject_rights_mechanisms as string;
const CONTEXT = perfectIntake.nature_scope_context as string;

const ABSENCE = "The intake does not describe this, and the point is listed as information needed.";

const docWith = (measures: unknown) => ({
  section_2_analysis: { measures_rights: measures },
});

// --- (1) repaired when both keys supplied -----------------------------------
Deno.test("measures_rights: c2 repaired when both backing keys are supplied", () => {
  const report = docWith([ABSENCE]);
  const t = runDpiaCsc(report as never, { intake: perfectIntake } as never);
  const v = t.violations.filter((x) => x.path === "section_2_analysis.measures_rights");
  assertEquals(v.length, 1);
  assertEquals(v[0].repaired, true);

  const rebuilt = (report.section_2_analysis as Record<string, unknown>).measures_rights;
  assert(Array.isArray(rebuilt), "array shape is preserved");
  const text = (rebuilt as string[]).join(" ");
  assert(text.includes(RIGHTS.replace(/\.$/, "")), "carries the record's rights mechanisms");
  assert(/Arts\. 12 to 14/.test(text));
  assert(!text.includes(ABSENCE));
  assert(!/on the record/i.test(text), "register-clean: no 'on the record' idiom");
});

Deno.test("measures_rights builder composes notice content from nature_scope_context", () => {
  const text = buildDpiaMeasuresRights(perfectIntake);
  assert(text.includes("how individuals are told about the processing"));
  assert(text.includes("works council"), "notice sentences are carried across verbatim");
});

// --- (2) unrepaired when a key is empty -------------------------------------
for (const key of ["data_subject_rights_mechanisms", "nature_scope_context"]) {
  Deno.test(`measures_rights: unrepaired when ${key} is empty`, () => {
    const intake = { ...perfectIntake, [key]: "" };
    const report = docWith([ABSENCE]);
    const t = runDpiaCsc(report as never, { intake } as never);
    const v = t.violations.filter((x) => x.path === "section_2_analysis.measures_rights");
    // The surface is not "backed" at all, so the check is skipped entirely —
    // either way, nothing is ever recorded as repaired and the prose is intact.
    assertEquals(v.filter((x) => x.repaired).length, 0);
    assertEquals(buildDpiaMeasuresRights(intake), "");
    assertEquals((report.section_2_analysis as Record<string, unknown>).measures_rights, [ABSENCE]);
  });
}

// --- (3) ask-category mapping ------------------------------------------------
const CATS = [{ id: "transparency" }, { id: "unspecified" }] as never[];

Deno.test("transparency is dropped from foundations when both keys are supplied", () => {
  assertEquals(categoryAnsweredByRecord("transparency", perfectIntake), true);
  const kept = filterCategoriesAgainstRecord(CATS, perfectIntake).map((c) =>
    (c as { id: string }).id
  );
  assertEquals(kept, ["unspecified"]);
});

Deno.test("transparency is KEPT when either key is empty or absent", () => {
  for (
    const intake of [
      { ...perfectIntake, data_subject_rights_mechanisms: "" },
      { ...perfectIntake, nature_scope_context: "   " },
      { organization_name: "Acme" }, // products whose intake lacks both keys
      {},
    ]
  ) {
    assertEquals(categoryAnsweredByRecord("transparency", intake), false);
    const kept = filterCategoriesAgainstRecord(CATS, intake).map((c) => (c as { id: string }).id);
    assertEquals(kept, ["transparency", "unspecified"]);
  }
});

// --- (4) existing builders untouched (snapshot) ------------------------------
Deno.test("data_subject_views builder output is unchanged", () => {
  const out = buildDpiaDataSubjectViews({
    data_subjects_views_sought: "Yes, through the works council",
    data_subjects_views: "The council asked for line-management visibility to be limited",
  });
  assertEquals(
    out,
    "The record states, on whether the views of data subjects were sought: Yes, through the works council. " +
      "The views recorded are: The council asked for line-management visibility to be limited. " +
      "The controller records these views under GDPR Art. 35(9); where they were not followed, the reasons are recorded with the decision in Section 6.",
  );
});

Deno.test("dpia-csc version is bumped to item380r3", () => {
  assertEquals(DPIA_CSC_VERSION, "dpia-csc-2026-08-05-item380r3");
});

// --- (5) the gate opens once the measures_rights case is repaired ------------
Deno.test("gate reaches TRUE when the only false absence was measures_rights (now repaired)", () => {
  const t = computeRecordComplete({
    product: "dpia",
    contract: dpiaFrameworkContract,
    intake: perfectIntake,
    coverage: { crashed: false, counts: { orphans: 0 } } as never,
    csc: {
      crashed: false,
      violations: [{ check_id: "c2_absence_claim_vs_record", repaired: true }],
    } as never,
    recordNeedsMissingData: 0,
  });
  assertEquals(t.counts.csc_false_absence, 0);
  assertEquals(t.failed_conditions, []);
  assert(t.value);
});
