// ITEM 381 — INTAKE COMPLETENESS COACH, LAYER 1: thin-spot configuration.
//
// DATABASE-ONLY. No model call, no network call, no stub for one. Every
// detector is a documented deterministic heuristic over the customer's own
// text, and every consequence line is a TRUE statement about what the
// pipeline does with that answer today, with the source module cited on the
// entry.
//
// CONSERVATIVE BY CONSTRUCTION: when a detector is unsure, the field is NOT
// flagged — it goes to the already-strong list.
//
// COPY REGISTER: customer voice, no internal vocabulary, no "please", no
// banned idioms, no legal advice beyond the product's verified corpus.
// Example shapes are marked as shapes.

export type CoachProduct = "dpia" | "cppa_risk";

export interface ThinSpot {
  /** Contract key this card is about (the key the jump-to link targets). */
  key: string;
  /** Additional contract keys folded into the same card. */
  companions?: readonly string[];
  /** Customer-facing field title. */
  title: string;
  /** CSS selector for the jump-to link, resolved against the live form. */
  jumpSelector: string;
  /** Report-impact rank; lower sorts first. */
  rank: number;
  /** Minimum length below which the answer is thin (characters). */
  minLength?: number;
  /** The answer is thin when this marker is absent. */
  marker?: RegExp;
  /** Human-readable statement of the detector, shown in tests and reviews. */
  heuristic: string;
  /** TRUE statement of what the report does with the answer as written. */
  consequence: string;
  /** Module the consequence wording is derived from. */
  consequenceSource: string;
  /** "Strengthen your answer by…" advice. */
  advice: string;
  /**
   * ADVICE-ONLY: the card never carries an unanswered consequence, because
   * the contract marks the field emptyIsAnswer (blank is an answer).
   */
  adviceOnlyWhenEmpty?: true;
}

// ── DPIA ────────────────────────────────────────────────────────────────

export const DPIA_THIN_SPOTS: readonly ThinSpot[] = [
  {
    key: "necessity_proportionality",
    title: "Why the processing is necessary, and what else you considered",
    jumpSelector: '[data-coach-field="necessity_proportionality"]',
    rank: 1,
    marker:
      /\b(benefit|benefits|gain|gains|advantage|outweigh|outweighs|in return|worth|value to)\b/i,
    heuristic:
      "One-sided balance: the answer is present but carries no benefit-side wording, so only the impact side is described.",
    consequence:
      "As written, the necessity section sets out the impact of the processing and compares only the options you have described. It carries no benefit side, so the balance renders one-sided.",
    consequenceSource:
      "src/pages/DPIAFramework.tsx necessity guidance; supabase/functions/_shared/ltp/dpia-csc.ts (necessity surface)",
    advice:
      "Add the other half of the balance: what the processing achieves and for whom, next to what it costs the people affected. A two-sided answer names both — the shape is \"the check removes X, at the cost of Y for the people affected\".",
  },
  {
    key: "data_subjects_views",
    companions: ["data_subjects_views_sought"],
    title: "The views of the people affected",
    jumpSelector: '[data-coach-field="data_subjects_views"]',
    rank: 2,
    minLength: 120,
    heuristic: "Short answer: fewer than 120 characters of substance.",
    consequence:
      "As written, the Art. 35(9) section reproduces what you enter here and the status you selected, and nothing further. It draws on no other part of your answers.",
    consequenceSource:
      "supabase/functions/_shared/ltp/dpia-csc.ts buildDpiaDataSubjectViews (L201-212)",
    advice:
      "Say how you asked, what came back, and what changed as a result. Where views were not sought, give the reason asking is not appropriate.",
  },
  {
    key: "dpo_advice",
    title: "The advice of the data protection officer",
    jumpSelector: '[data-coach-field="dpo_advice"]',
    rank: 3,
    minLength: 80,
    heuristic: "Short answer: fewer than 80 characters of substance.",
    consequence:
      "As written, the consultation section states the advice exactly as you enter it, and records nothing about whether it was followed.",
    consequenceSource:
      "supabase/functions/_shared/ltp/dpia-csc.ts (consultation surface); src/pages/DPIAFramework.tsx stage 4 guidance",
    advice:
      "Give the advice itself, the date it was given, and whether you followed it — and if not, the reason.",
  },
  {
    key: "functional_description",
    title: "How the activity works, step by step",
    jumpSelector: '[data-coach-field="functional_description"]',
    rank: 4,
    minLength: 200,
    marker: /[A-Z][A-Za-z0-9]{2,}|\d/,
    heuristic:
      "Short (under 200 characters) or names no system: no capitalised system name and no figure appears.",
    consequence:
      "As written, the description section carries your wording as the factual base for the analysis. Anything not described here is not analysed later.",
    consequenceSource:
      "src/pages/DPIAFramework.tsx description guidance (Art. 35(7)(a)); supabase/functions/_shared/ltp/dpia-deliverables",
    advice:
      "Walk the activity through from collection to deletion and name the systems at each step, with figures where you have them.",
  },
  {
    key: "supporting_assets",
    title: "The systems the activity runs on",
    jumpSelector: '[data-coach-field="supporting_assets"]',
    rank: 5,
    marker:
      /\b(collect|collection|store|storage|stored|access|accessed|transfer|transferred|delete|deletion|retain|retention|host|hosted|process|processing)\b/i,
    heuristic:
      "List without phases: systems are named but no processing phase word ties them to a step.",
    consequence:
      "As written, the supporting-systems section lists what you enter without tying any system to a step of the activity.",
    consequenceSource:
      "src/pages/DPIAFramework.tsx supporting-assets guidance; supabase/functions/_shared/ltp/dpia-deliverables",
    advice:
      "Tie each system to the phase it serves — the shape is \"collection: A; storage: B; access: C\".",
  },
  {
    key: "retention_period",
    companions: ["retention_record_type"],
    title: "How long the data is kept",
    jumpSelector: '[data-coach-field="retention_period"]',
    rank: 6,
    marker:
      /\b(because|since|required|statut\w*|law|legal|regulat\w*|policy|so that|in order|to meet|obligation)\b/i,
    heuristic:
      "Period without a reason: a duration is given but no wording explains what sets it.",
    consequence:
      "As written, the retention section states your period and treats it as freely chosen, because no rule or reason is given for it.",
    consequenceSource:
      "src/pages/DPIAFramework.tsx retention guidance; supabase/functions/_shared/ltp/submission-retention.ts",
    advice:
      "Give the period and what sets it — a statutory rule, a contract, or your own policy — and name the record type where a law fixes the minimum.",
  },
  {
    key: "dpia_signoff_basis",
    companions: [
      "dpia_prepared_by",
      "dpia_approved_by_name",
      "dpia_approved_by_title",
      "dpia_approval_date",
    ],
    title: "What the approval rests on",
    jumpSelector: '[data-coach-field="dpia_signoff_basis"]',
    rank: 7,
    minLength: 80,
    heuristic: "Short answer: fewer than 80 characters of substance.",
    consequence:
      "As written, the sign-off block reproduces your wording. It records the approval without the reasoning behind it.",
    consequenceSource:
      "src/pages/DPIAFramework.tsx sign-off guidance (EDPB template § 0.5 ¶10)",
    advice:
      "Name the sections reviewed, the remaining risks accepted, and any condition attached to the approval, with the date.",
  },
];

// ── CPPA RISK ───────────────────────────────────────────────────────────

const A4_BENEFIT_MARKER = /\b(consumer|consumers|customer|customers|business|employee|employees|public|user|users|resident|residents|applicant|applicants|patient|patients|merchant|merchants)\b/i;

function a4Spot(key: string, title: string, rank: number): ThinSpot {
  return {
    key,
    title,
    jumpSelector: `[data-coach-field="${key}"]`,
    rank,
    minLength: 40,
    marker: A4_BENEFIT_MARKER,
    heuristic:
      "Short (under 40 characters) or names no beneficiary group: no group word appears in the answer.",
    consequence:
      "As written, the benefits section states this benefit as you enter it. Where the answer names no group and no outcome, the assessment records the benefit as claimed rather than shown.",
    consequenceSource:
      "supabase/functions/_shared/ltp/risk-csc.ts R1 benefitAsk (§ 7152(a)(4))",
    advice:
      "Name who gains and the concrete outcome they get, and put the fact from your own records that shows it in the supporting box.",
  };
}

export const RISK_THIN_SPOTS: readonly ThinSpot[] = [
  a4Spot("a4_benefit_business", "The benefit to the business", 1),
  a4Spot("a4_benefit_consumer", "The benefit to consumers", 2),
  a4Spot("a4_benefit_other_stakeholders", "The benefit to other stakeholders", 3),
  a4Spot("a4_benefit_public", "The benefit to the public", 4),
  {
    key: "a5_harm_pathways",
    title: "How harm could occur",
    jumpSelector: '[data-coach-field="a5_harm_pathways"]',
    rank: 5,
    minLength: 120,
    heuristic:
      "Thin pathway rows: fewer than 120 characters across the data, actor, source and cause boxes of all rows.",
    consequence:
      "As written, the harm analysis works from the rows you enter. A row that names a category and no specifics is analysed as a category.",
    consequenceSource:
      "supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts a5_harm_pathways; supabase/functions/_shared/ltp/risk-level-map.ts",
    advice:
      "For each row, name the specific data involved, who is in a position to cause the harm, and what would let it happen.",
  },
  {
    key: "i1b_min_pi",
    title: "What you leave out by design",
    jumpSelector: '[data-coach-field="i1b_min_pi"]',
    rank: 6,
    minLength: 60,
    marker: /\b(not|no|exclude\w*|without|avoid\w*|omit\w*|never|only)\b/i,
    heuristic:
      "Short (under 60 characters) or states no exclusion: no exclusion wording appears.",
    consequence:
      "As written, the minimisation section reports what you collect. With no exclusion named, it records no design decision to leave anything out.",
    consequenceSource:
      "supabase/functions/_shared/customer-messages.ts i1b_min_pi; supabase/functions/_shared/ltp/risk-csc.ts",
    advice:
      "Name what you decided not to collect, and why it is not needed for the purpose.",
  },
  {
    key: "i5_admt_logic",
    companions: ["i5_admt_fairness_testing", "i5_admt_human_review"],
    title: "How the automated decision-making works",
    jumpSelector: '[data-coach-field="i5_admt_logic"]',
    rank: 7,
    minLength: 80,
    heuristic:
      "Short answer: fewer than 80 characters across the logic, fairness-testing and human-review boxes.",
    consequence:
      "As written, the automated decision-making section states the logic, the testing and the review exactly as you enter them, and reports the rest as outstanding.",
    consequenceSource:
      "supabase/functions/_shared/ltp/record-complete.ts (open-item classification); supabase/functions/_shared/customer-messages.ts i5_* labels",
    advice:
      "Describe what the system weighs, the fairness testing you ran and when, and what a reviewer can change.",
  },
  {
    key: "a6_safeguards",
    title: "The safeguards and what is left after them",
    jumpSelector: '[data-coach-field="a6_safeguards"]',
    rank: 8,
    minLength: 80,
    marker: /\b(residual|remain\w*|still|after|left|reduced to|cannot be|not eliminated)\b/i,
    heuristic:
      "Short (under 80 characters) or no residual wording across the safeguard rows.",
    consequence:
      "As written, the safeguards section reports each safeguard and its status. Where no residual risk is stated, it records none.",
    consequenceSource:
      "supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts a6_safeguards[].residual",
    advice:
      "State what remains after each safeguard rather than treating the harm as removed.",
  },
  {
    key: "exceptions_intake",
    title: "Statutory exceptions you claim",
    jumpSelector: '[data-coach-field="exceptions_intake"]',
    rank: 9,
    minLength: 30,
    adviceOnlyWhenEmpty: true,
    heuristic:
      "Blank, or fewer than 30 characters across the exception boxes. Blank is an answer here, so the card carries advice only.",
    consequence:
      "As written, your assessment records that no statutory exception is claimed for this activity.",
    consequenceSource:
      "supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts exceptions_intake (emptyIsAnswer); supabase/functions/_shared/ltp/risk-csc.ts R2",
    advice:
      "Where an exception applies, name it and the processing it covers. Where none applies, leaving the boxes empty is a complete answer.",
  },
];

export const THIN_SPOTS: Record<CoachProduct, readonly ThinSpot[]> = {
  dpia: DPIA_THIN_SPOTS,
  cppa_risk: RISK_THIN_SPOTS,
};
