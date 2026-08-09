# INTAKE-4e/f/g — LIA, Governance, Biometric intake passes (2026-08-09)

Parity rule observed: keys, option strings and stored values are byte-identical
everywhere except the one CEO-approved biometric addition.

## INTAKE-4e — LIA (no merges)
The three proposed merges are REJECTED and were not implemented. Prefill /
conditional display only, always click-gated:
- `vulnerableSubjects` — when "Are any data subjects children?" is "Yes",
  "Use my earlier answer" adds the existing option `Children under 16`.
- `potentialHarms` — when the worst-case narrative is substantive and no harms
  are selected, "Start from my earlier answer" selects the matching option
  strings verbatim (`HARM_PREFILL`).
- `optOutMechanism` — when availability is "No opt-out is available" and the
  field is empty, "Start from my earlier answer" seeds an editable opener.
`vulnerableSubjectsOther` unchanged. No wording changes in this package.

## INTAKE-4f — Governance
- Wording pass: `dsrCapability` question + helper rewritten in plain language;
  all five option strings unchanged.
- Prefill-confirm: `euUkData` (from an EU/UK jurisdiction selection) and
  `specialCategory` (from health or biometric data categories). Both remain
  fully editable radios; nothing is stored without a click.

## INTAKE-4g — Biometric
- Wording pass: the Texas (CUBI) stage prose now states the notice-and-consent
  duty and the one-year destruction outer bound in plain language, with
  Tex. Bus. & Com. Code § 503.001 named in the question's own text.
- Addition (CEO-approved 2026-08-09): `biometric_consent_withdrawal` —
  "How can a person withdraw biometric consent, and what happens after
  withdrawal?" Optional narrative, wired through the form, the shared intake
  contract, `FIELD_LABELS`, and both biometric golden fixtures. GDPR-scope
  value, BIPA-neutral framing. Contract field count 37 → 38.

## Verification
- `src/test/intake4e-lia-package.test.ts` (4 tests)
- `src/test/intake4fg-gov-bio-package.test.ts` (5 tests)
- 1152 frontend tests and 3304 edge tests green.

This closes the field universe: no intake key, option or stored value changes
anywhere in PART 2 (SO-1 … SO-11).
