// CURATED MAP PROGRAM — Phase C interim fix (2026-08-23, doc 63 §5.1,
// CEO-ordered ahead of wave C3) — the cyber intake's FSOR callout, PINNED.
//
// Previously the page fetched callouts live via useFscrCallouts keyed on
// "11 CCR § 7123(c)(1)" — and the corpus's only substantive row under that
// citation (830b0beb) is OLD-NUMBERING commentary about audit-REPORT gap
// documentation (final § 7123(e) family), not Authentication. The intake
// was rendering mis-attributed regulator commentary on the c1_auth field
// (doc 54 §2a, the two-package trap).
//
// The literal below is a byte-copy of FSOR row
// 3bb6fc9f-3e48-404b-99d4-a5d4eaa52561 (agency_position_summary,
// "11 CCR § 7123(c)", Appendix p. 81) — genuinely authentication-bearing
// (MFA trigger flexibility; phishing-resistant authentication assessable
// under (c)(1)(A)). It is keyed under the row's TRUE citation, § 7123(c),
// not the old (c)(1) key. Pin guard:
// src/registry/__tests__/cyber-fsor-callout-pin.test.ts against the
// committed snapshot fsor-snapshot-cyber-interim.json.
//
// At wave C3 this row folds into the Cyber CAM as its first S0 row and
// the pin test upgrades to the three-way Risk parity pattern
// (CPPARiskFsorCallouts.ts / risk-fsor-callouts-pin.test.ts).

import type { FscrCalloutMap } from "@/hooks/useFscrCallouts";

export const CPPA_CYBER_FSOR_CALLOUTS: FscrCalloutMap = {
  "11 CCR § 7123(c)":
    "The issue is whether cybersecurity audits under section 7123(c) should specify clearer trigger points for multi-factor authentication requirements and mandate phishing-resistant authentication regardless of the number of factors used. The Agency rejected the commenter's request for additional specificity, finding the regulation reasonably clear as written, but revised section 7123(c) to clarify that auditors must assess cybersecurity program components applicable to the business's information systems. The Agency confirmed that section 7123(c)(1)(A) already permits auditors to assess phishing-resistant authentication broadly beyond the listed multi-factor authentication requirement, maintaining flexibility while ensuring audit thoroughness consistent with CCPA standards.",
};
