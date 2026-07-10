/**
 * Prompt-version stamp for product functions.
 *
 * Each product function's report_data should carry a `_meta.prompt_version`
 * so a report can be traced back to the exact deployed function build that
 * produced it. This is the foundation for the future QL2 findings ledger.
 *
 * The stamp is composed of:
 *   - `deployment_id`: Supabase/Deno Deploy `DENO_DEPLOYMENT_ID` (auto-populated
 *      per deployment; resolvable back to a commit via the deploy log).
 *   - `product_version`: the function's own internal version string (e.g.
 *      IR_VERSION in generate-ir-playbook) so per-prompt changes are captured
 *      even when the deployment id doesn't shift.
 *   - `generated_at`: ISO timestamp of stamp creation.
 */
export interface PromptVersionStamp {
  deployment_id: string | null;
  product: string;
  product_version: string | null;
  generated_at: string;
}

export function stampPromptVersion(
  product: string,
  productVersion?: string | null,
): PromptVersionStamp {
  return {
    deployment_id: Deno.env.get("DENO_DEPLOYMENT_ID") ?? null,
    product,
    product_version: productVersion ?? null,
    generated_at: new Date().toISOString(),
  };
}
