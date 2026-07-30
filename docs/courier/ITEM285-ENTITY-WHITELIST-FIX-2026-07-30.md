# ITEM 285 — 2R ENTITY-WHITELIST BUILDER FIX (executes Item 283 N2 / F7)

**Date:** 2026-07-30T17:50Z · **Item:** 285 · **Track:** 2 (cppa-risk)
**Authority:** CEO "Proceed" 2026-07-30; four-lens unanimous per the Item-283 courier.
**Turn discipline:** ONE defect class — the `entity_whitelist` validator's INPUT CONSTRUCTION. NO prompt change, NO other validator change, NO composer change, NO legacy edit, NO DPA file. **Deployed: `replay-cppa-risk-harness` ONLY. NO harness invocation** (the controller runs the re-run batch).

---

## 1. EVIDENCE

Batch 1R, doc `278d0608`, `replay_harness_results.reject_reason`:

```
[entity_whitelist/entity_not_in_plan] 5 proper name(s) are not carried by the locked plan.
Evidence: ["Ltd","SaaS","Cascade","Stripe","SendGrid"]
```

Every one of the five is a false positive, in two distinct classes.

### Failure mode (1) — UNDER-INCLUSIVE WHITELIST

`buildPass2rWhitelist` built `entities` from three sources only:

```ts
// pass2r-validators.ts:646-650 (OLD)
const entities = [
  ...displays,                                                   // intake_ledger .display ?? .value
  ...plan.factor_table.map((f) => String(f.display_label ?? "")),
  ...plan.propositions.map((p) => String(p.display_label ?? "")),
].filter(Boolean);
```

Vendor names are not carried on display labels. On `278d0608` they are carried (a) as the RAW `intake_ledger.value` behind a coded `display` ("3 service providers"), and (b) inside `factor_table[].weight_note`. Neither was harvested — so "Stripe" and "SendGrid", which the plan demonstrably carries, were reported as model-invented.

### Failure mode (2) — OVER-EAGER EXTRACTION

`properNounCandidates` (`pass2r-validators.ts:180-201` OLD) flagged every non-sentence-initial capitalized token that was not in `ENTITY_STOPWORDS` and not a 2-6 letter all-caps acronym. Consequences:

- **"Ltd"** — a corporate-form suffix, a structural component of the one name "Cascade Data Ltd", reported as a second entity.
- **"SaaS"** — a generic industry/category word; mixed case, so the all-caps acronym escape never fired.
- **"Cascade"** — a constituent TOKEN of the plan-carried "Cascade Data Ltd", produced by whitespace tokenization of the prose. (Substring matching would have caught this one had the name been in the whitelist at all; the token rule now makes it explicit and order-independent.)

## 2. THE FIX (both modes; builder + its extractor only)

### 2.1 Under-inclusive → `entityBearingStrings`

`pass2r-validators.ts:679-704` (NEW). Harvests every entity-bearing value the plan CARRIES:

- intake-ledger `display` strings (as before),
- intake-ledger RAW `value` strings (new — the coded-display case),
- `factor_table[].weight_note` (new — where vendor names actually live),
- `factor_table[].display_label`, `propositions[].display_label` (as before),
- `opts.bound_ctx_values` (new, OPTIONAL) — bound template ctx values when the caller has them. Optional by design: no caller signature changes this turn, so `pass2r-llm.ts` is untouched.

Values are kept WHOLE and de-duplicated; nothing is truncated or lower-cased in the whitelist itself.

### 2.2 Token matching for multi-word names

`validateEntityWhitelist` (`pass2r-validators.ts:310-335` NEW) now builds `carriedTokens` — the constituent tokens of every whitelist value, corporate-suffix dot stripped — and accepts a candidate that matches the FULL value (existing substring check, retained) **or** any carried token. "Cascade" out of "Cascade Data Ltd" therefore matches by construction.

### 2.3 Over-eager → two enumerated, exported sets

`pass2r-validators.ts:179-206` (NEW), both consulted by `isNonEntityToken` inside `properNounCandidates`:

- `CORPORATE_SUFFIXES` — Ltd, Limited, Inc, Incorporated, LLC, LLP, LP, PLC/Plc, Corp, Corporation, Co, Company, GmbH, AG, SA, SAS, SARL, SRL, BV, NV, AB, AS, ApS, Oy, Pty, Pte, KK, KG, OHG, UG (trailing dot tolerated).
- `GENERIC_CATEGORY_TERMS` — SaaS, PaaS, IaaS, FinTech, MarTech, AdTech, HealthTech, InsurTech, RegTech, LegTech, eCommerce/ECommerce/Ecommerce, Internet, Cloud, Platform, Marketplace, Analytics, Website, Mobile, Online, Software, Vendor(s), Processor(s), Subprocessor(s).

Both sets are CLOSED and enumerated — structural or anchored entries only, per the smoke-#4/#5 curation law. No bare common word is suppressed beyond these two sets; `ENTITY_STOPWORDS` is unchanged.

### 2.4 Lifecycle unchanged

`PASS2R_DEFAULT_MODE` remains `"observe"`; `effective` is still `mode === "enforce"`; nothing in the codebase sets enforce (the Item-278 test asserting this still passes). The §2R.7 promotion bar — two consecutive replay batches at ~zero FP — is untouched and unmet.

Version stamp: `ltp-pass2r-validators-2026-07-30-item278` → **`ltp-pass2r-validators-2026-07-30-item285-entity-whitelist`**.

## 3. TESTS

New: `supabase/functions/_shared/ltp/item285-entity-whitelist.test.ts` — the `278d0608` regression fixture (plan carrying "Cascade Data Ltd", "AWS, Stripe, SendGrid" as a raw value behind a coded display, "SaaS analytics", plus a weight_note naming Stripe and SendGrid) with the counter-case.

```
running 5 tests from ./_shared/ltp/item285-entity-whitelist.test.ts
ITEM 285 F7(1): builder harvests ledger values, raw values and weight_notes ... ok
ITEM 285 F7: the 278d0608 prose produces ZERO entity rejections ... ok
ITEM 285 F7(2): corporate suffixes and generic category terms are not entities ... ok
ITEM 285 F7(1): a multi-word plan name matches by constituent token ... ok
ITEM 285 COUNTER-CASE: a proper name NOT carried by the plan still rejects ... ok
running 20 tests from ./_shared/ltp/pass2r-validators.test.ts
... (all 20 ok, incl. "entity whitelist — rejects an entity outside the plan",
       "entity whitelist — rejects a personal name in an owner slot (Item 273)",
       "whitelist is built from the locked plan only")
running 11 tests from ./_shared/ltp/item278-pass2r.test.ts
... (all 11 ok, incl. "enforce branch exists, is all-or-nothing, and nothing in the codebase sets it")

ok | 36 passed | 0 failed (299ms)
```

Full suite (`_shared/ltp/` + `run-cppa-risk-assessment/`):

```
FAILED | 511 passed | 21 failed (10s)
```

**21 failed = the tolerated inventory unchanged** (Item-284 courier: 21 pre-existing legacy failures — stale BUILD_STAMP/version pins, RCD cohort-date cases, W15/W16/W18/W24-A wave pins, template-count pins, and the pre-existing `item276` rationale case). No 2R test is in that set; **no test that passed before this turn fails now**. Deno type-check reports the same 7 pre-existing errors (Item-284 test file + `_risk_cohort_date.ts` + `run-cppa-risk-assessment/index.ts`); none is in a file touched this turn.

## 4. DOUBLE-CHECK

Files in this turn's diff — and only these:

- `supabase/functions/_shared/ltp/pass2r-validators.ts` (entity-whitelist builder, its extractor, its matcher, version stamp)
- `supabase/functions/_shared/ltp/item285-entity-whitelist.test.ts` (new)
- `docs/pipeline-state.md`
- `docs/courier/ITEM285-ENTITY-WHITELIST-FIX-2026-07-30.md` (this file)

No other validator's builder was touched: within `pass2r-validators.ts` the citation, numeric/date, verdict-consistency, section-structure, atomic-token and no-self-contradiction functions and their whitelist inputs (`citations`, `numerics`, `verdict*`, `registry_keys`, `stated_facts`) are byte-unchanged; `pass2r-llm.ts`, the 2R prompt, all composers, all Track-1 files and `supabase/_rebuild-snapshot-item244/` are untouched.

## 5. DEPLOY / LIVE-CALL DECLARATION

Deployed: **`replay-cppa-risk-harness` ONLY** — success confirmed. No other function deployed. No LLM call, no harness invocation, no DB write, no grader edit this turn.

**Disposition:** LANDED. The 10-doc re-run batch is released to the controller.
