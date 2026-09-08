import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { confidenceFor, humanizeActivity, mapProfile, normalizeOutcome, type ProfileRow, type SourceMeta } from "./map.ts";
import { screenAction } from "./screen.ts";

const base: ProfileRow = {
  id: "p1",
  product: "lia",
  source_table: "enforcement_actions",
  source_row_id: "e1",
  country: "GB",
  instrument: "UK GDPR",
  use_case_class: "direct_marketing",
  outcome_posture: "rejected",
  rule_statement: "Direct marketing to gambling customers cannot rest on legitimate interests where expectations fail.",
  extracted_quote: "the balancing test was not satisfied",
  quote_verified: true,
  self_consistency_agreement: true,
  pipeline_stage: "human",
  ratified_at: "2026-09-07T06:24:20.650681+00",
  curated_at: null,
};

const meta: SourceMeta = {
  dpa_source: "ICO",
  jurisdiction: "UK",
  case_reference: "ICO/2026/01",
  source_url: "https://ico.org.uk/x",
  dated_on: "2026-02-23",
};

Deno.test("maps a verified human-curated enforcement profile", () => {
  const r = mapProfile(base, meta);
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  assertEquals(r.entry.processing_activity, "Direct marketing");
  assertEquals(r.entry.signal_type, "Enforcement Decision");
  assertEquals(r.entry.outcome, "rejected");
  assertEquals(r.entry.confidence, "high");
  assertEquals(r.entry.jurisdiction, "UK");
  assertEquals(r.entry.last_confirmed, "2026-02-23");
  assertEquals(r.entry.source_enforcement_id, "e1");
});

Deno.test("unverified quotes never load", () => {
  const r = mapProfile({ ...base, quote_verified: false }, meta);
  assertEquals(r.ok, false);
  if (!r.ok) assertEquals(r.reason, "quote_not_verified");
});

Deno.test("stage1 exceptions never load", () => {
  const r = mapProfile({ ...base, pipeline_stage: "stage1_exception" }, meta);
  if (r.ok) throw new Error("should not load");
  assertEquals(r.reason, "stage_not_publishable");
});

Deno.test("missing use case class is skipped, not guessed", () => {
  const r = mapProfile({ ...base, use_case_class: null }, meta);
  if (r.ok) throw new Error("should not load");
  assertEquals(r.reason, "no_use_case_class");
});

Deno.test("guidance rows map to Official Guidance", () => {
  const r = mapProfile({ ...base, source_table: "edpb_guidelines", source_row_id: "g1" }, { ...meta, dpa_source: "EDPB", jurisdiction: "EU" });
  if (!r.ok) throw new Error(r.reason);
  assertEquals(r.entry.signal_type, "Official Guidance");
  assertEquals(r.entry.source_enforcement_id, null);
});

Deno.test("missing source row is skipped", () => {
  const r = mapProfile(base, null);
  if (r.ok) throw new Error("should not load");
  assertEquals(r.reason, "source_row_missing");
});

Deno.test("helpers", () => {
  assertEquals(humanizeActivity("employee_monitoring"), "Employee monitoring");
  assertEquals(normalizeOutcome("Conditional"), "conditional");
  assertEquals(confidenceFor({ ...base, pipeline_stage: "stage3_consistency" }), "medium");
  assertEquals(confidenceFor({ ...base, pipeline_stage: "stage3_consistency", self_consistency_agreement: false }), "low");
});

Deno.test("screen confirms only GDPR-family rows with LI signal and real text", () => {
  const text = `x`.repeat(1200) + " the controller relied on legitimate interests ";
  assertEquals(screenAction({ id: "a", law: "UK GDPR", violation: null, subject: "X", source_document_text: text }).confirmed, true);
  assertEquals(screenAction({ id: "a", law: "PECR", violation: null, subject: "X", source_document_text: text }).reason, "not_gdpr_family_instrument");
  assertEquals(screenAction({ id: "a", law: "EU GDPR", violation: null, subject: "X", source_document_text: "short" }).reason, "insufficient_source_text");
  assertEquals(screenAction({ id: "a", law: "EU GDPR", violation: null, subject: "X", source_document_text: "y".repeat(1200) }).reason, "no_li_signal");
});
