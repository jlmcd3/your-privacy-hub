// QB-P20 — biometric adversarial extension. The existing BIOMETRIC_GOLDEN
// (see ./biometric.ts) predates the current biometricCheckerContract enum
// labels; the pin path in run-quality-batch validates against that contract
// and would reject those pre-existing fixtures. This file adds a single
// contract-conformant adversarial fixture using the "Other US state"
// jurisdiction label, which is documented in the courier as the biometric
// adversarial case.
import type { GoldenCase } from "./types.ts";

export const BIOMETRIC_GOLDEN_EXTRA: GoldenCase[] = [
  {
    id: "bio-other-us-state-adversarial",
    tool: "biometric-checker",
    set: "adversarial",
    intake: {
      orgName: "Rocky Mountain Retail",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Other US state"],
    },
    assertions: [
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT default to BIPA when jurisdiction is Other US state" },
      { kind: "must_include", pattern: "state|jurisdiction", flags: "i",
        label: "acknowledges state-law variability" },
    ],
  },
];
