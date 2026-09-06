import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  enforcementExcerpt,
  firstQuotedSentence,
  parseClassifyFromDbRequest,
  regulatoryGuidanceExcerpt,
  windowAround,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/classify-from-db.ts";

Deno.test("classify_from_db request defaults and bounds", () => {
  assertEquals(parseClassifyFromDbRequest({ product: "lia", run_id: "run-1" }), {
    product: "lia", run_id: "run-1", batch_size: 6, cursor: undefined, only_unclassified: true,
  });
  assertThrows(() => parseClassifyFromDbRequest({ product: "lia", run_id: "run-1", batch_size: 11 }));
  assertThrows(() => parseClassifyFromDbRequest({ product: "dpia", run_id: "run-1" }));
});

Deno.test("quoted sentence and guidance window follow the requested rules", () => {
  const quote = "This is the quoted legal proposition.";
  assertEquals(firstQuotedSentence(`note: "${quote}"`), quote);
  assertEquals(regulatoryGuidanceExcerpt(`prefix ${quote} suffix`, `"${quote}"`), `prefix ${quote} suffix`);
  assertEquals(windowAround("abcdefgh", null, 3, 4), "abcd");
});

Deno.test("enforcement excerpt uses quote window, then compliance fallback", () => {
  const quote = "A sufficiently long quoted legal statement.";
  assertEquals(enforcementExcerpt(`before ${quote} after`, null, null, null, `"${quote}"`), `before ${quote} after`);
  assertEquals(enforcementExcerpt(null, null, "legacy", "failure", "no quote"), "failure\n\nlegacy");
});