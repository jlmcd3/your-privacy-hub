// /all-ptest v2 (DOC 261, 2026-09-14) — GROUNDING PACK TYPES.
//
// A grounding pack is the static, cacheable law and structure a review worker
// is given in its system block (doc 261 §2, Stage 2):
//
//   * REGISTRY PACK — one row per verified-authority registry entry: the
//     proposition key, the pinpoint, and the regulation's VERBATIM text. The
//     W-LAW worker may only cite a row id; the validator checks that the
//     `registry_quote` it returns is a verbatim substring of that row.
//   * BLOCK CATALOGUE — every block key a product's engine can emit, with the
//     factor ids, intake sources and authorities observed for it across the
//     golden panel, plus the fixed skeleton prose the spine carries at that
//     key. Static per product; the per-document COMPOSED LIST (which blocks
//     actually rendered, from `_meta.internal.factor_provenance`) goes in the
//     user turn.
//
// The packs are GENERATED (scripts/ptest/export-packs.ts) from the product
// registries and engines, committed as `.ts` modules under this directory so
// the ptest driver — an edge function that may not import another function's
// `_local` tree — can import them, and guarded against drift by
// tests/edge/ptest/packs.test.ts, which rebuilds them in memory and compares.

export interface RegistryPackRow {
  readonly proposition_key: string;
  readonly citation: string;
  readonly subsection: string;
  /**
   * The regulation text, verbatim. Null for a LOCATOR row (cyber): the text
   * is cut from the approved corpus row at review time, exactly as the
   * product cuts it at generation time (cyber-verified-authorities.ts).
   */
  readonly verbatim_quote: string | null;
  readonly locator?: {
    readonly provision_key: string;
    readonly path: string;
    readonly starts_with: string;
    readonly ends_with: string;
  };
}

export interface RegistryPack {
  readonly product: "cppa-risk" | "cppa-admt" | "cppa-cyber" | "dpia" | "lia" | "governance";
  /** The source registry's own version constant. */
  readonly registry_version: string;
  readonly generated_on: string;
  readonly rows: readonly RegistryPackRow[];
}

export interface BlockCatalogueEntry {
  readonly block_key: string;
  readonly section_id: string;
  readonly section_title: string;
  /** The spine block kind: skeleton (fixed prose) | generated | conditional | lead | table | … */
  readonly kind: string;
  /** For fixed prose: the first 160 characters of the spine text (slots unfilled). */
  readonly fixed_text_prefix: string | null;
  /** Factor ids observed composing into this block across the golden panel. */
  readonly factor_ids: readonly string[];
  /** Union of INTAKE:/FACTOR:/… sources observed for those factors. */
  readonly sources: readonly string[];
  /** Union of authorities those factors cite. */
  readonly authorities: readonly string[];
}

export interface BlockCatalogue {
  readonly product: "cppa-risk" | "cppa-admt" | "cppa-cyber" | "dpia" | "lia" | "governance";
  readonly spine_version: string;
  readonly generated_on: string;
  /** Fixture ids the observed unions were taken over. */
  readonly generated_from: readonly string[];
  readonly entries: readonly BlockCatalogueEntry[];
}

/** The golden panel SEED: the *_PERFECT golden cases, exported so the driver
 *  (which may not import a product's `_local` fixtures) can seed
 *  ptest_golden_intakes from them. */
export interface GoldenPanelPack {
  readonly generated_on: string;
  readonly entries: ReadonlyArray<{
    readonly product: "cppa-risk" | "cppa-admt" | "cppa-cyber" | "dpia" | "lia" | "governance";
    readonly ref: string;
    readonly label: string;
    readonly intake_data: Record<string, unknown>;
  }>;
}
