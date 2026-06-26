// Acceptance tests for the shared citation-audit helper (Part B).
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { auditCitations } from "../_shared/citation-audit.ts";

// Stub LLM caller that returns a fixed verdict array.
function stubLLM(verdicts: Array<{ citation: string; verdict: string; looksFabricated?: boolean }>) {
  return async () => ({ text: JSON.stringify(verdicts) });
}

Deno.test("supported national statute is not replaced and not flagged", async () => {
  const text = "Filed under the Data Protection Act 2018.";
  const res = await auditCitations(
    {
      text,
      lawName: "UK GDPR",
      authorityName: "ICO",
      jurisdictionStatutes: ["Data Protection Act 2018"],
    },
    stubLLM([{ citation: "Data Protection Act 2018", verdict: "SUPPORTED" }]),
  );
  assertEquals(res.updatedText, text);
  assertEquals(res.replacements.length, 0);
  assertEquals(res.flaggedForReview.length, 0);
});

Deno.test("clearly fabricated EU number is replaced", async () => {
  const text = "See Regulation (EU) 2027/1234 for further detail.";
  const res = await auditCitations(
    { text, lawName: "GDPR", authorityName: "ICO" },
    stubLLM([{ citation: "Regulation (EU) 2027/1234", verdict: "UNSUPPORTED", looksFabricated: true }]),
  );
  assert(!res.updatedText.includes("Regulation (EU) 2027/1234"));
  assert(res.updatedText.includes("see GDPR, administered by ICO"));
  assertEquals(res.flaggedForReview.length, 0);
});

Deno.test("real-but-unlisted citation is flagged, document unchanged", async () => {
  const text = "Compare 740 ILCS 14/15(b) for biometric processing.";
  const res = await auditCitations(
    { text, lawName: "UK GDPR", authorityName: "ICO", jurisdictionStatutes: ["Data Protection Act 2018"] },
    stubLLM([{ citation: "740 ILCS 14/15(b)", verdict: "UNSUPPORTED", looksFabricated: false }]),
  );
  assertEquals(res.updatedText, text);
  assertEquals(res.replacements.length, 0);
  assertEquals(res.flaggedForReview, ["740 ILCS 14/15(b)"]);
});
