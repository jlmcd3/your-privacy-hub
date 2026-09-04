// Admin-only utility: upsert verbatim statutory provisions into public.provision_texts,
// and probe outbound fetches to official legislature sites.
//
// POST { rows: [{ key, citation, jurisdiction, verbatim_excerpt, status?, plain_requirements? }] }
// POST { probe: ["https://..."] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  if (!ADMIN_TOKEN || (!auth.includes(ADMIN_TOKEN) && xAdmin !== ADMIN_TOKEN)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (Array.isArray(body.probe)) {
    const results: Record<string, unknown> = {};
    for (const url of body.probe as string[]) {
      try {
        const r = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
            accept: "text/html,application/xhtml+xml,application/pdf,*/*",
          },
        });
        const txt = await r.text();
        results[url] = { status: r.status, len: txt.length, head: txt.slice(0, 200) };
      } catch (e) {
        results[url] = { error: String(e).slice(0, 200) };
      }
    }
    return json({ ok: true, probe: results });
  }

  if (Array.isArray(body.fetch)) {
    const out: Record<string, string> = {};
    for (const url of body.fetch as string[]) {
      try {
        const r = await fetch(url, {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36",
          },
        });
        out[url] = (await r.text()).slice(0, 400000);
      } catch (e) {
        out[url] = `ERROR ${String(e).slice(0, 200)}`;
      }
    }
    return json({ ok: true, docs: out });
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows || rows.length === 0) return json({ error: "no rows" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const payload = rows.map((r: any) => ({
    key: r.key,
    citation: r.citation,
    jurisdiction: r.jurisdiction,
    verbatim_excerpt: r.verbatim_excerpt,
    status: r.status ?? "approved",
    plain_requirements: r.plain_requirements ?? [],
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("provision_texts")
    .upsert(payload, { onConflict: "key" })
    .select("key, jurisdiction, status");

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, upserted: data?.length ?? 0, keys: data?.map((d: any) => d.key) });
});
