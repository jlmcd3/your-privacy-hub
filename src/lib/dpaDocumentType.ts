// Shared helper to detect DPA document type from controller/processor jurisdictions.

export const JURS_EU = [
  "Germany", "France", "Ireland", "Spain", "Italy", "Netherlands",
  "United Kingdom", "Belgium", "Sweden", "Denmark", "Poland", "Norway",
  "Portugal", "Austria", "Finland", "Luxembourg", "Greece", "Switzerland",
];

export const JURS_US = [
  "California", "Texas", "New York", "Connecticut", "Colorado", "Virginia",
  "Florida", "Washington", "Illinois", "Massachusetts", "Oregon", "Indiana",
  "Montana", "Iowa", "Tennessee", "Minnesota", "Utah", "Delaware",
  "United States (federal)",
];

export const JURS_CANADA = [
  "Canada (federal / PIPEDA)", "Quebec (Law 25)", "Ontario (PHIPA)",
  "British Columbia (PIPA)", "Alberta (PIPA)",
];

export const JURS_OTHER = ["Australia", "Singapore", "Japan", "Brazil", "Other"];

const EU_SET = new Set(JURS_EU);
const US_SET = new Set(JURS_US);
const CA_SET = new Set(JURS_CANADA);

export type DpaDocType = "gdpr" | "us-state" | "canada" | "dual-eu-us" | "dual-eu-ca";

export interface DpaDocTypeInfo {
  type: DpaDocType;
  label: string;
  description: string;
}

export function detectDocumentType(ctrlJur: string, procJur: string): DpaDocTypeInfo {
  const ctrlEU = EU_SET.has(ctrlJur);
  const procEU = EU_SET.has(procJur);
  const ctrlUS = US_SET.has(ctrlJur);
  const procUS = US_SET.has(procJur);
  const ctrlCA = CA_SET.has(ctrlJur);
  const procCA = CA_SET.has(procJur);

  if ((ctrlEU || procEU) && (ctrlUS || procUS)) {
    return {
      type: "dual-eu-us",
      label: "Dual-Compliance DPA",
      description: "GDPR Article 28 + US State Processor Agreement — covers both EU and US legal requirements",
    };
  }
  if ((ctrlEU || procEU) && (ctrlCA || procCA)) {
    return {
      type: "dual-eu-ca",
      label: "Dual-Compliance DPA",
      description: "GDPR Article 28 + Canadian PIPEDA/Law 25 — covers both EU and Canadian requirements",
    };
  }
  if (ctrlUS || procUS) {
    return {
      type: "us-state",
      label: "US State Processor Agreement",
      description: "Data processing agreement compliant with CCPA, TDPSA, CTDPA, VCDPA, CPA, and other applicable US state privacy laws",
    };
  }
  if (ctrlCA || procCA) {
    return {
      type: "canada",
      label: "Canadian Data Processing Agreement",
      description: "Processor agreement compliant with PIPEDA, Quebec Law 25, and applicable provincial privacy laws",
    };
  }
  return {
    type: "gdpr",
    label: "GDPR Article 28 DPA",
    description: "Controller-processor DPA compliant with GDPR Article 28 and UK GDPR",
  };
}
