// REBUILD-DPIA — DPIA-only unit tests (Task 3, 7e, 9).
// Split from cppa-risk tests to avoid Deno.serve port collision when both
// generator index.ts files are imported into the same test process.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyDeterministicPostGenFallbackDpia,
  DPIA_M_TOKEN_MAP,
  dedupeStringArrayPreserveOrder,
  correctOssTemplateFromRecord,
} from "../run-dpia-framework/index.ts";
import { logPostGenLint } from "../_shared/function-run-logger.ts";

Deno.test("REBUILD-DPIA T3a: DPIA fallback drops resolved-source information_needed", () => {
  const testStates = {
    M3: { state: "resolved_met", basis: "Art. 9(2) condition selected", source_fields: ["article_9_condition"] },
    M5: { state: "resolved_met", basis: "GDPR jurisdiction", source_fields: ["jurisdictions"] },
  };
  const report = {
    information_needed: [
      { field: "article_9_condition", dimensions: "confirm the Art. 9(2) condition" },
      { field: "retention_period", dimensions: "state the retention period" },
      { field: "purpose", source_fields: ["jurisdictions"], dimensions: "confirm GDPR applies" },
    ],
  };
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(report, testStates as any);
  assertEquals(parsed.information_needed.length, 1);
  assertEquals(parsed.information_needed[0].field, "retention_period");
  assertEquals(notes.filter((n) => n.code === "resolved_source_ask_dropped").length, 2);
});

Deno.test("REBUILD-DPIA T3b: token scrub → human phrasing, no M-token", () => {
  const report = {
    executive_summary: "The M3 determination is resolved met on the record.",
    information_needed: [],
  };
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(report, {});
  const out = parsed.executive_summary as string;
  assert(!/\bM3\b/.test(out), `expected no M3 in "${out}"`);
  assert(!/resolved[_\s]met/i.test(out), `expected no state token in "${out}"`);
  assert(/Art\.\s*9\(2\) condition determination/.test(out), `expected DPIA humanised phrase in "${out}"`);
  assert(notes.some((n) => n.code === "test_token_scrubbed"));
});

Deno.test("REBUILD-DPIA T3b: M9 stays CANDIDATE-class ('the profiling review')", () => {
  assertEquals(DPIA_M_TOKEN_MAP.M9, "the profiling review");
  const report = { section_1_description: { note: "M9 is CANDIDATE." }, information_needed: [] };
  const { parsed } = applyDeterministicPostGenFallbackDpia(report, {});
  const out = (parsed as any).section_1_description.note as string;
  assert(!/\bM9\b/.test(out));
  assert(/the profiling review/.test(out));
  assert(!/established on the record/.test(out));
});

Deno.test("REBUILD-DPIA-HF1: bare CANDIDATE token scrubbed alongside M9 and RESOLVED MET", () => {
  const report = {
    executive_summary: "Per M9 the profiling flag is CANDIDATE and M1 is RESOLVED MET",
    information_needed: [],
  };
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(report, {});
  const out = parsed.executive_summary as string;
  assert(!/\bCANDIDATE\b/.test(out), `expected no bare CANDIDATE in "${out}"`);
  assert(!/\bM9\b/.test(out), `expected no M9 in "${out}"`);
  assert(!/\bM1\b/.test(out), `expected no M1 in "${out}"`);
  assert(!/RESOLVED[_\s]MET/i.test(out), `expected no RESOLVED MET in "${out}"`);
  assert(/the profiling review/.test(out), `expected "the profiling review" in "${out}"`);
  assert(/flagged for judgment review/.test(out), `expected "flagged for judgment review" in "${out}"`);
  // Meaning preserved: profiling flag + special-category determination both surface.
  assert(/profiling flag/.test(out));
  assert(/special-category determination/.test(out));
  assert(/established on the record/.test(out));
  assert(notes.some((n) => n.code === "test_token_scrubbed"));
});

Deno.test("REBUILD-DPIA T3c: clean document is byte-identical", () => {
  const report = {
    executive_summary: "The record establishes the special-category determination on the record.",
    information_needed: [{ field: "controller_country", dimensions: "state the controller country" }],
  };
  const before = JSON.stringify(report);
  const { parsed, notes } = applyDeterministicPostGenFallbackDpia(JSON.parse(before), {});
  assertEquals(JSON.stringify(parsed), before);
  assertEquals(notes.length, 0);
});

Deno.test("REBUILD-DPIA T7e: gdprCites dedupe order-preserving, exact-string", () => {
  const out = dedupeStringArrayPreserveOrder([
    "Article 35 GDPR", "Article 6 GDPR", "Article 35 GDPR", "Article 9 GDPR", "Article 6 GDPR",
  ]);
  assertEquals(out, ["Article 35 GDPR", "Article 6 GDPR", "Article 9 GDPR"]);
});

Deno.test("REBUILD-DPIA T9: post_gen_lint meta shape — notes capped at 40", async () => {
  let received: any = null;
  const fakeSupabase = {
    from(_t: string) {
      return {
        insert(row: any) { received = row; return Promise.resolve({ error: null }); },
      };
    },
  };
  const notes = Array.from({ length: 100 }, (_, i) => ({ code: "test_token_scrubbed", detail: `n${i}` }));
  logPostGenLint(fakeSupabase as any, {
    functionName: "run-dpia-framework",
    fallbackApplied: true,
    retryWithinBudget: false,
    residualLeaks: 3,
    residualResolvedAsks: 2,
    notes,
    sourceTable: "dpia_frameworks",
    sourceRowId: "abc",
  });
  await new Promise((r) => setTimeout(r, 50));
  assert(received, "insert never called");
  const meta = received.metadata;
  assertEquals(meta.event, "post_gen_lint");
  assertEquals(meta.fallback_applied, true);
  assertEquals(meta.retry_within_budget, false);
  assertEquals(meta.residual_leaks, 3);
  assertEquals(meta.residual_resolved_asks, 2);
  assertEquals(meta.notes.length, 40);
  assertEquals(received.function_name, "run-dpia-framework");
});

// ── FF-4 pd6 — OSS template deterministic corrector ─────────────────────────

const FALSE_PASSAGE =
  "the controller's central administration is outside the EU and an EU establishment holds decision-making authority over this processing (Art. 4(16)(b)).";

Deno.test("FF-4 pd6: Germany intake with false 4(16)(b) passage → corrected sentence WITHOUT authority clause (per-Land rule)", () => {
  const report = { dpia_metadata: { supervisory_authority_consultation_trigger: FALSE_PASSAGE } };
  const notes: Array<{ code: string; detail: string }> = [];
  const out = correctOssTemplateFromRecord(report, { central_administration_country: "Germany" }, notes);
  const s = out.dpia_metadata.supervisory_authority_consultation_trigger as string;
  assert(/Art\.\s*4\(16\)\(a\)/.test(s), s);
  assert(/central administration in Germany/.test(s), s);
  assert(!/competent lead supervisory authority is/.test(s), "Germany must omit authority clause");
  assert(!/4\(16\)\(b\)/.test(s));
  assert(notes.some((n) => n.code === "oss_template_corrected"));
});

Deno.test("FF-4 pd6: Sweden intake → corrected sentence with IMY authority clause", () => {
  const report = { dpia_metadata: { supervisory_authority_consultation_trigger: FALSE_PASSAGE } };
  const notes: Array<{ code: string; detail: string }> = [];
  const out = correctOssTemplateFromRecord(report, { central_administration_country: "Sweden" }, notes);
  const s = out.dpia_metadata.supervisory_authority_consultation_trigger as string;
  assert(/Art\.\s*4\(16\)\(a\)/.test(s), s);
  assert(/central administration in Sweden/.test(s), s);
  assert(/Integritetsskyddsmyndigheten \(IMY\)/.test(s), s);
  assert(notes.some((n) => n.code === "oss_template_corrected"));
});

Deno.test("FF-4 pd6: non-EU controller (UK) → untouched", () => {
  const report = { dpia_metadata: { supervisory_authority_consultation_trigger: FALSE_PASSAGE } };
  const before = JSON.stringify(report);
  const notes: Array<{ code: string; detail: string }> = [];
  const out = correctOssTemplateFromRecord(report, { central_administration_country: "United Kingdom" }, notes);
  assertEquals(JSON.stringify(out), before);
  assertEquals(notes.length, 0);
});

Deno.test("FF-4 pd6: clean document (EU controller, no false passage) → untouched", () => {
  const report = {
    dpia_metadata: {
      supervisory_authority_consultation_trigger:
        "The record places the controller's central administration in France. Under Art. 4(16)(a) GDPR the main establishment is the place of central administration in the Union.",
    },
  };
  const before = JSON.stringify(report);
  const notes: Array<{ code: string; detail: string }> = [];
  const out = correctOssTemplateFromRecord(report, { central_administration_country: "France" }, notes);
  assertEquals(JSON.stringify(out), before);
  assertEquals(notes.length, 0);
});

Deno.test("FF-4 pd6: falls back to controller_country when central_administration_country is absent", () => {
  const report = { dpia_metadata: { supervisory_authority_consultation_trigger: FALSE_PASSAGE } };
  const notes: Array<{ code: string; detail: string }> = [];
  const out = correctOssTemplateFromRecord(report, { controller_country: "Ireland" }, notes);
  const s = out.dpia_metadata.supervisory_authority_consultation_trigger as string;
  assert(/central administration in Ireland/.test(s), s);
  assert(/Data Protection Commission \(DPC\)/.test(s), s);
});
