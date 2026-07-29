# ITEM 261 — GROUNDED-NOTE SCREEN DEMOTED TO OBSERVE MODE

**Date:** 2026-07-29
**Track:** TRACK 2 / Stage B(2)
**Law basis:** SPEC §6 guard-lifecycle law (observe-first)
**Sign-off:** team-unanimous under the CEO gating-issue delegation
**Deploy:** `replay-cppa-risk-harness` ONLY (offline harness; no customer path)
**LEXICON:** UNTOUCHED — lexicon content remains CEO-gated per the module's own tuning-threshold instruction.

---

## 1. Evidence

**Ramp-1 attempt 5 (job `d488d983`)** — both Pass-1 attempts failed:

```
[grounded-note] mass-replace replacement_rate=0.818 exceeds 0.5
[grounded-note] mass-replace replacement_rate=0.923 exceeds 0.5
```

The Item-258 abort HELD (no content destroyed — the fail-loud guard worked exactly
as designed), but the replacement rate did **not** collapse after the Item-258
full-contract intake ledger landed. The ledger was therefore not the binding
constraint.

**Attempt-3 (job `a5c209d1`) replacement details show WHY.** The tokens driving
replacement are ordinary derivational English whose *stems and underlying facts
ARE grounded*:

| ungrounded token | why it should have grounded |
| --- | --- |
| `setting` | gemination of grounded `set` |
| `detection` | `-ion` from grounded `detect` |
| `include` | ordinary connective, absent from the closed lexicon |
| `who` | ordinary function word, absent from the closed lexicon |
| `apply` | ordinary connective, absent from the closed lexicon |
| `fully` | `-ly` from grounded `full` |
| `request` | ordinary connective, absent from the closed lexicon |
| `human` | ordinary connective, absent from the closed lexicon |

`inflections()` covers only ±s/es/ing/ed and y↔ies. It has **no gemination rule**
and **no -ion/-tion/-ment/-ly derivational rules**. And the screen is all-or-nothing:
**ONE ungrounded token replaces the ENTIRE note.**

The destroyed notes were the **ratified target register** — loop2-anatomy,
field-cited, real facts. Observed false-positive-ish rate: **~82–100% across three
model runs** (attempt 3: 8/8 = 1.00; attempt 5: 0.818 and 0.923).

## 2. Law basis

- **SPEC §6:** "every guard ships OBSERVE-FIRST against a regression corpus of
  real prior outputs; promotion to enforce requires ~zero observed false positives."
  The grounded screen shipped **ENFORCING without observe calibration**.
- **Standing two-tracks handoff §5.3:** "grounded-note/coherence/marketing screens
  stay observe-calibrated per SPEC."
- **`grounded-note.ts`'s own header:** a rate >25% "flags the lexicon as too narrow
  — the CEO reviews the data, we do not silently widen the lexicon."

Demotion to observe is **ENFORCEMENT of the lifecycle law, not a weakening**.
Lexicon widening remains a future CEO-reviewed courier informed by replay data.

## 3. Changes

### `_shared/ltp/grounded-note.ts`
- New exported `GroundedNoteMode = "observe" | "enforce"`.
- `applyGroundedNoteScreen(plan, opts?: { mode?: GroundedNoteMode })` — **DEFAULT
  `"observe"`**.
- **Observe mode:** builds the SAME telemetry (`candidates`, `replacements`,
  `replacement_rate`, `tuning_threshold_rate`, `over_threshold`, full `details[]`
  with `ungrounded_tokens` / `original_note` / `replacement_note`) but **does NOT
  modify any `weight_note`** and **does NOT throw** the mass-replace abort.
- Telemetry gains `mode: "observe" | "enforce"`.
- **Field-name semantics:** `replacements` is retained for series continuity; in
  observe mode it means **would-replace** (documented in the interface docblock).
- **Enforce mode:** exactly the current behaviour — deterministic replacement plus
  the 0.5 `GroundedNoteMassReplaceAbort`. `GroundedNoteMassReplaceAbort` and
  `GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD` remain exported for future promotion.
- `PASS1_GROUNDED_NOTE_VERSION` → `pass1-grounded-note@2026-07-29-item261-observe-default`.

### `_shared/ltp/pass1-llm.ts`
- Call site is now explicit: `applyGroundedNoteScreen(screened.plan, { mode: "observe" })`
  with a comment citing this courier + SPEC §6.
- Telemetry passthrough unchanged; the `grounded_note` key now carries `mode` and
  would-replace counts.
- `PASS1_LLM_STAMP` → `ltp-pass1-llm-item261-grounded-observe@2026-07-29`.

### Tests
- New `_shared/ltp/grounded-note-mode.test.ts` (5 tests): version/stamp bump;
  observe is the default and leaves notes **byte-identical** and never throws at
  rate 1.0 while telemetry reports rate + details; explicit observe ≡ default;
  enforce still replaces; enforce still aborts >0.5.
- `_shared/ltp/pass1-injection.test.ts` case (f) updated to pass `{ mode: "enforce" }`
  explicitly — it remains the promotion regression guard.

## 4. Verbatim test output

```
ok | 29 passed | 0 failed (539ms)
```

Suites run: `grounded-note-mode.test.ts` (5), `pass1-injection.test.ts` (6),
`replay/replay.test.ts` (8), `grader-check-mirror.test.ts` (10). All green; no
evidence-only failure record required.

## 5. Four-lens record

**CS.** A mode switch with observe as the default is the minimal, reversible
expression of the lifecycle law. The enforce path is preserved byte-for-byte and
covered by regression tests, so promotion is a one-line default flip once the
lexicon is calibrated against replay data.

**Privacy.** Factor notes now ship model-authored pending calibration. The
value-screen/PII rejects and the coherence screen (`MassAbsenceRewriteAbort`)
remain **enforcing** as backstops. The harness is **offline-only** — no customer
path is affected by this turn; the legacy production wire is untouched.

**Prompt.** Constraint pressure on Pass-1 is reduced exactly as the incentive
redesign intends. Rule 9's disclosure framing stays *accurate* in the sense that
deterministic replacement still exists in enforce mode. **However**, Rule-9 text
states that replacement is mechanical — which is not what the harness now does.
**Prompt text is left UNCHANGED this turn** (out of scope), and Rule-9 wording is
**flagged for the eventual promotion courier**.

**Prose.** The register the screen was destroying — loop2-anatomy, field-cited,
real-fact notes — is the **ratified target register**. Observe mode stops the
screen from replacing target-register prose with quote-the-ledger boilerplate.

## 6. Deploy

EXPLICIT redeploy of **only** `replay-cppa-risk-harness`. No harness invocation and
no Pass-1 call this turn — the controller reruns personally.
