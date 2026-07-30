# ITEM 282 — WAVE 1 S0: `cppa-cyber` PRE-MIGRATION AUDIT

**Authority:** CEO fleet-rebuild directive 2026-07-30; Product Rebuild Plan v1.0 §3 S0 / §6.1 / §7.2.
**Turn class:** DOCS-ONLY. No code change, no deploy, no harness invocation, no migration, no DB write.
**Clock:** 2026-07-30T10:16Z (sandbox `date -u`, read immediately before writing).
**Subject build:** `supabase/functions/run-cppa-cybersecurity/index.ts`, `BUILD_STAMP = "w21-cyber-turnc@2026-07-25T12:53:27Z"` (`index.ts:15`).

Everything below is VERIFY-FIRST: each finding carries a `file:line` or a query result. Nothing is inferred from the risk product by analogy.

---

## DELIVERABLE 1 — THE 15-ITEM AUDIT

| # | Audit item | Finding | Evidence (file:line / query) | Disposition |
|---|---|---|---|---|
| 1 | Architecture class | Monolithic single-file generator: two controls halves + one synthesis call, assembled in-process. NOT an LTP product — no Pass-1/Pass-2 seam, no section composers, no pass2-assembler. | `index.ts:625` (`callControlsHalf`), `index.ts:971` (`callSynthesis`), `index.ts:977-986` (assembly) | **MIGRATE** — full LTP port required; nothing to reuse at the pipeline layer. |
| 2 | Output shape | `report_data = { executive_summary, overall_score, readiness_level, controls[18], top_risks[], enforcement_context, next_steps[≤3], annotations[] }`. | `index.ts:977-986` | **CARRY FORWARD** — this is the shape both surfaces bind to; the LTP rebuild must preserve it or migrate both surfaces in the same turn. |
| 3 | Clock budget | Single `AbortSignal.timeout(900_000)` (15 min) on the Anthropic wrapper — no per-attempt budget, no stage ceiling, no reserve. Violates the CLOCK-BUDGET LAW (Items 197-203) that governs the risk engine. | `index.ts:231` | **DEFECT (pre-existing, non-blocking).** Fix during the LTP port; do not patch this turn. |
| 4 | Retry structure | One 1.5× max-token retry per LLM call, plus a post-lint surgical re-run of the offending half. Ad-hoc, not the `PASS2R`-style bounded-attempt structure. | `index.ts:639`, `index.ts:666`, `index.ts:989-1052` | **REPLACE** at port time with the bounded attempt/ceiling structure. |
| 5 | Leak prevention P1/P2 | Emit-gate (P1) and whitelist serializer (P2) both run before `terminal_complete`. Tool id `cppa_cybersecurity` is registered in the shared gate. | `index.ts:1865`, `index.ts:1877`, `index.ts:1891`; `_shared/emit-gate.ts:36` | **COMPLIANT** — carry forward unchanged. |
| 6 | Dispatch pattern | `EdgeRuntime.waitUntil` + 202 Accepted, persist-first. Matches the Item 197-203 law. | `index.ts:1930`, `index.ts:1968` | **COMPLIANT.** |
| 7 | Ping / surface map | **ABSENT.** No ping surface, no declared-vs-actual manifest assertion (the risk engine has one). External verification currently relies on the boot log line alone. | `index.ts:16` (boot log) — no ping route found in the file | **DEFECT (pre-existing).** Add at port time; required by Plan v1.0 §7.2. |
| 8 | RLS / entitlement | Table `cppa_assessments`: owner-ALL (`user_id = auth.uid()`), admin SELECT via `has_role`, service_role ALL; `GRANT`s present; billing columns locked by trigger `lock_purchase_cols`. The generator itself runs on the service-role key and performs **no in-function ownership or entitlement re-check**. | `pg_policies` on `cppa_assessments`; `20260606133328_*.sql:1-2` (grants); `20260711024739_*.sql:68-70` (trigger); `index.ts:181`, `index.ts:1860` | **ACCEPTED-WITH-NOTE.** Row is fetched by id under service role; caller authorization is enforced upstream at the page/invoke seam only. Same posture as the risk engine pre-Item-217. Record; do not change this turn. |
| 9 | Intake operand coverage vs § 7120(b) | The contract collects `{ profile: { entity_name, industry, incidents_12mo, framework, last_audit }, controls[18] }`. **None of the § 7120(b) threshold operands is collected** — no gross-revenue band, no consumers/households count, no sensitive-PI consumer count. Applicability and the § 7121(a) cohort are therefore handled as prose caveats, never as deterministic booleans. | `_shared/intake-contracts/cppa-cybersecurity.ts:1-50`; `index.ts:118`, `index.ts:557`; corpus `cppa-7120` verbatim (§ 7120(b)(1), (b)(2)(A) 250,000, (b)(2)(B) 50,000) | **BLOCKING FOR THE REBUILD.** This is the cyber analogue of the Item-275 primary-activity intake gap: the engine cannot compute the applicability test it is named after. S1 of the cyber rebuild must add the three operands. |
| 10 | Person-list / PII loops | No person-list iteration in the generator; the only free-text person surface is intake `notes` per control. Owner-slot exposure is limited to the `next_steps[].owner` function name (a role, not a person) per the QB-P25 schema. | `index.ts:755` (next_steps coercion); QB-P25 schema rule at `index.ts:144` | **LOW RISK.** Apply the Item-273 `sanitizeRoleTitleSegments` hardening at port time as a belt-and-braces measure. |
| 11 | Harvested law modules | `_shared/ltp/cyber-audit-schedule.ts` holds `CYBER_AUDIT_SCHEDULE_STAMP` plus the § 7121(a) phase-in literals (Apr 1 2028 / 2029 / 2030 by revenue band) as stated law — harvest class, no computation. | `_shared/ltp/cyber-audit-schedule.ts:25-34` | **REUSE AS-IS** in the LTP port (deadline-module pattern, same class as `cppa-risk-deadlines.ts`). |
| 12 | Quality-mining history | 143 scored docs. Mean 85.47, min 63.0, max 94.70. Band split: ≥90 = 40; 80-89 = 76; 70-79 = 23; <70 = 3. Top scorer 94.70 (`8611dfda`, claude 94.70 / gpt 92). | `quality_run_documents` where tool = cyber family | **BASELINE PINNED** — this is the pre-migration bar the LTP rebuild must not regress below. |
| 13 | Failed-finding classes | Ranked by absolute failures: `rubric_generic_boilerplate` (analysis, medium) 139F/93P, avg fail-rate 0.611; `rubric_actionability` (intelligence, medium) 111F/90P, 0.562; `rubric_citation_misapplied` (citation, **high**) 80F/109P, 0.396; `rubric_unsupported_business_claim` (hallucination, **high**) 78F/85P, 0.473; `ql2:cppa-cyber` (overall) 64F/0P, 1.000; `rubric_internal_reasoning_leak` (hallucination, high) 7F/111P, 0.049 and (formatting) 5F/20P, 0.111; `e6_counsel_referral` (hallucination, high) 4F/2P, 0.750. | `quality_check_results` aggregate, tool = cyber family | **TARGET SET.** The two high-severity classes (misapplied citation, unsupported business claim) are exactly what §2R prose validators + the registry-corpus pin test address. |
| 14 | Loop-2 recurring defects | 9 loop-2 rows, avg 95.7-98.2 — all *drafting* defects, not scoring defects. Three recurrences: (i) truncated citation in the Segmentation control finding ("lists segmentation of the information system **at** and does not list…" — dangling `at`, missing `§ 7123(c)(10)`), 4 separate rows; (ii) § 7122(g) five-year retention stated without a retention anchor; (iii) § 7121(a) cohort framed off *2026* gross revenue while the run date is inside 2026 (revenue not yet knowable) — a temporal-coherence defect; (iv) Cal. Civ. Code § 1798.91.04(b) scope misstated / word "connected" dropped. | `quality_loop2_results` where product ilike '%cyber%' (9 rows; `6efe1922`, `a87d3feb`, `95d59776`, `a230405b`, `50add936`, `867da557`, `b4c79387`, `8a808f2a`, `8915dc35`) | **CARRY INTO THE REBUILD AS PINS.** (i) and (iv) are deterministic-detectable; (iii) is an era-normalizer case already solved for risk (`_shared/ltp/era-normalize.ts`, Item 269) — port it. |
| 15 | Hardcoded date claims on the customer surface | The viewer opens with a fixed red banner: "Compliance deadline: April 1, 2028" for **every** report, irrespective of the business's § 7121(a) revenue cohort (2029 / 2030 bands exist). The generator prompt forbids exactly this ("Never present a readiness deadline earlier than the business's applicable phase-in date", `index.ts:114`) — so the prompt is disciplined and the *viewer* is not. | `src/components/cppa/CybersecurityReportBody.tsx:33-40`; prompt rule `index.ts:114`; schedule literals `cyber-audit-schedule.ts:25-34` | **DEFECT (customer-facing, pre-existing).** Cohort-correct the banner. Not fixed this turn (docs-only); queued for the cyber rebuild S1 alongside item 9 (the banner cannot be cohort-correct until the revenue operand is collected — items 9 and 15 are the same root cause). |

---

## DELIVERABLE 2 — SEAM-17 VERIFICATION (generator → exporter → viewer)

Three surfaces bind the cyber `report_data`. Verified key-by-key.

**Generator emits** (`index.ts:977-986`): `executive_summary`, `overall_score`, `readiness_level`, `controls[]` (each with `control`/`label`, `status`, `score`, `finding`, `regulatory_basis`, `remediation`, and the QB-P25 additions `evidence`, `differentiator`, `rank`), `top_risks[]`, `enforcement_context`, `next_steps[]` (objects `{ text, owner, trigger }`, legacy strings tolerated — coercion at `index.ts:755`), `annotations[]`.

**Suite PDF exporter** (`supabase/functions/generate-cppa-suite-pdf/index.ts`, `renderCyber` at `:125-167`):

| Key | Exporter treatment | Verdict |
|---|---|---|
| `executive_summary` | rendered, `:139` | parity |
| `overall_score` / `readiness_level` | rendered as pills, `:136-137` | parity |
| `enforcement_context` | rendered as callout, `:142` | parity |
| `controls[]` → `control`/`component`, `status`, `finding`, `regulatory_basis`, `remediation` | rendered, `:146-151` | parity |
| `controls[].evidence`, `.differentiator`, `.rank` | **NOT RENDERED** | **DIVERGENCE 1** — the QB-P25 reader-facing audit-prep record (designed output, `index.ts:144`) is silently dropped from the PDF. Present on screen, absent in the deliverable. |
| `top_risks[]` | rendered, capped to 3, `:154-160` | parity (cap is exporter-only; note it) |
| `next_steps[]` | `<li>${esc(s)}</li>` at `:164` — **s is an object**, so the PDF renders `[object Object]` for every post-QB-P25 report. The sibling `renderRisk` handles objects defensively at `:120` (`s?.step_label \|\| s?.action`); `renderCyber` does not. | **DIVERGENCE 2 — CUSTOMER-VISIBLE, HIGH.** |
| `annotations[]` | not rendered (by design — screen-only callouts) | accepted |
| structural guard | 409 `report_body_empty` when `controls[]` empty, `:314-316` | compliant; no guard on `next_steps` shape |

**On-screen viewer** (`src/components/cppa/CybersecurityReportBody.tsx`): binds the same long keys (`report.executive_summary` `:60`, `report.overall_score` `:49`, `report.readiness_level` `:54`, `report.controls` `:184`, `report.top_risks` `:331`, `report.next_steps` `:347`, `report.annotations` `:168`, `report.citation_ledger` `:23`) and **does** handle `next_steps` objects (`{ text, owner, trigger }`, legacy strings tolerated, `:347-352`). So the viewer is correct and the exporter is wrong — the exact class of viewer/PDF shape divergence that Item 274 fixed for `cppa-risk`.

**SEAM-17 VERDICT: NOT AT PARITY.** Two divergences, both exporter-side, both pre-existing, neither fixed this turn (docs-only). Divergence 2 is customer-visible and should lead the cyber rebuild's S1 fix list. Note also that the viewer reads `report.citation_ledger`, which the generator's assembly block does **not** emit at `:977-986` — a third, benign (empty-render) asymmetry worth closing at port time.

---

## DELIVERABLE 3 — CORPUS CHECK (11 CCR §§ 7120-7124)

`provision_texts`, `jurisdiction = US-CA`, all rows `status = approved`:

| Key | Citation | Length | Last verified |
|---|---|---|---|
| `cppa-7120` | 11 CCR § 7120 (OAL-approved text, eff. 2026-01-01) | 1,075 | 2026-07-25T10:32Z |
| `cppa-7121` | 11 CCR § 7121 (OAL-approved text, eff. 2026-01-01) | 1,718 | 2026-07-25T10:32Z |
| `cppa-7122` | — | — | **ABSENT** |
| `cppa-7123` | — | — | **ABSENT** |
| `cppa-7124` | — | — | **ABSENT** |

**FINDING — CORPUS GAP (blocking for the rebuild, not for this audit).** The cyber engine's entire substantive spine is § 7123(c) (the 18 components), § 7122 (audit conduct + the five-year retention rule cited in loop-2 defect (ii)), and § 7124 (executive certification). **None of the three is in the corpus.** Every § 7122/§ 7123/§ 7124 citation the engine emits today is model-supplied, unpinnable, and outside the registry-corpus pin test. That is a direct, mechanical explanation for the `rubric_citation_misapplied` high-severity class at 0.396 fail-rate (audit item 13) and for the truncated `§ 7123(c)(10)` defect (audit item 14(i)).

**REQUIRED PREDECESSOR:** verbatim ingestion of §§ 7122, 7123, 7124 — the same treatment §§ 7151-7156 received in Item 268 — must land BEFORE the cyber LTP port, not during it. Only §§ 7120 and 7121 can be pinned today.

---

## SUMMARY FOR THE CONTROLLER

- **Compliant, carry forward:** leak-prevention P0-P2 (item 5), persist-first dispatch (item 6), the harvested audit-schedule module (item 11), RLS/grants/column-lock posture (item 8).
- **Blocking predecessors to the cyber rebuild:** corpus ingestion of §§ 7122-7124 (Deliverable 3); § 7120(b) threshold operands added to intake (item 9, which also unblocks item 15).
- **Fix during the port:** clock budgets (item 3), retry structure (item 4), ping/surface map (item 7), era-normalizer port (item 14(iii)), owner-slot sanitizer (item 10).
- **Customer-visible defects found this turn, unfixed by design:** exporter `next_steps` `[object Object]` (Deliverable 2, Divergence 2); fixed "April 1, 2028" viewer banner ignoring the 2029/2030 cohorts (item 15).
- **Quality bar to beat:** mean 85.47 over 143 docs, max 94.70 (item 12).

No file outside `docs/` was touched.
