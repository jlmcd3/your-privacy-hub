# PROMPT 8D — DPIA plain-language sweep (CEO redline standard)

Status: **PROPOSED — NOTHING COMMITTED.** Generated from the shipped bytes of
`_shared/ltp/dpia-skeleton-assemble.ts`, `_shared/prose/plans/dpia.spine.ts` and
`run-dpia-framework/_local/ltp/dpia-deliverables/build.ts` (via `_shared/ltp/dpia-deliverables`),
2026-08-12. Drafting lens: EUP Prose Voice Standard v1 + the CEO canonical model.
Vocabulary constants (band ids `low|moderate|high|undetermined`, verdict enums) untouched.

---

## PART 1 — COMPLETE BEFORE/AFTER SET

### A. Executive summary — LEAD BLOCK (spine `executive_summary:0`, `composeExecutiveLead`)

Under the STRUCTURAL RIDER the lead block is deleted (spine v4.2). All five branch
sentences below are therefore **retired**, and their decision content is carried by the
final sentence of the executive body (site 4).

| # | BEFORE (retired) |
|---|---|
| A1 | "On the company's answers, the processing requires prior consultation with the supervisory authority under Article 36 before it may proceed." |
| A2 | "On the company's answers, whether the processing may proceed cannot yet be settled: the residual position on which Article 36 turns is open on the points named below." |
| A3 | "On the company's answers, {org} may not yet treat the processing as cleared: the assessment remains incomplete on the points named below." |
| A4 | "On the company's answers, the processing may proceed conditionally: clearance rides on the measures named below being operated as recorded." |
| A5 | "On the company's answers, the processing may proceed as assessed, subject to the measures identified in this assessment." |

AFTER: block deleted; `composeExecutiveLead` retired. **MEANING FLAG (1):** deletion is
only safe because the executive body's closing sentence (site 4) is branch-aware —
it must carry the Art. 36 and draft-incomplete outcomes, which the body never carried
before. Site 4 below is written accordingly.

---

### B. Executive summary — BODY (`composeExecutiveBody`, spine `executive_summary:2`)

**1 — Register head sentence**

BEFORE
> The assessment carries {n:word} risks through to a residual position after the measures the company has recorded.

AFTER (canonical model, sentence 1)
> This assessment reviews {n:word} risks and the measures the company has put in place to mitigate them.

Singular variant: "…reviews one risk and the measures the company has put in place to mitigate it."

**2 — Level sentence + preliminary caveat**

BEFORE (no-high branch)
> None of those risks remains at a high residual band on the answers given, and each residual band is proposed until {rescorer} re-scores it against the measures as implemented.

AFTER
> None is deemed a high risk based on the information the company provided, and the risk levels in this document are preliminary until {rescorer} re-scores them against the mitigating measures once they have been deployed.

BEFORE (high branch)
> {h:word} of those risks remain at a high residual band on the answers given, and the assessment treats that band as proposed until {rescorer} re-scores it against the measures as implemented.

AFTER
> {h:word} of these risks are deemed high risks based on the information the company provided, and the risk levels in this document are preliminary until {rescorer} re-scores them against the mitigating measures once they have been deployed.

Singular variant: "One of these risks is deemed a high risk based on…"

**3 — Undetermined-level sentence**

BEFORE
> {u:word} residual bands are undetermined because the company has not recorded the measures applied, and an undetermined band is not read in the company's favour.

AFTER
> {u:word} remaining risk levels are undetermined because the company has not recorded the measures it applies, and an undetermined level is not read in the company's favour.

Singular: "One remaining risk level is undetermined because…"

**3b — Reconciliation disclosure (from `risk_count_note`, rendered here)**

BEFORE (verbatim from the note; see site 12)
> This assessment's risk register carries {r} risks. The company's own account of residual risk describes {c}; the register is the operative count for this assessment and includes risks this assessment itself projects from the record alongside those the company names, and the company's account is recorded in its own words in the sign-off section.

AFTER (canonical model, sentence 3)
> The company self-identified {c:word} of these risks; this assessment surfaces {d:word} more. The company's own account is recorded in its own words in the sign-off section.

Where `d = register_count − stated_count`.
**MEANING FLAG (2):** the canonical split sentence is only computable where the company
stated a count, i.e. exactly where `risk_count_note` exists today. Where the company
stated no count, the sentence is **omitted** (as the note is omitted today) — the sweep
does not invent a self-identified count.
**MEANING FLAG (3):** where `stated_count > register_count` (company named more than the
register carries), "surfaces {d} more" is false. Branch variant proposed:
> The company self-identified {c:word} risks in its own account; this assessment carries {r:word} after consolidation, and the company's own account is recorded in its own words in the sign-off section.

**4 — Closing decision sentence (grounded; replaces the retired lead)**

BEFORE (the trailing sentence was simply the first sentence of `decision.why`, unmodified — see site 11.)

AFTER — branch variants:

- approved: "Given the noted risks and the mitigating measures, the processing being assessed may proceed as described: every risk identified by the company and otherwise identified in this assessment is deemed low or moderate."
- conditionally_approved: "Given the noted risks and the mitigating measures, the processing being assessed may proceed on the conditions set out below."
- draft_incomplete: "Given the points still open, this assessment cannot yet determine whether the processing being assessed may proceed."
- consultation_required: "Given the noted risks and the mitigating measures, the processing being assessed may not begin until the company has consulted {authority} under Article 36(1)."
- Art. 36 undetermined: "Given the points still open, whether prior consultation is required cannot yet be determined, and the processing being assessed should not begin until it is."
- zero-risk register (no rows at all): "This assessment reviews no risks, because the company has recorded none and none is otherwise identified here; no determination on whether the processing may proceed can rest on a register that is empty."

**5 — Open-points intro**

BEFORE (one)
> The company's answers leave one point open; it is listed in the gap table and raised again where it bears on a determination. It is: {item}.

AFTER
> Based on the information the company provided, one point is still open; it is listed in the gap table and raised again where it bears on a determination. It is: {item}.

BEFORE (many)
> The company's answers leave {n:word} points open; each is listed in the gap table and raised again where it bears on a determination. They are: … / The first three are: …

AFTER
> Based on the information the company provided, {n:word} points are still open; each is listed in the gap table and raised again where it bears on a determination. They are: … / The first three are: …

(The per-item suffix "— which completes {enables}" is unchanged.)

---

### C. Necessity and proportionality — LEAD (`composeNecessityLead`)

**6**

BEFORE (no findings)
> Whether necessity and proportionality are made out cannot be determined on the company's answers alone; the analysis below sets out what the record does and does not support.

AFTER
> Whether necessity and proportionality are established cannot be determined based on the information the company provided alone; the analysis below sets out what that information does and does not support.

BEFORE (all met)
> Necessity and proportionality are made out on the company's answers for the processing as described.

AFTER
> Necessity and proportionality are established based on the information the company provided, for the processing as described.

BEFORE (partly met)
> Necessity and proportionality are made out in part on the company's answers: {n:word} elements are not yet supported.

AFTER
> Necessity and proportionality are established in part based on the information the company provided: {n:word} elements are not yet supported.

**7 — Void notice** (`DPIA_NP_VOID_NOTICE`) — no glossary term present; **UNCHANGED**.

---

### D. Risk management — LEAD (`composeRiskLead`)

**8**

BEFORE (no register)
> No risk register has been assembled on the company's answers, so no residual position can be stated.

AFTER
> No risk register has been assembled based on the information the company provided, so no remaining risk level can be stated.

BEFORE (undetermined top)
> After the measures the company has recorded, the residual position on {label} remains undetermined, and that is the most significant open point in this assessment.

AFTER
> After the mitigating measures the company has recorded, the remaining risk level for {label} is undetermined, and that is the most significant open point in this assessment.

BEFORE (banded top)
> After the measures the company has recorded, the most significant residual risk is {label}, at a proposed residual band of {band}.

AFTER
> After the mitigating measures the company has recorded, the most significant remaining risk is {label}, at a preliminary remaining risk level of {band}.

BEFORE (banded top, band absent)
> After the measures the company has recorded, the most significant residual risk is {label}.

AFTER
> After the mitigating measures the company has recorded, the most significant remaining risk is {label}.

---

### E. Risk management — BODY (`composeRiskBody`, per-risk template)

**9a — likelihood/severity not both recorded**

BEFORE
> {label} carries an inherent band of {inherent|undetermined} on this assessment's pre-set taxonomy; likelihood and severity are not both recorded, so the band is not decomposed here.

AFTER
> {label} carries an initial risk level of {inherent|undetermined} under this assessment's pre-set risk taxonomy; likelihood and severity are not both recorded, so that level is not broken down here.

**9b — head sentence**

BEFORE
> {label} is assessed at {likelihood} likelihood and {severity} severity on this assessment's pre-set taxonomy, an inherent band of {inherent|undetermined}.

AFTER
> {label} is assessed at {likelihood} likelihood and {severity} severity under this assessment's pre-set risk taxonomy, an initial risk level of {inherent|undetermined}.

**9c — undetermined remaining level, measures present**

BEFORE
> The company's recorded {measures} answer it, and the residual band is undetermined, because the company does not record the measures applied.

AFTER
> The company's recorded {measures} mitigate it, and the remaining risk level is undetermined, because the company does not record the measures it applies.

**9d — undetermined remaining level, no measures**

BEFORE
> The company records no measure against it, and the residual band is undetermined, because the company does not record the measures applied.

AFTER
> The company records no measure against it, and the remaining risk level is undetermined.

**MEANING FLAG (4):** the current "because the company does not record the measures applied"
clause is self-contradictory in the no-measures branch (it restates its own antecedent);
the CEO's "no template stretched across facts it wasn't written for" direction is applied
by dropping the causal clause in 9d only.

**9e — banded, first risk (carries the caveat)**

BEFORE
> {head} The company's recorded {measures} answer it, and the residual band — proposed until {rescorer} re-scores it against the measures as implemented — is {residual}.

AFTER
> {head} The company's recorded {measures} mitigate it, and the remaining risk level — preliminary until {rescorer} re-scores it against the mitigating measures once they have been deployed — is {residual}.

No-measures variant: "The company records no measure against it, and the remaining risk level — preliminary until … — is {residual}."

**9f — banded, subsequent risks**

BEFORE
> …and the residual band is {residual} on the same proposed basis.

AFTER
> …and the remaining risk level is {residual} on the same preliminary basis.

**9g — safeguards closer**

BEFORE
> Across the processing as a whole the company records {safeguards}. / The company records no safeguards for this processing.

AFTER — **UNCHANGED** (no glossary term present).

---

### F. Conclusion — SIGN-OFF LEAD (`composeSignoffLead`)

**10**

BEFORE
> The sign-off determination recorded is {head}, and {approver} is recorded against it. / …, and no approver is recorded against it.

with `{head}` ∈ { "prior consultation with the supervisory authority before the processing begins", "that the assessment is not yet capable of sign-off", "conditional approval, subject to the conditions recorded in this assessment", "approval of the processing as assessed" }

AFTER — heads and frame kept, one substitution:
> …"that the assessment cannot yet be signed off"… (replaces "is not yet capable of sign-off")

Remainder **UNCHANGED**.

BEFORE (no determination)
> No sign-off determination has been recorded, and {approver} has not yet accepted the residual position. / …and the assessment carries no approver.

AFTER
> No sign-off determination has been recorded, and {approver} has not yet accepted the remaining risk levels. / …and the assessment carries no approver.

---

### G. Conclusion — SIGN-OFF BODY (`composeSignoffBody`)

**11a**

BEFORE
> {approver}, {title}, is recorded as the person accepting the residual position across the {n} risks carried by this assessment.

AFTER
> {approver}, {title}, is recorded as the person accepting the remaining risk levels across the {n} risks this assessment reviews.

**11b**

BEFORE
> No approver has been recorded, so the residual position set out above has not yet been accepted by anyone on the company's behalf.

AFTER
> No approver has been recorded, so the remaining risk levels set out above have not yet been accepted by anyone on the company's behalf.

**11c–11f** — "The basis recorded for that acceptance is as follows: …", "The company has recorded the scope of this assessment as …", "The review window the company has recorded runs to …", "Clearance is conditional on …", "Sign-off is held open by the following: …" — **UNCHANGED** (no glossary terms).

---

### H. Article 36 sentences (`composeArt36Sentence`, spine slot `ART36_SENTENCE`)

**12a**

BEFORE
> Because the residual risk remains high notwithstanding the measures the company has recorded, Article 36(1) requires the controller to consult the supervisory authority before the processing begins

AFTER
> Because the remaining risk level is high despite the mitigating measures the company has recorded, Article 36(1) requires the controller to consult the supervisory authority before the processing begins

**12b**

BEFORE
> Whether Article 36(1) requires prior consultation cannot be settled on the company's answers, because the residual position on which that duty turns is open on the points named above

AFTER
> Whether Article 36(1) requires prior consultation cannot be settled based on the information the company provided, because the remaining risk levels on which that duty turns are open on the points named above

**12c** — "On this assessment's determination, no prior consultation with the supervisory authority under Article 36(1) is required" — **UNCHANGED**.

---

### I. `decision.why` branches (`buildDecision`, rule_id `dpia_decision_v1`)

**13a — consultation_required**

BEFORE
> This processing may not begin on the company's answers as they stand: {n} risks — {labels} — remain at a high residual band after the measures the company has recorded, and the controller must consult {authority} under Art. 36(1) before the processing begins.

AFTER (grounded form)
> Given the noted risks and the mitigating measures, the processing being assessed may not begin as things stand: {n} risks — {labels} — are deemed high risks after the mitigating measures the company has recorded, and the controller must consult {authority} under Article 36(1) before the processing begins.

**13b — draft_incomplete**

BEFORE
> This assessment is not yet capable of a sign-off determination: {n} points the determination turns on are unresolved on the company's answers — {blockers}

AFTER
> Given the points still open, whether the processing being assessed may proceed cannot yet be determined: {n} points the determination turns on are unresolved based on the information the company provided — {blockers}

**13c — conditionally_approved**

BEFORE
> This processing may proceed on a conditional basis only: {n} risks — {labels} — sit at a high residual band, and clearance is conditional on {conditions}.

AFTER
> Given the noted risks and the mitigating measures, the processing being assessed may proceed on conditions: {n} risks — {labels} — are deemed high risks, and clearance is conditional on {conditions}.

**13d — approved**

BEFORE
> This processing may proceed as assessed: every risk identified on the company's answers sits at a low or moderate residual band after the measures the company has recorded, and no determination this assessment makes is left open. This determination is bound to those measures as recorded; if a measure is not operated as stated, the assessment must be re-run.

AFTER (canonical model, final sentence)
> Given the noted risks and the mitigating measures, the processing being assessed may proceed as described: every risk identified by the company and otherwise identified in this assessment is deemed low or moderate, and no determination this assessment makes is left open. This determination is bound to those measures as recorded; if a measure is not operated as stated, the assessment must be re-run.

**13e — NEW branch: no-measures**
Today a register whose rows carry no measures falls into 13a/13c/13d and asserts
"after the mitigating measures the company has recorded" where none exist.
Proposed dedicated sentence:
> Given the noted risks and the absence of any recorded mitigating measure, the processing being assessed may proceed only once the company records the measures it will rely on: no risk level in this document has been tested against a measure.

**13f — NEW branch: undetermined-level**
> Given that {n:word} risk levels remain undetermined, whether the processing being assessed may proceed cannot yet be determined; the levels must be set before this assessment can carry a determination.

**13g — NEW branch: zero-risk register**
> No risk has been identified by the company or otherwise identified in this assessment, so there is nothing on which a determination can rest; a determination requires at least one risk to be assessed.

**MEANING FLAG (5):** 13e–13g are new branches, not rewordings. They change which sentence
a run receives in three fact patterns that today receive a template written for other
facts. Flagged for explicit ratification.

---

### J. Reconciliation note (`buildRiskCountNote`)

**14**

BEFORE (`note`)
> This assessment's risk register carries {r} risks. The company's own account of residual risk describes {c}; the register is the operative count for this assessment and includes risks this assessment itself projects from the record alongside those the company names, and the company's account is recorded in its own words in the sign-off section.

AFTER
> The company self-identified {c:word} of these risks; this assessment surfaces {d:word} more. The company's own account is recorded in its own words in the sign-off section.

(Same bytes as site 3b — one template, rendered once.)

---

### K. Asks and residual notes (`buildSection2Coverage`)

**15a — `ASK_DATA_QUALITY`** — UNCHANGED (already plain, no glossary term).

**15b — `ASK_ART5_TABLE`**

BEFORE
> The measures supporting each Article 5(1) principle — fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality — stated per principle, with each measure's implementation status.

AFTER
> The measures supporting each Article 5(1) principle — fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality — stated principle by principle, and whether each measure has been deployed.

**15c — `ASK_RIGHTS_TABLE`** — UNCHANGED.

**15d — `RESIDUAL_ART5_TABLE` / `RESIDUAL_RIGHTS_TABLE`** — UNCHANGED (credit-first
wording ratified at 10B; no glossary term).

**15e — Tier-3 coverage findings** ("The record's account of how this data is kept
accurate…", "On the record supplied, the measures bearing on the Art. 5 principles…")
— **UNCHANGED**; flagged only that these use "the record" as a noun, which the Voice
Standard discourages. Not part of the 8D glossary; recommend a separate pass rather than
folding it in silently.

---

## PART 2 — SPINE v4.2 (full text for ratification)

Change from v4.1: **one block deleted** — `executive_summary` block 0, the
`[DETERMINATION LEAD]`. Nothing else moves; all 16 `skeleton` blocks are
byte-identical to v4.1, so the fixed-prose hash is recomputed only because the block
inventory changed (the deleted block is a `lead`, not a `skeleton` block — see the hash
note below).

**executive_summary — "Executive Summary"**
1. *(deleted — was the [DETERMINATION LEAD])*
2. skeleton: "Article 35 requires a data protection impact assessment where processing is likely to result in a high risk to the rights and freedoms of natural persons. {organizationName} believes that this assessment may be required because {reasonsToConduct}. The processing under assessment is {description}{VERSION_CLAUSE}{LAUNCH_CLAUSE}."
3. generated: "[GENERATED] The executive body per the canonical model: risks reviewed and the measures mitigating them; whether any is deemed high; the self-identified/surfaced split; the open points; and the grounded decision statement, which closes the section."

**section_0_overview — "Section 0 - Overview of the Processing"** … *(unchanged, verbatim v4.1)*
**section_1_description** … *(unchanged)*
**section_2_analysis** … *(unchanged)*
**section_3_necessity_proportionality** … *(unchanged)*
**section_4_risk_management** … *(unchanged)*
**section_5_interested_parties** … *(unchanged)*
**section_6_conclusion** … *(unchanged)*
**table_of_authorities** … *(unchanged)*

HASH: `DPIA_SKELETON_CONTENT_HASH` is computed over the `skeleton` blocks only (16 of
them), all byte-identical to v4.1. **The v4.1 value `5e538c3c…` therefore does not
change.** If the CEO wants v4.2 to be independently pinned, the hash basis must widen to
all blocks; that is a change to the pin definition and is put separately rather than
done silently. Recommendation: keep the 16-block basis, bump
`DPIA_SKELETON_VERSION` to `prose-plans-2026-08-12-prompt8d-v4-2`, and record v4.1's
hash as retained lineage.

PINPOINT RE-RUN (fixed prose, unchanged blocks): Article 35 / 35(1), 35(2), 35(7)(a),
35(7)(b), 35(7)(c), 35(7)(d), 35(9), Article 9(1)–9(2), Article 28(3), Chapter V,
Article 36(1). No pinpoint sits in a changed byte; all re-verify against their approved
`provision_texts` rows.

---

## PART 3 — PER-SITE GLOSSARY AUDIT

| Substitution | Sites applied | Sites deliberately NOT applied |
|---|---|---|
| "residual band" → "remaining risk level" | 2, 3, 8, 9a(initial), 9c, 9d, 9e, 9f, 10, 11a, 11b, 12a, 12b | 13a/13c use "deemed high risks" instead (the canonical verdict verb reads better than a level noun in a decision sentence) |
| "inherent band" → "initial risk level" | 9a, 9b | — |
| distinction preserved | 9a/9b carry "initial", 9e/9f carry "remaining", in the same row | never collapsed to bare "risk level" on a row carrying both |
| "proposed" → "preliminary" | 2, 8, 9e, 9f | — |
| "on the company's answers"/"on the answers given" → "based on the information the company provided" | 2, 5, 6, 8, 12b, 13b | A1–A5 (block deleted); 13a/13d replaced wholesale by the grounded form |
| compact form "from the company's input" | *(no compact position needed after the rewrite — all occurrences fit the long form)* | flagged: no site currently warrants the compact variant |
| "as implemented" → "once they have been deployed" | 2, 9e | 15b uses "whether each measure has been deployed" (an ask, not a re-score clause) |
| register head clause → canonical sentence 1 | 1 | — |
| register-operative-count clause → self-identified/surfaces | 3b, 14 | omitted where no stated count exists (MEANING FLAG 2); reversed-count variant proposed (MEANING FLAG 3) |
| "answer it" → "mitigate it" | 9c, 9e | — |
| "made out" → "established" | 6 | — |
| decision.why grounded form | 13a–13d, plus new 13e–13g | — |

---

## PART 4 — TESTS TO LAND WITH THE COMMIT (not yet written)

1. `prompt8a-prose.test.ts` register updated to the 8D bytes (caveat-once assertion
   retargeted to "preliminary until … once they have been deployed").
2. NEW vocabulary-fidelity test: a register row carrying both bands renders
   "initial risk level" and "remaining risk level" distinctly, and never the bare
   phrase "risk level" alone for both.
3. Banned-phrase test extended: "residual band", "inherent band", "on the company's
   answers", "made out", "as implemented", "answer it" must not appear in any composed
   customer sentence.
4. Spine test battery: executive_summary block count 3 → 2; slot inventory unchanged;
   16 skeleton blocks unchanged.
5. Calibration registry (`_shared/grader/skeleton-calibration.ts`) rule-1 and rule-4
   verbatim spans re-pinned to the 8D bytes — otherwise both rules stop firing.

---

## OPEN DECISIONS FOR THE CEO

1. Ratify A1–A5 deletion with the decision statement moving to executive body site 4.
2. Ratify new decision branches 13e (no measures), 13f (undetermined levels), 13g (zero risks).
3. Ratify the reversed-count variant at 3b (MEANING FLAG 3).
4. Ruling on the v4.2 hash basis (keep 16-block skeleton-only basis, or widen).
5. Confirm sites marked UNCHANGED are intended to stay (7, 9g, 11c–11f, 12c, 15a, 15c, 15d, 15e).
