// B3A5DD01 (quality batch, 2026-08-28) — IR fix.
//   IR1 [HIGH ×7] every e1_section_present check failed on the live
//       document ("missing section: Section 1: IMMEDIATE ACTIONS" through
//       "Section 7: POST-INCIDENT ACTIONS") — unconditionally, on every
//       document, once IR_DETERMINISTIC_ENABLED went live. Root cause was
//       TWO layered defects: (1) `ir_deterministic_checks` was computed
//       against `playbook_text` at line ~1874, ~250 lines BEFORE
//       playbook_text is reassigned to the skeleton's rendered text — on
//       the deterministic path it was still "" at that point, so E2-E6
//       (counsel-referral, bare-advisory-close, TBC-bracket checks) were
//       ALSO silently running against an empty string, passing trivially
//       instead of protecting anything; (2) IR_REQUIRED_SECTIONS itself
//       named a document shape (seven numbered "## Section N:" headings)
//       that only the LEGACY MODEL-generated text ever produced — a shape
//       that has not been customer-facing since the SO-7 skeleton wire-in
//       (2026-08-10), independent of this flag. E1 is retired for IR; the
//       skeleton's own verifySkeletonConformance battery is the structural
//       source of truth. The ordering bug is fixed so E2-E6 (which remain
//       meaningful regardless of section shape) actually run on real
//       content going forward.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runFormatChecksIR } from "../../../supabase/functions/_shared/grader/format-checks.ts";

Deno.test("IR1 — E1 never fires for IR regardless of input shape", () => {
  const shapes = [
    "",
    "Part One - The Standing Playbook\nStanding Sections\nPart Two - The Incident Worksheet",
    "## Section 1: IMMEDIATE ACTIONS\ncontent only, no other sections at all",
    "random text with no structure whatsoever",
  ];
  for (const text of shapes) {
    const findings = runFormatChecksIR(text);
    assert(
      !findings.some((f) => f.check_id.startsWith("e1_")),
      `no e1_* finding may fire for IR (input: ${JSON.stringify(text.slice(0, 40))})`,
    );
  }
});

Deno.test("IR1 — E2-E6 still run and find real content, proving the empty-string blind spot is closed", () => {
  // E6 (counsel referral) is the clearest positive-control: it can only
  // fire on genuine content, so a pass here on non-trivial text confirms
  // the checks are reading something other than "".
  const bad = "Before responding, the company should consult qualified legal counsel on the notification position.";
  const findings = runFormatChecksIR(bad);
  assert(
    findings.some((f) => f.check_id === "e6_counsel_referral" && f.passed === false),
    "a genuine referral in real content must still be caught",
  );
});

Deno.test("IR1 — the generation-time computation runs AFTER playbook_text is finalized, not before (source-order guard)", async () => {
  const src = (await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-ir-playbook/index.ts", import.meta.url),
  )).replace(/\r\n/g, "\n");
  const reassignIdx = src.indexOf(
    "if (IR_DETERMINISTIC_ENABLED) playbook_text = skeletonDocumentToText(sk.document);",
  );
  const checksIdx = src.indexOf("ir_deterministic_checks = runFormatChecksIR(playbook_text ?? \"\");");
  assert(reassignIdx > 0, "the playbook_text finalization line must exist");
  assert(checksIdx > 0, "the deterministic-checks computation must exist");
  assert(
    checksIdx > reassignIdx,
    "ir_deterministic_checks must be computed AFTER playbook_text is finalized, never before",
  );
  // Exactly one computation site — the early, premature one is retired.
  assertEqualsCount(src, "runFormatChecksIR(playbook_text", 1);
});

function assertEqualsCount(haystack: string, needle: string, expected: number) {
  const count = haystack.split(needle).length - 1;
  assert(count === expected, `expected ${expected} occurrence(s) of ${JSON.stringify(needle)}, found ${count}`);
}
