/**
 * ITEM 235b (T-M9.5b) — LAW 3: SURFACE-OWNERSHIP ENFORCEMENT AT BUILD TIME.
 *
 * Any emitter/assembler write to a surface it does not own per the
 * section-shard registry = TEST FAILURE (build-level), independent of
 * the runtime shipped-surface-guard. The cohort-to-CUT-surface class
 * must be impossible to reintroduce.
 *
 * Static checks:
 *   (a) The assembler source file contains ONLY the sanctioned
 *       `report[shard.key] = ...` write site — no ad-hoc `report[...] =`
 *       assignments to string literals.
 *   (b) Every shard.key ∈ report schema top-level.
 *   (c) No shard.key equals a top-level CUT-ruling path.
 *   (d) At assembly time, no shipped key path collides with a CUT
 *       ruling path (belt-and-suspenders across the runtime guard).
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { CPPA_RISK_SECTION_SHARDS } from "./section-shards/cppa-risk.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { RISK_CUT_RULINGS } from "./content/risk-surface-map.ts";

const ASSEMBLER_PATH = new URL("./pass2-assembler.ts", import.meta.url);

function fixturePlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "surface-ownership@test",
  });
}

Deno.test("LAW 3 (a): assembler source declares exactly ONE report[<key>] write site", async () => {
  const src = await Deno.readTextFile(ASSEMBLER_PATH);
  // Any `report[...] =` write with a bracketed key.
  const writeSites = [...src.matchAll(/\breport\[([^\]]+)\]\s*=/g)];
  assertEquals(
    writeSites.length,
    1,
    `expected exactly 1 report[...] write site in assembler, found ${writeSites.length}: ` +
      writeSites.map((m) => m[0]).join(" | "),
  );
  const only = writeSites[0][1].trim();
  assertEquals(
    only,
    "shard.key",
    `assembler write site key must be shard.key (registry-driven); got: ${only}`,
  );
});

Deno.test("LAW 3 (b): every shard.key is present in report schema top-level allow-list", () => {
  const schema = new Set(CPPA_RISK_REPORT_SCHEMA.topLevel);
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    assert(schema.has(s.key), `shard key ${s.key} not in report schema top-level`);
  }
});

Deno.test("LAW 3 (c): no shard.key is a top-level CUT ruling path", () => {
  const cutTopLevel = new Set(
    RISK_CUT_RULINGS
      .map((c) => c.path)
      .filter((p) => !p.includes(".") && !p.includes("[")),
  );
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    if (cutTopLevel.has(s.key)) {
      // template-cut owner kind is the sanctioned way to retain a key with
      // bounded content; that is registered on the shard itself and is
      // still forbidden from writing free content. Any OTHER owner_kind
      // pointing at a CUT top-level path is a hard failure.
      assertEquals(
        s.owner.kind,
        "template-cut",
        `shard ${s.key} targets a CUT top-level path with non-template-cut owner ${s.owner.kind}`,
      );
    }
  }
});

Deno.test("LAW 3 (d): assembler never ships a top-level key that matches a CUT ruling path", () => {
  const plan = fixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const shipped = new Set(Object.keys(result.report));
  const removedCut = new Set(
    RISK_CUT_RULINGS.filter((c) => c.mode === "REMOVE").map((c) => c.path),
  );
  for (const p of removedCut) {
    assert(!shipped.has(p), `shipped surface contains CUT/REMOVE path: ${p}`);
  }
});
