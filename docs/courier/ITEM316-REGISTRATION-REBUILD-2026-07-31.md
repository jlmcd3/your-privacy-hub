# ITEM 316 — CHAPTER 4 REBUILD: registration

**Dispatch:** CONTROLLER DISPATCH — ITEM 316 (CHAPTER 4 REBUILD: registration)
**Authority:** CEO directive 2026-07-31 ("proceed and continue with all remaining work")
**Date:** 2026-07-31
**Disposition:** COMPLETE — awaiting controller verification. **Not deployed.** No harness invocation. No ingestion.

---

## 1. What this item closes

Chapter 4 recorded the highest narrative debt in the fleet: the registration product's
analytic output was `obligations_summary`, an object of booleans and nulls
(`dpo_trigger: null`, `data_broker_registrations: []`, …) with **zero citation and zero
reasoning on any flag**, and `confidence_reasons` that measured *intake completeness*
rather than legal analysis. Every determination RECITED or OMITTED. There was no prose
surface at all.

This item builds the missing registry and the engine on top of it in the same turn,
because Chapter 4's "NO REGISTRY EXISTS" framing was accurate about the **code**: no
registration authority file existed. The **corpus**, by contrast, is populated, and was
re-verified before any code was written.

## 2. Corpus verification performed before building

Queried directly; not assumed from the dispatch:

| corpus row | status | used for |
|---|---|---|
| `ca-delete-act-1798-99-80` | approved | CA definition + exclusions |
| `ca-delete-act-1798-99-82` | approved | CA registration duty, window, fee, filing content |
| `or-ors-646a-593` | approved | OR definition, duty, term, fee, filing content |
| `tx-bc-510-001` | approved | TX definition |
| `tx-bc-510-003` | approved | TX applicability threshold + exclusions |
| `tx-bc-510-005` | approved | TX duty, $300 fee, term, filing content |
| `vt-9vsa-2430` | approved | VT definition, direct-relationship examples, exclusions |
| `vt-9vsa-2446` | approved | VT duty, window, $100.00 fee, filing content |
| `gdpr_articles` EU/UK Art. 27 | approved | representative duty + Art. 27(2) exemptions |
| `gdpr_articles` EU Art. 37 | approved | the three DPO branches |

Arts. 27 and 37 are **referenced from Chapter 9's governance anchoring, not re-derived.**

## 3. NEW — `_shared/registry/registration-verified-authorities.ts`

28 duty rows appended to the existing Item 303 locator block. **Every `verbatim_quote`
was extracted by script** as an exact whitespace-normalized substring of its approved
corpus row — nothing was typed by hand, and the extractor aborted on any marker that was
missing or ambiguous. Rows carry `jurisdiction`, `citation`, `verbatim_quote`,
`corpus_key`, `role`, `primary_source_url`, `verified_on`.

`dutyRow(key)` **throws** on an unknown key. A missing authority is a build defect, never
a silently empty citation.

## 4. Before / after

| Chapter 4 complaint | Before (Item 315 state) | After (this item) |
|---|---|---|
| Data-broker duty | `data_broker_registrations: []` | `RegistrationDetermination` per state: verdict + headline + reasoning + citations + full threshold analysis + requirement finding + open questions |
| State thresholds | none — generic `organization_size` band | each state's **own** definition, limb by limb, against the record's actual counts |
| Deadlines | none | `ScheduleAndFee` — statutory window quoted verbatim, **never converted into a filing date** |
| Fees | none | quoted verbatim; a figure is asserted **only** where the operative text states one (TX $300, VT $100.00; CA and OR state none) |
| Filing readiness | none | `FilingReadiness` per state against that state's own required-contents list |
| EU/UK representative | boolean | reasoned Art. 27(1) determination incl. the Art. 27(2)(a)/(b) exemption limbs |
| DPO | `dpo_trigger: null` | three separate Art. 37(1)(a)/(b)/(c) findings; disjunctive logic stated |
| Prose | **none at all** | Part-1 overview and Part-4 determination |
| AI Act | `ai_act_obligations_engaged` boolean | `CorpusPendingFlag` — **no verdict field exists on the type** |

## 5. Cross-state bleed — the named hazard, and what prevents it

The four definitions are **not** interchangeable, and the differences decide cases:

- **CA / VT** reach only consumers with whom the business has **no direct relationship**.
- **OR** contains **no such carve-out** — a direct relationship does not defeat Oregon.
- **TX** never says "sells": it reaches **collecting, processing or transferring** data not
  collected directly, and then narrows by a separate § 510.003 revenue-**or**-volume
  applicability test the other three states have no analogue for.
- **VT** reaches **licensing** as well as sale.

Guards: the limb builders are per-state functions reading only that state's rows; the
Texas combiner is the only one that is non-conjunctive; pin tests assert each definitional
sentence appears in its own state's corpus row **and in no other**, and that a CA/VT
record's citations contain no OR/TX authority and vice versa.

`stateInScope` was **tightened during the build**: an initial version treated
`organization_country === "US"` as a trigger, which pulled all four states into every US
record — reintroducing exactly the bleed this item exists to prevent. Establishment in the
US says nothing about which state regimes are engaged. Only a named state, or a US-wide
market selection **plus** broker-type activity, brings a state into scope.

## 6. Schedule-surface law, enforced not merely stated

The builder states windows as the statutes state them and never computes a customer
deadline. This is enforced three ways: no date field exists on `ScheduleAndFee`; the pin
test scans the emitted schedule JSON for any resolved calendar date; and a source scan
asserts the builder file contains no `new Date` / `Date.now` / `getFullYear` / `setDate`.

## 7. Intake extension

Extended, not duplicated — the existing contract already carried
`acts_as_data_broker` and `sells_or_shares_personal_info`, which are read as fallbacks so
existing records degrade rather than break. **All nine new fields are optional.**

`collects_data_not_directly_from_individuals`, `has_direct_relationship_with_data_subjects`,
`sells_or_licenses_brokered_data`, `brokered_data_individual_count`,
`brokered_data_revenue_share_pct`, `data_broker_exemption_claimed`,
`filing_contact_details_ready`, `filing_opt_out_mechanism_documented`,
`filing_minors_data_practices_documented`.

Added to the contract, the engine `IntakeData`, and the form (a conditional block that
appears only when broker-type activity is indicated). A claimed exclusion yields a
**`conditional`** verdict — recorded and analysed against the reproduced exclusion text,
**never auto-accepted**.

## 8. Controls

`src/registry/__tests__/registration-deliverables.test.ts` — **25/25 passing**, plus
`__fixtures__/registration-corpus-snapshot.ts` (11 normalized corpus rows) so the verbatim
pins are checkable offline. Full registry suite re-run: **252/252 passing, 22 files.**

**Fixture unblock** (three new golden cases, specific organisations with specific numbers):
`reg-ca-vt-broker-perfect-record` (Halyard Audience Data LLC — two states, both
registrable), `reg-tx-volume-limb-tuning` (Brazos Identity Resolution Inc. — revenue limb
**fails** at 31%, duty turns on the 50,000-individual volume limb alone, and the direct
relationship that would defeat CA/VT is irrelevant in Texas), and
`reg-ca-not-registrable-adversarial` (Trailhead Outfitters Co. — *looks* like a broker on
the legacy CCPA "sells or shares" flag but fails the direct-relationship limb; the engine
must reach **not_registrable** and name the limb rather than treat the legacy flag as
dispositive). A guard test traces every fixture key against the actual contract.

## 9. Four-team adjudications (unanimous unless noted)

1. **Should the legacy `obligations_summary` be deleted?** No — retained for backwards
   compatibility with existing readers; the deliverables are additive and are the analytic
   surface. Deleting it in the same turn as a rebuild would couple two risks.
2. **Does `sells_or_shares_personal_info` (CCPA) satisfy the state "sells" limbs?** Only as
   a **fallback** where the Item 316 field is absent. CCPA "sale or share" and the
   data-broker "sells to third parties" limb are not the same concept, and the adversarial
   fixture exists to prove the engine does not conflate them.
3. **Art. 37(1)(c) "core activity" and "large scale".** Treated as engaged where
   special-category processing is recorded, with the core/large-scale qualification stated
   explicitly in the finding as a matter for the controller's own record. **Flagged as a
   genuine split** (see Build Issues).
4. **Public authority under Oregon.** Recorded as failing the "business entity" limb rather
   than as an exclusion, because ORS 646A.593's operative text states no exclusion list.

## 10. The grader defect noted in the gap analysis

The gap analysis flagged that "flag-only output scoring 93.5 is a grader defect."
**Still open, and now more consequential, not moot.** The rebuild removes the *product*
condition that made the score absurd, but nothing about the *grader* changed: a grader that
awarded 93.5 to booleans with no citations cannot distinguish this rebuild from what it
replaced, so it will not register the improvement either. Until the grader is measured
against a flag-only control, registration scores carry no signal in either direction.

## 11. Build issues / honest limits

1. **Not measured.** No harness invocation per dispatch. Only the deterministic builders
   are pinned; behaviour under prose assembly is unverified.
2. **Art. 37(1)(c) is over-inclusive by design.** The engine treats recorded
   special-category processing as engaging branch (c) without independently establishing
   "core activity" or "large scale". Erring toward designation is the safer error, but it
   is an engine judgement, not the statute, and is the most contestable thing here.
3. **EU AI Act — flagged, not built.** Reg. (EU) 2024/1689 Arts. 16, 26, 49, 71 are not in
   corpus. **Recommended as the next ingestion item.** The existing legacy
   `ai_act_obligations_engaged` boolean in `obligations_summary` is untouched by this item
   and still asserts without citation — it should be retired once the corpus lands.
4. **`markets_served` carries no US-state granularity for most records.** A record that
   selects only "US" and does not indicate broker activity reaches no state determination.
   That is deliberate silence rather than a negative finding, but it means real coverage
   depends on users selecting state codes.
5. **The renderer is unchanged.** `registration_deliverables` and `narrative` are persisted
   on `result_summary`; surfacing them in the viewer and PDF is a follow-on.
6. Pre-existing and untouched: `contract-surface-audit` still fails on `cppa-risk`
   fixtures (Item 305 residue).

## 12. Files

**Created:** `_shared/ltp/registration-deliverables/types.ts`,
`_shared/ltp/registration-deliverables/build.ts`,
`src/registry/__tests__/registration-deliverables.test.ts`,
`src/registry/__tests__/__fixtures__/registration-corpus-snapshot.ts`, this courier.

**Edited:** `_shared/registry/registration-verified-authorities.ts` (28 rows appended),
`_shared/intake-contracts/registration-assessment.ts`, `_shared/registration-engine.ts`
(type only — no rule logic touched), `run-registration-assessment/index.ts` (wiring),
`_shared/golden/registration.ts` (3 cases appended), `src/pages/RegistrationAssessment.tsx`,
`docs/pipeline-state.md`.
