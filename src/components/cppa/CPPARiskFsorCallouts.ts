// PHASE 2 of the corpus program (2026-08-22, doc 49 A.2.3(b)) — the risk
// intake's FSOR callouts, PINNED.
//
// Previously the page fetched these live from the `cppa_fsor_callouts`
// view at page load (useFscrCallouts) — unpinned, unratified bytes that
// tracked whatever the DB row said that day (doc 48 §II.4a finding 2).
// The literals below are byte-copies of the Risk CAM's S0 rows
// (supabase/functions/_shared/corpus/maps/risk-corpus-map.ts), which pin
// against the committed corpus snapshot; the parity test
// (src/registry/__tests__/risk-fsor-callouts-pin.test.ts) fails if this
// file and the CAM ever drift apart.
//
// The live intake also used to request "11 CCR § 7156(a)" — the view has
// NO row for that citation (verified live 2026-08-22), so that callout
// has never rendered; it is intentionally absent here, and the
// <FscrCallout> component renders nothing for a missing key, exactly as
// before. The cyber intake keeps useFscrCallouts unchanged until Cyber's
// own conversion (doc 48 Part III).

import type { FscrCalloutMap } from "@/hooks/useFscrCallouts";

export const CPPA_RISK_FSOR_CALLOUTS: FscrCalloutMap = {
  "11 CCR § 7152(a)(1)":
    "The issue is how to identify processing purposes in specific, non-generic terms when conducting risk assessments under 11 CCR § 7152(a)(1). The CPPA added an example to subsection (a)(1) to clarify the necessary level of specificity required when identifying a purpose for risk assessment purposes.",
  "11 CCR § 7152(a)(3)(G)":
    "The issue was whether the automated decision-making technology (ADMT) risk assessment requirement in 11 CCR § 7152(a)(3)(G) should specify the particular technology used and clarify how ADMT output relates to significant consumer decisions. The Agency removed the requirement to identify the specific technology to simplify compliance, but added language requiring businesses to explain how they will use ADMT output \"to make a significant decision\" about consumers, thereby focusing the assessment on the material decision-making impact rather than technical specifications.",
  "11 CCR § 7156(b)":
    "The issue is whether businesses can reuse a risk assessment prepared for compliance with other laws to satisfy the CPRA's risk assessment requirements under section 7152. The Agency modified section 7156(b) to permit businesses to use risk assessments prepared for other purposes, provided that the assessment contains all the information required by section 7152 or is paired with additional information to fill any gaps. This approach allows businesses to leverage existing compliance work while ensuring the final assessment meets CPRA standards and maintains adequate privacy protections.",
};
