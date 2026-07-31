# ITEM 314 — BIOMETRIC STATUTE CORPUS INGESTION + RCW 19.373 SCOPE ADJUDICATION

**Date:** 2026-07-31
**Dispatch:** CONTROLLER — ITEM 314. Authority: CEO corpus approval 2026-07-31 (original 7-prompt ingestion inventory, Prompt 6), launched under the CEO's explicit "proceed and continue with all remaining work" instruction. Requirements doc Chapter 5; Plan §6.4.
**Scope executed:** `provision_texts` rows + pin tests + the Part B adjudication record + this courier + ledger. No engine code touched. No deploy, no harness invocation.
**Disposition:** COMPLETE — awaiting controller verification. **This closes the original 7-prompt ingestion inventory** (Prompts 1–5 and 7 already complete; Prompt 6 lands here).

---

## RESERVED-FRAMING NOTE (read first)

BIPA is the only statute in this corpus carrying a **private right of action** (740 ILCS 14/20, not ingested as a row in this item — see Deviations). That makes litigation-exposure framing the product's highest-risk output surface. **Every row ingested here is statute text only.** No exposure characterization, no likelihood language, no "best practice" hedging appears in any `verbatim_excerpt`. This is enforced mechanically, not by convention: `biometric-corpus-pin.test.ts` carries a **negative pin** that fails the build if `exposure`, `class action`, `litigation risk`, `damages exposure`, `we recommend`, `likely to be found`, or `best practice` ever appears in an ingested biometric row. Exposure framing remains reserved to the generator layer, where it can be qualified.

---

## PART A — INGESTION

### Provenance (official publishers only — no aggregators)

| Statute | Publisher URL | Retrieved |
|---|---|---|
| IL BIPA, 740 ILCS 14 | `https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57` | 2026-07-31 |
| TX CUBI, Bus. & Com. Code § 503.001 | `https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm` | 2026-07-31 |
| WA RCW 19.375.010–.900 | `https://app.leg.wa.gov/rcw/default.aspx?cite=19.375&full=true` | 2026-07-31 |
| WA RCW 19.373 (MHMD, Part B only) | `https://app.leg.wa.gov/rcw/default.aspx?cite=19.373&full=true` | 2026-07-31 |

No text in this item came from memory. Every excerpt was extracted from the fetched publisher document and inserted; nothing was reconstructed, paraphrased, or completed from recollection.

### Rows written (19 total — 18 `approved`, 1 `pending`)

**Illinois BIPA — 7 rows, `jurisdiction = US-IL`**

| key | citation | chars |
|---|---|---|
| `il-bipa-740-14-5` | 740 ILCS 14/5 (Legislative findings; intent) | 1,599 |
| `il-bipa-740-14-10` | 740 ILCS 14/10 (Definitions) | 2,853 |
| `il-bipa-740-14-15-a` | § 15(a) retention schedule + destruction guidelines | 718 |
| `il-bipa-740-14-15-b` | § 15(b) notice + written release before collection | 745 |
| `il-bipa-740-14-15-c` | § 15(c) no profit from biometric data | 209 |
| `il-bipa-740-14-15-d` | § 15(d) disclosure limits | 813 |
| `il-bipa-740-14-15-e` | § 15(e) reasonable standard of care | 547 |

§ 15 is pinned **one subsection per row (a)–(e)** exactly as dispatched, so a generator citing § 15(b) cannot silently pull § 15(a)'s retention language. The § 10 row carries the **full exclusions list** — writing samples/signatures/photographs/scientific samples/demographic data/tattoo descriptions/physical descriptions; donated organs and transplant blood or serum; GIPA-regulated biological materials; HIPAA treatment-payment-operations and patient-in-health-care-setting information; and diagnostic imaging (X-ray, roentgen, CT, MRI, PET, mammography). All five exclusion sentences are separately pinned.

**Texas CUBI — 6 rows, `jurisdiction = US-TX`**

| key | citation | chars |
|---|---|---|
| `tx-cubi-503-001-a` | § 503.001(a) definitions | 273 |
| `tx-cubi-503-001-b` | § 503.001(b), (b-1) notice + consent | 753 |
| `tx-cubi-503-001-c` | § 503.001(c), (c-1), (c-2) disclosure limits, care, destruction | 1,937 |
| `tx-cubi-503-001-d` | § 503.001(d) civil penalty | 184 |
| `tx-cubi-503-001-e` | § 503.001(e) exceptions | 1,018 |
| `tx-cubi-503-001-f` | § 503.001(f) subsequent commercial use of AI-training biometrics | 400 |

The **one-year rule** is `tx-cubi-503-001-c` and is carried with both of its qualifiers in the same row, because reading (c)(3) without them is legally wrong: (c-1) extends the clock to the first anniversary of the date a longer-retention instrument is no longer required to be maintained, and (c-2) presumes an employer security-purpose collection expires **on termination of the employment relationship**. Note the current text also carries the 2025 AI amendments — (a)(1) defines "artificial intelligence system" by reference to § 551.001, (e)(2)–(3) exempt AI training/security use, and (f) claws the obligations back on subsequent commercial use. That is the live text as published; it is ingested as-is.

**Washington RCW 19.375 — 5 rows, `jurisdiction = US-WA`**

| key | citation | chars |
|---|---|---|
| `wa-rcw-19-375-010` | RCW 19.375.010 definitions (incl. "enroll") | 2,371 |
| `wa-rcw-19-375-020` | RCW 19.375.020 enrollment, disclosure, retention | 3,393 |
| `wa-rcw-19-375-030` | RCW 19.375.030 CPA application; AG-only enforcement | 585 |
| `wa-rcw-19-375-040` | RCW 19.375.040 exclusions (GLBA, HIPAA, law enforcement) | 665 |
| `wa-rcw-19-375-900` | RCW 19.375.900 finding—intent—2017 c 299 | 697 |

### Hash / integrity verification

Per-row length verification was run post-insert against the extracted source text (table above; all lengths match extraction). Publisher-side content hashes are **not available** for these three publishers — ILGA and app.leg.wa.gov serve dynamically-rendered ASP pages with per-request markup and no published digest, and the Texas HTML doc carries no checksum. The **verbatim substring pins in `biometric-corpus-pin.test.ts` are the standing integrity control** in place of a source hash: 27 statutory sentences must appear byte-for-byte (after typography normalization only) or CI fails. This is the same substitution used in prior ingestion items where the publisher offers no digest, and it is strictly stronger than a hash for the purpose that matters here — a hash detects that *something* changed; the pins detect that *the operative sentence* changed.

---

## PART B — ADJUDICATION: does RCW 19.373 (My Health My Data) belong in this registry?

**The standing question (Plan §6.4):** loop2 corrections reference "RCW 19.373.010 scope parsing." Either (i) loop2 correctly identified that Washington reaches biometric data through a second statute, or (ii) a loop2 reviewer transposed a digit and meant RCW 19.**375**.010.

### The text, quoted both ways

**RCW 19.375.010(1) — the biometric-specific chapter:**

> "Biometric identifier" means data generated by automatic measurements of an individual's biological characteristics, such as a fingerprint, voiceprint, eye retinas, irises, or other unique biological patterns or characteristics that is used to identify a specific individual. "Biometric identifier" does not include a physical or digital photograph, video or audio recording or data generated therefrom, or information collected, used, or stored for health care treatment, payment, or operations under the federal health insurance portability and accountability act of 1996.

**RCW 19.373.010(4) — My Health My Data:**

> "Biometric data" means data that is generated from the measurement or technological processing of an individual's physiological, biological, or behavioral characteristics and that identifies a consumer, whether individually or in combination with other data. Biometric data includes, but is not limited to: (a) Imagery of the iris, retina, fingerprint, face, hand, palm, vein patterns, and voice recordings, from which an identifier template can be extracted; or (b) Keystroke patterns or rhythms and gait patterns or rhythms that contain identifying information.

**RCW 19.373.010(8)(b)(ix)** places "Biometric data" inside the enumerated list of what constitutes a consumer's "physical or mental health status," i.e. **consumer health data**.

### Ruling

**Not a pure conflation, and not a clean in-scope finding either — it is a genuine scope question, and it is CEO-gated.** Three findings:

1. **loop2 was not simply wrong about the digits.** RCW 19.373 exists, is Washington law, and does regulate biometric data by name. A reviewer citing 19.373.010 for a biometric definition was pointing at real text.
2. **loop2 was wrong that 19.373 is the biometric-identifier chapter.** Washington's biometric-identifier statute is 19.**375**. 19.373 reaches biometric data only *derivatively* — as one enumerated species of consumer health data — and only when the data is "linked or reasonably linkable to a consumer" as health status. The two definitions are not interchangeable and materially diverge in both directions: 19.373 is **broader** on subject matter (behavioral characteristics; keystroke rhythms; gait rhythms — none of which are "biological characteristics" measured automatically under 19.375, and none of which most operators would think of as biometrics at all), while 19.375 is **broader** on the enrollment/commercial-purpose axis that this product is built around. Substituting one for the other produces wrong answers either way.
3. **Therefore: proceeding on the narrower reading.** RCW 19.375 is the Washington authority in this product's active biometric registry. RCW 19.373 is **flagged to the CEO as a scope addition** and is **not** activated.

### Scope-implication flag for the CEO (decision requested)

Bringing MHMD in scope is **not** a corpus chore, it is a product-scope expansion with three consequences: (a) the applicability test changes shape — 19.373 turns on *consumer health data* status, not on enrollment for a commercial purpose, so a controller outside 19.375 can still be inside 19.373; (b) the covered-data surface expands to behavioral biometrics (keystroke and gait rhythms) that the current intake does not ask about at all; (c) MHMD carries its **own private right of action** through the Washington CPA, which multiplies the reserved-framing surface currently limited to BIPA. Recommendation: treat as a separate dispatched item with its own intake extension, not as an ingestion footnote.

### How the narrower reading is enforced mechanically

The MHMD definition **was ingested for provenance** — as one row, `wa-rcw-19-373-010-biometric-data`, with `status = 'pending'`. Under the existing CLOSED-SET rule in `_shared/provision-store.ts`, a `pending` row **renders citation-only with "Provision text pending verification" and its verbatim excerpt can never reach a report**. So the text is captured verbatim now, while the source is in hand and verified, and it is structurally impossible for it to leak into product output before the CEO rules. Flipping it to `approved` is the entire activation step if the ruling is yes. A pin test asserts the row stays `pending`, so an accidental approval breaks CI.

---

## PIN TESTS

`src/registry/__tests__/biometric-corpus-pin.test.ts` — **4/4 passing**, 27 verbatim assertions. Four guards:

1. **Verbatim pins** — every pinned statutory sentence must appear (typography-normalized only: curly quotes/dashes, NBSP, whitespace runs). Dispatch-named pins all present: the **BIPA definitional sentences including all five exclusion sentences**, the **CUBI one-year destruction rule** (plus its (c-1) and (c-2) qualifiers), and the **RCW 19.375.010(5) "enroll" definition**. Plus § 15(a)–(e) operative clauses, the CUBI inform-then-consent sentence and GLBA voiceprint exception, and the 19.375 enrollment trigger, photograph exclusion, commercial-purpose carve-out and AG-only enforcement clause.
2. **Negative pin** — reserved-framing rule, above.
3. **Per-statute jurisdiction tags** — `US-IL` / `US-TX` / `US-WA` asserted per key prefix.
4. **MHMD containment** — `wa-rcw-19-373-010-biometric-data` must remain `pending`.

The test header records provenance URLs and states the standing rule: **a failing pin means re-ingest the corpus, never edit the pin.** Skips cleanly when `PGHOST` is unset.

---

## DEVIATIONS AND BUILD ISSUES

1. **Not ingested: 740 ILCS 14/20 (right of action), /25, /99.** The dispatch enumerated /5, /10, /15. Sections 20/25/99 were out of the named scope and were not written. Flagging because /20 is the provision the reserved-framing note is *about* — if the generator is to reason about the private right of action from corpus rather than from the model, /20 needs its own ingestion. Recommend as a small follow-on.
2. **No publisher hash available** for any of the three sources — mitigation stated above under Hash / integrity verification.
3. **TX text includes 2025 AI amendments.** Ingested as published. If the product needs the pre-amendment text for a historical assessment, that is a versioning question the corpus does not currently model.
4. **RCW 19.373 ingested but inert.** Deliberate, per the ruling; called out here so no one reads the row's existence as an activation.
5. **Pre-existing, not caused here:** `contract-surface-audit` still fails on `cppa-risk` fixtures (Item 305 residue, first flagged at Item 313). Untouched by this item.
6. **No four-team split.** All four teams unanimous on Part B: real statute, wrong chapter for this product, CEO-gated. Nothing carried on a non-unanimous vote.

## HONEST LIMITS

Corpus and pins only. No generator consumes these rows yet — Chapter 5 (biometric) is a **build** item and is not part of this dispatch. The existing `_shared/registry/biometric-statute-registry.ts` (Waves 1–3) is a *separate* structure with its own self-consistency test and was **not** modified or reconciled against these `provision_texts` rows; if the Chapter 5 rebuild is to honor REUSE LAW against ingested text, that reconciliation is the first task of that item. No deploy. No harness invocation.
