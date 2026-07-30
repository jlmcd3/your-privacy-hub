# COURIER — ITEM 297: FLEET-WIDE PRODUCT-REQUIREMENTS ANALYSIS + JUXTAPOSITION

**Dispatch:** CONTROLLER DISPATCH — ITEM 297 (docs-only, CEO order 2026-07-30)
**Executed:** 2026-07-30T23:46Z
**Deliverable:** `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md`
**Disposition:** DELIVERED — CEO read open.

---

## 1. What was ordered

Before any prompt drafting: (1) establish what each of the nine products is SUPPOSED to include and what analysis it is supposed to do, citing the corpus VERBATIM; (2) juxtapose each product's current output against those requirements; (3) state what must change per product. Nine chapters on the controller's cppa-risk template (A what it's for / B required contents / C analytic operations / D juxtaposition / E what must change), with FOUR-LENS sign-off per chapter.

## 2. Method actually used

**Requirements side.** All statutory text read live this turn from `provision_texts` (CPPA rows, OAL-approved eff. 2026-01-01) and `gdpr_articles` (EU rows, located per Item 291). Quotes were diffed against the row text before insertion. Where governing text is not in the corpus, the chapter is marked **MUST-INGEST** with the official source named and its (B)/(C) sections marked **DEFERRED** — no requirement is stated from memory. This is the verify-first law applied to a docs turn.

**Juxtaposition side.** For each tool, the top-`overall_score` row in `quality_run_documents` was selected as the product's current best output and its report JSON sampled directly. Every §D claim quotes that row and names its id. Each named analytic operation is scored PERFORMS / RECITES / OMITS.

Evidence rows used:

| Tool | Row id | Score |
|---|---|---|
| cppa-risk | `43c17b1c-dbb7-467a-ad99-fc98e352cbac` | 93 |
| cppa-cyber | `8611dfda-ecc9-4fc7-80f8-3f79ad20bf4e` | 94.7 |
| cppa-admt | `fdc773f6-9f08-4b3b-8e01-adae493f4d40` | 93 (12-way tie) |
| registration | `2ce38547-7629-4567-a7f8-5d33d54d53ba` | 93.5 |
| biometric-checker | `acd8ac66-64da-4dcb-89b4-ef73be5bed24` | 93 |
| dpia | `43f4d436-1c68-4f90-ba82-1b7b9df2aea6` | 92 |
| lia | `3c33c04e-a1d3-4378-8e79-27f9ab40b23e` | 93 |
| ir-playbook | `47398bcf-a2bf-48e8-af89-c7380adc16a3` | 94 |
| governance | `e67dfe54-cfa5-4d46-9b13-1004cedf56c2` | 93.1 |

## 3. Headline results

**Fleet score: 8 PERFORMS / 18 RECITES / 18 OMITS across 44 defined operations.**

1. **Analysis exists in exactly three places** — ADMT `scope_analysis.summary`, LIA `three_part_test.purpose_test.analysis`, ir-playbook awareness/clock reasoning. All three share one shape: standard → record fact → application → verdict, *including verdicts adverse to the customer*. The document recommends this shape as the concrete specification for the CEO-gated ANALYSIS-DUTY amendment (Item 295) — it is an existing, shipped, high-scoring pattern rather than a new invention.
2. **The weighing/determination operation is absent wherever a balancing standard governs.** cppa-risk performs 0 of 5 operations on its best document; DPIA states the necessity/proportionality test correctly in `guidance_note` and then assigns the comparison to the customer in `completion_guidance`; governance substitutes a maturity tier for the Art. 24(1) appropriateness-to-risk determination and defines its own scale inside the rationale sentence.
3. **Score does not track analysis — grader defect.** The two highest-scoring documents in the fleet are the weakest on verification: cppa-cyber (94.7) emits pinpoint citations to **11 CCR § 7122 and § 7123(c), neither of which is in the corpus**, and ir-playbook (94) assumes notifiability without running the Art. 33(1) "unlikely to result in a risk" or Art. 34(1) "high risk" tests. Registration scores 93.5 on an all-boolean `obligations_summary` with zero prose. Raised for CEO attention alongside Item 295.

## 4. Corpus findings (blocking work surfaced by this analysis)

Ordered ingestion queue:

| # | Item | Source | Blocks |
|---|---|---|---|
| 1 | `gdpr-art-34` (−69 chars) and `gdpr-art-22` (−25 chars) P0 repairs | CELEX (Item 291) | Ch. 8, Ch. 3/6 |
| 2 | 11 CCR §§ 7122, 7123, 7124 | CPPA OAL-approved regulation text | **Chapter 2 cannot be finalized** |
| 3 | 11 CCR §§ 7200, 7222 (rows exist, `status='pending'`) | same | Ch. 3 |
| 4 | BIPA 740 ILCS 14; Tex. Bus. & Com. Code § 503.001; Wash. RCW 19.375 (+ 19.373 headings) | official state legislature texts | **Chapter 5 cannot be finalized** |
| 5 | Data-broker registration registry (CA Delete Act, 9 V.S.A. § 2446, Tex. ch. 509, ORS 646A.594, AI Act Arts. 16/26/49/71) | official texts | **Chapter 4 has no registry at all** |
| 6 | EDPB Guidelines 1/2024 on Art. 6(1)(f) | EDPB publication | Ch. 7 (already cited in shipped output, unverified) |

Two live-output defects were surfaced incidentally and are recorded for the owning product turns, **not fixed here**: the cppa-cyber executive-summary clause duplication ("across the 18 scored components…" emitted twice), and the governance severity-scale legend embedded inside `readiness_rationale`.

## 5. Scope discipline

Docs-only. Files touched: `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md` (new), this courier (new), `docs/pipeline-state.md` (Item 297 + header restamp). No code file, edge function, migration, deploy, harness invocation, or prompt drafting. Database access was read-only (`SELECT` on `provision_texts`, `gdpr_articles`, `quality_run_documents`).

## 6. DOUBLE-CHECK

- Diff limited to the three files named in §5.
- Every requirement quote diffed against its corpus row this turn; chapters lacking corpus explicitly decline to state requirements.
- Every juxtaposition claim carries a row id.
- Chapters 2, 4, 5 marked as unfinalizable pending ingestion rather than filled from memory.
