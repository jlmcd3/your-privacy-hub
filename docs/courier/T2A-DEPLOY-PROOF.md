Label: T2A-DEPLOY-PROOF
Dispatch: BIO-REG-W1 T2(a) — deploy/boot-log evidence
Timestamp: 2026-07-24T01:45:00Z
Mode: Read-only ACK; no product changes.

# T2(a) Deploy Proof — check-biometric-compliance

Commit under proof: c3ade02 ("Wired biometric registry")
BUILD_STAMP (source): `bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z`
  - Declared at supabase/functions/check-biometric-compliance/index.ts:8
  - `export const BUILD_STAMP = "bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z";`

Deploy action: `deploy_edge_functions(["check-biometric-compliance"])` executed 2026-07-24T01:43:20Z (approx, per platform response "Successfully deployed edge functions: check-biometric-compliance").

## Boot-log excerpt (cold start after deploy)

Source: platform edge-function logs for `check-biometric-compliance`, function_id `60a69a67-41c7-4b70-9be5-63dbed39f44f`.

```
2026-07-24T01:43:23Z  Boot   booted (time: 35ms)
2026-07-24T01:43:23Z  INFO   {"evt":"bio_build_stamp","build_stamp":"bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z"}
2026-07-24T01:43:23Z  INFO   [qb9-rcb1] check-biometric-compliance build active · core=3.10.3-w3-t4-inference-discipline · build_stamp=bio-reg-w1-t2a-registry-wired@2026-07-24T01:30:00Z
```

Both the structured `bio_build_stamp` event and the human-readable boot line carry the T2(a) stamp on the same cold-start boot (timestamps identical to the ms), satisfying the standing rule (stamps + boot-log proof for every function edit).

## Confirmations

- Source BUILD_STAMP literal at HEAD (c3ade02) equals the stamp emitted by the running instance at 01:43:23Z.
- No other function was modified in this evidence turn; only this courier doc is being committed.
- No changes to function logic, goldens, contracts, pricing, payment, marketing copy, design tokens, customer revision path, or signup.

## Standing state

- HOLD is not in force for T2(a) follow-ons; Turn (b) (golden refresh + pinpoint self-consistency CI test + biometric-only measurement batch) remains queued per the original CEO GO but is NOT executed in this turn.
- Register #16 (Indiana pinpoint verification prerequisite) and #17 (PDF state persistence) remain open.
