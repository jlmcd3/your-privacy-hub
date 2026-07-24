// BIO-REG-W1 T2(b) — biometric goldens refreshed for registry-gated composition.
//
// Every case below either:
//   (i) selects a Wave-1 registered jurisdiction (IL BIPA, TX CUBI,
//       WA HB1493, CO HB24-1130) and asserts that the emitted citations
//       come from the registry's exact statute_short + pinpoint pairs, or
//   (ii) selects an out-of-registry state and asserts the structured-
//       unresolved shape (no fabricated statute cites; state named; the
//       intake field that would resolve it referenced).
//
// Output schema is unchanged; these fixtures verify the composition gate,
// not a new schema. Intakes use the EXACT contract JURS labels from
// _shared/intake-contracts/biometric-checker.ts so validateIntake passes
// under golden-contract.test.ts and qbp20.test.ts.
import type { GoldenCase } from "./types.ts";

export const BIOMETRIC_GOLDEN_EXTRA: GoldenCase[] = [
  // ── Wave-1 registered: Illinois BIPA ───────────────────────────────
  {
    id: "bio-reg-w1-il-bipa-fingerprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Prairie Warehousing Co.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Illinois, USA (BIPA)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves to BIPA, not generic fallback" },
      { kind: "must_include", pattern: "740 ILCS 14/15\\(b\\)", label: "cites registry pinpoint 740 ILCS 14/15(b)" },
      { kind: "must_include", pattern: "BIPA", label: "uses registry statute_short 'BIPA'" },
      { kind: "must_not_include", pattern: "Tex\\.\\s*Bus\\.|CUBI|503\\.001", flags: "i",
        label: "does NOT leak Texas CUBI into IL-only analysis" },
      { kind: "must_not_include", pattern: "RCW\\s*19\\.375", flags: "i",
        label: "does NOT leak Washington HB1493 into IL-only analysis" },
      { kind: "must_not_include", pattern: "C\\.R\\.S\\.|HB24-1130", flags: "i",
        label: "does NOT leak Colorado HB24-1130 into IL-only analysis" },
    ],
  },

  // ── Wave-1 registered: Texas CUBI ───────────────────────────────────
  {
    id: "bio-reg-w1-tx-cubi-hand-geometry",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Lone Star Fitness Holdings",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Security / access control provider",
      purpose: "Physical access control",
      jurisdictions: ["Texas, USA (CUBI)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves to CUBI, not generic fallback" },
      { kind: "must_include", pattern: "Tex\\.\\s*Bus\\.\\s*&\\s*Com\\.\\s*Code\\s*§\\s*503\\.001",
        label: "cites registry statute_short 'Tex. Bus. & Com. Code § 503.001'" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA written-release framing into CUBI-only analysis" },
      { kind: "must_not_include", pattern: "private\\s+right\\s+of\\s+action", flags: "i",
        label: "does NOT assert a PRA under CUBI (AG-only enforcement)" },
    ],
  },

  // ── Wave-1 registered: Washington HB1493 (RCW 19.375) ──────────────
  {
    id: "bio-reg-w1-wa-hb1493-voiceprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Cascade Voice Auth Corp.",
      biometricTypes: ["Voiceprint / speaker recognition"],
      orgType: "Consumer app or platform",
      purpose: "Customer authentication",
      jurisdictions: ["Washington state, USA"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves to WA HB1493, not generic fallback" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i",
        label: "cites registry statute_short 'RCW 19.375'" },
      { kind: "must_include", pattern: "commercial\\s+purpose", flags: "i",
        label: "surfaces RCW 19.375 commercial-purpose scoping" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA into WA-only analysis" },
      { kind: "must_not_include", pattern: "CUBI|503\\.001", flags: "i",
        label: "does NOT drag CUBI into WA-only analysis" },
    ],
  },

  // ── Wave-1 registered: Colorado HB24-1130 (retained from W3-T3) ────
  {
    id: "bio-reg-w1-co-hb24-1130-named-state",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Front Range Employer Co.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Other US state"],
      other_state_names: "Colorado",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the named state to Colorado" },
      { kind: "must_include", pattern: "Colorado", flags: "i", label: "names Colorado" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303\\(5\\)", flags: "i",
        label: "cites registry pinpoint C.R.S. § 6-1-1303(5) (biometric identifier)" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303\\(24\\)\\(b\\)", flags: "i",
        label: "cites registry pinpoint C.R.S. § 6-1-1303(24)(b) (sensitive data classification)" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1308\\(7\\)", flags: "i",
        label: "cites registry pinpoint C.R.S. § 6-1-1308(7) (sensitive-data opt-in)" },
      { kind: "must_not_include", pattern: "the named state", flags: "i",
        label: "does NOT emit generic 'the named state' placeholder scaffolding" },
      { kind: "must_not_include", pattern: "CUBI|§\\s*503\\.001|Tex\\.\\s*Bus", flags: "i",
        label: "does NOT drag Texas CUBI into a Colorado-only analysis" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA into a Colorado-only analysis" },
    ],
  },

  // ── Out-of-registry: Other US state with NO names supplied ─────────
  {
    id: "bio-reg-w1-unresolved-other-us-state",
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
        label: "does NOT default to BIPA when jurisdiction is unnamed Other US state" },
      { kind: "must_not_include", pattern: "CUBI|503\\.001|Tex\\.\\s*Bus", flags: "i",
        label: "does NOT default to CUBI when jurisdiction is unnamed" },
      { kind: "must_not_include", pattern: "RCW\\s*19\\.375", flags: "i",
        label: "does NOT default to WA HB1493 when jurisdiction is unnamed" },
      { kind: "must_not_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303", flags: "i",
        label: "does NOT default to Colorado HB24-1130 when jurisdiction is unnamed" },
      { kind: "must_include", pattern: "other_state_names", flags: "i",
        label: "references the other_state_names intake field to resolve" },
      { kind: "must_include", pattern: "State Not Named|Structured Unresolved|UNRESOLVED", flags: "i",
        label: "labels the section as structured-unresolved" },
    ],
  },

  // ── Out-of-registry: named state OUTSIDE Wave-1 (Ohio) ─────────────
  {
    id: "bio-reg-w1-unregistered-named-state-ohio",
    tool: "biometric-checker",
    set: "adversarial",
    intake: {
      orgName: "Buckeye Manufacturing LLC",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Other US state"],
      other_state_names: "Ohio",
    },
    assertions: [
      { kind: "must_include", pattern: "Ohio", flags: "i",
        label: "names the specific state (Ohio)" },
      { kind: "must_include", pattern: "Structured Unresolved|UNRESOLVED|not.*(?:in|within).*(?:Wave-1|registry)",
        flags: "i", label: "emits structured-unresolved shape for out-of-registry state" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT fabricate BIPA citations for Ohio" },
      { kind: "must_not_include", pattern: "CUBI|Tex\\.\\s*Bus\\.\\s*&\\s*Com\\.\\s*Code\\s*§\\s*503\\.001", flags: "i",
        label: "does NOT fabricate CUBI citations for Ohio" },
      { kind: "must_not_include", pattern: "RCW\\s*19\\.375", flags: "i",
        label: "does NOT fabricate WA HB1493 citations for Ohio" },
      { kind: "must_not_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303", flags: "i",
        label: "does NOT fabricate Colorado CPA citations for Ohio" },
    ],

  // ── Wave-2 (S2) registered: California CCPA/CPRA ────────────────────
  {
    id: "bio-reg-w2-ca-cpra-facial-authentication",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Golden Gate Auth Inc.",
      biometricTypes: ["Facial geometry / facial recognition"],
      orgType: "Consumer app or platform",
      purpose: "Customer authentication",
      jurisdictions: ["Other US state"],
      other_state_names: "California",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the named state to California" },
      { kind: "must_include", pattern: "California", flags: "i", label: "names California" },
      { kind: "must_include", pattern: "Cal\\.\\s*Civ\\.\\s*Code\\s*§\\s*1798\\.140\\(l\\)", flags: "i",
        label: "cites registry pinpoint § 1798.140(l) (biometric information)" },
      { kind: "must_include", pattern: "Cal\\.\\s*Civ\\.\\s*Code\\s*§\\s*1798\\.140\\(ae\\)\\(2\\)\\(C\\)", flags: "i",
        label: "cites registry pinpoint § 1798.140(ae)(2)(C) (SPI classification)" },
      { kind: "must_include", pattern: "Cal\\.\\s*Civ\\.\\s*Code\\s*§\\s*1798\\.121", flags: "i",
        label: "cites registry pinpoint § 1798.121 (right to limit SPI)" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA into a California-only analysis" },
      { kind: "must_not_include", pattern: "CUBI|Tex\\.\\s*Bus", flags: "i",
        label: "does NOT drag CUBI into a California-only analysis" },
      { kind: "must_not_include", pattern: "the named state", flags: "i",
        label: "does NOT emit generic 'the named state' placeholder scaffolding" },
    ],
  },

  // ── Wave-2 (S2) catalog: Arkansas (breach-law-only jurisdiction) ────
  {
    id: "bio-reg-w2-ar-pipa-catalog-state",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Ozark Retail Ops LLC",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Other US state"],
      other_state_names: "Arkansas",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the named state to Arkansas" },
      { kind: "must_include", pattern: "Arkansas", flags: "i", label: "names Arkansas" },
      { kind: "must_include", pattern: "Ark\\.\\s*Code\\s*(?:Ann\\.\\s*)?§\\s*4-110-103", flags: "i",
        label: "cites registry pinpoint Ark. Code § 4-110-103 (biometric data in PI)" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT import BIPA duties into an Arkansas catalog-state analysis" },
      { kind: "must_not_include", pattern: "CUBI|§\\s*503\\.001", flags: "i",
        label: "does NOT import CUBI duties into an Arkansas catalog-state analysis" },
      { kind: "must_not_include", pattern: "RCW\\s*19\\.375", flags: "i",
        label: "does NOT import WA HB1493 duties into an Arkansas catalog-state analysis" },
      { kind: "must_not_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303", flags: "i",
        label: "does NOT import Colorado CPA duties into an Arkansas catalog-state analysis" },
    ],
  },
];
