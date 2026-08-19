// CP-B §1 corpus pins — 11 CCR § 7120 verbatim (OAL-approved, eff. 2026-01-01).
// Source: provision_texts key='cppa-7120' status='approved' — extracted 2026-07-28
// via anon SELECT. Byte-identical to the corpus row's verbatim_excerpt.
// The wire-site (submission-postures.ts) pins these on cold-start; drift
// downgrades posture clauses to the state-only form and telemeters.

export const CCPA_7120_B_1 =
  "The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(C), in the preceding calendar year";

export const CCPA_7120_B_2_A =
  "Processed the personal information of 250,000 or more consumers or households in the preceding calendar year";

export const CCPA_7120_B_2_B =
  "Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year";

// § 1798.140(d)(1)(C) — the 50%-revenue prong § 7120(b)(1) references.
// Sourced from ccpa-1798-140-pin (deferred (d)(1)(C) — retained here for
// posture-clause construction).
export const CCPA_1798_140_D_1_C =
  "Derives 50 percent or more of its annual revenues from selling or sharing consumers\u2019 personal information.";
