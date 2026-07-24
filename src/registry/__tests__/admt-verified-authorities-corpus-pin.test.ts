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

/** All 34 rows known to be paraphrased at audit time. Shrink as corrections land. */
const KNOWN_PARAPHRASED_KEYS = new Set<string>([
  "access_logic", "access_outcome", "access_provide",
  "admt_def", "admt_def_profiling",
  "ccpa_defs", "ccpa_rulemaking",
  "fsor_advertising_exclusion", "fsor_human_involvement_three_part",
  "human_involvement",
  "notice_access", "notice_altprocess", "notice_antiretal",
  "notice_howworks_inputs", "notice_howworks_output",
  "notice_optout", "notice_purpose", "notice_timing",
  "optout_exc_appeal", "optout_exc_hire", "optout_offer",
  "ra_submit", "ra_timing_existing", "ra_timing_new",
  "ra_trigger_admt", "ra_trigger_train",
  "scope_apply", "scope_deadline",
  "sig_decision", "sig_education", "sig_employment",
  "sig_financial", "sig_healthcare", "sig_housing",
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
    // Lazy-import pg only when the test actually runs.
    const { Client } = await import("pg");
    const client = new Client({ ssl: { rejectUnauthorized: false } });
    await client.connect();

    const citations = [...new Set(Object.values(ADMT_VERIFIED_AUTHORITIES).map((r) => r.citation))];
    const { rows } = await client.query<{ citation: string; full_text: string }>(
      "SELECT citation, full_text FROM cppa_authorities WHERE status='current' AND citation = ANY($1)",
      [citations],
    );
    await client.end();

    const corpus: Record<string, string> = {};
    for (const r of rows) corpus[r.citation] = norm(r.full_text ?? "");

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
