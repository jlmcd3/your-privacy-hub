/**
 * ITEM 420 — MIRROR PARITY.
 *
 * src/lib/action-record.ts is the sanctioned frontend mirror of
 * supabase/functions/_shared/report-contracts/action-record.ts (Deno edge code
 * cannot import from src/). This test pins both copies to identical source
 * logic and identical formatter output.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ACTION_RECORD_CONTRACT_VERSION,
  coerceActionList,
  coerceActionListText,
  formatActionHeadline,
  isActionRecord,
  sortByRank,
} from "@/lib/action-record";

const ROOT = process.cwd();
const EDGE = path.join(ROOT, "supabase/functions/_shared/report-contracts/action-record.ts");
const SRC = path.join(ROOT, "src/lib/action-record.ts");

function bodies(file: string) {
  const s = fs.readFileSync(file, "utf8");
  // Compare only the executable declarations, not the header comments.
  return s
    .split("\n")
    .filter((l) => !l.trim().startsWith("*") && !l.trim().startsWith("/*") && !l.trim().startsWith("//"))
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

describe("ITEM 420 — canonical action record", () => {
  it("frontend mirror is logic-identical to the shared edge module", () => {
    expect(bodies(SRC)).toBe(bodies(EDGE));
  });

  it("declares the contract version", () => {
    expect(ACTION_RECORD_CONTRACT_VERSION).toBe("action-record@2026-08-09-item422");
  });

  it("isActionRecord accepts records and rejects everything else", () => {
    expect(isActionRecord({ action: "Do the thing" })).toBe(true);
    expect(isActionRecord({ action: "   " })).toBe(false);
    expect(isActionRecord("Do the thing")).toBe(false);
    expect(isActionRecord(["Do the thing"])).toBe(false);
    expect(isActionRecord(null)).toBe(false);
  });

  it("formats pinpoint once, owner once, sentence case, no markdown", () => {
    const h = formatActionHeadline({
      action: "**record the initiation decision**",
      statutory_basis: "11 CCR § 7152(a)(7)",
      owner_role: "Chief Compliance Officer",
      deadline: "December 31, 2027",
      deadline_basis: "11 CCR § 7155(b)",
    });
    expect(h).toBe(
      "Record the initiation decision. Statutory basis: 11 CCR § 7152(a)(7). " +
        "Deadline: December 31, 2027 (11 CCR § 7155(b)). Owner: Chief Compliance Officer.",
    );
    expect(h).not.toMatch(/\*\*/);
  });

  it("legacy strings pass through with legacy trim/filter semantics", () => {
    expect(coerceActionListText(["  a  ", "", "b"])).toEqual(["a", "b"]);
    expect(coerceActionListText([])).toBeUndefined();
    expect(coerceActionListText("solo")).toEqual(["solo"]);
    expect(coerceActionListText(undefined)).toBeUndefined();
  });

  it("keeps the typed record alongside its rendered text", () => {
    const items = coerceActionList([{ action: "A typed action", rank: 1 }]);
    expect(items?.[0].record?.rank).toBe(1);
    expect(items?.[0].text).toBe("A typed action.");
  });

  it("sortByRank sinks unranked entries last", () => {
    expect(sortByRank([{ rank: 3 }, {}, { rank: 1 }]).map((x: any) => x.rank)).toEqual([1, 3, undefined]);
  });
});
