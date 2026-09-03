# Syllabus & Record — the EUP fleet presentation design system

**Status: CEO-RATIFIED 2026-09-03** (doc 151; concept iterations docs 143/144 → design-pass-2
v1 → v2 + final CEO edits). This document is the canonical record of the design system.
The reference implementation is `docs/design/syllabus-record/design-concept-v2.html`
(renders to the 14-page concept PDF; every page passes plain-text extraction with zero
overflows — the fleet's render law applied to the design itself).

**What this is for:** the doc-145 Phase-1 product batches implement this system per
product (inventory-first, with the per-product CEO checkpoints doc 145 §9 already
requires). Nothing here overrides the doc-145 process; this is the settled target the
batches build toward.

---

## 1. The model

An appellate reporter's volume, not a consulting deck and not a flat memo:

> **The holding on page one (the Determination Syllabus). The reasoning in the body.
> The record behind a divider (the Supporting Assessment Record). Every fact stated
> once, at the depth where it lives, with a locator to every other depth.**

Three reading speeds, one document: tables for the 30-second read, paragraphs for the
defense, the Record for the audit. **Statuses summarize paragraphs; they never replace
them.**

## 2. The seven CEO design principles (binding)

1. **No naked tables** — every table carries a short company-specific lead-in directly
   above it stating what the table shows and the conclusion it supports ("In the table
   below, the finalization record identifies…"). Plain English, not house jargon.
2. **One fact, one home** — no prose list may duplicate the table beneath it; movement,
   levels, and statuses live in exactly one surface per depth.
3. **Unified typography** — the five-role ramp below; no additional styles without a
   ratified amendment.
4. **One grid, justified body** — a single rail for all framed elements; body text
   justified; the acceptance bar is that the document reads as the formal assessment
   the company adopts and relies on.
5. **Company data or cut** — an exhibit earns its pages only if its cells state
   something about this company's record; a table that restates law is removed or
   redesigned.
6. **Every state carries its why** — at three depths: the lexicon defines the term
   once; the in-row qualifying fact earns it; the lead-in states the company-grounded
   derivation. Constraint: level explanations cite the Company's recorded inputs and
   the stated conclusion — never EUP's internal weighting mechanics in the abstract
   (the ratified confidential-method register).
7. **Style scope** — this system applies to assessment-style reports only. Registration
   sample letters keep plain letter format. **Notices (EU/US) and the DPA Generator
   inherit NONE of it**: formal instrument format — numbered sections, bold +
   underlined Section headings, underlined-but-not-bold subsections. Any future
   letter-, filing-, or instrument-shaped surface defaults OUT.

## 3. The type ramp (five roles — the complete set)

| Role | Family | Size / treatment | Used for |
|---|---|---|---|
| R1 Display | Georgia | 21pt page-1 title · 15.5pt section titles · 30pt quiet numerals (#aab8c5) · 19pt record divider | Titles, numerals |
| R2 Body | Georgia | 10pt, line-height 1.5, **justified**; italic for section question-lines (left-set) | All reasoning prose |
| R3 Table | Georgia | 8.8pt cells (9.2–9.3pt for syllabus/map/condition text), left-set | Table content |
| R4 Label | Arial | 7.5pt bold, letter-spaced, UPPERCASE | Table headers, state words, eyebrows, rail labels |
| R5 Furniture | Arial | 7pt, letter-spaced | Running heads, footers, locators |

No other styles. Bold+underline only per the ratified marker rule (markers/letters/
numerals never underlined; run-in heads underline-only).

## 4. Palette (restrained; grayscale-safe; color never the sole carrier)

- Navy `#0c2a44` — institutional rules, display type, the rail.
- Ink `#1a1916` · body. Slate `#41505c` / `#5c6d7a` — secondary text, apparatus.
- Hairlines `#dde5ea` / `#c9d2d9`. Panel ground `#f3f6f8` (TWO filled surfaces per
  document: the disposition panel and the record-divider footer ground).
- State tints (as TEXT, never filled chips): ok `#28503a` · hold `#6e5518` ·
  high/adverse `#6e2323` · neutral `#41505c`. Teal `#2d9b90` for the customer-voice rail.

## 5. The State Lexicon (fleet-wide controlled vocabulary)

Defined once in § 1 of every report; small-caps tinted text; **a state never appears
without its qualifying fact or open point in the same row**; absent elements render
their state in place — never a blank cell.

| Term | Tint | Meaning |
|---|---|---|
| ENGAGED / CREDITED / ADDRESSED / RECORDED / CONFIRMED | ok | The record supports it; the qualifying fact travels beside it |
| ADDITIONAL INFORMATION REQUIRED · DETERMINATION PENDING · OPEN / PARTIAL | hold | An element the determination needs is not yet on the record; the completing fact and Follow-Up are named |
| NOT ENGAGED / NOT ESTABLISHED | neutral | A determined negative, with its reason |
| HIGH · MODERATE · LOW | hi/hold/ok | Levels rated from the likelihood and severity the Company records |

## 6. The components (canonical definitions; CSS in the reference implementation)

1. **Determination Syllabus (page 1).** Brand line → activity title → disposition panel
   (the one display panel: label, disposition in R1, one justified paragraph) →
   five-row determination table (small-caps keys) → Conditions by semantic run-in name
   (underline-only) with full closure text on the neutral rail → one-line KEY DATES
   strip. No cards, no fills beyond the panel.
2. **The Rail.** 2pt left rule + 10pt indent, one geometry for every framed element:
   the Governing-Requirement rule line (navy; label = `GOVERNING REQUIREMENT · <cite>`;
   statutory sentence **verbatim** — CEO rule 2 untouched), the customer-voice block
   (teal), and conditions (hairline).
3. **Law → State → Fact matrix.** Three conceptual columns (provision · state ·
   qualifying fact / open point). The § 3.A instance's iron rule prints with it: a
   state is never asserted from a yes/no answer alone.
4. **Element decision tables.** Inventory (category · retention · canonical mapping in
   ONE table), necessity (element · determination · the Company's own words), posture
   (dimension · posture · the fact the posture rests on), controls, approval record.
5. **Ledger with movement.** The § 4.A risk ledger carries a "Movement to remaining"
   column (`High → Moderate (reduced)`) — the movement lives in the table, never in a
   duplicate list above it. Lead-in sentence (ratified wording): "The privacy risks
   noted below correspond to the specific privacy risks identified in
   § 7152(a)(5)(A)–(H); categories not shown present no credible path on the
   information provided."
6. **Balance Spread.** Benefits established (green-ruled column) vs risks remaining
   (red-ruled column), one-line reasons, closing with the full determination paragraph
   in the disposition panel. PRODUCTION NOTE: implement as a table, not flexbox.
7. **Named actions.** Conditions = semantic run-in name + full closure text; the
   three-part taxonomy (Conditions / Follow-Ups / Recommendations) with the framing
   sentence "a condition blocks, a follow-up completes, a recommendation improves";
   syllabus count always equals the § 4.D count.
8. **Operating Calendar.** Obligation · authority · status/date · to-resolve; a
   deadline the record cannot support renders DETERMINATION PENDING and names the
   resolving fact.
9. **Record Divider + map.** Full-page divider ("A decision-maker may stop at
   Section 5"), justified paragraph, A–F map; record pages carry the tinted running
   foot. Locator footers on every page (`§ 3.B–C · Necessity · Transparency`).
10. **The Compliance Index (Appendix A — replaces the old factor matrix).** One row per
   element the product's governing provision requires the assessment to contain:
   provision · required element in plain English · where this report provides it ·
   state (open elements name their Follow-Up). Zero duplication — it maps requirements
   to locations, never restates conclusions. Closing sentence: "Every other element the
   regulation requires is contained in this report at the section cited." NOTE: amends
   the doc-46 three-column appendix pattern for redesigned products.
11. **Applicable & Persuasive Authority (Appendix B — CEO-ratified KEEP and renamed).**
   Map description: "Relevant CPPA enforcement actions and decisions; analogous
   enforcement actions and decisions under other data-protection law (e.g. GDPR) for
   persuasive authority." Page subtitle: "CPPA enforcement and enforcement under
   analogous data-protection law that bear on the factors this report assesses." Lead
   paragraph (ratified): "This record collects enforcement decisions issued under CPPA
   authority and analogous data-protection law. Analogous decisions are persuasive
   context only and no determination in this report rests on them. Each entry names the
   factor it bears on…" Row: matter · what happened · bearing · authority. CEO
   rationale on record: importance grows over time; companies and regulators will want
   that depth of thinking. (Anticipates CPPA-decision ingestion.)

## 7. The Supporting Assessment Record (ratified disposition)

- **C (Processing and Data Inventory), D (Risk Register), E (ADMT Technical Record):**
  statutory content, not optional extras — § 7152(a)(3)(A)–(G) and (a)(5) content in
  full; the two-layer design exists so it never bloats the decision layer.
  **F (Materials Considered):** the record boundary for § 7155(c).
- **B:** keep, per § 6.11. **A:** the Compliance Index, per § 6.10.
- Rationale on record: § 7157 lets the Agency/AG demand the full report within 30 days;
  enforcement (AEPD/AENA, PS/00431/2024) sanctions assessments that OMIT required
  analysis — the record layer is the insurance and the certifying executive's comfort.

## 8. Per-product application map

| Component | Risk | Cyber | DPIA | LIA | Governance | ADMT | Registration | IR | RoPA |
|---|---|---|---|---|---|---|---|---|---|
| Determination Syllabus | disposition | readiness posture | outcome | verdict | posture | compliance position | duty position | activation state | record status |
| State Lexicon · Rail · locator footers · Record Divider | ✓ all products (assessment-style surfaces) |||||||||
| Law→State→Fact matrix | § 3.A triggers | § 7120 applicability | Art. 35 triggers | three-part test | duty rows | thresholds | duty table | notification tests | field completeness |
| Ledger movement | § 4.A | control maturity | residual risk | balancing | gap movement | — | — | clock states | — |
| Balance Spread | § 4.C | — | risk/measures | balancing | — | — | — | — | — |
| Operating Calendar | § 5.B | cert cohorts | review cadence | review | review | compliance dates | renewal | clocks | review |
| Compliance Index | § 7152(a) | § 7120–7124 duty set | Art. 35(7) elements | test + Guidelines factors | per-article duties | §§ 7200+ elements | filing elements | Arts. 33–34 elements | Art. 30 fields |

Each Tier-1 batch builds its Compliance Index from its OWN governing provision's
required-content enumeration.

## 9. PDFShift / production constraints (binding)

- Portrait only (landscape permanently banned); print-media emulation; `<thead>` for
  repeated table headers; rows never split pages (`page-break-inside: avoid`).
- No transforms/rotations, no CSS columns, no fixed-height decorative bands, no stacked
  text, no layout where variable-length company data can clip.
- Balance Spread and any multi-column construct: tables in production, never flexbox.
- Fonts: the proven Georgia/Arial pairing (already shipping through PDFShift).
- Acceptance per batch: the doc-66 per-page text-extraction test on a REAL
  PDFShift-generated PDF, plus the dual-render parity rules (doc 145 §6).

## 10. Provenance

CEO ratifications 2026-09-03: the six design principles + style-scope rule; the
appendix disposition (C/D/E/F statutory record; B keep + rename; A → Compliance Index);
the § 4.A lead-in wording; plain-English lead-ins fleet-wide. Concept lineage: doc 143
mockups → doc 144 build → design-pass-2 v1/v2 (Conversion spec documents,
`design-pass-2/`). Implementation path: doc 145 Phase 1, per-product, checkpoints
unchanged.
