// QB-P20 — biometric adversarial extension. W3-T3 update: the "Other US state"
// jurisdiction now branches on the `other_state_names` intake field:
//   - When absent → compact structured-unresolved section (top-5 candidates,
//     no full-catalogue enumeration).
//   - When present → narrow named-state analysis scoped to those states only.
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
      // other_state_names intentionally omitted — exercises unresolved path.
    },
    assertions: [
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT default to BIPA when jurisdiction is Other US state" },
      { kind: "must_include", pattern: "other_state_names", flags: "i",
        label: "references the other_state_names intake field to resolve" },
      { kind: "must_include", pattern: "top_candidate_statutes|candidate statutes", flags: "i",
        label: "emits compact top-candidate list rather than full catalogue" },
      { kind: "must_include", pattern: "State Not Named|Structured Unresolved|UNRESOLVED", flags: "i",
        label: "labels the section as unresolved rather than a general posture" },
    ],
  },
  {
    id: "bio-named-state-colorado",
    tool: "biometric-checker",
    set: "adversarial",
    intake: {
      orgName: "Front Range Employer Co.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Other US state"],
      other_state_names: "Colorado",
    },
    assertions: [
      { kind: "must_include", pattern: "Colorado", flags: "i",
        label: "names the identified state (Colorado)" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1301", flags: "i",
        label: "cites the Colorado CPA umbrella C.R.S. § 6-1-1301 et seq." },
      { kind: "must_include", pattern: "6-1-1303\\(24\\)", flags: "i",
        label: "cites the CPA sensitive-data classification C.R.S. § 6-1-1303(24)" },
      { kind: "must_include", pattern: "6-1-1308\\(7\\)", flags: "i",
        label: "cites the CPA sensitive-data opt-in requirement C.R.S. § 6-1-1308(7)" },
      { kind: "must_not_include", pattern: "the named state", flags: "i",
        label: "does NOT emit the 'the named state' placeholder scaffolding" },
      { kind: "must_not_include", pattern: "Named-State Path", flags: "i",
        label: "does NOT emit the generic 'Named-State Path' template header" },
      { kind: "must_not_include", pattern: "CUBI|§\\s*503\\.001|Tex\\.\\s*Bus", flags: "i",
        label: "does NOT drag Texas CUBI into a Colorado-only analysis" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA into a Colorado-only analysis" },
      { kind: "must_not_include", pattern: "Virginia|Utah|Oregon|Connecticut|Indiana|Kentucky|Maryland", flags: "i",
        label: "does NOT enumerate statutes for states that were not named" },
    ],
  },
];
