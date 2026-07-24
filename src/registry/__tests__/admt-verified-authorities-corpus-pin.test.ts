// REGISTRY-VERBATIM-AUDIT (2026-07-24) — corpus-pin CI for ADMT registry.
//
// For every row in ADMT_VERIFIED_AUTHORITIES, assert that its `verbatim_quote`
// appears (after light normalization) as a substring of the corpus text stored
// in `public.cppa_authorities.full_text` for the same citation, status='current'.
//
// Because the initial audit found ALL 34 seeded rows to be paraphrases rather
// than verbatim excerpts, this test operates in **allow-list mode**:
//   - KNOWN_PARAPHRASED_KEYS is the frozen set of rows pending correction.
//   - Any row NOT in the set MUST pass corpus-pin (guards regression).
//   - Any row IN the set that starts PASSING MUST be removed (forces
//     the set to shrink to empty as correction turns land).
//
// Standing rule (dispatch): "no registry row lands without corpus verification".
//
// The test is skipped when the sandbox has no direct Postgres access
// (PGHOST unset) — corpus-pin is a CI/dev-only guard.

import { describe, it, expect } from "vitest";
import { ADMT_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/admt-verified-authorities.ts";

/** Rows known to be paraphrased. Shrink as corrections land. */
const KNOWN_PARAPHRASED_KEYS = new Set<string>([
  // Corrected in ADMT-REGISTRY-CORPUS-1 (§ 7001 batch, 2026-07-24):
  //   admt_def, admt_def_profiling, human_involvement,
  //   sig_decision, sig_financial, sig_housing, sig_education,
  //   sig_employment, sig_healthcare,
  //   fsor_advertising_exclusion, fsor_human_involvement_three_part.
  // Corrected in ADMT-REGISTRY-CORPUS-2 (§ 7150/7155/7157 RA batch, 2026-07-24):
  //   ra_trigger_admt, ra_trigger_train, ra_timing_new,
  //   ra_timing_existing, ra_submit.
  // Corrected in ADMT-REGISTRY-CORPUS-3 (§ 7200 batch, 2026-07-24):
  //   scope_apply, scope_deadline.
  // Corrected in ADMT-REGISTRY-CORPUS-4 (§ 7220 notice batch, 2026-07-24):
  //   notice_timing, notice_purpose, notice_optout, notice_access,
  //   notice_antiretal, notice_howworks_inputs, notice_howworks_output,
  //   notice_altprocess.
  // Corrected in ADMT-REGISTRY-CORPUS-5 (§ 7221 opt-out batch, 2026-07-24):
  //   optout_offer, optout_exc_appeal, optout_exc_hire.
  // Corrected in ADMT-REGISTRY-CORPUS-6 (§ 7222 access batch, 2026-07-24):
  //   access_provide, access_logic, access_outcome.
  "ccpa_defs", "ccpa_rulemaking",
]);

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

describe.skipIf(!CAN_RUN)("ADMT verified-authority registry — corpus-pin (allow-list)", () => {
  it("audits every row against cppa_authorities.full_text", async () => {
    // Shell out to `psql` (already in the CI sandbox with PG* env vars set);
    // avoids adding a `pg` dependency solely for one guard test.
    const { execFileSync } = await import("node:child_process");
    const citations = [...new Set(Object.values(ADMT_VERIFIED_AUTHORITIES).map((r) => r.citation))];
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

    for (const [key, row] of Object.entries(ADMT_VERIFIED_AUTHORITIES)) {
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
      `New rows failed corpus-pin — either fix the quote or (temporarily) add the key to KNOWN_PARAPHRASED_KEYS:\n  ${shouldPassButFailed.join("\n  ")}`,
    ).toEqual([]);

    expect(
      listedButPassed,
      `These keys now PASS corpus-pin — remove them from KNOWN_PARAPHRASED_KEYS:\n  ${listedButPassed.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
