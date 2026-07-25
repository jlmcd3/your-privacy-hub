# GOVERNANCE-T6-FIX-TURN — Courier (2026-07-25)

**Dispatch id:** GOVERNANCE-T6-FIX-TURN-2026-07-25
**Target:** `run-governance-assessment` ONLY (deploy-guarded, single-function).
**Discharges:** T6-NONCPPA-MEASUREMENT-BATCH-1 (ledger item 81) governance
per-tool backlog items **(a) citation_misapplied** (Class A citation audit) and
**(b) unsupported_business_claim** (Class B business-claim scrub). Item 81(c)
`qc_r1_8_additional_context` is **NOT** this turn (own turn).
**Mirrors:** ledger items **89 (LIA-T6-FIX-TURN)** and **92 (DPIA-T6-FIX-TURN)**
exactly, adapted to governance.

---

## 1. Seam

Composition order in `run-governance-assessment/index.ts` (verified by re-read):

```
model output
  → GOVERNANCE-REGISTRY-WIRING (_w1_governance_wire)   [W1, unchanged]
  → GOVERNANCE-T6-FIX          (_gov_t6_fix)           [THIS TURN, NEW]
  → LEAK-PREV-P1 emit gate     (emit-gate.ts)          [unchanged]
  → LEAK-PREV-P2 serializer    (report-serialize.ts +  [unchanged]
                                report-schemas/governance.ts)
  → persist reportData
```

The emit gate sees the neutralized surface, and `_meta.internal.gov_t6fix`
survives via the P2 whitelist serializer's `_meta.internal` reduction. The W1
wire, emit gate, and serializer are composed downstream only — **not modified**.

## 2. Classes (per doctrine)

**Class A — key-selection-mismatch citation audit** (port of W24 admt Class A):

- Verified nodes (proposition_key ∈ `GOVERNANCE_VERIFIED_AUTHORITIES` and
  `citation_verified === true`) → **preserved untouched**.
- Write-around nodes (proposition_key ∈ `GOVERNANCE_UNANCHORED_PROPOSITIONS`
  and `write_around === true`) → **left alone** (already nulled by W1).
- Unresolvable `proposition_key` (present but neither verified nor
  write-around) → `citation`, `subsection`, `verbatim_quote` set to `null`;
  `citation_verified = false`; `pinpoint_omitted = true`.
- No `proposition_key` and citation string is syntactically truncated
  (unbalanced parens, trailing `,`/`-`/`(`, bare `Art.`/`Article`/`§`) → same
  null-and-flag.
- **Omission over invention.** The module NEVER completes, substitutes, or
  invents a citation string.

**Class B — unsupported-business-claim downgrade** (port of W24 Class B):

- Recursive walker with `SKIP_SUBTREE_KEYS` and `ANCHOR_KEYS` aligned to the
  W1 governance wire (governance-tuned: adds `regulatory_basis_v2` to
  anchors so W1's regulatory-basis payload is never treated as prose).
- Trigger: `\b(confirms?|shows?|establishes?|demonstrates?|proves?|verifies)\b`.
- Downgrade sentence: `"The organisation should confirm whether the described
  position applies here."` — **never contains "information needed"** (RULE 2.7
  S1 preserved).
- Support test: content tokens (len ≥ 4, minus governance-tuned stopwords
  including `governance`, `policy`, `programme`, `framework`, `compliance`,
  `accountability`, `oversight`, `controls`, `safeguards`, `roles`, etc.)
  must appear in the flattened governance intake blob.
- Idempotent via neutral-sentence guard (`sent === NEUTRAL_DOWNGRADE` skips).

## 3. Doctrine — whole-sentence excision (item 84c)

`splitSentences` (`/[^.!?]+[.!?]+|\S[^.!?]*$/g`) + `rejoin`. Every downgrade
consumes the entire sentence from start boundary through terminal punctuation
inclusive; no partial excision, no splice residue. Regression-pinned by the
"Doctrine: whole-sentence excision, no splice residue" test.

## 4. Telemetry

Written to `_meta.internal.gov_t6fix` (survives the P2 serializer):

```ts
{
  version, stamp, build_stamp,
  classA_pinpoint_substitutions,   // verified nodes observed (already done by W1)
  classA_pinpoint_omissions,       // unresolvable / truncated → nulled
  classB_downgrades,
  classB_preserved,
  sentences_excised,
  strings_scanned,
  errors,
}
```

## 5. Fail-open

Every helper wrapped in `try/catch`; module entry `applyGovT6Fix` never throws.
The `index.ts` wire itself is inside a guarded `try/catch` that logs and
continues, so availability is never blocked.

## 6. Stamps (strictly-earlier rule, item-51 doctrine)

- Sandbox clock at authoring: **2026-07-25T23:46:25Z**.
- Module stamp `GOV_T6_FIX_STAMP` = **`gov-t6fix@2026-07-25T23:47:00Z`**.
- `BUILD_STAMP` = **`gov-t6fix@2026-07-25T23:48:00Z`**.
- Deploy confirmed at **2026-07-25T23:48:29Z** (`Successfully deployed edge
  functions: run-governance-assessment`).
- Ordering: module stamp < BUILD_STAMP < deploy time ✓.

Prior stage stamps echoed unchanged in boot logs (index.ts head):

```
[run-governance-assessment] boot build_marker=doc-y-7 build_stamp=gov-t6fix@2026-07-25T23:48:00Z
[run-governance-assessment] boot governance-registry-wiring@2026-07-25T14:03:54Z registry_loaded=governance-va-w1-2026-07-25
[run-governance-assessment] boot gov-t6fix@2026-07-25T23:47:00Z stage=post-w1 pre-emitgate
```

(Cold-start invocation on next scheduled batch will surface these to
edge_function_logs; deploy manifest confirms binary uptake at 23:48:29Z.)

## 7. Tests — `deno test _gov_t6_fix.test.ts` (green)

15 tests mirroring the DPIA/LIA pin list (Class A truncated/unresolved/
verified/write-around; Class B downgrade/preserved/no-"information needed";
whole-sentence excision; anchor-key immunity; reserved-subtree immunity;
idempotency; fail-open; telemetry; `_meta.internal` preservation;
truncated-citation detector unit).

```
running 15 tests from ./_gov_t6_fix.test.ts
Class A: truncated 'Art. 5(' citation is nulled ... ok (1ms)
Class A: unresolvable key nulls invented pinpoint ... ok (0ms)
Class A: verified node (already substituted by W1) preserved ... ok (0ms)
Class A: write-around node left alone ... ok (0ms)
Class B: unsupported claim downgraded, prior sentence intact ... ok (1ms)
Class B: intake-supported claim preserved ... ok (0ms)
Class B: downgrade text does not use 'information needed' ... ok (0ms)
Doctrine: whole-sentence excision, no splice residue ... ok (0ms)
Anchor keys (citation/verbatim_quote) never treated as prose ... ok (0ms)
Reserved subtrees (_meta, engagement_map, annotations) untouched ... ok (0ms)
Idempotent: second pass makes no additional content changes ... ok (0ms)
Fail-open on malformed input ... ok (0ms)
Telemetry: _meta.internal.gov_t6fix written ... ok (0ms)
_meta.internal preexisting keys preserved ... ok (0ms)
isTruncatedCitation: shapes ... ok (0ms)

ok | 15 passed | 0 failed (13ms)
```

## 8. Deploy-guard snapshot

Pre-deploy (23:48:15Z) and post-authoring (23:46:25Z) live query against
Lovable Cloud:

```sql
SELECT 'qbr', count(*) FROM quality_batch_runs
  WHERE status IN ('running','in_progress','queued','pending');   -- → 0
SELECT 'qr',  count(*) FROM quality_runs
  WHERE status IN ('running','in_progress','queued','pending');   -- → 0
```

Both zero at both ticks. Clock 23:48:29Z is well before the wave-27
`2026-07-26T00:05:00Z` hard cutoff.

## 9. Five-lens review (team-reviewed, incl. REPORT FLOW & PLAIN LANGUAGE)

- **Correctness** — mirrors items 89/92 exactly with governance registry keys,
  W1 skip/anchor alignment, and governance-tuned stopwords. 15/15 tests green.
- **Availability** — every helper + module entry + `index.ts` wire is fail-open;
  no code path can block emission.
- **Doctrine (item 84c)** — regression-pinned "no splice residue" test proves
  whole-sentence excision on multi-sentence prose.
- **Report flow & plain language** — the neutral downgrade
  ("The organisation should confirm whether the described position applies
  here.") is a single grammatical sentence in customer voice, replaces the
  assertive sentence in place, and never leaks "information needed" or
  internal-reasoning phrasing. Preserved sentences and unrelated prose keep
  their original ordering; `_meta.internal.gov_t6fix` never surfaces to the
  reader (killed by the P2 whitelist serializer per the same rule that hides
  every other `_meta.internal.*` telemetry key).
- **Instrument integrity** — no rubric/grader/golden/contract/fixture/sample/
  registry/corpus edits; instrument `gc-2026-07-25-s4-eu-uk-ca-au-sg` remains
  FROZEN.

## 10. Prohibited-surfaces confirmation

Zero edits to: rubric, grader, golden, contract, fixture, sample, registry,
corpus, wave harness, any CPPA function, any other edge function, T7 opening
surfaces (risk pilot untouched), pricing, payment, design tokens, customer
revision path, signup, `src/integrations/supabase/*`.

## 11. Queued siblings (for own future turns)

- `generate-dpa` — Class B business-claim scrub port (T6 item 81(b) DPA analog).
- `generate-ir-playbook` — Class B business-claim scrub port (T6 item 81(b) IR analog; ir-playbook Class A already NOT indicated by item 81 findings).
- Governance Class A **sibling audit** for W1-verified nodes remains QUEUED.
- `qc_r1_8_governance_additional_context` fix — own turn (item 81(c)).
- `h6_admt_governing_anchor` — QUEUED post-wave-27.
- T7 step-2 admt — HELD.

## 12. Files changed (single atomic commit)

- `supabase/functions/run-governance-assessment/_gov_t6_fix.ts` (new)
- `supabase/functions/run-governance-assessment/_gov_t6_fix.test.ts` (new)
- `supabase/functions/run-governance-assessment/index.ts` (BUILD_STAMP + 3-line boot line + ~13-line guarded wire block)
- `docs/courier/GOVERNANCE-T6-FIX-TURN-2026-07-25.md` (this file)
- `docs/pipeline-state.md` (item 94 + header restamp)
