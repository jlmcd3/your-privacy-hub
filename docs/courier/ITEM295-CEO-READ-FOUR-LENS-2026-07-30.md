# ITEM 295 — CEO PDF READ VERDICT + FOUR-LENS REVIEW

**Date:** 2026-07-30 · **Authority:** CEO read of two batch-4 replay PDFs at `/admin/replay-review` · **Status:** RECORDED, CEO-GATED — no build action pending ruling

**Scope:** Docs-only courier + ledger append/restamp. No code change, no deploy, no harness invocation, no DB write.

---

## 1. What the CEO read

Documents inspected from **CLEAN RUN batch 4** (post-Item-290, 20 docs, all persisted, 0 blocks):

- **doc `0754dbc8`** — ClearPath Health (rich record: health data, genetic data, biometric data, ADMT with unresolved opt-out, 250k+ California consumers, DPIA medium residual risk).
- **One additional batch-4 PDF** (selected from the same corpus).

Both documents were produced by the Track-2 pipeline in **shadow mode** with deterministic Pass-1/Pass-2 assembly and the current Pass-2R prose pass.

---

## 2. CEO verdict (verbatim)

> "The narrative still reads like a mindless computer reciting facts."

> "There is no real assessment — the analysis just repeats facts from the record or recites applicability in one long, almost unreadable paragraph."

The CEO rejected the content for the cppa-risk product, not the UI, the PDF renderer, or the harness. The defect is in the **assessment content itself**.

---

## 3. Four-lens review (unanimous on the finding)

### 3.1 Legal lens
- The document is **not a legal assessment** because it does not perform a weighing of benefits, impacts, and safeguards from the record facts.
- Recitation of applicable law is present, but **application of that law to the facts** is missing.
- Firm favorable conclusions ("benefits outweigh the impacts") appear without engaging the negative side of the balance.
- Counsel-reserved determinations (e.g., safeguard sufficiency) are recited, not resolved, and the document does not explain why the conclusion is nevertheless reached.

### 3.2 Customer-success lens
- The customer does not see their own activity **overviewed in their language** first; there is no Part-1 customer overview.
- Priority actions are not differentiated; they are essentially the same action repeated for different section headers.
- Missing information is listed, but the document does not tell the user what the result would be if that information were added or changed.
- The report reads as a verdict, not a tool.

### 3.3 Prompt / pipeline lens
- The pipeline has no stage assigned to **analysis**.
- Pass-1 `weight_note` fields are contractually constrained to "the record's own words" — they ground quotes, not reason from them.
- Pass-2 templates frame recitation and assembly, not weighing.
- Pass-2R is bound by a no-new-facts contract, so it can only re-narrate what is already on the record; it cannot introduce the missing analytical step.
- The current validators are calibrated to suppress invented facts, not to require analytic inference.

### 3.4 Prose / readability lens
- The balancing section is a single paragraph containing the **same FSOR sentence repeated 9×/8×** with bare pinpoints.
- The phrase **"present in the record as documented"** appears 13 times.
- Three **priority actions** are verbatim-identical except for their subject.
- The **provisional-posture paragraph** is duplicated.
- No Part-1 customer overview appears anywhere.
- A rich record (health + genetic + biometric + ADMT + unresolved opt-out + 250k+ consumers + DPIA medium residual risk) receives **zero weighing** of any of those elements.

---

## 4. Documented symptoms (per-lens evidence)

| Symptom | Count / Location | Lens |
|---|---|---|
| FSOR sentence repeated with bare pinpoints | 9× in one doc, 8× in the other | Prose / Legal |
| "present in the record as documented" | 13× | Prose / Customer |
| Priority actions identical except subject | 3 actions | Prose / Customer |
| Provisional-posture paragraph duplicated | 2× | Prose |
| Part-1 customer overview absent | entire opening | Customer / Legal |
| Rich record facts receive zero weighing | health, genetic, biometric, ADMT, opt-out, 250k+, DPIA | Legal / Customer |
| Firm favorable verdict on incomplete record | `benefits outweigh` while `information_needed` is non-empty | Legal |

---

## 5. Root cause diagnosis

The defect is **architectural at the content layer**.

- **No stage of the pipeline is assigned ANALYSIS.**
- Pass-1 produces **grounded notes** (quotes from the record), not analytic notes.
- Pass-2 templates frame **recitation**, not reasoned weighing.
- Pass-2R's no-new-facts contract can only **re-narrate** the same recitation; it cannot create the missing analysis.

The result is a document that is **legally recited but not legally assessed** — a verdict-shaped recitation rather than a narrative assessment.

---

## 6. Proposed ANALYSIS-DUTY design amendment

Presented to the CEO as a **material spec §3/§2R amendment**. The four lenses recommend the following design change, gated on CEO approval before any build action.

### 6.1 Pass-1 amendment — grounded **analytic** notes
Change the Pass-1 contract from "the record's own words" to **"grounded analytic notes"**:
- Each note must still be grounded in record facts.
- Each note must also perform a small analytic step: **state the fact, then state what it means for the legal issue**.
- Example: instead of "the record states the business uses biometric data for authentication," the note would state "because the record states biometric data is used for authentication, the § 7152(a)(2) sensitive-information trigger is engaged."

### 6.2 New weighing deliverable — argued both directions
Add a weighing stage or deliverable that explicitly:
- identifies the benefits to the business and to consumers,
- identifies the negative impacts on consumers' privacy,
- evaluates the safeguards on the record,
- states the result of the weighing **from the record facts**, not from template language.

The weighing must be **argued both directions**: the favorable side must engage the negative considerations, and the reserved side must be acknowledged.

### 6.3 Pass-2R four-part narration
Update the Pass-2R four-part structure to include:
- **Part 1 — customer overview** (the customer's activity, in their own operational language).
- **Part 2 — analysis** (reasoned application of law to facts, not recitation).
- **Part 3 — missing information and next steps** (specific, actionable, and tied to what would change).
- **Part 4 — conclusion + how it could change** (the result and the facts that would change it).

### 6.4 Validator adjustment — permit cited reasoned inference
Update the validator rules so that:
- **cited reasoned inference from record facts** is permitted (e.g., "because the record states X, provision Y applies");
- **invented facts** and **unsupported legal conclusions** remain banned.
- The no-new-facts contract is preserved, but it is interpreted as **no new facts**, not **no new reasoning**.

---

## 7. Per-lens positions on the proposed amendment

| Lens | Position |
|---|---|
| Legal | Supports, provided the amendment does not loosen the corpus-citation and verbatim-quote discipline; analysis must still be grounded in record facts and cited law. |
| Customer-success | Supports; the amendment directly addresses the missing Part-1 overview and the tool-shaped conclusion. |
| Prompt / pipeline | Supports, with the caveat that the new Pass-1 contract must be measurable and validator-enforceable; otherwise it becomes a new drift surface. |
| Prose | Supports; the amendment is the only way to break the repetition patterns and give the document a single voice. |

---

## 8. CEO-gate status

The proposed amendment is a **material change to the spec §3/§2R design** and is therefore **CEO-gated**.

- No build action until the CEO rules.
- If the CEO approves, the next turn will be a **spec/design amendment turn** (docs + schema + prompt/validator changes), followed by calibrated implementation.
- If the CEO rejects or modifies the proposal, the team will record the revised direction and proceed accordingly.

---

## 9. No code change

This courier is a **record-only** document. No file was edited, no function deployed, no harness invoked, no database row written.

The following artifacts are preserved for the CEO's review and the next controller session:
- `docs/courier/ITEM295-CEO-READ-FOUR-LENS-2026-07-30.md` (this document)
- `docs/pipeline-state.md` Item 295
- The two rejected PDFs remain accessible at `/admin/replay-review` for re-inspection.

---

**Disposition:** RECORDED. Awaiting CEO ruling on the ANALYSIS-DUTY design amendment.
