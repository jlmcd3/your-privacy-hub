// CURATED MAP PROGRAM — Phase C interim fix (2026-08-23, doc 63 §5.1) —
// pin guard for the cyber intake's pinned FSOR callout.
//
// Interim two-way agreement (the CAM leg arrives at wave C3, when this
// upgrades to the three-way Risk parity pattern):
//   frontend literal (CPPACyberFsorCallouts.ts)
//     === committed snapshot row (fsor-snapshot-cyber-interim.json)
// The snapshot pins the full agency_position_summary of FSOR row
// 3bb6fc9f (11 CCR § 7123(c), Appendix p. 81) captured 2026-08-23.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CPPA_CYBER_FSOR_CALLOUTS } from "@/components/cppa/CPPACyberFsorCallouts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../../../tests/edge/corpus/__snapshots__/fsor-snapshot-cyber-interim.json",
);
const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8")) as {
  rows: Record<string, Record<string, string>>;
};

const SOURCE_ROW_ID = "3bb6fc9f-3e48-404b-99d4-a5d4eaa52561";

describe("Cyber intake FSOR callout — pinned (interim, pre-CAM)", () => {
  it("carries exactly one callout, keyed under the row's TRUE citation", () => {
    expect(Object.keys(CPPA_CYBER_FSOR_CALLOUTS)).toEqual(["11 CCR § 7123(c)"]);
  });

  it("the old mis-attributed (c)(1) key is intentionally absent", () => {
    // The corpus's only substantive § 7123(c)(1) row (830b0beb) is
    // old-numbering audit-report-content commentary — the two-package
    // trap. It must never key an Authentication callout.
    expect(CPPA_CYBER_FSOR_CALLOUTS["11 CCR § 7123(c)(1)"]).toBeUndefined();
  });

  it("the literal is byte-identical to the committed snapshot row", () => {
    const row = snapshot.rows[SOURCE_ROW_ID];
    expect(row, "snapshot missing the pinned source row").toBeTruthy();
    expect(row.regulation_citation).toBe("11 CCR § 7123(c)");
    expect(CPPA_CYBER_FSOR_CALLOUTS["11 CCR § 7123(c)"]).toBe(
      row.agency_position_summary,
    );
  });
});
