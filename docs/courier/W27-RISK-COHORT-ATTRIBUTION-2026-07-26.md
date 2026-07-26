# W27-RISK-COHORT-ATTRIBUTION

**Dispatch id:** W27-RISK-COHORT-ATTRIBUTION-2026-07-26  
**Controller tick:** 2026-07-26T00:47Z  
**Scope:** docs-only; SELECT-only DB reads via Lovable query_database; one 499 dedup resend used, succeeded. Discharges the item-95 queued attribution gating new risk deploys.

---

96. **DONE — W27-RISK-COHORT-ATTRIBUTION** @ controller tick 2026-07-26T00:47Z (docs-only; SELECT-only DB reads via Lovable query_database; one 499 dedup resend used, succeeded). Discharges the item-95 queued attribution gating new risk deploys.

    **Recurrence localized:** `qc_r1_4_cohort_determinism` history — FAIL run 137 (w24, doc 93a8313b, score 70.45), PASS 3/3 runs 138 (w25) and 139 (w26), FAIL run 140 (w27, doc 7f0de458) with the IDENTICAL evidence string "resolved cohort April 1, 2030 is hedged near the cite window" — same scenario shape as w24.

    **Per-doc spread (w27 risk, run 140):** 1da388c6 82.5 / c74ee422 79.7 / 7f0de458 74.4 → mean 78.87 ≈ headline 78.85. The −3.85 vs w26 is single-doc-concentrated (7f0de458), consistent with scenario-shape recurrence, NOT wave-wide drift — supports item-95 "within batch-3 noise" call for the other two docs.

    **Telemetry (`_meta.internal.risk_w24a`):** PRESENT on all three w27 risk docs, version `risk-w24-turna-v2-2026-07-25`, stamp `w24-risk-turna@2026-07-25T18:14:00Z`, no errors — but ALL counters 0 on 7f0de458 (cohort_resolved 0, cohort_resolved_near_cite 0, cohort_deadline_confirmed 0; strings_scanned 34). Module booted and scanned; the gate never fired.

    **Offending surfaces located (controller-verified from report_data):** (1) `scope_and_triggers.scope_notes`: "…triggers the April 1, 2030 cybersecurity-audit cohort under 11 CCR § 7121(a) (applicable if 2027 annual gross revenue is under $50M — confirm cohort when 2027 revenue is final)." (2) second "April 1, 2030" occurrence in `cross_tool_recommendations.cybersecurity_audit_rationale`. Same scope_notes string also carries the truncated citation "Cal. Civ. 105(d)" (w27 HIGH, same doc).

    **ROOT CAUSE (design-scoped, mirrors item-95 H7 finding):** W24A-v2 detector/coverage gap — either the walker does not reach `scope_and_triggers.scope_notes` / `cross_tool_recommendations.*`, or the v2 hedge vocabulary does not match the conditional-parenthetical variant ("applicable if … — confirm cohort when …"). NOT a wiring failure. cohort_resolved=0 despite a plainly resolved cohort date in prose says the resolved-cohort anchor pattern itself missed.

    **QUEUED (own deploy-guarded turn):** W24A-v3 — (a) confirm walker coverage of scope_and_triggers + cross_tool_recommendations subtrees; (b) extend hedge detection to conditional-parenthetical variants; (c) pin the doc-7f0de458 scope_notes string verbatim as a regression fixture; (d) same seam/telemetry/fail-open doctrine. Truncated-citation "Cal. Civ. 105(d)" class folds into the risk Class-A citation-audit sibling (separate queue).

    **RISK DEPLOY GATE:** attribution complete; W24A-v3 is the named fix turn and must land + read clean on the following wave before the cohort class is called fixed. T7 step-2 (admt) remains HELD pending T7-PILOT-OPENING-ATTRIBUTION (item 95 queue, separate turn) + CEO checkpoint.

    **Sandbox flag (John):** FRESH controller tick at 00:47Z STILL hit VM disk-full at session create (`useradd: No space left on device`) — the ~21:05Z Desktop restart did NOT clear the sandbox. All backend access this tick via Lovable tools per Backend-access law. No rule deviations; SELECT-only reads + this docs-only commit.
