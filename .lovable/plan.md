
# RC-C3 execution plan (courier 5 of 6)

Locking sequence, deploy windows, and proof-leg definitions before touching code. Prior turns burned cycles when dispatches raced deploys; this plan enforces zero-in-flight gates and one deploy per phase.

## Phase 0 — Owed RC-C2 reporting (no code)
- Query `cppa_assessments` history / `function_runs` for `62074117` first-gen wall-clock and explain the `processing → failed → complete` interlude (which run terminal? was it reaped? was it a synchronous retry?).
- Extract and quote the LIA §35/assessment-register verdict reason from `486eb7ec` leg-1 revision (from `open_items[].resolutions[]` on the resolved item).
- Report both before any code lands.

## Phase 1 — C3.1 Governance (Limited=3)
Code changes (one deploy window, after zero-in-flight check on `governance_assessments`):
1. `_shared/revision-qc.ts`: add `governance_assessment` to `CONTRACT_ENABLED_TOOLS`.
2. `_shared/open-items.ts`: add `governance_assessment` block to `T_CLASS_FIELDS`; enum_refs point at `governance_assessment:<field>` keys (content-anchored, no literal retyping).
3. `_shared/revision-patch.ts`: `ADVISORY_CAPS.governance_assessment = 3` (already present per file view — verify).
4. Export enum constants from `src/pages/GovernanceAssessment.tsx` (or its `.enums.ts` sibling if it exists — check first, create sibling if not, to break import cycles like CPPARisk/ADMT).
5. Register in `src/components/refine/fieldEnums.ts` under `governance_assessment: { ... }`.
6. Verify generator prompt already emits ASSESSMENT-register verdict reasons; if not stamped, bump `rev-scope@rc-c.3.1` and record.

Proof leg (via dispatcher, poll to terminal):
- Pick or generate one governance row with ≥1 open item; issue one sequential revision answering 1 item.
- Expected: `qc_rc_1` green, `qc_rc_2` green with verdicts=1 + matching changed_path, snapshot in `report_versions`, statuses moved on `governance_assessments` row.

## Phase 2 — C3.2 CPPA Cyber + ADMT (Limited=3 each)
Both are dormant (cyber emits 0/12, admt unstamped). Install machinery + one **harness fixture** per tool that forces ≥1 open item at first-gen so freeze→revision→green QC can be end-to-end proven.

Code changes (one deploy window after Phase 1 verified green):
1. Add `cppa_cybersecurity`, `cppa_admt` to `CONTRACT_ENABLED_TOOLS`.
2. Add `T_CLASS_FIELDS` blocks for their enumerated posture fields (ADMT's enum set is already in `ADMTChecker.enums.ts` and registered in `fieldEnums.ts`; Cyber needs its own `.enums.ts` sibling if missing).
3. Confirm `ADVISORY_CAPS` = 3 for each; add if missing.
4. Add a **harness-only** first-gen path or fixture flag that injects a synthetic `information_needed` entry into the generated `open_items[]`. Marker: `harness: true` on the row (or a distinct `client_id`) and a comment tag `RC-C3 harness fixture — NOT production`.
5. Register enum leaves in `fieldEnums.ts` (Cyber only, ADMT already registered).

Proof legs (dispatcher, sequential, one per tool):
- Cyber harness row → open_items[0] forced-ask → answer 1 → expect green/green + snapshot.
- ADMT harness row → same shape → same expectation.

## Phase 3 — C3.3 None-class verification (Biometric / IR / DPA / Registration)
**NO contract machinery. NO advisory surface.** Read-only checks:
1. For each of the 4 tools, locate the regeneration path (if any) and dispatch **one harness regen** where a regen path exists; confirm exactly one `report_versions` row is written for that assessment id.
2. DPA: verify byte-identity comment on the placeholder-fill path is present and untouched; no code change.
3. Registration: version history only — confirm regen writes `report_versions`; NO other change.
4. Errata reachability: confirm the errata channel entry (frontend + `regenerate-assessment` errata mode) is reachable and gate-exempt for each of the 4.

Report per tool: assessment id, `report_versions` row id created (or explicit "no regen path"), errata endpoint response code.

## Phase 4 — C3.4 Gate coverage audit (documentation)
Produce one table in the final report:
| Page | Refine entry mechanism | `REVISIONS_ENABLED` gate site | Server-side gate site | Errata exempt? |
Covers all 9 tool pages. Verify via `rg` — no runtime dispatch needed.

## Phase 5 — C3.5 D8 + register sweep
Grep every new user-facing string added in C3 (advisory text, error messages, generator prompt additions) for standalone `\bgaps?\b` and register-shape violations. Any hit blocks green. No new strings unless required.

## Phase 6 — Final report
Per-item table with row ids, deploy timestamps, snapshot version numbers, QC results, and Phase 4 gate table. On green, hand off to RC-D (QL3).

## Constraints / non-negotiables
- **Zero-in-flight** psql check before every deploy window (max 3 deploys total: after Phase 1 code, after Phase 2 code, none after that).
- **No parallel dispatches** — sequential per leg, poll `status` to terminal (`complete`/`failed`/`errata`).
- **Stamp bump** only on prompts that actually change; recorded in `_shared/prompt-version.ts` and in report.
- **Harness fixtures** for Cyber/ADMT clearly labeled and excluded from any production score ledgers.
- **No behavior changes** to None-class tools — Phase 3 is verification only.
- If any leg goes red or a snapshot fails to write, **HALT** and report before continuing — same discipline that recovered RC-C2.

## Open questions to confirm before Phase 1 code
1. Governance `.enums.ts` sibling — create if absent, or is there an existing constants module to anchor to? (I'll grep and confirm before writing.)
2. Cyber `.enums.ts` sibling — same question.
3. For C3.2 harness fixture path: prefer a query-string flag on `run-cppa-cybersecurity` / `run-admt-checker` (`?harness=1`) that appends the synthetic open item post-generation, gated on service-role auth. Confirm this shape before implementing.
4. For C3.3 harness regen: which of the 4 None-class tools currently expose a regen path (vs. one-shot)? I'll audit `regenerate-assessment` dispatch table before executing.

Please confirm the sequence and the four open questions, then I fire Phase 0 immediately and move Phase 1 code+deploy on approval.
