import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function checkUrl(url: string): Promise<"valid" | "dead"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    // Some servers don't support HEAD properly — retry as GET on 405
    if (res.status === 405) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    }
    clearTimeout(timeout);
    if (res.status === 404 || res.status === 410) return "dead";
    return "valid";
  } catch (_e) {
    clearTimeout(timeout);
    return "dead";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rows, error } = await supabase
      .from("li_tracker_entries")
      .select("id, source_url")
      .not("source_url", "is", null);

    if (error) throw error;

    const total = rows?.length ?? 0;
    let checked = 0;
    let nulled = 0;
    let valid = 0;

    console.log(`validate-li-source-urls: starting check of ${total} URLs`);

    const BATCH = 20;
    for (let i = 0; i < total; i += BATCH) {
      const batch = rows!.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (row) => ({ row, status: await checkUrl(row.source_url as string) }))
      );

      const deadIds = results.filter((r) => r.status === "dead").map((r) => r.row.id);
      valid += results.length - deadIds.length;
      nulled += deadIds.length;
      checked += results.length;

      if (deadIds.length > 0) {
        const { error: updateErr } = await supabase
          .from("li_tracker_entries")
          .update({ source_url: null })
          .in("id", deadIds);
        if (updateErr) console.error("update error:", updateErr.message);
      }

      console.log(`batch ${Math.floor(i / BATCH) + 1}: checked ${checked}/${total}, nulled ${nulled}, valid ${valid}`);

      if (i + BATCH < total) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const summary = { total, checked, nulled, valid };
    console.log("validate-li-source-urls complete:", summary);

    return new Response(JSON.stringify({ success: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validate-li-source-urls error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
