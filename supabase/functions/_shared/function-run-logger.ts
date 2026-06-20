// Shared helper to record per-invocation telemetry into `function_runs`.
// This helper is intentionally fail-open for the caller but fail-loud in logs:
// telemetry failures must never block report generation, and completion/error
// calls insert a fallback row if the initial "running" row could not be created.

export interface FnRunHandle { id: string; function_name: string; startedMs: number; startPayload?: Record<string, unknown>; }

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

const RETRY_DELAYS_MS = [0, 250, 1000];

function messageFor(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function restHeaders() {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return null;
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function wait(ms: number) {
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertViaRest(payload: Record<string, unknown>): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const headers = restHeaders();
  if (!url || !headers) return null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    await wait(RETRY_DELAYS_MS[attempt]);
    try {
      const res = await fetch(`${url}/rest/v1/function_runs?select=id`, {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (res.ok) {
        const parsed = text ? JSON.parse(text) : [];
        return Array.isArray(parsed) ? parsed[0]?.id ?? null : parsed?.id ?? null;
      }
      console.error(`[fn-run-logger] REST insert attempt ${attempt + 1} failed: ${res.status} ${text}`);
    } catch (e) {
      console.error(`[fn-run-logger] REST insert attempt ${attempt + 1} threw:`, e);
    }
  }
  return null;
}

async function updateViaRest(id: string, patch: Record<string, unknown>): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const headers = restHeaders();
  if (!url || !headers) return false;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    await wait(RETRY_DELAYS_MS[attempt]);
    try {
      const res = await fetch(`${url}/rest/v1/function_runs?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      });
      const text = await res.text();
      if (res.ok) return true;
      console.error(`[fn-run-logger] REST update attempt ${attempt + 1} failed: ${res.status} ${text}`);
    } catch (e) {
      console.error(`[fn-run-logger] REST update attempt ${attempt + 1} threw:`, e);
    }
  }
  return false;
}

async function insertRun(supabase: any, payload: Record<string, unknown>, functionName: string): Promise<string | null> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    await wait(RETRY_DELAYS_MS[attempt]);
    try {
      const { data, error } = await supabase
        .from("function_runs")
        .insert(payload)
        .select("id")
        .single();
      if (!error && data?.id) return data.id;
      console.error(`[fn-run-logger] start attempt ${attempt + 1} failed for ${functionName}:`, error ?? "no id returned");
    } catch (e) {
      console.error(`[fn-run-logger] start attempt ${attempt + 1} threw for ${functionName}:`, e);
    }
  }

  const fallbackId = await insertViaRest(payload);
  if (!fallbackId) console.error(`[fn-run-logger] all start attempts failed for ${functionName}`);
  return fallbackId;
}

async function updateRun(supabase: any, id: string, patch: Record<string, unknown>, functionName: string): Promise<boolean> {
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    await wait(RETRY_DELAYS_MS[attempt]);
    try {
      const { error } = await supabase.from("function_runs").update(patch).eq("id", id);
      if (!error) return true;
      console.error(`[fn-run-logger] update attempt ${attempt + 1} failed for ${functionName}:`, error);
    } catch (e) {
      console.error(`[fn-run-logger] update attempt ${attempt + 1} threw for ${functionName}:`, e);
    }
  }

  const ok = await updateViaRest(id, patch);
  if (!ok) console.error(`[fn-run-logger] all update attempts failed for ${functionName}`);
  return ok;
}

export async function startFunctionRun(
  supabase: any,
  functionName: string,
  opts: FnStartOpts = {},
): Promise<FnRunHandle> {
  const startedMs = Date.now();
  const payload = {
    function_name: functionName,
    archetype: opts.archetype ?? null,
    trust_class: opts.trustClass ?? null,
    user_id: opts.userId ?? null,
    invoked_by: opts.invokedBy ?? null,
    status: "running",
    started_at: new Date(startedMs).toISOString(),
    metadata: opts.metadata ?? {},
  };
  const id = await insertRun(supabase, payload, functionName);
  return { id: id ?? "", function_name: functionName, startedMs, startPayload: payload };
}

export async function finishFunctionRun(
  supabase: any,
  run: FnRunHandle,
  opts: FnFinishOpts = {},
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const patch = {
    status: opts.status ?? "success",
    finished_at: finishedAt,
    duration_ms: Date.now() - run.startedMs,
    source_table: opts.sourceTable ?? null,
    source_row_id: opts.sourceRowId ?? null,
    metadata: opts.metadata ?? (run.startPayload?.metadata as Record<string, unknown> | undefined) ?? {},
  };

  if (run.id) {
    await updateRun(supabase, run.id, patch, run.function_name);
    return;
  }

  await insertRun(supabase, {
    ...(run.startPayload ?? { function_name: run.function_name, status: "running", metadata: {} }),
    ...patch,
    started_at: new Date(run.startedMs).toISOString(),
  }, run.function_name);
}

export async function failFunctionRun(
  supabase: any,
  run: FnRunHandle,
  err: unknown,
  opts: { metadata?: Record<string, unknown> } = {},
): Promise<void> {
  const patch = {
    status: "error",
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - run.startedMs,
    error_message: messageFor(err).slice(0, 2000),
    metadata: opts.metadata ?? (run.startPayload?.metadata as Record<string, unknown> | undefined) ?? {},
  };

  if (run.id) {
    await updateRun(supabase, run.id, patch, run.function_name);
    return;
  }

  await insertRun(supabase, {
    ...(run.startPayload ?? { function_name: run.function_name, metadata: {} }),
    ...patch,
    started_at: new Date(run.startedMs).toISOString(),
  }, run.function_name);
}
