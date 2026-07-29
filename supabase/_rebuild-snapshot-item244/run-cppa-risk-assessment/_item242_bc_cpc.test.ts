// ITEM 242 CP-C wired — glossary-parity + coherence-rewrite + marketing-flag asserts.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  PASS1_DERIVE_SYSTEM,
  PASS1_DERIVE_PROMPT_VERSION,
} from "../_shared/ltp/content/pass1-derive-prompt.ts";
import {
  screenPresentNoteCoherence,
  PASS1_COHERENCE_VERSION,
} from "../_shared/ltp/pass1-present-note-coherence.ts";
import {
  MARKETING_PHRASE_PATTERNS,
  collectMarketingReviewFlags,
} from "../_shared/ltp/value-screen.ts";
import type { FactorTableEntry } from "../_shared/render-plan/schema.ts";

Deno.test("CP-C — prompt version bumped to item242-cpC (rider-inclusive)", () => {
  // Rider (2026-07-28) further bumps the version to include the grounded-note law.
  assertEquals(PASS1_DERIVE_PROMPT_VERSION, "pass1-derive-2026-07-28-item242-cpC-rider-grounded-note");
});

Deno.test("CP-C — glossary parity: canonical intake ids appear verbatim", () => {
  const ids = [
    "q18_admt_use",
    "q18b_admt_training",
    "i7_external_consultees",
    "i7_internal_contributors",
    "q15_sensitive_pi",
    "q15c_spi_volume",
    "i1_processing_purpose",
    "i2_retention_period",
    "q4_pi_categories",
  ];
  for (const id of ids) assertStringIncludes(PASS1_DERIVE_SYSTEM, id);
});

Deno.test("CP-C — SYSTEM rule 7 (present/note coherence) present", () => {
  assertStringIncludes(PASS1_DERIVE_SYSTEM, "PRESENT/NOTE COHERENCE");
});

Deno.test("CP-C — SYSTEM rule 8 (no invented characterization) present", () => {
  assertStringIncludes(PASS1_DERIVE_SYSTEM, "NO INVENTED CHARACTERIZATION");
  assertStringIncludes(PASS1_DERIVE_SYSTEM, "audience insights");
});

Deno.test("CP-C — coherence rewrite: ADMT-training / employee-training conflation", () => {
  const rows: FactorTableEntry[] = [{
    factor_id: "safe.admt.training",
    kind: "safeguard",
    anchor: { primary_source: "ccpa", pinpoint: "§ 7152", url: "" } as any,
    present_in_intake: true,
    weight_note: "The record shows employee training programs are in place.",
    intake_ledger_refs: [],
    guidance_refs: [],
  } as any];
  const out = screenPresentNoteCoherence(rows);
  assertEquals(out.rewrites.length, 1);
  assertEquals(out.factor_table[0].present_in_intake, false);
  assertEquals(out.factor_table[0].weight_note, "no record evidence");
});

Deno.test("CP-C — coherence rewrite: internal-contributors mis-attributed as external consultation", () => {
  const rows: FactorTableEntry[] = [{
    factor_id: "safe.iii.external_consultation",
    kind: "safeguard",
    anchor: { primary_source: "ccpa", pinpoint: "§ 7152", url: "" } as any,
    present_in_intake: true,
    weight_note: "Evidence: our internal contributors and staff team reviewed the design.",
    intake_ledger_refs: [],
    guidance_refs: [],
  } as any];
  const out = screenPresentNoteCoherence(rows);
  assertEquals(out.rewrites.length, 1);
  assertEquals(out.rewrites[0].field_id, "i7_external_consultees");
});

Deno.test("CP-C — coherence exculpates when 'external' is also named", () => {
  const rows: FactorTableEntry[] = [{
    factor_id: "safe.iii.external_consultation",
    kind: "safeguard",
    anchor: { primary_source: "ccpa", pinpoint: "§ 7152", url: "" } as any,
    present_in_intake: true,
    weight_note: "Internal staff plus external advocates were consulted.",
    intake_ledger_refs: [],
    guidance_refs: [],
  } as any];
  const out = screenPresentNoteCoherence(rows);
  assertEquals(out.rewrites.length, 0);
});

Deno.test("CP-C — marketing-phrase review-flag detects invented characterization (telemetry-only)", () => {
  const report = { section: { note: "We deliver audience insights across the customer journey." } };
  const flags = collectMarketingReviewFlags(report);
  assert(flags.length >= 2, "expected ≥2 flags for two marketing phrases");
  const matches = flags.map((f) => f.match.toLowerCase());
  assert(matches.some((m) => m.includes("audience insights")));
  assert(matches.some((m) => m.includes("customer journey")));
});

Deno.test("CP-C — marketing patterns registry non-empty", () => {
  assert(MARKETING_PHRASE_PATTERNS.length >= 9);
});

Deno.test("CP-C — coherence version stamp present", () => {
  assertStringIncludes(PASS1_COHERENCE_VERSION, "item242-bc");
});
