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

## QB 2026-07-22 waves 2–3 — CPPA-ADMT blanket-citation pattern (2-run confirmed: 5328de4f, 71652354)
The ADMT generator repeatedly cites '11 CCR §§ 7220–7222 (the ADMT subchapter)' as a catch-all and anchors action duties on § 7001 (definitions). Fix shipped: prompt-level citation-discipline rules (most-specific-section only; § 7001 never a governing anchor). Intake-guidance implication: none — generator-side defect.

## 2026-07-22 — manual batch 304b1070 (all 10 tools, n=1)

7. REGISTRATION — provider vs deployer flag (run 3bb64a86, scored 50). The generator asserted GPAI-provider obligations (EU AI Act Arts. 53–55) although the intake declared ai_general_purpose_provider=false (the org is a deployer of high-risk AI). Generator-side fix is being applied, but the intake page shares blame-surface: the checkbox labels should make the distinction unmistakable — helper text like "Check only if your organisation PROVIDES/develops a general-purpose AI model — not if you merely use AI tools" on ai_general_purpose_provider, and equivalent clarity on ai_high_risk (deployer vs provider of a high-risk system). Hypothesis until seen again.

8. REGISTRATION — markets_served coverage expectation (same run). The report produced no entries for three of the intake's markets_served (FR, NL, SE) with no explanation. Users selecting markets will expect either an entry per market or an explicit statement of why none is needed (e.g. GDPR one-stop-shop). Intake-guidance implication: the markets_served field could carry helper text setting the expectation; generator-side coverage rule being applied in parallel.

9. VALIDATED — biometric-checker intake/prompt fixes (runs 73bac724/4996dbc6 → 48682fe3): score moved 66 → 90 after the Art. 9(2) selection, sector-framework, internal-label, and jurisdiction-specificity rules shipped. Pattern confirmed: grader-evidence-cited prompt rules produce measurable gains in one cycle.



## 2026-07-22 — product-prompt courier (registration / governance / dpia + grader harness)

10. **Registration AI-role conflation.** `_shared/registration-engine.ts` collapsed `ai_high_risk` and `ai_general_purpose_provider` into a single `ai_act_provider_obligations` boolean and used one string of basis text across every jurisdiction. Split into `gpai_provider_obligations` (Chapter V, Arts. 53–55) and `high_risk_ai_deployer_obligations` (Chapter III, Arts. 26–29; Art. 49(2) EU database) and rebuilt `aiBasis` per-jurisdiction. UK/GB no longer receives EU AI Act text; non-EU/EEA jurisdictions state that the Act is EU law and out of local scope. `ai_act_provider_obligations` retained for back-compat and equals `gpai || highRisk`.

11. **Registration EU-Act UK territoriality.** UK entries previously received the same "GPAI-provider obligations engaged" text as EU entries. New UK-branch text names the actual UK framework status (no comprehensive AI statute in force; DSIT White Paper CP 815 / August 2024 response; sector-regulator guidance under UK GDPR and Equality Act 2010) and directs confirmation with the ICO and the relevant regulator.

12. **Registration per-jurisdiction tailoring + markets-served coverage.** Basis strings are now computed per code (EU/EEA vs. UK vs. other) so no two jurisdictions carry identical text unless the facts genuinely match. A new post-engine `R11_MARKET_COVERAGE` pass fills every intake market that the rules engine did not reach with an explicit "no filing engaged because …" entry — GDPR one-stop-shop for EU markets under an EU establishment, "does not operate a general registration scheme" where the DB row says so, or a confirm-with-authority statement when metadata is missing. Silent omission of an intake market is now impossible on the happy path.

13. **Governance enumeration self-consistency + parenthetical leak.** `rewrite()` at line 640 was appending the internal bookkeeping parenthetical "(not engaged on this intake)" onto scrubbed statute references — internal logic leaking to reader-facing prose. Parenthetical removed; the conditional phrase "where engaged" now stands alone. Added `PRODUCT-PROMPT-GOV — ENUMERATION SELF-CONSISTENCY` rule to the system prompt: stated counts ("the four tools", "the three domains") MUST equal the enumerated list; engagement-status parentheticals are prohibited anywhere in body text.

14. **DPIA intake-verbatim discipline.** Added `PRODUCT-PROMPT-DPIA — INTAKE-VERBATIM DISCIPLINE`: proper nouns (vendor/system names) and dates from the intake are copied character-for-character into the framework; no re-spelling, no year drift (2028 → 2030 was the observed defect), no similar-sounding substitution. Missing values use the canonical `[TO COMPLETE — record the vendor name]` placeholder rather than an approximation. A cross-check pass runs before final JSON emit.

15. **e6 roster carve-out universalised.** QB-P14 threaded `intakeRoster` only into `run-dpia-framework`; QB-P15 wave produced ~10 e6 false positives on cppa-risk / cppa-cyber / admt / biometric / governance, all echoing intake-named staff (e.g. "Legal Counsel Miguel Rosario"). New shared helper `_shared/grader/intake-roster.ts::extractIntakeRoster(intake)` returns `JSON.stringify(intake)` — safe because the e6 pass gate is `intakeRosterNorm.includes(sNorm) && sNorm.length >= 20`, so widening the roster to the full intake only reduces false positives (model-added directives cannot appear verbatim in the intake). Threaded into all five generators; dpia now uses the shared helper with `dpia_team` as fallback.

16. **H6 checker aligned to co-citation rule.** `checkH6AdmtGoverningAnchor` in `_shared/grader/cppa-hf1-checks.ts` was failing sentences where § 7001 co-appears with a §§ 7200–7222 anchor when a chain joiner ("+", "and", "with") sat between the two. The rule (and the ADMT prompt) permit co-citation as long as the operative § 722x anchor is present. Chain-pattern rejection removed; `hasAnchor === true` now clears the sentence. Only sole-§ 7001-with-duty-verb sentences still fail.

17. **DPA `(default — confirm)` grader carve-out.** POST-DPA-FIX-1 T4(a) mandates the "(default — confirm)" marker on professional-standard defaults (TLS 1.2+, AES-256, annual BC/DR test, quarterly vuln scans, 30-day sub-processor objection window, 30-day Art. 35 assistance, quarterly access reviews, 24-hour deprovisioning). Grader rubric was deducting on this designed output. Added `DPA_DEFAULTS_MARKER_RE` to `_shared/grader/post-filters.ts` (drops any `rubric_*` finding whose evidence quotes the marker; suppression logged as `dpa_defaults` in the audit trail) AND added a `PROFESSIONAL-DEFAULTS MARKERS` paragraph to the grader system prompt in `run-quality-batch/index.ts` mirroring the R-15C-2 bracketed-placeholder exemption.
