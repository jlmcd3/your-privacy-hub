import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: bills, error: fetchErr } = await supabase
    .from("legislation_bills")
    .select("id,bill_name,bill_number,jurisdiction,jurisdiction_slug,iso2,region,stage,summary,source_url,source_name,matched_keywords,last_changed_at")
    .in("stage", ["passed", "enacted"])
    .eq("status", "active")
    .is("feed_promoted_at", null)
    .gt("last_changed_at", new Date(Date.now() - 14 * 86400_000).toISOString());

  if (fetchErr) {
    return new Response(JSON.stringify({ ok: false, error: fetchErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  let promoted = 0;
  let skipped = 0;

  for (const bill of (bills ?? [])) {
    const stageLabel = bill.stage === "enacted" ? "Enacted" : "Passed";
    const billRef = bill.bill_number ? ` (${bill.bill_number})` : "";
    const title = `${stageLabel}: ${bill.bill_name}${billRef} — ${bill.jurisdiction}`;
    const summary = bill.summary
      ? bill.summary.slice(0, 500)
      : `${bill.bill_name} has ${bill.stage === "enacted" ? "been signed into law" : "passed"} in ${bill.jurisdiction}.`;
    const syntheticUrl = bill.source_url || `https://enduserprivacy.com/legislation-synthetic/${bill.id}`;
    const jurisdictionSlugs: string[] = bill.jurisdiction_slug
      ? [bill.jurisdiction_slug]
      : bill.iso2 === "US" ? ["us-federal"]
      : bill.iso2 === "GB" ? ["united-kingdom"]
      : bill.iso2 === "EU" ? ["eu"]
      : bill.iso2 === "CA" ? ["canada"]
      : bill.iso2 === "AU" ? ["australia"]
      : bill.iso2 === "BR" ? ["brazil"]
      : ["global"];
    const category = (bill.matched_keywords ?? []).some((k: string) =>
      /ai|artificial intelligence|automated decision|facial recognition|biometric/.test(k)
    ) ? "ai-privacy" : "enforcement";

    const row: Record<string, unknown> = {
      title: title.slice(0, 400),
      summary,
      url: syntheticUrl,
      source_name: bill.source_name ?? "Legislation Tracker",
      source_domain: "enduserprivacy.com",
      image_url: null,
      category,
      topic_tags: bill.matched_keywords ?? [],
      regulator: null,
      published_at: new Date(bill.last_changed_at).toISOString(),
      is_premium: false,
      direct_jurisdictions: jurisdictionSlugs,
      affected_jurisdictions: jurisdictionSlugs,
      source_tier: 2,
    };

    const { data: upserted, error: upsertErr } = await supabase
      .from("updates")
      .upsert(row, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (upsertErr) {
      skipped++;
      continue;
    }
    if (!upserted || upserted.length === 0) {
      skipped++;
    } else {
      promoted++;
      const insertedId = upserted[0]?.id;
      if (insertedId) {
        const enrichUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/enrich-with-context`;
        fetch(enrichUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ article_id: insertedId, force: false }),
        }).catch(() => {});
      }
    }

    await supabase
      .from("legislation_bills")
      .update({ feed_promoted_at: new Date().toISOString() })
      .eq("id", bill.id);
  }

  return new Response(
    JSON.stringify({ ok: true, promoted, skipped, total_candidates: (bills ?? []).length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
