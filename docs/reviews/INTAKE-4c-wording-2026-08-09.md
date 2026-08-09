# INTAKE-4c — ADMT Checker wording and prefill pass (2026-08-09)

No intake key was added, removed, or renamed. No option list changed. Every
row below keeps its own key and its own stored value.

## Wording pass (plain language, "why we ask" where the law drives the ask)

- Training-data row: "Do you use personal information to train any automated
  decision system?" with a § 7153 reason line, replacing the citation-in-label
  phrasing.
- Human-reviewer rows (§ 7001(e)(1)(A)–(C)): trained / other information /
  authority to change now each carry a reason line explaining why the answer
  decides whether a reviewer counts.
- Pre-use notice element rows (§ 7220(c)): each element label restated in
  customer language ("What information goes into the system", "What happens
  instead for someone who opts out", and so on).
- Opt-out confirmations: turned from "Confirm: ..." assertions into questions
  ("Is a cookie banner your only way to opt out?", "Does someone have to create
  an account to opt out?") with § 7221(c)(4) and § 7221(e) reason lines. Stored
  option strings are unchanged.
- § 7222(b) readiness elements and the two disclosure rows restated in plain
  language; the statutory pinpoints stay in the labels.

## Prefill-as-confirmation (prefill only, never merge)

Each row seeds once while untouched and empty, is presented as a confirmation,
and stops prefilling permanently once the customer edits it. A restored draft
marks every prefill row as touched, so a saved answer is never overwritten.

| Row | Seeded from |
| --- | --- |
| `affected_population_band` | California consumer count, banded |
| `adv.hi_reviewer_present` | step-1 human-review answer |
| `adv.vendor_product` | first named third-party system |
| `access_logic_disclosure` | § 7222(b)(2) readiness process note |
| `access_outcome_disclosure` | § 7222(b)(3) outcome readiness process note |
| `notice_full_text` | element-by-element notice transcriptions, joined |

## Verification

- `src/test/intake4c-admt-package.test.ts` — contract keys and the
  affected-population band options and optionality are unchanged.
- Full frontend and edge suites green.
