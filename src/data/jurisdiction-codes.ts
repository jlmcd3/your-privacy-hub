export const JC = {
  EU_GDPR: "EU_GDPR",
  UK_GDPR: "UK_GDPR",
  CH_FADP: "CH_FADP",
  US_CCPA: "US_CCPA",
  US_VA: "US_VA",
  US_CO: "US_CO",
  US_TX: "US_TX",
  US_CT: "US_CT",
  US_FL: "US_FL",
  BR_LGPD: "BR_LGPD",
  CA_PIPEDA: "CA_PIPEDA",
  CN_PIPL: "CN_PIPL",
  JP_APPI: "JP_APPI",
  KR_PIPA: "KR_PIPA",
  AU_PRIVACY: "AU_PRIVACY",
  IN_DPDPA: "IN_DPDPA",
  ZA_POPIA: "ZA_POPIA",
} as const;

export type JurisdictionCode = (typeof JC)[keyof typeof JC];

export const UNIVERSAL_ACTIVITY_KEY = "__universal__";

export const EU_OR_UK = [JC.EU_GDPR, JC.UK_GDPR, JC.CH_FADP];
