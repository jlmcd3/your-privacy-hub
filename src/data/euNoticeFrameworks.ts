// Single source of truth for the EU & Global Notice Builder framework list.
// The landing page must never hand-type this list — add or remove a framework
// here and both the marketing coverage section and any consumer stay in sync.

export interface NoticeFramework {
  code: string;
  name: string;
  region: string;
}

export const EU_NOTICE_FRAMEWORKS: NoticeFramework[] = [
  { code: "EU_GDPR", name: "EU GDPR", region: "EU/EEA" },
  { code: "UK_GDPR", name: "UK GDPR", region: "United Kingdom" },
  { code: "CH_FADP", name: "Swiss FADP", region: "Switzerland" },
  { code: "BR_LGPD", name: "Brazil LGPD", region: "Americas" },
  { code: "CA_PIPEDA", name: "Canada PIPEDA", region: "Americas" },
  { code: "JP_APPI", name: "Japan APPI", region: "Asia-Pacific" },
  { code: "IN_DPDPA", name: "India DPDPA", region: "Asia-Pacific" },
  { code: "AU_PRIVACY", name: "Australia Privacy Act", region: "Asia-Pacific" },
  { code: "KR_PIPA", name: "South Korea PIPA", region: "Asia-Pacific" },
  { code: "SG_PDPA", name: "Singapore PDPA", region: "Asia-Pacific" },
  { code: "ZA_POPIA", name: "South Africa POPIA", region: "Africa" },
  { code: "AE_PDPL", name: "UAE PDPL", region: "Middle East" },
];

export const EU_NOTICE_FRAMEWORK_COUNT = EU_NOTICE_FRAMEWORKS.length;

/** Frameworks grouped by region, in the order regions first appear. */
export function frameworksByRegion(): Array<{ region: string; frameworks: NoticeFramework[] }> {
  const groups: Array<{ region: string; frameworks: NoticeFramework[] }> = [];
  for (const f of EU_NOTICE_FRAMEWORKS) {
    const existing = groups.find((g) => g.region === f.region);
    if (existing) existing.frameworks.push(f);
    else groups.push({ region: f.region, frameworks: [f] });
  }
  return groups;
}

export default EU_NOTICE_FRAMEWORKS;
