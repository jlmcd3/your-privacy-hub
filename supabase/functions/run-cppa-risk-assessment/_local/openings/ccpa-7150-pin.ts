// T7-RISK-OPENING — Corpus pins for 11 CCR § 7150(b)(1)–(6) trigger clauses.
//
// Source of truth: provision_texts row key='cppa-7150' (status=approved,
// jurisdiction=US-CA). Clause text below is verbatim from the (b)(N) leaves,
// re-extracted 2026-07-25. Runtime pin-test compares against live row on
// cold-start; drift telemeters and drops the affected trigger from S1.

export const CCPA_7150_B_1 = "Selling or sharing personal information.";
export const CCPA_7150_B_2 = "Processing sensitive personal information.";
export const CCPA_7150_B_3 = "Using ADMT for a significant decision concerning a consumer.";
export const CCPA_7150_B_4 =
  "Using automated processing to infer or extrapolate a consumer\u2019s intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business.";
export const CCPA_7150_B_5 =
  "Using automated processing to infer or extrapolate a consumer\u2019s intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, or movements, based upon that consumer\u2019s presence in a sensitive location. \u201CInfer or extrapolate\u201D does not include a business using a consumer\u2019s personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location.";
export const CCPA_7150_B_6 =
  "Processing the personal information of consumers, which the business intends to use to train an ADMT for a significant decision concerning a consumer; or train a facial-recognition, emotion-recognition, or other technology that verifies a consumer\u2019s identity, or conducts physical or biological identification or profiling of a consumer. For purposes of this paragraph, \u201Cintends to use\u201D means the business is using, plans to use, permits others to use, plans to permit others to use, is advertising or marketing the use of, or plans to advertise or market the use of.";

export const CCPA_7150_B_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "selling or sharing personal information",
  2: "processing sensitive personal information",
  3: "using ADMT for a significant decision concerning a consumer",
  4: "using automated processing based on systematic observation in worker, student, or applicant contexts",
  5: "using automated processing based on a consumer\u2019s presence in a sensitive location",
  6: "processing personal information to train an ADMT or biometric-recognition technology",
};
