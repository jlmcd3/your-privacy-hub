# Fixture panel brief — 15 perfect intakes per product

You are authoring a **fixture panel** for one or more EndUserPrivacy products: fifteen complete, internally consistent dummy intakes each, committed as TypeScript under `supabase/functions/_shared/review/panels/<tool>.ts`. The /all-ptest review loop picks one at random per product per batch and runs the real product on it, so every fixture must be something a real organisation could have entered on the form — and nothing in it may contradict anything else in it.

## The file you write

`supabase/functions/_shared/review/panels/<tool>.ts` already exists as a stub exporting an empty array. Replace the array with fifteen `PanelFixture` objects (type in `./types.ts`):

```ts
{
  id: "<tool>-p01-<short-slug>",     // p01 … p15, in order, lower-case slug
  tool: "<tool>",
  label: "one line a reviewer recognises the scenario by",
  company: "Exact legal name used inside the intake",
  sector: "Plain-words sector",
  geo: "us" | "eu",                   // must be allowed for the tool (PANEL_TOOL_GEO in types.ts)
  summary: "2–3 sentences: the scenario and which branches of the product it exercises.",
  intake: { ... }                     // the harness fixture, verbatim
}
```

`company` must equal the entity name inside the intake (`entity_name` for cppa-risk, `organization_name` for admt/dpia/lia/governance/registration, `profile.company_name` for cyber, `organizationName` for ir-playbook, `orgName` for biometric, `entityName` for dpa, `org_name` for ropa, `business_name` for us-notice, `controller_name` for eu-notice). Fifteen **different** organisations per panel, across sectors and sizes, with realistic but clearly fictitious names (no real companies; no real people's names of public figures).

## What "perfect" means (the test enforces the checkable part)

1. **Shape**: the intake is exactly what the stress harness accepts for the tool — the object `generate-stress-fixtures` returns under `TOOL_FIXTURE_KEY[tool]` and `run-stress-job` consumes in its `case "<tool>"` arm. Read both before writing anything (`supabase/functions/generate-stress-fixtures/index.ts` — the deterministic builders `buildDeterministicProfile` / `buildDeterministicGeo` / `buildAdmtFallback` / `getRopaActivitiesForSector`; `supabase/functions/run-stress-job/index.ts` lines ~195–560).
2. **Contract**: zero violations from `validateIntake(contract, intake)` — the contract files are `supabase/functions/_shared/intake-contracts/<tool>.ts` (and `run-stress-job/_local/intake-contracts/` for us-notice, eu-notice, registration). Every `enum` / `multi-enum` value is a **verbatim** option string; every `required: "always"` field is answered; every `required: "conditional"` field is answered when its trigger applies and carries its `hiddenValue` (or is absent) when it does not; no top-level key outside the contract; multi-enum `exclusive` options never sit beside another option. Read the contract in full — it is the form.
3. **Complete**: every field a real organisation of that kind could answer IS answered. "Perfect" is the truly-complete record, not the minimum. Narratives are specific (names, numbers, dates, systems, vendors), never boilerplate, never the same sentence across fixtures.
4. **Internally consistent** — the reason this panel exists. Nothing in the record contradicts anything else: dates in order (approval never after the assessment; a "planned" safeguard has a future date; a "prior assessment" only when one is recorded), yes/no answers match their own narratives (a "No" to sensitive data means no sensitive category anywhere in the record), counts match lists, a named vendor is named consistently, the sector matches the activity, the jurisdiction matches the legal-form suffix (GmbH ⇒ Germany, B.V. ⇒ Netherlands, Ltd ⇒ UK/IE, Inc./LLC/Corp. ⇒ US, SE ⇒ any EU state), the geo matches the tool.
5. **Varied**: the fifteen together should exercise the product's main branches (for example cppa-risk: ADMT yes/no, sensitive PI yes/no, selling/sharing yes/no, planned vs implemented safeguards, prior assessment recorded or not, secondary uses or not; dpia: high-risk triggers of different kinds; biometric: single-state vs multi-state, employee vs consumer). Say which branches each fixture exercises in its `summary`.
6. **Model fixtures to copy the shape from** (read them; do not copy their prose): the `*_PERFECT` cases in `supabase/functions/quality-batch-orchestrator/_local/golden/` (`cppa-risk.ts` CPPA_RISK_PERFECT, `cppa-admt.ts` ADMT_PERFECT, `cppa-cyber.ts` CYBER_PERFECT, `dpia.ts` DPIA_PERFECT, `governance-perfect.ts`, `ir-perfect.ts`, `lia-perfect.ts`, `biometric-perfect.ts`, `dpa.ts`, `registration.ts`), and `src/lib/sampleFixtures.ts` for ropa / us-notice / eu-notice.

## Product notes

- **cppa-risk**: the contract is 64 KB; read all of it. Nested objects (`impact_intake`, `exceptions_intake`, `admt_detail`) are part of the record. Keep `harm_category_review_status` structured and every named harm assessed. `a6_safeguards[]` rows carry an implementation status and are keyed to a risk pathway.
- **cppa-cyber**: `profile.*` plus eighteen `controls[]` (one per § 7123(c) component) each with `maturity` (verbatim option), `notes`, `evidence[]`; a dated commitment in `notes` must be in the future relative to 2026-09-14 unless the scenario is deliberately about overdue work (then say so in the summary).
- **cppa-admt**: vendor yes/no branches, opt-out pathway vs exception, human involvement; `organization_name` and `system_name` set.
- **ir-playbook**: `discoveryDateTime` is overwritten by the harness with "now" — still supply a plausible ISO value; keep contract enums verbatim.
- **lia**: only the columns run-stress-job whitelists reach the table (see `LIA_COLUMNS` in run-stress-job) plus contract keys; do not add `preview_assessment_id`.
- **ropa** (no contract): persona with `org_name, sector, legal_entity_type, employee_band, dpo_name, dpo_email, rights_handling_process, jurisdictions: [{code,name,region}], activities: [...]`, and **every** activity answers all of `ROPA_ACTIVITY_ANSWER_KEYS` (`run-stress-job/_local/ropa-rows.ts`); categories from the nine enum values in run-stress-job (`hr_employment, marketing, customer_service, patient_records, technology, finance_legal, third_party, operations, other`). At least four activities.
- **us-notice / eu-notice / registration**: contracts in `run-stress-job/_local/intake-contracts/`; the harness writes each top-level key as an answer row, so no nested objects unless the contract has them.

## How you verify (mandatory before you report)

```
deno test --no-check --allow-read --allow-env tests/edge/ptest/panels.test.ts --filter "[<tool>]"
```

It checks the count, ids, metadata, distinct companies, geo, entity-name equality, the full contract, and (for cppa-risk / cppa-admt / cppa-cyber) that each fixture generates a document offline with no lint defect. Iterate until it is green. Also run `deno check supabase/functions/_shared/review/panels/<tool>.ts`.

Do not edit any file other than your panel file(s). Do not change the test, the contracts, the products or the brief. If a contract makes a "perfect" answer impossible (a required field with no sensible value), say so in your report instead of working around it.

Report: the fifteen ids with one line each, the branches covered, and any contract oddity you hit.
