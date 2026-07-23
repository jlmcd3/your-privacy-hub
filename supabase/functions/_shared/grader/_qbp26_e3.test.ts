// QB-P26 Item 3 — E3 nesting-aware matcher regression test.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runFormatChecksIR as runFormatChecks } from "./format-checks.ts";

Deno.test("E3 — nested [TO BE COMPLETED placeholders are recognised as closed", () => {
  // Reduced from IR run 474ac70f doc 02d9dca8: outer placeholder wraps two
  // inner placeholders and closes at the end. Prior matcher (windowed at
  // next opener) misread this as unclosed.
  const doc = [
    "Some prose before.",
    "[TO BE COMPLETED: if the org is the source of the breach, include: \"The org is offering",
    "[TO BE COMPLETED: describe identity-theft services] at no cost for 12 months. To enroll,",
    "please [TO BE COMPLETED: describe enrollment steps].\"]",
    "Some prose after.",
  ].join("\n");
  const findings = runFormatChecks(doc);
  const unclosed = findings.filter((f) => f.check_id === "e3_tbc_unclosed");
  assertEquals(unclosed.length, 0, `expected 0 unclosed hits, got ${unclosed.length}: ${JSON.stringify(unclosed)}`);
});

Deno.test("E3 — genuine unclosed placeholder is still flagged", () => {
  const doc = "Prose. [TO BE COMPLETED: describe the thing that was never closed.\nMore prose without a closing bracket for a long time.";
  const findings = runFormatChecks(doc);
  const unclosed = findings.filter((f) => f.check_id === "e3_tbc_unclosed");
  assert(unclosed.length >= 1, "expected at least 1 unclosed hit");
});

Deno.test("E3 — multi-line bulleted placeholder still recognised as closed", () => {
  const doc = [
    "[TO BE COMPLETED: describe steps",
    "- step one",
    "- step two",
    "- step three]",
    "After.",
  ].join("\n");
  const findings = runFormatChecks(doc);
  const unclosed = findings.filter((f) => f.check_id === "e3_tbc_unclosed");
  assertEquals(unclosed.length, 0);
});
