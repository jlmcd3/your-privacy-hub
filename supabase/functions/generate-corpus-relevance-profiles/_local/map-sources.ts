import type { GeneratorCamRow } from "./generate.ts";

export interface MapSource {
  readonly camRows: readonly GeneratorCamRow[];
  readonly factors: readonly string[];
  readonly map_version: string;
  readonly factors_derived_from_map: boolean;
}

// Deploy-safe by design: wired maps live in map-sources.local.ts for local
// tests. Callers of the deployed generator must provide factors/cam_rows.
export function mapSourceFor(_product: string): MapSource | undefined {
  return undefined;
}
