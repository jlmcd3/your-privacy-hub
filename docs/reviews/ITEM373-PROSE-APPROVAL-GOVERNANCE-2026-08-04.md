# CHANGE CONTROL — prose-library approval governance (2026-08-04)

## 1. Approval lives only in the database

- `scripts/prose/seed-library.ts` now builds its SQL through the pure module
  `scripts/prose/seed-sql.ts`. The upsert's `ON CONFLICT ... DO UPDATE SET`
  list is `library_schema_version, provenance, content_hash, <payload column>`
  — `approved` is absent, and the builder throws if a future edit reintroduces
  it. A brand-new row inserts with `approved = false`.
- The runtime gate no longer trusts the payload: `_shared/prose/library-source.ts`
  overlays the row's `approved` column onto the parsed payload **after** the
  content-hash check, so `planRenderable()` / `frameSetRenderable()` obey the
  database column and nothing else.
- Regression suite: `src/registry/__tests__/prose-seed-approval-guard.test.ts`
  (4 tests). It pins the statement shape for every seeded item and, against a
  live scratch table, seeds over a row with `approved = true`: after the upsert
  `approved` is still `true` while content, hash and schema version refresh.
- Live proof: the re-seed performed in this work rewrote all 11 payloads and
  left every approval value exactly as found (governance `false`, all others
  `true`). The temporary write grant used for that re-seed was revoked
  immediately afterwards.

## 2. Source files no longer carry operative approval

`approved` was removed from `library/prose/plans/*.json` and
`library/prose/frames/*.json` and replaced by:

```json
"seed_default_approved": false,
"approval_authority": "approval is recorded ONLY in the database columns prose_document_plans.approved / prose_frame_sets.approved (CEO sign-off). This file's seed_default_approved applies only when seeding inserts a brand-new row."
```

`library/prose/load.ts` materialises file-backed constants as UNAPPROVED.
Pin tests now pin content only:

- `src/registry/__tests__/prose-library-pin.test.ts` asserts the payload has
  **no** `approved` key, `seed_default_approved === false`, and the
  content hash / payload equality. It no longer asserts any approval state.
- `tests/edge/_shared/prose/plan.test.ts`, `frames.test.ts`,
  `item364-*-register.test.ts` and `item372-dpia-quality-pilot.test.ts` were
  updated the same way.

## 3. Version-label reconciliation

The pilot report's "v2" meant the **second content revision of the dpia plan
artifact** (label `version: "prose-plans-2026-08-04-item372"` inside the
payload), seeded into the single existing row. It never meant a second row.
The DB fields are: `version = 1` (row version), `library_schema_version = 2`
(loader schema). The v2 content **did** land — the row's hash matched the
authored file at seeding (`9d256ac7…`) and matches it again now after the
field rename (`70718f28…`). The packet line has been corrected to say so, and
the plan's own provenance sentence ("directed re-seeding as version 2") should
be read as that content revision.

## Full table — as of this work

| product | kind | version | library_schema_version | approved | content_hash |
|---|---|---|---|---|---|
| biometric | frames | 1 | 2 | true | `5d3942acf69ed1f74ee68e6f6f159c10984139a42c6c4196dbe62b36ae19b75c` |
| cppa-risk | frames | 1 | 2 | true | `5393367f29600f4a8488a217e4579714149b1f6d9564a7e4bc33cefe312e23dd` |
| dpia | frames | 1 | 2 | true | `70a1fd949f8954f16e99d1d78071b600de27cb892d190b88ef5f4cd2e44c11bf` |
| lia | frames | 1 | 2 | true | `9aea97e025a3acd4c9980ce8445dd5ea96a0970f18cae28b4f4ecc5a5a3a4e8e` |
| registration | frames | 1 | 2 | true | `cb96b055797a73135f59016121e0078c54dc748d4c1e714e3e9a04ab2233bc59` |
| biometric | plan | 1 | 2 | true | `a8be240fefc579e0f53985b1a91b29b129a08e331a18fbd38eafb4bf7ab589c7` |
| cppa-risk | plan | 1 | 2 | true | `86ccab5d1fdf3a47e7fcba97f92ff311eab94a20f30ce276a695043bf9f1d970` |
| dpia | plan | 1 | 2 | true | `70718f283b4cd310a070a5f65dcf8efaaf3ae6ac0d81b1cb0b2f7b9081697897` |
| governance | plan | 1 | 2 | **false** | `0101299d328771d198625d722000c7219c012d8de5ec243e40c9b3914df22a41` |
| lia | plan | 1 | 2 | true | `50290c9011cebdbd3a7858b8c868d9a8aec8bb96d86304ebbe2944faf94db6af` |
| registration | plan | 1 | 2 | true | `7b25ebd66843f49928b543f79c5928b38f3ea73fb4097b53eec8c11d5054f5e9` |

Approval column matches the CEO-set state exactly; no approval value was
changed in this work. Hashes changed for all 11 rows because of the
`approved` → `seed_default_approved` field rename (content only).

## Suites

- `src/registry/__tests__/prose-library-pin.test.ts` + `prose-seed-approval-guard.test.ts`: **10/10 pass**.
- Frontend (`vitest run`): **1027/1027 pass, 75 files**.
- Prose + register Deno suites (`_shared/prose/`, item364 ×4, item369, item372):
  **188 pass, 1 fail** — `F13 — NO FLATTENING`, confirmed pre-existing at HEAD
  (reproduced with the baseline `load.ts` and baseline cppa-risk artifacts).
- Full edge suite: **2275 pass, 74 fail, 5 ignored** — the standing baseline
  (cyber/admt/grader stamp and registry suites); none touch approval or the
  prose library.
