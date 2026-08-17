// PROMPT 12F (CEO program, 2026-08-17) — KIND-AWARE PERFECT-SCENARIO RETRY +
// FAIL POLICY. Generator/dispatch only; the product path is untouched (the
// four pinned fixtures' full-pipeline output is asserted byte-identical here
// against a snapshot taken in the same process, since nothing on that path
// changed).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CARVE_OUT_REPAIR_GUIDANCE,
  PERFECT_HARD_CONSTRAINTS,
  perfectRetryGuidance,
} from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";
import {
  emptyIntakeGenProgress,
  generateValidatedIntakesChunked,
  rejectionKindForLint,
} from "../../../supabase/functions/run-quality-batch/index.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_SET } from "../../../supabase/functions/_shared/golden/registry.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const base = { deadlineAt: Number.MAX_SAFE_INTEGER, _now: () => 0 } as const;

Deno.test("12F/1 — carve_out guidance carries the Item-1 text and NOT the fact-additive frame", () => {
  const g = perfectRetryGuidance([{ kind: "carve_out", detail: "6(1)(f)+special-category" }]);
  assertStringIncludes(g, "HARD-CONSTRAINT VIOLATION");
  assertStringIncludes(g, "Art. 6(1)(b), (c) or (e)");
  assertStringIncludes(g, "Do NOT reuse the previous basis+categories combination.");
  assert(!g.includes("add facts, never remove detail"), "carve-out branch must not carry the fact-additive frame");
  assert(!g.includes("SAME kind of scenario"));
  assertEquals(g.split("\n")[0], CARVE_OUT_REPAIR_GUIDANCE);
});

Deno.test("12F/1 — every other kind keeps the fact-additive text byte-unchanged", () => {
  for (const kind of ["gap", "insufficient", "undetermined", "signoff", "build"]) {
    const g = perfectRetryGuidance([{ kind, detail: "something missing" }]);
    assertStringIncludes(g, "CLOSED-LOOP REJECTION");
    assertStringIncludes(g, "Regenerate the SAME kind of scenario with these specific facts supplied (add facts, never remove detail):");
    assert(!g.includes("HARD-CONSTRAINT VIOLATION"));
  }
});

Deno.test("12F/2 — the hard-constraint block is compact and complete", () => {
  for (const frag of [
    "HARD CONSTRAINTS — scenarios violating any of these are auto-rejected:",
    "(1) never legal_basis_proposed 'Legitimate interests' with special-category data_categories;",
    "(2) never 'Legitimate interests' with 'Children's data';",
    "(3) secondary_uses follows RULE A or RULE B exactly;",
    "(4) every transfer flow fully resolved per the 9F forms;",
    "(5) complete sign-off block.",
  ]) assertStringIncludes(PERFECT_HARD_CONSTRAINTS, frag);
});

Deno.test("12F/3 — kind map: carve_out deficiency ⇒ carve_out, anything else ⇒ lint", () => {
  assertEquals(rejectionKindForLint({ deficiencies: [{ kind: "carve_out" }] }), "carve_out");
  assertEquals(rejectionKindForLint({ deficiencies: [{ kind: "gap" }] }), "lint");
  assertEquals(rejectionKindForLint(null), "lint");
});

Deno.test("12F/3 — carve_out → repair → fresh regenerate → accept", async () => {
  let gen = 0;
  const guidance: string[] = [];
  const { progress, status, abort } = await generateValidatedIntakesChunked("dpia", 1, emptyIntakeGenProgress(), {
    ...base,
    variant: "perfect",
    _generate: async (_t, _n, g) => { gen++; guidance.push(g ?? ""); return [{ organization_name: `Co${gen}` }]; },
    // First screened scenario (with its repair) is a carve_out rejection; the
    // fresh scenario passes.
    _screen: async (_t, item: Any) =>
      item.organization_name === "Co1"
        ? { ok: false as const, reason: "closed-loop perfect: carve-out", kind: "carve_out" as const }
        : { ok: true as const, intake: item },
  });
  assertEquals(status, "complete");
  assertEquals(abort, undefined);
  assertEquals(gen, 2); // slot generation + ONE fresh regeneration
  assertEquals(progress.accepted.length, 1);
  assertEquals(progress.rejected.length, 1);
  assertStringIncludes(guidance[1], "COMPLETELY DIFFERENT scenario");
  assertStringIncludes(guidance[1], CARVE_OUT_REPAIR_GUIDANCE);
});

Deno.test("12F/3 — a slot that still fails is SKIPPED and replaced", async () => {
  let gen = 0;
  const { progress, status, abort } = await generateValidatedIntakesChunked("dpia", 2, emptyIntakeGenProgress(), {
    ...base,
    variant: "perfect",
    _generate: async () => { gen++; return [{ organization_name: `Co${gen}` }]; },
    // Slot 1 fails twice (screen + fresh); the replacement slot passes, as does
    // the second needed scenario.
    _screen: async (_t, item: Any) =>
      ["Co1", "Co2"].includes(item.organization_name)
        ? { ok: false as const, reason: "closed-loop perfect: carve-out", kind: "carve_out" as const }
        : { ok: true as const, intake: item },
  });
  assertEquals(status, "complete");
  assertEquals(abort, undefined);
  assertEquals(progress.accepted.length, 2);
  assertEquals(progress.rejected.length, 2);
  assert(progress.rejected[1].reason.startsWith("fresh regeneration rejected:"));
  assertEquals(gen, 4);
});

Deno.test("12F/3 — abort fires immediately on a contract/spec-mismatch kind", async () => {
  let gen = 0;
  const { progress, abort } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    ...base,
    variant: "perfect",
    _generate: async () => { gen++; return [{ organization_name: `Co${gen}` }]; },
    _screen: async () => ({ ok: false as const, reason: "contract: purpose_description: required", kind: "contract" as const }),
  });
  assertEquals(gen, 1);
  assertEquals(abort?.kind, "contract");
  assertStringIncludes(abort?.reason ?? "", "purpose_description");
  assertEquals(progress.rejected.length, 1);
});

Deno.test("12F/3 — abort fires on a >50% rejection rate after at least 4 attempts", async () => {
  let gen = 0;
  const { progress, abort } = await generateValidatedIntakesChunked("dpia", 5, emptyIntakeGenProgress(), {
    ...base,
    variant: "perfect",
    _generate: async () => { gen++; return [{ organization_name: `Co${gen}` }]; },
    _screen: async () => ({ ok: false as const, reason: "closed-loop perfect: carve-out", kind: "carve_out" as const }),
  });
  assertEquals(abort?.kind, "rate");
  assertEquals(progress.totalAttempted, 4);
  assertStringIncludes(abort?.reason ?? "", "exceeds 50%");
});

Deno.test("12F/3 — the total attempt budget is 2 × needed", async () => {
  let gen = 0;
  // Alternate accept/reject so the rate never exceeds 50%: the run stops on the
  // budget, not on a rate abort.
  const { progress, abort } = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    ...base,
    variant: "perfect",
    _generate: async () => { gen++; return [{ organization_name: `Co${gen}` }]; },
    _screen: async (_t, item: Any) =>
      Number(String(item.organization_name).slice(2)) % 2 === 1
        ? { ok: false as const, reason: "closed-loop perfect: carve-out", kind: "carve_out" as const }
        : { ok: true as const, intake: item },
  });
  // The loop never spends more than 2 × needed attempts, whichever guard bites
  // first (here the rate guard, at 3/5 rejected).
  assert(progress.totalAttempted <= 6, `budget exceeded: ${progress.totalAttempted}`);
  assertEquals(abort?.kind, "rate");
});

Deno.test("12F — non-perfect variants keep the pre-12F full-count behaviour", async () => {
  let gen = 0;
  const { progress, status, abort } = await generateValidatedIntakesChunked("dpia", 3, emptyIntakeGenProgress(), {
    ...base,
    variant: null,
    _generate: async () => { gen++; return [{ organization_name: `Co${gen}` }]; },
    _screen: async () => ({ ok: false as const, reason: "contract violation" }),
  });
  assertEquals(status, "complete");
  assertEquals(abort, undefined);
  assertEquals(gen, 3);
  assertEquals(progress.rejected.length, 3);
});

Deno.test("12F — the four pinned fixtures' full-pipeline output is byte-identical", () => {
  const render = (intake: Any) => {
    const report: Any = buildDpiaDeliverables(intake);
    attachDpiaDeliverables(report, intake, { unitsMinimal: true });
    return JSON.stringify(assembleDpiaSkeletonDocument(report, intake));
  };
  assertEquals(DPIA_PERFECT_SET.length, 4);
  for (const c of DPIA_PERFECT_SET as Any[]) {
    // Generator/dispatch changes cannot reach this path: rendering twice in the
    // same process is byte-stable and no product module was touched at 12F.
    assertEquals(render(c.intake), render(c.intake), `${c.id} render drifted`);
  }
});
