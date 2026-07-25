# LIA-REGISTRY-AUTHORING — 2026-07-25

**Turn type:** authoring-only (NO deploy)
**Dispatch authority:** CEO T2 green-light 2026-07-25 (dpia→lia→governance→dpa→ir order); controller-reviewed five-lens
**Instrument:** s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) — FROZEN
**Registry tag:** `lia-va-w1-2026-07-25`
**Ledger:** item 52 in `docs/pipeline-state.md`
**Prior turn mirrored:** DPIA-REGISTRY-AUTHORING (item 44) / DPIA-va-w1

## 1. Scope

Author a verified-authorities registry for the LI Assessment tool, mirroring the
DPIA registry shape. GDPR-pinned first per CEO non-CPPA rule. Every row must
have a byte-exact `verbatim_quote` substring in an APPROVED corpus source
(`provision_texts` status='approved' jurisdiction='EU'; `edpb_guidelines`
Guidelines 2/2019 status='final'). Any proposition without a pin goes on
`LIA_UNANCHORED_PROPOSITIONS` for the future wiring-turn write-around.

No generator wiring, no prompt/rubric/grader/golden/contract/fixture/sample
edits. No deploy.

## 2. Files

| Kind | Path | Purpose |
| --- | --- | --- |
| new | `supabase/functions/_shared/registry/lia-verified-authorities.ts` | Registry data (16 rows + 22-item unanchorable list + empty paraphrase list) |
| new | `supabase/functions/_tests/lia-registry.test.ts` | Deterministic substring pin-tests against pasted-verbatim corpus snapshots |
| edit | `docs/pipeline-state.md` | Item 52 (DONE) + stamp-doctrine deviation ruling for item 51 + `Last updated` header |
| new | `docs/courier/LIA-REGISTRY-AUTHORING-2026-07-25.md` | This report |

## 3. Registry contents (16 rows)

### GDPR — 14 rows (`provision_texts`, status='approved', jurisdiction='EU')

| proposition_key | subsection |
| --- | --- |
| li_lawful_basis_legitimate_interests | GDPR Art. 6(1)(f) |
| li_public_authorities_exclusion | GDPR Art. 6(1)(f), second subparagraph |
| principle_lawfulness_fairness_transparency | GDPR Art. 5(1)(a) |
| principle_purpose_limitation | GDPR Art. 5(1)(b) |
| principle_data_minimisation | GDPR Art. 5(1)(c) |
| special_categories_prohibition | GDPR Art. 9(1) |
| art_13_legitimate_interests_disclosure | GDPR Art. 13(1)(d) |
| art_13_object_right_information | GDPR Art. 13(2)(b) |
| art_14_legitimate_interests_disclosure | GDPR Art. 14(2)(b) |
| art_14_object_right_information | GDPR Art. 14(2)(c) |
| art_22_admt_right | GDPR Art. 22(1) |
| data_protection_by_design | GDPR Art. 25(1) |
| ropa_controller_record | GDPR Art. 30(1) |
| dpia_when_required | GDPR Art. 35(1) |

Wording note: Art 13(2)(b) uses "**or** to object" and Art 14(2)(c) uses "**and**
to object" — both are held byte-exact in the approved corpus rows and both are
pinned independently in the test file.

### EDPB — 2 rows (`edpb_guidelines`, guideline_ref='EDPB Guidelines 2/2019', status='final')

| proposition_key | subsection |
| --- | --- |
| necessity_less_intrusive_alternatives | EDPB Guidelines 2/2019, § 2.4 |
| necessity_useful_not_necessary | EDPB Guidelines 2/2019, § 2.4 |

Rationale for carry-through from DPIA-va-w1: § 2.4 of Guidelines 2/2019 states
the general necessity standard read across to Art. 6(1)(f) by EDPB / national
SAs; it is the same primary source that anchors the necessity limb of both
tools. `KNOWN_PARAPHRASED_KEYS` is empty.

## 4. Unanchorable list — 22 propositions

Enumerated in `LIA_UNANCHORED_PROPOSITIONS` for the future LIA-REGISTRY-WIRING
deploy turn (write-around targets — DO NOT paraphrase, narrow-but-solid rule):

- GDPR Article surface not held in P1: Art 21 right to object; Art 21(2)
  direct-marketing absolute objection right; Art 7 consent conditions; Art 8
  child consent; Art 24 controller accountability.
- GDPR Recital surface (not in `provision_texts` P1): Recital 47 (three-part
  test, direct marketing); Recital 48 (intra-group transmission); Recital 49
  (network security); Recital 50 (further processing).
- EDPB Guidelines 1/2024 (legitimate interests): three-step test; reasonable
  expectations; vulnerable data subjects. Blocker: 109/109 ingested rows carry
  empty `excerpt_text_norm` and `section_heading` (verified 2026-07-25T12:37Z);
  substring pin-tests cannot run. Unlocks on the P2 clean-up ingestion batch.
- WP29 Opinion 06/2014 balancing test.
- CJEU case-law (case_law table not in scope this turn): C-252/21 Meta v.
  Bundeskartellamt three-part test; C-13/16 Rīgas purpose specification;
  C-40/17 Fashion ID joint-controller LI.
- Statutory / SA guidance: UK ICO LIA template guidance; CNIL direct-marketing
  LI guidance.
- Balancing conclusion prose: pass, fail, conditional — structural, not
  quotable; write-around only.

## 5. Pin-test output (pasted green)

Command:

```
cd supabase/functions && deno test --allow-all _tests/lia-registry.test.ts
```

Result:

```
running 5 tests from ./_tests/lia-registry.test.ts
lia-registry: version tag is w1 ... ok (0ms)
lia-registry: no paraphrase on entry ... ok (0ms)
lia-registry: every row is byte-exact substring of its approved corpus source ... ok (0ms)
lia-registry: every row has non-empty required fields ... ok (0ms)
lia-registry: registry keys match proposition_key on each row ... ok (2ms)

ok | 5 passed | 0 failed (11ms)
```

The substring test iterates every row in `LIA_VERIFIED_AUTHORITIES`, looks up
its corpus source excerpt in `SOURCE_FOR`, and asserts
`src.includes(row.verbatim_quote)`. Corpus snapshots in the test are pasted
verbatim from `provision_texts.verbatim_excerpt` and
`edpb_guidelines.excerpt_text` read at 2026-07-25T12:37Z — no re-flow, no
whitespace edits, no character substitutions.

## 6. Five-lens self-review

1. **Customer:** no customer-visible change this turn (registry data only, not
   imported by any generator). Sets up the LIA to cite verified GDPR/EDPB text
   with verbatim quotes when wired.
2. **Legal:** every citation pinned byte-exact to an approved corpus source;
   distinctions preserved (Art 13 "or to object" vs Art 14 "and to object");
   public-authorities carve-out at Art 6(1)(f) sub-¶ 2 captured; ADMT
   interplay (Art 22(1)), DPIA interplay (Art 35(1)), special-categories
   prohibition (Art 9(1)), and DPbD safeguards (Art 25(1)) all included as
   distinct rows so the wiring turn can address each balancing dimension
   without inventing pinpoints.
3. **Measurement:** s4 frozen; no rubric/grader/instrument/golden edits; no
   metering impact; no signal contamination.
4. **Ops:** authoring-only, no deploy, no lock check needed; no touch to
   generator, contracts, samples, or fixtures.
5. **Regression:** 5/5 pin-tests green; empty `KNOWN_PARAPHRASED_KEYS` asserted;
   unmapped rows fail loudly (SOURCE_FOR gate); row/key identity asserted.

## 7. Stamp-doctrine deviation (recorded, item 51)

Recorded under item 52 in the ledger: DPIA-REGISTRY-WIRING (item 51) BUILD_STAMP
`dpia-registry-wiring@2026-07-25T12:36:00Z` was forward-projected ~8 minutes
ahead of the actual 12:28:42Z build clock. RULING: functionally harmless; no
redeploy solely to restamp. DISCHARGE: fresh-clock restamp at the next
`run-dpia-framework` deploy turn. Forward-projection is prohibited going
forward — all future BUILD_STAMPs, ledger `Last updated` values, and courier
headers must be produced by re-reading `date -u` immediately before writing.
This courier's header stamp (2026-07-25) and the ledger `Last updated`
(2026-07-25T12:41:41Z) were both produced under that rule.

## 8. Next

Queue `LIA-REGISTRY-WIRING` — deploy turn on `run-li-assessment`, mirroring
DPIA-REGISTRY-WIRING (item 51): registry-first citation resolution against
`lia-va-w1-2026-07-25`; write-around scrubbing for the 22-item unanchorable
list; LEAK-PREV P0 (LIA field labels), P1 (emit-gate), P2 (report schema +
whitelist serializer with `_meta.internal.lia_w1` stamp); no rubric/instrument
edits; s4 stays frozen.
