# T-C1 — CPPA-RISK INTAKE CONTRACT: `bought_sold_shared_count` (§ 1798.140(d)(1)(B) operand)

**Dispatch:** T-C1 INTAKE CONTRACT TURN (CEO-approved 2026-07-28).
**Authored:** 2026-07-28T05:13Z.
**Ledger:** Item 220 (`docs/pipeline-state.md`).
**Deploy:** NONE — authoring-only turn.

---

## 1. Legal frame

Civ. Code § 1798.140(d)(1)(B) — a "business" includes any entity that "alone or in combination, annually buys, sells, or shares the personal information of 100,000 or more consumers or households." This is the (B) prong of the CCPA covered-business definition.

Until this turn the cppa-risk intake had no operand for (B): the T7 opening builder (`risk-opening.ts:169`) already read `intake.bought_sold_shared_count` against `BOUGHT_SOLD_SHARED_BANDS_100K_OR_MORE`, but no intake surface supplied the value, so (B) never resolved deterministically from user data — every affirmative sell/share intake flowed into the (B)-gap `information_needed` question. This turn adds the operand.

## 2. Statutorily-aligned band enum

`BOUGHT_SOLD_SHARED_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"]`

- The **100,000** edge is the hard § 1798.140(d)(1)(B) statutory line — no band may straddle it (design law).
- The **250,000** and **1,000,000** edges mirror V2 `CONSUMER_OPTS` (per the § 7120(b)(2)(A) prong) so the user sees a familiar band vocabulary. They carry no independent (B) legal weight.
- Named `BOUGHT_SOLD_SHARED_OPTS`, distinct from `CONSUMER_OPTS`, so refactor cannot silently route `q2_consumers` picks into the (B) operand slot (see `risk-opening.ts` design rule 6 — SEMANTIC OWNERSHIP OF OPERANDS).

Defined verbatim in three canonical sites:

| Site | Path |
| --- | --- |
| Server contract | `supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts` |
| Form module | `src/pages/CPPARiskAssessment.enums.ts` |
| Field-enums mirror | `supabase/functions/_shared/field-enums.ts` (`FIELD_ENUM_MIRROR["cppa_risk_assessment:bought_sold_shared_count"]`) |

## 3. Contract wiring

`cppaRiskContract.fields` gains:

```ts
{ key: "bought_sold_shared_count", kind: "enum", required: "optional",
  options: BOUGHT_SOLD_SHARED_OPTS }
```

- **Optional** — unanswered flows to `information_needed` via the (B)-gap gate (see §5).
- **Legacy resolver** — rows without the key resolve to unknown. `risk-opening.ts` coerces via `str(...)` → empty string → `hasCompliantBssBand=false` → no deterministic (B) assertion (omission over invention preserved).

## 4. UI question

Added at `src/pages/CPPARiskAssessment.tsx` inside the affirmative-Q5 block (rail-key `bought_sold_shared_count`), gated on `q5 && q5 !== "No"` (parallels Q5c):

> **Q5e:** Approximately how many California consumers or households have personal information you *buy, sell, or share* annually? *(§ 1798.140(d)(1)(B))*
>
> *Optional — this is the operand for the § 1798.140(d)(1)(B) covered-business prong. If left blank, the assessment will list it as an outstanding item rather than assume a value.*

State variable `bssCount` wired into `intake`, `draftData`, `INITIAL_DRAFT_JSON`, and `applyRestore` (with `BOUGHT_SOLD_SHARED_OPTS.includes(...)` guard on restore).

## 5. `shouldEmitBCriterionCountQuestion` — callsite-derived semantics

Predicate signature unchanged; doc-comment codifies the callsite-derivation rule:

```ts
has_compliant_count_field =
  BOUGHT_SOLD_SHARED_OPTS.includes(String(intake.bought_sold_shared_count ?? ""))
```

Rules:
- **Unanswered** → question emits (when A unresolved AND sell/share affirmed).
- **Answered with any enum band** — including `"Under 100,000"` — question suppressed. The (B) prong resolves against the answered value; the user is not re-asked.
- **Off-enum legacy value** (e.g. `"roughly 500k"`) does NOT satisfy `has_compliant_count_field` → question emits.

New test in `content.test.ts` exercises all three rules across the four enum bands.

## 6. Refine surface + T-class register

- `src/components/refine/fieldEnums.ts` — `bought_sold_shared_count: BOUGHT_SOLD_SHARED_OPTS`.
- `supabase/functions/_shared/open-items.ts` — `bought_sold_shared_count: { enum_ref: "cppa_risk_assessment:bought_sold_shared_count" }`.

## 7. Fact-ledger

The field enters the intake object under key `bought_sold_shared_count`. The existing `derive.ts` intake-ledger construction preserves polarity and verbatim value for every intake field, so no additional wiring is required — the field appears in the ledger the moment it is answered.

## 8. Tests extended

| File | Additions |
| --- | --- |
| `supabase/functions/_tests/intake-contracts.test.ts` | PARITY row (`RISK_BSS_OPTS === RiskEnums.BOUGHT_SOLD_SHARED_OPTS`), MIRROR row for `cppa_risk_assessment:bought_sold_shared_count`. |
| `supabase/functions/_shared/ltp/content/content.test.ts` | Callsite-derived predicate semantics — three cases across the four enum bands. Matrix test untouched. |

## 9. Deploy status

**NONE.** No edge function was deployed. The new field will not exercise runtime paths until (i) a fresh intake is submitted through the updated UI and (ii) the LTP-cutover chain (Item 218 plan, steps T-M1..T-M10) routes the operand through Pass-2 rendering.

## 10. Disposition

**HARD STOP** for controller review. Next turn per Item 218 plan remains **T-M1 (authoritative Pass-1 wire)**; this contract turn front-loads the operand so the LTP cutover has a real intake field to consume.
