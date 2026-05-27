// Orchestrator: fans out per-regulator-ingestion calls in batches of `batch_size`
// up to `total_rows`, using offset to slice the discovered URL list across calls.
//
// Body: {
//   regulator_canonical: string,
//   total_rows?: number,     // default 50
//   batch_size?: number,     // default 8
//   dry_run?: boolean,       // default false
//   parallel?: boolean       // default false (sequential, gap_ms between calls)
//   gap_ms?: number          // default 5000 sequential gap
// }
// Returns: { batches: [...], summary: {...} }
// Auth: Admin only via x-admin-token header matching ADMIN_SECRET_TOKEN.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const regulator_canonical: string = body.regulator_canonical;
  const total_rows: number = Number(body.total_rows ?? 50);
  const batch_size: number = Number(body.batch_size ?? 8);
  const dry_run: boolean = Boolean(body.dry_run ?? false);
  const parallel: boolean = Boolean(body.parallel ?? false);
  const gap_ms: number = Number(body.gap_ms ?? 5000);

  if (!regulator_canonical) {
    return new Response(JSON.stringify({ error: "regulator_canonical required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const fnUrl = `${supaUrl}/functions/v1/per-regulator-ingestion`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const numBatches = Math.ceil(total_rows / batch_size);
  const batches: Array<{ offset: number; max_rows: number }> = [];
  for (let i = 0; i < numBatches; i++) {
    batches.push({ offset: i * batch_size, max_rows: Math.min(batch_size, total_rows - i * batch_size) });
  }

  const callBatch = async (b: { offset: number; max_rows: number }) => {
    try {
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
          "x-admin-token": adminToken!,
        },
        body: JSON.stringify({
          regulator_canonical,
          max_rows: b.max_rows,
          offset: b.offset,
          dry_run,
        }),
        signal: AbortSignal.timeout(160_000),
      });
      const j = await r.json().catch(() => ({}));
      return { offset: b.offset, ok: r.ok, status: r.status, counts: j.counts, run_id: j.run_id, errors: j.errors };
    } catch (e) {
      return { offset: b.offset, ok: false, error: (e as Error).message };
    }
  };

  const results: Array<Record<string, unknown>> = [];
  if (parallel) {
    const out = await Promise.all(batches.map(callBatch));
    results.push(...out);
  } else {
    for (const b of batches) {
      const out = await callBatch(b);
      results.push(out);
      // If a batch discovered 0 rows, stop (end of pages)
      const c = (out as { counts?: { discovered?: number } }).counts;
      if (c && (c.discovered ?? 0) === 0) break;
      if (gap_ms > 0) await new Promise((res) => setTimeout(res, gap_ms));
    }
  }

  const sum = results.reduce((acc, r) => {
    const c = (r as { counts?: Record<string, number> }).counts || {};
    acc.discovered += c.discovered || 0;
    acc.matched += c.matched || 0;
    acc.inserted += c.inserted || 0;
    acc.failed += c.failed || 0;
    acc.llm_calls += c.llm_calls || 0;
    return acc;
  }, { discovered: 0, matched: 0, inserted: 0, failed: 0, llm_calls: 0 });

  return new Response(JSON.stringify({
    ok: true,
    regulator_canonical,
    requested_rows: total_rows,
    batches_run: results.length,
    summary: sum,
    batches: results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
