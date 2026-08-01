// FF-DPA nd6 / Task 9 — extracted derivation module.
// Source of truth for docType derivation; imported by generate-dpa and tests.
// Behaviour is IDENTICAL to the prior in-file logic in generate-dpa/index.ts;
// this file only relocates it so the derivation matrix is unit-testable
// without loading the full edge-function module.

export function frameworkFor(docType: string): string {
  switch (docType) {
    case "us-state": return "US state privacy law (CCPA/CPRA and applicable state acts)";
    case "canada": return "PIPEDA";
    case "dual-eu-us": return "Dual EU/US";
    case "dual-eu-ca": return "Dual EU/Canada";
    case "uk": return "UK GDPR and the Data Protection Act 2018";
    case "gdpr":
    default: return "GDPR";
  }
}

export const EU_JURS = new Set(["Germany","France","Ireland","Spain","Italy","Netherlands",
  "Belgium","Sweden","Denmark","Poland","Norway","Portugal",
  "Austria","Finland","Luxembourg","Greece","Switzerland"]);
export const UK_JURS = new Set(["United Kingdom"]);
export const US_JURS = new Set(["California","Texas","New York","Connecticut","Colorado",
  "Virginia","Florida","Washington","Illinois","Massachusetts","Oregon","Indiana",
  "Montana","Iowa","Tennessee","Minnesota","Utah","Delaware","United States (federal)"]);
export const CA_JURS = new Set(["Canada (federal / PIPEDA)","Quebec (Law 25)","Ontario (PHIPA)",
  "British Columbia (PIPA)","Alberta (PIPA)"]);

export const VALID_DOC_TYPES = new Set(["gdpr","us-state","canada","dual-eu-us","dual-eu-ca","uk"]);

export const JURISDICTION_ALIASES: Record<string, string> = {
  "united states": "United States (federal)",
  "united states of america": "United States (federal)",
  "usa": "United States (federal)", "u.s.a.": "United States (federal)",
  "u.s.": "United States (federal)", "us": "United States (federal)",
  "united kingdom": "United Kingdom", "uk": "United Kingdom",
  "great britain": "United Kingdom", "gb": "United Kingdom",
  "england": "United Kingdom", "england and wales": "United Kingdom",
  "ny": "New York", "new york, ny": "New York", "new york, usa": "New York",
  "new york state": "New York",
  "ca": "California", "california, usa": "California",
  "tx": "Texas", "ct": "Connecticut", "co": "Colorado", "va": "Virginia",
  "fl": "Florida", "wa": "Washington", "il": "Illinois", "ma": "Massachusetts",
  "or": "Oregon", "in": "Indiana", "mt": "Montana", "ia": "Iowa",
  "tn": "Tennessee", "mn": "Minnesota", "ut": "Utah", "de": "Delaware",
  "canada": "Canada (federal / PIPEDA)",
  "canada (federal)": "Canada (federal / PIPEDA)",
  "pipeda": "Canada (federal / PIPEDA)",
  "quebec": "Quebec (Law 25)", "québec": "Quebec (Law 25)",
  "quebec, canada": "Quebec (Law 25)", "quebec (law 25 / bill 64)": "Quebec (Law 25)",
  "ontario": "Ontario (PHIPA)", "ontario, canada": "Ontario (PHIPA)",
  "british columbia": "British Columbia (PIPA)", "bc": "British Columbia (PIPA)",
  "british columbia, canada": "British Columbia (PIPA)",
  "alberta": "Alberta (PIPA)", "alberta, canada": "Alberta (PIPA)",
  "france": "France", "germany": "Germany", "deutschland": "Germany",
  "ireland": "Ireland", "republic of ireland": "Ireland",
  "spain": "Spain", "italy": "Italy", "netherlands": "Netherlands",
  "the netherlands": "Netherlands", "holland": "Netherlands",
  "belgium": "Belgium", "sweden": "Sweden", "denmark": "Denmark",
  "poland": "Poland", "norway": "Norway", "portugal": "Portugal",
  "austria": "Austria", "finland": "Finland", "luxembourg": "Luxembourg",
  "greece": "Greece", "switzerland": "Switzerland",
};

export function normalizeJurisdiction(raw: string): { canonical: string; mapped: boolean } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { canonical: "", mapped: false };
  if (EU_JURS.has(trimmed) || UK_JURS.has(trimmed) || US_JURS.has(trimmed) || CA_JURS.has(trimmed)) {
    return { canonical: trimmed, mapped: true };
  }
  const lower = trimmed.toLowerCase();
  for (const s of [...EU_JURS, ...UK_JURS, ...US_JURS, ...CA_JURS]) {
    if (s.toLowerCase() === lower) return { canonical: s, mapped: true };
  }
  const aliased = JURISDICTION_ALIASES[lower];
  if (aliased) return { canonical: aliased, mapped: true };
  return { canonical: trimmed, mapped: false };
}

export function detectDocType(
  ctrl: string,
  proc: string,
  explicit?: unknown,
): { docType: string; ctrlCanonical: string; procCanonical: string; ctrlMapped: boolean; procMapped: boolean; explicitAccepted: boolean; explicitRawType: string } {
  const explicitRawType = explicit === null || explicit === undefined ? "undefined" : (Array.isArray(explicit) ? "array" : typeof explicit);
  const explicitAccepted = typeof explicit === "string" && VALID_DOC_TYPES.has(explicit);
  const c = normalizeJurisdiction(ctrl);
  const p = normalizeJurisdiction(proc);
  if (explicitAccepted) {
    return { docType: explicit as string, ctrlCanonical: c.canonical, procCanonical: p.canonical, ctrlMapped: c.mapped, procMapped: p.mapped, explicitAccepted, explicitRawType };
  }
  const ctrlEU = EU_JURS.has(c.canonical); const procEU = EU_JURS.has(p.canonical);
  const ctrlUK = UK_JURS.has(c.canonical); const procUK = UK_JURS.has(p.canonical);
  const ctrlUS = US_JURS.has(c.canonical); const procUS = US_JURS.has(p.canonical);
  const ctrlCA = CA_JURS.has(c.canonical); const procCA = CA_JURS.has(p.canonical);
  const anyEU = ctrlEU || procEU;
  const anyUK = ctrlUK || procUK;
  const anyUS = ctrlUS || procUS;
  const anyCA = ctrlCA || procCA;
  let docType = "gdpr";
  if (anyEU && anyUK) docType = "gdpr";
  else if (anyEU && anyUS) docType = "dual-eu-us";
  else if (anyEU && anyCA) docType = "dual-eu-ca";
  else if (anyUK) docType = "uk";
  else if (anyUS) docType = "us-state";
  else if (anyCA) docType = "canada";
  else if (anyEU) docType = "gdpr";
  return { docType, ctrlCanonical: c.canonical, procCanonical: p.canonical, ctrlMapped: c.mapped, procMapped: p.mapped, explicitAccepted, explicitRawType };
}
