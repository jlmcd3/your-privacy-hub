// PROMPT 8A — ratified composed-template prose (CEO approval 2026-08-12).
//
// Covers: the per-risk analytic template and its once-only re-scoring caveat,
// the number-word pluralisation convention, the deterministic ordering of the
// executive body's open points (decision blockers first, then ledger order),
// and the register ban on "the record identifies|names|puts|relies" in every
// composed customer sentence.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpiaSkeletonDocument,
  composeRiskBody,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { nWord } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BANNED = /\bthe record (identifies|names|puts|relies)\b/i;

const register = [
  { risk_label: "Unauthorised access to health records", likelihood: "high", severity: "high", inherent_band: "high", residual_band: "medium", measures: ["role-scoped access controls", "quarterly recertification"] },
  { risk_label: "Excessive retention", likelihood: "medium", severity: "medium", inherent_band: "medium", residual_band: "low", measures: ["a 24-month retention limit"] },
  { risk_label: "Unlogged export", likelihood: "low", severity: "high", inherent_band: "medium", residual_band: "", measures: [] },
];

// v4.6.2 (2026-08-25 polish round) — the "preliminary until re-scored"
// caveat and its {rescorer} name were retired: residual ratings are final
// as of the assessment date (Art. 35(11) handles change). The two caveat
// tests below now pin the new per-risk closer.
Deno.test("prompt8a: per-risk template closes each row on the recorded-measures basis", () => {
  const body = composeRiskBody({ risk_register: register }, { safeguards: "encryption at rest" } as never, {
    dpia_approved_by_name: "Dr. Anna Meier",
  });
  assert(!/preliminary|re-scores/.test(body), body);
  assertStringIncludes(body, "the remaining risk level is low after those measures are taken into account");
  assertStringIncludes(
    body,
    // PROMPT 9L.1 item 4 — re-anchored to the ratified per-risk template
    // (v4.6.2 vocabulary: "the assessment's defined risk matrix").
    "is assessed at \u201Chigh\u201D likelihood and \u201Chigh\u201D severity under the assessment's defined risk matrix, with an aggregate initial risk level of high",
  );
  assertStringIncludes(body, "the remaining risk level is undetermined");
  assert(!BANNED.test(body), body);
});

Deno.test("prompt8a: no-approver record composes without any re-scoring reference (rescorer retired)", () => {
  const body = composeRiskBody({ risk_register: register.slice(0, 1) }, { safeguards: "" } as never, {});
  assert(!/preliminary|re-scores/.test(body), body);
  assertStringIncludes(body, "The company records no safeguards for this processing.");
});

Deno.test("prompt8a: number words run one–nine, digits from ten up", () => {
  assertEquals(nWord(1), "one");
  assertEquals(nWord(9), "nine");
  assertEquals(nWord(12), "12");
});

Deno.test("prompt8a: open points order decision blockers first, then ledger order", () => {
  const gap_ledger = [
    { dimensions: "retention period", enables: "" },
    { dimensions: "processor obligations", enables: "art28_determination" },
    { dimensions: "data quality measures", enables: "" },
    { dimensions: "transfer mechanism", enables: "chapter_v_determination" },
    { dimensions: "review cadence", enables: "" },
  ];
  const doc = assembleDpiaSkeletonDocument({ gap_ledger, risk_register: [] } as never, {} as never);
  const exec = JSON.stringify(doc);
  assertStringIncludes(exec, "five points are still open");
  assertStringIncludes(exec, "The first three are:");
  const idxProcessors = exec.indexOf("processor obligations");
  const idxTransfer = exec.indexOf("transfer mechanism");
  const idxRetention = exec.indexOf("retention period");
  assert(idxProcessors < idxTransfer, "ledger order must hold inside the blocker group");
  assert(idxTransfer < idxRetention, "decision blockers must precede non-blockers");
  assert(!BANNED.test(exec), "composed output must not use the banned record-verb register");
});
