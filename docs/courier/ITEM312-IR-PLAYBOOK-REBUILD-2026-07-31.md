# ITEM 312 — cppa/ir-playbook REBUILD (Chapter 8)

**Dispatch:** CONTROLLER — ITEM 312 (CHAPTER 8 REBUILD: ir-playbook)
**Authority:** CEO directive 2026-07-31 (overnight autonomous-continuation instruction)
**Date:** 2026-07-31
**Scope:** engine turn on `generate-ir-playbook` + fixture unblock. NO deploy, NO harness
invocation, NO ingestion.

---

## 1. CORPUS CHECK (re-confirmed before building, as instructed)

| row | chars | tail |
|---|---|---|
| `gdpr_articles(eu,'33')` | 1734 | `...documentation shall enable the supervisory authority to verify compliance with this Article.` |
| `gdpr_articles(eu,'34')` | 1649 | `...may decide that any of the conditions referred to in paragraph 3 are met.` |

Art. 34 ends on a complete sentence. Item 291's "truncated, 69 chars short of CELEX"
P0-blocking flag is **not** reproducible and remains withdrawn (Item 300/304 Fix C).
**Not a blocker.** Both articles are quoted verbatim from these rows; the UK-mirror rows
(`provision_texts` `ukgdpr-art-33` / `ukgdpr-art-34`, "the Commissioner" wording) are used
verbatim for UK-only incidents.

The corpus text is pinned into `src/registry/__tests__/__fixtures__/ir-corpus-snapshot.ts`
so the pin tests fail if any quotation in the registry or the builder is retyped rather
than lifted.

## 2. WHAT WAS PRESERVED (explicitly untouched)

- **Op. 1** — awareness determination, 72-hour clock arithmetic, deadline computation.
  Flagged as the fleet's best handling of an unresolved fact. **Zero edits.** The new
  builder never computes a deadline and never restates the clock; both determinations
  defer to it in terms ("the clock and the filing deadline are computed separately in the
  awareness and deadline analysis and are not restated here").
- **Op. 5, timing and owner assignment limb** — the conditional logic (DPO escalation etc.)
  is untouched. Only the *content-mapping* limb is replaced, and it is replaced by an
  addition, not a deletion: the new `content_owner_mapping` key sits alongside the existing
  output.
- `_w1_ir_wire.ts` registry post-pass runs after the new builder, unchanged.

## 3. WHAT WAS BUILT

`supabase/functions/_shared/ltp/ir-playbook-deliverables/` — pure, single-writer, no I/O.

1. **`sa_notification_determination`** — Art. 33(1). The duty is *reasoned*, not assumed.
   The builder runs the statutory **negative** condition ("unlikely to result in a risk to
   the rights and freedoms of natural persons") over enumerated `risk_factors`, each with a
   `record_basis`. Three outcomes: `notification_required`,
   `notification_not_required_unlikely_risk`, `undetermined_on_the_record`.
2. **`data_subject_communication_determination`** — Art. 34(1). A **separate and higher**
   test ("likely to result in a high risk"), run over its own factor set, never inherited
   from the Art. 33(1) verdict. A `threshold_separation_note` states the distinction on the
   face of the deliverable. Pin test proves the two verdicts can diverge in both directions.
3. **`art34_exemption_analysis`** — all three Art. 34(3) limbs walked on every record:
   (a) unintelligibility/encryption — available only where the data are unintelligible
   **and** the keys are recorded uncompromised; (b) subsequent measures — explicitly *not*
   satisfied by containment alone, degrades to `record_insufficient`; (c) disproportionate
   effort — carries the public-communication substitute the provision itself supplies,
   verbatim. Closes with the Art. 34(4) supervisory-authority override, verbatim.
4. **`content_owner_mapping`** — Art. 33(3)(a)–(d) each mapped to an owner and an evidence
   source-of-truth, plus the Art. 33(4) phasing plan (defers exactly the elements that are
   unresolved, with a reason per deferral) and the Art. 33(5) internal-documentation record
   in its verbatim structure (facts / effects / remedial action).

**Discipline applied:** pure functions throughout; `record_insufficient` + a named
`information_needed` rather than fabrication; SEPARATION LAW (`separateExposure`) mechanically
relocates fine/penalty framing out of obligation reasoning into an `exposure` field;
fail-open attach (`attachIrPlaybookDeliverables`) so a builder fault can never block emission.

## 4. INTAKE EXTENSION

Checked the existing contract first — none of these existed, and no duplicate was added.
`discoveryDateTime` (Op. 1's anchor) is untouched.

| field | why |
|---|---|
| `encryptionStatus` | Art. 34(3)(a) is unanswerable without it |
| `encryptionKeyStatus` | encryption without key status does not establish unintelligibility |
| `affectedDataSubjectCount` | Art. 33(3)(a) approximate number of data subjects |
| `affectedRecordCount` | Art. 33(3)(a) approximate number of records |
| `awarenessConfirmed` | the confirmed-vs-assumed flag Op. 1's own logic signals it needs |

All added `optional`, so no pre-existing golden case or live session breaks. Surfaced in
`src/pages/IRPlaybook.tsx` with their statutory hooks shown in the labels.

## 5. FIXTURE UNBLOCK (same turn)

Three golden cases, specific non-generic content, every new field populated:

- `ir-perfect-record` (tuning) — Norwegian clinic, unencrypted health + ID data, 41,800
  patients / 63,400 journal entries, confirmed awareness. Both thresholds met.
- `ir-encrypted-backup-exemption` (tuning) — UK pensions administrator, all data encrypted,
  keys held, contained. Art. 33(1) exception **established**; Art. 34(3)(a) available.
  Exercises the UK-mirror corpus rows.
- `ir-two-threshold-divergence` (adversarial) — 62 misdirected newsletter subscribers.
  **Notifiable to the SA, not communicable to data subjects** — the divergence case.

## 6. TESTS

`src/registry/__tests__/ir-playbook-deliverables.test.ts` — **26/26 passing**.
Corpus pins (verbatim substring, incl. UK-mirror routing), analysis-shape pins
(standard → record fact → application → verdict, application ≠ standard), TWO-THRESHOLD
behaviour pins, all three Art. 34(3) limbs, Art. 33(3)/(4)/(5) mapping, and a contract
guard tracing `validateIntake` against the *actual* contract for the new cases **and** the
pre-existing ones (no regression), plus a check that every field the builder reads is
declared.

## 7. FOUR-TEAM VERDICTS ON JUDGMENT CALLS

| call | verdict | reasoning |
|---|---|---|
| Does containment alone satisfy Art. 34(3)(b)? | **No — unanimous** | (b) requires measures ensuring the high risk "is no longer likely to materialise". Containment stops continuation; it does not undo exposure already suffered. Degrades to `record_insufficient`. |
| Encryption with compromised keys? | **Exemption unavailable — unanimous** | Unintelligibility is the test, not the presence of a cipher. |
| Should an available Art. 34(3) exemption change the Art. 34(1) verdict? | **No — unanimous** | The high-risk finding stands; the *duty to communicate* is excused. Recorded as `communication_excused_by_exemption`, a distinct verdict. |
| Should Art. 33(1) be re-run deterministically or handed to the model? | **Deterministic — unanimous** | Chapter 8 (D) puts Ops 2–4 under the PROMPT lens, but the risk test here is a defined condition over enumerated recorded facts. Model-work is reserved for narrative; converting it would violate the standing rule against turning working deterministic code into model-work. |

**Genuine split → Build Issues:** none. No item was carried on a non-unanimous vote.

## 8. BUILD ISSUES

1. **`affectedCount` vs the new count fields.** The contract now carries a coarse band
   (`affectedCount`) *and* two free-text approximate counts. The builder prefers the
   specific counts and falls back to the band. If the two disagree the builder does not
   reconcile them — it reports both. Flagging rather than guessing a precedence rule.
2. **Art. 34(3)(c) is never resolved deterministically.** Disproportionate effort is a
   proportionality judgement the record cannot supply; the limb always degrades unless a
   future intake field captures the communication-cost basis. Intentional, but it means one
   of the three limbs is structurally `record_insufficient` today.
3. **No deploy, no harness run.** Per dispatch. The deliverables are unmeasured in a live
   run; only pin-tested.

## 9. STATUS

**BUILT — NOT DEPLOYED, NOT MEASURED.** Ledger item 312.
