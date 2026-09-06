// DOC 191 §5 — where the generator gets each product's CAM rows and factor
// vocabulary.
//
// FACTOR VOCABULARY, PER PRODUCT, HONESTLY:
//
//   LIA  — `LIA_FACTOR_VOCABULARY` is a real, exported, ratified constant
//          (doc 58 §1). Used directly.
//
//   Risk / ADMT / DPIA — their vocabularies are NOT exported constants; they
//          live as label literals inside each product's assemble module, and
//          cam-invariants.test.ts checks CamRow.factor_id against them by
//          reading that source at test time. A deployed edge function cannot
//          read repo files, so the generator instead accepts the DISTINCT
//          `factor_id` SET OF THAT PRODUCT'S OWN CorpusMap. That set is a
//          verified SUBSET of the real vocabulary — cam-invariants.test.ts
//          already proves every one of those labels is a real
//          FACTOR_MATRIX_ROWS / Appendix B / DPIA_MATRIX_ROWS label — so the
//          check is strictly TIGHTER than §3 asks for, which is the safe
//          direction. The cost is real and worth naming: a profile that
//          legitimately bears on a factor no CAM row covers yet would be
//          rejected. When that happens the fix is to export the product's
//          vocabulary as a constant, not to loosen this.
//
//   Governance / IR Playbook / Biometric — NO vocabulary exists (doc 191 §3,
//          §7.2). Nothing is derived, nothing is guessed: the generator
//          refuses, and whoever curates the first row proposes the taxonomy
//          as part of that curation pass.
//
// A caller may always override both with an explicit request body, which is
// how a product whose vocabulary has just been ratified gets generated before
// this file is updated.

import type { GeneratorCamRow } from "./generate.ts";
import { LIA_CORPUS_MAP, LIA_FACTOR_VOCABULARY } from "../../run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import { RISK_CORPUS_MAP } from "../../_shared/corpus/maps/risk-corpus-map.ts";
import { DPIA_CORPUS_MAP } from "../../_shared/corpus/maps/dpia-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";
import type { CorpusMap } from "../../_shared/corpus/cam-types.ts";

export interface MapSource {
  readonly camRows: readonly GeneratorCamRow[];
  readonly factors: readonly string[];
  readonly map_version: string;
  readonly factors_derived_from_map: boolean;
}

function rowsOf(map: CorpusMap): GeneratorCamRow[] {
  return map.rows.map((r) => ({
    id: r.id,
    role: r.role,
    source_table: r.source_table,
    source_row_id: r.source_row_id,
  }));
}

function distinctFactors(map: CorpusMap): string[] {
  return [...new Set(map.rows.map((r) => r.factor_id))].sort();
}

export function mapSourceFor(product: string): MapSource | undefined {
  switch (product) {
    case "lia":
      return {
        camRows: rowsOf(LIA_CORPUS_MAP),
        factors: [...LIA_FACTOR_VOCABULARY],
        map_version: LIA_CORPUS_MAP.map_version,
        factors_derived_from_map: false,
      };
    case "cppa-risk":
      return {
        camRows: rowsOf(RISK_CORPUS_MAP),
        factors: distinctFactors(RISK_CORPUS_MAP),
        map_version: RISK_CORPUS_MAP.map_version,
        factors_derived_from_map: true,
      };
    case "dpia":
      return {
        camRows: rowsOf(DPIA_CORPUS_MAP),
        factors: distinctFactors(DPIA_CORPUS_MAP),
        map_version: DPIA_CORPUS_MAP.map_version,
        factors_derived_from_map: true,
      };
    case "cppa-admt":
      return {
        camRows: rowsOf(ADMT_CORPUS_MAP),
        factors: distinctFactors(ADMT_CORPUS_MAP),
        map_version: ADMT_CORPUS_MAP.map_version,
        factors_derived_from_map: true,
      };
    default:
      return undefined;
  }
}
