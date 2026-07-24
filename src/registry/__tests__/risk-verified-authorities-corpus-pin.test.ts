// RISK-REGISTRY-WIRING (2026-07-24) — corpus-pin CI for RISK registry.
//
// For every row in RISK_VERIFIED_AUTHORITIES, assert that its `verbatim_quote`
// appears (after light normalization) as a substring of the corpus text
// stored in `public.cppa_authorities.full_text` for the same citation,
// status='current'.
//
// Authoring rule: KNOWN_PARAPHRASED_KEYS is EMPTY on entry — every risk row
// must pass corpus-pin from the first commit. A proposition that cannot
// carry an exact contiguous corpus substring is EXCLUDED, never paraphrased.
//
// The test is skipped when the sandbox has no direct Postgres access
// (PGHOST unset) — corpus-pin is a CI/dev-only guard.

import { describe, it, expect } from "vitest";
import { RISK_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/risk-verified-authorities.ts";

/** Empty on entry (audit standing order). */
const KNOWN_PARAPHRASED_KEYS = new Set<string>([]);

function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("RISK verified-authority registry — corpus-pin (allow-list)", () => {
  it("audits every row against cppa_authorities.full_text", async () => {
    const { execFileSync } = await import("node:child_process");
    const citations = [...new Set(Object.values(RISK_VERIFIED_AUTHORITIES).map((r) => r.citation))];
    const sql =
      "SELECT citation || E'\\x1f' || full_text || E'\\x1e' " +
      "FROM cppa_authorities WHERE status='current' AND citation = ANY(string_to_array($$" +
      citations.join("|") + "$$, '|'))";
    const out = execFileSync("psql", ["-tAX", "-c", sql], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    const corpus: Record<string, string> = {};
    for (const rec of out.split("\x1e")) {
      const [cit, body] = rec.split("\x1f");
      if (cit && body) corpus[cit.trim()] = norm(body);
    }

    const shouldPassButFailed: string[] = [];
    const listedButPassed: string[] = [];

    for (const [key, row] of Object.entries(RISK_VERIFIED_AUTHORITIES)) {
      const body = corpus[row.citation] ?? "";
      const q = norm(row.verbatim_quote);
      const passes = body.length > 0 && body.includes(q);

      if (!passes && !KNOWN_PARAPHRASED_KEYS.has(key)) {
        shouldPassButFailed.push(`${key} (${row.citation})`);
      }
      if (passes && KNOWN_PARAPHRASED_KEYS.has(key)) {
        listedButPassed.push(key);
      }
    }

    expect(
      shouldPassButFailed,
      `Rows failed corpus-pin — fix the quote (paraphrasing is prohibited):\n  ${shouldPassButFailed.join("\n  ")}`,
    ).toEqual([]);

    expect(
      listedButPassed,
      `These keys now PASS corpus-pin — remove them from KNOWN_PARAPHRASED_KEYS:\n  ${listedButPassed.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
