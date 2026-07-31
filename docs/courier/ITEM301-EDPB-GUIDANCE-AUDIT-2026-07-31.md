# ITEM 301 — EDPB/WP29 GUIDANCE-LAYER AUDIT (version currency + wiring + gap check)

Stamp: item301@2026-07-31T05:47Z. Prompt 3 of 7 (INGESTION-PROMPTS-2026-07-31).
**ROWS WRITTEN THIS TURN: ZERO.** No `edpb_guidelines` insert/update/delete, no engine code, no deploy, no harness invocation. Files touched: this courier + `docs/pipeline-state.md`.

## 0. Baseline re-verified (live)

| guideline_ref | title | adopted | final | front_matter | doc_version | source_url |
|---|---|---|---|---|---|---|
| WP248 rev.01 | Guidelines on DPIA and determining whether processing is "likely to result in a high risk" | 2017-10-04 | 46 | **0** | NULL | ec.europa.eu/newsroom/just/document.cfm?doc_id=47711 |
| EDPB Guidelines 1/2024 | Art. 6(1)(f) legitimate interests | 2024-10-08 | 106 | 3 | NULL | edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf |
| EDPB Guidelines 9/2022 | Personal data breach notification | 2023-03-28 | 70 | 4 | NULL | edpb.europa.eu/system/files/2023-04/edpb_guidelines_202209_personal_data_breach_notification_v2.0_en.pdf |

Deviation from the controller baseline: **WP248 rev.01 has 0 front_matter rows, not 3** (46 final only). Everything else matches. Table total 893 across 10 documents; `doc_version` NULL fleet-wide (unchanged — recording it would be a write, and this turn is audit-scoped).

## 1. Version currency (step 1) — ALL THREE CURRENT, NOTHING SUPERSEDED

- **EDPB Guidelines 9/2022 — CURRENT.** Checked `https://www.edpb.europa.eu/documents/guideline/guidelines-92022-on-personal-data-breach-notification-under-gdpr_en`: page states "Guideline · 04 April 2023 · **Final version**", sole download "Guidelines 9/2022 - **version 2.0**". Ingested rows are v2.0 (adopted 28 Mar 2023) from the matching PDF path. No later revision, no re-opened consultation. (The 2025-03 "Summary: Personal data breaches, what to do" is a companion explainer, not a revision.)
- **EDPB Guidelines 1/2024 — CURRENT AS ADOPTED, v1.0.** Live PDF at the ingested URL still reads "Version 1.0 / Adopted on 8 October 2024". The public consultation (reference 10/2024) ran 09 Oct – 20 Nov 2024 and is **Closed for feedback**; no post-consultation version 2.0 has been published. Standing note for the fleet: 1/2024 is a **pre-final (v1.0, post-consultation-pending)** instrument — a v2.0 adoption is the expected future supersession event and should be watched.
- **WP248 rev.01 — CURRENT, STILL ENDORSED.** Checked `https://www.edpb.europa.eu/endorsed-wp29-guidelines_en`: the endorsed list annotates superseded items explicitly (e.g. WP259 rev.01 "superseded by Guidelines 05/2020"); **WP248 rev.01 carries no supersession annotation**. Source page `ec.europa.eu/newsroom/article29/items/611236` still serves wp248rev.01 (13/10/2017). No withdrawal, no successor DPIA guideline.

No STOP condition triggered.

## 2. Wiring check (step 2) — the mechanism EXISTS; three products, three different states

Mechanism found: `supabase/functions/_shared/gdpr-context.ts` → `getGdprContext()` step (3), a semantic lookup `supabase.rpc("match_edpb_guidelines", { query_embedding, article_filter, match_count: 4 })`. All 893 rows carry embeddings (`count(embedding) = count(*)` per document), and `related_articles` tagging is correct and complete: 1/2024 = `{6}` ×106, 9/2022 = `{33,34}` ×70, WP248 = `{35,36}` ×46. There is **no `guidance_refs` column** anywhere — the concept is realised as (a) the semantic RPC and (b) direct table pulls.

| product | status | evidence |
|---|---|---|
| **ir-playbook** | **WIRED — deterministic** | `generate-ir-playbook/index.ts` L791–830: direct `.from("edpb_guidelines")` pull, `guideline_ref='EDPB Guidelines 9/2022'`, `status='final'`, `related_articles && {33,34}`, deterministic order, ~9,000-char cap, emits a "SUPPLIED AUTHORITY EXCERPTS" block and pushes `EDPB Guidelines 9/2022` into `irSuppliedCitations`. Item 291's "wiring gap" for ir-playbook is **stale — it has since been wired.** |
| **dpia** | **WIRED — semantic only** | `run-dpia-framework/index.ts` L994–1000: `getGdprContext(..., guidelineArticles: ["35"], semanticQuery: processingDesc)` → WP248 rows are reachable (tagged `{35,36}`). Caveats: max **4** excerpts, requires `LOVABLE_API_KEY` for embedding (fail-open to zero guidance), and the block is labelled "(interpretive guidance, non-verbatim summary permitted)". WP248's nine criteria therefore reach the prompt only as hard-coded prose in the DPIA system blocks, not from corpus. |
| **lia** | **PARTIALLY WIRED — corpus present but not authoritative** | `run-li-assessment/index.ts` L708–718 passes `guidelineArticles: ["6"]`, so 1/2024 rows are semantically reachable (4-hit cap, same caveats). BUT the block the prompt *binds* the model to — `EDPB_1_2024_AUTHORITY` (L119), "cite these, and only these" — is a **hand-written six-excerpt constant**, and corpus contact is otherwise limited to `verifyEdpb12024AgainstCorpus()` (`_shared/edpb-1-2024-consistency.ts`), a fire-and-forget **observe-only** anchor check that logs a warning and changes nothing. Item 291's lia wiring finding **still holds in substance.** |

**Finding for a dedicated engine turn (not done here, out of scope):** the corpus→prompt path for lia is constant-first, corpus-observe-only; and for dpia/lia both, the semantic path caps at 4 excerpts and degrades silently to zero on embedding failure. Converting lia to corpus-first (as the consistency-checker header itself anticipates: "Reconcile before switching consumers to corpus-first") and giving dpia a deterministic WP248 nine-criteria pull, in the ir-playbook shape, is the right unit of work.

## 3. Gap check (step 3) — READ, NOT ASSUMED: BOTH CLAIMS CONFIRMED, NO GAP, NOTHING INGESTED

- **WP248 nine criteria — COMPLETE.** Dumped all 46 final excerpts (61,504 chars) and grepped the enacted criterion labels. All nine present with text: "Evaluation or scoring" (×4), "Automated-decision making with legal or similar significant effect" , "Systematic monitoring" (×3+2 lc), "Sensitive data or data of a highly personal nature" (×5), "Data processed on a large scale" (×3), "Matching or combining datasets", "Data concerning vulnerable data subjects" (×5+1 lc), "Innovative use or applying new technological [or organisational solutions]", "[Processing that] prevents data subjects from exercising a right [or using a service or a contract]" (×1+1 lc).
- **CJEU three-part-test / Meta v Bundeskartellamt — PRESENT in EDPB 1/2024.** 25 of the 106 final rows match `Bundeskartellamt` or `C-252/21`, including the pinpoint footnote "CJEU, judgment of 4 July 2023, Case C-252/21, Meta v Bundeskartellamt (ECLI:EU:C:2023:537), para. 121" plus paras 112/116/118, and the earlier C-13/16 Rīgas satiksme para. 29 anchor. The "three cumulative [conditions]" formulation appears in 7 rows.

Nothing genuinely absent → **zero rows ingested.**

## 4. Pin tests

**None authored — explicitly, per the dispatch.** Step 3 found no gap and wrote nothing, so there is no ingested passage to pin, and a no-op test file would be dead weight. Existing coverage stands: `_shared/edpb-1-2024-consistency.ts` already anchors eight 1/2024 phrases against the corpus at runtime.

## 5. Step 4 compliance

EDPB Guidelines 2/2019, 3/2018, 05/2020, 07/2020, 01/2022, Recommendations 01/2020 and WP260 rev.01 were counted in the census only. Not read for content, not modified, not ingested.

## Double-check summary

- Version currency: 9/2022 CURRENT (v2.0 final), 1/2024 CURRENT (v1.0, consultation closed, v2.0 pending), WP248 rev.01 CURRENT (endorsed, unannotated on the supersession list). URLs stated above.
- Wiring: ir-playbook **WIRED (deterministic)**; dpia **WIRED (semantic, 4-hit, fail-open)**; lia **PARTIALLY WIRED (constant-authoritative, corpus observe-only)**. No `guidance_refs` column exists; the mechanism is the `match_edpb_guidelines` RPC plus direct pulls.
- Gap check: **confirmed complete** on both claims.
- **Rows written: zero.** No diff manufactured.
