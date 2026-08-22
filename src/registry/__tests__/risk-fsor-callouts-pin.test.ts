// PHASE 2 corpus program (2026-08-22, doc 49 A.2.3(b)) — parity + pin
// guard for the risk intake's pinned FSOR callouts.
//
// Three-way agreement is enforced:
//   frontend literal (CPPARiskFsorCallouts.ts)
//     === CAM S0 row pinned_excerpt (risk-corpus-map.ts)
//     ⊂  committed corpus snapshot (fsor-snapshot-risk.json)
// so a drift in ANY copy fails CI. The deno-side cam-pins test already
// verifies CAM-row ⊂ snapshot; this vitest closes the frontend leg.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CPPA_RISK_FSOR_CALLOUTS } from "@/components/cppa/CPPARiskFsorCallouts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../../../tests/edge/corpus/__snapshots__/fsor-snapshot-risk.json",
);
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8")) as {
  rows: Record<string, Record<string, string>>;
};

const s0Rows = RISK_CORPUS_MAP.rows.filter(
  (r) => r.render_eligible && r.render_surface === "S0",
);

describe("Risk intake FSOR callouts — pinned (S0)", () => {
  it("the CAM carries exactly the three S0 callout rows the intake shows", () => {
    expect(s0Rows.map((r) => r.s0_field).sort()).toEqual([
      "11 CCR § 7152(a)(1)",
      "11 CCR § 7152(a)(3)(G)",
      "11 CCR § 7156(b)",
    ]);
  });

  it("frontend literals are byte-identical to the CAM S0 pins", () => {
    for (const row of s0Rows) {
      expect(
        CPPA_RISK_FSOR_CALLOUTS[row.s0_field!],
        `frontend callout missing or drifted for ${row.s0_field}`,
      ).toBe(row.pinned_excerpt);
    }
    // And nothing extra on the frontend side.
    expect(Object.keys(CPPA_RISK_FSOR_CALLOUTS).sort()).toEqual(
      s0Rows.map((r) => r.s0_field!).sort(),
    );
  });

  it("every CAM S0 pin is a substring of its committed snapshot row", () => {
    for (const row of s0Rows) {
      const text = snapshot.rows[row.source_row_id]?.[row.excerpt_field];
      expect(text, `snapshot missing ${row.source_row_id}`).toBeTruthy();
      expect(
        text!.includes(row.pinned_excerpt),
        `${row.id}: pin not found in snapshot`,
      ).toBe(true);
    }
  });

  it("the 7156(a) citation stays intentionally absent (the view has no row for it)", () => {
    expect(CPPA_RISK_FSOR_CALLOUTS["11 CCR § 7156(a)"]).toBeUndefined();
  });
});
