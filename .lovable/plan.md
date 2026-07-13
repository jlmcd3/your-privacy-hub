## RC-C3 continuation plan

Scope is large enough that I need one approval before I burn a deploy window and a dozen dispatches. Reads and code inspection are done; the shape below is what I intend to execute end-to-end, sequential, with row ids reported per item. Nothing dispatched until you approve.

### Current facts (verified this turn)
- HEAD = `57d64873`, tree clean, matches origin.
- Only fixture wired today is `CPPA_RISK_CONTRACT_FIXTURES`, consumed by `run-quality-batch` at line 2133 via the pinned-intake path. No governance/cyber/admt equivalent exists.
- `cppa_assessments.module` discriminator: `risk_assessment | cybersecurity | suite | admt` — cyber and admt live on the same table as risk.
- `governance_assessments` is its own table (row `7ca49d93` is the empty-freeze first-gen from last turn).
- No `dispatcher` binary in the sandbox; my dispatcher = `curl_edge_functions` against `run-quality-batch` / `regenerate-assessment` + `psql` polling to terminal.

### Deliverables

**1. C3.2 forced-ask fixture path (governance + cyber + admt)**

Author three new fixture files mirroring `cppa-risk-contract-fixtures.ts`, each with a single `FIXTURE_YIELD_K1_PLUS` intake deliberately thin enough that the generator's information-needed pass emits ≥1 verdict-blocking/record-completeness item after `buildOpenItems` classification:

- `supabase/functions/_shared/governance-contract-fixtures.ts` — mid-band multi-jurisdiction org with intentionally missing DPO designation + missing ROPA scope answer.
- `supabase/functions/_shared/cyber-contract-fixtures.ts` — CPPA cyber intake with missing audit-scope + unspecified control-family evidence.
- `supabase/functions/_shared/admt-contract-fixtures.ts` — ADMT intake with unspecified opt-out mechanism + unclear significant-decision domain narrative (never identity-locked fields).

Wire each into `run-quality-batch` behind an existing tool-selector switch, mirroring the risk path (pinned intakes → generator first-gen → freeze → one revision). Errata path stays exempt.

**Deploy discipline**: zero-in-flight check via `SELECT count(*) FROM cppa_assessments WHERE status IN ('pending','processing')` (and same on `governance_assessments`) before `deploy_edge_functions`.

**Execute per tool, sequential**:
- Dispatch first-gen against fixture → poll to `complete` → verify `open_items` length ≥ 1 → snapshot the row id.
- Dispatch ONE revision via `regenerate-assessment` answering the fixture's `answer_targets` → poll → verify `verdicts=1`, matching `changed_path`, `qc_rc_1` + `qc_rc_2` green, `report_versions` row present.
- On red: capture reason and STOP; do not proceed to next tool.

**2. Regen + errata proofs (biometric / ir / dpa) on existing 02bc7cd6 rows**

- Enumerate the 02bc7cd6 rows for `biometric_assessments`, `ir_playbooks`, `dpa_documents` — pick the most recent terminal `complete` row per tool.
- For each, dispatch `regenerate-assessment` with a trivial in-scope revision → verify `report_versions` snapshot row (v_n+1) written, errata endpoint reachable (GET on report-errata function or the page route, whichever exists), report row ids.

**3. Registration version-history check**

- Read-only query against `registration_assessments` + any versioning table for a recent 02bc7cd6 filing; confirm history is retrievable via the existing report-versions read path. No dispatch.

**4. C3.4 gate coverage table**

Single markdown table in the final report: 9 pages × {refine entry, server gate, errata exempt confirmed}. Built by `rg` audit of `useRefineMode` callers + `revision-mode.ts` server enforcement + errata function.

**5. RC-C2 stragglers folded in**

- `62074117` DPIA first-gen wall-clock + failed-interlude explanation (already extracted last turn — restated with row ids).
- `486eb7ec` LIA §35/register verdict quote (already extracted — restated).
- Governance empty-freeze note for `7ca49d93` (fixture yielded zero asks → structurally valid, insufficient for the revision proof, hence the new C3.2 governance fixture).

### Execution order (strict)

```
deploy-window-A (fixtures live)
  → govA-first-gen → govA-revision → report
  → cyberA-first-gen → cyberA-revision → report
  → admtA-first-gen → admtA-revision → report
bio-regen → ir-regen → dpa-regen → registration-history-read
c3.4 audit → assemble final report
```

Between each dispatch: poll to terminal (`status IN ('complete','failed')`), then move on. On any red: stop and report; do not chain.

### Risks / call-outs

- The generator's information-needed pass is model-driven — a fixture that "should" yield ≥1 item can still yield zero. If a fixture empty-freezes, I'll iterate the intake ONCE (thinner) before declaring the tool a governance-style empty-freeze case. No infinite loops.
- Governance first-gen previously took ~142s. Budget wall-clock per fixture round-trip at ~4-6 minutes.
- If `regenerate-assessment` refuses cleanly (409 no mutation) with a legit reason grounded in the patch, that's an acceptable outcome per your standing rule — I report it as such.

Approve and I execute in one continuous turn, reporting per item with row ids as each completes. If you'd rather I split (fixtures + govA this turn, cyber/admt/regens next), say the word.
