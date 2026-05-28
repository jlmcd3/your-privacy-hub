// Maps short regulator keys (used in Track 3 orchestrator request bodies)
// to (a) the canonical regulator_profiles.canonical_name used for profile lookup
// and (b) the predicate matching every legacy enforcement_actions row produced
// by that regulator — including rows where regulator_canonical is NULL but the
// free-text `regulator` field clearly identifies the authority.
//
// Each alias resolves to a SQL fragment using parameterised values via the
// returned `regulatorFilter` PostgREST `.or()` string.
//
// Tier 1 only for now. Add Tier 2 (Garante, UODO, CNIL, HDPA, OAIC) when Phase 3
// is authorised.

export type RegulatorAliasKey = "aepd" | "anspdcp" | "naih" | "uoou" | "ftc";

export interface RegulatorAlias {
  canonical: string; // matches regulator_profiles.canonical_name
  // List of values to match against enforcement_actions.regulator (text) OR
  // enforcement_actions.regulator_canonical. We OR these together.
  regulatorMatches: string[];
  // Domain allowlist used to validate discovered primary-source URLs.
  allowedHosts: string[];
}

export const TRACK3_REGULATORS: Record<RegulatorAliasKey, RegulatorAlias> = {
  aepd: {
    canonical: "Agencia Española de Protección de Datos (AEPD)",
    regulatorMatches: [
      "Agencia Española de Protección de Datos (AEPD)",
      "Spanish Data Protection Authority (aepd)",
      "AEPD",
    ],
    allowedHosts: ["aepd.es", "www.aepd.es"],
  },
  anspdcp: {
    canonical:
      "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)",
    regulatorMatches: [
      "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)",
      "Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP)",
      "ANSPDCP",
    ],
    allowedHosts: ["dataprotection.ro", "www.dataprotection.ro"],
  },
  naih: {
    canonical:
      "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
    regulatorMatches: [
      "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
      "NAIH",
      "Hungarian National Authority for Data Protection (NAIH)",
      "Hungarian National Authority for Data Protection and the Freedom of Information (NAIH)",
    ],
    allowedHosts: ["naih.hu", "www.naih.hu"],

    allowedHosts: ["naih.hu", "www.naih.hu"],
  },
  uoou: {
    canonical: "Úřad pro ochranu osobních údajů (ÚOOÚ)",
    regulatorMatches: [
      "Úřad pro ochranu osobních údajů (ÚOOÚ)",
      "ÚOOÚ",
      "Czech Data Protection Authority (UOOU)",
      "Czech Data Protection Auhtority (UOOU)",
    ],
    allowedHosts: ["uoou.cz", "www.uoou.cz", "uoou.gov.cz"],
  },
  ftc: {
    canonical: "Federal Trade Commission (FTC)",
    regulatorMatches: [
      "Federal Trade Commission (FTC)",
      "FTC",
    ],
    allowedHosts: ["ftc.gov", "www.ftc.gov"],
  },
};

export function resolveRegulatorAlias(key: string): RegulatorAlias | null {
  const k = key.toLowerCase().trim() as RegulatorAliasKey;
  return TRACK3_REGULATORS[k] ?? null;
}

/**
 * Returns a PostgREST `.or()` filter string that matches any legacy row whose
 * regulator (text) OR regulator_canonical equals any of the alias values.
 *
 * Example usage with supabase-js:
 *   supabase.from("enforcement_actions")
 *     .select("id")
 *     .eq("legacy_enrichment_version", 1)
 *     .eq("primary_source_status", "pending_discovery")
 *     .or(buildRegulatorOrFilter(alias))
 */
export function buildRegulatorOrFilter(alias: RegulatorAlias): string {
  const parts: string[] = [];
  for (const v of alias.regulatorMatches) {
    // PostgREST requires commas/parens/double-quotes inside .or() values to be
    // wrapped in double quotes when the value itself contains commas or
    // parentheses — which our regulator strings do. Escape any embedded `"`.
    const safe = v.replace(/"/g, '\\"');
    parts.push(`regulator.eq."${safe}"`);
    parts.push(`regulator_canonical.eq."${safe}"`);
  }
  return parts.join(",");
}

export function urlHostAllowed(rawUrl: string, allowedHosts: string[]): boolean {
  try {
    const host = new URL(rawUrl).host.toLowerCase();
    return allowedHosts.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}
