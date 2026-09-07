// Unit tests for the corpus triage pass (dark, additive).
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  MAX_BATCH_SIZE,
  parseTriageOutcome,
  parseTriageRequest,
  triageExcerpt,
} from "../../../supabase/functions/corpus-triage/_local/triage.ts";

Deno.test("parseTriageRequest: defaults, bounds and cursor handling", () => {
  const parsed = parseTriageRequest({ run_id: " r1 " });
  assertEquals(parsed.run_id, "r1");
  assertEquals(parsed.batch_size, 6);
  assertEquals(parsed.cursor, undefined);
  assertEquals(parsed.dry_run, false);
  assertEquals(parseTriageRequest({ run_id: "r1", cursor: null }).cursor, null);
  assertThrows(() => parseTriageRequest({}));
  assertThrows(() => parseTriageRequest({ run_id: "r1", batch_size: 0 }));
  assertThrows(() => parseTriageRequest({ run_id: "r1", batch_size: MAX_BATCH_SIZE + 1 }));
});

Deno.test("triageExcerpt: longest body wins and metadata header is present", () => {
  const out = triageExcerpt({
    id: "x", subject: null, regulator: "ICO", jurisdiction: "UK",
    source_url: "https://example.test/a", source_database: "cms", decision_date: "2025-01-01",
    source_document_text: "short", raw_text: "a much longer body of text about the matter",
    legacy_summary_text: null,
  });
  assertEquals(out.includes("RECORDED REGULATOR: ICO"), true);
  assertEquals(out.includes("RECORDED SUBJECT: none"), true);
  assertEquals(out.includes("a much longer body"), true);
});

Deno.test("parseTriageOutcome: valid JSON is coerced to the taxonomy vocabulary", () => {
  const out = parseTriageOutcome(`prose {"subject":"Acme Ltd","record_class":"enforcement_decision",
    "usable_for":["enforcement_database","made_up"],"topic_tags":["consent","nope"],
    "li_relevance":"Adjacent","confidence":1.7,"rationale":"fine imposed"}`);
  assertEquals(out.proposed_subject, "Acme Ltd");
  assertEquals(out.proposed_record_class, "enforcement_decision");
  assertEquals(out.proposed_usable_for, ["enforcement_database"]);
  assertEquals(out.proposed_topic_tags, ["consent"]);
  assertEquals(out.proposed_li_relevance, "adjacent");
  assertEquals(out.confidence, 1);
  assertEquals(out.status, "ok");
});

Deno.test("parseTriageOutcome: junk and discard-only answers are marked unusable", () => {
  assertEquals(parseTriageOutcome('{"record_class":"junk_asset","usable_for":["discard"]}').status, "unusable");
  assertEquals(
    parseTriageOutcome('{"record_class":"news_or_press","usable_for":["discard"]}').status,
    "unusable",
  );
});

Deno.test("parseTriageOutcome: unusable/missing JSON is an error, never a silent label", () => {
  assertEquals(parseTriageOutcome("no json here").status, "error");
  assertEquals(parseTriageOutcome('{"record_class":"invented_class"}').status, "error");
  assertEquals(parseTriageOutcome('{"subject":"null"}').proposed_subject, null);
});
