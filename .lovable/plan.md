# RC-C3.CYB-1 — Design Note (no code edits this turn; gate stays OFF)

## (a) Chosen ask-vocabulary for cyber open-item `target.path`

**Vocabulary: dotted `controls.<slug>`** (e.g. `controls.c13_training`, `controls.c14_secure_dev`).

Rationale — chosen over the two alternatives:

- **Bare slug `c13_training`** (current prompt): requires either a blanket allowlist bypass in `insufficient-info-guard.ts` closed-set (forgeable — any 2-char string starting with `c` would sneak through) or a hardcoded 18-slug allow-set. Rejected: violates constraint #1 ("no forgeable bypasses").
- **Indexed `controls[12].maturity`**: encodes the intake's array position into the frozen ask. Rejected: brittle if intake ordering ever changes; slug is the durable key.

Dotted `controls.<slug>` is:
- Deterministically synthesisable from a nested walk (constraint #1).
- Verifiable in the closed-set check by resolving `controls[]` and matching `.key === "<slug>"` — no substring/wildcard needed.
- Already the shape `computeCyberTestStates` uses for `source_fields` (`controls.c13_training.maturity`), so vocabularies align.

Guard change (design, not implemented this turn): extend the closed-set filter in `insufficient-info-guard.ts` to accept dotted paths whose first segment is an intake key AND, when that intake value is an array of `{key,…}` records, whose second segment matches an element's `.key`. Non-controls dotted paths retain today's exact-top-level behavior.

## (b) Where the revision path writes an answered control — and resulting alias entries

**Write vocabulary (file evidence):**
- `run-cppa-cybersecurity/index.ts:1152–1153` iterates `report.controls[idx]`; the persisted report shape is `controls: [{ control: <human name>, status, finding, remediation, deadline, … }]` — an array keyed by index, with the human name in `control` (NOT the slug).
- `run-cppa-cybersecurity/index.ts:569–579, 723–729` confirm the same shape (18-element array; `c.status`, `c.control`).
- `applyRevisionPatch` (`_shared/revision-patch.ts:63+`) writes only whitelisted `changed_paths` into `report_data`. A revision resolving a control gap therefore emits paths of the form `controls[<idx>].status` (and/or `.finding`, `.remediation`).

**Parity does NOT hold** — ask vocabulary is `controls.c13_training` (slug), write vocabulary is `controls[12].status` (index + human name). D-2 confirmed.

**Alias entries** — explicit and enumerated (no wildcards). Slug→index derived from the frozen 18-element order defined in `_shared/cyber-contract-fixtures.ts` and mirrored in the generator (`c1_auth`…`c18_continuity`, indexes 0…17):

```
TARGET_PATH_ALIASES.cppa_cybersecurity = {
  "controls.c1_auth":         ["controls[0]"],
  "controls.c2_encryption":   ["controls[1]"],
  "controls.c3_account_access": ["controls[2]"],
  "controls.c4_inventory":    ["controls[3]"],
  "controls.c5_secure_config":["controls[4]"],
  "controls.c6_vuln_mgmt":    ["controls[5]"],
  "controls.c7_audit_logs":   ["controls[6]"],
  "controls.c8_network_mon":  ["controls[7]"],
  "controls.c9_anti_malware": ["controls[8]"],
  "controls.c10_segmentation":["controls[9]"],
  "controls.c11_port_protocol":["controls[10]"],
  "controls.c12_awareness":   ["controls[11]"],
  "controls.c13_training":    ["controls[12]"],
  "controls.c14_secure_dev":  ["controls[13]"],
  "controls.c15_third_party": ["controls[14]"],
  "controls.c16_retention":   ["controls[15]"],
  "controls.c17_incident":    ["controls[16]"],
  "controls.c18_continuity":  ["controls[17]"],
};
```

The existing `qc_rc_2` matcher already accepts descendants (`c + "."` / `c + "["`), so an alias of `controls[12]` covers `controls[12].status`, `controls[12].finding`, `controls[12].remediation` — no matcher change needed (constraint #2).

**Slug↔index binding is contract, not inference.** The 18-slug ordering is fixed in the fixture and the generator; any future reorder would require the alias table to be updated in the same commit (add a unit test that pins slug order = alias order).

## (c) New fixture shape + answer_targets

Rewrite `_shared/cyber-contract-fixtures.ts` `intake` in the live shape from `CPPACybersecurity.tsx` / `computeCyberTestStates` (array-of-records with `maturity`, not object-with-status):

```ts
intake: {
  entity_name: "Halcyon Health Systems, Inc.",
  industry: "Healthcare SaaS",
  sector: "Healthcare",
  profile: {
    entity_name: "Halcyon Health Systems, Inc.",
    industry: "Healthcare SaaS",
    incidents_12mo: "1",
    framework: "SOC 2",
    last_audit: "2025-09-15",
  },
  controls: [
    { key: "c1_auth",          label: "Authentication",              maturity: "Implemented", notes: "SSO+MFA; hardware keys for admins." },
    …
    { key: "c12_awareness",    label: "Cybersecurity awareness",     maturity: "Implemented", notes: "Annual training; monthly phishing." },
    { key: "c13_training",     label: "Cybersecurity education and training", maturity: "", notes: "" },
    { key: "c14_secure_dev",   label: "Secure development and coding practices", maturity: "", notes: "" },
    { key: "c15_third_party",  label: "Third-party oversight",       maturity: "Implemented", notes: "Vendor security reviews." },
    …
    { key: "c18_continuity",   label: "Business continuity / DR",    maturity: "Implemented", notes: "Monthly restore drills; RTO 4h / RPO 15m." },
  ],
},
answer_targets: ["controls.c13_training", "controls.c14_secure_dev"],
```

Result: `computeCyberTestStates` will render M4…M21 for 16 controls as `resolved_met` and 2 as `indeterminate` — matching the intake JSON the generator sees (D-3 resolved).

## (d) Files to touch (when authorized)

1. `supabase/functions/_shared/insufficient-info-guard.ts` — extend closed-set check to accept dotted `controls.<slug>` when the intake `controls[]` element with `.key === slug` exists; extend `ASK_ELIGIBLE_CRITICAL_FIELDS` with a **nested-walker** entry for `cppa_cybersecurity` that enumerates any control whose `maturity` is empty or "Insufficient information" (deterministic — GOV-ASK-1 pattern, constraint #1). Registry comment at :39–44 is removed (obsolete). Synthesised `why`/`how_to_provide` copy avoids the word "gap" (constraint #3).
2. `supabase/functions/_shared/target-path-aliases.ts` — replace empty `cppa_cybersecurity: {}` with the 18 explicit entries above.
3. `supabase/functions/_shared/open-items.ts` — add `cppa_cybersecurity` entries to `T_CLASS_FIELDS` mapping each `controls.<slug>` to an enum_ref (`cppa_cybersecurity:maturity`) so refine renders a proper maturity re-select rather than bounded-narrative.
4. `supabase/functions/_shared/cyber-contract-fixtures.ts` — rewrite intake in live shape; update `answer_targets` to dotted vocabulary (D-3).
5. `supabase/functions/run-cppa-cybersecurity/index.ts` — prompt fix (~:459–463): change example from `c14_third_party` to `controls.c14_secure_dev`; instruct `information_needed.field` to use dotted `controls.<slug>` (D-4 + vocabulary alignment).
6. `supabase/functions/_tests/cppa-cyber.test.ts` — add tests: (i) all 18 alias entries present and aligned with fixture order; (ii) guard synthesises asks for empty-maturity controls; (iii) synthesised copy contains no "gap".
7. **BUILD_STAMP bumps** on: `run-cppa-cybersecurity`, `run-quality-batch`, `ql3-orchestrator`, `regenerate-assessment` (constraint #5).

**No schema changes.** No changes to admt / governance / risk paths (constraint #4). No matcher changes (constraint #2).

## Options / trade-offs surfaced for CEO+legal

- **Alias target granularity: `controls[N]` vs `controls[N].status`.** I recommend `controls[N]` (aggregate) so a resolution that legitimately touches `.status` + `.finding` + `.remediation` for the same control counts once; the descendant match handles all three. Trade-off: a revision that touches ONLY `controls[N].remediation` (leaving status untouched) would still be treated as a resolution — acceptable because verdict copy is separately checked, but legal may prefer the tighter `.status`-only alias if they want the contract to require an explicit status change.
- **Nested-walker in guard vs static registry.** Static registry (list all 18 slugs) is simpler but drifts if the slug set ever changes. Nested walker (iterate `intake.controls[]` at runtime) is self-maintaining. I recommend the walker; static list is the fallback if legal wants the ask set fully declarative.

STOP after design note. Awaiting CEO authorization to implement.
