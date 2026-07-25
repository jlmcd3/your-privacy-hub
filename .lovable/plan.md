# Non-CPPA Corpus Usage Inventory

Report only. No code, no ledger changes. Function directory names verified against `supabase/functions/`. All findings backed by file:line evidence from parallel read-only inspection.

Legend for §5: `citation-lint` = `_shared/output-lint.ts`; `VA resolver` = `_shared/verified-authority-resolver.ts` (CPPA-only registry gate); `emit-gate` = `_shared/emit-gate.ts`; `fact-ledger` = `_shared/intake/fact-ledger.ts`; `report-serialize` = `_shared/report-serialize.ts` + `_shared/report-schemas/*`.

---

## 1. `generate-eu-notice`

1. **Corpus reads:** NONE at generation time. Only session/answer tables (`eu_notice_sessions` `index.ts:693,750,768`; `eu_notice_answers` `:788`; `eu_notice_framework_selections` `:784`; `clients` `:730`; storage bucket `:836,856`).
2. **Injection:** No LLM. Fully deterministic HTML template built by `buildNoticeSections()` (`index.ts:210-352+`) — hardcoded prose (Art. 9(2) map `:245-254`, Art. 14(3) timing `:284`, Art. 6 examples `:119-124`).
3. **Verbatim status:** Hardcoded developer-written prose, cross-checked *offline* by `lint-deterministic-legal-text` against `gdpr_articles`/`cppa_authorities` (`legal-text-assertions.ts:44-59`; linter `lint-deterministic-legal-text/index.ts:51-67`). Not verbatim-injected at runtime and not model-cited — third category: statically pinned templates.
4. **Enforcement actions:** Not used. Zero references in the file.
5. **Guards:** Static-manifest lint via `EU_NOTICE_LEGAL_TEXT_ASSERTIONS` (`index.ts:33-34`) — admin-triggered, not deploy-gated. No fact-ledger / emit-gate / VA resolver / report-serialize wiring.

---

## 2. `run-dpia-framework`

1. **Corpus reads (via helpers):**
   - `gdpr_articles` — `_shared/gdpr-context.ts:92,108` (called `index.ts:991-997`).
   - `gdpr_recitals` — `gdpr-context.ts:130`.
   - `edpb_guidelines` — semantic RPC `match_edpb_guidelines` `gdpr-context.ts:149-155`.
   - `enforcement_actions` — indirect via `get-enforcement-context` invoke (`index.ts:980-990`).
   - Own state: `dpia_frameworks` (`index.ts:1326,2389`), `governance_assessments` (`:960-962`).
   - No `cppa_authorities` / `national_provisions` / `legislation_bills` / `regulator_profiles`.
2. **Injection:** Prompt interpolation — `gdprBlock` folded into `orgContext` at `index.ts:1175`; enforcement precedents formatted `:1128-1138` into user prompt `:1177-1178` under `ENFORCEMENT PRECEDENTS ([E1]-[E5])`. Deterministic post-gen jurisdiction/authority naming via `dpia-jurisdiction-registry.ts` (`resolveDpiaJurisdiction` `:15,1048`; `backfillDpiaAuthorities` `:1847`; `correctOssTemplateFromRecord` `:1868`).
3. **Verbatim status:** GDPR article/recital `body_text` injected unchanged (`gdpr-context.ts:179,183`). EDPB explicitly labeled non-verbatim (`:186`). Enforcement fields row-sourced verbatim (`:1128-1136`). Model forbidden from training-knowledge cites (`:1180`; `DPIA_TOOL_MODULE.extraRules :76`); ICO figures whitelisted `:96`.
4. **Enforcement actions:** Yes — filters `{tool:"DPIA", regime, data_categories, jurisdictions, sector, articles:["gdpr:35","gdpr:36"], limit:5}` `:980-990`. All case fields row-sourced; unverified fines suppressed `:1132-1135`; model only decides where to place `[E#]` in `annotations` `:1180`.
5. **Guards:** `lintReportText`/`hasHardViolations` (`:1717-1742`); `detectBlacklistPhrases`/`detectTestStatesLeak` (`:1807-1808,1826-1837`); `verifyCitationPairs` (`:1953-1990`); `guardInformationNeeded` (`:2108`); `logPostGenLint` (`:1925-1933`). **BUG:** `getGdprContext({articles:[...]})` at `index.ts:1942` uses wrong arg shape (expected `(supabase, opts)` per `gdpr-context.ts:67`), throws silently under fail-open catch → citation-pair verifier's `gdprCites` is always empty. No emit-gate / fact-ledger / report-serialize / VA-resolver (CPPA) wired.

---

## 3. `run-li-assessment`

1. **Corpus reads:** Same helpers as DPIA — `gdpr_articles` (`gdpr-context.ts:92,107`), `gdpr_recitals` (`:130`), `edpb_guidelines` semantic RPC (`:149-155`); `get-enforcement-context` invoke `index.ts:697-708`. Own state only: `li_assessments` (`:597,1446`), `li_tracker_entries` (`:790`). Explicit guard `:672-675` throws if regime not gdpr/uk_gdpr — CPPA tables correctly out of scope.
2. **Injection:** Prompt interpolation into analysis-stage system prompt. `gdprBlock` (DB) + `gdprCitations` (deterministic from `renderGdprCitationBlock` `_shared/dpia-jurisdiction-registry.ts:651-673`) concatenated into `analysisInjected` `:862-869`, passed as `injected` to `buildSystemContent` `:871-875`. Enforcement duplicated into system + user (`:865, 916-917, 928-929`). Hand-authored constant `EDPB_1_2024_AUTHORITY` `:117` (paraphrase, baked-in); drift-checked async by `verifyEdpb12024AgainstCorpus` `:68` (advisory only).
3. **Verbatim status:** GDPR articles/recitals verbatim from `body_text`. EDPB explicitly paraphrase (`gdpr-context.ts:186`). `EDPB_1_2024_AUTHORITY` paraphrase. Article-6 examples/SA names gated to injected block by prompt rule `:114-115` (not mechanically enforced).
4. **Enforcement actions:** `{tool, regime, data_categories, jurisdictions, sector, articles:["gdpr:6"], limit:5}` `:697-708`. Rows tagged `[E1]-[E5]`; `precedentById` lookup validates model's `[E#]` IDs `:745-746, 1146-1191`; `fine_verified` suppresses fine `:924, 1151, 1162`. **Semi-gap:** `li_tracker_entries` supplies a "tracked precedents" corpus (`:790`) where `closest_accepted_precedent`/`closest_rejected_precedent` can be model-synthesised "reference categories" not row-sourced (`:152,157,159`).
5. **Guards:** `lintReportText`/`hasHardViolations` (`:14, 1061-1108`); `observeCitations` (`:1639-1646`); `detectBlacklistPhrases` (`:1324,1338,1587`); `guardInformationNeeded` (`:1582`); `precedentById` cross-check (`:1146-1191`); EDPB corpus consistency (`:68`). No corpus-pin test, no emit-gate, no fact-ledger, no report-serialize, no VA-resolver.

---

## 4. `generate-dpa`

1. **Corpus reads:** `gdpr_articles` (`gdpr-context.ts:90-93,104-108`) + `gdpr_recitals` (`:126-131`) + `edpb_guidelines` RPC (`:148-152`), called from `index.ts:544-552`. `enforcement_actions` via `get-enforcement-context` fetch (`index.ts:500-516`). No `cppa_authorities` / `national_provisions` reads in this function or `_shared/gdpr-context.ts`.
2. **Injection:** Prompt interpolation. `gdprBlock` appended to system prompt `index.ts:1298-1301` labelled "verbatim — do not alter it" with an "ART. 28(3) FIDELITY" instruction. `enforcementBlock` (`:557-570`) interpolated multiple times (`:865-867, 1005, 1120, 1160, 1201`). Deterministic post-gen present but only for: `suppressSubProcessorFramework` (`:232-262`) and `stripEnforcementTags` (`:13`).
3. **Verbatim status:** Instructed-verbatim, not code-enforced. Corpus text handed to LLM; no diff assertion vs `gdpr_articles`. `legal-text-assertions.ts` is **not imported** here (contrast eu-notice / ropa / us-notice which do).
4. **Enforcement actions:** Delegated to `get-enforcement-context`; SQL filters at `get-enforcement-context/index.ts:107-121`. Fields row-sourced via `fmtFine`/`fmtYear` (`index.ts:290-297`), formatted as `[E{n}] id:...` `:557-570`. Model must cite exact `id:` in `enforcement_action_id` (`:747, 806`); "NO ENFORCEMENT FROM MEMORY" rule `:731`; ID hygiene rule `:773` enforced by `stripEnforcementTags` (`_shared/enforcement-id-hygiene.ts`, `:13`).
5. **Guards:** `lintReportText`/`hasHardViolations` (`:7, 1458, 1609`); `logPostGenLint` (`:12`); `observeCitations` (`:18, 1712`). No corpus-pin test. No `legal-text-assertions`. `emit-gate` type union excludes DPA (`emit-gate.ts:32-35`). No fact-ledger. No report-serialize — uses ad-hoc JSON shape (`:1559-1560`). No VA-resolver.

---

## 5. `run-governance-assessment`

1. **Corpus reads:** `gdpr_articles`/`gdpr_recitals` via `getGdprContext` (`index.ts:1181-1189`); `edpb_guidelines` RPC. `enforcement_actions` via `get-enforcement-context` invoke `index.ts:1086-1107`. Own state: `governance_assessments` via `lifecycleUpdate` `:1375-1382`. No `cppa_authorities` / `national_provisions` / `jurisdiction_requirements` — SA/national-provision data comes from static registry.
2. **Injection:** Two-stage. **Domain stage** system prompt gets only `gdprCitationsBlock` (static registry) — comment `:1175-1176` "L5 GOVERNANCE INJECTION (synthesis stage only)... Domain stage is untouched." **Synthesis stage** system prompt (`:1195-1204`) gets `gdprCitationsBlock` + `gdprAuthorityBlock` (DB-sourced) + `enforcementContextStr`. Enforcement also duplicated into synthesis user prompt (`:1130-1131`).
3. **Verbatim status:** GDPR articles/recitals verbatim `body_text` (`gdpr-context.ts:181-190`) with instruction `:1188`. EDPB explicitly paraphrase-permitted `gdpr-context.ts:191-193`. Enforcement = structured-field summary (not full-text prose) `:1109-1119`. Regulatory basis / CCPA / Va. Code citations for state-law are **model knowledge** — prompt gives only *example* format `:1015-1016`, no row-sourced allowlist beyond post-hoc regex scrubs.
4. **Enforcement actions:** `{tool:"Governance", jurisdictions, sector, biometric, limit:5}` `:1087-1093`. Row-sourced structural fields interpolated in code. **Gap:** `annotations[].enforcement_action_id` is LLM-generated; **no server-side check** that the id exists in `enforcementPrecedents` (stored raw at `:1305`, never joined against `synthesis.annotations`).
5. **Guards:** `lintReportText`/`hasHardViolations` `:1246-1260`; `guardInformationNeeded` `:1329`; `information_needed` closure `:1170-1172`. Doc-y post-gen scrubs (`applyDocYPostGeneration` defined `:309-346`) — **verify call site**: greps did not locate an invocation; possibly dead code (open question). No corpus-pin, no VA-resolver, no emit-gate, no fact-ledger, no report-serialize.

---

## 6. `check-biometric-compliance`

1. **Corpus reads:** NONE against law tables. Only `biometric_assessments` (`index.ts:1326,1338,2049,2070,2092`). Statute text is entirely from static hand-authored `_shared/registry/biometric-statute-registry.ts` (verified verbatim rows with `pinpoint`+`verbatim_quote`+`primary_source_url`+`verification_date`, e.g. `:107-113, 225-231`). Enforcement via `get-enforcement-context` fetch `index.ts:1461`.
2. **Injection:** Registry selected deterministically by `selectApplicableRows(registryIntake)` (`index.ts:1679`; predicates `biometric-select.ts:151-194`). Rendered via `renderRegistryStatutesBlock` + `renderRegistryUnresolvedBlock` (`:1681-1682`) + `renderRegistryFor("biometric-checker")` (per `product-manifest.ts:17-23`; includes ICO figures + BIPA/CUBI/FDBR facts). Concatenated into `injected` for `buildSystemContent` `:1689`. Enforcement precedents formatted into user prompt `:1614-1615` via `formatEnforcementContext` (`:302`).
3. **Verbatim status:** Registry is human-verified verbatim statutory text (per header `biometric-statute-registry.ts:1-15`, "every quoted sentence MUST appear verbatim inside a supplied `verbatim_quote`"). Registry rows are static TS literals authored offline — no LLM in selection or wording. Model output constrained by compose directive `:1683`.
4. **Enforcement actions:** Fetched from `get-enforcement-context` (real `enforcement_actions` read at `get-enforcement-context/index.ts:160,178,193,217,240,360,380,395`; tiered filters `t1q/fb/sec/t2q/t3q`). Case identity/id row-sourced; `enforcement_action_id` required to exact-match a fetched id (`index.ts:1648-1657`); rulebook forbids inventing fines/case names `:54-56, 63, 100, 1568`. Natural-language `summary`/`relevance` are model paraphrase constrained to row content. ICO fines hardcoded `enforcement-figures-registry.ts:22-52` (not DB).
5. **Guards:** `biometric-statute-self-consistency.test.ts` (Vitest, `src/registry/__tests__/`) — **static CI check on registry file, not wired into edge function runtime**. No `biometric-statute-registry-corpus-pin.test.ts` (contrast admt/cyber/risk/registration-rail). `emit-gate` / `fact-ledger` / `report-serialize` / VA-resolver exist under `_shared/` but are **not imported** anywhere in `check-biometric-compliance/index.ts`.

---

## 7. `generate-ir-playbook`

1. **Corpus reads:** `gdpr_articles` `gdpr-context.ts:107-108` (called `index.ts:764`); `gdpr_recitals` `:130`; `edpb_guidelines` **direct** `index.ts:797` (filter `guideline_ref="EDPB Guidelines 9/2022"`, `status="final"`, overlap on `related_articles [33,34]`); `cppa_authorities` **direct** `index.ts:852` (`citation="Cal. Civ. Code § 1798.82"`); `ir_playbooks` own state `:634,668`; `enforcement_actions` via `get-enforcement-context` fetch `:720-733`. No `national_provisions` / `us_state_privacy_laws` — US-state deadlines are hardcoded in prompt `:56-71`.
2. **Injection:** Prompt interpolation into user-turn `INTAKE_BLOCK` `:886-924`, sentinel-wrapped `<<<INTAKE_BEGIN>>>...`. `gdprBreachBlock` (`:776-779`), `edpbGuidelineBlock` (`:820-828`), `caBreachBlock` (`:860-862`), and enforcement (`formatEnforcementContext :504-524`) all appended at `:907, 924`. System-block instructions via `buildSystemContent` `:1035-1040`. IR rulebook baked hardcoded (`:39-99`).
3. **Verbatim status:** Mixed — deliberately labeled per-block. GDPR Art. 33/34 and CA §1798.82 verbatim ("SUPPLIED VERBATIM TEXT (cite … ONLY from this block, never from recollection)" `:777-778, 860-861`). EDPB 9/2022 verbatim excerpts `:821-826`. **Gap:** breach-deadline text for other US states (TX/NY/CO/VA/FL/WA/MA/OR/IL), Canada (PIPEDA/Law 25/PIPA/PHIPA), HIPAA is hardcoded in `IR_RULEBOOK :49-99`, not row-sourced — the most legally load-bearing content is prompt-baked, not verified against a corpus.
4. **Enforcement actions:** `{tool:"ir-playbook", jurisdictions, data_categories, breach:true, limit:10}` `:726-732`. Cited fields row-sourced via `formatEnforcementContext :504-524` (regulator/decision_date/source_url/fine_eur/fine_verified/key_compliance_failure/preventive_measures). Post-gen `verifyEnforcementBrackets` strips sentences whose `[E#]` cited figures don't match source row (`:1420-1455, 1457`). Hard-replace regex rewrites unrecognised `"Regulator (YYYY)"` to `[TO BE COMPLETED …]` (`:1586-1618`, rule GRADER-CAL-1-D1). Annotations require row-sourced ids `:1005-1016`.
5. **Guards:** `lintReportText` (`:7, 1462`); `lintBareCitations` (`:1461`); `detectBlacklistPhrases` (`:9, 1578`); instruction-leak regex (`:1570-1577`); cross-part consistency lint (`:1620+`); unknown-enforcement-citation hard replace (`:1586-1618`); `irSuppliedCitations` tracking (`:757, 785-787, 827, 863`) → `observeCitations` (`:1821-1829`). No emit-gate / fact-ledger / report-serialize / VA-resolver. No corpus-pin test.

---

## 8. `run-registration-assessment` (+ `generate-registration-docs`, `get-registration-assessment`)

1. **Corpus reads:** Only `jurisdiction_requirements` — `run-registration-assessment/index.ts:208-211, 410-413` and `generate-registration-docs/index.ts:410-413, 418-420`. Own state: `registration_assessments` (`run-…:601,611`; `get-…:25`), `registration_orders`/`registration_documents` (`generate-…:351,365,540,555,560`). **No** `cppa_authorities` / `gdpr_articles` / `regulator_profiles` / `enforcement_action*` reads in any of the three functions.
2. **Injection:** `run-registration-assessment` has **no LLM** — pure rules engine (`index.ts:177-638`). `generate-registration-docs` interpolates DB row fields (authority, law, thresholds, fee, renewal, notes) into user prompt (`buildUserPrompt :301-328`); system prompt built at `:441-446` via `buildSystemContent({toolModule: REGISTRATION_TOOL_MODULE, injected: registryInjections})` where `registryInjections :435-440` concatenates `renderGdprCitationBlock`, `renderAiActCitationBlock`, `renderTransferAdequacyNote` (all `_shared/dpia-jurisdiction-registry.ts`) and `renderIcoPenaltyFigures` (`_shared/enforcement-figures-registry.ts:66-80`). `RegistrationRailEntries.ts` is a **frontend rail** (`src/components/registration/RegistrationRailEntries.ts`), **never imported by either edge function**.
3. **Verbatim status:** `run-registration-assessment` — all statutory basis strings are hand-written paraphrase in `index.ts:50, 64, 71, 92, 275-295`; `jurisdiction_requirements` supplies structured flags only, no prose. `generate-registration-docs` — LLM paraphrase from structured facts, plus verbatim-controlled registry blocks (hardcoded strings). `RegistrationRailEntries.ts` — `corpusPinned:true` rows (e.g. `:184, :198`) verbatim-substring against `cppa_authorities.full_text` (only place any registration corpus pin exists).
4. **Enforcement actions:** None in `run-registration-assessment` or `get-registration-assessment`. `generate-registration-docs` injects hardcoded ICO penalty list (4 entries: Clearview, BA, Interserve, Capita) from `enforcement-figures-registry.ts:22-61` — not row-sourced; each entry carries a `trainingTrap` warning.
5. **Guards:** `registration-rail-corpus-pin.test.ts` guards the **frontend rail file only**, skipped without `PGHOST`/`PGDATABASE` (`:25-27`). `citation-audit.ts` (`auditCitations` Haiku check) wired in `generate-registration-docs` `:14, 280-298`. `lintReportText`/`hasHardViolations` wired `generate-…:11, 501-527`. SA resolver (`competentSA`, `leadAuthorityAndOSS`, `validateJurisdiction`) exists in `dpia-jurisdiction-registry.ts` but **is NOT called** by any of the three — only the citation-block renderers are used. No emit-gate / fact-ledger / report-serialize in any of the three.

---

## Cross-cutting observations (report only)

- **Shared corpus surface:** GDPR text is uniformly delivered through `_shared/gdpr-context.ts` (`gdpr_articles`, `gdpr_recitals`, `match_edpb_guidelines` RPC) with verbatim-inject discipline; EDPB semantic hits explicitly non-verbatim by design.
- **Enforcement surface:** All non-CPPA tools that use enforcement do so via the `get-enforcement-context` edge function fetch (never direct `enforcement_actions` reads), which returns tiered, cached row data. Field provenance is row-sourced across all callers; the strongest downstream check is IR playbook's `verifyEnforcementBrackets` + hard-replace, then DPA's `stripEnforcementTags` + id-only annotations, then DPIA/LIA's `[E#]` + `precedentById` cross-check. **Governance is the weakest** — no server-side check that `annotations[].enforcement_action_id` matches any fetched row.
- **VA / fact-ledger / emit-gate / report-serialize:** All CPPA-only. None wired into any non-CPPA generator. `emit-gate.ts:32-35` `EmitGateTool` union structurally excludes non-CPPA tools.
- **Corpus-pin tests:** Only present for admt/cyber/risk verified-authority registries and `registration-rail-corpus-pin.test.ts` (frontend rail). No corpus-pin coverage for: eu-notice legal-text assertions (has manifest but not a pin test), DPIA, LIA, DPA, Governance, IR playbook, biometric registry (`biometric-statute-self-consistency` checks *internal* consistency, not corpus match).
- **Highest hallucination-risk surfaces identified:**
  1. Governance state-law citations (CCPA/state statute) — model knowledge with no row-backed allowlist (`run-governance-assessment/index.ts:1015-1016`).
  2. Governance enforcement `annotations` — no server-side id-existence check.
  3. IR playbook US-state/Canadian/HIPAA breach-deadline prose — hardcoded in `IR_RULEBOOK :49-99`, not corpus-verified.
  4. DPIA citation-pair verifier — silently degraded by malformed `getGdprContext` call (`index.ts:1942`).
  5. DPA Art. 28(3) fidelity — instructed-verbatim, no code-level diff vs `gdpr_articles`.
  6. LIA `closest_accepted_precedent`/`closest_rejected_precedent` from `li_tracker_entries` — may be model-synthesised "reference categories".

## Open items flagged (for the follow-on design turn)

- Governance `applyDocYPostGeneration` call site not located — possibly dead code (`run-governance-assessment/index.ts:309`).
- DPIA `getGdprContext({articles:[...]})` malformed call (`index.ts:1942`) — silent fail-open.
- Whether `lint-deterministic-legal-text` runs as a deploy gate or ad-hoc only (CI config not inspected).
- Whether `_shared/dpa-*.ts` modules read corpus tables outside `generate-dpa/index.ts` (not audited).
