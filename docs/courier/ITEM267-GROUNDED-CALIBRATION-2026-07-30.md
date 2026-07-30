# ITEM 267 — GROUNDED-NOTE CALIBRATION (Build Issue 5)

**Date:** 2026-07-30
**Signature authority (CEO verbatim, 2026-07-30):** "I agree to whatever the teams recommend on each issue - except for issue 8. Go forward with all other changes"

**MODE UNCHANGED — THE SCREEN STAYS IN OBSERVE.** This turn changes *what the screen flags*, not *what it does*. No `weight_note` is modified in production; the enforce path and the 0.5 mass-replace abort remain intact and unreached.

**File:** `supabase/functions/_shared/ltp/grounded-note.ts`
**Version:** `pass1-grounded-note@2026-07-29-item261-observe-default` → `pass1-grounded-note@2026-07-30-item267-calibration`

## 1. Part (a) — normalization extension (FEED SIDE ONLY)

New exported `feedVariants(stem)` replaces the bare `inflections(stem)` call inside `buildGroundedSet`. It is applied **only when a grounded stem is fed into the vocabulary** (connective lexicon, registry vocabulary, ledger verbatims). The note side is untouched: a note token must still land exactly on a member of the expanded set.

Closed rule set:
- existing inflections (±s/es/ing/ed, y↔ies) — unchanged;
- **consonant-gemination verb forms**: single final consonant (not w/x/y) in a CVC shape, stem length ≥ 3 → `set→setting/setted/setter/setters`, `ship→shipping/shipped/shipper/shippers`;
- **derivational suffixes off a grounded stem**: `-ion`, `-tion`, `-ation`, `-ment`, `-ly`, `-er`, `-ers` (each further inflected), plus silent-`e` elision before vowel-initial suffixes (`create→creation`, `receive→receiver`).

Widening beyond this closed set remains a courier turn.

## 2. Part (b) — lexicon additions (evidence-mined)

### 2.1 Mining query (run 2026-07-30, ALL rows to date — 18 harness result rows)

```sql
select tok, count(*) from public.replay_harness_results r,
 lateral jsonb_array_elements(coalesce(r.pass1_usage->'grounded_note'->'details','[]'::jsonb)) d,
 lateral jsonb_array_elements_text(coalesce(d->'ungrounded_tokens','[]'::jsonb)) tok
group by tok order by count(*) desc, tok;
```

### 2.2 FULL mined register (verbatim query output, 216 distinct tokens)

| token | frequency |
|---|---|
| `opt-out` | 18 |
| `delivery` | 13 |
| `type` | 12 |
| `service` | 11 |
| `support` | 10 |
| `via` | 10 |
| `limited` | 9 |
| `recipients` | 9 |
| `creating` | 7 |
| `commercial` | 6 |
| `covering` | 6 |
| `field` | 6 |
| `operations` | 6 |
| `outside` | 6 |
| `receiving` | 6 |
| `active` | 5 |
| `context` | 5 |
| `enabling` | 5 |
| `surface` | 5 |
| `types` | 5 |
| `downstream` | 4 |
| `logical` | 4 |
| `minimum-pi` | 4 |
| `receive` | 4 |
| `shared` | 4 |
| `sold` | 4 |
| `24-month` | 3 |
| `appeal` | 3 |
| `cause` | 3 |
| `direct` | 3 |
| `free-tier` | 3 |
| `impaired-control` | 3 |
| `include` | 3 |
| `integrity` | 3 |
| `legal-obligation` | 3 |
| `percent` | 3 |
| `requests` | 3 |
| `affect` | 2 |
| `among` | 2 |
| `apply` | 2 |
| `area` | 2 |
| `bears` | 2 |
| `conditioning` | 2 |
| `cyber` | 2 |
| `dependent` | 2 |
| `detection` | 2 |
| `driving` | 2 |
| `eliminating` | 2 |
| `exposure` | 2 |
| `finding` | 2 |
| `framing` | 2 |
| `generating` | 2 |
| `including` | 2 |
| `minimum-necessary` | 2 |
| `ongoing` | 2 |
| `pathway` | 2 |
| `profiling-based` | 2 |
| `raising` | 2 |
| `reducing` | 2 |
| `required` | 2 |
| `residual` | 2 |
| `setting` | 2 |
| `supported` | 2 |
| `supports` | 2 |
| `tele` | 2 |
| `their` | 2 |
| `though` | 2 |
| `who` | 2 |
| `78` | 1 |
| `across` | 1 |
| `acxiom` | 1 |
| `addresses` | 1 |
| `admt-driven` | 1 |
| `advocates` | 1 |
| `analysis` | 1 |
| `available` | 1 |
| `average` | 1 |
| `bear` | 1 |
| `bearing` | 1 |
| `benefi` | 1 |
| `beyond` | 1 |
| `bu` | 1 |
| `co` | 1 |
| `com` | 1 |
| `completed` | 1 |
| `conditioned` | 1 |
| `conditions` | 1 |
| `consideration` | 1 |
| `constitutes` | 1 |
| `consultees` | 1 |
| `contributed` | 1 |
| `correction` | 1 |
| `cove` | 1 |
| `credit-building` | 1 |
| `credit-market` | 1 |
| `data-recip` | 1 |
| `declines` | 1 |
| `degree` | 1 |
| `deployment` | 1 |
| `destruction` | 1 |
| `determines` | 1 |
| `dis` | 1 |
| `disclosed` | 1 |
| `disparate-impact` | 1 |
| `distress` | 1 |
| `eliminate` | 1 |
| `enables` | 1 |
| `equifax` | 1 |
| `evidencing` | 1 |
| `ex` | 1 |
| `exceeding` | 1 |
| `exceeds` | 1 |
| `exception` | 1 |
| `expectations` | 1 |
| `expected` | 1 |
| `experian` | 1 |
| `experts` | 1 |
| `extends` | 1 |
| `factor` | 1 |
| `financial-system` | 1 |
| `freely` | 1 |
| `freely-given` | 1 |
| `frustration` | 1 |
| `fully` | 1 |
| `handle` | 1 |
| `har` | 1 |
| `hold` | 1 |
| `human` | 1 |
| `im` | 1 |
| `indi` | 1 |
| `indicating` | 1 |
| `infers` | 1 |
| `informati` | 1 |
| `infrastru` | 1 |
| `infrastructure-level` | 1 |
| `it` | 1 |
| `limits` | 1 |
| `ma` | 1 |
| `manua` | 1 |
| `markets` | 1 |
| `mechanis` | 1 |
| `meets` | 1 |
| `mitigants` | 1 |
| `mitigate` | 1 |
| `mitigating` | 1 |
| `modification` | 1 |
| `multi-vendor` | 1 |
| `negatively` | 1 |
| `o` | 1 |
| `operat` | 1 |
| `operation` | 1 |
| `output` | 1 |
| `outputs` | 1 |
| `over-collection` | 1 |
| `pa` | 1 |
| `part` | 1 |
| `parties` | 1 |
| `pathways` | 1 |
| `pendi` | 1 |
| `persistent` | 1 |
| `plaid` | 1 |
| `pote` | 1 |
| `potential` | 1 |
| `pr` | 1 |
| `prevention` | 1 |
| `prior` | 1 |
| `privac` | 1 |
| `pro` | 1 |
| `proc` | 1 |
| `processin` | 1 |
| `produce` | 1 |
| `product-telemetry` | 1 |
| `products` | 1 |
| `prominent` | 1 |
| `pu` | 1 |
| `question` | 1 |
| `reco` | 1 |
| `reduces` | 1 |
| `reflecting` | 1 |
| `reflects` | 1 |
| `rel` | 1 |
| `relevance-based` | 1 |
| `remai` | 1 |
| `represent` | 1 |
| `reput` | 1 |
| `reques` | 1 |
| `request` | 1 |
| `right-to-know` | 1 |
| `role` | 1 |
| `satisfy` | 1 |
| `scoreedg` | 1 |
| `scrutiny` | 1 |
| `self` | 1 |
| `septemb` | 1 |
| `shared-revenue` | 1 |
| `stigma` | 1 |
| `stigmatiza` | 1 |
| `stigmatizing` | 1 |
| `subject-matter` | 1 |
| `synthetic-identity` | 1 |
| `systemic` | 1 |
| `telemet` | 1 |
| `third` | 1 |
| `tied` | 1 |
| `unauthorised` | 1 |
| `unauthorized-acce` | 1 |
| `unauthorized-access` | 1 |
| `unlawful` | 1 |
| `unreviewed` | 1 |
| `used` | 1 |
| `v3` | 1 |
| `vendors` | 1 |
| `warrants` | 1 |
| `ways` | 1 |
| `whi` | 1 |
| `window` | 1 |

### 2.3 Admission rule applied

A mined token was admitted to `CONNECTIVE_LEXICON` only if it is (i) observed above, (ii) ordinary function / analytic / record-descriptive English, and (iii) **not** a customer-specific noun. Customer-specific nouns must ground via the intake ledger and were **excluded**: `acxiom` (1), `equifax` (1), `experian` (1), `plaid` (1), `scoreedg` (1), `free-tier` (3), `credit-building` (1), `credit-market` (1), `synthetic-identity` (1), `product-telemetry` (1), `multi-vendor` (1), `shared-revenue` (1), `right-to-know` (1), `24-month` (3), `78` (1), `v3` (1), and every truncation fragment (`benefi`, `bu`, `co`, `cove`, `data-recip`, `dis`, `ex`, `har`, `im`, `indi`, `informati`, `ma`, `manua`, `mechanis`, `o`, `operat`, `pa`, `pendi`, `pote`, `pr`, `privac`, `pro`, `proc`, `processin`, `pu`, `reco`, `rel`, `remai`, `reput`, `reques`, `septemb`, `stigmatiza`, `tele`, `telemet`, `unauthorized-acce`, `whi`).

### 2.4 Admitted tokens with observed frequency

`type` (12), `service` (11), `support` (10), `via` (10), `limited` (9), `recipients` (9), `creating` (7), `commercial` (6), `covering` (6), `field` (6), `operations` (6), `outside` (6), `receiving` (6), `active` (5), `context` (5), `enabling` (5), `surface` (5), `types` (5), `downstream` (4), `logical` (4), `minimum-pi` (4, admitted as the stems `minimum` + `necessary`), `receive` (4), `shared` (4), `sold` (4), `appeal` (3), `cause` (3), `direct` (3), `impaired-control` (3, not admitted — record-specific compound), `include` (3), `integrity` (3), `legal-obligation` (3, admitted as the stems `legal` + `obligation`), `percent` (3), `requests` (3), `affect` (2), `among` (2), `apply` (2), `area` (2), `bears` (2), `conditioning` (2), `dependent` (2), `detection` (2), `driving` (2), `eliminating` (2), `exposure` (2), `finding` (2), `framing` (2), `generating` (2), `including` (2), `ongoing` (2), `pathway` (2), `profiling-based` (2, admitted as the stem `profiling`), `raising` (2), `reducing` (2), `required` (2), `residual` (2), `setting` (2), `supported` (2), `supports` (2), `their` (2), `though` (2), `who` (2), plus the following singletons: `across`, `addresses`, `analysis`, `available`, `average`, `bear`, `bearing`, `beyond`, `completed`, `conditioned`, `conditions`, `consideration`, `correction`, `degree`, `deployment`, `destruction`, `determines`, `disclosed`, `distress`, `evidencing`, `exceeding`, `exceeds`, `exception`, `expectations`, `expected`, `extends`, `factor`, `freely`, `frustration`, `fully`, `handle`, `hold`, `human`, `indicating`, `infers`, `infrastructure`, `markets`, `meets`, `mitigate`, `mitigating`, `mitigants`, `modification`, `negatively`, `output`, `outputs`, `part`, `parties`, `persistent`, `potential`, `prevention`, `prior`, `produce`, `products`, `prominent`, `question`, `reflecting`, `reflects`, `relevance`, `represent`, `role`, `satisfy`, `scrutiny`, `self`, `stigma`, `stigmatizing`, `systemic`, `third`, `tied`, `unlawful`, `unreviewed`, `used`, `vendors`, `warrants`, `ways`, `window`.

## 3. Part (c) — promotion criteria (SPEC §6 lifecycle law)

The screen returns to **enforce** ONLY after a full replay batch under the Item-267 rules shows **~zero false positives** in `grounded_note.details[].ungrounded_tokens` — i.e. every remaining flagged token is genuinely off-record content (an invented vendor, product, statistic, or sector term), and no ordinary derivation of a grounded stem appears. Until that batch is reviewed, the screen stays observe-only and its telemetry stays classified `grounded_note_would_replace = non_material` in the GTM register.

## 4. Tests

`supabase/functions/_shared/ltp/item267-grounded-calibration.test.ts` (new, 6 tests, green):
- version bump;
- POSITIVE: `setting`, `shipped`, `shipping` ground from geminated stems; `detection`, `disclosures`, `transfers` ground derivationally;
- POSITIVE: mined ordinary English (`include`, `who`, `their`, `role`, `receive`, `request`, `apply`, `human`, `fully`, `type`, `indicating`, `active`) grounds via the lexicon;
- **NEGATIVE**: `blockchain`, `acxiom`, `equifax`, `plaid`, `scoreedge`, `quantum` remain ungrounded;
- `feedVariants` is feed-side only; note-side tokenization is byte-identical.

`grounded-note-mode.test.ts` updated: the Item-261 observe fixture now flags **3 of 4** notes instead of 4 of 4 — `"the setting supports fraud detection"` grounds under the new rules. This is the intended calibration effect and is itself evidence of false-positive reduction. Observe-mode invariants (byte-identical notes, no throw) and the enforce-mode abort (now at rate 0.75, still > 0.5) are unchanged.

**Suite result:** `_shared/ltp/` → 288 passed / 3 failed. The 3 failures (`content.test.ts:35`, `value-screen.test.ts:13`, `waveb.test.ts:93`) are pre-existing stamp/template-count assertions carried by the Item-245 legacy restore and are untouched by this turn.

## 5. Deploy

`replay-cppa-risk-harness` redeployed (only function touched). No harness invocation.
