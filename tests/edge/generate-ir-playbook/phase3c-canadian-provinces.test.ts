// PHASE 3c — THE FOUR CANADIAN PROVINCES (2026-08-29, doc 103 continuation,
// CEO-approved). Alberta was fetched directly from the regulator's own page
// (oipc.ab.ca) — high confidence. That fetch caught a real error in the old
// retired prompt's notes: it claimed individual notice is a direct PIPA
// duty alongside Commissioner notice; the regulator's own page states the
// opposite — the Commissioner may ORDER individual notice (s. 37.1) after
// reviewing the report, it is not an independent organisational duty.
// Quebec, British Columbia and Ontario are secondary-sourced (every
// primary legislative site blocked automated access — LegisQuébec, CanLII,
// IPC Ontario all 403'd; a first BC attempt mistakenly pulled FIPPA, the
// public-sector statute, instead of PIPA and was caught and discarded
// before use). Per CEO direction, the secondary-sourcing tier is not
// flagged as a caveat about the source ("this is a secondary source") — it
// is folded into an actionable "confirm ... with the applicable regulator"
// instruction, the same register as any other degradation sentence in this
// product.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPipedaDuties } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/pipeda-duties.ts";

Deno.test("Alberta — cites s. 34.1 for Commissioner notice, without-unreasonable-delay timing, and the real-risk-of-significant-harm trigger", () => {
  const r = buildPipedaDuties(["Alberta (PIPA)"]);
  assertEquals(r.length, 1);
  const ab = r[0];
  assertEquals(ab.state_label, "Alberta");
  assertStringIncludes(ab.citation, "34.1");
  assertStringIncludes(ab.individual_deadline, "without unreasonable delay");
  assertStringIncludes(ab.individual_deadline, "real risk of significant harm");
});

Deno.test("Alberta — correctly states individual notice is Commissioner-ordered, NOT an independent duty (the old prompt's error, caught and not repeated)", () => {
  const r = buildPipedaDuties(["Alberta (PIPA)"]);
  const ab = r[0];
  assertStringIncludes(ab.individual_deadline, "not an independent duty");
  assertStringIncludes(ab.individual_deadline, "Commissioner may require it by order");
  assertStringIncludes(ab.citation, "37.1");
});

Deno.test("British Columbia — states individual notice as mandatory and Commissioner notice as NOT required by statute (the reverse of Alberta's structure)", () => {
  const r = buildPipedaDuties(["British Columbia (PIPA)"]);
  assertEquals(r.length, 1);
  const bc = r[0];
  assertEquals(bc.state_label, "British Columbia");
  assertStringIncludes(bc.individual_deadline, "notify that individual directly and without unreasonable delay");
  assertStringIncludes(bc.individual_deadline, "not itself required by statute");
});

Deno.test("British Columbia — secondary-sourced text reads as an actionable instruction, not a sourcing-tier disclaimer", () => {
  const r = buildPipedaDuties(["British Columbia (PIPA)"]);
  const text = r[0].individual_deadline;
  assertStringIncludes(text, "Confirm the applicable thresholds and notice content with the OIPC for British Columbia");
  assert(!/secondary source|not primary.?sourced|unverified|lower confidence/i.test(text), `must not editorialize about sourcing tier: "${text}"`);
});

Deno.test("Quebec — cites ss. 3.5-3.8, the risk-of-serious-injury trigger and its three factors, the CAI, and the incident register duty", () => {
  const r = buildPipedaDuties(["Quebec (Law 25)"]);
  assertEquals(r.length, 1);
  const qc = r[0];
  assertEquals(qc.state_label, "Quebec");
  assertStringIncludes(qc.citation, "3.5");
  assertStringIncludes(qc.individual_deadline, "risk of serious injury");
  assertStringIncludes(qc.individual_deadline, "sensitivity of the information");
  assertStringIncludes(qc.individual_deadline, "Commission d'accès à l'information");
  assertStringIncludes(qc.individual_deadline, "register of every confidentiality incident");
  assertStringIncludes(qc.individual_deadline, "Confirm the applicable thresholds and notice content with the CAI");
});

Deno.test("Ontario — states the individual-notice duty (first reasonable opportunity), the IPC threshold-gated duty, and the separate annual statistics duty", () => {
  const r = buildPipedaDuties(["Ontario (PHIPA)"]);
  assertEquals(r.length, 1);
  const on = r[0];
  assertEquals(on.state_label, "Ontario");
  assertStringIncludes(on.individual_deadline, "first reasonable opportunity");
  assertStringIncludes(on.individual_deadline, "Information and Privacy Commissioner of Ontario");
  assertStringIncludes(on.individual_deadline, "annual statistics submission");
  assertStringIncludes(on.individual_deadline, "Confirm the applicable IPC-notice thresholds");
});

Deno.test("every province row is marked verified — real duty text, not the pre-Phase-3c placeholder fallback", () => {
  const r = buildPipedaDuties(["Alberta (PIPA)", "British Columbia (PIPA)", "Quebec (Law 25)", "Ontario (PHIPA)"]);
  assertEquals(r.length, 4);
  for (const d of r) {
    assert(d.verified, `${d.state_label} must be verified`);
    assert(d.citation !== "[statutory reference to be confirmed]", `${d.state_label} must carry a real citation`);
  }
});

Deno.test("all four provinces stack independently alongside PIPEDA and a US state on a mixed record", () => {
  const r = buildPipedaDuties([
    "Canada (PIPEDA)", "Alberta (PIPA)", "British Columbia (PIPA)", "Quebec (Law 25)", "Ontario (PHIPA)",
  ]);
  const labels = r.map((d) => d.state_label);
  assertEquals(labels.filter((l) => l === "PIPEDA (Commissioner notice)").length, 1);
  for (const province of ["Alberta", "British Columbia", "Quebec", "Ontario"]) {
    assertEquals(labels.filter((l) => l === province).length, 1, `${province} must appear exactly once`);
  }
  assertEquals(r.length, 8, "4 PIPEDA rows + 4 province rows");
});

Deno.test("no province row is generated for an unrecognized Canadian jurisdiction string", () => {
  const r = buildPipedaDuties(["Nova Scotia", "Saskatchewan"]);
  assertEquals(r.length, 0);
});

Deno.test("Phase 3c — determinism: identical input produces byte-identical province output", () => {
  const input = ["Alberta (PIPA)", "Quebec (Law 25)"];
  const a = JSON.stringify(buildPipedaDuties(input));
  const b = JSON.stringify(buildPipedaDuties(input));
  assertEquals(a, b);
});
