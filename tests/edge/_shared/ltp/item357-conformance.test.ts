/**
 * ITEM 357 — LTP cppa-risk CONFORMANCE SUITE (permanent gate).
 *
 * Supersedes item354-surface-conformance.test.ts. Two changes:
 *   1. The suite renders through the ONE shared generation module
 *      (`generateCppaRiskReport`), so it exercises the exact persisted payload
 *      — entry-intake → derive → assemble → emit-gate → serialize → finalize.
 *   2. Checks live in the pure `conformance-checks.ts` module so the identical
 *      suite runs against live-persisted payloads from deployed v2.
 */
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { runConformanceChecks, formatResults } from "../../fixtures/item354/conformance-checks.ts";

const FIXTURES = ["perfect-a073d9c5", "messy-bd458f0d"] as const;

async function render(name: string): Promise<Record<string, unknown>> {
  const raw = JSON.parse(
    await Deno.readTextFile(new URL(`../../fixtures/item350/${name}.json`, import.meta.url)),
  );
  const gen = await generateCppaRiskReport(raw, {
    buildStamp: "item357-conformance",
    runId: `item357-${name}`,
    pass1: "deterministic",
    mode: "enforce",
    euCorpus: [],
  });
  return gen.report;
}

const reports: Record<string, Record<string, unknown>> = {};
for (const f of FIXTURES) reports[f] = await render(f);

for (const f of FIXTURES) {
  Deno.test(`[item357][${f}] full conformance suite on the persisted payload`, () => {
    const results = runConformanceChecks(reports[f]);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) console.log(formatResults(f, results));
    assert(failed.length === 0, failed.map((r) => `${r.name}: ${r.detail}`).join(" | "));
  });
}

// ── DIFFERENTIATION (Items 349 / 351 / 352) ─────────────────────────
async function md5(v: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(v));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.test("[item357] record_sufficiency differs between the two records", async () => {
  const a = await md5(reports["perfect-a073d9c5"].record_sufficiency);
  const b = await md5(reports["messy-bd458f0d"].record_sufficiency);
  assert(a !== b, `record_sufficiency byte-identical (${a})`);
});

Deno.test("[item357] information_needed differs between the two records", async () => {
  const a = await md5(reports["perfect-a073d9c5"].information_needed);
  const b = await md5(reports["messy-bd458f0d"].information_needed);
  assert(a !== b, `information_needed byte-identical (${a})`);
});

Deno.test("[item357] the messy record needs at least as much information as the perfect one", () => {
  const p = (reports["perfect-a073d9c5"].information_needed as unknown[]).length;
  const m = (reports["messy-bd458f0d"].information_needed as unknown[]).length;
  assert(m >= p, `messy=${m} < perfect=${p}: degradation is not honest`);
});
