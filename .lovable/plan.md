# Battery 9 execution plan

Apply the 9 prompts in `EUP_QUALITY_FIXES_BATTERY9.md` verbatim. Hard rules honored: exact find/replace or verbatim append only, no rewording, no "QB9-" prefixed rule text, one logical commit per prompt, HARD-STOP if any locate-target diverges from what the doc describes.

## Per-prompt actions

- **QB9-1** `supabase/functions/generate-dpa/index.ts`
  - (a) Replace the full `NO ENFORCEMENT FROM MEMORY` rule line with the extended version (adds intake meta-commentary prohibition).
  - (b) Append the `NON-EEA PARTIES ON A GDPR FRAMEWORK SAY WHY` bullet as a new `- ` line in the same list.

- **QB9-2** `supabase/functions/generate-ir-playbook/index.ts`
  - (a) In `formatEnforcementContext`, after the `year`/`citation` pair, add `decided` and `ref` locals; extend the returned template string with `Decided:` and `${ref}` lines exactly as specified.
  - (b) Replace rule (12) `ENFORCEMENT CONTEXT PROVENANCE RULE` with the new `ENFORCEMENT CITATION COMPLETENESS RULE` text verbatim.

- **QB9-3** `supabase/functions/run-li-assessment/index.ts`
  - Define `dedupeInformationNeeded` and `ensureReferenceCategoryCaveat` as specified; call `ensureReferenceCategoryCaveat(dedupeInformationNeeded(report))` immediately before the report is persisted as `report_data`. HARD-STOP if there is no single persistence site.

- **QB9-4** `supabase/functions/run-dpia-framework/index.ts`
  - (a) Replace the `processing_name` schema descriptor with the extended "distinct by design" version.
  - (b) Append the `PLACEHOLDERS NEVER RE-REQUEST DOCUMENTED WORK` string element to the rules array containing PLACEHOLDER FORMAT RULE.

- **QB9-5** `supabase/functions/run-governance-assessment/index.ts`
  - Add `hoistNestedInformationNeeded` alongside the existing Stage-5 forward-path guard; call it on the assembled report before persistence. HARD-STOP if the Stage-5 guard is not locatable.

- **QB9-6** `supabase/functions/check-biometric-compliance/index.ts`
  - (a) Replace CITATION INTEGRITY item (5) with the SB 446 version.
  - (b) Replace the Land-consultation template item 3 with the Article 36 wording.
  - (c) Extend the BetrVG sentence in HR EMPLOYMENT BIOMETRIC CONSENT RULE with the § 87 BetrVG / § 26 BDSG clarification.

- **QB9-7** `supabase/functions/run-admt-checker/index.ts`
  - Replace `UNESTABLISHED TRIGGERS ARE LABELLED AS SUCH` rule with `PARTIALLY CONFIRMED TRIGGERS ARE CONDITIONALLY PRESENT` verbatim.

- **QB9-8** Ten files — add/extend `PROMPT_CORE_VERSION` import from `../_shared/prompt-core.ts`, then insert `console.log(\`[qb9] <fn> build active · core=${PROMPT_CORE_VERSION}\`);` as the first statement of the `Deno.serve` handler in each of:
  `generate-ir-playbook`, `run-governance-assessment`, `generate-dpa`, `run-cppa-risk-assessment`, `run-cppa-cybersecurity`, `run-admt-checker`, `run-li-assessment`, `run-dpia-framework`, `check-biometric-compliance`, `run-registration-assessment`.

- **QB9-9** `supabase/functions/run-registration-assessment/index.ts`
  - In the jurisdictions mapping, for the UK/ICO entry when `filing_fee_cents` is non-null, append the ICO fee-tier sentence to `notes` (single-space separator, create `notes` if null). HARD-STOP if the mapping does not match.

## Verification (post-edit, pre-report)

Run the 10-item checklist from the doc (§ Verification checklist), all greps must return the sentinel phrases; confirm zero occurrences of rule text beginning with "QB9-" in prompt strings.

## Notes

- No prompt-string may begin with "QB9-"; the token appears only in code comments and the console.log build marker.
- No rewording — any divergence in a locate target triggers HARD-STOP with a report of the actual code, not an improvised substitute.
- Redeploy + QL2 execution are John's steps after commit; not part of this plan.
