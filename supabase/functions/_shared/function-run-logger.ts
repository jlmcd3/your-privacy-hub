// Shared helper to record per-invocation telemetry into `function_runs`.
// Usage:
//   const run = await startFunctionRun(supabase, "check-biometric-compliance",
//                   { archetype: "streaming", userId, invokedBy: "user" });
//   try { ...; await finishFunctionRun(supabase, run, { status: "success",
//                   sourceTable: "biometric_assessments", sourceRowId: savedId }); }
//   catch (e) { await failFunctionRun(supabase, run, e); }

export interface FnRunHandle { id: string; function_name: string; startedMs: number; }

export interface FnStartOpts {
  archetype?: string;
  trustClass?: string;
  userId?: string | null;
  invokedBy?: string;
  metadata?: Record<string, unknown>;
}
export interface FnFinishOpts {
  status?: "success" | "partial" | "error";
  sourceTable?: string;
  sourceRowId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function startFunctionRun(
  supabase: any,
  functionName: string,
  opts: FnStartOpts = {},
): Promise<FnRunHandle> {
  try {
    const { data, error } = await supabase
      .from("function_runs")
      .insert({
        function_name: functionName,
        archetype: opts.archetype ?? null,
        trust_class: opts.trustClass ?? null,
        user_id: opts.userId ?? null,
        invoked_by: opts.invokedBy ?? null,
        status: "running",
        metadata: opts.metadata ?? {},
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error(`[fn-run-logger] start failed for ${functionName}:`, error);
      return { id: "", function_name: functionName, startedMs: Date.now() };
    }
    return { id: data.id, function_name: functionName, startedMs: Date.now() };
  } catch (e) {
    console.error(`[fn-run-logger] start threw for ${functionName}:`, e);
    return { id: "", function_name: functionName, startedMs: Date.now() };
  }
}

export async function finishFunctionRun(
  supabase: any,
  run: FnRunHandle,
  opts: FnFinishOpts = {},
): Promise<void> {
  if (!run.id) return;
  try {
    await supabase.from("function_runs").update({
      status: opts.status ?? "success",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - run.startedMs,
      source_table: opts.sourceTable ?? null,
      source_row_id: opts.sourceRowId ?? null,
      metadata: opts.metadata ?? {},
    }).eq("id", run.id);
  } catch (e) {
    console.error(`[fn-run-logger] finish failed for ${run.function_name}:`, e);
  }
}

export async function failFunctionRun(
  supabase: any,
  run: FnRunHandle,
  err: unknown,
  opts: { metadata?: Record<string, unknown> } = {},
): Promise<void> {
  if (!run.id) return;
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  try {
    await supabase.from("function_runs").update({
      status: "error",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - run.startedMs,
      error_message: message.slice(0, 2000),
      metadata: opts.metadata ?? {},
    }).eq("id", run.id);
  } catch (e) {
    console.error(`[fn-run-logger] fail-update errored for ${run.function_name}:`, e);
  }
}
