// D1D2B3B8 (quality batch, 2026-08-27) — harness fixes.
//   H1 the cppa-risk tool run aborted on "processing_methods.collection_method:
//      unknown top-level key; alternatives_considered: unknown top-level key" —
//      the generator wrote a known dotted field key FLAT and added a stray
//      key. Deterministic repair now unflattens the former and drops the
//      latter, with notes, before any model repair is spent.
//   H4 five HIGH e6_counsel_referral findings fired on one IR document whose
//      "sentences" were template headings glued across blank lines
//      ("Notification Decision Log\n\nMaintained by: Chief Privacy
//      Officer\n\nMust contain:\n\n- …"). A referral match that exists only
//      across the line glue is now skipped; a single-line referral still
//      fails.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deterministicContractRepair } from "../../../supabase/functions/run-quality-batch/index.ts";
import { unknownTopLevelKeys, validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { runFormatChecksIR } from "../../../supabase/functions/_shared/grader/format-checks.ts";

Deno.test("H1 — a flat dotted known key is unflattened into its nested location", () => {
  const det = deterministicContractRepair("cppa-risk", {
    "processing_methods.collection_method": "Web forms and cookies",
  });
  assert(det.changed, "the repair must apply");
  const pm = (det.repaired as Record<string, unknown>).processing_methods as Record<string, unknown>;
  assertEquals(pm.collection_method, "Web forms and cookies");
  assert(!("processing_methods.collection_method" in det.repaired), "the flat key must be gone");
  assert(det.notes.some((n) => n.includes("unflattened")), "the repair is noted");
});

Deno.test("H1 — a genuinely unknown top-level key is dropped with a note", () => {
  const det = deterministicContractRepair("cppa-risk", {
    alternatives_considered: "Aggregate-only modelling was considered.",
  });
  assert(det.changed);
  assert(!("alternatives_considered" in det.repaired), "the unknown key must be dropped");
  assert(det.notes.some((n) => n.startsWith("alternatives_considered: dropped unknown top-level key")));
  assertEquals(unknownTopLevelKeys(cppaRiskContract, det.repaired as Record<string, unknown>).length, 0);
});

Deno.test("H1 — an existing nested value is never clobbered by a flat duplicate", () => {
  const det = deterministicContractRepair("cppa-risk", {
    processing_methods: { collection_method: "The recorded value" },
    "processing_methods.collection_method": "A conflicting flat value",
  });
  const pm = (det.repaired as Record<string, unknown>).processing_methods as Record<string, unknown>;
  assertEquals(pm.collection_method, "The recorded value");
  assert(!("processing_methods.collection_method" in det.repaired));
});

Deno.test("H1 — the live d1d2b3b8 abort shape now validates after deterministic repair alone", () => {
  const intake: Record<string, unknown> = {
    "processing_methods.collection_method": "Web forms",
    alternatives_considered: "Stray narrative the contract does not know.",
  };
  const det = deterministicContractRepair("cppa-risk", intake);
  const unknowns = unknownTopLevelKeys(cppaRiskContract, det.repaired as Record<string, unknown>);
  assertEquals(unknowns, []);
  const r = validateIntake(cppaRiskContract, det.repaired as Record<string, unknown>);
  assert(
    !r.violations.some((v) => v.reason === "unknown top-level key"),
    "no unknown-top-level-key violation may survive the deterministic repair",
  );
});

Deno.test("H2 — the DPIA perfect variant states the special-category-adjacent rule up front", async () => {
  const { PERFECT_HARD_CONSTRAINTS } = await import(
    "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts"
  );
  assertStringIncludes(PERFECT_HARD_CONSTRAINTS, "(11) SPECIAL-CATEGORY-ADJACENT DATA");
  assertStringIncludes(PERFECT_HARD_CONSTRAINTS, "article_9_condition");
  assertStringIncludes(PERFECT_HARD_CONSTRAINTS, "never build a healthcare/medical/wellness scenario on 'Legitimate interests'");
});

Deno.test("H4 — a heading+list block glued across blank lines is not a counsel referral", () => {
  const doc = [
    "The notification duties are analysed above.",
    "",
    "Notification Decision Log",
    "",
    "Maintained by: Chief Privacy Officer",
    "",
    "Must contain:",
    "",
    "- For each jurisdiction, the determination reached and the clock start",
    "- The approver and timestamp of each determination",
    "",
    "The analysis continues.",
  ].join("\n");
  const findings = runFormatChecksIR(doc);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" && f.passed === false);
  assertEquals(e6.length, 0, `no glued-heading false positive: ${JSON.stringify(e6)}`);
});

Deno.test("H4 — a genuine single-line counsel referral still fails", () => {
  const doc = "Before responding to the authority, the company should consult qualified legal counsel on the notification position.";
  const findings = runFormatChecksIR(doc);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" && f.passed === false);
  assert(e6.length > 0, "the real referral must still be flagged");
});
