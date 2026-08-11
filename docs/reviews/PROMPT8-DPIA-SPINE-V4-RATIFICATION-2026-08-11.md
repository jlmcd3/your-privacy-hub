# PROMPT 8 — DPIA Spine v4 (EDPB Sections 0–6): CEO ratification package

Status: **DRAFT — nothing committed.** The spine is byte-pinned; per the CEO
directive of 2026-08-11 every sentence below (carried from v3 *and* new) is
treated as draft and requires a genuine approval pass. On approval the exact
approved bytes are committed as `DPIA_SKELETON_SECTIONS` v4.

Block kinds unchanged: `skeleton` (fixed prose, byte-pinned, `{slots}` are the
only mutable spans), `lead`, `generated`, `rule`, plus the new `table` blocks
which carry no prose at all (they name a typed surface; cells are verbatim).

---

## A. Corpus-key findings for the proposed new pinpoints (`provision_texts`)

Verified directly against `provision_texts` (status column shown):

| Proposed pinpoint | Corpus key searched | Found | Status | Ruling |
|---|---|---|---|---|
| Art. 9(2) special-category condition | `gdpr-art-9-2` | **No** | — | No new pinpoint. `gdpr-art-9` (approved) is already pinned in v3 and covers the Art. 9 sentence. Sub-keys that do exist: `gdpr-art-9-1`, `gdpr-art-9-2-j` — neither is the general Art. 9(2) condition text. |
| Art. 28 processor obligations | `gdpr-art-28` | **Yes** | approved | **Add** pinpoint. |
| Chapter V transfers — general principle | `gdpr-art-44` | **Yes** | approved | **Add** pinpoint. |
| Chapter V transfers — appropriate safeguards | `gdpr-art-46` | **Yes** | approved | **Add** pinpoint. |
| Chapter V transfers — adequacy | `gdpr-art-45` (EU) | **No** | — | No pinpoint. Only `ukgdpr-art-45` exists (UK consolidated text), which cannot carry an EU adequacy sentence. Adequacy therefore stays out of fixed prose; the transfers table cell carries the registry citation from `transferMechanism`. |

Proposed `DPIA_SKELETON_PINPOINTS` v4 = v3 (`gdpr-art-35`, `gdpr-art-36`,
`gdpr-art-9`) **+** `gdpr-art-28`, `gdpr-art-44`, `gdpr-art-46`.

---

## B. `risk_class` classification — for approval (legal-taxonomy call)

EDPB template distinction: §3.1 = risks the processing poses **as designed**
(no failure, no attack); §4.1.1 = risks arising from **deviation, malfunction
or attack**.

| Risk spec | Proposed class | Reasoning |
|---|---|---|
| `r1_unauthorised_access` | incident | Materialises only on breach of confidentiality controls. |
| `r2_special_category_exposure` | design | The processing exposes Art. 9 data by design, before any failure. |
| `r3_children` | design | Vulnerability of the subject group is a property of the design. |
| `r4_excessive_collection` | design | Over-collection is a design choice, not a malfunction. |
| `r5_third_country_transfer` | incident | Loss of protection arises where the mechanism fails or is absent in operation. |
| `r6_processor_chain` | incident | Loss of control materialises through processor deviation from instructions. |
| `r7_retention_overrun` | design | Retention beyond purpose is a designed schedule, not an incident. |
| `r8_automated_significant_effect` | design | The significant effect is the intended output of the processing. |
| `r9_secondary_use` | design | Repurposing is a design decision about the data's use. |

Coverage: 9 specs, each classified exactly once — 6 design / 3 incident.

**Open question for the CEO:** `r5_third_country_transfer` is arguably
*design* where the transfer route itself is part of the architecture (the
data leaves the EEA by design and the only question is the mechanism). It is
proposed as *incident* because the harm the register scores is the **loss of
protection**, which requires the mechanism to fail or be missing. Confirm or
flip.

---

## C. Full v4 spine text — current vs proposed

### 1. `executive_summary` — "Executive Summary"

| # | Kind | Current (v3) | Proposed (v4) |
|---|---|---|---|
| 1 | lead | `[DETERMINATION LEAD] One sentence: whether the processing may proceed, may proceed subject to identified measures, or requires prior consultation under Article 36.` | unchanged |
| 2 | skeleton | `Article 35 requires a data protection impact assessment where processing is likely to result in a high risk to the rights and freedoms of natural persons. {organizationName} has indicated that this assessment is required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is {description - own sentence}{VERSION_CLAUSE}{LAUNCH_CLAUSE}.` | unchanged — the first sentence is the `gdpr-art-35` pinpoint (provision_texts-verified wording) and the rest is already in register. |
| 3 | generated | `[GENERATED] Three to four sentences: the risk posture after measures, in counsel's voice; no restatement of the lead.` | unchanged |

### 2. `section_0_overview` — "Section 0 — Overview of the Processing"

New. Proposed blocks:

1. **skeleton** — `This section records the parties to the processing and the terms on which this assessment was carried out. {organizationName} is the controller of the processing assessed here, and the tables below set out the controller, the processors it has engaged, and the planning particulars it has recorded. Where the company has not recorded an entry, the absence is stated rather than filled.`
2. **table** — `processing_inventory.controllers`
3. **table** — `processing_inventory.processors`
4. **table** — `processing_inventory.planning`
5. **skeleton** — `The company has recorded the following particulars of the assessment itself: the reasons it was undertaken, the scope it was given, the materials relied on, and the company's intention as to publication.`
6. **table** — technical sheet (`reasons_to_conduct` labels verbatim, `dpia_scope_note`, `reference_materials`, `publication_intent`)
7. **skeleton** — `The assessment team and the approval record below are taken from the company's own attestation and are reproduced as recorded.`
8. **table** — `assessment_team` (attestation surface)
9. **table** — `validation_approval` (attestation surface)

### 3. `section_1_description` — "Section 1 — Systematic Description of the Processing"

1. **skeleton** — `Article 35(7)(a) requires a systematic description of the processing operations and of the purposes pursued. The description below is drawn from {organizationName}'s own answers: the categories of data it has identified, the purposes it has stated, and any further use it has disclosed.`
2. **table** — `processing_inventory.data_items` (special-category flag column)
3. **table** — `processing_inventory.purposes`
4. **table** — `processing_inventory.secondary_uses`
5. **skeleton** — `On the nature, scope and context of the processing the company has said: {natureScopeContext - attributed verbatim}. It describes the operation functionally as follows: {functionalDescription - attributed verbatim}. The assets supporting the processing are those the company has listed: {supportingAssets - attributed verbatim}.`

### 4. `section_2_analysis` — "Section 2 — Analysis of the Processing"

1. **skeleton** — `This section tests the processing against the obligations that bear on it. Each table states what {organizationName} has recorded, what that establishes, and — where the record does not carry the point — what is still needed. An entry marked as insufficient is a statement about the record, not a finding against the company.`
2. **table** — `legal_basis` (typed surface)
3. **skeleton** — `Where special categories of personal data are processed, Article 9(1) prohibits the processing unless one of the conditions in Article 9(2) applies. The condition the company has selected, and its case for it, are set out below.`
4. **table** — `section2_coverage.special_category_conditions`
5. **table** — `section2_coverage.data_minimisation_retention`
6. **table** — `section2_coverage.data_quality`
7. **table** — `section2_coverage.measures_article5`
8. **table** — `section2_coverage.measures_rights`
9. **skeleton** — `A controller may transfer personal data outside the European Economic Area only where Chapter V is satisfied, and may use a processor only under a contract meeting the requirements of Article 28(3). The company's position on each is below; where no transfer is on the record, that is recorded as a determination rather than left blank.`
10. **table** — `section2_coverage.measures_other` (incl. transfers, Art. 28 row)
11. **table** — `section2_coverage.measures_dpbd`
12. **table** — `section2_coverage.measures_security`

### 5. `section_3_necessity_proportionality` — "Section 3 — Considerations on Necessity and Proportionality"

1. **skeleton** — `Article 35(7)(b) requires an assessment of the necessity and proportionality of the processing in relation to its purposes. The question is not whether the processing is useful to {organizationName}, but whether the same purpose could be achieved by means that intrude less.`
2. **lead** — `composeNecessityLead` (ratified sentence text unchanged)
3. **generated** — `composeNecessityBody` (typed `necessity_findings` / `proportionality`; ratified text unchanged)
4. **skeleton** — `The risks the processing carries by its design — that is, before any failure, deviation or attack is assumed — are set out below.`
5. **table** — §3.1 design-risk table (`risk_class === "design"`)

### 6. `section_4_risk_management` — "Section 4 — Risk Assessment and Management"

1. **skeleton** — `Article 35(7)(c) requires an assessment of the risks to the rights and freedoms of data subjects, and Article 35(7)(d) the measures envisaged to address them. This section takes the risks that arise where the processing does not operate as intended, and then states the company's position on each risk after the measures it has recorded.`
2. **table** — §4.1.1 incident-risk table (`risk_class === "incident"`)
3. **lead** — `composeRiskLead` (unchanged)
4. **table** — `risk_register` (likelihood, severity, residual band, mitigating measures)
5. **generated** — `composeRiskBody` (unchanged)

### 7. `section_5_interested_parties` — "Section 5 — Involvement of Interested Parties"

1. **skeleton** — `Article 35(2) requires the controller to seek the advice of its data protection officer where one is designated, and Article 35(9) requires the views of data subjects or their representatives to be sought where appropriate. {DPO_ADVICE_SENTENCE - conditional: the DPO's advice as recorded, attributed; the negative branch states honestly that DPO advice has not been obtained}. On the views of the people affected, the company has recorded: {dataSubjectsViews - attributed verbatim; absent => the honest negative that no such views were sought}.`

### 8. `section_6_conclusion` — "Section 6 — Conclusion and Decision"

1. **skeleton** — `This section states the determination this assessment reaches, the conditions on which it rests, and the point at which it must be revisited.`
2. **table** — `decision` (determination, conditions, blockers, why)
3. **lead** — `composeSignoffLead` (unchanged)
4. **generated** — `composeSignoffBody` (unchanged)
5. **skeleton** — `{ART36_SENTENCE - from art36_consultation: where the residual risk remains high notwithstanding the measures, Article 36(1) requires the controller to consult the supervisory authority before the processing begins; the negative branch states that no prior consultation is required on this assessment's determination}.`
6. **skeleton** — `Matters still outstanding on the record are listed below. Each is a point this assessment could not determine on the answers given, and each names what would resolve it.`
7. **table** — `gap_ledger`

### 9. `table_of_authorities` — "Table of Authorities"

Rule block carried **byte-identical** from v3.

---

## D. Sections retired from v3

`the_processing`, `lawfulness`, `risks_and_measures`, `consultation_and_signoff`
are replaced by Sections 0–6. Their ratified composer output is re-homed, not
rewritten: necessity → Section 3, risk → Section 4, sign-off → Section 6.
Documents already assembled on spine v3 keep rendering unchanged (`tables` is
optional on the skeleton document type).

---

## E. Held pending approval

Steps 2–5 of PROMPT 8 (assembler `tables`, `risk_class` on `RiskSpec`, web and
PDF renderers, tests, stamp bump) are drafted against this text but **not
committed**. The requested full assembled `skeleton_document` JSON can only be
produced once the approved bytes are in the spine; it will be in the
post-ratification report-back together with the acceptance run.
