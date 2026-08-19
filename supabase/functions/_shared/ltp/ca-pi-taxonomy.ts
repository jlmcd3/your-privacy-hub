// ── Canonical California PI / SPI taxonomy (Cal. Civ. Code § 1798.140(v), (ae)) ──
//
// RK3-D (doc 33 D-L9, closing RK3-C ledger L18) — SINGLE-CUSTODY module.
// Field-map §2b: q4_pi_categories is activity-scoped and maps internally to
// the canonical statutory taxonomy. Keys byte-match the contract's
// PI_CATEGORIES. The risk skeleton assembler and the risk factor engine both
// import from here; neither carries its own copy. Changing any row is a
// ratification event.

export interface TaxonomyRow {
  readonly canonical: string;
  readonly spi: boolean;
}

export const CA_PI_TAXONOMY: Record<string, TaxonomyRow> = {
  "Contact identifiers (name, email, phone)": {
    canonical: "Identifiers (name, email address, telephone number)",
    spi: false,
  },
  "Device identifiers (IP, cookies, device IDs)": {
    canonical: "Unique identifiers (IP address, cookies, device identifiers)",
    spi: false,
  },
  "Internet or network activity": {
    canonical: "Internet or other electronic network activity information",
    spi: false,
  },
  "Precise geolocation (GPS-level / specific address)": {
    canonical: "Precise geolocation",
    spi: true,
  },
  "General location (city, region, ZIP, IP-derived)": {
    canonical: "Geolocation data (non-precise)",
    spi: false,
  },
  "Financial information": {
    canonical: "Commercial and financial information",
    spi: false,
  },
  "Health or medical information": {
    canonical: "Health information",
    spi: true,
  },
  "Biometric information": {
    canonical: "Biometric information",
    spi: true,
  },
  "Genetic data": {
    canonical: "Genetic data",
    spi: true,
  },
  "Racial or ethnic origin": {
    canonical: "Racial or ethnic origin",
    spi: true,
  },
  "Religious or philosophical beliefs": {
    canonical: "Religious or philosophical beliefs",
    spi: true,
  },
  "Union membership": {
    canonical: "Union membership",
    spi: true,
  },
  "Sexual orientation or gender identity": {
    canonical: "Sex life or sexual orientation",
    spi: true,
  },
  "Citizenship or immigration status": {
    canonical: "Citizenship or immigration status",
    spi: true,
  },
  "Employment information": {
    canonical: "Professional or employment-related information",
    spi: false,
  },
  "Education information": {
    canonical: "Education information",
    spi: false,
  },
  "Children's data (under 16)": {
    canonical: "Personal information of consumers under 16",
    spi: false,
  },
  "Other": {
    canonical: "Other personal information described in the assessment record",
    spi: false,
  },
};

/** The q4 option strings whose canonical category is sensitive PI. */
export const CA_SPI_CATEGORY_KEYS: readonly string[] = Object.entries(CA_PI_TAXONOMY)
  .filter(([, row]) => row.spi)
  .map(([key]) => key);
