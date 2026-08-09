# INTAKE-4b — CPPA Cybersecurity intake wording pass

Date: 2026-08-09
Scope: `src/pages/CPPACybersecurity.tsx` (framing copy), one optional field
addition, one prefill-confirm. No stored values, option lists, keys, or
question order changed except as recorded below.

## 1. Wording pass (framing text only)

| Surface | Before | After |
| --- | --- | --- |
| Maturity (all 18 components) | "Rate coverage as deployed today, not as designed or planned." | "Rate what is running today, not what is designed or planned. Why we ask: the audit records the programme as it stands, and an overstated rating is the finding an auditor tests first." |
| Notes (default) | unchanged | unchanged; now overridable per component via `Control.notesHint` |
| Evidence (default) | unchanged | unchanged; now overridable per component via `Control.evidenceHint` |
| `c4_inventory` notes/evidence | generic default | component-specific hint |
| `c11_port_protocol` notes/evidence | generic default | component-specific hint |
| `in_scope_frameworks` | "Select every framework whose existing evidence you intend to leverage under § 7123(f)…" | plain-language rewrite plus a "Why we ask" clause; a distinct confirmation variant is shown when the row is prefilled and untouched |

The maturity ladder's five rung definitions are stored values and are
untouched. Verified by snapshot in `src/test/intake4b-cyber-package.test.ts`.

## 2. Prefill-confirm — `profile.in_scope_frameworks`

`profile.framework` already supplies the customer's primary framework. That
value is now carried into `in_scope_frameworks` as a prefill and the help text
asks the customer to confirm it. The row remains its own question: same key,
same option list, same stored values, and any manual touch (or a restored
draft) suppresses the prefill permanently for that session. The rows are not
merged.

## 3. Addition — `profile.remediation_owner`

- Question: "Who owns remediation of findings from this audit?"
- Optional at the data layer; free text.
- Wired end to end: contract, form, `FIELD_LABELS`, parity test, `CYBER_PERFECT`.
- Legacy saved drafts without the key continue to validate (test covers this).

## 4. Verification

- `src/test/intake4b-cyber-package.test.ts` — 7 tests: option/key snapshot,
  golden-intake revalidation, legacy back-compat, parity, prefill machinery.
- Full frontend and edge suites green.
