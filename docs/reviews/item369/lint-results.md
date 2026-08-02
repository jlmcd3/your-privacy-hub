
## Fixture: perfect (item350)

PASS  preview entrypoint ran
PASS  prose-9 envelope present on persisted payload
PASS  nine sections rendered — 9/9
PASS  sections in plan order
PASS  record spans tracked — 17
PASS  overlay key present: opening_summary
PASS  overlay key present: executive_summary
PASS  overlay key present: scope_and_triggers
PASS  overlay key present: record_sufficiency
PASS  overlay key present: priority_actions
PASS  carried-over key survives: submission_summary
PASS  carried-over key survives: next_steps
PASS  carried-over key survives: information_needed
PASS  carried-over key survives: risk_level
PASS  carried-over key survives: disclaimer
PASS  live baseline payload carries no prose_document (live path unaffected)
PASS  style/quoted_intake_value
PASS  style/banned_record_phrase
PASS  style/attribution_missing
PASS  style/attribution_vocabulary_thin
PASS  style/mechanical_verb_rotation
PASS  style/pluralisation_artifact
PASS  style/punctuation_collision
PASS  style/section_order
PASS  style/sentence_duplication
PASS  style/paragraph_segmentation
PASS  style/analogy_missing_why
PASS  style/analogy_missing_impact
PASS  style/analogy_outcome_predictive
PASS  style/analogy_empty_sentence
PASS  style/unbalanced_sentinel
PASS  Item 347 render lint
PASS  connective-edge rule — []

artifacts: after-perfect-item350-.md, before-perfect-item350-.md, payload-perfect-item350-.json

## Fixture: messy (item350)

PASS  preview entrypoint ran
PASS  prose-9 envelope present on persisted payload
PASS  nine sections rendered — 9/9
PASS  sections in plan order
PASS  record spans tracked — 19
PASS  overlay key present: opening_summary
PASS  overlay key present: executive_summary
PASS  overlay key present: scope_and_triggers
PASS  overlay key present: record_sufficiency
PASS  overlay key present: priority_actions
PASS  carried-over key survives: submission_summary
PASS  carried-over key survives: next_steps
PASS  carried-over key survives: information_needed
PASS  carried-over key survives: risk_level
PASS  carried-over key survives: disclaimer
PASS  live baseline payload carries no prose_document (live path unaffected)
PASS  style/quoted_intake_value
FAIL  style/banned_record_phrase — record_card: banned phrasing "on the record" at 622 | record_card: banned phrasing "on the record" at 648 | record_card: banned phrasing "not stated on the record" at 611
FAIL  style/attribution_missing — risk_analysis: record value "Account email address" (necessity_analysis[].element) is not governed by an attribution verb — "To carry Account email address further we would need State why "Account email address" is necessary to the stated purpose; a necessity assertion without a reason cannot be assessed under § 7152(a)(2)." | risk_analysis: record value "Device identifier (cookie ID)" (necessity_analysis[].element) is not governed by an attribution verb — "To carry Device identifier (cookie ID) further we would need State why "Device identifier (cookie ID)" is necessary to the stated purpose; a necessity assertion without a reason cannot be assessed under § 7152(a)(2)." | risk_analysis: record value "not stated on the record" (safeguard_map[].safeguard) is not governed by an attribution verb — "To address Unauthorized access, destruction, use, modification, or disclosure; loss of availability, the company relies on not stated on the record, recorded as not stated on the record, and a low residual remains once it is applied."
PASS  style/attribution_vocabulary_thin
PASS  style/mechanical_verb_rotation
PASS  style/pluralisation_artifact
PASS  style/punctuation_collision
PASS  style/section_order
PASS  style/sentence_duplication
PASS  style/paragraph_segmentation
PASS  style/analogy_missing_why
PASS  style/analogy_missing_impact
PASS  style/analogy_outcome_predictive
PASS  style/analogy_empty_sentence
PASS  style/unbalanced_sentinel
PASS  Item 347 render lint
PASS  connective-edge rule — []

artifacts: after-messy-item350-.md, before-messy-item350-.md, payload-messy-item350-.json

## Fixture: risk-saas-clean-tuning

PASS  preview entrypoint ran
PASS  prose-9 envelope present on persisted payload
PASS  nine sections rendered — 9/9
PASS  sections in plan order
PASS  record spans tracked — 17
PASS  overlay key present: opening_summary
PASS  overlay key present: executive_summary
PASS  overlay key present: scope_and_triggers
PASS  overlay key present: record_sufficiency
PASS  overlay key present: priority_actions
PASS  carried-over key survives: submission_summary
PASS  carried-over key survives: next_steps
PASS  carried-over key survives: information_needed
PASS  carried-over key survives: risk_level
PASS  carried-over key survives: disclaimer
PASS  live baseline payload carries no prose_document (live path unaffected)
PASS  style/quoted_intake_value
PASS  style/banned_record_phrase
PASS  style/attribution_missing
PASS  style/attribution_vocabulary_thin
PASS  style/mechanical_verb_rotation
PASS  style/pluralisation_artifact
PASS  style/punctuation_collision
PASS  style/section_order
PASS  style/sentence_duplication
PASS  style/paragraph_segmentation
PASS  style/analogy_missing_why
PASS  style/analogy_missing_impact
PASS  style/analogy_outcome_predictive
PASS  style/analogy_empty_sentence
PASS  style/unbalanced_sentinel
PASS  Item 347 render lint
PASS  connective-edge rule — []

artifacts: after-risk-saas-clean-tuning.md, before-risk-saas-clean-tuning.md, payload-risk-saas-clean-tuning.json

### ITEM 369 PHASE 2: 2 FAILING CHECK(S)