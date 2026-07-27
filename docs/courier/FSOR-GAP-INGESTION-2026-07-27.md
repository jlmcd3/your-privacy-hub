# FSOR-GAP-INGESTION — 2026-07-27

**Dispatch:** FSOR-GAP-INGESTION (CEO-approved; corpus+data-only micro-turn, no code, no deploy).
**Scope:** The 8 empty-by-finding factor-registry gaps from LTP Phase-1 (courier TWO-PASS-BUILD-PHASE1 §3).
**Discipline:** Corpus-check first — sweep before ingest. Every wired row is § 7152-tagged, BINDING-tier, and pin-tested against `cppa_fsor_commentary`.
**Priority note (CEO-elevated):** Type-W weighing depth is bounded by this corpus completeness; Wave-D's weighing-quality read must be interpreted against the **post-ingestion state** recorded here.

---

## 1. Method

1. **Sweep** `cppa_fsor_commentary` (1,318 rows) for text matching each gap factor's substantive terms — `dark pattern|coerc*` for neg.d, `impair*.*control|informed decision|reasonable expectation` for neg.c, `economic harm|higher price|profiling` for neg.e, `physical harm|physical or sexual|violence` for neg.f, `reputational|stigmatiz*` for neg.g, `psychological|emotional distress|anxiety|embarrassment` for neg.h, `privacy-enhancing|homomorphic|federated learning|differential privacy|trusted execution` for safe.ii, and `regulation_citation LIKE '%7152(a)(4)%'` for the four benefit rows.
2. **Re-tag test:** for any matching row NOT already carrying a § 7152 `regulation_citation`, evaluate whether the text genuinely addresses the factor and re-tag in place with justification. **Result: no re-tags required.** Every substantively on-point row already carries a § 7152 tag; the § 7004 dark-pattern rows and § 7154 PET-adjacent row remain correctly filed under their own provisions (cross-provision analogy prohibited by Q4(e) v2.2).
3. **Ingest only where no existing row covers a factor.** No new FSOR passages ingested — the corpus already contained on-point commentary for 6 of 8 gaps. No external fetch needed (source_document_cache untouched).
4. **Wire into registry:** `supabase/functions/_shared/factors/cppa-risk-factors.ts` `guidance_refs[]` updated data-only for the filled slots; `empty_by_finding` deleted on filled slots and hardened to permanent **FSOR-SILENT** on the two genuinely empty slots.

---

## 2. Gap-by-gap disposition

### 2.1 FILLED (6 slots, 10 wired rows — including the 4 benefit rows that share 2 refs)

| Gap factor | § 7152 pinpoint | Wired FSOR row(s) | Anchor evidence |
|---|---|---|---|
| **benefit.business / consumer / other_stakeholders / public** | (a)(4) | `ac2d3934` (p. 35) + `9c6cb558` (App. p. 139) | Agency's own rulings: "identify benefits in specific, non-generic terms" + "'as applicable' allows differential stakeholder coverage" + "benefits may apply to different categories of stakeholders rather than accruing universally." Shared across all four stakeholder rows because the specificity + differential-applicability discipline applies uniformly. |
| **neg.c.impaired_control** | (a)(5)(C) | `b759265d` (p. 36) | Agency's own ruling: "failing to provide sufficient information for informed decision-making is already covered under subsection (a)(5)(C)'s prohibition on impairing consumers' control over their personal information." Directly on-point; the previous cross-provision reach to § 7002 is retired. |
| **neg.d.coercion_dark_patterns** | (a)(5)(D) | `a434b098` (p. 36) + `8838a330` (App. p. 141) | Agency's own ruling: "(a)(5)(D) modified to add a specific example demonstrating how consent obtained through dark patterns fails to meet the 'freely given' standard." The prior cross-provision reach to § 7004 is retired. |
| **neg.e.economic_harms** | (a)(5)(E) | `adeb9b63` (p. 36) | Agency's own ruling on economic-harm framing: "added the phrase 'based upon profiling' to clarify … economic harms can result from processing." Row is filed under FSOR pre-modification (a)(5)(F) label — substance controls; row's own citation preserved (no re-tag). |
| **neg.g.reputational_harms** | (a)(5)(G) | `ce5259bc` (App. p. 141) + `9f93100b` (§ 7152) | Agency retained reputational-harm examples as "necessary business guidance"; agency's own linkage: "'would' → 'could' in (G)/(H); stigmatization example expanded to show disclosure outside expected context." |
| **neg.h.psychological_harms** | (a)(5)(H) | `805bb0ff` (App. p. 142) + `9f93100b` (§ 7152) | Agency's own ruling: psychological-harm list "is nonexhaustive" and businesses "need not perform expert-level mental-health assessments"; emotional-distress example clarified with "disclosure" language for sensitive health information. |

**Row-existence pin-test:** all 10 wired IDs verified present in `cppa_fsor_commentary` (query returned `10`). All rows are BINDING-tier per registry lint (CPPA FSOR = California interpretive material).

### 2.2 FSOR-SILENT (2 slots — permanent empty-by-finding with search evidence)

| Gap factor | § 7152 pinpoint | Search evidence | Disposition |
|---|---|---|---|
| **neg.f.physical_harms** | (a)(5)(F) | Sweep for `physical harm|physical or sexual|violence` across 1,318 rows returned **zero** § 7152-tagged matches. The one hit (`3a55bf9d`) sits under § 7150(b) discussing threshold scope, not (a)(5)(F) framing. | **FSOR-SILENT.** Cross-provision analogy banned by Q4(e) v2.2. `empty_by_finding` hardened to "permanent" wording; T5 candidate flag removed. |
| **safe.ii.privacy_enhancing_technologies** | (a)(6)(A)(ii) | Sweep for PET terms returned **zero** § 7152-tagged matches. Sole hit (`b736679e`) sits under § 7154 (data minimization). | **FSOR-SILENT.** Cross-provision analogy prohibited. `empty_by_finding` hardened; registry lint accepts as permanently empty until agency issues future FSOR. |

---

## 3. Registry edits (data-only)

File: `supabase/functions/_shared/factors/cppa-risk-factors.ts`

- Introduced `BENEFIT_GUIDANCE` shared const for the four (a)(4) benefit rows; `empty_by_finding` removed on all four.
- `neg.c`, `neg.d`, `neg.e`, `neg.g`, `neg.h`: `guidance_refs[]` populated with the wired FSOR rows above; `empty_by_finding` removed.
- `neg.f`, `safe.ii`: `guidance_refs[]` remains empty; `empty_by_finding` rewritten to explicit **FSOR-SILENT (2026-07-27 sweep)** language with search evidence; language marks these as permanent, not T5 candidates.
- Every wired `GuidanceRef` carries `authority_weight: "binding"` (registry lint requirement) and preserves the source row's own `regulation_citation` and `page_ref`.
- No changes to `verbatim_excerpt`, `anchor`, `kind`, or `label` on any row.
- No changes to `provision_texts`, `cppa_authorities`, or `source_document_cache`. **Zero corpus rows created, updated, or deleted.**

---

## 4. Pass-G candidate index — post-ingestion counts

- **Total factor rows:** 16 (unchanged).
- **Rows with ≥1 binding guidance ref:** was 4 (neg.a, neg.b, safe.i, safe.iv) → **now 14** (adds all 4 benefits, neg.c, neg.d, neg.e, neg.g, neg.h). Δ +10.
- **Rows FSOR-SILENT (permanent empty-by-finding):** **2** (neg.f, safe.ii).
- **Rows without guidance and without silent marker:** 0 (safe.iii carries no guidance_refs but has no empty_by_finding either — pre-existing, out of scope for this dispatch).

Type-W weighing depth for Wave-D readings should be interpreted against **14/16 factor rows now guidance-backed** (up from 4/16).

---

## 5. Discipline confirmations

- **Corpus-check first:** ✅ swept before considering ingest; no ingest needed.
- **No re-tags:** ✅ no rows required re-tagging (all substantively on-point rows already § 7152-tagged).
- **No new external fetch:** ✅ `source_document_cache` untouched.
- **Every new/re-tagged row pin-tested:** ✅ 10/10 wired IDs verified present.
- **Q4(e) authority-domain compliance:** ✅ no cross-provision analogy; § 7004 dark-pattern rows and § 7154 PET row explicitly excluded.
- **v2.3 tier discipline:** ✅ all guidance_refs `binding` (CPPA is CA authority; U.S. Federal not implicated).
- **FSOR-SILENT documentation:** ✅ 2 slots documented with search terms + row-count evidence, never filled with adjacent-provision analogy.
- **No code edits, no deploys, no chain interference:** ✅ file touched is data-only (factor registry data); no runtime path modified.

---

## 6. Follow-ups (for controller, not this turn)

- The upcoming Type-W weighing telemetry should record `guidance_refs.length` per invoked factor and split "silent-by-finding" from "unbacked" if any future factor slot lacks both refs and a silent marker.
- If a future FSOR (post-2026 rulemaking) issues commentary on physical-harm or PETs, the FSOR-SILENT markers should be lifted in a subsequent FSOR-GAP-INGESTION turn and the guidance_refs wired then.
