// QB-P17 — stop-rule certification gate + cost basis constants.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyStopRule,
  CAMPAIGN_EST_CENTS_PER_DOC,
  CAMPAIGN_TOKEN_BASIS,
  GPT_DISAGREEMENT_MAX,
  type CampaignToolState,
} from "../../../supabase/functions/quality-batch-orchestrator/index.ts";

const s = (over: Partial<CampaignToolState> = {}): CampaignToolState => ({
  batch_size: 3, max_runs: 6, runs_completed: 0, consecutive_ge98: 0,
  active: true, retired_reason: null, ...over,
});

Deno.test("QB-P17 item 3: ineligible run still counts against runs_completed but resets streak", () => {
  const prev = s({ runs_completed: 3, consecutive_ge98: 1 });
  const next = applyStopRule(prev, 99, /*eligible=*/ false);
  assertEquals(next.runs_completed, 4, "graded run must consume a slot");
  assertEquals(next.consecutive_ge98, 0, "streak must reset when ineligible");
  assertEquals(next.active, true);
  assertEquals(next.retired_reason, null);
});

Deno.test("QB-P17 item 3: eligible run at >=98 increments streak", () => {
  const prev = s({ runs_completed: 3, consecutive_ge98: 1 });
  const next = applyStopRule(prev, 99, /*eligible=*/ true);
  assertEquals(next.runs_completed, 4);
  assertEquals(next.consecutive_ge98, 2);
  assertEquals(next.retired_reason, "certified");
});

Deno.test("QB-P17 item 3: two consecutive ineligible high scores do NOT certify", () => {
  let state = s();
  state = applyStopRule(state, 99, false);
  state = applyStopRule(state, 99, false);
  assertEquals(state.consecutive_ge98, 0);
  assertEquals(state.retired_reason, null);
  assertEquals(state.active, true);
});

Deno.test("QB-P17 item 7: cost basis constants reflect Opus pricing", () => {
  assertEquals(CAMPAIGN_EST_CENTS_PER_DOC, 51);
  assertEquals(
    CAMPAIGN_TOKEN_BASIS,
    "estimate:claude-opus-4-6@9k_in+5k_out_per_doc@$15/M_in+$75/M_out",
  );
  assertEquals(GPT_DISAGREEMENT_MAX, 10);
});
