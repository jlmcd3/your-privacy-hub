
-- Wave-10 stall reconciliation — batch 2ec63cd3-dacc-4b2c-9867-7135192e3344.
-- Isolate death cause (from quality_batch_log): after cppa-risk terminated with
-- the contract-drift error at 11:15:27Z, the process_terminations tick rewrote
-- the risk entry but the selfInvoke chain never fired again — zero orchestrator
-- log lines between 11:15:27Z and the operator's cancel at 11:47:30Z. dpia and
-- cppa-admt completed silently at 11:32/11:33Z (child runs finalized directly)
-- and cppa-cyber (tools[3]) never received a dispatch because the freed
-- concurrency slot was never re-observed by decide().

UPDATE quality_batch_runs
SET tool_results = '[
  {
    "tool": "dpia",
    "quality_run_id": "e81945cd-c7c6-4078-9802-348ad6c9300d",
    "run_number": 115,
    "final_status": "complete",
    "score_overall": 84.7,
    "gpt_score_overall": 89,
    "error": null,
    "batch_size": 3,
    "dispatched_at": "2026-07-24T11:15:06.684Z",
    "completed_at": "2026-07-24T11:33:39.801Z",
    "reconciled_post_mortem": true
  },
  {
    "tool": "cppa-admt",
    "quality_run_id": "4691a4bb-1619-410f-ac96-10a325d31bdb",
    "run_number": 99,
    "final_status": "complete",
    "score_overall": 76.5,
    "gpt_score_overall": 89,
    "error": null,
    "batch_size": 2,
    "dispatched_at": "2026-07-24T11:15:17.052Z",
    "completed_at": "2026-07-24T11:32:50.372Z",
    "reconciled_post_mortem": true
  },
  {
    "tool": "cppa-risk",
    "quality_run_id": "f0ef3624-638b-45cf-85f7-f56bfacd05d2",
    "run_number": 122,
    "final_status": "error",
    "score_overall": null,
    "gpt_score_overall": null,
    "error": "Pinned-fixture contract violations for cppa-risk (3/3): sensitive_location_basis / public_privacy_policy_url unknown top-level keys. Contract-drift remediated in a prior turn (shared intake contract now carries both keys).",
    "batch_size": 3,
    "dispatched_at": "2026-07-24T11:15:27.052Z",
    "completed_at": "2026-07-24T11:15:27.591Z"
  },
  {
    "tool": "cppa-cyber",
    "quality_run_id": null,
    "run_number": null,
    "final_status": "never_dispatched",
    "score_overall": null,
    "gpt_score_overall": null,
    "error": "Orchestrator isolate died after cppa-risk termination processing (last log 11:15:27Z, next log 11:47:30Z = operator cancel). concurrency=3 held tools[0..2] in-flight at dispatch; risk terminated freeing a slot but selfInvoke chain never resumed to observe it and dispatch tools[3]=cppa-cyber. Batch cancelled by operator at 11:52:01Z. Reconciled post-mortem — will be re-measured in wave 11.",
    "batch_size": null,
    "dispatched_at": null,
    "reconciled_post_mortem": true
  }
]'::jsonb,
last_error = 'Wave-10 stall — orchestrator selfInvoke chain died after cppa-risk termination processing (11:15:27Z); dpia+admt completed silently, cppa-cyber never dispatched. Reconciled post-mortem 2026-07-24.'
WHERE id = '2ec63cd3-dacc-4b2c-9867-7135192e3344';

INSERT INTO quality_batch_log (run_id, ts, level, tool, message)
VALUES (
  '2ec63cd3-dacc-4b2c-9867-7135192e3344',
  now(),
  'warn',
  NULL,
  'Post-mortem reconciliation: dpia run #115 → complete (84.7 / gpt 89); cppa-admt run #99 → complete (76.5 / gpt 89); cppa-risk run #122 → error (contract drift, remediated); cppa-cyber → never_dispatched (orchestrator isolate death after risk termination — no selfInvoke resumption). Batch status remains cancelled. Wave 11 will re-measure cppa-cyber.'
);
