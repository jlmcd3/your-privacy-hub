// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), IR items.
//
//   P10 The Virginia paragraph read "Of the remaining recorded types
//       (Biometric data): health or medical records, biometric data,
//       passwords or credentials standing alone, location data, children's
//       data, and other types outside § 18.2-186.6(A)'s element list do not,
//       by themselves, constitute personal information" — the statute's own
//       catalogue of uncovered types recited as if they were on the record.
//       Every gated state now carries `element_list_citation` and
//       `covered_term`; the sentence names only the RECORDED types that fall
//       outside the list. Texas and Massachusetts keep their standalone-limb
//       clarification as `element_list_note`.
//   P11 California and Illinois said biometric data "falls within the
//       statute's covered elements" without the name-plus-element combination
//       step. Where a matched limb requires the name and the record lists
//       names, the combination sentence follows.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { STATE_WALK_GATES } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/us-state-duties.ts";

type Bag = Record<string, unknown>;

function mk(over: Bag = {}): Bag {
  return {
    organizationName: "Busted Sled Solutions, Inc.",
    discoveryDateTime: "2026-09-05T10:00",
    cause: "Phishing / credential compromise",
    dataTypes: ["Names and contact details", "Biometric data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["California", "Colorado", "Virginia", "Illinois"],
    contained: "Yes",
    organisationType: "Company",
    processorInvolved: true,
    ...over,
  };
}

function textFor(over: Bag = {}): string {
  const intake = mk(over);
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return JSON.stringify(assembleIRSkeletonDocument(report, intake));
}

const COMBINATION =
  "Each of those elements is covered in combination with the individual's first name or first initial and last name; the recorded data types include names and contact details, so that combination is present.";

Deno.test("doc188 P10 — every gated state carries the element-list pinpoint and the statute's own covered term", () => {
  for (const [state, g] of Object.entries(STATE_WALK_GATES)) {
    assert(g.element_list_citation && /§|ILCS|RCW|ORS/.test(g.element_list_citation), `${state} element_list_citation`);
    assert(g.covered_term && /information under this (section|chapter)$/.test(g.covered_term), `${state} covered_term`);
  }
  assertEquals(STATE_WALK_GATES["Virginia"].element_list_citation, "§ 18.2-186.6(A)");
  assertEquals(STATE_WALK_GATES["Texas"].element_list_note, "§ 521.002(a)(2) carries no standalone biometric or online-credential limb");
  assertEquals(STATE_WALK_GATES["Massachusetts"].element_list_note, "Massachusetts has no health, biometric, or online-account-credential limb");
});

Deno.test("doc188 P10 — Virginia names only the recorded type that falls outside its list (the batch record)", () => {
  const text = textFor({ jurisdictions: ["Virginia"] });
  assertStringIncludes(
    text,
    "The remaining recorded type — Biometric data — falls outside § 18.2-186.6(A)'s element list and does not, by itself, constitute personal information under this section.",
  );
  assert(!text.includes("passwords or credentials standing alone"), "types not on the record must not be recited");
  assert(!text.includes("children's data, and other types outside"), "the statute's catalogue must not be recited as recorded types");
  assert(!text.includes("Of the remaining recorded types ("), "the old parenthetical form is gone for a gated state");
});

Deno.test("doc188 P10 — two unmatched recorded types read as a plural list", () => {
  const text = textFor({ jurisdictions: ["Virginia"], dataTypes: ["Names and contact details", "Biometric data", "Health / medical records"] });
  assertStringIncludes(text, "The remaining recorded types — Biometric data and Health / medical records — fall outside § 18.2-186.6(A)'s element list and do not, by themselves, constitute personal information under this section.");
});

Deno.test("doc188 P10 — Texas and Massachusetts append their standalone-limb clarification", () => {
  const tx = textFor({ jurisdictions: ["Texas"] });
  assertStringIncludes(tx, "falls outside § 521.002(a)(2)'s element list and does not, by itself, constitute sensitive personal information under this chapter; § 521.002(a)(2) carries no standalone biometric or online-credential limb.");
  const ma = textFor({ jurisdictions: ["Massachusetts"], dataTypes: ["Names and contact details", "Biometric data", "Passwords / credentials"] });
  assertStringIncludes(ma, "The remaining recorded types — Biometric data and Passwords / credentials — fall outside ch. 93H, § 1's element list");
  assertStringIncludes(ma, "Massachusetts has no health, biometric, or online-account-credential limb.");
});

Deno.test("doc188 P11 — California and Illinois state the name-plus-element combination for biometric data", () => {
  for (const state of ["California", "Illinois"]) {
    const text = textFor({ jurisdictions: [state] });
    assertStringIncludes(text, "fall within the statute's covered elements: Biometric data —", state);
    assertStringIncludes(text, COMBINATION, state);
  }
});

Deno.test("doc188 P11 — a standalone limb (online credentials) earns no combination sentence", () => {
  const text = textFor({ jurisdictions: ["California"], dataTypes: ["Names and contact details", "Passwords / credentials"] });
  assertStringIncludes(text, "fall within the statute's covered elements: Passwords / credentials —");
  assert(!text.includes(COMBINATION), "no name-combination step for a limb that does not require the name");
});

Deno.test("doc188 P11 — without names on the record the conditional sentence stands and the combination sentence does not", () => {
  const text = textFor({ jurisdictions: ["California"], dataTypes: ["Biometric data"] });
  assertStringIncludes(text, "reach the covered elements only in combination with the individual's name, which the recorded data types do not list");
  assert(!text.includes(COMBINATION));
});

Deno.test("doc188 — the batch's four-state record renders each state once with the new sentences", () => {
  const text = textFor();
  for (const state of ["California", "Colorado", "Virginia", "Illinois"]) {
    const marker = `Here is how ${state}'s law applies to this incident.`;
    assertEquals(text.split(marker).length - 1, 1, `${state} paragraph count`);
  }
  // Virginia's list has no biometric limb; Colorado's does (§ 6-1-716(1)(g)(I)(A)).
  assertStringIncludes(text, "falls outside § 18.2-186.6(A)'s element list");
  assertStringIncludes(text, "biometric data (§ 6-1-716(1)(g)(I)(A))");
  assert(!text.includes("falls outside § 6-1-716(1)(g)'s element list"));
});
