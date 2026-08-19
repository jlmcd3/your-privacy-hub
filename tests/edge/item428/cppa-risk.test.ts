// ITEM 428 PIECE A — cppa-risk structural-conformance battery.
//
// Assembled through the LIVE pipeline (generateCppaRiskReport, deterministic
// pass1) on the persisted perfect fixture — the same idiom
// tests/edge/_shared/ltp/item357-conformance.test.ts uses.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";

async function assembled(): Promise<Record<string, unknown>> {
  const raw = JSON.parse(
    await Deno.readTextFile(new URL("../fixtures/item350/perfect-a073d9c5.json", import.meta.url)),
  );
  const gen = await generateCppaRiskReport(raw, {
    buildStamp: "item428-conformance",
    runId: "item428-cppa-risk",
    pass1: "deterministic",
    mode: "enforce",
    euCorpus: [],
  });
  return structuredClone(gen.report);
}

Deno.test("item428 cppa-risk: perfect fixture is fully conformant", async () => {
  const report = await assembled();
  const res = checkStructureConformance("cppa-risk", report);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 9);
});

Deno.test("item428 cppa-risk: a padded-hollow section fails conformance", async () => {
  const report = await assembled();
  report.processing_narrative = ["Not recorded."];
  const res = checkStructureConformance("cppa-risk", report);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("record_card"), JSON.stringify(res.padded_empty));
});
