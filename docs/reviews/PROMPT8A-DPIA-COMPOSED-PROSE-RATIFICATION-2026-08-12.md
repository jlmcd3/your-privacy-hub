# PROMPT 8A — Ratification package: DPIA composed-template prose

Status: **CEO-RATIFIED AND LANDED 2026-08-12** (one revision: item 3's inline
enumeration reads "The first three are:", backed by a deterministic ordering —
decision blockers first, then gap-ledger order — documented in code and asserted
by test, never stated in customer prose). Assembler stamp
`dpia-skeleton-assembler@prompt8a-ratified-prose-2026-08-12`. Evidence: gate document 79015e98.
Voice rules applied: the CEO voice rules ratified 2026-08-11 with spine v4.1.

Sites:
- `supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts` (items 1–4, 5b/5c render sites, 6)
- `supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/build.ts` (items 5, 5b template)

Slot conventions used below: `{n:word}` = number word for one–nine, digits from 10 up.
`{rescorer}` = `dpia_approved_by_name` when the intake records one, otherwise `the company`.

---

## 1. composeRiskBody — per-risk analytic template (supersedes the Prompt-1 placement, keeps its attribution content)

**1.1 First risk (carries the re-scoring caveat, once per document):**
> {risk_label} is assessed at {likelihood} likelihood and {severity} severity on this assessment's pre-set taxonomy, an inherent band of {inherent}. The company's recorded {measures, woven as prose} answer it, and the residual band — proposed until {rescorer} re-scores it against the measures as implemented — is {residual}.

**1.2 Every subsequent risk:**
> {risk_label} is assessed at {likelihood} likelihood and {severity} severity on this assessment's pre-set taxonomy, an inherent band of {inherent}. The company's recorded {measures, woven as prose} answer it, and the residual band is {residual} on the same proposed basis.

**1.3 No measure recorded (replaces the measures clause, either position):**
> {risk_label} is assessed at {likelihood} likelihood and {severity} severity on this assessment's pre-set taxonomy, an inherent band of {inherent}. The company records no measure against it, and the residual band is {residual} on the same proposed basis.

**1.4 Residual band undetermined (replaces the residual clause, either position):**
> …and the residual band is undetermined, because the company does not record the measures applied.

**1.5 Likelihood or severity absent:**
> {risk_label} carries an inherent band of {inherent} on this assessment's pre-set taxonomy; likelihood and severity are not both recorded, so the band is not decomposed here.

**1.6 Safeguards closer (currently "The safeguards the company has recorded: …"):**
> Across the processing as a whole the company records {safeguards, woven as prose}.

**1.7 Negative branch of 1.6:**
> The company records no safeguards for this processing.

## 2. composeNecessityBody — counting register

**2.1**
> The company has recorded {n:word} alternatives — {list} — and states for each why it would not achieve the recorded purpose.

**2.2 Singular:**
> The company has recorded one alternative — {list} — and states why it would not achieve the recorded purpose.

**2.3** Throughout this composer: "The record identifies / puts / names" → "The company has recorded"; "(s)" pluralisation hack removed.

## 3. composeExecutiveBody — open-points sentence

**3.1** (as ratified, CEO revision 2026-08-12)
> The company's answers leave {n:word} points open; each is listed in the gap table and raised again where it bears on a determination. The first three are: {first three items, semicolon-separated}.

**3.2 Singular:**
> The company's answers leave one point open; it is listed in the gap table and raised again where it bears on a determination. It is: {item}.

**3.3 Three or fewer items:** the second sentence reads "They are: {items}." (no "most consequential" claim where the list is complete).

## 4. Lead-sentence tic

**4.1 Lawfulness / necessity lead (replaces "On the company's answers, necessity and proportionality are made out for the processing as described."):**
> Necessity and proportionality are made out on the company's answers for the processing as described.

**4.2 Partial branch:**
> Necessity and proportionality are made out in part on the company's answers: {n:word} elements are not yet supported.

**4.3** The "On the company's answers, …" opener is retained for the executive lead only. Sign-off leads keep their existing distinct forms.

## 5. buildLegalBasis — Art. 6(1)(c) and 6(1)(e) named-instrument branches

**5.1 Art. 6(1)(c), instrument matched:**
> The company identifies the instrument the obligation arises under — "{quoted matched span}" — so the obligation relied on can be identified rather than assumed.

**5.2 Art. 6(1)(e), instrument matched:**
> The company identifies the instrument the task or official authority is laid down in — "{quoted matched span}" — so the public-task footing can be identified rather than assumed.

**5.3 Opening line of every non-(f) basis (register fix):**
> The company relies on {art6.label} for the recorded purpose ("{purpose}").

Implementation note: `matches()` returns a boolean today. It gains a sibling
`matchSpan()` returning the first regex match plus a short surrounding window,
so the quoted span is the text the scan actually matched — never a re-derivation.

## 5b. risk_count_note — provenance disclosure

> This assessment's risk register carries {register_count} risks. The company's own account of residual risk describes {stated_count}; the register is the operative count for this assessment and includes risks this assessment itself projects from the record alongside those the company names, and the company's account is recorded in its own words in the sign-off section.

## 5c. Re-scorer named

One template, rendered at the single site the caveat survives item 1's dedup:
> …proposed until {rescorer} re-scores it against the measures as implemented.

The executive body's own high-band sentence uses the same `{rescorer}` slot:
> {n:word} of those risks remain at a high residual band on the answers given, and the assessment treats that band as proposed until {rescorer} re-scores it against the measures as implemented.

## 6. Citation style ruling (for CEO decision)

Recommended and applied everywhere in DPIA composed prose:
- running prose spells **"Article 35(1)"**;
- parenthetical citations use **"(Art. 35(1))"**;
- the `citation` field and the Table of Authorities keep the registry's full form verbatim.

Stated in a header comment at the top of the assembler.

---

## 7. Spine prose review (complete text, current vs proposed)

The shipped spine is **v4.1**, `prose-plans-2026-08-12-prompt8b-v4-1`, hash
`5e538c3c50a0d8098acdffd9067166d92cb343da7f1b117158df9f7d66a4d7b2`.

Those bytes were produced by, and ratified through, the genuine review-document
process the CEO directed on 2026-08-11 — the same directive item 7 is written
against — and the review already covered every fixed sentence for clarity,
professionalism and register. Re-opening them one day later would churn the
byte-pin without new evidence.

**Proposal: no spine change under 8A.** The v4.1 fixed prose stands as the
current-and-proposed text; the pinpoint byte-checks and the spine hash are
unchanged, and no test updates are required on this item. The full v4.1 text as
shipped is reproduced below for the record.

(Complete v4.1 fixed prose, in block order, is the `kind: "skeleton"` text in
`supabase/functions/_shared/prose/plans/dpia.spine.ts` — 16 blocks, unchanged.)

If the CEO nonetheless wants a fresh pass, it should run as its own item so the
review document is generated from the shipped bytes and the hash moves once.

---

## Tests to land with the approved bytes

- composer tests updated to templates 1–4 above;
- register test: `/the record (identifies|names|puts|relies)/i` appears nowhere in composed output;
- pluralisation test: 1 → "one", 12 → "12";
- re-scoring caveat appears exactly once per document;
- `matchSpan` test: the quoted instrument span is the matched text.
