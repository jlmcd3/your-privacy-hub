// product-test-grade — structure family: leaks caught on a synthetic document.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/structure.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructure } from "../../../supabase/functions/product-test-grade/_local/grade/structure.ts";

function skeletonDoc(text: string) {
  return {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "Test Report",
    subtitle: "Subtitle",
    sections: [
      { id: "cover", title: "Cover", paragraphs: [{ kind: "skeleton", text, key: "cover:0" }] },
    ],
  };
}

Deno.test("structure: undefined leak fails critical", () => {
  const checks = checkStructure(
    "dpia",
    { organization_name: "Acme Inc" },
    { skeleton_document: skeletonDoc("The Company reports undefined for this field, which is a defect.") },
  );
  const leak = checks.find((c) => c.check_id === "structure.leak.undefined_leak");
  assert(leak, "expected an undefined_leak check");
  assertEquals(leak!.passed, false);
  assertEquals(leak!.severity, "critical");
});

Deno.test("structure: UUID leak fails critical", () => {
  const checks = checkStructure(
    "dpia",
    {},
    { skeleton_document: skeletonDoc("Reference id 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d appears in the text.") },
  );
  const leak = checks.find((c) => c.check_id === "structure.leak.uuid_leak");
  assert(leak);
  assertEquals(leak!.passed, false);
  assertEquals(leak!.severity, "critical");
});

Deno.test("structure: unfilled slot leak fails critical", () => {
  const checks = checkStructure(
    "dpia",
    {},
    { skeleton_document: skeletonDoc("The retention period is {retention_period} days.") },
  );
  const leak = checks.find((c) => c.check_id === "structure.leak.unfilled_slot");
  assert(leak);
  assertEquals(leak!.passed, false);
});

Deno.test("structure: raw intake key leak fails critical", () => {
  const checks = checkStructure(
    "dpia",
    { dpia_approval_date: "2026-01-01" },
    { skeleton_document: skeletonDoc("The value of dpia_approval_date was echoed verbatim into the document.") },
  );
  const leak = checks.find((c) => c.check_id === "structure.leak.raw_intake_key");
  assert(leak);
  assertEquals(leak!.passed, false);
  assertEquals(leak!.quote, "dpia_approval_date");
});

Deno.test("structure: clean document passes all leak checks", () => {
  const longText = "A perfectly ordinary compliance sentence with no defects whatsoever, repeated for length. ".repeat(20);
  const checks = checkStructure(
    "governance",
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc(longText) },
  );
  const leaks = checks.filter((c) => c.check_id.startsWith("structure.leak."));
  for (const l of leaks) assertEquals(l.passed, true, `${l.check_id} unexpectedly failed`);
});

Deno.test("structure: empty section fails high", () => {
  const doc = {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [{ id: "cover", title: "Cover", paragraphs: [] }],
  };
  const checks = checkStructure("governance", {}, { skeleton_document: doc });
  const empty = checks.find((c) => c.check_id === "structure.no_empty_section");
  assert(empty);
  assertEquals(empty!.passed, false);
  assertEquals(empty!.severity, "high");
});

Deno.test("structure: dpa text length floor is 2000, ir-playbook is 3000", () => {
  const short = "x".repeat(100);
  const dpaChecks = checkStructure("dpa", {}, { dpa_text: short });
  const irChecks = checkStructure("ir-playbook", {}, { playbook_text: short });
  const dpaFloor = dpaChecks.find((c) => c.check_id === "structure.text_length_floor");
  const irFloor = irChecks.find((c) => c.check_id === "structure.text_length_floor");
  assert(dpaFloor && dpaFloor.expected === "> 2000 chars");
  assert(irFloor && irFloor.expected === "> 3000 chars");
  assertEquals(dpaFloor!.passed, false);
  assertEquals(irFloor!.passed, false);
});
