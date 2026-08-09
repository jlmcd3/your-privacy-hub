# INTAKE-4a — CPPA Risk intake wording pass (2026-08-09)

Scope: wording only (labels/help text) + one additive optional field.
No key, option value, stored value, or validation rule was changed.

## Wording before/after (8 rows edited; 36 rows reviewed, unchanged)

| Key | Before | After |
|---|---|---|
| q15bUnder16 | Do you have actual knowledge that you sell or share the personal information of consumers under 16 years of age? | Do you knowingly sell or share personal information of consumers under 16? |
| q18bTraining | Describe the training provided to personnel who handle personal information in connection with this activity. | What training do staff handling this data receive? |
| bssCount | Approximate number of consumers whose sensitive personal information is processed in connection with the activity | About how many consumers' sensitive personal information does this activity involve? |
| a2NecessitySet[] | Select each purpose for which the processing is reasonably necessary and proportionate | Why is this processing needed? Select all that apply. |
| a4BenefitBusiness | Describe the benefit to the business resulting from the processing | What does the business gain from this processing? |
| a5HarmPathways[] | Identify the negative impacts to consumers' privacy that may result | What could go wrong for consumers? Select all that apply. |
| a6Safeguards[] | Identify the safeguards implemented to address the negative impacts identified | Which safeguards are in place for those risks? |
| exceptionClaims | Identify any exceptions claimed under 11 CCR § 7153 | Are you claiming any exception under 11 CCR § 7153? |

## Addition

`material_change_since_prior` — enum, **optional**, options `["Yes","No"]`,
label "Has this processing activity changed materially since the last assessment?".
Added to: risk intake contract, `CPPARiskAssessment.tsx` form + state,
`FIELD_LABELS`, `_w18_risk_vocab.ts`, and `CPPA_RISK_PERFECT` (answered "No").

Legacy drafts saved without the key still validate unchanged (asserted both
directions in `src/test/intake4a-risk-package.test.ts`).
