# Highlight the missing question when a step can't be submitted

## What happens today

Every intake wizard checks the step when you press Next. The check walks the questions in order and, on the first problem, returns a single sentence — "State the purpose of the disclosure to each recipient." — which is shown in a red box at the bottom of the step (`ValidationErrorSummary`). Nothing on the question itself changes, so on a long step like Step 3 of the CPPA Risk Assessment you have to hunt for the question the sentence refers to. On repeating blocks (recipients, disclosures, employees) it is worse: the sentence doesn't say *which row*.

## What it should do

When the step can't be submitted:

1. The red summary stays where it is (it is what screen readers announce).
2. The question it refers to gets a red outline, a red label, and a short red line under it saying what is missing.
3. The page scrolls to that question and puts the cursor in it.
4. For a repeating block, only the offending row is outlined, and the row is named ("Recipient 2").
5. The red state clears on that question as soon as it is answered, not only on the next Next.

## Why this is a fleet-wide change, not a one-page fix

The same pattern is repeated independently in each product page: CPPA Risk Assessment, CPPA Cybersecurity, ADMT Checker, DPIA Framework, LIA, Governance Assessment, Registration Assessment, DPA Generator, Biometric Checker, RoPA setup. CPPA Risk alone has about 75 separate failure messages; ADMT 35; Governance 20. None of the messages currently carry any reference to the question they came from, so the link has to be added message by message.

## Approach

**1. Make the check name the field, not just the message.**
Change each step check from returning `string | null` to returning `{ message, fields }`, where `fields` is one or more field keys (`"i6_vendors"`, or `"recipient_rows[2].disclosure_purpose"` for a row). A small shared helper keeps the call sites terse so the existing lines change by a few characters each, keeping the message text byte-identical. This is mechanical but touches roughly 200 lines across the products.

**2. One shared error-state hook.**
A new `useIntakeFieldErrors` holds the active field keys, exposes `isInvalid(key)` and `clear(key)`, and clears a key when its value changes. Products already hold their answers in local state, so this hooks in beside the existing `validationError` state.

**3. One shared field wrapper.**
A new `FieldShell` (or an opt-in prop on the existing label/field blocks) renders the red outline, red label, red helper line, `aria-invalid`, and the scroll anchor. Questions need a stable anchor id; many already have `id="..."` on the input, and the rest get one that matches the field key used by the check. Repeating rows get `id="<key>[<index>]"`.

**4. Scroll and focus.**
On a failed Next, scroll to the first invalid anchor and focus it, instead of focusing the summary box; the summary keeps `role="alert"` so it is still announced.

**5. Summary becomes a list.**
`ValidationErrorSummary` gains an optional list of items, each a clickable link that jumps to its question. Passing a plain string keeps current behaviour, so products can be converted one at a time.

## Sequencing

- Step 1 — shared pieces: hook, field wrapper, summary upgrade, anchor convention. No visible change yet.
- Step 2 — CPPA Risk Assessment converted end to end (largest page, proves the pattern, including repeating rows).
- Step 3 — remaining eight products, one per pass.
- Step 4 — a test per product asserting that each failure message resolves to an anchor that exists on that step (prevents a message pointing at nothing).

## Things to decide

- Should the check report *all* missing questions on the step at once, or keep stopping at the first one? Reporting all is more useful on a long step but changes the wording of the summary.
- Whether the red outline appears only after a failed Next (recommended) or live as you type.

## Risks

- Anchor drift: a message whose field key no longer exists would silently highlight nothing. The Step 4 test is the guard.
- Answer-shape differences between products mean the "clear on change" behaviour must be wired per page; the hook makes it one line each.

No code changes have been made.
