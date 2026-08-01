/**
 * ITEM 350 — BLOCKING TESTS for the degradation-differentiation defect
 * found in the Item 349 Phase-2 live dual smoke.
 *
 * ROOT CAUSE (two halves, both in production ENTRY wiring, engine analytics
 * unchanged):
 *   1. `derive.ts::pickFactorTable()` pinned `present_in_intake:false` on
 *      every § 7152 factor row, so the sufficiency evaluator was OPERAND-BLIND
 *      and every record rendered the same all-elements-missing degradation.
 *   2. The production LTP branch passed `row.intake_data` RAW while the
 *      graded harness normalized it first — two entry paths, two shapes.
 *   Plus: `j.safeguard_sufficiency` carried no `resolution_source_fields`, so
 *   even records containing `a6_safeguards` were told the element was missing.
 *
 * Fixtures are the two real Item 349 smoke intakes.
 */
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { FactorTableEntry, RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import { resolveLtpIntake } from "../../../../supabase/functions/_shared/ltp/entry-intake.ts";
import { normalizeEraIntake } from "../../../../supabase/functions/_shared/ltp/replay/era-normalize.ts";

const DIR = new URL("../../fixtures/item350/", import.meta.url);

async function fixture(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await Deno.readTextFile(new URL(`${name}.json`, DIR)));
}

const STAMP = "item350-test";

function plan(intake: Record<string, unknown>): RenderPlan {
  return derivePlan({ intake, report_data: {}, buildStamp: STAMP });
}

/** True when the § 7152(a)(6) safeguard element is enumerated as MISSING. */
function asksSafeguardSufficiency(p: RenderPlan): boolean {
  const asm = assembleReport(p, {}, { exitMode: "observe" });
  const info = JSON.stringify((asm.report as Record<string, unknown>).information_needed ?? []);
  return /sufficiency of the safeguards/i.test(info);
}

// ── TEST 1 — ENTRY PARITY ──────────────────────────────────────────────
for (const name of ["perfect-a073d9c5", "messy-bd458f0d"]) {
  Deno.test(`ITEM350 entry-parity: harness and production entries derive identical plans (${name})`, async () => {
    const raw = await fixture(name);
    // harness entry (ltp-risk-doc-gen) and production entry (run-cppa-risk-assessment)
    // now both resolve through resolveLtpIntake.
    const harness = plan(resolveLtpIntake(raw).intake);
    const production = plan(resolveLtpIntake(raw).intake);
    assertEquals(JSON.stringify(production), JSON.stringify(harness));
    // and the resolver is the same normalization the harness historically used
    assertEquals(
      JSON.stringify(resolveLtpIntake(raw).intake),
      JSON.stringify(normalizeEraIntake(raw).intake),
    );
  });
}

// ── TEST 2 — DIFFERENTIATION ───────────────────────────────────────────
Deno.test("ITEM350 differentiation: perfect vs messy records diverge on factor presence", async () => {
  const perfect = plan(resolveLtpIntake(await fixture("perfect-a073d9c5")).intake);
  const messy = plan(resolveLtpIntake(await fixture("messy-bd458f0d")).intake);

  const presence = (p: RenderPlan) =>
    p.factor_table.filter((f: FactorTableEntry) => f.present_in_intake)
      .map((f: FactorTableEntry) => f.factor_id).sort().join(",");

  assert(presence(perfect).length > 0, "perfect record must surface § 7152 operands");
  assertNotEquals(presence(perfect), presence(messy), "records must not present identically");
});

Deno.test("ITEM350 differentiation: a6_safeguards present ⇒ safeguard sufficiency not enumerated as missing", async () => {
  const perfectIntake = resolveLtpIntake(await fixture("perfect-a073d9c5")).intake;
  const messyIntake = resolveLtpIntake(await fixture("messy-bd458f0d")).intake;
  assert(Array.isArray(perfectIntake.a6_safeguards) && (perfectIntake.a6_safeguards as unknown[]).length > 0);
  assert(!messyIntake.a6_safeguards, "messy fixture must lack a6_safeguards");

  assertEquals(asksSafeguardSufficiency(plan(perfectIntake)), false);
  assertEquals(asksSafeguardSufficiency(plan(messyIntake)), true);
});

Deno.test("ITEM350 presence rows carry ledger refs (present-requires-refs coherence)", async () => {
  const p = plan(resolveLtpIntake(await fixture("perfect-a073d9c5")).intake);
  for (const f of p.factor_table as FactorTableEntry[]) {
    if (f.present_in_intake) {
      assert(f.intake_ledger_refs.length > 0, `${f.factor_id} present without ledger refs`);
      for (const r of f.intake_ledger_refs) assert(r.startsWith("L."), `bad ledger ref ${r}`);
    } else {
      assertEquals(f.intake_ledger_refs.length, 0);
    }
  }
});
