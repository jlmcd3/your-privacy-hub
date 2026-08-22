// Schema invariants over every phase-1 CorpusMap: id uniqueness, the
// role==="FC"/render_eligible===false phase-1 lock, logic_disposition
// presence iff logic_bearing, pin-length and non-empty-field sanity.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapInvariants } from "../../../supabase/functions/_shared/corpus/cam-verify.ts";
import type { CorpusMap } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";

Deno.test("mapInvariants: empty map is trivially valid", () => {
  const empty: CorpusMap = {
    product: "cppa-risk",
    map_version: "test-empty",
    snapshot_file: "n/a",
    rows: [],
  };
  assertEquals(mapInvariants(empty), []);
});

Deno.test("RISK_CORPUS_MAP: passes all phase-1 invariants", () => {
  assertEquals(mapInvariants(RISK_CORPUS_MAP), []);
});

Deno.test("RISK_CORPUS_MAP: every row is role FC and render_eligible false", () => {
  for (const row of RISK_CORPUS_MAP.rows) {
    assertEquals(row.role, "FC");
    assertEquals(row.render_eligible, false);
  }
});

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
