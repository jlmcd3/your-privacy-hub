# ITEM 318 — CORPUS INGESTION: UK GDPR Art. 22 and Arts. 44–49 variants

**Dispatch:** ITEM318-UK-GDPR-ART22-ART44-INGESTION-2026-07-31
**Authority:** CEO directive 2026-07-31 ("proceed and continue with all remaining work")
**Scope:** corpus only. NO engine code touched. NO deploy. NO harness invocation.
**Disposition:** COMPLETE — with one finding that materially changes the follow-on UK-split work.

---

## 1. Source and retrieval

| | |
|---|---|
| Publisher | King's Printer of Acts of Parliament (official UK publisher) |
| Work | Regulation (EU) 2016/679 as retained and amended for the United Kingdom ("UK GDPR") |
| Base URI | `https://www.legislation.gov.uk/eur/2016/679` |
| Per-article URI | `https://www.legislation.gov.uk/eur/2016/679/article/<N>/data.xml` |
| Revision valid from | **2026-06-19** |
| Source last modified | **2026-06-22** |
| Retrieval date | **2026-07-31** |
| Format | Legislation XML (`P1group`/`P1`/`P2`/`P3` hierarchy), extracted programmatically — no manual transcription, no reconstruction from memory |
| Cross-check | Editorial `Commentary` annotations on each article were read for amendment provenance (amending instrument, commencement date, S.I. reference) |

Exact source URLs, one per provision:

| Provision | Source URL |
|---|---|
| Art. 22 | https://www.legislation.gov.uk/eur/2016/679/article/22 |
| Art. 22A | https://www.legislation.gov.uk/eur/2016/679/article/22A |
| Art. 22B | https://www.legislation.gov.uk/eur/2016/679/article/22B |
| Art. 22C | https://www.legislation.gov.uk/eur/2016/679/article/22C |
| Art. 22D | https://www.legislation.gov.uk/eur/2016/679/article/22D |
| Art. 44 | https://www.legislation.gov.uk/eur/2016/679/article/44 |
| Art. 44A | https://www.legislation.gov.uk/eur/2016/679/article/44A |
| Art. 45 | https://www.legislation.gov.uk/eur/2016/679/article/45 |
| Art. 45A | https://www.legislation.gov.uk/eur/2016/679/article/45A |
| Art. 45B | https://www.legislation.gov.uk/eur/2016/679/article/45B |
| Art. 45C | https://www.legislation.gov.uk/eur/2016/679/article/45C |
| Art. 46 | https://www.legislation.gov.uk/eur/2016/679/article/46 |
| Art. 47 | https://www.legislation.gov.uk/eur/2016/679/article/47 |
| Art. 47A | https://www.legislation.gov.uk/eur/2016/679/article/47A |
| Art. 48 | https://www.legislation.gov.uk/eur/2016/679/article/48 |
| Art. 49 | https://www.legislation.gov.uk/eur/2016/679/article/49 |
| Art. 49A | https://www.legislation.gov.uk/eur/2016/679/article/49A |

No law-firm summary, aggregator, or ICO restatement was used as a text source.

---

## 2. THE HEADLINE FINDING — the dispatch's premise was correct but understated

The dispatch anticipated that UK Art. 22 and Arts. 44–49 would be *textually different*
from their EU counterparts. **They are not different. They are largely gone.**

As currently in force in the UK regime:

| Provision | Status in the UK | Instrument |
|---|---|---|
| **Art. 22** | **SUBSTITUTED** — Chapter III **Section 4A (Arts. 22A–22D)** was substituted for Art. 22 | Data (Use and Access) Act 2025 (c. 18), ss. 80(1), 142(1)(2)(h); S.I. 2026/82, reg. 2(j) (with reg. 5). In force 19.6.2025 for specified purposes, **5.2.2026** in so far as not already in force |
| **Art. 44** | **OMITTED** — replaced by Art. 44A | DUAA 2025 (c. 18), s. 142(1), Sch. 7 para. 2(1); S.I. 2026/82, reg. 2(z9). **5.2.2026** |
| **Art. 45** | **OMITTED** — replaced by Arts. 45A–45C | DUAA 2025 (c. 18), s. 142(1), Sch. 7 para. 3; S.I. 2026/82, reg. 2(z9). **5.2.2026** |
| **Art. 46** | **AMENDED** — paras 1, 4, 5 omitted; new para 1A and para 6 inserted | DUAA 2025 Sch. 7 |
| **Art. 47** | retained and amended (BCR approval by the Commissioner) | S.I. 2019/419 and DUAA 2025 |
| **Art. 47A** | **NEW** — Secretary-of-State standard clauses and further safeguards | DUAA 2025 |
| **Art. 48** | **OMITTED** | The Data Protection, Privacy and Electronic Communications (Amendments etc) (EU Exit) Regulations 2019 (S.I. 2019/419), reg. 1(2), Sch. 1 para. 41 (with reg. 5, Sch. 1 para. 80); 2020 c. 1, Sch. 5 para. 1(1). **31.12.2020** |
| **Art. 49** | retained and amended — derogations now hang off Art. 45A/46, not Art. 45 | S.I. 2019/419 and DUAA 2025 |
| **Art. 49A** | **NEW** — Secretary-of-State power to restrict transfers on public-interest grounds | DUAA 2025 |

On legislation.gov.uk, an omitted provision is rendered as
`. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .` — there is no text
to quote. Any engine output that quotes "UK GDPR Article 22(1)" or "UK GDPR Article 45"
is quoting a provision **that is not in force**. This is not a nuance of wording; it is
a citation to a repealed surface.

---

## 3. Points of substantive divergence from the EU text

Input to the follow-on lia / governance / ir-playbook UK-split engine work.

### 3.1 Automated decision-making (EU Art. 22 → UK Arts. 22A–22D)

1. **The prohibition is inverted in structure.** EU Art. 22(1) grants the data subject a
   *right not to be subject to* a solely-automated significant decision. The UK Section 4A
   does not grant that right in those terms. Art. 22B imposes a **prohibition on the
   decision-maker** limited to decisions based entirely or partly on Article 9(1)
   special-category processing, and Art. 22C imposes a **safeguards duty** on all other
   solely-automated significant decisions. **A UK-scoped product must not say the data
   subject "has the right not to be subject to" the decision.** The general UK position is
   that the decision may be taken, provided the Art. 22C safeguards are in place.
2. **"Meaningful human involvement" is now a defined statutory term** (Art. 22A(1)(a)) —
   EU Art. 22 has no such definition; the EU concept sits in Art. 29 WP / EDPB guidance.
   Art. 22A(2) makes the extent of profiling a **mandatory consideration** when assessing
   whether human involvement is meaningful.
3. **"Significant decision" replaces "legal effects concerning him or her or similarly
   significantly affects him or her"** as the trigger, and is defined at Art. 22A(1)(b).
4. **The Art. 22C safeguard set is a closed statutory list of four**: information about the
   decision, ability to make representations, ability to obtain human intervention, ability
   to contest. The EU Art. 22(3) list is three (human intervention, express point of view,
   contest) and applies only to the contract/consent exceptions. **The UK list applies
   generally and includes an information duty the EU text does not.**
5. **Art. 22B(4) is a UK-only bar**: a significant decision may not be taken solely
   automatically where the processing is carried out in reliance on **Art. 6(1)(ea)**
   (the UK's recognised-legitimate-interests lawful basis, itself a DUAA creation with no
   EU counterpart).
6. **Art. 22D delegates to the Secretary of State** the power to define, by regulations,
   what does and does not count as meaningful human involvement and as a similarly
   significant effect, and to supplement the Art. 22C safeguards — subject to the express
   limit at Art. 22D(4) that such regulations **may not amend Art. 22C**. There is no EU
   analogue; the EU position is fixed by the Regulation and interpreted by the EDPB/CJEU.

### 3.2 International transfers (EU Arts. 44–49 → UK Arts. 44A, 45A–45C, 46, 47, 47A, 49, 49A)

1. **Adequacy is a Secretary-of-State regulation, not a Commission decision.** UK Art. 45A
   empowers the Secretary of State to approve transfers by regulations, subject to the
   negative resolution procedure (Art. 45A(5)). Any output describing "an adequacy decision
   of the European Commission" for a UK transfer is wrong.
2. **The standard is different, and it is lower.** UK Art. 45B(1) applies the
   **"data protection test"**: the standard of protection in the destination must be
   **"not materially lower"** than the UK standard. This is materially weaker than the EU's
   "essentially equivalent" standard from *Schrems II*. Any UK output that imports
   "essentially equivalent" is importing the EU test.
3. **The Art. 45B(2) factor list is UK-specific** and includes factors the EU Art. 45(2)
   list does not — notably Art. 45B(2)(f), **"the constitution, traditions and culture of
   the country or organisation"**.
4. **Art. 45B(3)(a) reads the protection "taken as a whole"** — an express holistic-assessment
   instruction with no EU counterpart.
5. **The Art. 46 safeguards route now carries an express controller-side assessment duty.**
   UK Art. 46(1A)(a)(ii) requires the controller or processor, **"acting reasonably and
   proportionately"**, to conclude the data protection test is met. The EU text has no such
   in-Regulation reasonableness qualifier — in the EU the equivalent obligation is the
   *Schrems II* transfer impact assessment derived from case law. **The UK has codified a
   softer version of the TIA.**
6. **UK standard clauses come from two distinct sources**: Secretary-of-State regulations
   under Art. 47A(1) (Art. 46(2)(c)), and documents issued by the **Commissioner** under
   **s. 119A of the Data Protection Act 2018** (Art. 46(2)(d)) — this is the statutory hook
   for the **IDTA** and the **UK Addendum to the EU SCCs**. Citing "the Commission's
   standard contractual clauses" for a UK transfer is wrong.
7. **Art. 47A(7) constrains the delegated power**: regulations may amend Art. 46 only by
   adding ways of providing safeguards, or by varying/omitting ways previously added by
   such regulations.
8. **Art. 49 derogations now open on the absence of Art. 45A approval and Art. 46
   compliance** — not on the absence of "an adequacy decision pursuant to Article 45(3)".
   The cross-reference itself has moved.
9. **Art. 49A is a UK-only restriction power**: the Secretary of State may restrict
   transfers of a category of personal data on important public-interest grounds, and by
   Art. 44A(3) such a restriction **overrides both the safeguards route and the derogations
   route**. There is no EU analogue. A UK transfer analysis is therefore not complete on the
   Art. 44A(2) conditions alone.
10. **Art. 48 (transfers not authorised by Union law) is simply gone** in the UK. There is
    no UK provision requiring third-country court/authority orders to run through an MLAT
    route. An engine that cites Art. 48 for a UK-scoped foreign-law-enforcement-demand
    question is citing nothing.

---

## 4. What was written

### 4.1 `gdpr_articles` (jurisdiction `uk`)

Four rows were newly inserted; all carry the amendment provenance in `body_text` rather
than operative text, because there is none:

| article_number | chapter | content |
|---|---|---|
| `22` | CHAPTER III | substitution annotation + "No Article 22 of the UK GDPR is in force." |
| `44` | CHAPTER V | omission annotation + "No Article 44 of the UK GDPR is in force." |
| `45` | CHAPTER V | omission annotation + "No Article 45 of the UK GDPR is in force." |
| `48` | CHAPTER V | omission annotation + "No Article 48 of the UK GDPR is in force." |

Thirteen further `jurisdiction='uk'` rows (`22A`, `22B`, `22C`, `22D`, `44A`, `45A`, `45B`,
`45C`, `46`, `47`, `47A`, `49`, `49A`) were found to be **already present and correct**;
the ingestion was written `ON CONFLICT DO NOTHING` and left them untouched. Their content
was re-verified against the freshly fetched XML this turn. Seventeen UK rows now exist
across the Art. 22 series and Chapter V.

### 4.2 `provision_texts` (jurisdiction `UK`, status `approved`)

Row-key convention follows the `uk_gdpr_art_33_mirror` / Item 304 Fix D lineage, expressed
in the hyphenated form already used by the two pre-existing rows: **`ukgdpr-art-<n>`**.

Newly inserted this turn: `ukgdpr-art-44a`, `-45`, `-45a`, `-45b`, `-45c`, `-46`, `-47`,
`-47a`, `-48`, `-49`, `-49a` (11 rows), each carrying the **numbered, indented verbatim
text** as published, including omitted-paragraph markers where legislation.gov.uk shows
them (e.g. Art. 46 paras 1, 4, 5).

Pre-existing and deliberately not overwritten: `ukgdpr-art-22`, `-22a`, `-22b`, `-22c`,
`-22d`, `-44`. Each was re-verified against the fetched XML this turn and found accurate.

---

## 5. Pin tests

`src/registry/__tests__/uk-gdpr-corpus-pin.test.ts` — **5/5 passing**.

1. **Verbatim pins** — 27 operative substrings across 12 UK rows, each extracted from the
   fetched source, including the Art. 22C(1) wrap-up clause, the Art. 45B(1) "not materially
   lower" standard, and the Art. 46(1A)(a)(ii) reasonable-and-proportionate assessment.
2. **Omission pins** — each of Arts. 22 / 44 / 45 / 48 must record its amending instrument
   and omission marker, and must **not** contain EU operative language (the EU Art. 22(1)
   "shall have the right not to be subject to a decision" clause, or the EU "adequate level
   of protection" clause).
3. **NEGATIVE identity pin** — no UK `gdpr_articles` row may be byte-identical to its EU
   counterpart for Arts. 22, 44, 45, 46, 47, 48, 49. Identity would mean EU text was
   ingested under a `uk` tag. All seven differ.
4. **EU-vocabulary pin** — no UK Chapter V row may contain "Member State", "Union law",
   "European Data Protection Board", or Commission-decision phrasing.
5. **Jurisdiction-tag pin** — every `ukgdpr-art-*` row is `jurisdiction='UK'` and
   `status='approved'`; exactly 17 UK `gdpr_articles` rows exist across the pinned set.

---

## 6. Extraction defect caught and corrected in-turn

The first XML extractor emitted sub-paragraph lists but **dropped wrap-up text** — the
operative clause that follows a lettered list within the same paragraph. On Art. 22C(1)
this silently deleted the entire safeguards duty ("the controller must ensure that
safeguards … are in place"), leaving a paragraph that read as a definition with no
obligation. The extractor was rebuilt to walk `P1para`/`P2para` children in document order,
and every fetched article was re-extracted and diffed against the first pass. Art. 22C was
the only provision affected, and the row already in the database was found to carry the
complete text, so nothing incorrect was written. **Recorded because a wrap-up-dropping
extractor is a silent, plausible-looking corruption** — the output parses, reads like law,
and omits the duty.

---

## 7. Honest limits and items reserved for the controller

1. **Not measured.** No harness invocation, no engine touched, no deploy. This item makes
   correct UK text *available*; it does not make any product cite it.
2. **The live defect is not yet fixed.** lia / governance still cite EU Art. 22 and
   ir-playbook / governance still cite Art. 44 for UK-scoped output. That is the follow-on
   **UK-split engine item**, and §3 of this courier is its input. Until then the defect
   stands.
3. **Commencement sensitivity.** The DUAA 2025 Chapter V and Section 4A changes commenced
   **5.2.2026**. Any product output dated before that commencement described a different UK
   regime. If the fleet ever needs to reason about a pre-2026 UK posture, that is a
   point-in-time corpus question this ingestion does not answer — the rows carry the text
   **as currently in force only**.
4. **Art. 6(1)(ea)** (recognised legitimate interests) is referenced by Art. 22B(4) but is
   **not ingested**. Any UK ADMT output that needs to explain that bar will degrade. This is
   the natural next ingestion item and is flagged, not filled from memory.
5. **DPA 2018 s. 119A** is the statutory hook for the IDTA/Addendum via Art. 46(2)(d) and is
   **not ingested**. Same treatment.
6. **Carried from earlier items, still open:** the grader defect (Item 316), MHMD scope
   (Item 314), and 740 ILCS 14/20 ingestion (Item 317).
