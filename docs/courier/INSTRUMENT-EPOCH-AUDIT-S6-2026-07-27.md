# INSTRUMENT-EPOCH-AUDIT s5 → s6 — Courier

**Turn ID:** INSTRUMENT-EPOCH-AUDIT-S6-2026-07-27
**Dispatch:** CEO-approved 2026-07-27 (instrument turn). Integrity directive: measurement is NEVER weakened; checks are RE-KEYED to where content now legitimately renders under the approved surface map. Gated after WAVE-B COMPLETION deploy (ledger item 154) so re-key targets exist.
**Status:** LANDED + DEPLOYED + WAVE-B.2 LAUNCHED
**Version bump:** `gc-2026-07-26-s5-eu-uk-ca-au-sg` → `gc-2026-07-27-s6-eu-uk-ca-au-sg`
**SHA-256 (`_shared/grader/context.ts`):** `e296d44c5cf56f3a1e8496c8295e0f0723465c409f93e79374885ca894a4bf8d`
**SHA-256 (`_shared/grader/amendments-block.ts`):** `3d8198cc6d3989265a173a73dc788b6030117ceaf2c178c31546b07f8acc99c2`
**Rubric text, dimensions, severity weights, thresholds:** UNTOUCHED.
**Certification counters:** reset noted (0/3 for all cppa-risk cohorts under s6); campaign `fd1be147` remains CEO-paused so no practical cost.

---

## §1 — Per-family audit with per-doc primary evidence (run 145 = `e1360a41-eb79-4b13-b60f-02e016850928`)

### 1.1 `qc_r1_4_cohort_determinism` (4 fails — critical)

Per-doc `submission_summary.submission_deadline` primary evidence (batch `fc6a8394-a265-4297-b086-805e183d2ee5`):

| doc | scenario | `q1_revenue` | resolved cohort (per `classifyRevenueBand`) | actual `submission_deadline` | disposition |
|-----|----------|--------------|---------------------------------------------|------------------------------|-------------|
| 1 | tuning  | `$25M to under $50M` | `2030-04-01` (April 1, 2030) | `April 1, 2028` | **WIRING DEFECT** — wrong cohort rendered |
| 2 | tuning  | `$25M to under $50M` | `2030-04-01` (April 1, 2030) | `April 1, 2028` | **WIRING DEFECT** — wrong cohort rendered |
| 5 | holdout | `$50M to $100M`      | `2029-04-01` (April 1, 2029) | `April 1, 2028` | **WIRING DEFECT** — wrong cohort rendered |
| 6 | holdout | `$25M to under $50M` | `2030-04-01` (April 1, 2030) | `April 1, 2028` | **WIRING DEFECT** — wrong cohort rendered |

**Verdict.** ALL FOUR failures are wiring defects — the correct cohort date is **ABSENT** from `submission_summary` in every failing doc. Per dispatch: *"Where it is ABSENT, that is a wiring defect — record it for a fix, do NOT re-key around it."* Recorded for a future deploy-guarded fix on the deterministic submission_deadline slot in `run-cppa-risk-assessment/_w9_risk_slots.ts` (owner surface). The dispatch's cited pattern ("run-145 doc 1 renders 'April 1, 2028' correctly") does NOT hold as a positive case — doc 1's resolved cohort is 2030, not 2028; recording accordingly.

**Re-key applied (substance preserved).** Scan window narrowed from full-report JSON to `report.submission_summary` — the approved surface-map render site for compliance cohort dates (`submission_deadline`, `submission_basis`, `deadline_basis`). ISO-vs-long-form parsing and indeterminate/legacy two-cohort framing UNCHANGED. This is a **surface anchoring** move — not a threshold change, not a phrasing widen, not a substance narrow. Full-report scan would pass on incidental year mentions in unrelated fields; the surface-anchored scan enforces the citation in its canonical surface. **Not weakened.**

### 1.2 `qc_r1_2_spi_prong_utilization` (5 fails — high)

Per-doc primary evidence — `submission_basis` head at run terminal:

| doc | `q15` | `q15c` | M4 state | § 7120(b)(2)(B) in `submission_basis` at terminal? |
|-----|-------|--------|----------|----------------------------------------------------|
| 2 | Yes | 50,000 or more    | resolved_not_applicable* | absent |
| 3 | No  | —                 | resolved_not_applicable  | absent |
| 4 | Yes | Fewer than 50,000 | resolved_not_met         | absent |
| 5 | Yes | 50,000 or more    | resolved_met             | absent |
| 6 | Yes | Fewer than 50,000 | resolved_not_met         | absent |

Wave-B `submission_basis` heads all match the shape `"§ 7121(a) cybersecurity-audit linkage; § 7220 ADMT pre-use notice linkage; triggered subsections: …"` — the deterministic crosswalk emitter did NOT append § 7120(b) prong clauses under s5 because the completion turn's `extendSubmissionBasisCrosswalk` (ledger item 154) had not landed. The completion turn is now deployed; the crosswalk emitter is live for Wave B.2.

**Re-key applied (substance preserved).** Scan window narrowed from full-report JSON to `report.submission_summary` — the approved surface-map render site where the crosswalk clauses now land (Type R, registry-anchored, zero LLM). SPI M4 resolution matching (`met` / `not met` / `not applicable`) UNCHANGED. **Not weakened** — full-report scan trivially passed if the string appeared anywhere; the surface-anchored scan enforces canonical placement.

### 1.3 `qc_r1_3_50pct_prong_utilization` (5 fails — high)

Per-doc primary evidence — sample evidence uniformly `"§ 7120(b)(1) not referenced despite resolved M5 (resolved_not_met)"` for the 5 failing docs. Root cause identical to §1.2: crosswalk emitter had not landed under s5.

**Re-key applied (substance preserved).** Scan window narrowed from full-report JSON to `report.submission_summary`. Per-state acceptable phrasing sets (met / not-met / insufficient-basis synonyms) UNCHANGED; `indeterminate` added to the insufficient-basis lane to match the crosswalk emitter's canonical `indeterminate` phrasing (this is a phrasing-recognition tweak in the SAME lane, not a new lane). **Not weakened.**

### 1.4 `e6_counsel_referral` — NO CHANGE

Wave-B proved this check catches real defects — it caught the PII leak (staff names, email, phone rendered into body text). **e6 VALIDATED; stays unchanged.**

### 1.5 CUT-surface sweep

Grepped `run-quality-batch/index.ts` for scans keyed to `scope_notes`, `cross_tool_recommendations`, or legacy `assessment_summary` shapes:

- **`scope_notes`** — no check scans it. Cut surface referenced only in generator code, `pass2-templates.ts` (marks it `CUT`), `risk-surface-map.ts` (marks it `CUT`), and `_t7_risk_pilotfix.ts` (F6 contradiction scrub upstream of cut). No re-key needed.
- **`cross_tool_recommendations`** — no check scans it. Cut surface referenced only in generator code, `pass2-templates.ts` (`CUT`), `risk-surface-map.ts` (`CUT`), `report-schemas/cppa-risk.ts` (CUT annotation), and the PDF renderer (backward-compat rendering). No re-key needed.
- **Legacy `assessment_summary`** — zero occurrences in `run-quality-batch/index.ts`. No re-key needed.

No dead-scan retirements this turn; the sweep found no orphaned check scans.

---

## §2 — Version bump, SHA, and evidence table

**Version:** `GRADER_CONTEXT_VERSION = "gc-2026-07-27-s6-eu-uk-ca-au-sg"` at `supabase/functions/_shared/grader/context.ts:16`.

**SHA-256:**
- `_shared/grader/context.ts` → `e296d44c5cf56f3a1e8496c8295e0f0723465c409f93e79374885ca894a4bf8d`
- `_shared/grader/amendments-block.ts` → `3d8198cc6d3989265a173a73dc788b6030117ceaf2c178c31546b07f8acc99c2`

**Certification counters reset noted:** cppa-risk `consecutive_ge98` resets to 0 for every s5-under-test cohort under the s6 epoch. Campaign `fd1be147` is CEO-paused → no practical cost.

**Re-key evidence table (old → new):**

| check id | s5 scan window | s6 scan window | substance change |
|----------|----------------|----------------|------------------|
| `qc_r1_2_spi_prong_utilization` | `JSON.stringify(report).toLowerCase()` (full report) | `JSON.stringify(report.submission_summary).toLowerCase()` | none — M4 resolution matcher unchanged |
| `qc_r1_3_50pct_prong_utilization` | `JSON.stringify(report).toLowerCase()` (full report) | `JSON.stringify(report.submission_summary).toLowerCase()` | phrasing-recognition tweak: `indeterminate` added to insufficient-basis lane (same lane) |
| `qc_r1_4_cohort_determinism` | `JSON.stringify(report).toLowerCase()` (full report) | `JSON.stringify(report.submission_summary).toLowerCase()` | none — ISO/long-form parsing and conditional framing unchanged |
| `e6_counsel_referral` | — (unchanged) | — (unchanged) | none |
| `qc_r1_1_no_asks_on_resolved_tests` | — (unchanged) | — (unchanged) | none — deterministic validator on information_needed / rationale co-occurrence |
| `qc_r1_5_exception_fields_consumed` | — (unchanged) | — (unchanged) | none — exception fields legitimately scanned across report |
| `qc_r1_7_enhancement_placement_det` | — (unchanged) | — (unchanged) | none |
| all other adtech / gaming / art11 / no_7221_c_5 / no_7152_a_3_trade_secret / no_prompt_artifacts / no_double_numbering / notice_gaps / overall_status / no_hallucinated_section_numbers / qc_ws6_1 / rubric_* checks | — (unchanged) | — (unchanged) | none — scans not surface-map dependent |

**Recorded wiring defect (docketed for a future deploy-guarded turn):** `run-cppa-risk-assessment/_w9_risk_slots.ts` (owner of the deterministic `submission_deadline` slot) does not consult `classifyRevenueBand(q1_revenue).audit_cohort` — currently emits `"April 1, 2028"` unconditionally. All four Wave-B `qc_r1_4` failures trace to this defect. Fix belongs on a future `run-cppa-risk-assessment` deploy turn; NOT this instrument turn.

---

## §3 — WAVE B.2 LAUNCH (single execution chain, batch-WRAPPED per item 152)

**Locks pasted.** All controllers idle. Campaign `fd1be147` remains CEO-paused. Wave-B batch `fc6a8394-a265-4297-b086-805e183d2ee5` is terminal (item 153). Item 154 (WAVE-B COMPLETION) is deployed with `BUILD_STAMP=ltp-risk-waveb-completion@2026-07-27T02:20:00Z`. WAVE-B COMPLETION deploy prerequisite satisfied.

**Batch record:** `quality_batch_runs.id = 127a6714-1062-427e-8f94-484ca9241006`
- `tools = {cppa-risk}`, `batch_size = 6`, `concurrency = 1`
- `instrument_version = gc-2026-07-27-s6-eu-uk-ca-au-sg` (s6, standalone)
- `campaign_id = NULL` (standalone launch; not attached to any campaign)
- `scenario_set` at check-emission time: `tuning` for 4 docs / `holdout` for 2 docs (batch_size 6 ≥ 4 → tuning/holdout split ACTIVE per Wave-B diagnostic policy)
- `created_by = 02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122` (established admin owner UUID from prior batches)
- `started_at = 2026-07-27T00:32:17.251Z`
- Kick fired via `kick-wrapped-batch` (new deploy this turn — replaces bare `kick-perfect-intake` for multi-doc batches per ledger item 152 addendum): orchestrator returned `202` and picked up the row; `phase = running_tool`, `last_heartbeat_at = 2026-07-27T00:32:33.235Z` at t+16s.

**Single launch.** No further launches this turn — the monitor extracts at terminal against §5 success criteria: **intake-drift 0 / citation-binding 0 / gate violations 0**; tuning/holdout split active at n=6; per-doc enforce-mode confirmation across ALL mapped surfaces.

---

## §4 — CEO rulings log

- **Instrument epoch audit ordered by CEO after Wave-B decomposition; checks re-keyed with evidence, none weakened; e6 validated unchanged.**
- Re-keys anchored to the approved surface map from `_shared/ltp/content/risk-surface-map.ts` + the completion turn's render sites (ledger item 154).
- Wiring defect on `submission_deadline` (all 4 `qc_r1_4` failures) recorded for a future deploy-guarded turn on `_w9_risk_slots.ts`. **Not re-keyed around.**
- Rubric text, dimensions, severity weights, and thresholds: UNTOUCHED.
- Instrument epoch bump is a CEO-controlled event; s6 SHA recorded in this courier; certification counter resets have zero practical cost while `fd1be147` is paused.

**Ledger:** `docs/pipeline-state.md` item 155 records LANDED + DEPLOYED + WAVE-B.2 LAUNCHED; header restamped.
