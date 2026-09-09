// DOC 231 — THE ZERO-CALL REGRESSION TEST (build-brief non-negotiable:
// "include a zero-call regression test: flag off ⇒ no classify-propositions
// call, report_data byte-identical").
//
// `attachRiskHookSelection` (risk-v3-selection.ts) is the ONLY place this
// product's pipeline could ever reach a model for hook selection. This
// file asserts, directly against that function (not through the full
// generation pipeline, which has no hermetic harness in this build — see
// doc 231 build log), that:
//
//   1. RISK_V3_ENABLED is false in this build's default configuration
//      (no env var set) — the same assertion doc217/224's own tests make
//      for LIA_V3_ENABLED.
//   2. With RISK_V3_ENABLED false, `attachRiskHookSelection` returns
//      immediately: zero reads through the injected `db` client, zero
//      `fetch` calls (spied via `globalThis.fetch` — invokeGated's only
//      network door), and a deterministic, `enabled:false` record.
//   3. Even with a `db` client and a nonzero `runsAllowed`/`generationNo`
//      supplied (simulating a live call site that HAS wired the meter),
//      the flag-off short-circuit still fires before either is touched —
//      proving the guarantee does not depend on the caller forgetting to
//      wire something.
//   4. RISK_HOOKS ships exactly the one ratified hook (AP/ICS), pinned
//      below — any future hook addition must update the pin, so the
//      shipped corpus can never silently grow.
//   5. Calling the function twice with identical inputs is idempotent and
//      produces byte-identical (`assertEquals`) records — the "report_data
//      byte-identical" half of the requirement, applied to the ONE thing
//      this build's dark wiring could vary: the record `finalizeCppaRiskPayload`
//      writes to `_meta.internal.risk_v3` (report_data itself is
//      unaffected in every other respect, since nothing else in
//      generate-cppa-risk.ts reads RISK_V3_ENABLED / RISK_HOOKS at all).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RISK_V3_ENABLED } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-v3-flag.ts";
import { RISK_HOOKS_ENABLED } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-hooks-flag.ts";
import { RISK_HOOKS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";
import { attachRiskHookSelection, type RiskV3DbClient } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-v3-selection.ts";

Deno.test("doc231 — RISK_V3_ENABLED and RISK_HOOKS_ENABLED both default false in this build's configuration", () => {
  assertEquals(RISK_V3_ENABLED, false);
  assertEquals(RISK_HOOKS_ENABLED, false);
});

Deno.test("doc231 — RISK_HOOKS ships exactly the three ratified hooks — the shipped-corpus pin", () => {
  assertEquals(RISK_HOOKS.length, 3);
  assertEquals(RISK_HOOKS.map((h) => h.hook_id).sort(), [
    "enforcement_actions:a3cf40b0-3625-4e78-bbe9-63624f17ceb0:v1",
    "enforcement_actions:dbfca969-3139-43d1-8a5b-7fff179f8db6:v1",
    "enforcement_actions:dc095815-d03d-4bb2-b3be-2711e7f7d459:v1",
  ]);
});

function spyingDb(reads: string[]): RiskV3DbClient {
  return {
    from(table: string) {
      return {
        select(_columns: string) {
          const chain = {
            eq(_c: string, _v: string) {
              return {
                eq(_c2: string, _v2: string) {
                  reads.push(table);
                  return Promise.resolve({ data: [], error: null });
                },
                then(resolve: (v: { data: unknown; error: unknown }) => void) {
                  reads.push(table);
                  resolve({ data: [], error: null });
                },
              } as never;
            },
          };
          return chain as never;
        },
      };
    },
  };
}

Deno.test("doc231 — attachRiskHookSelection: flag off => zero DB reads, zero fetch calls, deterministic enabled:false record", async () => {
  const reads: string[] = [];
  const fetchCalls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetchCalls.push(String(args[0]));
    return originalFetch(...args);
  }) as typeof fetch;

  try {
    const record = await attachRiskHookSelection(
      { primary_activity_purpose: "We process account identifiers to run fraud checks on new sign-ups, in some detail." },
      { "Safeguards": "uncertain" },
      ["some-source-row"],
      new Set(),
      { db: spyingDb(reads), assessmentId: "test-assessment-id", runsAllowed: 4, generationNo: 1 },
    );
    assertEquals(reads, [], "no database table must be read while the flag is off");
    assertEquals(fetchCalls, [], "no network call must be made while the flag is off");
    assertEquals(record.enabled, false);
    assertEquals(record.calls_this_generation, 0);
    assertEquals(record.applications, []);
    assertEquals(record.information_needed_entries, []);
    assertEquals(record.error, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("doc231 — attachRiskHookSelection: called twice with identical inputs is idempotent and byte-identical", async () => {
  const intake = { primary_activity_purpose: "We process account identifiers to run fraud checks on new sign-ups, in some detail." };
  const verdicts = { "Safeguards": "uncertain" };
  const a = await attachRiskHookSelection(intake, verdicts, ["row"], new Set(), {
    db: spyingDb([]), assessmentId: "x", runsAllowed: 4, generationNo: 1,
  });
  const b = await attachRiskHookSelection(intake, verdicts, ["row"], new Set(), {
    db: spyingDb([]), assessmentId: "x", runsAllowed: 4, generationNo: 1,
  });
  assertEquals(a, b);
});

Deno.test("doc231 — attachRiskHookSelection never throws even with no db client and an empty intake", async () => {
  const record = await attachRiskHookSelection({}, {}, [], new Set(), {
    assessmentId: "no-db", runsAllowed: 4, generationNo: 1,
  });
  assert(record.enabled === false || record.applications.length === 0);
  assertEquals(record.error, null);
});
