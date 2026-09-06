// DOC 191 §3 — the PER-PRODUCT VOCABULARY REGISTRY.
//
// Curators pick from these; the generator rejects anything else (§5 checks 1
// and 2). A product not listed here gets no entry — per doc 190 §6 and docs
// 194/198/200/202/203, Cyber, Registration, DPA, Notices and RoPA are not
// building a Layer-B CAM, so none needs a registered vocabulary and none may
// be generated for.
//
// `factors: null` means "the factor/element vocabulary DOES NOT EXIST YET"
// (Governance, IR Playbook, Biometric — doc 191 §3's own note, and §7.2's
// ruling that whoever curates the first row proposes the vocabulary as part
// of that curation pass, rather than inventing it silently). The generator
// REFUSES to emit for such a product; it does not fall back to "accept
// anything", because accepting anything is exactly how an unratified
// taxonomy gets established by accident.

export interface ProductVocabulary {
  /** Registered `instrument` values (doc 191 §3, column 2). */
  readonly instruments: readonly string[];
  /** Registered factor/element labels, or null where none is ratified yet. */
  readonly factors: readonly string[] | null;
  /** Where the generated file belongs, repo-relative (doc 191 §5: "that
   *  product's own corpus directory — the same location LIA's file lives"). */
  readonly output_path: string;
  /** Prefix for the generated exports, e.g. "LIA" → LIA_PROFILES_VERSION. */
  readonly export_prefix: string;
  /** Human note carried into the generated file header. */
  readonly factor_vocabulary_source: string;
}

export const PRODUCT_REGISTRY: Readonly<Record<string, ProductVocabulary>> = {
  lia: {
    instruments: ["EU GDPR", "UK GDPR", "EU GDPR (pre-2021 UK)"],
    // Supplied by the caller from LIA_FACTOR_VOCABULARY (lia-corpus-map.ts) —
    // see resolveVocabulary(); the literal list is not duplicated here so the
    // map stays the single source of truth.
    factors: null,
    output_path: "supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.generated.ts",
    export_prefix: "LIA",
    factor_vocabulary_source: "LIA_FACTOR_VOCABULARY (lia-corpus-map.ts)",
  },
  "cppa-risk": {
    instruments: ["CCPA/CPRA regulations (11 CCR §§7150–7157)"],
    factors: null,
    output_path: "supabase/functions/_shared/corpus/maps/risk-relevance-profiles.generated.ts",
    export_prefix: "RISK",
    factor_vocabulary_source: "FACTOR_MATRIX_ROWS labels (risk-skeleton-assemble.ts)",
  },
  "cppa-admt": {
    instruments: ["CCPA/CPRA regulations (11 CCR §§7200, 7220–7222)"],
    factors: null,
    output_path: "supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-relevance-profiles.generated.ts",
    export_prefix: "ADMT",
    factor_vocabulary_source: "Appendix B factor labels (admt-v2-assemble.ts)",
  },
  dpia: {
    instruments: ["EU GDPR", "UK GDPR"],
    factors: null,
    output_path: "supabase/functions/_shared/corpus/maps/dpia-relevance-profiles.generated.ts",
    export_prefix: "DPIA",
    factor_vocabulary_source: "DPIA_MATRIX_ROWS labels (dpia-skeleton-assemble.ts)",
  },
  governance: {
    instruments: ["EU GDPR", "UK GDPR", "UK DPA 2018"],
    factors: null, // doc 197's first task — DOES NOT EXIST YET.
    output_path: "supabase/functions/run-governance-assessment/_local/corpus/maps/governance-relevance-profiles.generated.ts",
    export_prefix: "GOVERNANCE",
    factor_vocabulary_source: "NOT YET DEFINED — doc 197 §1",
  },
  "ir-playbook": {
    instruments: ["EU GDPR", "UK GDPR (PECR/UK GDPR)"],
    factors: null, // doc 199 — DOES NOT EXIST YET.
    output_path: "supabase/functions/run-ir-playbook/_local/corpus/maps/ir-relevance-profiles.generated.ts",
    export_prefix: "IR",
    factor_vocabulary_source: "NOT YET DEFINED — doc 199",
  },
  biometric: {
    instruments: [
      "Illinois BIPA",
      "Texas CUBI",
      "Washington RCW 19.375",
      "Washington RCW 19.373 (MHMDA)",
      "Colorado",
      "California",
      "New York",
      "Arkansas",
      "EU GDPR",
      "UK GDPR",
    ],
    factors: null, // doc 201 — DOES NOT EXIST YET.
    output_path: "supabase/functions/run-biometric-check/_local/corpus/maps/biometric-relevance-profiles.generated.ts",
    export_prefix: "BIOMETRIC",
    factor_vocabulary_source: "NOT YET DEFINED — doc 201",
  },
};

/** Products doc 190 ruled OUT of Layer B entirely. Naming one is an error, and
 *  a distinct one from "unknown product" — the difference matters to whoever
 *  reads the failure. */
export const LAYER_B_CLOSED_PRODUCTS: readonly string[] = [
  "cppa-cyber",
  "registration",
  "dpa",
  "notices",
  "ropa",
];

export function registryFor(product: string): ProductVocabulary | undefined {
  return PRODUCT_REGISTRY[product];
}
