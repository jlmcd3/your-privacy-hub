/**
 * ITEM 273 — FIX 2: TRUE SUBMISSION / RETENTION CONTENT.
 *
 * CEO-read finding 4: the "How to submit and retain this assessment"
 * surface carried ONLY § 7121/§ 7120 CYBERSECURITY-AUDIT content, so the
 * section header was false — nothing on the surface stated the risk-
 * assessment submission timing (§ 7157(a)), the retention rule
 * (§ 7155(c)), or the review/update cadence (§ 7155(a)(2)-(3)).
 *
 * This module renders the missing, corpus-derived content in the
 * Item-204 register: STATE THE LAW, never compute the customer's
 * obligation, close reserved-to-customer-and-counsel.
 *
 * Corpus sources (provision_texts, status=approved):
 *   • cppa-7157 — § 7157(a)(1)-(2) submission timing; (c) submitter;
 *     (d) submission channel; (e) on-request production.
 *   • cppa-7155 — § 7155(a)(2)-(3) review/update cadence and material-
 *     change definition; § 7155(c) retention.
 *
 * 40-character corpus pins recorded in
 * docs/courier/ITEM273-STEP0B-2026-07-30.md.
 *
 * Sentences drafted by the teams under the CEO campaign delegation
 * (2026-07-30) and quoted verbatim in that courier.
 */

export const SUBMISSION_RETENTION_STAMP =
  "submission-retention@2026-07-30-item273";
export const SUBMISSION_RETENTION_VERSION =
  "submission-retention-v1-7157-7155-2026-07-30";

/** Deterministic marker so idempotency/pin checks are exact-substring safe. */
export const SUBMISSION_RETENTION_MARKER =
  "[§ 7157 submission / § 7155 retention]";

/**
 * Explicit lead-in that re-homes the pre-existing § 7121(a) cybersecurity-
 * audit schedule as a RELATED, SEPARATE obligation, so the section header
 * is no longer false (CEO-read finding 4).
 */
export const CYBER_AUDIT_SEPARATE_LEAD_IN =
  "Separately, the cybersecurity-audit obligation under 11 CCR § 7121(a) phases in as follows:";

/** Corpus-pinned literals — verbatim substrings from the approved rows. */
export const SUBMISSION_RETENTION_LITERALS = {
  submission_2026_2027_deadline: "April 1, 2028",
  submission_rolling_rule:
    "no later than April 1 following any year during which the business conducted the risk assessments",
  retention_rule:
    "for as long as the processing continues or for five years after the completion of the risk assessment, whichever is later",
  review_cadence: "At least once every three years",
  material_change_days: "45 calendar days",
} as const;

/**
 * Render the § 7157(a) submission-timing, § 7155(c) retention, and
 * § 7155(a)(2)-(3) cadence sentences. Deterministic; no customer facts.
 */
export function renderSubmissionAndRetention(): string {
  const L = SUBMISSION_RETENTION_LITERALS;
  return [
    `${SUBMISSION_RETENTION_MARKER} Under 11 CCR § 7157(a)(1), for risk assessments conducted in 2026 and 2027, a business must submit to the Agency the information required by § 7157(b) no later than ${L.submission_2026_2027_deadline}.`,
    `Under § 7157(a)(2), for risk assessments conducted after 2027, that information is due ${L.submission_rolling_rule} — for assessments conducted in 2028, no later than April 1, 2029.`,
    `Under § 7155(c), a business must retain its risk assessments, including original and updated versions, ${L.retention_rule}.`,
    `Under § 7155(a)(2)-(3), ${L.review_cadence.toLowerCase()} a business must review, and update as necessary, its risk assessments; and notwithstanding that cadence, it must update a risk assessment whenever there is a material change relating to the processing activity, as soon as feasibly possible but no later than ${L.material_change_days} from the date of the material change. A change is material if it creates new negative impacts, increases the magnitude or likelihood of previously identified negative impacts under § 7152(a)(5), or diminishes the effectiveness of the safeguards under § 7152(a)(6).`,
    `The customer, in consultation with qualified legal counsel, determines the submission window that applies to this assessment and calendars the corresponding review and update dates.`,
  ].join(" ");
}
