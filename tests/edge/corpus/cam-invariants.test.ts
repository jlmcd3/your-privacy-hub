// Schema invariants over every phase-1 CorpusMap: id uniqueness, the
// role==="FC"/render_eligible===false phase-1 lock, logic_disposition
// presence iff logic_bearing, pin-length and non-empty-field sanity.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapInvariants } from "../../../supabase/functions/_shared/corpus/cam-verify.ts";
import type { CorpusMap } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/admt-corpus-map.ts";

// All phase-1 maps landed so far (grows as landings 2-3 add DPIA).
const MAPS: readonly CorpusMap[] = [RISK_CORPUS_MAP, ADMT_CORPUS_MAP];

Deno.test("mapInvariants: empty map is trivially valid", () => {
  const empty: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-empty",
    snapshot_file: "n/a",
    rows: [],
  };
  assertEquals(mapInvariants(empty), []);
});

for (const map of MAPS) {
  Deno.test(`${map.product}: passes all phase-1 invariants`, () => {
    assertEquals(mapInvariants(map), []);
  });

  Deno.test(`${map.product}: every row is role FC and render_eligible false`, () => {
    for (const row of map.rows) {
      assertEquals(row.role, "FC");
      assertEquals(row.render_eligible, false);
    }
  });
}

Deno.test("RISK_CORPUS_MAP: every factor_id matches a real FACTOR_MATRIX_ROWS label", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/_shared/ltp/risk-skeleton-assemble.ts",
  );
  const knownLabels = new Set<string>();
  for (const m of src.matchAll(/label:\s*"([^"]+)"/g)) knownLabels.add(m[1]);
  for (const row of RISK_CORPUS_MAP.rows) {
    if (!knownLabels.has(row.factor_id)) {
      throw new Error(`${row.id}: factor_id "${row.factor_id}" is not a FACTOR_MATRIX_ROWS label`);
    }
  }
});

Deno.test("ADMT_CORPUS_MAP: every factor_id matches a real Appendix B factor label", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts",
  );
  const knownLabels = new Set<string>();
  // buildFactorMatrixTable's row array literals: ["Label", ...]
  for (const m of src.matchAll(/\[\s*"([^"]+)",/g)) knownLabels.add(m[1]);
  for (const row of ADMT_CORPUS_MAP.rows) {
    assert(
      knownLabels.has(row.factor_id),
      `${row.id}: factor_id "${row.factor_id}" is not an Appendix B factor label`,
    );
  }
});
