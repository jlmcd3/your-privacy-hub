# RUN #149 — FAILING-CHECK ADJUDICATION

**Written:** 2026-07-27T06:46:32Z. **Docs-only.** Zero code changes, zero deploys, zero batches.
**Backing artifacts:** quality_batch_run `e1cd0e3e-6525-4d28-9d18-814b2a94bf9c` → quality_run `00d3eb37-1454-4440-acbf-3397f650a457` (run #149). **NON-EVIDENTIAL for §5** per Ledger item 169; run #147 remains SEALED per item 166. Grader instrument `gc-2026-07-27-s6-eu-uk-ca-au-sg` (s6).

**Doc inventory (3):**

| doc_number | doc_id | q1_revenue | q2_consumers |
|---|---|---|---|
| 1 | `2daec4ac-c0de-4baa-8610-5f8386e855b8` | `$25M to under $50M` | `250,000 to under 1,000,000` |
| 2 | `169a63bb-ce3a-4af5-adb9-815203f2b8d8` | `$25M to under $50M` | `250,000 to under 1,000,000` |
| 3 | `7f9dd5ea-2368-4e00-9520-25f0f11f37db` | `$25M to under $50M` | `100,000 to under 250,000` |

**Failure inventory (17 rows, matches dispatch's "any uncounted" caveat):**

| check_id | severity | count |
|---|---|---|
| `qc_r1_4_cohort_determinism` | critical | 3 |
| `rubric_citation_misapplied` | high | 3 |
| `rubric_unsupported_business_claim` | high | 3 |
| `rubric_internal_reasoning_leak` | high | 2 |
| `rubric_actionability` | medium | 3 |
| `rubric_generic_boilerplate` | medium | 3 |

---

## §1. Cohort-determinism CRITICALs (3) — side-by-side

**Check `qc_r1_4_cohort_determinism` scan target/pattern (verbatim from failing evidence, identical across all 3 docs):**

> `resolved band $25M to under $50M requires § 7121(a) cohort April 1, 2030 (ISO or long form) in submission_summary; not stated`

**Per-doc `submission_summary.submission_deadline`:**

| doc | intake band (`q1_revenue`) | emitted `submission_deadline` | scan requires | verdict |
|---|---|---|---|---|
| 1 (`2daec4ac`) | `$25M to under $50M` | **`April 1, 2028`** | `April 1, 2030` | **EMITTER GAP** |
| 2 (`169a63bb`) | `$25M to under $50M` | **`April 1, 2028`** | `April 1, 2030` | **EMITTER GAP** |
| 3 (`7f9dd5ea`) | `$25M to under $50M` | **`April 1, 2028`** | `April 1, 2030` | **EMITTER GAP** |

**Reasoning.** § 7121(a) cybersecurity-audit cohort schedule assigns the earliest date (April 1, 2028) to the largest-revenue tier, the middle date (April 1, 2029) to the mid tier, and the latest date (April 1, 2030) to businesses meeting the audit threshold at the smallest revenue tier ($25M–<$50M and adjacent). The intake band on all three docs is `$25M to under $50M`, which per statute maps to **April 1, 2030**. The emitter wrote **April 1, 2028** — the *highest-tier* date — for a *lowest-tier* business. This is a straight tier→date misassignment inside the emitter, not a scan-pattern artifact: the scan pattern is literally the statutory cohort date for the recorded band, so no instrument re-key would make the emitted 2028 correct. The band-realignment T2 (item 113 and successors) did not alter § 7121(a) cohort dates; s6 preserves the same schedule as s5.

**Verdict (all 3 docs):** EMITTER GAP. Not a scan-mismatch. Not an instrument re-key candidate. Fix required before any Wave-D launch.

**Fix locus (for the pre-Wave-D fix turn, not this docs-only turn):** the § 7121(a) tier→deadline map inside `run-cppa-risk-assessment` submission_summary composition — specifically the branch that resolves the band `$25M to under $50M` (and the adjacent lowest tier) to a `submission_deadline`. Item 108 (`risk-cohort-date-determinism`) shipped the determinism scaffolding; the tier-mapping table itself must be audited against § 7121(a) with a truth-table test.

---

## §2. `rubric_citation_misapplied` HIGHs (3) — per doc

### Doc 1 (`2daec4ac`)
**Evidence line (verbatim):** `Priority Action 4 cites "Cal. Civ. Code § 1798.140(ad)" for the sale definition… § 1798.140(ad) in the current post-CPRA code defines "profiling", not "sale". The sale definition is at § 1798.140(ab).`
**Verdict:** **EMITTER GAP (genuine).** Pinpoint letter is wrong (ad vs ab) in a *cited authority for the sale definition* — this is a factual mis-cite, not a rubric artifact. No instrument re-key resolves it.

### Doc 2 (`169a63bb`)
**Evidence line (verbatim):** `information_needed entry states: "the specific § 7150(b) subsection (§ 7150(b)(1)–(6)) that applies to the 'sell' trigger asserted in prose without a pinpoint" — but the report itself already correctly identifies and cites § 7150(b)(1) as the selling/sharing trigger in scope_and_triggers.triggered_activities_detail[0].statutory_basis.`
**Verdict:** **EMITTER GAP (genuine).** `information_needed` composer contradicts its own report's `triggered_activities_detail[0].statutory_basis` on the same doc. Cross-section coherence defect inside the emitter (information_needed builder not reading the resolved triggered-activities table). Not a scan artifact.

### Doc 3 (`7f9dd5ea`)
**Evidence line (verbatim):** `opening_summary states: "The processing engages 11 CCR § 7150(b) at § 7150(b)(3) (using ADMT for a significant decision concerning a consumer)." However, the report simultaneously acknowledges a contradiction: "the ADMT-training and ADMT-use structured fields are negated…"`
**Verdict:** **EMITTER GAP (genuine).** Opening paragraph asserts § 7150(b)(3) as engaged while the report's own inconsistency_flags note ADMT structured fields are negated. This is the ADMT-consequence gate failing to suppress the § 7150(b)(3) trigger citation when structured ADMT fields disagree with narrative — same class as item 128's Risk-Citation-Dup-Fix ADMT gate but for a *different* citation slot (opening_summary trigger enumeration, not § 7001(ddd)). Not a scan artifact.

**§2 verdict:** 3/3 EMITTER GAP. Zero re-key candidates.

---

## §3. `rubric_unsupported_business_claim` HIGHs (3) — per doc

### Doc 1 (`2daec4ac`)
**Evidence line (verbatim):** `intake field q5b_profiling_observation states "Yes — systematic observation of workers/students/applicants", and the report treats this as the operative processing activity: "Profiling via systematic observation of workers, students, or applicants". However, the intake's i1_processing_purpose is "Deliver core SaaS analytics functionality to enterprise customers with role-based access controls".`
**Verdict:** **EMITTER GAP (genuine).** Report picks an intake tick-box ("systematic observation") as the *operative purpose*, overriding the free-text `i1_processing_purpose`. The intake-contradiction filter (item 111) is not covering this q5b × i1 pair. Not a scan artifact.

### Doc 2 (`169a63bb`)
**Evidence line (verbatim):** `"triggered_activities":["We","We"] — the word "We" is not a processing activity and appears to be a rendering error or template failure. Similarly, "exceptions_status":"We" is not a valid status. The priority_action for recipient classification has "deadline_basis":"We" instead of a statutory basis.`
**Verdict:** **EMITTER GAP (genuine).** `"We"` fragments in structured slots are token-truncation/regex-slice residue from an intake string beginning with "We …". This is exactly the truncation-residue class the Wave-B2 closure (item 157) targeted, but the class is not fully closed — new leak surface (recipient-classification `deadline_basis`, `exceptions_status`, `triggered_activities`). Not a scan artifact.

### Doc 3 (`7f9dd5ea`)
**Evidence line (verbatim):** `The report repeatedly characterises the intake's described processing as "profiling and inference generation" — e.g. "ADMT — profiling and inference generation within the SaaS analytics platform for California free-tier consumers"…`
**Verdict:** **EMITTER GAP (genuine).** Same class as Doc 1: intake-purpose override by a tick-box, plus continued ADMT-consequence gate leakage (see §2 Doc 3). Not a scan artifact.

**§3 verdict:** 3/3 EMITTER GAP. Zero re-key candidates.

---

## §4. `rubric_internal_reasoning_leak` HIGHs (2)

### Doc 2 (`169a63bb`) — implicated indirectly via boilerplate/actionability; check attributed to Doc 2 only in ×2 total, other in Doc 3.
### Doc 2 evidence (verbatim):
> `Multiple priority actions contain the malformed phrase "The the internal contributors identified in the record owns" — e.g., Priority Action 1: "The the internal contributors identified in the record owns execution of this documentation." … template variable ("the internal contributors identified in the record") was not substituted with the actual contributors named in i7_internal_contributors.`

### Doc 3 (`7f9dd5ea`) evidence (verbatim):
> `Multiple instances of the phrase "the internal contributors identified in the record" appear as a de-referenced placeholder rather than naming the actual contributors from the intake. For example: "Assessment contributors include the the internal contributors identified in the record, the internal contributors identified in the record, and the internal contributors identified in the record Certify[ing]"`

**Verdict (both):** **EMITTER GAP (genuine).** Placeholder token `the internal contributors identified in the record` is the *variable name itself* leaking into rendered output because the composer failed to substitute `i7_internal_contributors`. This is a template-substitution defect (Link-C-class if governed by the deterministic emitter; otherwise Pass-1 output not being validated for placeholder residue). No scan-pattern re-key alters the fact that a variable name shipped to a customer surface. Not a scan artifact.

**§4 verdict:** 2/2 EMITTER GAP. Zero re-key candidates. *This is the same root cause as §5 and §6 below — one defect, three checks tripped.*

---

## §5. `rubric_actionability` MEDIUMs (3)

Per-doc evidence excerpts all reduce to the same defect as §4:
- Doc 1: `"The the internal contributors identified in the record and Data Platform Lead own the technical safeguard documentation…"`
- Doc 2: `Owner assignments throughout priority_actions are broken template references rather than actionable role assignments.`
- Doc 3: `Several priority actions use "the the internal contributors identified in the record" as the responsible owner…`

**Verdict (all 3):** **EMITTER GAP (genuine).** Downstream symptom of the §4 placeholder-substitution defect. Fixing the §4 root cause resolves these. Not a scan artifact.

**§5 verdict:** 3/3 EMITTER GAP. Zero re-key candidates.

---

## §6. `rubric_generic_boilerplate` MEDIUMs (3)

### Doc 1 (`2daec4ac`)
**Evidence line (verbatim):** `risk register entries (RR-001 through RR-003) all share identical severity (Moderate), likelihood (Possible), pre- and post-safeguard residual risk (Moderate), and statutory basis ("11 CCR § 7150(b)(4); 11 CCR § 7152(a)"). The pre-safeguard scores equal the post-safeguard scores… "Pre-safeguard scoring equals post-safeguard scoring because planned safe…"`
**Verdict:** **EMITTER GAP (genuine).** Risk register composer is emitting a single row template × 3 with identical severity/likelihood/residual and identical statutory basis regardless of the differentiated triggered activities. Not a scan artifact.

### Doc 2 (`169a63bb`)
**Evidence line (verbatim):** `Multiple priority actions use the unresolved placeholder "the internal contributors identified in the record"… appears at least seven times across the actions section.`
**Verdict:** **EMITTER GAP (genuine).** Same root cause as §4/§5.

### Doc 3 (`7f9dd5ea`)
**Evidence line (verbatim):** `adverse-effects analysis uses generic formulations that could apply to virtually any analytics platform rather than binding to specific intake facts.`
**Verdict:** **EMITTER GAP (genuine).** Adverse-effects composer not conditioning on q4_pi_categories / q15_sensitive_pi / q18_admt_use structured intake — emits generic prose. Not a scan artifact.

**§6 verdict:** 3/3 EMITTER GAP. Zero re-key candidates.

---

## §7. Summary — counts by verdict class

| verdict | count |
|---|---|
| EMITTER GAP (genuine defect) | 17 |
| SCAN-MISMATCH (instrument re-key candidate) | 0 |

**No instrument-side re-keys are on the table.** All 17 failing checks trace to product-emitter defects with the specific evidence lines cited above.

## §8. Genuine defects requiring fixes pre-Wave-D

Grouped by root cause (defect class → checks it trips → doc footprint):

1. **§ 7121(a) tier→deadline map wrong for lowest revenue tier** (`qc_r1_4_cohort_determinism` ×3 CRITICALs). *Emits April 1, 2028 for `$25M to under $50M` where statute schedule requires April 1, 2030.* Docs 1/2/3. **CRITICAL — blocks any Wave-D or evidential launch.**
2. **`i7_internal_contributors` placeholder never substituted** (`rubric_internal_reasoning_leak` ×2, `rubric_actionability` ×3, part of `rubric_generic_boilerplate` ×2). Docs 1/2/3. **HIGH — highest fanout (7 of 17 findings).**
3. **Sale-definition pinpoint mis-cite § 1798.140(ad) vs § 1798.140(ab)** (`rubric_citation_misapplied` on Doc 1). **HIGH.**
4. **`information_needed` composer contradicts already-resolved `triggered_activities_detail[0].statutory_basis`** (`rubric_citation_misapplied` on Doc 2). **HIGH — cross-section coherence.**
5. **ADMT-consequence gate not suppressing opening_summary § 7150(b)(3) trigger citation when structured ADMT fields negated** (`rubric_citation_misapplied` on Doc 3). Distinct from item 128 which covered § 7001(ddd); same defect class, different slot. **HIGH.**
6. **Truncation-residue tokens (`"We"`) leaking into structured slots** (`rubric_unsupported_business_claim` on Doc 2). New surfaces: `triggered_activities[]`, `exceptions_status`, `priority_actions[].deadline_basis`. Wave-B2 closure (item 157) did not reach these slots. **HIGH.**
7. **Intake tick-box ("systematic observation" / "profiling and inference generation") overrides free-text `i1_processing_purpose`** (`rubric_unsupported_business_claim` on Docs 1 & 3). Intake-contradiction filter (item 111) needs the q5b × i1 pair added. **HIGH.**
8. **Risk register composes identical rows** (severity/likelihood/residual/statutory-basis) irrespective of differentiated triggered activities (`rubric_generic_boilerplate` on Doc 1). **MEDIUM.**
9. **Adverse-effects analysis not conditioning on structured intake** (`rubric_generic_boilerplate` on Doc 3). **MEDIUM.**

Nine distinct emitter defect classes; the top two account for 10 of the 17 findings.

## §9. Instrument re-key candidates for CEO ruling

**None.** No check pattern was found to be misaligned against the emitted product. Recorded here so the "re-key candidates" ledger is explicitly empty for this run.

---

**Standing:** run #149 remains NON-EVIDENTIAL. Run #147 remains SEALED. Campaign `fd1be147` PAUSED. This adjudication drives no code changes, no deploys, and no batches; fix turns are gated on CEO order per single-launch discipline.
