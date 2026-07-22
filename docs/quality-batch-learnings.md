# Quality Batch Learnings — Intake Guidance Improvements

Purpose: evidence from automated quality-batch runs showing where the INTAKE ANSWERS (not the generator) limited document quality. Each entry states what a run showed and the implied improvement to the tool's intake-page guidance. Entries are hypotheses until observed in 2+ runs. Maintained by the quality-batch analysis process; append per batch, never rewrite history.

## 2026-07-22 — batch 6691d788 (cppa-cyber, dpia, dpa-generator; n=1 each) + carryover from 2026-07-21 runs

1. DPIA — main establishment. The generator asserted a GDPR Art. 4(16)(a) main-establishment conclusion the record did not establish. Intake-guidance implication: the DPIA intake should explicitly ask which establishment decides the purposes and means of processing and whether it has power to implement those decisions, with helper text telling the user to answer in plain organisational facts (who decides, where).

2. CYBER — inventory scope. The report claimed the intake "does not establish" that the asset inventory covers personal-information categories and processing systems, while the intake named those systems in other control notes. Intake-guidance implication: under the inventory control, prompt users to state what the inventory covers — systems, data categories, owners, update cadence. (A generator-side cross-reading rule is being added separately.)

3. DPA — biometric purpose (run 437112c1, 2026-07-21). Selecting "Biometric data" as a category does not tell the generator whether it is processed to uniquely identify individuals (the GDPR Art. 9(1) qualifier). Intake-guidance implication: add a conditional sub-question when Biometric data is selected. Until then the DPA drafts the qualifier conditionally.

4. IR PLAYBOOK — discovery date (run 91530c18, 2026-07-21). A stale discovery date misaligns statutory deadlines and governing-law versions. Intake-guidance implication: the intake page could warn when the discovery date is more than ~30 days old, since notification clocks may already have expired and the playbook's urgency framing changes.

5. ALL TOOLS — named roles and systems (multiple 2026-07-21 runs). Documents can only assign owners and timeframes when the intake names roles and systems. Intake-guidance implication: narrative fields should carry placeholder/helper text encouraging users to name officer roles (DPO, CISO, privacy lead), key systems and vendors, and dates.

6. ALL TOOLS — specificity begets specificity (multiple 2026-07-21 runs). Generic narrative answers produce generic analysis flagged by reviewers as boilerplate. Intake-guidance implication: helper text on narrative fields: "The more specific your description — systems, vendors, volumes, dates — the more tailored your analysis will be."

## QB-P12 — Deployed-state drift (2-cycle confirmed pattern)

Repo-state is not deployed-state.

- QB-P11: tick cron existed in design but was never registered.
- QB-P12: `run-quality-batch` existed in repo but had no deployed function blob (`NOT_FOUND_FUNCTION_BLOB`, wave 1 total dispatch failure).

Any campaign-critical path change must end with a live-endpoint verification (non-404 probe), not just a code commit.
