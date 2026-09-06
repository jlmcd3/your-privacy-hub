// Local-test-only wired corpus maps. This module may import sibling function
// directories because it is never part of the deployed function graph.
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
  return map.rows.map((row) => ({ id: row.id, role: row.role, source_table: row.source_table, source_row_id: row.source_row_id }));
}

function distinctFactors(map: CorpusMap): string[] {
  return [...new Set(map.rows.map((row) => row.factor_id))].sort();
}

export function mapSourceFor(product: string): MapSource | undefined {
  switch (product) {
    case "lia":
      return { camRows: rowsOf(LIA_CORPUS_MAP), factors: [...LIA_FACTOR_VOCABULARY], map_version: LIA_CORPUS_MAP.map_version, factors_derived_from_map: false };
    case "cppa-risk":
      return { camRows: rowsOf(RISK_CORPUS_MAP), factors: distinctFactors(RISK_CORPUS_MAP), map_version: RISK_CORPUS_MAP.map_version, factors_derived_from_map: true };
    case "dpia":
      return { camRows: rowsOf(DPIA_CORPUS_MAP), factors: distinctFactors(DPIA_CORPUS_MAP), map_version: DPIA_CORPUS_MAP.map_version, factors_derived_from_map: true };
    case "cppa-admt":
      return { camRows: rowsOf(ADMT_CORPUS_MAP), factors: distinctFactors(ADMT_CORPUS_MAP), map_version: ADMT_CORPUS_MAP.map_version, factors_derived_from_map: true };
    default:
      return undefined;
  }
}