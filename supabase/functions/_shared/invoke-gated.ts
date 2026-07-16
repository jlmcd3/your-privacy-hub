// Raw-fetch invoker for verifyCaller-gated edge functions.
//
// WHY: supabase-js `functions.invoke`, when called server-to-server with a
// service-role client, silently drops the `Authorization: Bearer <SERVICE_ROLE_KEY>`
// header on the outbound request. Any callee fronted by `verifyCaller` returns
// 401 "missing_authorization"; the SDK surfaces this as a generic non-2xx and,
// when invoked fire-and-forget, the failure disappears entirely.
//
// This helper posts directly with an explicit service-role bearer + apikey so
// the callee's verifyCaller() accepts the request as an internal caller.
// Callers should await it or attach explicit `.catch` logging.
export async function invokeGated(
  fn: string,
  body: Record<string, unknown>,
  opts: { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "apikey": key,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = (await res.text()).slice(0, 500);
    if (!res.ok) {
      console.error(JSON.stringify({
        evt: "invoke_gated_non_2xx", fn, status: res.status, body: text,
      }));
      return { ok: false, status: res.status, body: text };
    }
    return { ok: true, status: res.status, body: text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ evt: "invoke_gated_threw", fn, error: msg }));
    return { ok: false, status: 0, body: "", error: msg };
  }
}
