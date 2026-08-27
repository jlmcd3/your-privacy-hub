// supabase/functions/generate-dpa/_local/registry/dpa-us-citation-anchors.ts
//
// S-D4 (doc 80, 2026-08-27) — the VERIFIED US-STATE CITATION ANCHORS moved
// out of index.ts's prompt-building closure into a registry module with a
// per-block verification date, the PN-R4 staleness-stamp pattern. This is
// the single source of truth: the (interim) prompt path consumes it below,
// and the S-D1 clause library consumes the same block at conversion — the
// two can never drift. Content moved VERBATIM; re-verify against the
// official state legislative sources before changing any line, and update
// LAST_VERIFIED when you do.

export const DPA_US_ANCHORS_LAST_VERIFIED = "2026-07";

export const US_STATE_CITATION_ANCHORS = `

VERIFIED US-STATE CITATION ANCHORS (verified against the official state legislative sources, July 2026 — cite these WITHOUT the '[statutory reference to be confirmed]' hedge; the hedge is reserved for citations OUTSIDE this list):

CONNECTICUT (CTDPA, Conn. Gen. Stat. ch. 743jj): §42-515 definitions; §42-516 applicability; §42-518 consumer rights (access, correction, deletion, portability, opt-out) and controller response duties — respond without undue delay, no later than 45 days of receipt, extendable once by 45 days, with an appeal process; §42-520 controller duties, including the duty not to process sensitive data without the consumer's consent (COPPA compliance for known children); §42-521 processor duties and the required controller-processor contract; §42-522 data protection assessments (NEVER cite §42-523 for assessments — §42-523 is de-identified and pseudonymous data); §42-525 enforcement by the Attorney General.

OREGON (OCPA, ORS 646A.570–646A.589): 646A.570 definitions; 646A.572 scope and exclusions (NOT a sensitive-data provision); 646A.574 consumer rights — response without undue delay and not later than 45 days after receiving the request (646A.574(5)(a)), extendable; 646A.578 controller duties, including the prohibition on processing sensitive data about a consumer without first obtaining the consumer's consent; 646A.581 processor duties and the required controller-processor contract; 646A.586 data protection assessments; 646A.589 Attorney General investigative authority. Oregon BREACH notification is the separate Oregon Consumer Information Protection Act — cite the operative notice provision ORS 646A.604, never 646A.600 (the short title).

VIRGINIA (VCDPA, Va. Code §§59.1-575–585): 59.1-575 DEFINITIONS ONLY (biometric data; the consumer definition excludes employment context) — never cite 59.1-575 for minimization or substantive duties; 59.1-576 scope and exemptions; 59.1-577 consumer rights with the 45-day response at 59.1-577(B)(1), extendable once, and appeals at 59.1-577(C); 59.1-578 controller duties — minimization 578(A)(1), purpose limitation 578(A)(2), security 578(A)(3), non-discrimination 578(A)(4), sensitive-data consent 578(A)(5), privacy notice 578(C), sale/targeted-advertising disclosure 578(D); the 2024 VCDPA amendment (cc. 840/844) added the CHILDREN'S-DATA provisions at 578(F) and is the only 2024 VCDPA amendment — never attribute breach-notification content to it; 59.1-579 controller-processor responsibility and contract; 59.1-580 data protection assessments. Virginia breach notification is Va. Code §18.2-186.6, outside the VCDPA.

COLORADO (CPA, C.R.S. 6-1-1301–1313): cite Colorado at the SECTION level with a descriptive gloss — 6-1-1303 definitions; 6-1-1305 responsibility according to role (controller-processor obligations); 6-1-1306 consumer personal data rights; 6-1-1308 duties of controllers; 6-1-1309 data protection assessments. NEVER cite 6-1-1313 for any substantive duty or breach obligation — it is the Attorney General rulemaking/opt-out-mechanism provision. Colorado's breach-notification statute is C.R.S. 6-1-716, outside the CPA. Do not assert Colorado subsection letters not listed here; use the section number plus a descriptive gloss.

CALIFORNIA BREACH SEQUENCING (state it in this order, never merged into one clause): first, the Controller notifies affected California residents within 30 calendar days of discovery or notification of the breach (Cal. Civ. Code § 1798.82, as amended by SB 446, for breaches on or after 1 January 2026, subject to the law-enforcement and scope-determination carve-outs); second, where MORE THAN 500 California residents are notified, the Controller electronically submits a single sample copy of that notification to the California Attorney General within 15 calendar days AFTER notifying consumers (§ 1798.82(f)). The 15-day AG clock starts at consumer notification, not at discovery.

HEDGE DISCIPLINE: for any state-law citation NOT covered by these anchors, either cite at the statute level with a descriptive gloss or use the [statutory reference to be confirmed] flag — never invent a subsection.`;
