# LTP-RISK — overall_risk_level tier mapping — HELD-F (item 148)

**Stamp:** 2026-07-26T20:06:45Z
**Dispatch:** CONTENT COURIER — overall_risk_level five-tier mapping (release attempt for HELD-E item 147).
**Outcome:** **NEW HELD-F opened per the courier's OWN name-binding escape clause.** No wiring, no deploy, no batch launch.

## Verbatim enum (from defining source files)

**Primary source — `supabase/functions/run-cppa-risk-assessment/index.ts:654`:**

```
"overall_risk_level": "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis",
```

**Mirror — `src/components/cppa/RiskAssessmentReportV4.tsx:48`:**

```
overall_risk_level?: "Low" | "Moderate" | "High" | "Critical" | string;
```

`RiskAssessmentReportV4.tsx:86` further shows `"Insufficient basis to assess"` is treated as an alias of `"Insufficient basis"` in the renderer (`displayInsufficientBasis`).

## Why HELD (rule-1 discipline)

The courier's name-binding rule states, verbatim:

> "if the enum is `["Low","Moderate","High","Critical","Severe"]` → T1..T5 in that order EXCEPT Critical/Severe order must follow the codebase's own ordering if it differs; if `["Minimal","Low","Moderate","High","Critical"]` → T1..T5 in that order. **If the enum matches NEITHER shape exactly, HELD naming the verbatim enum — do not improvise a binding.**"

The live enum is `["Low","Moderate","High","Critical","Insufficient basis"]`.

- Shape A match test: NO — 5th member is `"Insufficient basis"`, not `"Severe"`.
- Shape B match test: NO — 1st member is `"Low"`, not `"Minimal"`.

Additionally, `"Insufficient basis"` is a **non-severity sentinel** (per the prompt at index.ts:566 and the `Colorable argument` doctrine at index.ts:609, `Insufficient basis` is reserved for record-completeness failures on the *conclusion* axis and is explicitly NOT a substantive severity level). Treating it as T5 would violate the semantics the generator prompts already enforce (`OVERALL_RISK_LEVEL MEASURES SUBSTANTIVE PRIVACY RISK ONLY`). Treating it as T1 would misclassify record-incomplete runs as trivially clean.

Effective severity tiers reachable = 4 (`Low`, `Moderate`, `High`, `Critical`). A 5-tier T1..T5 mapping cannot be bound without improvising a decision on where `"Insufficient basis"` sits — expressly forbidden.

## Sanity-check against live data (also failing)

The courier requires: "the binding must make the observed values (Moderate/High/Critical) reachable as T3/T4/T5-or-T4 respectively; if not, HELD."

Under any 4-severity + sentinel binding, `Critical` maps to T4 at best (the highest **severity** tier), but the courier requires `Critical` reachable as **T5-or-T4**. That is satisfiable, but the T5 slot itself is then unfilled by any severity value — the T5 aggregation class (impacts-outweigh + Severe/Highly-likely) has no destination name in the enum. Fails sanity: aggregation classes must map surjectively.

## What is needed to release HELD-F (specific missing content item)

One of the following, controller-authored:

1. **Adopt Shape A verbatim** by renaming the enum's 5th member from `"Insufficient basis"` to `"Severe"` (or adding `"Severe"` and relocating `"Insufficient basis"` off `overall_risk_level` — noting that removes it from a documented public schema field and would require a serializer/PDF migration ruling); OR
2. **Adopt Shape B verbatim** by prepending `"Minimal"` and removing `"Insufficient basis"`; OR
3. **Author a courier explicitly binding the 5-value enum `["Low","Moderate","High","Critical","Insufficient basis"]`** — stating the semantic role of `"Insufficient basis"` in aggregation (e.g., "sentinel; never emitted by the deterministic mapping; caller's value passes through untouched"), and specifying which of the 4 severity tiers absorbs the T5 aggregation class.

## Downstream status

- Composer (`_shared/ltp/summary-compose.ts`) continues to pass `overall_risk_level` through verbatim from the caller; `telemetry.overall_risk_level_held=true`. No behavioural change.
- Part-1 index integration (LTP_ENFORCE_ENABLED on, adapter wiring per surface map): **HELD-F**.
- Part-2 measurement batch (cppa-risk, batch_size 6, standalone s5, scenario_set='tuning'): **GATED on Part-1**.
- `BUILD_STAMP` unchanged (`ltp-risk-p2+fb-f0@2026-07-26T09:08:39Z`); no deploy.
- Items 143 / 143b / 143c / 145 (HELD-D) / 147 (HELD-E) NOT released — HELD-E is superseded by HELD-F on the same subject (verbatim enum now on record).

## CEO-rule compliance

- Rule 1 (verify from the codebase before binding): source paths and lines pasted above.
- Rule 2 (double-check): both defining/mirror source files inspected; alias handling in the renderer noted.
- Only-valid-hold-shape rule (standing ruling): HELD names a **specific missing customer-facing content item** — the T5-slot binding for the 5-value enum.
