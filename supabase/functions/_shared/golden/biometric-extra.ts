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
  },

  // ── Wave-2 (S2 → S2b) registered: California CCPA/CPRA selected via
  // the discrete JURS enum entry (no free-text state name required).
  {
    id: "bio-reg-w2-ca-cpra-facial-authentication-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Golden Gate Auth Inc.",
      biometricTypes: ["Facial geometry / facial recognition"],
      orgType: "Consumer app or platform",
      purpose: "Customer authentication",
      // S2b — discrete enum entry, NOT "Other US state" + free-text.
      jurisdictions: ["California, USA (CCPA/CPRA)"],
      other_state_names: "",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete California enum entry" },
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

  // ── S2b-fix — Colorado selected via discrete "Colorado, USA (CPA)" enum ──
  {
    id: "bio-reg-w2-co-cpa-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Front Range Employer Co.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      // S2b — discrete enum entry, NOT "Other US state" + free-text.
      jurisdictions: ["Colorado, USA (CPA)"],
      other_state_names: "",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete Colorado enum entry" },
      { kind: "must_include", pattern: "Colorado", flags: "i", label: "names Colorado" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1308\\(7\\)", flags: "i",
        label: "cites registry pinpoint § 6-1-1308(7) (sensitive-data opt-in consent)" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1313", flags: "i",
        label: "cites registry pinpoint § 6-1-1313 (AG rulemaking authority)" },
      { kind: "must_include", pattern: "4\\s*CCR\\s*904-3", flags: "i",
        label: "cites registry pinpoint 4 CCR 904-3 (Rule 7.09 employee biometric consent)" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT drag BIPA into a Colorado-only analysis" },
      { kind: "must_not_include", pattern: "CUBI|Tex\\.\\s*Bus\\.\\s*&\\s*Com\\.\\s*Code\\s*§\\s*503\\.001", flags: "i",
        label: "does NOT drag Texas CUBI into a Colorado-only analysis" },
      { kind: "must_not_include", pattern: "the named state", flags: "i",
        label: "does NOT emit generic 'the named state' placeholder scaffolding" },
    ],
  },

  // ── S2b-fix — New York selected via discrete "New York, USA (SHIELD)" enum ──
  {
    id: "bio-reg-w2-ny-shield-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Empire State Data Services",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Consumer app or platform",
      purpose: "Customer authentication",
      jurisdictions: ["New York, USA (SHIELD)"],
      other_state_names: "",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete New York enum entry" },
      { kind: "must_include", pattern: "New York", flags: "i", label: "names New York" },
      { kind: "must_include", pattern: "§\\s*899-aa\\(1\\)\\(b\\)\\(i\\)\\(5\\)", flags: "i",
        label: "cites registry pinpoint § 899-aa(1)(b)(i)(5) (biometric as element (5))" },
      { kind: "must_include", pattern: "§\\s*899-bb\\(2\\)", flags: "i",
        label: "cites registry pinpoint § 899-bb(2) (reasonable-safeguards duty)" },
      { kind: "must_not_include", pattern: "§\\s*899-aa\\(1\\)\\(b\\)\\(i\\)\\(4\\)", flags: "i",
        label: "does NOT cite element (4) — biometric is element (5) post-2019 SHIELD amendment" },
      { kind: "must_not_include", pattern: "§\\s*899-aa\\(1\\)\\(b\\)\\(ii\\)", flags: "i",
        label: "does NOT cite subparagraph (ii) — that is the username/e-mail + password branch" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i",
        label: "does NOT import BIPA duties into a SHIELD-only analysis" },
      { kind: "must_not_include", pattern: "CUBI|§\\s*503\\.001", flags: "i",
        label: "does NOT import CUBI duties into a SHIELD-only analysis" },
      { kind: "must_not_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1303", flags: "i",
        label: "does NOT import Colorado CPA substantive duties into a SHIELD-only analysis" },
      { kind: "must_not_include", pattern: "private\\s+right\\s+of\\s+action", flags: "i",
        label: "does NOT frame SHIELD as a private-right-of-action regime" },
      { kind: "must_not_include", pattern: "opt-in\\s+consent|written\\s+release", flags: "i",
        label: "does NOT frame SHIELD as a consent regime (breach-notification + safeguards only)" },
    ],
  },

  // ── S3 — EU / EEA (GDPR) discrete enum ─────────────────────────────
  {
    id: "bio-reg-w3-eu-gdpr-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Amsterdam Access Systems B.V.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Security / access control provider",
      purpose: "Physical access control",
      jurisdictions: ["EU / EEA (GDPR)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete EU/EEA enum entry" },
      { kind: "must_include", pattern: "Article\\s*4\\(14\\)\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 4(14) GDPR (biometric-data definition)" },
      { kind: "must_include", pattern: "Article\\s*9\\(1\\)\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 9(1) GDPR (special-category prohibition)" },
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(a\\)\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 9(2)(a) GDPR (explicit-consent exception)" },
      { kind: "must_include", pattern: "uniquely\\s+identifying", flags: "i",
        label: "surfaces the Art. 9(1) 'uniquely identifying' scoping (not blanket biometric capture)" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS|CUBI|503\\.001", flags: "i",
        label: "does NOT drag US biometric statutes into an EU-only analysis" },
      { kind: "must_not_include", pattern: "UK\\s*GDPR", flags: "i",
        label: "does NOT drag UK GDPR into an EU-only analysis" },
    ],
  },

  // ── S3 — United Kingdom (UK GDPR) discrete enum ────────────────────
  {
    id: "bio-reg-w3-uk-gdpr-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "London Consumer Auth Ltd.",
      biometricTypes: ["Facial geometry / facial recognition"],
      orgType: "Consumer app or platform",
      purpose: "Customer authentication",
      jurisdictions: ["United Kingdom (UK GDPR)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete UK GDPR enum entry" },
      { kind: "must_include", pattern: "Article\\s*4\\(14\\)\\s*UK\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 4(14) UK GDPR (styled as UK GDPR, not EU GDPR)" },
      { kind: "must_include", pattern: "Article\\s*9\\(1\\)\\s*UK\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 9(1) UK GDPR" },
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(a\\)\\s*UK\\s*GDPR", flags: "i",
        label: "cites registry pinpoint Article 9(2)(a) UK GDPR" },
      { kind: "must_not_include", pattern: "Union\\s+or\\s+Member\\s+State\\s+law", flags: "i",
        label: "does NOT quote the EU-specific 'Union or Member State law' phrasing in a UK-only analysis" },
      { kind: "must_not_include", pattern: "BIPA|CUBI|740 ILCS", flags: "i",
        label: "does NOT drag US biometric statutes into a UK-only analysis" },
    ],
  },

  // ── S3 — Canada (PIPEDA) discrete enum ─────────────────────────────
  {
    id: "bio-reg-w3-ca-pipeda-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Toronto Workforce Systems Inc.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Canada (PIPEDA / provincial)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete Canada (PIPEDA) enum entry" },
      { kind: "must_include", pattern: "PIPEDA\\s*s\\.\\s*5\\(3\\)", flags: "i",
        label: "cites registry pinpoint PIPEDA s. 5(3) (appropriate-purposes)" },
      { kind: "must_include", pattern: "PIPEDA,\\s*Sch\\.\\s*1,\\s*cl\\.\\s*4\\.3", flags: "i",
        label: "cites registry pinpoint PIPEDA, Sch. 1, cl. 4.3 (Consent Principle)" },
      { kind: "must_include", pattern: "PIPEDA,\\s*Sch\\.\\s*1,\\s*cl\\.\\s*4\\.7\\.1", flags: "i",
        label: "cites registry pinpoint PIPEDA, Sch. 1, cl. 4.7.1 (Safeguards Principle)" },
      { kind: "must_not_include", pattern: "GDPR|Article\\s*9", flags: "i",
        label: "does NOT import GDPR framing into a PIPEDA-only analysis" },
      { kind: "must_not_include", pattern: "BIPA|CUBI", flags: "i",
        label: "does NOT drag US biometric statutes into a PIPEDA-only analysis" },
    ],
  },

  // ── S3 — Australia (Privacy Act 1988) discrete enum ────────────────
  {
    id: "bio-reg-w3-au-privacy-act-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Sydney Access Co. Pty Ltd.",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Security / access control provider",
      purpose: "Physical access control",
      jurisdictions: ["Australia (Privacy Act)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete Australia enum entry" },
      { kind: "must_include", pattern: "s\\.\\s*6\\(1\\)\\s*Privacy\\s*Act\\s*1988", flags: "i",
        label: "cites registry pinpoint s. 6(1) Privacy Act 1988 (Cth) (biometric templates as sensitive info)" },
      { kind: "must_include", pattern: "APP\\s*3\\.3", flags: "i",
        label: "cites registry pinpoint APP 3.3 (collection of sensitive information)" },
      { kind: "must_include", pattern: "APP\\s*11\\.1", flags: "i",
        label: "cites registry pinpoint APP 11.1 (security of personal information)" },
      { kind: "must_not_include", pattern: "GDPR|Article\\s*9", flags: "i",
        label: "does NOT import GDPR framing into an Australia-only analysis" },
      { kind: "must_not_include", pattern: "BIPA|CUBI|PIPEDA", flags: "i",
        label: "does NOT drag other-regime statutes into an Australia-only analysis" },
    ],
  },

  // ── S3 — Singapore (PDPA) discrete enum ────────────────────────────
  {
    id: "bio-reg-w3-sg-pdpa-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Marina Bay FinAuth Pte. Ltd.",
      biometricTypes: ["Facial geometry / facial recognition"],
      orgType: "Financial institution / fintech",
      purpose: "Customer authentication",
      jurisdictions: ["Singapore (PDPA)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete Singapore (PDPA) enum entry" },
      { kind: "must_include", pattern: "s\\.\\s*13\\s*PDPA", flags: "i",
        label: "cites registry pinpoint s. 13 PDPA (Consent Obligation)" },
      { kind: "must_include", pattern: "s\\.\\s*24\\s*PDPA", flags: "i",
        label: "cites registry pinpoint s. 24 PDPA (Protection Obligation)" },
      { kind: "must_not_include", pattern: "special\\s+category|Article\\s*9\\s*GDPR|sensitive\\s+personal\\s+data\\s+under\\s+the\\s+PDPA", flags: "i",
        label: "does NOT invent a PDPA special-category regime (PDPA has none)" },
      { kind: "must_not_include", pattern: "BIPA|CUBI|PIPEDA|Privacy\\s*Act\\s*1988", flags: "i",
        label: "does NOT drag other-regime statutes into a Singapore-only analysis" },
    ],
  },

  // ── S3 pass-through — Colorado § 6-1-1308(3) data-minimization
  // assertion promised alongside S3 (commended deviation from S2b-fix).
  // Discrete CO enum path, this time asserting minimization (3), not (7).
  {
    id: "bio-reg-w3-co-cpa-1308-3-data-minimization-enum",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Denver Retail Ops LLC",
      biometricTypes: ["Fingerprint / palm print"],
      orgType: "Employer (employee biometrics)",
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Colorado, USA (CPA)"],
      other_state_names: "",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves the discrete Colorado enum entry" },
      { kind: "must_include", pattern: "C\\.R\\.S\\.\\s*§\\s*6-1-1308\\(3\\)", flags: "i",
        label: "cites registry pinpoint § 6-1-1308(3) as the DATA-MINIMIZATION duty (not consent)" },
      { kind: "must_not_include", pattern: "§\\s*6-1-1308\\(3\\)[^.]{0,80}consent", flags: "i",
        label: "does NOT mis-label § 6-1-1308(3) as a consent provision" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS|CUBI", flags: "i",
        label: "does NOT drag other US biometric statutes into a Colorado-only analysis" },
    ],
  },
];
