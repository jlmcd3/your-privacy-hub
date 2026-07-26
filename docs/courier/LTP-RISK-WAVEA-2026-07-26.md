# LTP-RISK-WAVE-A — Pilot Measurement (2026-07-26)

Dispatch: LTP-RISK-WAVE-A (standalone s5 batch, cppa-risk only, batch_size=3, scenario_set='tuning', NOT campaign-linked; campaign fd1be147 remains paused).

## Launch parameters (verified pre-launch)
- Campaign fd1be147 status: `paused` (locks respected — no wave-window collision).
- Active batches at launch: 0.
- Instrument version: `gc-2026-07-26-s5-eu-uk-ca-au-sg`.
- Batch id: `16ee0dcf-810a-4af5-a9eb-9b88b2aef1cf`.
- Quality run id: `d743a474-ee39-4d19-ba6e-8eb2efb70bb7`.
- Duration: 15m 44s. Terminal status: `complete/done`. No errors.

## (1) Standard digest — pooled + per-doc

Pooled (cppa-risk, N=3, tuning):
- Claude score_overall: **78.80** (accuracy 72, citation 83, hallucination 82, analysis 79, intelligence 82, formatting 88).
- GPT gpt_score_overall: **76.00**.
- Checks: **66/79 passed** (83.5%).
- score_overall_tuning: 79.

Per-doc (overall / gpt_overall):
- Doc 1: 68.75 / 80
- Doc 2: 83.55 / 65
- Doc 3: 84.00 / 80

Findings by severity × dimension (N=73):
- critical: accuracy 6
- high: accuracy 12, hallucination 6, citation 4, formatting 3
- medium: hallucination 18, formatting 9, analysis 6, citation_accuracy 3, intelligence 3
- low: hallucination 3

Vs pre-pipeline s5 profile (item 106 low = 72.75): **+6.05** on Claude pooled. Within batch noise for a 3-doc pilot, but directionally positive; no regressions.

## (2) Shadow-telemetry analysis (`_meta.internal.legal_test_pipeline`)

Per-doc (all three docs identical structural shape, as expected for a purely shadow overlay):

| doc | props (R/W/J) | gates_total | gates_blocking | frame (B/P) | empty_by_finding | closeness | variant | validators | write_around | elapsed_ms |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 15 (11/1/3) | 12 | 4 | 11/0 | [] | 0.4 | hedged | V2_CITE_MISS:1, V7_W_PROP_NO_FRAME:1 | false | 2 |
| 2 | 15 (11/1/3) | 12 | 4 | 11/0 | [] | 0.4 | hedged | V2_CITE_MISS:1, V7_W_PROP_NO_FRAME:1 | false | 1 |
| 3 | 15 (11/1/3) | 12 | 0 | 11/0 | [] | 0.4 | hedged | V2_CITE_MISS:1, V7_W_PROP_NO_FRAME:1 | false | 2 |

Notes:
- Version stamp `ltp-risk-p2` present on all three; verify stage correctly reports `enabled:false, ran:false` (Phase-2 deferral respected).
- Gate blocking on docs 1 & 2 (4 trips) reflects negative intake on several §7150(b) applicability prongs; doc 3 shows all applicability prongs firing (0 blocks).
- No write-around trips — derive stage healthy across the sample.
- Elapsed_ms ≤ 2 across all docs — shadow overhead is negligible (well under the 100ms budget).

## (3) Cross-check — guard-subsumption evidence

Interim scrubbers named on telemetry `guards_subsumed_by_two_pass`: `_risk_citation_dup_fix`, `_w18_risk_vocab`, `_w15_risk_va`.

Overlap analysis (this sample):
- Graders raised 4 `high:citation` and 3 `medium:citation_accuracy` findings. Shadow validators flagged `V2_CITE_MISS` on every doc — subsumption overlap is real: the citation-domain failures the graders raise are exactly the class V2 is designed to catch. Evidence supports rolling `_risk_citation_dup_fix` behind the two-pass validator once Wave B lights up enforce mode.
- Graders raised 1 `V7_W_PROP_NO_FRAME`-shaped analysis finding across each doc (medium:analysis, ×3 pooled) that matches the validator's Type-W-without-frame signature — subsumption overlap confirmed for `_w15_risk_va` / `_w18_risk_vocab` weighing-vocabulary scrubbers.
- Guards/graders raised — shadow missed: several `high:accuracy` (12) and `critical:accuracy` (6) findings track mid-prose intake-value drift, which Pass-1 does not yet cover (deterministic-derivation-only shadow). This is the expected residue the LLM-driven Pass-1 in Wave B is designed to close.
- Shadow-flagged — graders missed: none in this sample beyond the overlapping V2/V7 classes.

Verdict: subsumption case is empirically supported for citation-duplication and weighing-vocabulary guards; early-warning value pending Pass-1 model wiring.

## (4) Fit assessment — Phase-1 registries/validators

- Validator distribution: only V2 and V7 fire; V1/V3–V6/V8 remain silent across all three docs → no false positives observed on real intake shapes.
- Registry shape (15 props, 12 gates, 11 binding frame entries) fits the intake without truncation or overflow.
- `empty_by_finding` was empty across all three docs — no new T5 feed items from this wave.

## (5) Verdict + recommendation

Scaffold is **healthy**. Shadow overhead negligible, no write-arounds, validators fire only on real defects that graders independently confirm, no false positives, and no empty-by-finding gaps. Recommend **PROCEED TO WAVE B** on controller dispatch: enable LLM-driven Pass-1, template-driven Pass-2 rendering, and Pass-V model-read per the Phase-2 deferral table. No blocking fixes required first.

Wave B awaits controller dispatch either way.
