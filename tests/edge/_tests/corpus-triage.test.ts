// Unit tests for the corpus triage pass (dark, additive).
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isLiaHandoff,
  MAX_BATCH_SIZE,
  parseTriageOutcome,
  parseTriageRequest,
  shardBounds,
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

Deno.test("shardBounds: disjoint, exhaustive uuid slices", () => {
  const four = [0, 1, 2, 3].map((i) => shardBounds(i, 4));
  assertEquals(four[0].lo, "00000000-0000-0000-0000-000000000000");
  assertEquals(four[0].hi, "40000000-0000-0000-0000-000000000000");
  assertEquals(four[1].lo, four[0].hi);
  assertEquals(four[3].hi, null);
  assertEquals(shardBounds(0, 1).hi, null);
});

Deno.test("parseTriageRequest: shard validation", () => {
  const p = parseTriageRequest({ run_id: "r1", shard_index: 3, shard_count: 4 });
  assertEquals(p.shard_index, 3);
  assertEquals(p.shard_count, 4);
  assertEquals(parseTriageRequest({ run_id: "r1" }).shard_count, 1);
  assertThrows(() => parseTriageRequest({ run_id: "r1", shard_count: 3 }));
  assertThrows(() => parseTriageRequest({ run_id: "r1", shard_index: 4, shard_count: 4 }));
});

Deno.test("isLiaHandoff: only usable LI-bearing authority records are handed off", () => {
  const ok = parseTriageOutcome(
    '{"record_class":"enforcement_decision","usable_for":["enforcement_database"],"li_relevance":"direct","confidence":0.9}',
  );
  assertEquals(isLiaHandoff(ok, "EU GDPR"), true);
  const adjacentGuidance = parseTriageOutcome(
    '{"record_class":"regulator_guidance","usable_for":["guidance_corpus"],"li_relevance":"adjacent"}',
  );
  assertEquals(isLiaHandoff(adjacentGuidance, "UK GDPR"), true);
  const newsLi = parseTriageOutcome(
    '{"record_class":"news_or_press","usable_for":["news_digest"],"li_relevance":"direct"}',
  );
  assertEquals(isLiaHandoff(newsLi, "EU GDPR"), false);
  const noLi = parseTriageOutcome(
    '{"record_class":"enforcement_decision","usable_for":["enforcement_database"],"li_relevance":"none"}',
  );
  assertEquals(isLiaHandoff(noLi, "EU GDPR"), false);
  const junk = parseTriageOutcome('{"record_class":"junk_asset","usable_for":["discard"]}');
  assertEquals(isLiaHandoff(junk, "EU GDPR"), false);
});

// B5-1 (doc 210 ledger) — both halves of the tightened predicate.
Deno.test("isLiaHandoff: a non-GDPR instrument never hands off, however it is rated", () => {
  const direct = parseTriageOutcome(
    '{"record_class":"enforcement_decision","usable_for":["enforcement_database","li_precedent_candidate"],"li_relevance":"direct","confidence":0.95}',
  );
  for (const instrument of ["PIPEDA", "Alberta PIPA", "HIPAA", "FTC Act s.5", "CCPA/CPRA", "", null]) {
    assertEquals(isLiaHandoff(direct, instrument), false);
  }
});

Deno.test("isLiaHandoff: a GDPR row rated 'none' never hands off on li_precedent_candidate alone", () => {
  const none = parseTriageOutcome(
    '{"record_class":"enforcement_decision","usable_for":["enforcement_database","li_precedent_candidate"],"li_relevance":"none"}',
  );
  assertEquals(isLiaHandoff(none, "EU GDPR"), false);
});

Deno.test("isGdprFamilyInstrument: accepted and refused instrument spellings", () => {
  for (
    const ok of ["GDPR", "EU GDPR", "UK GDPR", "GDPR (Art. 6(1)(f))", "Regulation (EU) 2016/679", "Directive 95/46/EC"]
  ) {
    assertEquals(isGdprFamilyInstrument(ok), true, ok);
  }
  for (const no of ["PIPEDA", "PIPA", "FOIP", "HIA", "HIPAA", "COPPA", "FCRA", "CCPA/CPRA", "unknown", "", null]) {
    assertEquals(isGdprFamilyInstrument(no), false, String(no));
  }
});
