## Goal

Roll out the shared `useToolDraft` autosave hook to the 8 intake tools listed in the courier, following the CPPA Risk Assessment reference pattern exactly, and extend `DRAFT_TOOL_MAP` in `MyReports.tsx` to cover the four new toolTypes.

## Files to change

- `src/pages/CPPACybersecurity.tsx` → toolType `cppa_cybersecurity`
- `src/pages/DPIAFramework.tsx` → `dpia`
- `src/pages/GovernanceAssessment.tsx` → `governance`
- `src/pages/LIAssessmentIntake.tsx` → `lia` (must include assessment `:id` in draft payload; skip restore on mismatch)
- `src/pages/DPAGenerator.tsx` → `dpa`
- `src/pages/IRPlaybook.tsx` → `ir`
- `src/pages/BiometricChecker.tsx` → `biometric`
- `src/pages/RegistrationAssessment.tsx` → `registration`
- `src/pages/MyReports.tsx` → extend `DRAFT_TOOL_MAP` per exact FIND/REPLACE

Do NOT touch: `useToolDraft.ts`, CPPA Risk / ADMT integrations, RoPA / US Notice / EU Notice / RegistrationOrder / LIAssessment (tracker), edge functions, DB.

## Per-page integration pattern (mirrors CPPARiskAssessment.tsx)

1. Add `touched` state (set true on any field change).
2. Build a memoized `draftData` object of every intake field.
3. Call `useToolDraft({ toolType, clientId: clientId ?? null, data: draftData, currentStage: step ?? 0, enabled: !!user && touched })`.
4. Add `applyRestore()` that type-guards each field before setting state; restores step where applicable.
5. Render a restore banner when `draftFound && !touched` with Resume (applyRestore) and Discard (`void clearDraft()`) — reuse the exact banner already used by CPPA Risk.
6. Call `clearDraft()` at the same lifecycle point CPPA Risk does (successful run creation / checkout success).
7. For single-page tools, pass `currentStage: 0` and ignore `restoreStage`.
8. LIA special case: include the route's assessment `:id` in draft payload; if the restored payload's id ≠ current id, skip restore and suppress the banner.

## Execution order

1. Read `useToolDraft.ts` and the CPPARiskAssessment autosave block to lock in the exact banner JSX, memo shape, and lifecycle points.
2. For each of the 8 pages: read the page, identify state fields + step variable + successful-submit call site, then apply the integration in a single edit.
3. Apply `DRAFT_TOOL_MAP` FIND/REPLACE in `MyReports.tsx`.
4. Typecheck via the automatic build.

## Verification (report back)

- Per-file summary + final `useToolDraft` call for each page.
- Note that functional per-tool testing (banner appears, Resume/Discard, completion clears draft, MyReports labels/routes, SQL spot-check of `tool_sessions` counts) requires interactive preview testing and Stripe test card 4242…; I will flag which items need your hands-on verification vs. what I can confirm from code.
- Confirm no new user-facing text contains the word "gap".
- Regression check: CPPA Risk + ADMT integrations untouched.

## Risks / stop conditions

- If any target page's structure diverges materially from the CPPA Risk pattern (e.g., no clear step state, split into subcomponents that own the field state, uses external form library with a non-serializable shape), STOP for that page and report its actual structure rather than improvise — per courier item 8.
- If the `MyReports.tsx` FIND block does not match verbatim, STOP and report the actual text.
