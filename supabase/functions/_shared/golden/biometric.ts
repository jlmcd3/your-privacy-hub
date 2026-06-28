// Closed-Loop Quality System — G2 (seed pattern)
// Human-authored biometric golden cases. Intakes use the EXACT jurisdiction
// selection labels the biometric-checker resolver recognises — no bare
// state codes — so the tool never falls back to generic output.
//
// Coverage: IL, TX, WA, CA, VA, EU, UK; single- and multi-jurisdiction;
// strong/weak compliance posture. Split ~60/40 tuning/holdout.

import type { GoldenCase } from "./types.ts";

export const BIOMETRIC_GOLDEN: GoldenCase[] = [
  // ---------- TUNING ----------
  {
    id: "bio-il-fingerprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Acme Logistics",
      orgType: "Warehouse",
      biometricTypes: ["fingerprint"],
      purpose: "Workforce time and attendance",
      jurisdictions: ["Illinois, USA (BIPA)"],
      enrolledCount: "500-5000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names BIPA, not generic" },
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited" },
      { kind: "must_include", pattern: "15\\(b\\)", label: "written release / §15(b)" },
      { kind: "must_include", pattern: "\\$1,000|\\$5,000", label: "statutory damages" },
      { kind: "must_include", pattern: "private right of action|PRA", flags: "i", label: "PRA" },
    ],
  },
  {
    id: "bio-il-facial-retail",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Northbrook Retail Co.",
      orgType: "Retail",
      biometricTypes: ["facial geometry"],
      purpose: "Loss prevention",
      jurisdictions: ["Illinois, USA (BIPA)"],
      enrolledCount: "5000-50000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names BIPA, not generic" },
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited" },
      { kind: "must_include", pattern: "written\\s+release", flags: "i", label: "written release" },
      { kind: "must_include", pattern: "retention\\s+schedule|destruction", flags: "i", label: "retention / destruction" },
    ],
  },
  {
    id: "bio-ca-facial-multitenant",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Bayline Properties",
      orgType: "Property Management",
      biometricTypes: ["facial geometry"],
      purpose: "Physical access control",
      jurisdictions: ["California, USA (CCPA)"],
      enrolledCount: "500-5000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names CCPA/CPRA, not generic" },
      { kind: "must_include", pattern: "sensitive personal information|SPI", flags: "i", label: "CCPA SPI" },
      { kind: "must_include", pattern: "Limit\\s+the\\s+Use", flags: "i", label: "Limit the Use of My SPI link" },
    ],
  },
  {
    id: "bio-wa-voiceprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Cascade Telco",
      orgType: "Telecommunications",
      biometricTypes: ["voiceprint"],
      purpose: "Customer authentication",
      jurisdictions: ["Washington, USA"],
      enrolledCount: "50000-500000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names WA biometric statute, not generic" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i", label: "WA RCW 19.375 cited" },
      { kind: "must_include", pattern: "commercial\\s+purpose", flags: "i", label: "commercial-purpose scoping" },
    ],
  },
  {
    id: "bio-va-fingerprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Tidewater Health Clinic",
      orgType: "Healthcare",
      biometricTypes: ["fingerprint"],
      purpose: "Patient check-in",
      jurisdictions: ["Virginia, USA"],
      enrolledCount: "Fewer than 500",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "VCDPA addressed" },
      { kind: "must_include", pattern: "VCDPA|Virginia Consumer Data Protection Act", flags: "i", label: "VCDPA named" },
      { kind: "must_include", pattern: "sensitive\\s+data|consent", flags: "i", label: "sensitive data / consent" },
    ],
  },
  {
    id: "bio-uk-facial-event",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Albion Events Ltd",
      orgType: "Events & Hospitality",
      biometricTypes: ["facial geometry"],
      purpose: "Ticketless venue entry",
      jurisdictions: ["United Kingdom (UK GDPR)"],
      enrolledCount: "5000-50000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "UK GDPR named" },
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "Art 9 special category" },
      { kind: "must_include", pattern: "DPIA|data protection impact assessment", flags: "i", label: "DPIA required" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no US BIPA in UK section" },
    ],
  },
  {
    id: "bio-multi-eu-uk-facial",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Lufthavn Group",
      orgType: "Aviation",
      biometricTypes: ["facial geometry"],
      purpose: "Border / boarding identity verification",
      jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
      enrolledCount: "More than 500,000",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "GDPR Art 9 referenced" },
      { kind: "must_include", pattern: "UK GDPR", flags: "i", label: "UK GDPR distinguished" },
      { kind: "must_not_include", pattern: "do\\s+not\\s+sell", flags: "i", label: "no US 'sale' framing in EU/UK section" },
    ],
  },

  // ---------- HOLDOUT ----------
  {
    id: "bio-tx-handgeometry",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Lone Star Gym Holdings",
      orgType: "Fitness",
      biometricTypes: ["hand geometry"],
      purpose: "Member access control",
      jurisdictions: ["Texas, USA (CUBI)"],
      enrolledCount: "5000-50000",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "CUBI named, not generic" },
      { kind: "must_cite", citation: "503.001", label: "CUBI § 503.001 cited" },
      { kind: "must_not_include", pattern: "signed\\s+written\\s+release.*statutory\\s+requirement", flags: "i",
        label: "must NOT import BIPA written-release into CUBI" },
      { kind: "must_not_include", pattern: "private\\s+right\\s+of\\s+action", flags: "i",
        label: "no PRA under CUBI" },
    ],
  },
  {
    id: "bio-tx-ca-fingerprint",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Pacific & Plains Retail",
      orgType: "Retail",
      biometricTypes: ["fingerprint"],
      purpose: "Employee POS authentication",
      jurisdictions: ["Texas, USA (CUBI)", "California, USA (CCPA)"],
      enrolledCount: "500-5000",
    },
    assertions: [
      { kind: "must_cite", citation: "503.001", label: "CUBI cited for TX" },
      { kind: "must_include", pattern: "sensitive personal information|SPI", flags: "i", label: "CCPA SPI for CA" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no BIPA when IL not selected" },
    ],
  },
  {
    id: "bio-eu-facial",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Helvetia Bank EU",
      orgType: "Financial Institution",
      biometricTypes: ["facial geometry"],
      purpose: "KYC remote onboarding",
      jurisdictions: ["EU (GDPR)"],
      enrolledCount: "50000-500000",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "GDPR Art 9 special category" },
      { kind: "must_include", pattern: "DPIA", flags: "i", label: "DPIA obligation" },
      { kind: "must_not_include", pattern: "do\\s+not\\s+sell", flags: "i", label: "no US 'sale' framing in EU section" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no US BIPA in EU section" },
    ],
  },
  {
    id: "bio-il-wa-iris",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Midwest-Northwest Logistics",
      orgType: "Logistics",
      biometricTypes: ["iris scan"],
      purpose: "Secure facility access",
      jurisdictions: ["Illinois, USA (BIPA)", "Washington, USA"],
      enrolledCount: "500-5000",
    },
    assertions: [
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited for IL" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i", label: "WA RCW 19.375 cited" },
      { kind: "must_include", pattern: "private right of action|PRA", flags: "i", label: "PRA in IL section" },
    ],
  },
  {
    id: "bio-ca-employee-weak",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "SunValley Manufacturing",
      orgType: "Manufacturing",
      biometricTypes: ["fingerprint", "facial geometry"],
      purpose: "Employee time tracking",
      jurisdictions: ["California, USA (CCPA)"],
      enrolledCount: "500-5000",
      // weak posture: no written policy, undefined retention
    },
    assertions: [
      { kind: "must_include", pattern: "retention", flags: "i", label: "retention gap flagged" },
      { kind: "must_include", pattern: "notice|written\\s+policy", flags: "i", label: "policy / notice gap flagged" },
      { kind: "must_include", pattern: "Limit\\s+the\\s+Use", flags: "i", label: "Limit the Use of My SPI link" },
    ],
  },
];
