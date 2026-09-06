// DOC 191 §7.3 / DOC 196 §3.1 — THE MIGRATION PIN.
//
// "A pin test asserts the generated file is byte-identical to today's
// hand-authored one for every row NOT reclassified, so the migration itself
// changes nothing customer-facing."
//
// WHAT "BYTE-IDENTICAL" MEANS HERE, stated plainly rather than assumed: the
// generated file cannot be byte-identical to the hand-authored one as a
// WHOLE — the generated one carries the RULE_PROFILES / PATTERN_PROFILES
// split, the evidence fields and a different header, all of which are the
// point of doc 191. What must not move is the profile the SCORER reads. The
// scorer (cam-relevance.ts) reads exactly eight fields — country, instrument,
// factor_ids, use_case_class, outcome_posture, relationship, data_categories,
// flags — and nothing else on a profile reaches a customer. So the pin is:
// those eight fields, canonically serialised, identical per row, for all 39
// of the 40 CAM rows that were not reclassified.
//
// WHERE THE DATA COMES FROM. The test runs OFFLINE against
// __snapshots__/authority-relevance-profiles-lia.json, which was produced by
// scripts/doc191-lia-profile-backfill.ts from the same buildRows() that
// produced the INSERT statements, and was verified against the LIVE table by
// re-computing each row's md5 server-side (--verify; 0 mismatches, 35/35
// rows). The snapshot is therefore the migrated data, not a stand-in for it.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canonicalCamProfileBytes,
  generateRelevanceProfiles,
  type GeneratorCamRow,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/generate.ts";
import type { AuthorityRelevanceProfileRow } from "../../../supabase/functions/_shared/corpus/authority-relevance-profile.ts";
import {
  LIA_CORPUS_MAP,
  LIA_FACTOR_VOCABULARY,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import {
  LIA_RELEVANCE_PROFILES,
  liaProfileOf,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";
import { registryFor } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/product-registry.ts";

/** The one row doc 196 §2 identified and this migration reclassified. */
const RECLASSIFIED_ROW_ID = "lia/f11-eprivacy/ap-w5-05";

const snapshot = JSON.parse(
  Deno.readTextFileSync("tests/edge/corpus/__snapshots__/authority-relevance-profiles-lia.json"),
) as { row_count: number; rows: (AuthorityRelevanceProfileRow & { md5: string })[] };

const AP_ROWS = LIA_CORPUS_MAP.rows.filter((r) => r.role === "AP");
const CAM_ROWS: GeneratorCamRow[] = LIA_CORPUS_MAP.rows.map((r) => ({
  id: r.id,
  role: r.role,
  source_table: r.source_table,
  source_row_id: r.source_row_id,
}));

function run() {
  return generateRelevanceProfiles({
    product: "lia",
    rows: snapshot.rows,
    camRows: CAM_ROWS,
    vocabulary: {
      factors: [...LIA_FACTOR_VOCABULARY],
      instruments: registryFor("lia")!.instruments,
    },
    profilesVersion: "lia-relevance-profiles-v2-2026-09-06",
    exportPrefix: "LIA",
    factorVocabularySource: registryFor("lia")!.factor_vocabulary_source,
    outputPath: registryFor("lia")!.output_path,
  });
}

// ── Shape of the migration itself ───────────────────────────────────────────

Deno.test("doc191 §7.3 — the migration covers every AP source exactly once (35 sources behind 40 CAM rows)", () => {
  const sources = new Set(AP_ROWS.map((r) => `${r.source_table}::${r.source_row_id}`));
  assertEquals(snapshot.row_count, snapshot.rows.length);
  assertEquals(snapshot.rows.length, sources.size);
  // Docs 191 §1/§7.3 and 196 §1 say "44 profiles". The live count is 40 CAM
  // row keys over 35 distinct sources — recorded here so the discrepancy is
  // a checked fact rather than a number carried forward from a spec.
  assertEquals(Object.keys(LIA_RELEVANCE_PROFILES).length, 40);
  assertEquals(AP_ROWS.length, 40);
  assertEquals(sources.size, 35);
  for (const r of snapshot.rows) {
    assert(sources.has(`${r.source_table}::${r.source_row_id}`), `${r.source_row_id} names no AP source`);
  }
});

Deno.test("doc191 §8 — NOT ONE migrated row carries a ratification stamp", () => {
  for (const r of snapshot.rows) {
    assertEquals(r.ratified_by, null, r.cam_row_id ?? r.source_row_id);
    assertEquals(r.ratified_at, null, r.cam_row_id ?? r.source_row_id);
    assertEquals(r.ledger_ref, null, r.cam_row_id ?? r.source_row_id);
  }
});

Deno.test("doc191 §7.3 — every migrated row is pipeline_stage 'human' (they were hand-authored, not classified)", () => {
  for (const r of snapshot.rows) assertEquals(r.pipeline_stage, "human", r.cam_row_id ?? r.source_row_id);
});

Deno.test("doc196 §2 — exactly ONE row is reclassified as 'rule', and its quote is a real substring of its own note", () => {
  const rules = snapshot.rows.filter((r) => r.rule_or_pattern === "rule");
  assertEquals(rules.length, 1);
  const [row] = rules;
  assertEquals(row.cam_row_id, RECLASSIFIED_ROW_ID);
  assertEquals(row.quote_verified, true);
  assert(row.rule_statement && row.rule_statement.length > 20, "a rule row must carry its rule_statement");
  assert(row.extracted_quote, "a rule row must carry its extracted quote");
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  assert(
    norm(row.curation_note).includes(norm(row.extracted_quote!)),
    "the extracted quote must be a verbatim substring of the row's own curation note",
  );
  // The claim itself is the one doc 196 §2 named.
  assert(row.extracted_quote!.includes("cannot be reached by Article 6(1)(f) at all"), row.extracted_quote!);
  // Honest confidence: the sentence is the curator's formulation, not the
  // AEPD's own words, and the Spanish decision was not re-read.
  assertEquals(row.confidence_tier, "medium");
});

// ── THE PIN ─────────────────────────────────────────────────────────────────

Deno.test("doc191 §7.3 — the generator runs clean on the migrated LIA data", () => {
  const r = run();
  assertEquals(r.errors, [], r.errors.join("\n"));
  assertEquals(r.ok, true);
  // Only the sibling-consistency pass and the one exclusion may warn.
  for (const w of r.warnings) {
    assert(
      w.startsWith("EXCLUDED row") || w.includes("sibling-consistency"),
      `unexpected warning: ${w}`,
    );
  }
});

Deno.test("doc191 §7.3 — THE PIN: every non-reclassified row's scorer-visible profile is byte-identical", () => {
  const r = run();
  const expected = AP_ROWS.filter((row) => row.id !== RECLASSIFIED_ROW_ID);
  assertEquals(expected.length, 39);

  const drift: string[] = [];
  for (const camRow of expected) {
    const generated = r.pattern[camRow.id];
    if (!generated) {
      drift.push(`${camRow.id}: MISSING from the generated PATTERN_PROFILES`);
      continue;
    }
    const handAuthored = liaProfileOf(camRow)!;
    const a = canonicalCamProfileBytes(handAuthored);
    const b = canonicalCamProfileBytes(generated);
    if (a !== b) drift.push(`${camRow.id}:\n  hand-authored ${a}\n  generated     ${b}`);
  }
  assertEquals(drift, [], `the migration must change nothing customer-facing:\n${drift.join("\n")}`);
  assertEquals(Object.keys(r.pattern).length, 39);
});

Deno.test("doc191 §5/§8 — the reclassified row ships NOWHERE until the CEO ratifies it", () => {
  const r = run();
  // Not in the rule map (unratified), not in the pattern map (reclassified),
  // and not in the emitted bytes at all.
  assertEquals(r.rule[RECLASSIFIED_ROW_ID], undefined);
  assertEquals(r.pattern[RECLASSIFIED_ROW_ID], undefined);
  assertEquals(Object.keys(r.rule), []);
  assert(!r.file.includes(RECLASSIFIED_ROW_ID), "the excluded row must not reach the generated file");
  assert(
    !r.file.includes("the special-category gate is anterior to"),
    "nor may its rule statement or quote",
  );
  // It is NAMED as excluded, with the reason — never silently dropped.
  assertEquals(r.excluded.length, 1);
  assertEquals(r.excluded[0].cam_row_id, RECLASSIFIED_ROW_ID);
  assert(r.warnings.some((w) => w.includes(RECLASSIFIED_ROW_ID)), JSON.stringify(r.warnings));
});

Deno.test("doc191 §7.3 — the row's CURRENT customer-facing position is unchanged by the reclassification", () => {
  // The claim the migration makes is "nothing customer-facing moves". For the
  // reclassified row that claim rests on a fact about today's map, not on the
  // generator: lia/f11-eprivacy/ap-w5-05 is DARK (render_eligible false), so
  // it reaches no customer today either way. If it were live, dropping it
  // from the generated map WOULD be a customer-facing change and this test
  // would say so.
  const row = LIA_CORPUS_MAP.rows.find((r) => r.id === RECLASSIFIED_ROW_ID);
  assert(row, "the reclassified row must still exist in the map");
  assertEquals(row!.render_eligible, false);
  assertEquals(row!.display, undefined);
});

Deno.test("doc191 §7.3 — the generated file is deterministic and follows map order", () => {
  const a = run();
  const b = run();
  assertEquals(a.file, b.file);
  const order = new Map(LIA_CORPUS_MAP.rows.map((r, i) => [r.id, i] as const));
  const emittedIds = [...a.file.matchAll(/^  "(lia\/[^"]+)": \{$/gm)].map((m) => m[1]);
  assertEquals(emittedIds.length, 39);
  for (let i = 1; i < emittedIds.length; i++) {
    assert(
      (order.get(emittedIds[i - 1]) ?? 0) < (order.get(emittedIds[i]) ?? 0),
      `emission order broke at ${emittedIds[i - 1]} → ${emittedIds[i]}`,
    );
  }
});
