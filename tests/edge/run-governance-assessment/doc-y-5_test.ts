// Doc Y-5 Commit 2 unit tests — 5 tests per John's approval message.
// Run: `deno test supabase/functions/run-governance-assessment/doc-y-5_test.ts`
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { docY5StripIllustrativeFrequency } from "../../../supabase/functions/run-governance-assessment/_doc_y_5.ts";

const FIELD = "report.domains[4].recommended_action";

Deno.test("Unit 1 — strips e.g. quarterly/biannual parenthetical", () => {
  const input =
    "Then, either implement periodic refresher training (e.g. quarterly or biannual modules for high-risk user cohorts) if none exists.";
  const out = docY5StripIllustrativeFrequency(input, FIELD);
  assertEquals(
    out,
    "Then, either implement periodic refresher training if none exists.",
  );
});

Deno.test("Unit 2 — preserves Art. 33(1) 72-hour statutory clock (no LEAD, no strip)", () => {
  const input =
    "The playbook documents the principle that the 72-hour supervisory-authority notification clock (GDPR Art. 33(1) and UK GDPR Art. 33(1)) begins when the controller becomes aware of a breach.";
  const out = docY5StripIllustrativeFrequency(input, FIELD);
  assertEquals(out, input);
});

Deno.test("Unit 3 — preserves Art. 33 gloss parenthetical (no PERIOD token)", () => {
  const input =
    "The playbook cites GDPR Art. 33 (breach-notification article) as the governing provision.";
  const out = docY5StripIllustrativeFrequency(input, FIELD);
  assertEquals(out, input);
});

Deno.test("Unit 4 — STATUTE-ADJACENT FLAG: cited statutory period NOT stripped", () => {
  const input =
    "The organisation must conduct the audit (e.g. the annual cybersecurity audit required by 11 CCR 7123).";
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (msg: string) => { warnings.push(msg); };
  try {
    const out = docY5StripIllustrativeFrequency(input, FIELD);
    assertEquals(out, input);
    assertEquals(warnings.length, 1);
    assertStringIncludes(warnings[0], "STATUTE-ADJACENT FLAG (not stripped)");
    assertStringIncludes(warnings[0], `field=${FIELD}`);
  } finally {
    console.warn = origWarn;
  }
});

Deno.test("Unit 5 — unpaired em-dash lead: strips to sentence terminator", () => {
  const input =
    "The organisation should establish refresher training — e.g. quarterly modules for high-risk cohorts.";
  const out = docY5StripIllustrativeFrequency(input, FIELD);
  assertEquals(
    out,
    "The organisation should establish refresher training.",
  );
});

// Guardrail: non-whitelisted field is untouched even with matching content.
Deno.test("Guardrail — non-whitelisted field path skipped", () => {
  const input =
    "Retention set to periodic review (e.g. quarterly cycles).";
  const out = docY5StripIllustrativeFrequency(input, "report.regulatory_basis");
  assertEquals(out, input);
});
