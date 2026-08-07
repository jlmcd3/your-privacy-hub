// ITEM 403 LEG D — shared refinement dependencies for the Governance product.
//
// Mirrors admt-refinement-deps.ts / lia-refinement-deps.ts exactly. The
// generation model is passed in EXPLICITLY by the caller
// (`currentGenerationModel()` resolved at the call site, inside the request
// context) rather than read lazily inside the critic closure — the
// resurrection-bug class: a closure that resolves the model later can fall out
// of the request's AsyncLocalStorage context and silently default to sonnet.
//
// Metering is identical to the other four products: one `api_usage` row per
// model call, attributed by `function_name` suffix (`…:refine_critic` /
// `…:refine_verifier`) with `source_row_id` = the assessment id.
import { recordApiUsage } from "../api-usage.ts";
import { callAnthropicWithContinuation } from "../anthropic-call.ts";
import { currentGenerationModel, currentSourceRowId, generationMaxTokens } from "../generation-model.ts";
import type { RefinementDeps } from "./refinement-core.ts";

/** One line disables the whole critic → verifier → splicer pass. */
export const GOVERNANCE_REFINEMENT_ENABLED = true;

export function makeGovernanceRefinementDeps(
  sourceRowId: string | null,
  /** REQUIRED — the run's resolved generation model. Never defaulted here. */
  generationModel: string,
  fnLabel = "run-governance-assessment",
): RefinementDeps {
  const rowId = () => sourceRowId ?? currentSourceRowId() ?? null;
  const model = generationModel || currentGenerationModel();

  /** CRITIC — Claude, one call, on the run's generation model, metered. */
  const critic = async (system: string, user: string): Promise<string> => {
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
      product: "governance",
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
      product: "governance",
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
