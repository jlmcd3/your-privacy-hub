# FUTURE BUILDING — Program Design

**Status:** ADOPTED (CEO 2026-07-26). F0 observation layer built into the Legal Test Pipeline from the start. F1 and F2 are CEO-gated on observation volume.

---

## 1. Purpose

Pattern recognition over recurring scenario structures so reports compile faster over time. Where two runs share the same derivation shape (product, jurisdiction, canonical enum/band answers, gate outcomes, and free-text presence pattern), the second run should be able to reuse the first run's derivation SCAFFOLD — never its prose — and re-inject the current customer's tokens through the same validator battery.

Speed is the goal. Correctness is not negotiable — patterns accelerate the derivation, they never bypass validators.

---

## 2. Principles (law of the program)

### 2.1 Memoize the derivation, never the prose

The pattern store holds abstract structure only:

- Propositions (id, epistemic_type, jurisdiction_tag, anchor references, ledger-ref shape).
- Factor table (factor_ids and their present/absent-in-intake bit — never intake values).
- Gate outcomes.
- Template / variant selections at each Pass-2 slot.
- Weighing-frame selections (Pass-G corpus_refs and closeness contributions).

All customer verbatim values — dates, names, org identifiers, purpose descriptions, safeguard narratives — are stripped at store time. At compile time, the current customer's tokens are re-injected into the same slot shape and the FULL validator battery runs unchanged.

**Consequence:** a pattern cannot mask an intake-driven finding. If the same structural shape produces a different validator outcome on a new intake, the pattern's write-through re-runs Pass 1 from scratch and the pattern is demoted.

### 2.2 Version-pinned, epoch-invalidated

Every stored pattern pins:

- Instrument version (grader instrument id, e.g. `gc-2026-07-26-s5`).
- Factor-registry version (per product).
- Corpus batch stamps (provision_texts, edpb_guidelines, enforcement_actions).
- Template registry version.
- Legal-Test rev (currently v2.3).

Any bump in any pinned version DEMOTES every pattern that references it to OBSERVATION-ONLY until revalidation. Patterns are never served across epoch boundaries. This is the single most important safety mechanism against a corpus change silently ratifying stale derivations.

### 2.3 Privacy posture (PI-free store)

- The store is PI-free by construction. The scenario signature is a SHA-256 hash over enum/band answers, gate outcomes, and free-text PRESENCE flags — never free-text content.
- PI-shaped keys (name, email, phone, address, dob, ssn, tax_id, user_id, customer_id, org_id and near-variants) are REJECTED by the signature module at compute time — a hard error, not a warning.
- Harvesting from TEST datasets — fixtures, waves, trials, quality_runs rows — is permitted immediately.
- Harvesting from CUSTOMER runs is post-delivery / async ONLY and formally joins the DEFERRED PRODUCTION-FEEDBACK design (ToS / consent review lives there). Nothing customer-derived flows into the pattern store before that design turn lands and is CEO-approved.

### 2.4 Quality gate

- Only validation-passing plans are observed.
- Only clean-graded patterns (batch-mean score at or above the current tool floor and zero critical findings on the pattern's own runs) are promoted from observation to serving.
- Any finding later attributed by root-cause analysis to a served pattern immediately demotes that pattern back to observation.

---

## 3. Phases

### F0 — Observe (BUILT now)

Emit a scenario signature and pinned version block on every validation-passing pipeline run. Write to `pattern_observations`. NO pattern serving. NO compile-path changes. Failure of the observation write is non-blocking — the run always ships.

### F1 — Promote at recurrence threshold k (CEO-gated on volume)

Once a signature has been observed k times with clean grading across the batches, allow serving the memoized derivation scaffold from that signature. Compile-time re-injection + full validator run remain mandatory.

### F2 — Semantic bucketing + per-section matching (CEO-gated)

Signature buckets that share sub-shapes (same balance-slice factor-table + gate outcomes, different purpose-legitimacy sub-shape) can be reused per section rather than whole-plan. Higher recall on scaffold reuse; harder demotion accounting; only reached after F1 is stable.

---

## 4. Storage

`public.pattern_observations`:

| column | type | notes |
|---|---|---|
| id | uuid | pk |
| product | text | e.g. `cppa-risk-assessment`, `li-assessment` |
| signature | text | SHA-256 hex (64 chars) |
| plan_version | text | RenderPlan.plan_version (`v1`) |
| instrument_version | text | grader instrument id at time of run |
| registry_versions | jsonb | `{ factors, corpus, templates, legal_test_rev, ... }` |
| scenario_set | text | fixtures / waves / trials / campaign name; NULL for customer runs (which do not write in F0) |
| run_ref | text | assessment/session id (opaque; not FK to auth.users) |
| created_at | timestamptz | default now() |

Indexes: `(product, signature)`, `created_at DESC`. RLS enabled; SELECT limited to admin role; service_role for edge-function writes.

NO intake payloads, NO free-text values, NO report bodies are ever stored on this table.

---

## 5. Emission contract

Called post-validation, non-blocking, from within the Legal Test Pipeline shadow-mode block. Telemetry lands under `_meta.internal.future_building = { signature, observed: true }` (or `observed: false` with a reason when the write is skipped or fails).

Skipped cases (all non-fatal):
- Validator battery emitted any error-severity issue.
- Signature computation threw (usually PI-shaped-key rejection — a defect in the caller's field selection, not a runtime error).
- DB write failed.

---

## 6. Non-goals

- Not a caching layer for LLM outputs. The store never holds prose.
- Not a customer-run analytics store. Any customer-run signal joins the future production-feedback design and is scoped to that design's ToS/consent review.
- Not a substitute for the deterministic gates in the Legal Test Pipeline. Every gate still runs on every run, patterned or not.
