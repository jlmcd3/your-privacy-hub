// PROMPT 9M — special-category and children's-data balancing policy.
// CEO-ruled 2026-08-17. Branch sentinels for items 1–5.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildLegalBasis,
  readChildLiaCredit,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { computeAskLabelsHash, DPIA_ASK_LABELS_HASH } from "../../../supabase/functions/_shared/ltp/dpia-ask-labels.ts";

const BASE = {
  processing_activity_name: "Return-to-work review scheduling",
  purpose: "To schedule occupational-health return-to-work reviews for staff returning from long-term sick leave.",
  data_subjects: "Employees returning from long-term sick leave",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Contact details"],
  existing_safeguards: ["Access controls", "Staff training"],
  necessity_proportionality:
    "The scheduling has an impact on the data subjects because it affects the employees concerned and touches their reasonable expectations at work.",
  alternatives_considered: [
    {
      processing_operation: "primary",
      alternative: "Manual scheduling from paper certificates",
      rejection_reason: "Cannot deliver the review within the statutory window at the recorded volume.",
    },
  ],
  legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
};

Deno.test("9M: ask-labels hash re-pins over the two new classes", async () => {
  assertEquals(await computeAskLabelsHash(), DPIA_ASK_LABELS_HASH);
});

Deno.test("9M item 1: children's data alone no longer triggers the Art. 9 ruling", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    data_categories: ["Contact details", "Children's data"],
    existing_safeguards: ["Access controls"],
    necessity_proportionality:
      BASE.necessity_proportionality +
      " A dedicated legitimate interests assessment has been conducted for the children's data stream with age-appropriate safeguards.",
  });
  assert(!f.justification.includes("Legitimate interests cannot serve as the lawful basis"));
  assertEquals(f.art9_special, undefined);
});

Deno.test("9M items 2+3: health data — balance scoped and met, ruling rendered, basis analysed", () => {
  const [f] = buildLegalBasis({ ...BASE, data_categories: ["Contact details", "Health or medical data"] });
  assertEquals(f.legitimate_interests_test?.balancing_test_met, true);
  assertEquals(f.status, "analysed");
  assertEquals(f.art9_special, true);
  assert(f.justification.includes("Legitimate interests cannot serve as the lawful basis for processing special-category data."));
  assert(f.justification.includes("must be isolated and subjected to a separate assessment"));
  assert(f.legitimate_interests_test!.balancing_test_why.includes("for the non-special-category items"));
  assert(f.information_needed!.includes("Isolate the special-category items"));
  assert((f.ask_parts ?? []).some((p) => p.ask_class === "ask_lia_special_category"));
});

Deno.test("9M item 4: children's data credited — four steps, step 1 first, span quoted", () => {
  const [f] = buildLegalBasis({
    ...BASE,
    data_categories: ["Contact details", "Children's data"],
    necessity_proportionality:
      BASE.necessity_proportionality +
      " A dedicated legitimate interests assessment has been conducted for the children's data stream.",
  });
  const why = f.legitimate_interests_test!.balancing_test_why;
  assert(why.startsWith("The data set includes children's data."));
  assert(why.includes("On that basis, the balancing discussion proceeds."));
  assertEquals(f.legitimate_interests_test?.balancing_test_met, true);
  assertEquals(f.status, "analysed");
});

Deno.test("9M item 4: children's data NOT credited — gate closes, ask emitted, ledgered to basis", () => {
  const [f] = buildLegalBasis({ ...BASE, data_categories: ["Contact details", "Children's data"] });
  const why = f.legitimate_interests_test!.balancing_test_why;
  assert(why.startsWith("The data set includes children's data."));
  assert(why.includes("cannot proceed for this operation based on the information the company provided."));
  assertEquals(f.legitimate_interests_test?.balancing_test_met, false);
  assertEquals(f.status, "record_insufficient");
  assert(f.information_needed!.includes("dedicated legitimate interests assessment"));
  const classes = (f.ask_parts ?? []).map((p) => p.ask_class);
  assert(classes.includes("ask_lia_children"));
  assert(!classes.includes("ask_lia_balancing"));
  assertEquals(f.gap_field, "legal_basis_proposed");
});

Deno.test("9M item 4 step 2: reader honours blockers and requires one sentence", () => {
  assertEquals(readChildLiaCredit({ necessity_proportionality: "A children's legitimate interests assessment is planned." }).credited, false);
  assertEquals(readChildLiaCredit({ necessity_proportionality: "No legitimate interests assessment for children has been conducted." }).credited, false);
  assertEquals(readChildLiaCredit({ necessity_proportionality: "Children are in scope. A legitimate interests assessment was completed." }).credited, false);
  const ok = readChildLiaCredit({ necessity_proportionality: "A dedicated legitimate interests assessment for children has been completed." });
  assertEquals(ok.credited, true);
  assert(ok.span.length > 0);
});

// DEFECT FIX (batch a2db9e57, 2026-08-26) — art9Special previously read the
// RECORD-LEVEL data_categories unconditionally, so a SECONDARY operation
// whose own text disclaims touching special-category data still got the
// Art. 9(2) isolation ask, purely because the PRIMARY operation on the same
// record processes health data under its own, separately-compliant basis.
// Mirrors the disclaimer carve-out already applied to the quality-batch
// fixture screener (perfect-closed-loop.ts, fixed 2026-08-25) — that fix
// only patched the test screen; this closes the same gap in the product
// builder itself.
Deno.test("9M defect fix: secondary op disclaiming special-category data is NOT flagged, even though the record's primary operation processes health data", () => {
  const [primary, secondary] = buildLegalBasis({
    ...BASE,
    processing_activity_name: "Return-to-work review scheduling",
    data_categories: ["Contact details", "Health or medical data"],
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    article_9_condition: "Employment, social security & social protection law (Art. 9(2)(b))",
    secondary_uses:
      "Aggregated, anonymised session counts are also used under legitimate interests to monitor scheduling-tool reliability; no special-category data or biometric data is included in this secondary use.",
    alternatives_considered: [
      ...BASE.alternatives_considered,
      {
        processing_operation: "Return-to-work review scheduling — secondary use",
        alternative: "Sampling a subset of sessions instead of aggregating all of them",
        rejection_reason: "Would not give a reliable reliability signal at low volumes.",
      },
    ],
  });
  // Primary operation: unaffected, still reads record-level categories via
  // the non-6(1)(f) branch (legal obligation), cross-referencing Art. 9.
  assertEquals(primary.legitimate_interests_test, undefined);
  // Secondary operation: resolves its OWN 6(1)(f) basis from its own text,
  // and that text disclaims special-category involvement — no isolation ask.
  assertEquals(secondary.operation_id, "op_secondary");
  assertEquals(secondary.art9_special, undefined);
  assert(!(secondary.information_needed ?? "").includes("Isolate the special-category items"));
  assert(!secondary.justification.includes("Legitimate interests cannot serve as the lawful basis"));
  assert(!(secondary.ask_parts ?? []).some((p) => p.ask_class === "ask_lia_special_category"));
});

Deno.test("9M defect-fix negative control: secondary op with NO disclaimer still gets the isolation ask (the fix must not over-widen)", () => {
  const [, secondary] = buildLegalBasis({
    ...BASE,
    processing_activity_name: "Return-to-work review scheduling",
    data_categories: ["Contact details", "Health or medical data"],
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    article_9_condition: "Employment, social security & social protection law (Art. 9(2)(b))",
    secondary_uses:
      "Session data is also used under legitimate interests to monitor scheduling-tool reliability.",
    alternatives_considered: [
      ...BASE.alternatives_considered,
      {
        processing_operation: "Return-to-work review scheduling — secondary use",
        alternative: "Sampling a subset of sessions instead of aggregating all of them",
        rejection_reason: "Would not give a reliable reliability signal at low volumes.",
      },
    ],
  });
  assertEquals(secondary.operation_id, "op_secondary");
  assertEquals(secondary.art9_special, true);
  assert((secondary.information_needed ?? "").includes("Isolate the special-category items"));
  assert((secondary.ask_parts ?? []).some((p) => p.ask_class === "ask_lia_special_category"));
});

Deno.test("9M: byte identity — a record with neither trigger is unchanged", () => {
  const [f] = buildLegalBasis(BASE);
  assertEquals(f.status, "analysed");
  assertEquals(f.art9_special, undefined);
  assertEquals(f.information_needed, undefined);
  assertEquals(
    f.legitimate_interests_test!.balancing_test_why,
    'Part three (balancing test): the record describes the effect on Employees returning from long-term sick leave and records the measures that reduce it (Access controls; Staff training), so the controller\'s interest is not shown to be overridden on this record.',
  );
});
