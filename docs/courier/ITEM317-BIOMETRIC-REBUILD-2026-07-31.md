# ITEM 317 — CHAPTER 5 REBUILD: biometric

**Dispatch:** CONTROLLER DISPATCH — ITEM 317 (CHAPTER 5 REBUILD: biometric)
**Authority:** CEO directive 2026-07-31 (overnight autonomous-continuation instruction)
**Turn type:** build turn (registry reconciliation + engine + intake + fixtures + pins)
**Landed:** 2026-07-31T22:58Z
**Deployed:** NO. **Harness invoked:** NO. **Ingestion:** NO.
**Disposition:** COMPLETE — closes Chapters 2 / 4 / 5, the last of the previously-blocked chapters.

---

## 1. Registry reconciliation — what was paraphrase, what is now verbatim

The dispatch's first task was to reconcile, not ignore, the pre-existing
`_shared/registry/biometric-statute-registry.ts` (Waves 1-3). It was read first.
It carries a field literally named `verbatim_quote`; **eleven of its values were
not verbatim.** They were paraphrase or reconstruction of the operative text —
the exact failure mode the gap analysis named ("paraphrased section content, not
verbatim corpus text"), and worse than a missing quote because the field name
asserts provenance the content does not have.

| Provision | Before (paraphrase, abridged) | After |
| --- | --- | --- |
| BIPA § 15(a) | "written, publicly available retention and destruction policy…" | verbatim § 15(a) sentence from `il-bipa-740-14-15-a` |
| BIPA § 15(b)(1)-(3) | requirement restated as a list | verbatim § 15(b) chapeau and numbered limbs |
| BIPA § 15(c) | "no sale, lease, trade or profit" | verbatim § 15(c) |
| BIPA § 15(d) | "disclosure only with consent or…" | verbatim § 15(d) with its four numbered limbs |
| BIPA § 15(e) | "reasonable standard of care" | verbatim § 15(e)(1)-(2) |
| CUBI § 503.001(c)(1)-(3) | three summarised duties | verbatim (c)(1), (c)(2), (c)(3) |
| RCW 19.375.020(1)-(4) | four summarised duties | verbatim .020 subsections |

**Method:** extraction by script against the approved `provision_texts` rows
ingested by Item 314, aborting on any missing or ambiguous marker. Nothing was
hand-transcribed. The reconciled quotes are pinned as exact substrings.

**One row was removed rather than reconciled.** The legacy registry carried a
740 ILCS 14/20 (private right of action) row. **That provision was never
ingested** — Item 314 flagged it as a follow-on. Supplying text for it from
memory is fabrication regardless of how well-known the provision is, so the row
is deleted and PRA characterisation now runs only through
`BIPA_PRA_CORPUS_STATUS`, which states what may be said (BIPA is enforced by
private suit) and what must degrade (damages amounts, mental-state tiers,
fee-shifting, per-scan accrual). No test depended on the removed id.

**New file:** `_shared/registry/biometric-verified-authorities.ts` — 36 duty
rows, **one row per duty**, as Item 314 pinned them. BIPA § 15(a)-(e) are five
separate rows; CUBI's subsections and its (c-1)/(c-2) qualifiers are separate
rows. Nothing is lumped.

---

## 2. The gap, and what replaced it

| Operation | Before | After |
| --- | --- | --- |
| Entity characterization | **RECITES** — echoed the intake sector label back | reasoned role + per-statute actor-scope finding, with the intake label kept visible for audit and explicitly not treated as the answer |
| Identifier characterization | **OMITS** | per-statute characterization against each statute's **own** definition, with exclusions evaluated |
| Per-duty satisfaction | **OMITS** | `duty_findings[]` — one finding per duty per statute, four-part shape |
| Multi-state divergence | **OMITS** | `divergence_analysis[]` reasoned from the duty findings actually produced |
| Consequence | **OMITS** | `consequence_determination` with a SEPARATION GUARD |
| Prose | requirements digest keyed to intake | Part-1 overview and Part-4 determination |

Every finding carries statute → verbatim standard → record fact → application →
verdict, and degrades to a named `record_insufficient` with
`information_needed` rather than asserting. There are no booleans in the
deliverables.

---

## 3. Divergence is nameable, not smoothed

The three definitions decide different cases on the same record, and the engine
must be able to say so:

- **BIPA** closes its list at five identifiers and excludes photographs, written
  signatures, demographic data, health-care TPO data under HIPAA, and diagnostic
  imaging. Gait and vein pattern fall **outside** it.
- **RCW 19.375** is open-ended ("other unique biological patterns or
  characteristics") so gait and vein pattern fall **inside** it — but it
  expressly excludes a photograph, video or audio recording **"or data generated
  therefrom"**, which is materially wider than BIPA's bare "photographs" and is
  the hardest divergence in the chapter.
- **CUBI** mirrors BIPA's enumeration but carries carve-outs BIPA has no
  analogue for — the § 503.001(e)(1) financial-institution voiceprint carve-out
  and the (e)(2) AI-training carve-out with § 503.001(f) re-attachment.
- **The CUBI one-year destruction clock** (§ 503.001(c)(3), "not later than the
  first anniversary of the date the purpose for collecting the identifier
  expires") with its (c-1) other-law extension and (c-2) employer-security
  qualifier **has no BIPA or RCW 19.375 analogue**; BIPA's outer bound is three
  years from last interaction and Washington states no fixed period. This is
  emitted as a named divergence with each statute's position quoted.

---

## 4. SEPARATION GUARD and RESERVED-FRAMING LAW

BIPA is the fleet's highest litigation-exposure surface, which makes bleed the
live risk: exposure language migrating into duty findings turns a compliance
finding into a liability assertion. Duty findings therefore say only what the
statute requires and whether the record shows it. Exposure lives only in
`consequence_determination.exposure_surfaces`, separated from `unlawful_now`
(what is out of compliance now) and `unresolved_on_record`. A pin asserts no
duty finding contains damages, penalty, per-scan, class-action, lawsuit or
currency language on any of three records.

The BIPA PRA surface is emitted with `corpus_status: "not_ingested"`,
`standard: null` and a populated `reserved` note. A pin asserts the whole
deliverable JSON contains no `$1,000` / `$5,000` / "liquidated damages" string.

---

## 5. RCW 19.373 stays inert

Not activated, status not flipped, never read or applied. It is carried only as
a `scope_gated` provenance flag with the Item 314 adjudication reasoning. Pins
assert no duty row and no emitted citation contains `19.373`, and that the
offline corpus snapshot excludes it.

**Flagged for the CEO, not decided here:** the wider MHMD question is genuinely
arguable on one narrow footing — where biometric data is used to *infer* a
health condition, RCW 19.373 reaches it directly rather than derivatively, and
the biometric product's surveillance/monitoring and research purposes are where
that arises. That is a scope and business decision, reserved.

---

## 6. Intake extension

Eighteen fields, **all optional** so existing records degrade rather than break:
source description, HIPAA-TPO context, government-body and GLBA status; notice
form, consent-artifact type, release description; retention schedule text,
publication status, destruction trigger; profit, disclosure recipients and
disclosure bases; security description and protection parity; four Texas fields
carrying the (c-1)/(c-2)/(e)(2) qualifying facts; three Washington fields
carrying the enrollment and commercial-purpose predicates.

The form block is shown only when IL, TX or WA is selected, and the client
option lists live in `src/registry/biometric-intake-options.ts` with a pin
asserting they equal the contract's lists exactly — the form cannot offer a
value `validateIntake` would reject.

---

## 7. Controls

- `src/registry/__tests__/biometric-deliverables.test.ts` — **28/28 passing**.
- `src/registry/__tests__/biometric-duty-registry.test.ts` — **8/8 passing**
  (offline corpus pin over `__fixtures__/biometric-corpus-snapshot.ts`).
- Full biometric suite (4 files): **57/57 passing**.
- **Fixture unblock:** `bio-perfect-il-tx-wa-record` (three states, fully
  documented posture, reaches `satisfied`) and `bio-perfect-il-deficient-record`
  (clickwrap in place of a written release, profit from templates, no retention
  schedule — reaches `not_satisfied` on at least three duties). Both validate
  against the contract under a guard test.

**Caught during the build.** The BIPA photographs exclusion was coded so that
`engaged` was `null` on every path, which meant the BIPA identifier
characterization could **never** reach `within_definition` — a well-documented
fingerprint record hedged for no reason. Where the record describes no
photographic source the exclusion is now simply not engaged. The genuine
ambiguity (a geometric scan *derived from* a photograph) still yields `null` and
holds the characterization open, which is correct.

---

## 8. Honest limits

1. **Not measured.** No harness invocation per dispatch; only the deterministic
   builders are pinned. Behaviour under Pass-2R prose is unverified.
2. **The type-to-definition mapping is engine judgement.** "Gait is not one of
   BIPA's five enumerated identifiers" follows from the closed list; "vein
   pattern is within RCW 19.375's open-ended clause" is a reading, not a holding.
   Both are stated with reasoning so they can be contested.
3. **740 ILCS 14/20 remains un-ingested.** Every PRA specific degrades. This is
   the follow-on Item 314 flagged and it is still open.
4. **EU/UK are out of this chapter.** A record selecting only GDPR jurisdictions
   produces no duty findings here; the biometric product's GDPR surface is
   unchanged by this item.
5. Pre-existing and untouched: `contract-surface-audit` still fails on
   `cppa-risk` fixtures (Item 305 residue).

---

## 9. Build issues for the controller

1. **MHMD scope** — reserved to the CEO, reasoning at §5 above.
2. **740 ILCS 14/20 ingestion** — recommend it as the next ingestion item; the
   consequence determination is deliberately thin without it.
3. **Grader defect (carried from Item 316)** — still open, not moot. A grader
   that scored citation-free flag output at 93.5 cannot register this rebuild
   either.
