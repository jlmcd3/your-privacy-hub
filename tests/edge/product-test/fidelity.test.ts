// product-test-grade — fidelity family: foreign-company and not-recorded logic.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/fidelity.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkFidelity } from "../../../supabase/functions/product-test-grade/_local/grade/fidelity.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";

function skeletonDoc(paragraphs: string[]) {
  return {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [{
      id: "body", title: "Body",
      paragraphs: paragraphs.map((text, i) => ({ kind: "skeleton", text, key: `body:${i}` })),
    }],
  };
}

Deno.test("fidelity: the fixture's own company name must be present (high)", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Northbank Mutual" },
    { skeleton_document: skeletonDoc(["This report concerns Northbank Mutual's processing activities."]) },
    "golden", undefined, undefined,
  );
  const own = checks.find((c) => c.check_id === "fidelity.company_name_present");
  assert(own);
  assertEquals(own!.passed, true);
});

Deno.test("fidelity: a foreign panel company's name appearing fails critical", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Northbank Mutual" },
    { skeleton_document: skeletonDoc(["This report accidentally names Castleforth Capital Partners Ltd instead."]) },
    "golden", undefined, ["Castleforth Capital Partners Ltd", "Halcyon Audience Exchange, Inc."],
  );
  const foreign = checks.find((c) => c.check_id === "fidelity.no_foreign_company");
  assert(foreign, "expected a fidelity.no_foreign_company check to fire");
  assertEquals(foreign!.passed, false);
  assertEquals(foreign!.severity, "critical");
});

Deno.test("fidelity: no foreign company present passes clean", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Northbank Mutual" },
    { skeleton_document: skeletonDoc(["This report concerns Northbank Mutual only."]) },
    "golden", undefined, ["Castleforth Capital Partners Ltd"],
  );
  const foreign = checks.find((c) => c.check_id === "fidelity.no_foreign_company");
  // no hit => the loop never pushes a failing check for this pair, but it
  // DOES push a passing one since the tool iterates panel_companies.
  assert(foreign);
  assertEquals(foreign!.passed, true);
});

Deno.test("fidelity: must_report_not_recorded satisfied when label is absent entirely", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(["Acme's programme is otherwise unremarkable."]) },
    "thin-one",
    { must_report_not_recorded: ["training_status"], must_not_contain: [], must_contain: [] },
    undefined,
  );
  const nr = checks.find((c) => c.check_id === "fidelity.not_recorded_reported");
  assert(nr);
  assertEquals(nr!.passed, true); // label absent entirely => OK
});

Deno.test("fidelity: must_report_not_recorded fails when label present without not-recorded phrasing", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(["Acme's training_status is excellent across the board."]) },
    "thin-one",
    { must_report_not_recorded: ["training_status"], must_not_contain: [], must_contain: [] },
    undefined,
  );
  const nr = checks.find((c) => c.check_id === "fidelity.not_recorded_reported");
  assert(nr);
  assertEquals(nr!.passed, false);
});

Deno.test("fidelity: must_report_not_recorded passes when the not-recorded phrase is in the same paragraph", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(["Acme's training_status is not recorded on the information provided."]) },
    "thin-one",
    { must_report_not_recorded: ["training_status"], must_not_contain: [], must_contain: [] },
    undefined,
  );
  const nr = checks.find((c) => c.check_id === "fidelity.not_recorded_reported");
  assert(nr);
  assertEquals(nr!.passed, true);
});

Deno.test("fidelity: must_not_contain present fails critical", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(["The lawful basis under Article 6 GDPR applies here."]) },
    "contradict",
    { must_report_not_recorded: [], must_not_contain: ["Article 6 GDPR"], must_contain: [] },
    undefined,
  );
  const c = checks.find((ch) => ch.check_id === "fidelity.must_not_contain");
  assert(c);
  assertEquals(c!.passed, false);
  assertEquals(c!.severity, "critical");
});

Deno.test("fidelity: must_contain absent fails high", () => {
  const checks = checkFidelity(
    "governance", governanceContract,
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(["Nothing relevant here."]) },
    "authored",
    { must_report_not_recorded: [], must_not_contain: [], must_contain: ["statutory damages"] },
    undefined,
  );
  const c = checks.find((ch) => ch.check_id === "fidelity.must_contain");
  assert(c);
  assertEquals(c!.passed, false);
  assertEquals(c!.severity, "high");
});
