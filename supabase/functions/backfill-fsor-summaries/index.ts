// Backfills agency_position_summary for existing cppa_fsor_commentary rows.
// POST /backfill-fsor-summaries   (admin-only, x-admin-token required)
// Body: { limit?: number }   — defaults to 50 rows per call; call repeatedly until done.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function generatePositionSummary(
  comment_summary: string,
  agency_response: string,
  regulation_citation: string
): Promise<string> {
  const system =
    "You are a California privacy law analyst writing plain-English summaries of CPPA regulatory positions. " +
    "Return ONLY the summary text — no JSON, no markdown, no preamble.";
  const user =
    `Regulation: ${regulation_citation}\n\n` +
    `What the commenter argued: ${comment_summary}\n\n` +
    `Agency's response (verbatim FSOR text):\n${agency_response}\n\n` +
    `Write 2-3 sentences of plain English stating the Agency's own position on this issue.\n` +
    `Structure: (1) One sentence naming the regulatory issue. ` +
    `(2) One or two sentences stating what the Agency ruled, retained, modified, or rejected — ` +
    `citing the final regulation where possible. ` +
    `Focus ONLY on what the Agency decided. Do not describe what the commenter argued. ` +
    `Write for a compliance professional reading a summary card.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const d = await r.json();
  return (d.content?.[0]?.text ?? "").trim().slice(0, 800);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!ADMIN_TOKEN || (!auth.includes(ADMIN_TOKEN) && xAdmin !== ADMIN_TOKEN)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* no body is fine */ }
  const limit = Math.min(Number(body?.limit ?? 50), 100);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: rows, error: fetchErr } = await admin
    .from("cppa_fsor_commentary")
    .select("id, comment_summary, agency_response, regulation_citation")
    .is("agency_position_summary", null)
    .limit(limit);

  if (fetchErr) return json({ error: fetchErr.message }, 500);
  if (!rows || rows.length === 0) return json({ message: "All rows already backfilled", processed: 0 });

  let updated = 0, failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const summary = await generatePositionSummary(
        row.comment_summary ?? "",
        row.agency_response ?? "",
        row.regulation_citation ?? ""
      );
      if (!summary) { failed++; errors.push(`${row.id}: empty summary`); continue; }

      const { error: updErr } = await admin
        .from("cppa_fsor_commentary")
        .update({ agency_position_summary: summary })
        .eq("id", row.id);

      if (updErr) throw new Error(updErr.message);
      updated++;
    } catch (e) {
      failed++;
      errors.push(`${row.id}: ${String(e).slice(0, 100)}`);
      console.error("backfill row failed:", row.id, e);
    }
  }

  const { count: remaining } = await admin
    .from("cppa_fsor_commentary")
    .select("id", { count: "exact", head: true })
    .is("agency_position_summary", null);

  return json({ updated, failed, remaining: remaining ?? "unknown", errors });
});
