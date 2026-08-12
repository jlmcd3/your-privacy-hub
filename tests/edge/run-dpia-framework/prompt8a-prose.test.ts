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

Deno.test("prompt8a: per-risk template carries the re-scoring caveat exactly once", () => {
  const body = composeRiskBody({ risk_register: register }, { safeguards: "encryption at rest" } as never, {
    dpia_approved_by_name: "Dr. Anna Meier",
  });
  assertEquals(body.match(/re-scores it against the measures as implemented/g)?.length, 1);
  assertStringIncludes(body, "proposed until Dr. Anna Meier re-scores it");
  assertStringIncludes(body, "the residual band is low on the same proposed basis");
  assertStringIncludes(
    body,
    "is assessed at high likelihood and high severity on this assessment's pre-set taxonomy, an inherent band of high",
  );
  assertStringIncludes(body, "the residual band is undetermined");
  assert(!BANNED.test(body), body);
});

Deno.test("prompt8a: rescorer falls back to 'the company' when no approver is recorded", () => {
  const body = composeRiskBody({ risk_register: register.slice(0, 1) }, { safeguards: "" } as never, {});
  assertStringIncludes(body, "proposed until the company re-scores it");
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
  assertStringIncludes(exec, "The company's answers leave five points open");
  assertStringIncludes(exec, "The first three are:");
  const idxProcessors = exec.indexOf("processor obligations");
  const idxTransfer = exec.indexOf("transfer mechanism");
  const idxRetention = exec.indexOf("retention period");
  assert(idxProcessors < idxTransfer, "ledger order must hold inside the blocker group");
  assert(idxTransfer < idxRetention, "decision blockers must precede non-blockers");
  assert(!BANNED.test(exec), "composed output must not use the banned record-verb register");
});
