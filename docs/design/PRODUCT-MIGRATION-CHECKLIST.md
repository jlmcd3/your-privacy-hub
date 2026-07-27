# PRODUCT-MIGRATION-CHECKLIST

**Status:** MANDATORY for every product's pipeline migration. CEO-approved 2026-07-27.
**First consumer:** `lia` Phase 2.
**Governing law:** `docs/design/LEGAL-TEST-PIPELINE.md` §29 references this document as the mandatory checklist for migrating any product onto the Legal-Test Pipeline.

This document is the CEO-reviewed **cross-product applicability matrix**. Every product migration turn MUST reference each numbered item below and either (a) execute it, or (b) record it as N/A with the trait-based justification stated here. "Unmapped" is forbidden.

---

## A. UNIVERSAL — mechanically inherited by every product

Every product migrating onto the pipeline MUST land these in the migration turn.

### 1. Value-level leak screen at LEAK-PREV-P2 serializer
- Shared **internal-vocabulary lexicon** (cross-product) plus a **per-product corpus-text detector** built from that product's registry quotes.
- **Statutory-text-outside-cite-spans** is a screen-hit class: verbatim corpus text (statute / regulation quotations) appearing OUTSIDE a substituted `{{cite:…}}` span = fail-loud hit. Detector is normalized-substring above a length threshold, built from the corpus rows the product's registries quote.
- Home: the product's LEAK-PREV-P2 serializer. Behavior: fail-loud, same as all other screen hits.

### 2. Surface-ownership write-guard (co-shipped with the surface map)
- No product enters pipeline composition without a **complete surface map**.
- The **write-guard ships in the SAME turn as the map** — never later.
- Owner vocabulary is fixed and exhaustive: `pipeline-template` | `deterministic-emitter` | `legacy-frozen` (with citation audit + retirement date). **`unmapped` is forbidden.**
- Behavior: any emitter or renderer writing to a `report_data` path it does not own per the surface map = hard reject with a diagnostic. Mechanically enforces §28 Engine-B primacy.
- Conformance test: every write site enumerated against the map.

### 3. Code-vs-contract field audit
- Every intake field referenced anywhere in the product's code MUST exist in its contract, and every contract field MUST be referenced (or explicitly annotated as unused). Bidirectional.
- Landed as a test that fails the migration turn if the sets diverge.

### 4. Standing product-agnostic laws — inherit as-is (no per-product opt-out)
The following laws already live in `LEGAL-TEST-PIPELINE.md` and are inherited mechanically; the migration turn MUST verify each is wired for the new product:
- **§16 configuration assertion** at every launch path.
- **Declared-count conformance** (declared === actual).
- **Canonical state machine** (§19 R1) + guarded mutations (§20 R2).
- **§26 grader-divergence tripwire** (|claude − gpt| ≥ 12 → extraction adjudicates).
- **§27 narrative-present kickoff assertion** (§16 sibling).
- **Smoke-before-measure** (§22 R4).
- **PII field-class rendering** using the product's own contact-field list (per-product enumeration).
- **Opening-paragraph program spec** (`docs/design/OPENING-PARAGRAPH-DESIGN.md`).
- **Verified-facts courier discipline** (§24 R6).

---

## B. CONDITIONAL — apply where the trait exists

Each conditional bundle is gated on a product trait. Migration turn MUST classify the product against each trait and either execute or record trait-based N/A.

### 5. Type-W products ONLY — factor-registry stack
**Applies to:** `lia` core, `dpia`, `ir`, `cyber`, `governance`, `risk`.
**N/A for:** `dpa`, `registration`, `biometric` (R-dominant products; no weighing frame).

Bundle:
- **Factor registries** (per-product, change-controlled content; shared registry schema).
- **Pass-G candidate index** built from those registries.
- **Enriched balance-rationale templates** with per-factor reasoning slots that expose the frame's guidance (basis-only when guidance empty; no invented reasoning). Slot architecture is shared across Type-W products; template *content* is per-product change-controlled.

Companion law: **item 8** (guidance-corpus completeness) — a Type-W product's weighing quality cannot be judged until its guidance corpus is complete.

### 6. Multi-unit products ONLY — precedence + aggregation
**Applies to:** `risk` (activities), `dpia` (activities), `governance` (domains), `ir` (jurisdictions).
**N/A for:** single-determination products.

Bundle:
- **Most-cautious-wins precedence** across units.
- **Aggregation-rationale sentence** (N>1 units only; surfaces the precedence rule; template in the pipeline content layer).

### 7. CPPA-family ONLY — applicability + count-field dependency
**Applies to:** `risk`, `cyber`, `admt`.
**N/A for:** everything else.

Bundle:
- **CCPA applicability logic**, including the **§ 1798.140(d)(1)(B) count-field dependency** — the (B)-gap customer-question emission predicate landed in Item 181 for `risk` is the shared pattern.
- **Count-field intake contract turn:** SEPARATE, CEO-GATED. When authorized, the contract turn covers **`risk` AND `cyber` together** (single turn, shared field). **Not authorized by this writeback.**

---

## C. FAMILY ANALOGS — one law, family-specific corpora

### 8. Guidance-corpus completeness law
> **Type-W weighing depth is bounded by guidance-corpus completeness; complete the product's guidance corpus before judging its weighing quality.**

Family bindings:
- **CPPA family (`risk`, `cyber`, `admt`, and any CPPA-adjacent Type-W product):** FSOR corpus (see Item 182 for the `risk` precedent).
- **EU products (Type-W under GDPR):** EDPB Guidelines families 4–10.
- **UK units:** ICO (CEO-deferred — do not schedule without an explicit CEO order).

Every Type-W migration turn MUST attest to the corpus-completeness state of its family and record any FSOR-SILENT / EDPB-SILENT / ICO-SILENT entries with sweep evidence (Q4(e) v2.3 ban on cross-provision analogies stands — silence is documented, never filled by adjacency).

---

## D. RISK-SPECIFIC — DO NOT PORT

The following `risk` fixes are **product-specific** and MUST NOT be ported. Their **generalized** laws are already in `LEGAL-TEST-PIPELINE.md` and cover other products automatically:
- **cohort-surface fix** — generalized under §13 surface-map ownership + §16 measurement validity.
- **§ 7121(a) truth table** — generalized under §12 emitter law + §13 surface-map ownership.
- **contributor-substitution repairs** — generalized under §14 fix-shape law.

Do not create a "port the risk fix" line item in any non-`risk` migration turn.

---

## E. USAGE — how a migration turn consumes this checklist

1. Open the migration turn with a **trait classification** for the product (Type-W? Multi-unit? CPPA-family? EU/UK?).
2. Walk **A (1–4)** — every item executed; state-machine assertions wired at every launch path.
3. Walk **B (5–7)** — for each bundle, either execute or record trait-based N/A with a one-line justification.
4. Walk **C (8)** — attest to guidance-corpus completeness state for the product's family; list any *-SILENT entries with sweep evidence.
5. Do NOT touch **D**.
6. Courier records each numbered item with its outcome (executed / N/A + reason / deferred with CEO gate).
7. Ledger entry references this checklist by name and lists the outcomes.

---

## F. CHANGE CONTROL

- This document is change-controlled. Edits arrive only as content-anchored couriers via CEO order.
- New universal or conditional items require a CEO-approved dispatch citing this file by name.
- Trait vocabulary (Type-W / R-dominant / multi-unit / CPPA-family / EU / UK) is closed; adding a trait requires a CEO ruling.
