# FLEET-WIDE PRODUCT REQUIREMENTS AND GAP ANALYSIS

**Item 297 · docs-only · authored 2026-07-30T23:46Z**
**Authority:** CEO order 2026-07-30 — *before any prompt drafting*, (1) establish what each product being revised is SUPPOSED to include and the analysis it is supposed to do, so there is no mistake about what each product does; then (2) juxtapose each product's current output against those requirements and identify what must change from this point, per product.

**Binding method.**
1. Every requirements claim quotes the governing text VERBATIM from the database corpus — `provision_texts` (CPPA rows, OAL-approved text eff. 2026-01-01) and `gdpr_articles` / `provision_texts` (GDPR rows located per Item 291).
2. Where the corpus does **not** hold the governing text, the requirement is marked **MUST-INGEST** with the official source named. **Nothing in this document is paraphrased from memory.** Chapters resting on absent corpus say so explicitly and state what can and cannot be concluded.
3. Juxtaposition (§D of each chapter) samples the product's **current best output** — the top `overall_score` row in `quality_run_documents` for that tool — and cites the row id. Each named analytic operation is scored **PERFORMS / RECITES / OMITS** with quoted evidence from that row.
4. Chapter template is the controller's cppa-risk model (Chapter 1): **(A)** what the product is for; **(B)** required contents; **(C)** the analytic operations the law demands, named and pinpoint-cited; **(D)** juxtaposition; **(E)** what must change.
5. FOUR-LENS sign-off per chapter — LEGAL (text fidelity), CS (juxtaposition evidence), PROMPT (model-work vs deterministic), PROSE (narrative implications under the CEO's four-part law recorded at Item 295).

**No code, no deploy, no harness invocation, no prompt drafting in this turn.**

---

## Corpus status at authoring time (`provision_texts`, status = approved)

| Key | Citation | Chars | Used by chapter |
|---|---|---|---|
| `cppa-7150` | 11 CCR § 7150 | 4,346 | 1 |
| `cppa-7151` | 11 CCR § 7151 | 1,096 | 1 |
| `cppa-7152` | 11 CCR § 7152 | 8,051 | 1 |
| `cppa-7153` | 11 CCR § 7153 | 638 | 1 |
| `cppa-7154` | 11 CCR § 7154 | 388 | 1 |
| `cppa-7155` | 11 CCR § 7155 | 2,359 | 1 |
| `cppa-7156` | 11 CCR § 7156 | 2,485 | 1 |
| `cppa-7157` | 11 CCR § 7157 | 3,411 | 1 |
| `cppa-7120` | 11 CCR § 7120 | 1,075 | 2 |
| `cppa-7121` | 11 CCR § 7121 | 1,718 | 2 |
| `cppa-7220` | 11 CCR § 7220 | 7,655 | 3 |
| `cppa-7221` | 11 CCR § 7221 | 8,989 | 3 |
| `cppa-7001` | 11 CCR § 7001 (bbb),(ddd) | 3,440 | 3 |
| `ccpa-1798-140` | Cal. Civ. Code § 1798.140 | 2,469 | 2, 3 |
| `gdpr-art-35` / `gdpr_articles(eu,'35')` | GDPR Art. 35 | 4,410 | 6 |
| `gdpr-art-6-1-f` + `gdpr-recital-47` | Art. 6(1)(f), Recital 47 | 458 / 1,656 | 7 |
| `gdpr_articles(eu,'33')`, `(eu,'34')` | Arts. 33, 34 | 1,734 / 1,649 | 8 |
| `gdpr_articles(eu,'5')`, `(eu,'24')`, `(eu,'30')`, `(eu,'37')`, `(eu,'39')` | Arts. 5, 24, 30, 37, 39 | 1,977 / 861 / 2,907 / 1,989 / 1,325 | 9 |

**ABSENT from corpus (MUST-INGEST):** `cppa-7122`, `cppa-7123`, `cppa-7124` (cybersecurity-audit scope/components/report — flagged in Item 282); `cppa-7200`, `cppa-7222` (rows exist but `status='pending'`, `verbatim_excerpt` empty); BIPA 740 ILCS 14; Tex. Bus. & Com. Code § 503.001 (CUBI); Wash. RCW 19.375; every data-broker registration statute (Chapter 4 has **no registry at all**).

**Item 291 carry-over (incorporated):** the GDPR corpus is materially complete (99 EU articles, 173 recitals) with two **P0 truncation defects** — `gdpr-art-34` is 1,649 chars vs CELEX 1,718 (**69 chars short**, hits Chapter 8) and `gdpr-art-22` is 1,289 vs 1,314 (**25 chars short**, hits Chapters 3 and 6). Both must be repaired before any chapter-driven prompt work quotes those articles.

---

# CHAPTER 1 — cppa-risk (11 CCR §§ 7150–7157)

*This is the template chapter. The controller's five-operation analysis is reproduced and verified against the corpus rows below.*

## (A) What the product is for

§ 7152(a), verbatim:

> "A business must conduct a risk assessment to determine whether the risks to consumers' privacy from the processing of personal information outweigh the benefits to the consumer, the business, other stakeholders, and the public from that same processing."

§ 7154(a), verbatim:

> "The goal of a risk assessment is restricting or prohibiting the processing of personal information if the risks to privacy of the consumer outweigh the benefits resulting from processing to the consumer, the business, other stakeholders, and the public."

**Operative reading (LEGAL lens).** The deliverable is a **determination**, and the determination has an **operative consequence**: restriction or prohibition of the processing. A document that describes a business's processing without reaching — and justifying — an outweigh/not-outweigh conclusion is not the artifact the regulation names.

## (B) Required contents — § 7152(a)(1)–(9)

Enumerated verbatim in the corpus row: (1) non-generic **purpose** ("The purpose must not be identified or described in generic terms, such as 'to improve our services' or for 'security purposes.'"); (2) **categories of PI including sensitive PI**, and "the minimum personal information that is necessary to achieve the purpose"; (3) **operational elements** (A) method/sources, (B) retention period or criteria, (C) method of interacting with consumers, (D) approximate number of consumers, (E) disclosures made, (F) names/categories of service providers, contractors, third parties and the purpose of disclosure, (G) for § 7150(b)(3) ADMT uses, "(i) The logic of the ADMT, including any assumptions or limitations of the logic; and (ii) The output of the ADMT, and how the business will use the output to make a significant decision"; (4) **benefits** to business/consumer/stakeholders/public, non-generic; (5) **negative impacts** — "The business must identify the sources and causes of these negative impacts" — with the (A)–(H) catalogue (unauthorized access; discrimination; impairing control; coercion; economic; physical; reputational; psychological); (6) **safeguards** "such as safeguards to address the negative impacts identified in subsection (a)(5)"; (7) **whether it will initiate the processing**; (8) **who provided the information**; (9) **date reviewed/approved and names and positions**, where "An individual who has the authority to participate in deciding whether the business will initiate the processing … must review and approve the assessment."

Scope trigger set — § 7150(b)(1)–(6), verbatim in corpus (selling/sharing; sensitive PI with the employment-administration carve-out at (b)(2)(A); ADMT for a significant decision; systematic-observation inference in the work/education context; sensitive-location inference; training-data uses). Timing — § 7155(a)(1) "before initiating"; (a)(2) "At least once every three years"; (a)(3) material change "no later than 45 calendar days"; (c) retention "five years after the completion". Submission — § 7157(a)(1) "no later than April 1, 2028". Comparable sets and cross-law reuse — § 7156(a)–(b). ADMT-provider fact duty — § 7153(a).

## (C) The analytic operations the law demands (five, each pinpoint-cited)

| # | Operation | Pinpoint | Why it is an *operation*, not a field |
|---|---|---|---|
| **1** | **Necessity analysis** | § 7152(a)(2) — "the minimum personal information that is necessary to achieve the purpose" | Requires comparing the data actually processed against the least set that achieves the stated purpose, and saying which elements fail that test |
| **2** | **Causal analysis of harms** | § 7152(a)(5) — "The business must identify the sources and causes of these negative impacts" | Requires a causal chain (this data + this actor + this pathway → this harm from the (A)–(H) catalogue), not a harm list |
| **3** | **Safeguard-to-harm mitigation mapping with residual risk** | § 7152(a)(6) — "safeguards to address the negative impacts identified in subsection (a)(5)" | The cross-reference makes each safeguard answerable to a specific (a)(5) impact; what remains unmitigated is the residual |
| **4** | **The weighing determination** | § 7152(a) chapeau + § 7154(a) | Risks vs benefits *to four named beneficiary classes*, argued both directions, ending in outweigh / does-not-outweigh |
| **5** | **The consequence / initiation decision** | § 7152(a)(7) + § 7154(a) | The document must state whether processing will be initiated, and where risks outweigh, what is restricted or prohibited — with modifications tied to the specific risks that drove them |

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 43c17b1c-dbb7-467a-ad99-fc98e352cbac` (tool `cppa-risk`, `overall_score` 93 — the fleet-best cppa-risk document). Report keys present: `scope_and_triggers`, `risk_assessment_by_activity`, `assessment_summary`, `exception_analysis`, `priority_actions`, `record_sufficiency`, `information_needed`, `open_items`, `deterministic_checks`, `enforcement_context`, `cross_tool_recommendations`.

| Operation | Verdict | Quoted evidence from row `43c17b1c…` |
|---|---|---|
| 1 Necessity | **RECITES** | The `purpose` field restates the record's five purposes and then grades their drafting — "These formulations substantially satisfy § 7152(a)(1) specificity for purposes (1)–(3) and (5)." No comparison of processed data against a minimum-necessary set anywhere in the activity object. |
| 2 Causal harms | **OMITS** | No sources-and-causes chain appears. Harm language is absent from the sampled activity object; the nearest content is a deficiency list, not an impact analysis. |
| 3 Safeguard→harm mapping | **RECITES** | `safeguard_gaps` lists five deficiencies — e.g. "(3) Vendor security assessments for Acxiom and LexisNexis Risk Solutions are overdue by approximately 8 months" — each tied to a *compliance element*, none tied to an (a)(5) negative impact, and no residual-risk statement. |
| 4 Weighing | **OMITS** | The sampled output contains no risks-vs-benefits comparison to the four beneficiary classes. Consistent with the Item 295 CEO read: "the balancing section is one paragraph with the FSOR sentence repeated 9×/8×". |
| 5 Consequence/initiation | **OMITS** | The document self-describes documentation duties ("the record does not document planned safeguards as a discrete § 7152(a)(6) element; that documentation is required") but reaches no initiate / restrict / prohibit decision under § 7152(a)(7). |

**Score: 0 of 5 PERFORMED, 2 RECITED, 3 OMITTED — on the best document the tool has produced.** This is the empirical form of the Item 295 finding: no stage of the pipeline is assigned analysis.

## (E) What must change

1. **Intake additions** — minimum-necessary candidate set per data category (predicate for Op. 1); benefit statements per beneficiary class (business / consumer / other stakeholders / public — predicate for Op. 4, currently unaskable); harm-pathway prompts keyed to the § 7152(a)(5)(A)–(H) catalogue (predicate for Op. 2); § 7152(a)(9) approver name/position (required content, currently unasked).
2. **Registry work** — an (a)(5)(A)–(H) harm taxonomy registry with the verbatim statutory phrasing per branch, so Op. 2 selects from the enumerated catalogue rather than inventing harm names.
3. **Analytic deliverables (new, structured)** — `necessity_analysis[]` (element → purpose → verdict → why), `harm_causation[]` (data + actor + pathway → catalogue harm), `safeguard_map[]` (safeguard → harm id → residual), `weighing[]` (one record per beneficiary class, both directions, with a determination), `consequence` (initiate / initiate-with-modifications / restrict / prohibit + the risk each modification answers, § 7152(a)(7)).
4. **Narrative parts** — under the CEO's four-part law: Part 1 customer overview (absent today per Item 295); Part 2 the five operations narrated as reasoning; Part 3 missing information and next steps (today's `information_needed` already feeds this); Part 4 the determination plus what would change it.
5. **Corpus** — no new ingestion required for this chapter: §§ 7150–7157 are all approved.

## FOUR-LENS SIGN-OFF — Chapter 1

- **LEGAL:** All quotes diffed against `provision_texts` rows `cppa-7150`/`7152`/`7154`/`7155`. Fidelity confirmed. § 7154's "restricting or prohibiting" is the operative consequence and must not be softened to "consider".
- **CS:** Every juxtaposition claim carries row `43c17b1c-dbb7-467a-ad99-fc98e352cbac`. Sample is the top-scored document of 269 cppa-risk rows.
- **PROMPT:** Ops. 1–4 are model-work under a grounded-analytic-notes contract; Op. 5 is **deterministic** (a decision function over the weighing records) and must not be delegated to the model. Scope triggers (§ 7150(b)) and all § 7155/§ 7157 dates stay deterministic.
- **PROSE:** The weighing must be narrated once, per beneficiary class, in argued form; the repeated-sentence defect is a symptom of having no per-class content to narrate, and disappears only when Op. 4 produces distinct records.

---

# CHAPTER 2 — cppa-cyber (11 CCR §§ 7120–7124) — **CHAPTER CANNOT BE FINALIZED**

## (A) What the product is for — *what the corpus supports*

§ 7120(a), verbatim:

> "Every business whose processing of consumers' personal information presents significant risk to consumers' security as set forth in subsection (b) must complete a cybersecurity audit."

§ 7120(b) sets the trigger verbatim: the § 1798.140(d)(1)(C) revenue prong, **or** the (d)(1)(A) prong **and** "Processed the personal information of 250,000 or more consumers or households in the preceding calendar year" **or** "Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year."

§ 7121(a) sets the deadlines verbatim (April 1 2028 / 2029 / 2030 by revenue cohort) and § 7121(b) the steady-state annual cycle.

## (B) Required contents — **NOT IN CORPUS**

**MUST-INGEST.** §§ 7122 (auditor independence/qualification), 7123 (audit components), and 7124 (audit report contents/certification) are **absent from `provision_texts`** — confirmed at authoring time and previously flagged in Item 282. Official source to ingest: *California Privacy Protection Agency — Text of Regulations (CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations), OAL-approved, effective 2026-01-01*, the same PDF from which §§ 7120/7121/7150–7157 were extracted verbatim.

**What can be concluded today:** the *trigger* determination and the *deadline* determination are fully supported by corpus and can be stated as law.
**What cannot be concluded today:** the enumerated audit components, the required report contents, the auditor-independence conditions, and therefore **the entire (C) operation set** for this product. Any component list the product uses today (including its 18-control model) is **not corpus-grounded** and must be treated as unverified until §§ 7122–7124 are ingested.

## (C) Analytic operations — **DEFERRED pending ingestion**

Provisionally, the operations the audit-readiness product will owe, each to be re-cited to § 7123/§ 7124 once ingested: (i) applicability determination (§ 7120(b) — supported now); (ii) cohort/deadline determination (§ 7121 — supported now); (iii) component-coverage determination; (iv) evidence-sufficiency analysis per component (can the auditor assess it on the retained record?); (v) readiness conclusion with the remediation sequence tied to the audit date. Operations (iii)–(v) carry **no pinpoint citation** until the ingest lands and are therefore **not authorized as requirements** in this document.

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 8611dfda-ecc9-4fc7-80f8-3f79ad20bf4e` (tool `cppa-cyber`, `overall_score` 94.7 — fleet-best score of any product).

- **Cites uningested provisions as if grounded.** `top_risks[0].deadline`: *"Prior to independent audit engagement — retention of separated artifact sets must be in place before the auditor begins fieldwork under 11 CCR § 7122."* And `description`: *"Because 11 CCR § 7123(c) treats cybersecurity awareness and cybersecurity education and training as independent components…"* — **§ 7122 and § 7123(c) are not in the corpus.** These are the highest-risk statements in the fleet: pinpoint citations to text the system has never verified. **Verdict: FAILS the verify-first law**, independent of the analysis question.
- **Scoring is arithmetic presented as assessment.** `executive_summary`: *"Mean of 93 across the 18 scored components (excluding 0 Insufficient-information components) across the 18 scored components (excluding 0 Insufficient-information components)."* — a duplicated clause, and a mean is not an audit-readiness determination.
- **All-mature, no-risk output still emits three "risks."** *"All 18 components are assessed as Mature… No controls carry a Gap, Partial, or Critical Gap status; accordingly, no priority remediation items are required"* — followed by three documentation-hygiene items in `top_risks`. The product has no way to conclude "ready" cleanly.

**Verdicts:** applicability **PERFORMS** (deterministic, corpus-backed); deadline **PERFORMS**; component coverage **RECITES** against an unverified component list; evidence sufficiency **RECITES**; readiness conclusion **OMITS** (a mean replaces a determination).

## (E) What must change

1. **Corpus first — blocking.** Ingest §§ 7122, 7123, 7124 verbatim from the OAL-approved regulation text. **Until then, freeze all § 7122–7124 pinpoint citations in output** and degrade to § 7120/§ 7121 statements only.
2. **Re-derive the component model** from § 7123 once ingested; retire or re-key any of the 18 controls that do not map to an enumerated component.
3. **Readiness determination** replaces the mean: a stated conclusion (audit-ready / ready-with-remediation / not-ready by the § 7121 cohort date) with the evidence deficit that drives it.
4. **De-duplicate the summary serializer** (the doubled clause above is an emit-layer defect, not a content defect).
5. **Intake:** per-component evidence artifact typing already exists (Turn-3 `controls[].evidence`); add auditor-engagement status and prior-audit scope once § 7122 is read.

## FOUR-LENS SIGN-OFF — Chapter 2

- **LEGAL:** § 7120/§ 7121 quotes diffed against corpus. §§ 7122–7124 **NOT AVAILABLE** — this chapter is explicitly incomplete and no requirement is stated from memory.
- **CS:** Evidence row `8611dfda-ecc9-4fc7-80f8-3f79ad20bf4e`; the two uncorpused pinpoints are quoted verbatim from that row.
- **PROMPT:** Applicability and cohort dates are deterministic. Component analysis cannot be prompt-drafted before ingestion — attempting it would encode memory as law.
- **PROSE:** The four-part narration is authorable for Parts 1/3 today; Parts 2/4 wait on § 7123.

---

# CHAPTER 3 — cppa-admt (11 CCR §§ 7220–7221, § 7001(ddd))

## (A) What the product is for

§ 7220(a), verbatim:

> "A business that uses ADMT as set forth in section 7200, subsection (a), must provide consumers with a Pre-use Notice. The Pre-use Notice must inform consumers about the business's use of ADMT and consumers' rights to opt-out of ADMT and to access ADMT, as set forth in this section."

§ 7221(a), verbatim:

> "A business must provide consumers with the ability to opt-out of the use of ADMT to make a significant decision concerning the consumer, except as set forth in subsection (b)."

**Note:** `cppa-7200` is a `pending` row (empty excerpt) — the § 7200(a) trigger clause referenced by § 7220(a) is **MUST-INGEST** (same OAL source). The significant-decision definition sits in `cppa-7001` (ddd), which **is** approved.

## (B) Required contents

Pre-use Notice — § 7220(b): "(1) Comply with section 7003, subsections (a)–(b). (2) Be presented prominently and conspicuously to the consumer at or before the point when the business collects the consumer's personal information that the business plans to process using ADMT… (3) Be presented in the manner in which the business primarily interacts with the consumer." Contents — § 7220(c)(1)–(5): plain-language **specific** purpose (expressly not "to make a significant decision" without more); the opt-out right and how to submit, with (c)(2)(A) the human-appeal substitute and (c)(2)(B) the duty to "identify the specific exception it is relying upon"; the access right and how to submit; the non-retaliation statement; and "Additional information about how the ADMT works to make a significant decision about consumers, and how the significant decision would be made if a consumer opts out."

Opt-out exceptions — § 7221(b)(1) human appeal, which requires the business to "Designate a human reviewer to review and analyze the output of the ADMT and any other information that is relevant to change the significant decision at issue", the reviewer to "know how to interpret and use the output" and "have the authority to change the decision", and the appeal method to be "easy for the consumers to execute, require minimal steps"; § 7221(b)(2) admission/acceptance/hiring, requiring both "(A) The business uses the ADMT solely for the business's assessment of the consumer's ability to perform at work or in an educational program…" and "(B) The ADMT works for the business's purpose and does not unlawfully discriminate based upon protected characteristics."

## (C) The analytic operations

| # | Operation | Pinpoint |
|---|---|---|
| 1 | **Significant-decision characterisation** — is the output a decision within § 7001(ddd)? | § 7001(ddd); § 7220(a) |
| 2 | **Notice-adequacy analysis** — each § 7220(c)(1)–(5) element measured against what the business actually publishes, including the specificity bar in (c)(1) | § 7220(b)–(c) |
| 3 | **Exception qualification analysis** — does the claimed exception actually hold on the facts, element by element (reviewer authority, appeal ease, sole-use, non-discrimination)? | § 7221(b)(1)(A)–(B), (b)(2)(A)–(B) |
| 4 | **Opt-out mechanism analysis** — is the offered mechanism the one § 7221(a) requires, or an obstructed variant? | § 7221(a) |
| 5 | **Consequence determination** — what the business must stop, add, or change before use continues | § 7220(a) + § 7221(a) |

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = fdc773f6-9f08-4b3b-8e01-adae493f4d40` (tool `cppa-admt`, `overall_score` 93; twelve rows tie at 93 — this is the earliest).

- **Op. 1 — PERFORMS (the strongest analytic behaviour in the fleet).** `scope_analysis.summary`: *"The CreditIQ Decisioning Engine is ADMT within the meaning of the definitional provision: it uses a gradient-boosted ML classifier to replace or substantially replace human decisionmaking in consumer credit underwriting… The described human review does not qualify as sufficient human involvement because reviewers cannot override the output"* — fact → legal meaning → conclusion, and it reaches an adverse finding on the human-involvement element. **This is the model the other eight products should be measured against.**
- **Op. 4 — PERFORMS.** `priority_actions[1]`: *"Remove the account-creation requirement from the online opt-out form. The opt-out provision prohibits requiring consumers to create an account to submit an opt-out request."* Applied, not recited.
- **Op. 2 — RECITES.** Notice findings are carried as `notice_gaps` / `consolidated_notice_analysis` element lists; the (c)(1) specificity bar is asserted rather than tested against published notice text (which intake does not capture).
- **Op. 3 — RECITES.** Exceptions are reported as status, not qualified element-by-element against § 7221(b)(1)(A)–(B).
- **Op. 5 — RECITES.** `priority_actions[0]` leads with enforcement exposure — *"exposes Vantara to CPPA administrative enforcement under Cal. Civ. Code § 1798.155 (per-violation penalties …) and — for continuing violations — daily accrual until remediation is documented"* — a consequence *of non-compliance*, not the § 7220/§ 7221 determination of what may lawfully continue.

## (E) What must change

1. **Intake:** the published pre-use notice text (or a structured transcription) — without it, Op. 2 cannot be performed, only asserted; human-reviewer authority/competence attestations and the appeal-flow step count (Op. 3); the sole-use and non-discrimination evidence for § 7221(b)(2).
2. **Registry:** a § 7220(c)(1)–(5) element registry and a § 7221(b) exception-element registry, each carrying the verbatim condition text, so Op. 3 walks conditions rather than labels.
3. **Analytic deliverables:** `notice_element_findings[]` (element → published text → verdict), `exception_qualification[]` (exception → condition → satisfied/not → why), and a `determination` object separating "what is unlawful now" from "what is exposure".
4. **Narrative:** promote the Op.-1 reasoning style to Ops. 2–5; today only scope reasons.
5. **Corpus:** ingest § 7200 and § 7222 verbatim; repair the `gdpr-art-22` truncation (Item 291 P0) before any EU-side ADMT cross-reference is quoted.

## FOUR-LENS SIGN-OFF — Chapter 3

- **LEGAL:** § 7220/§ 7221 quotes diffed against corpus rows. § 7200 pending — do not quote it.
- **CS:** Row `fdc773f6-9f08-4b3b-8e01-adae493f4d40`; twelve-way score tie noted so the sample is not represented as uniquely best.
- **PROMPT:** Ops. 1–3 are model-work; Op. 4 (mechanism obstruction checks) and Op. 5 dates/deadlines are deterministic.
- **PROSE:** ADMT already narrates a conclusion in Part-2 form; the fleet's four-part law should be calibrated against this chapter's `scope_analysis.summary`.

---

# CHAPTER 4 — registration — **NO REGISTRY EXISTS; PREDICATE WORK REQUIRED**

## (A) What the product is for

**Cannot be stated from corpus.** There is **no registration statute in `provision_texts` and none in `gdpr_articles`**. The product currently reasons from `src/data/registration_jurisdictions.ts` and the engine's rule set — a hand-authored table with **no verbatim statutory backing**. Per the binding method, this chapter states no requirement from memory.

**Predicate (blocking):** author a registration registry on the pattern of the risk/cyber/ADMT verified-authority registries, each row carrying the verbatim operative sentence and an official source URL. Statutes to ingest, drawn from what the loop2 corrections cite: California data-broker registration (Cal. Civ. Code § 1798.99.80 et seq., Delete Act); Vermont data-broker registration (9 V.S.A. § 2446); Texas data-broker registration (Tex. Bus. & Com. Code ch. 509); Oregon data-broker registration (ORS 646A.594); GDPR Art. 27 EU representative and UK GDPR Art. 27 (both **already in corpus** — `gdpr:eu:27`, `gdpr:uk:27` per the shared legal-text assertions); GDPR Arts. 37–39 DPO designation (in corpus, Chapter 9); EU AI Act provider/deployer registration duties (Reg. (EU) 2024/1689 Arts. 16, 26, 49, 71) — **not in corpus**.

## (B)/(C) Required contents and analytic operations — **DEFERRED**

Not authorable before the registry lands. What is structurally visible: the product owes a **registration-obligation determination per jurisdiction** (registrable / not registrable / conditional), a **threshold analysis** against each statute's own definition, a **deadline and fee determination**, and a **filing-content readiness** statement. None of these may be pinned to a citation today.

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 2ce38547-7629-4567-a7f8-5d33d54d53ba` (tool `registration`, `overall_score` 93.5).

- `obligations_summary` is entirely boolean/null: `{"dpo_trigger": null, "dpo_required": false, "dpo_condition": null, "data_broker_registrations": [], "gpai_provider_obligations": false, "ai_act_obligations_engaged": false, "eu_representative_required": false, "uk_representative_required": false, "ai_act_provider_obligations": false, "high_risk_ai_deployer_obligations": false}` — **flags, no analysis, no citation on any flag.**
- `confidence_reasons` measures *intake completeness*, not legal reasoning: `["home jurisdiction provided", "org size provided", "employee count provided", "industry provided", "controller/processor role provided", "1 markets specified", "processing scope confirmed"]`.
- **Verdicts:** determination **RECITES** (a boolean is a conclusion without reasoning); threshold analysis **OMITS**; deadline/fee **OMITS**; filing readiness **OMITS**. The 93.5 score is the clearest evidence in this document that the grader rewards shape over analysis.

## (E) What must change

1. **Registry authoring is the predicate** — no prompt work until each obligation flag can name a verbatim statutory threshold.
2. **Every boolean gains a reasoned record:** flag → statute row → threshold text → the record facts measured against it → verdict → deadline.
3. **Intake:** the counts each statute's threshold actually uses (consumer counts, revenue, brokered-data indicators) rather than generic size bands.
4. **Narrative:** the product currently emits no prose at all; the four-part law requires at minimum a Part-1 overview and a Part-4 determination.
5. **Grader:** flag-only output scoring 93.5 is a grader defect to be raised alongside Item 295.

## FOUR-LENS SIGN-OFF — Chapter 4

- **LEGAL:** No statutory text quoted because none is in corpus. Chapter is explicitly a predicate-work chapter.
- **CS:** Row `2ce38547-7629-4567-a7f8-5d33d54d53ba`; `obligations_summary` and `confidence_reasons` quoted in full.
- **PROMPT:** Threshold matching is deterministic once the registry exists; only the marginal/conditional cases are model-work.
- **PROSE:** Highest narrative debt in the fleet — this product has no prose surface at all.

---

# CHAPTER 5 — biometric (BIPA / CUBI / RCW 19.375) — **CORPUS ABSENT**

## (A) What the product is for

**MUST-INGEST — no biometric statute is in `provision_texts`.** Official sources to ingest verbatim: **740 ILCS 14** (Illinois Biometric Information Privacy Act) §§ 10, 15(a)–(e), 20, via the Illinois General Assembly official text; **Tex. Bus. & Com. Code § 503.001** (CUBI) via Texas Statutes; **Wash. Rev. Code ch. 19.375** (Washington biometric identifiers) via the Washington State Legislature RCW site.

**The RCW 19.373 conflation question — flagged, unresolved.** RCW **19.375** is the biometric-identifiers chapter; RCW **19.373** is a different chapter. Any product text citing 19.373 for biometric duties is miscited. This cannot be adjudicated from corpus because **neither chapter is ingested**; the ingest task must capture both chapter headings so the resolution is textual, not editorial.

## (B)/(C) Required contents and operations — **DEFERRED, structure only**

The four duty families the product is organised around — notice, written release/consent, retention schedule, destruction — plus a private-right-of-action exposure statement, cannot be quoted today. Provisional operation set to be re-cited after ingest: (i) entity/actor characterisation (private entity? employer? processor?); (ii) identifier characterisation (is the data a biometric identifier under each statute's own definition — the definitions differ materially across the three states); (iii) per-duty satisfaction analysis on the record facts; (iv) multi-state divergence analysis (what Illinois requires that Texas does not, and vice versa); (v) consequence determination including PRA exposure.

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = acd8ac66-64da-4dcb-89b4-ef73be5bed24` (tool `biometric-checker`, `overall_score` 93).

- Output is a **requirements digest keyed to the intake**, not an assessment: *"Applies to this organisation: Conditional — Employer (employee biometrics) organisation processing Fingerprint / palm print, Facial geometry / facial recognition for the stated purpose: Time & attendance / workforce management."*
- Followed by an enumerated restatement of the statute: *"1. Section 15(a): written, publicly available retention and destruction policy before or at the time of collection. 2. Section 15(b): inform the subject in writing of the specific purpose and duration of collection; obtain a written release…"* — **paraphrased section content, not verbatim corpus text**, which is exactly the failure mode the verify-first law exists to prevent.
- **Verdicts:** entity characterisation **RECITES** (echoes the intake label); identifier characterisation **OMITS**; per-duty satisfaction **OMITS** (the record's actual practices are never measured against 15(a)–(e)); divergence **OMITS**; consequence **OMITS**.

## (E) What must change

1. **Ingest all three statutes verbatim** (blocking) and resolve 19.373 vs 19.375 textually.
2. **Replace paraphrase with corpus quotes** in every requirement sentence.
3. **Intake:** the organisation's actual retention schedule text, release/consent artifact, destruction trigger, and disclosure recipients — today the product asks what it processes but not what it *does about it*, which is why per-duty analysis is structurally impossible.
4. **Analytic deliverables:** `duty_findings[]` (statute → duty → record fact → satisfied/not/unknown), `divergence[]`, `exposure` (PRA statutory-damages posture per state).
5. **Narrative:** Part-2 analysis currently does not exist; the document is a digest with a cover line.

## FOUR-LENS SIGN-OFF — Chapter 5

- **LEGAL:** No verbatim biometric text available; every statutory sentence in the current product is unverified paraphrase. Chapter finalization blocked on ingest.
- **CS:** Row `acd8ac66-64da-4dcb-89b4-ef73be5bed24` quoted directly.
- **PROMPT:** Identifier characterisation and divergence are model-work; applicability triggers are deterministic once definitions are ingested.
- **PROSE:** Digest form must become assessment form; the "Key requirements for X using Y" heading pattern is the recitation tell.

---

# CHAPTER 6 — dpia (GDPR Art. 35) — closest analog to Chapter 1

## (A) What the product is for

Art. 35(1), verbatim from `gdpr_articles(eu,'35')`:

> "Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data. A single assessment may address a set of similar processing operations that present similar high risks."

## (B) Required contents — Art. 35(7), verbatim

> "The assessment shall contain at least: (a) a systematic description of the envisaged processing operations and the purposes of the processing, including, where applicable, the legitimate interest pursued by the controller; (b) an assessment of the necessity and proportionality of the processing operations in relation to the purposes; (c) an assessment of the risks to the rights and freedoms of data subjects referred to in paragraph 1; and (d) the measures envisaged to address the risks, including safeguards, security measures and mechanisms to ensure the protection of personal data and to demonstrate compliance with this Regulation taking into account the rights and legitimate interests of data subjects and other persons concerned."

Plus: Art. 35(2) "The controller shall seek the advice of the data protection officer, where designated"; Art. 35(3)(a)–(c) mandatory-DPIA cases; Art. 35(9) "Where appropriate, the controller shall seek the views of data subjects or their representatives"; Art. 35(11) review "at least when there is a change of the risk represented by processing operations."

## (C) The analytic operations

| # | Operation | Pinpoint |
|---|---|---|
| 1 | **Threshold determination** — likely to result in high risk, on nature/scope/context/purposes | Art. 35(1), (3)(a)–(c) |
| 2 | **Necessity assessment** — effective and least-intrusive means for the purpose | Art. 35(7)(b) (first limb) |
| 3 | **Proportionality assessment** — benefits against impacts on rights and freedoms, *distinct from necessity* | Art. 35(7)(b) (second limb) |
| 4 | **Risk assessment to rights and freedoms** — likelihood × severity per risk | Art. 35(7)(c) |
| 5 | **Measures/residual determination** — measures envisaged to address the risks, and what risk remains | Art. 35(7)(d); Art. 36(1) if high risk remains |

Note the mapping: Art. 35(7) is the GDPR analog of § 7152(a), and operations 2–5 are the same shape as Chapter 1's operations 1–4 — which is why the CEO named this the closest analog.

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 43f4d436-1c68-4f90-ba82-1b7b9df2aea6` (tool `dpia`, `overall_score` 92). Sections `section_0_overview` … `section_6_conclusion` present, i.e. **the container for all five operations already exists** — the deficit is content, not structure.

- **The product states the test correctly and then does not run it.** `section_3_necessity_proportionality.guidance_note`: *"The necessity assessment asks whether the processing is both effective and the least intrusive option capable of achieving the purpose. Proportionality asks whether the benefits of the processing, assessed against those necessity findings, outweigh the impacts on data subjects' rights and freedoms — necessity is a precondition for any proportionality finding."* — an accurate statement of Ops. 2 and 3, addressed to the reader as instruction.
- **The section's body is a task list, not an assessment.** `completion_guidance`: *"1. SECONDARY RESEARCH — LEGAL BASIS AND LIA: Article 6(1)(f) requires a completed Legitimate Interest Assessment… The organisation must either finalise the LIA before any research data transfer… or switch to a consent-based mechanism"*; *"3. LOCATION DATA — NECESSITY VERIFICATION: The organisation must confirm whether city-level GPS data is ingested and stored continuously … If continuous ingestion is confirmed, a documented alternatives assessment must address whether episodic location capture on threshold-trigger would satisfy the emergency-d[etection purpose]"*.
- **This is the single clearest instance of the Item 295 defect in the fleet:** item 3 *identifies the exact necessity comparison to run* (continuous GPS vs episodic trigger capture) **and assigns it to the customer** instead of performing it. The record contains the facts needed to at least frame both sides.
- **Verdicts:** Op. 1 **PERFORMS** (Art. 35(3) triggers are determined); Op. 2 **RECITES** (defines and delegates); Op. 3 **OMITS** (no benefits-vs-impacts weighing appears); Op. 4 **RECITES** (register exists in `section_4_risk_management`, populated as design-risk descriptions); Op. 5 **RECITES** (measures listed as required actions, no residual determination and no Art. 36 consideration).

## (E) What must change

1. **Convert `completion_guidance` items into performed analysis**: each item that names a comparison must produce a verdict on the record facts, with the unknown stated as a confidence qualifier — not deferred wholesale to the customer. What genuinely cannot be resolved moves to Part 3 (missing information), not into the analysis section.
2. **Split necessity and proportionality into two deliverables** — the guidance_note already says they are distinct tests; the output merges them.
3. **Analytic deliverables:** `necessity_findings[]` (purpose → alternatives considered → least-intrusive verdict), `proportionality[]` (benefit vs impact, argued both directions), `risk_register[]` with likelihood/severity/residual, `art36_consultation` determination.
4. **Intake:** the alternatives actually considered and rejected (Op. 2 is unanswerable without them); Art. 35(9) data-subject views status; DPO advice text (Art. 35(2)).
5. **Corpus:** Art. 35 is complete and approved. Repair `gdpr-art-22` (Item 291 P0) before DPIA quotes Art. 22 in profiling cases.

## FOUR-LENS SIGN-OFF — Chapter 6

- **LEGAL:** Art. 35(1) and 35(7)(a)–(d) diffed against `gdpr_articles(eu,'35')` (4,410 chars). Fidelity confirmed.
- **CS:** Row `43f4d436-1c68-4f90-ba82-1b7b9df2aea6`; both quotes taken from `section_3_necessity_proportionality`.
- **PROMPT:** Ops. 2–4 are model-work; Op. 1 (Art. 35(3) triggers) and the Art. 36 consultation rule are deterministic.
- **PROSE:** The "guidance_note → completion_guidance" pair is a *textbook-plus-homework* pattern. Under the four-part law, guidance_note content belongs in Part 1 framing at most, and Part 2 must carry the performed comparison.

---

# CHAPTER 7 — lia (Art. 6(1)(f) + Recital 47)

## (A) What the product is for

Art. 6(1)(f), verbatim from `provision_texts` (`gdpr-art-6-1-f`):

> "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child. Point (f) of the first subparagraph shall not apply to processing carried out by public authorities in the performance of their tasks."

Recital 47, verbatim (`gdpr-recital-47`), supplies the balancing standard:

> "…provided that the interests or the fundamental rights and freedoms of the data subject are not overriding, taking into consideration the reasonable expectations of data subjects based on their relationship with the controller… At any rate the existence of a legitimate interest would need careful assessment including whether a data subject can reasonably expect at the time and in the context of the collection of the personal data that processing for that purpose may take place. The interests and fundamental rights of the data subject could in particular override the interest of the data controller where personal data are processed in circumstances where data subjects do not reasonably expect further processing."

**The three-part test *is* the product.** Unlike every other chapter, there is no separable "document" deliverable — the analysis is the artifact.

## (B) Required contents

Derived directly from the operative text: (i) the identified interest and its holder ("pursued by the controller or by a third party"); (ii) the necessity link ("processing is necessary for the purposes of"); (iii) the override analysis against "the interests or fundamental rights and freedoms of the data subject", with the child factor called out expressly; (iv) the reasonable-expectations finding required by Recital 47's "careful assessment"; (v) the public-authority exclusion determination (second subparagraph).

## (C) The analytic operations

| # | Operation | Pinpoint |
|---|---|---|
| 1 | **Legitimacy** — is the asserted interest lawful, articulated, real and present | Art. 6(1)(f) "legitimate interests pursued"; Recital 47 "careful assessment" |
| 2 | **Necessity** — is processing necessary for that interest, or would a less intrusive means serve | Art. 6(1)(f) "is necessary for the purposes of" |
| 3 | **Balancing / override** — do data-subject interests and fundamental rights override, argued both directions | Art. 6(1)(f) "except where such interests are overridden…" |
| 4 | **Reasonable-expectations finding** — at the time and in the context of collection | Recital 47 |
| 5 | **Determination + mitigations** — pass/fail, and what would change the outcome | Art. 6(1)(f) chapeau; Recital 47 override sentence |

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 3c33c04e-a1d3-4378-8e79-27f9ab40b23e` (tool `lia`, `overall_score` 93).

- **Op. 1 — PERFORMS, and reaches an adverse verdict.** `three_part_test.purpose_test`: `"verdict": "fails"`, with reasoning: *"Clickstream Media Inc. asserts a commercial interest in audience monetisation and advertising revenue, which is a real and present economic interest. However, the critical weakness at this step is lawfulness: the record confirms that a significant proportion of publisher integrations operate through consent architectures that are internally assessed as inconsistent or technically non-compliant… rendering the asserted legitimate interest unlawful in those instances."* — fact → standard → application → verdict. **Alongside Chapter 3's `scope_analysis`, this is the fleet's best analytic writing.**
- **Argues from the record against the customer's position.** `risk_factors`: *"The DPO has formally documented objections to reliance on legitimate interests and has recommended a consent-first model; this internal record, if disclosed, directly undermines any regulatory assertion that the controller conducted a genuine good-faith legitimacy assessment."*
- **Authority sourcing is the defect.** The reasoning cites *"EDPB Guidelines 1/2024 Section II.A"* as its standard — **EDPB Guidelines 1/2024 is not in `provision_texts`** and the corpus text that *is* available (Recital 47's "careful assessment" and reasonable-expectations sentences) is not quoted. **MUST-INGEST:** EDPB Guidelines 1/2024 on Art. 6(1)(f), official EDPB publication.
- **Ops. 2–4 — not sampled in this extract but structurally present** (`three_part_test` carries necessity and balancing siblings); Op. 4 reasonable expectations has **no dedicated key** and is therefore at best folded into balancing prose — **OMITS as a named finding**.
- **Op. 5 — RECITES.** `documentation_recommendations` exists; a determination-with-mitigations object does not.

## (E) What must change

1. **Ingest EDPB Guidelines 1/2024** (blocking for the standard the product already relies on) and quote Recital 47 verbatim where the reasonable-expectations standard is applied.
2. **Add a named `reasonable_expectations` finding** — Recital 47 makes it a required element of "careful assessment", and it is the balancing factor regulators reach for first.
3. **Add the child factor and the public-authority exclusion** as explicit determinations (both are operative text in Art. 6(1)(f), neither has a key today).
4. **Determination object** with the mitigations that would flip a failing balance, each tied to the factor it addresses.
5. **Promote this chapter's reasoning contract fleet-wide** — the LIA `purpose_test.analysis` shape (standard → record fact → application → verdict) is the concrete pattern the ANALYSIS-DUTY amendment should specify.

## FOUR-LENS SIGN-OFF — Chapter 7

- **LEGAL:** Art. 6(1)(f) and Recital 47 diffed against corpus rows. EDPB Guidelines 1/2024 **NOT in corpus** — currently cited without verification.
- **CS:** Row `3c33c04e-a1d3-4378-8e79-27f9ab40b23e`; verdict field and analysis text quoted verbatim.
- **PROMPT:** Ops. 1–4 are model-work; the public-authority exclusion and child-data flag are deterministic.
- **PROSE:** Closest existing product to the CEO's four-part law; needs Part 1 (overview) and Part 4 (what would change the outcome) added, not Part 2 rebuilt.

---

# CHAPTER 8 — ir-playbook (GDPR Arts. 33, 34)

## (A) What the product is for

Art. 33(1), verbatim from `gdpr_articles(eu,'33')`:

> "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons. Where the notification to the supervisory authority is not made within 72 hours, it shall be accompanied by reasons for the delay."

Art. 34(1), verbatim from `gdpr_articles(eu,'34')`:

> "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay."

**A playbook must operationalise these** — i.e. convert two risk-conditioned duties and one clock into executable steps with owners.

## (B) Required contents

Notification content — Art. 33(3)(a)–(d), verbatim: "(a) describe the nature of the personal data breach including where possible, the categories and approximate number of data subjects concerned and the categories and approximate number of personal data records concerned; (b) communicate the name and contact details of the data protection officer or other contact point…; (c) describe the likely consequences of the personal data breach; (d) describe the measures taken or proposed to be taken by the controller to address the personal data breach, including, where appropriate, measures to mitigate its possible adverse effects." Phasing — Art. 33(4). Documentation duty — Art. 33(5): "The controller shall document any personal data breaches, comprising the facts relating to the personal data breach, its effects and the remedial action taken." Processor duty — Art. 33(2). Data-subject communication form — Art. 34(2) "in clear and plain language"; exemptions — Art. 34(3)(a)–(c) (encryption/unintelligibility; subsequent measures; disproportionate effort with public communication substitute).

## (C) The analytic operations

| # | Operation | Pinpoint |
|---|---|---|
| 1 | **Awareness determination** — when did the controller "become aware", and how is that decided | Art. 33(1) |
| 2 | **SA-notification threshold analysis** — is the breach "unlikely to result in a risk"? | Art. 33(1) |
| 3 | **Data-subject threshold analysis** — is it "likely to result in a high risk"? (a *different* test) | Art. 34(1) |
| 4 | **Exemption analysis** — do Art. 34(3)(a)–(c) apply on the facts | Art. 34(3) |
| 5 | **Content and timing operationalisation** — Art. 33(3)(a)–(d) content mapped to owners, with the 72-hour clock and the delay-reasons duty | Art. 33(1),(3),(4); Art. 33(5) |

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = 47398bcf-a2bf-48e8-af89-c7380adc16a3` (tool `ir-playbook`, `overall_score` 94).

- **Op. 1 — PERFORMS, and does so rigorously.** `playbook_text`: *"The UK GDPR Article 33(1) 72-hour supervisory-authority notification deadline is provisionally set at 2025-07-21T08:05:00Z, computed from the detection timestamp treated as concurrent with controller awareness pending confirmation. If a confirmed controller-awareness timestamp differs from the detection timestamp, every deadline must be recalculated from that confirmed timestamp."* — an explicit assumption, its legal basis, and its sensitivity. **This is the fleet's best handling of an unresolved fact.**
- **Op. 5 — PERFORMS on timing and owners.** *"Step 1 — Invoke the incident response team (immediate, within 15 minutes of discovery) Owner: Head of Operations / Principal / CEO of Brockfield Academy Trust"*, with conditional DPO logic: *"the Data Protection Officer (if designated — UK GDPR Article 37 requires designation for public authorities; if no DPO is designated, escalate to t[he]…)"*.
- **Ops. 2, 3, 4 — OMIT / RECITE.** The sampled opening drives straight to notification steps; the *"unless… unlikely to result in a risk"* condition of Art. 33(1) and the separate Art. 34(1) high-risk test are not analysed as determinations on the incident facts, and the Art. 34(3) exemptions (notably (a) encryption — the most commonly available one) are not tested. The playbook therefore **assumes notifiability** rather than determining it.
- **Content mapping (Op. 5, second limb) — RECITES:** Art. 33(3)(a)–(d) elements are not visibly allocated to owners with a source-of-truth per element in the sampled extract.

## (E) What must change

1. **Add the two threshold determinations as named deliverables** — `sa_notification_determination` (Art. 33(1) risk test) and `data_subject_communication_determination` (Art. 34(1) high-risk test) — argued on the incident facts, with the "unlikely"/"likely high" language quoted.
2. **Add `art34_exemption_analysis`** walking (a) unintelligibility/encryption, (b) subsequent measures, (c) disproportionate effort + public-communication substitute.
3. **Map Art. 33(3)(a)–(d) content to owners and evidence sources**, and add the Art. 33(4) phasing plan and Art. 33(5) internal-documentation record.
4. **Intake:** encryption/key-compromise status of the affected data (Op. 4 is unanswerable without it), affected-record and data-subject counts, and the awareness-confirmation field the product already knows it needs.
5. **Corpus — P0 blocking (Item 291):** `gdpr-art-34` is 69 chars short of CELEX. Repair before Art. 34 is quoted, since the truncation sits at the tail where 34(3)/(4) live.

## FOUR-LENS SIGN-OFF — Chapter 8

- **LEGAL:** Art. 33(1),(3) diffed against `gdpr_articles(eu,'33')` (1,734 chars, complete). Art. 34(1) quoted from the **truncated** row — the quoted sentence is within the intact head, but the chapter flags the defect and bars quoting the tail until repair.
- **CS:** Row `47398bcf-a2bf-48e8-af89-c7380adc16a3`; timing and owner text quoted verbatim.
- **PROMPT:** Ops. 2–4 are model-work; Op. 1's clock arithmetic and all deadline computation stay deterministic (they already are, and are the product's strength).
- **PROSE:** Playbook form is imperative by design; the four-part law applies as Part 1 = incident overview, Part 2 = the three determinations, Part 3 = unresolved facts (already strong), Part 4 = the notification decision and what would reverse it.

---

# CHAPTER 9 — governance (Arts. 5(2), 24, 30, 37–39)

## (A) What the product is for

Art. 5(2), verbatim from `gdpr_articles(eu,'5')`:

> "The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1 ('accountability')."

Art. 24(1), verbatim from `gdpr_articles(eu,'24')`:

> "Taking into account the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for the rights and freedoms of natural persons, the controller shall implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation. Those measures shall be reviewed and updated where necessary."

**The determination is demonstrability**, not the existence of controls: Art. 24(1) requires measures "appropriate" *to the risk*, and requires them to be *demonstrable* and *reviewed*.

## (B) Required contents

Art. 24(2): "Where proportionate in relation to processing activities, the measures referred to in paragraph 1 shall include the implementation of appropriate data protection policies by the controller." Art. 24(3): codes of conduct/certification "may be used as an element by which to demonstrate compliance". Art. 30(1)(a)–(g) and 30(2)(a)–(d) enumerate the record contents verbatim (controller and processor variants), Art. 30(3) "in writing, including in electronic form", Art. 30(4) availability to the SA on request, and Art. 30(5) the fewer-than-250-persons exemption with its three defeating conditions ("unless the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects, the processing is not occasional, or the processing includes special categories of data as referred to in Article 9(1)…"). Arts. 37–39 (all in corpus) govern DPO designation triggers, position, and tasks.

## (C) The analytic operations

| # | Operation | Pinpoint |
|---|---|---|
| 1 | **Risk-calibration analysis** — are the measures appropriate *to this controller's* nature/scope/context/purposes and risk profile | Art. 24(1) first clause |
| 2 | **Demonstrability analysis** — can compliance be *shown*, and with what artifact | Art. 5(2); Art. 24(1) "be able to demonstrate" |
| 3 | **Art. 30 record adequacy** — element-by-element against 30(1)(a)–(g), plus the 30(5) exemption determination | Art. 30(1), (5) |
| 4 | **DPO determination** — designation trigger, independence/position, and task coverage | Arts. 37, 38, 39 |
| 5 | **Review-and-update determination** — is the measure set being reviewed and updated "where necessary" | Art. 24(1) second sentence |

## (D) Juxtaposition — current best output

**Evidence row:** `quality_run_documents.id = e67dfe54-cfa5-4d46-9b13-1004cedf56c2` (tool `governance`, `overall_score` 93.1).

- **Op. 3 — RECITES with real specificity.** `readiness_rationale`: *"Meridian SaaS Inc. has implemented and documented the foundational governance structures — formal DPO, Article 28(3)-verified DPAs with all five vendors, active DLP controls, tested incident-response and DSR workflows, and formal training — placing it above the Developing tier, but three High-severity gaps (privacy notice accuracy, per-activity DPIA coverage, and transfer-mechanism documentation) and several Medium-severity gaps … prevent advancement to Managed"*. Findings are concrete, but they are **inventory + tier placement**, not an accountability determination.
- **The rationale ends by defining its own scale**, in the same sentence: *"domain severities used: Critical = no controls in place; High = controls materially incomplete; Medium = controls mostly in place with identified gaps; Low = minor gaps only; Compliant = requirements met."* — a **maturity-model conclusion, not an Art. 24(1) conclusion**. Nothing in the GDPR corpus authorises "Managed"/"Developing" tiers; the operative standard is appropriateness-to-risk and demonstrability.
- **Verdicts:** Op. 1 **OMITS** (no calibration of measures against this controller's risk profile — the tier is absolute, not risk-relative); Op. 2 **OMITS** (demonstrability, the actual Art. 5(2) duty, is never assessed as such); Op. 3 **RECITES**; Op. 4 **RECITES** ("formal DPO" recorded as a fact, not tested against Arts. 37–39); Op. 5 **OMITS**.

## (E) What must change

1. **Re-anchor the conclusion from maturity tier to statutory standard**: the headline determination becomes *"can this controller demonstrate compliance, and are its measures appropriate to its risk"* under Arts. 5(2)/24(1), with the tier retained (if at all) as a secondary, clearly non-statutory readability aid.
2. **Add `demonstrability_findings[]`** — for each accountability duty, the artifact that would evidence it to a supervisory authority, and whether the record shows it exists.
3. **Add `art30_element_findings[]`** walking 30(1)(a)–(g) verbatim, plus an explicit 30(5) exemption determination with its three defeating conditions.
4. **Add a DPO determination** under Arts. 37–39 (trigger, position/independence, task coverage) rather than a boolean "formal DPO".
5. **Intake:** the review cadence and last-review date for the measure set (Op. 5 is unanswerable today); the risk profile inputs Art. 24(1) names (nature/scope/context/purposes) as first-class fields.
6. **Corpus:** Arts. 5, 24, 30, 37, 38, 39 are all present and complete — **no ingestion required for this chapter.**

## FOUR-LENS SIGN-OFF — Chapter 9

- **LEGAL:** Art. 5(2), 24(1)–(3), 30(1)/(3)/(4)/(5) diffed against `gdpr_articles(eu,·)`. Fidelity confirmed. Maturity tiers have no statutory basis and must be labelled as such wherever retained.
- **CS:** Row `e67dfe54-cfa5-4d46-9b13-1004cedf56c2`; `readiness_rationale` quoted in full including the trailing scale definition.
- **PROMPT:** Ops. 1, 2, 5 are model-work; Art. 30 element coverage and the Art. 30(5)/Art. 37 triggers are deterministic.
- **PROSE:** The scale definition embedded in the rationale sentence is an emit-layer artifact and should move to a legend; Part 4 must state the accountability determination, not the tier.

---

# FLEET SUMMARY — where analysis exists today

| Ch | Product | Ops defined | PERFORMS | RECITES | OMITS | Corpus status | Evidence row |
|---|---|---|---|---|---|---|---|
| 1 | cppa-risk | 5 | 0 | 2 | 3 | complete | `43c17b1c…` |
| 2 | cppa-cyber | 5 (2 citable) | 2 | 2 | 1 | **§§ 7122–7124 ABSENT** | `8611dfda…` |
| 3 | cppa-admt | 5 | 2 | 3 | 0 | § 7200/§ 7222 pending | `fdc773f6…` |
| 4 | registration | — | 0 | 1 | 3 | **NO REGISTRY** | `2ce38547…` |
| 5 | biometric | 5 (0 citable) | 0 | 1 | 4 | **ALL ABSENT** | `acd8ac66…` |
| 6 | dpia | 5 | 1 | 3 | 1 | complete | `43f4d436…` |
| 7 | lia | 5 | 1+ | 3 | 1 | EDPB 1/2024 absent | `3c33c04e…` |
| 8 | ir-playbook | 5 | 2 | 1 | 2 | Art. 34 **P0 truncated** | `47398bcf…` |
| 9 | governance | 5 | 0 | 2 | 3 | complete | `e67dfe54…` |

**Three findings that hold across the fleet.**

1. **Analysis exists in exactly three places** — ADMT `scope_analysis`, LIA `purpose_test`, and ir-playbook's awareness/clock reasoning. All three share one shape: **standard → record fact → application → verdict, including verdicts adverse to the customer.** That shape, not a new prompt style, is the specification the ANALYSIS-DUTY amendment should encode.
2. **The weighing/determination operation is missing everywhere it is required** — Chapter 1 Op. 4/5, Chapter 6 Op. 3/5, Chapter 9 Op. 1/2. Every product that owes a *conclusion under a balancing standard* substitutes an inventory, a tier, a mean, or a boolean.
3. **Score does not track analysis.** The two highest-scoring documents in the fleet (cyber 94.7, ir-playbook 94) include, respectively, pinpoint citations to **uningested regulation text** and an unanalysed notifiability assumption. The grader is measuring shape. This must be raised with the CEO alongside Item 295 before any prompt work is graded against it.

**Ingestion queue implied by this document (blocking, in order):** (i) `gdpr-art-34` and `gdpr-art-22` P0 repairs (Item 291); (ii) 11 CCR §§ 7122–7124; (iii) 11 CCR §§ 7200, 7222; (iv) BIPA 740 ILCS 14, Tex. Bus. & Com. Code § 503.001, Wash. RCW 19.375 (+ 19.373 headings for the conflation question); (v) the data-broker registration registry (Chapter 4 predicate); (vi) EDPB Guidelines 1/2024.

---

## DOUBLE-CHECK CLAUSE — attestation

- Every quoted requirement in Chapters 1, 3, 6, 7, 8, 9 and the § 7120/§ 7121 portion of Chapter 2 was read from the live corpus this turn (`provision_texts`, `gdpr_articles`) and diffed against the row text. No requirement is paraphrased from memory.
- Every juxtaposition claim carries a `quality_run_documents` row id, named at the head of each §D and repeated in the fleet summary table.
- Chapters 2, 4 and 5 state explicitly that governing text is absent and decline to state requirements from memory; their (B)/(C) sections are marked DEFERRED rather than filled.
- No code file, edge function, migration, or harness was touched in this turn.
