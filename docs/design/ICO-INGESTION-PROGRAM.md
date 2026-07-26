# ICO INGESTION PROGRAM

**Status:** CEO-APPROVED 2026-07-26. Charter for the UK regulator/statute/enforcement corpus build.

**Scope authority:** Legal Test v2.3 (LEGAL-TEST-PIPELINE.md §2.9). UK analysis units are governed by UK domain rules. Non-UK material never binds UK units.

---

## 1. Phases

### I1 — ICO Guidance Backbone
- Landing: `regulatory_guidance` rows (`regulator='ICO'`, `jurisdiction='UK'`, `document_type` per page class from the guidance catalog).
- Priority ordering follows the LIA/DPIA/Breach empty-by-finding feed from the LTP registries.
- Batch 1 (this program): **Legitimate Interests family** (feeds LIA UK units).
- Subsequent batches: DPIA family → Breach-notification family → thematic families (children's code, direct marketing, cookies) as dispatched.

### I2 — UK DPA 2018 Sliver (revived narrow exception to the P4 cancellation)
- Landing: `provision_texts` rows sourced from `legislation.gov.uk` verbatim.
- Targeted provisions only — the DPA 2018 sections that materially qualify UK GDPR reliance (e.g., §§ 8, 10, 15, Schedules 1 & 2 conditions). Not the whole Act.

### I3 — UK Enforcement Cleanup
- Scope: the 76 existing `enforcement_actions` rows already tagged UK.
- Work: attribute `regulator_canonical`; refetch source documents to populate `source_document_hash`; run **eligibility-bar verification** (verbatim 40-char pinpoint check + jurisdictional relevance).
- **Out of scope:** FOI decision notices (they are not enforcement).

### I4 — Statutory Codes (distinct family within guidance tier)
- Landing: `regulatory_guidance` with `document_type='guideline'` and a `statutory_code=true` marker on `regulatory_family`.
- Rendering: authority language must reflect that tribunals "must take them into account" — never called "binding".

---

## 2. Authority Tiering (UK units)

| Tier | Sources | Binding on UK units? |
|---|---|---|
| **Binding** | UK GDPR; UK DPA 2018 | Yes |
| **Guidance** | ICO ordinary guidance; ICO statutory codes (`statutory_code=true`) | Not binding — persuasive; statutory codes carry the "must take into account" language |
| **Analogy (eligibility-bar)** | ICO enforcement actions (verified rows only) | Not binding — analogy layer |
| **Persuasive (ICO-mediated only)** | EDPB material referenced by ICO guidance itself (FSOR-mediation pattern) | Not binding — cited only where ICO itself refers to it |
| **Forbidden** | U.S. law (federal or state); non-UK EU member-state authorities; sister-state analogies | Never — hard-reject at validator |

**No U.S.-federal analog:** the U.S.-federal bridge from Legal Test v2.3 is a U.S.-forum rule. It does not apply to UK units.

---

## 3. Automation Protocol (standing for every ICO batch)

CEO ruling (recorded verbatim intent): **ingestion must be FULLY AUTOMATED — no human-in-the-loop steps. Verification of ingestion correctness must itself be automated via deterministic acceptance checks. Human (CEO) involvement ONLY when automated verification flags failures that cannot be automatically resolved.**

### 3.1 Extraction
- Structure-aware HTML ingestion (ICO hub is HTML-first). PDFs only for enforcement notices and statutory codes.
- **Cached raw source + SHA-256** on every fetch (`source_document_hash`).
- **Sectioned rows with normalized shadow text** — whitespace-collapsed, script/style/nav/aside stripped.
- **Position-checked headings** — every section heading text must appear in the raw source *ahead of* the excerpt it labels (the proven EDPB pin-test).
- **Freshness invalidation** — ICO page review/update date captured into `effective_date` where available; used to invalidate downstream memoized derivations.

### 3.2 Automated QA Report (per batch, machine-computed, embedded in the courier)

Hard thresholds — a row/document promoted to `verification_status='verified'` MUST clear every threshold:

| Metric | Threshold |
|---|---|
| Pin-test pass rate (per document) | ≥ 0.85 |
| Section-coverage (extracted spans / source length) | ≥ 0.85 |
| Duplicate-signature count | 0 |
| Row count vs source table-of-contents count | within ±1 |
| SHA present + source URL reachable at fetch time | required |

### 3.3 Quarantine Protocol (never stall, never ask mid-batch)
- A document failing extraction/pin-tests after **2 bounded retries** → row `verification_status='ingest_failed'` + machine diagnostics attached to the courier. **Batch continues.**
- CEO is flagged ONLY when:
  - quarantine rate **> 10 %** of the batch, OR
  - a **P1-priority** family item is quarantined, OR
  - the **same document** fails across 2 batch attempts.
- Otherwise the pipeline is fully autonomous.

---

## 4. Program Budget

Whole program estimate: **$30-60 USD**. Flag CEO at 2× ($60-120).

---

## 5. Downstream Wiring

Once an ICO family lands, its rows anchor the corresponding LTP registry — e.g. the LI family (this batch) retires the `limited_guidance_disclosure` UK gate carried in `lia-gates.ts`. The retirement happens at the next LIA wiring turn (Phase 2 or later); no retroactive edits to landed authoring artifacts.
