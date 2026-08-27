// QB-REPAIR-2 (2026-08-27, live batch fd703575) — deterministic contract
// repair + date-anchored recency reasons.
//
// The batch lost three of nine tools to intake-generator aborts:
//   - cppa-risk: q16_sensitive_limit "Yes, but in footer only" — model repair
//     repeated the near-miss because the prompt said "change nothing else".
//   - dpia: reasons_to_conduct grew an INVENTED option ("Employment, social
//     security & social protection law (Art. 9(2)(b))") — no real option
//     matches, so the fix is to drop the element, which no model call is
//     needed for.
//   - ir-playbook: discoveryDateTime dated 2025 twice — the model does not
//     know today's date, and the rejection reason never told it.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deterministicContractRepair,
  screenIntake,
  uniqueNearestOption,
} from "../../../supabase/functions/run-quality-batch/index.ts";
import { DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { IR_PLAYBOOK_GOLDEN } from "../../../supabase/functions/_shared/golden/ir-playbook.ts";

const DPIA_WITH_REASONS = DPIA_GOLDEN.find((c) =>
  Array.isArray((c.intake as Record<string, unknown>).reasons_to_conduct) &&
  ((c.intake as Record<string, unknown>).reasons_to_conduct as string[]).length > 0
)!.intake as Record<string, unknown>;

Deno.test("uniqueNearestOption — token-subset maps the live 510a9953 near-miss onto the real option", () => {
  assertEquals(
    uniqueNearestOption("Testing performed within the last 12 months", [
      "Testing performed or reviewed within the last 12 months",
      "No testing performed",
    ]),
    "Testing performed or reviewed within the last 12 months",
  );
});

Deno.test("uniqueNearestOption — the live fd703575 q16 value maps to nothing (goes to model repair)", () => {
  assertEquals(
    uniqueNearestOption("Yes, but in footer only", [
      'Yes, with a separate "Limit the Use of My Sensitive PI" link',
      "Yes, handled within privacy settings",
      "No",
      "Not yet implemented",
    ]),
    null,
  );
});

Deno.test("uniqueNearestOption — ambiguous or too-short values map to nothing", () => {
  // Two options share the tokens — ambiguous.
  assertEquals(uniqueNearestOption("data processed", ["Data processed on a large scale", "Data processed briefly"]), null);
  // Under three tokens — too weak a signal even when one option contains it.
  assertEquals(uniqueNearestOption("large scale", ["Data processed on a large scale"]), null);
});

Deno.test("deterministicContractRepair — the live fd703575 dpia invented multi-enum element is dropped without a model call", async () => {
  const base = DPIA_WITH_REASONS;
  const invented = "Employment, social security & social protection law (Art. 9(2)(b))";
  const rejected = {
    ...base,
    reasons_to_conduct: [...(base.reasons_to_conduct as string[]), invented],
  };
  const det = deterministicContractRepair("dpia", rejected);
  assertEquals(det.changed, true);
  assertEquals((det.repaired.reasons_to_conduct as string[]).includes(invented), false);
  assertEquals(det.repaired.reasons_to_conduct, base.reasons_to_conduct);
  // End-to-end through screenIntake: accepted with zero model calls.
  const prompts: string[] = [];
  const screened = await screenIntake("dpia", rejected, () => null, undefined, async (_t, _n, g) => {
    prompts.push(g ?? "");
    return [rejected];
  });
  if (!screened.ok) throw new Error(`expected deterministic repair to succeed: ${screened.reason}`);
  assertEquals(prompts.length, 0);
});

Deno.test("deterministicContractRepair — valid intakes pass through untouched", () => {
  const det = deterministicContractRepair("dpia", DPIA_WITH_REASONS);
  assertEquals(det.changed, false);
  assertEquals(det.notes, []);
});

Deno.test("QB-REPAIR-2 — a stale ir-playbook discoveryDateTime rejection names today's date in both attempts", async () => {
  const base = IR_PLAYBOOK_GOLDEN[0].intake as Record<string, unknown>;
  const stale = { ...base, discoveryDateTime: "2025-07-16T03:47:00Z" };
  const todayIso = new Date().toISOString().slice(0, 10);
  const screened = await screenIntake("ir-playbook", stale, () => null, undefined, async () => [
    { ...base, discoveryDateTime: "2025-08-04T03:47:00Z" }, // the model's live "repair": still 2025
  ]);
  assertEquals(screened.ok, false);
  if (screened.ok) return;
  assertStringIncludes(screened.reason, "more than 30 days old");
  assertStringIncludes(screened.reason, `today is ${todayIso}`);
});
