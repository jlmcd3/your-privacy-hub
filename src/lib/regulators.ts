import globalAuthorities from "@/data/global_privacy_authorities.json";

export interface RegulatorRecord {
  name: string;
  abbreviation: string;
  country: string;
  region: string;
  website: string;
  complaint_portal?: string;
  legislation?: string;
  legislation_abbreviation?: string;
  monitoring_tier?: number;
}

/**
 * Canonical slug-builder for regulators. Mirrors the algorithm originally
 * inlined in RegulatorPage so links elsewhere in the app never drift.
 */
export function regulatorSlug(source: string): string {
  return source
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function build(): Record<string, RegulatorRecord> {
  const regulators: Record<string, RegulatorRecord> = {};

  (globalAuthorities as any[]).forEach((region: any) => {
    region.entries.forEach((entry: any) => {
      const slug = regulatorSlug(entry.authority_abbreviation || entry.authority_name);
      regulators[slug] = {
        name: entry.authority_name,
        abbreviation: entry.authority_abbreviation || "",
        country: entry.country,
        region: region.region,
        website: entry.website,
        complaint_portal: entry.complaint_portal,
        legislation: entry.primary_legislation,
        legislation_abbreviation: entry.legislation_abbreviation,
        monitoring_tier: entry.monitoring_tier,
      };
    });
  });

  // FTC (not in global JSON, added manually)
  regulators["ftc"] = {
    name: "Federal Trade Commission",
    abbreviation: "FTC",
    country: "United States",
    region: "Americas",
    website: "https://www.ftc.gov",
    complaint_portal: "https://reportfraud.ftc.gov",
    legislation: "FTC Act Section 5, COPPA, various sector-specific statutes",
    monitoring_tier: 1,
  };

  return regulators;
}

export const REGULATORS: Record<string, RegulatorRecord> = build();

export function getRegulator(slug: string): RegulatorRecord | null {
  return REGULATORS[slug] ?? null;
}
