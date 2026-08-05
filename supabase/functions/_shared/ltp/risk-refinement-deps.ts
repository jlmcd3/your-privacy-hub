// ITEM 378 (CORRECTION) — shared refinement dependencies for cppa-risk.
//
// The critic/verifier callers were previously private to
// run-cppa-risk-assessment/index.ts (the legacy finalize path), so the ROUTED
// LTP engine could never run the refinement pass. They now live here and are
// injected into the shared generator by whichever shell owns the run.
//
// No behaviour change to the refinement module itself: same models, same
// metering attribution (`…:refine_critic` / `…:refine_verifier`,
// `source_row_id` = the assessment id).
import { recordApiUsage } from "../api-usage.ts";
import { callAnthropicWithContinuation } from "../anthropic-call.ts";
import {
  currentGenerationModel,
  currentSourceRowId,
  generationMaxTokens,
} from "../generation-model.ts";
import type { RefinementDeps } from "./refinement-core.ts";

/** One line disables the whole critic → verifier → splicer pass. */
export const RISK_REFINEMENT_ENABLED = true;

export function makeRiskRefinementDeps(
  sourceRowId: string | null,
  fnLabel = "run-cppa-risk-assessment",
): RefinementDeps {
  const rowId = () => sourceRowId ?? currentSourceRowId() ?? null;

  /** CRITIC — Claude, one call, on the run's generation model, metered. */
  const critic = async (system: string, user: string): Promise<string> => {
    const model = currentGenerationModel();
    const startedMs = Date.now();
    const r = await callAnthropicWithContinuation({
      model,
      system,
      user,
      maxTokens: generationMaxTokens(model, 8000),
      label: `${fnLabel}:refine_critic`,
    });
    recordApiUsage({
      function_name: `${fnLabel}:refine_critic`,
      product: "cppa_risk_assessment",
      model,
      // deno-lint-ignore no-explicit-any
      input_tokens: (r as any).inputTokens ?? null,
      // deno-lint-ignore no-explicit-any
      output_tokens: (r as any).outputTokens ?? null,
      duration_ms: Date.now() - startedMs,
      source_row_id: rowId(),
    });
    return r.text ?? "";
  };

  /** VERIFIER — GPT-4o, one call, metered the same way. */
  const verifier = async (system: string, user: string): Promise<string> => {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY not set");
    const startedMs = Date.now();
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) throw new Error(`GPT-4o ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    recordApiUsage({
      function_name: `${fnLabel}:refine_verifier`,
      product: "cppa_risk_assessment",
      model: "gpt-4o",
      input_tokens: d?.usage?.prompt_tokens ?? null,
      output_tokens: d?.usage?.completion_tokens ?? null,
      duration_ms: Date.now() - startedMs,
      source_row_id: rowId(),
    });
    return d.choices?.[0]?.message?.content ?? "";
  };

  return { critic, verifier };
}
