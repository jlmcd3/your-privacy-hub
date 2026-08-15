# Item 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only)

The Table of Authorities now renders VERTICALLY — one authority per line, single
column — in both customer surfaces. Entry bytes, order, citation form and count
are exactly what the ledger produces (as repaired by items 2–3).

## Root cause
`repairRegister` (register-repair.ts) ends with `replace(/\s{2,}/g, " ")`. The
render chokepoint in `skeleton-render.ts` applied it to every composed block,
which flattened the ToA's `"\n    "` indentation into a run-on paragraph before
either surface saw it. Both surfaces already used `white-space: pre-wrap`, so
neither could recover the lines.

## Renderers
- Shared line law: `supabase/functions/_shared/prose/skeleton-render.ts`
  — `repairLinePreserving()` (per-line repair, indentation preserved) and
  `toaLines()` (single-column layout; legacy flattened ledgers re-split).
- Web: `src/components/reports/SkeletonDocumentView.tsx` — `ToaView`, a
  single-column `<ul>`, one `<li>` per authority, via `src/lib/toa-lines.ts`.
- PDF: `supabase/functions/generate-report-pdf/index.ts`,
  `skeletonSectionsHtml()` `table_of_authorities` branch — single-column
  `<table class="toa-table">`, one `<tr>` per authority, same ordering.

## Shared or forked?
SHARED — no DPIA-only copy. Every product whose spine carries a
`table_of_authorities` section inherits the vertical layout:
cppa-risk, cppa-cyber, cppa-admt, governance, dpia, lia, ir-playbook,
biometric, registration, and RoPA.

## Tests (sentinel)
- `tests/edge/so-final-test/item4-toa-vertical.test.ts` — 4/4 green.
- `src/test/item4-toa-vertical.test.tsx` — 1/1 green.
Three authorities render three separate lines/rows in both surfaces; no ToA
line contains two citations.

## Vertical ToA — fixture-A excerpt (live DPIA e6eb478e ledger)
```
Regulations
    GDPR Art. 25(1)
    GDPR Art. 28(3)
    GDPR Art. 32(1)
    GDPR Art. 36(1)
    GDPR Art. 5(1)(b), (1)(c), (1)(d)
    GDPR Art. 6(1)(c)
    GDPR Art. 9(1), (2)(h)
```

## Deploy
22 closure functions deployed. `run-admt-checker` again rejected at the 4.5 MB
platform size cap (pre-existing, unrelated); it remains the only consumer on
older shared bytes.
