// PROMPT 9G (2026-08-15) — SELF-VERIFYING PIN GUARD + ALL-PINNED BATCH MODE
// + the two 9F tightenings.
//
// Item 2 is the standing guard: EVERY dpia pinned perfect fixture must pass
// the product's own closed-loop check. If a future product change makes a
// pinned fixture imperfect, the battery goes red at commit time instead of a
// batch dying at dispatch.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_PERFECT_SET, casesForVariant } from "../golden/registry.ts";
import { DPIA_PERFECT_PINNED } from "../golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../golden/dpia.ts";
import { checkPerfectDpiaIntake, deficiencyLines } from "../quality/perfect-closed-loop.ts";
import { planPinnedOnly } from "../quality/pinned-only.ts";
import { buildDpiaDeliverables } from "../ltp/dpia-deliverables/build.ts";

// ── Item 1 — the two attached fixtures are pinned, byte-exact ───────────────

Deno.test("9G/1 — the two attached fixtures are pinned as dpia perfect fixtures", () => {
  assertEquals(DPIA_PERFECT_PINNED.length, 2);
  assertEquals(DPIA_PERFECT_PINNED.map((c) => c.id), [
    "dpia-perfect-uk-harrowgate-underwriting",
    "dpia-perfect-eu-solferino-occupational-health",
  ]);
  // Additive: the 8-series authored pair keeps positions 0..1.
  assertEquals(DPIA_PERFECT_SET.slice(0, DPIA_PERFECT.length), DPIA_PERFECT);
  assertEquals(DPIA_PERFECT_SET.length, DPIA_PERFECT.length + 2);
  assertEquals(casesForVariant("dpia", "perfect"), DPIA_PERFECT_SET);
});

// ── Item 2 — SELF-VERIFYING PIN GUARD ──────────────────────────────────────

for (const c of DPIA_PERFECT_SET) {
  Deno.test(`9G/2 — pinned perfect fixture ${c.id} passes the closed-loop check`, () => {
    const res = checkPerfectDpiaIntake(c.intake);
    assertEquals(res.ok, true, `${c.id}: ${deficiencyLines(res.deficiencies).join(" | ")}`);
  });
}

// ── Item 3 — ALL-PINNED BATCH MODE (deterministic dispatch pre-filter) ─────

Deno.test("9G/3 — planPinnedOnly keeps every passing pin and clamps the size", () => {
  const plan = planPinnedOnly("dpia", DPIA_PERFECT_SET, 25);
  assertEquals(plan.intakes.length, DPIA_PERFECT_SET.length);
  assertEquals(plan.exclusions.length, 0);
  assertEquals(plan.batchSize, DPIA_PERFECT_SET.length);
  assertEquals(plan.clamped, true);
  assert(plan.logLines.some((l) => l.includes("batch_size clamped 25")));
});

Deno.test("9G/3 — a failing pin is excluded WITH its deficiency list and shrinks the size", () => {
  const broken = {
    id: "dpia-broken",
    set: "tuning",
    intake: { organization_name: "Thin Ltd", processing_activity_name: "Something" },
  } as unknown as typeof DPIA_PERFECT_SET[number];
  const plan = planPinnedOnly("dpia", [...DPIA_PERFECT_SET, broken], DPIA_PERFECT_SET.length + 1);
  assertEquals(plan.batchSize, DPIA_PERFECT_SET.length);
  assertEquals(plan.exclusions.length, 1);
  assertEquals(plan.exclusions[0].id, "dpia-broken");
  assert(plan.exclusions[0].deficiencies.length > 0);
  assert(plan.logLines[0].startsWith("pinned_only: EXCLUDED pinned perfect fixture dpia-broken"));
  assert(plan.logLines[0].includes(plan.exclusions[0].deficiencies[0]));
});

Deno.test("9G/3 — no clamp line when the requested size already equals the pin count", () => {
  const plan = planPinnedOnly("dpia", DPIA_PERFECT_SET, DPIA_PERFECT_SET.length);
  assertEquals(plan.clamped, false);
  assertEquals(plan.logLines.length, 0);
});

Deno.test("9G/3 — tools without a closed-loop check pass their pins through", () => {
  const plan = planPinnedOnly("governance", casesForVariant("governance", "perfect"), 50);
  assertEquals(plan.exclusions.length, 0);
  assertEquals(plan.batchSize, casesForVariant("governance", "perfect").length);
});

// ── Item 4 — the two 9F tightenings ────────────────────────────────────────

function transferIntake(evidence: string): Record<string, unknown> {
  return {
    ...(DPIA_PERFECT_PINNED[0].intake as Record<string, unknown>),
    transfer_flows: [
      {
        recipient: "Meridian Analytics Inc.",
        destination_country: "US",
        adequacy: "none",
        dpf_certified: false,
        transfer_mechanism: evidence,
      },
    ],
  };
}

function creditedFlowText(intake: Record<string, unknown>): string {
  const out = buildDpiaDeliverables(intake as never) as unknown as {
    units?: { determination?: string }[];
  };
  return JSON.stringify(out);
}

Deno.test("9G/4a — SAME-SENTENCE RULE: execution evidence in another sentence is not credit", () => {
  const split = creditedFlowText(transferIntake(
    "The standard contractual clauses govern the transfer to the importer. " +
    "The master services agreement was signed on 3 May 2022. " +
    "A transfer risk assessment was completed on 4 May 2022.",
  ));
  assert(!split.includes("instrument_recorded"), "cross-sentence evidence must not be credited");

  const same = creditedFlowText(transferIntake(
    "The standard contractual clauses were signed on 3 May 2022. " +
    "A transfer risk assessment was completed on 4 May 2022.",
  ));
  assert(same.includes("instrument_recorded"), "same-sentence evidence must be credited");
});

Deno.test("9G/4b — TRA reference counts only with a digit-bearing identifier", () => {
  const bare = creditedFlowText(transferIntake(
    "The standard contractual clauses were signed on 3 May 2022. " +
    "A transfer risk assessment reference is held by the privacy team.",
  ));
  assert(!bare.includes("instrument_recorded"), "a bare TRA reference is not completion evidence");

  const identified = creditedFlowText(transferIntake(
    "The standard contractual clauses were signed on 3 May 2022. " +
    "A transfer risk assessment (ref PM/VIG/2024/TRA-01) is held by the privacy team.",
  ));
  assert(identified.includes("instrument_recorded"), "a digit-bearing TRA ref is completion evidence");
});

Deno.test("9G/4b — TBD / TBA / to follow block the credit", () => {
  for (const placeholder of ["TRA ref TBD.", "TRA ref TBA.", "The TRA is to follow."]) {
    const txt = creditedFlowText(transferIntake(
      `The IDTA was countersigned on 2024-11-14. ${placeholder}`,
    ));
    assert(!txt.includes("instrument_recorded"), `placeholder must block credit: ${placeholder}`);
  }
});
