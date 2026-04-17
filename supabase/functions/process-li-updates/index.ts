import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LI_EXTRACTION_PROMPT = `You are a GDPR legal analyst. Review the following article and determine whether it documents any regulatory position on the use of legitimate interests (Article 6(1)(f) GDPR or the equivalent UK GDPR provision) as a legal basis for data processing. For each regulatory position found, extract a structured JSON object with these fields:
- processing_activity (string): The specific data processing activity being assessed
- outcome (string): One of exactly: accepted | conditional | rejected | contested
- signal_type (string): One of exactly: Enforcement Decision | Official Guidance | Regulatory Statement | Early Warning | Complaint Dismissed
- dpa_source (string): The name of the authority or body (e.g. CNIL, EDPB, ICO, BfDI)
- jurisdiction (string): The jurisdiction (e.g. France, EU, United Kingdom)
- case_reference (string or null): Case name, opinion number, or guidance title if stated
- summary (string): One factual sentence describing the regulatory position
- confidence (string): One of: high | medium | low
- source_url (string or null): Set to null unless a full, complete URL (beginning with https://) appears verbatim in the article text provided. Do not construct, infer, or guess URLs. If no URL appears explicitly in the text, return null.
If the article contains multiple findings, return an array of objects. If no legitimate interest findings are present, return an empty array. Return only valid JSON with no preamble or explanation.`;

async function callClaude(article: { title: string; summary: string | null }) {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `${LI_EXTRACTION_PROMPT}\n\nTitle: ${article.title}\nSummary: ${article.summary || "No summary."}`,
      }],
    }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  const text = data.content?.[0]?.text;
  try {
    const match = text?.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function upsertFinding(finding: any, articleId: string) {
  const { data: existing } = await supabase
    .from("li_tracker_entries")
    .select("id, outcome, source_url")
    .eq("processing_activity", finding.processing_activity)
    .eq("dpa_source", finding.dpa_source)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  if (existing) {
    // Only update source_url if existing value is NULL (preserve verified seed URLs)
    const updateData: any = { last_confirmed: today, updated_at: new Date().toISOString() };
    if (!existing.source_url && finding.source_url) {
      updateData.source_url = finding.source_url;
    }

    if (existing.outcome !== finding.outcome) {
      updateData.outcome = "contested";
      updateData.summary = `Conflicting positions: previously ${existing.outcome}, new signal suggests ${finding.outcome}. ${finding.summary}`;
    }

    await supabase.from("li_tracker_entries").update(updateData).eq("id", existing.id);
  } else {
    await supabase.from("li_tracker_entries").insert({
      processing_activity: finding.processing_activity,
      outcome: finding.outcome,
      signal_type: finding.signal_type,
      dpa_source: finding.dpa_source,
      jurisdiction: finding.jurisdiction,
      case_reference: finding.case_reference || null,
      summary: finding.summary,
      source_article_id: articleId,
      source_url: finding.source_url || null,
      confidence: finding.confidence || "medium",
      last_confirmed: today,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  // 30-day safety net window (not 8 days) to catch missed articles
  const { data: articles } = await supabase
    .from("updates")
    .select("id, title, summary")
    .eq("li_relevant", true)
    .eq("li_processed", false)
    .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  let processed = 0, findings = 0;

  for (const article of articles ?? []) {
    const results = await callClaude(article);
    for (const finding of results) {
      if (finding.processing_activity && finding.outcome) {
        await upsertFinding(finding, article.id);
        findings++;
      }
    }
    await supabase.from("updates").update({ li_processed: true }).eq("id", article.id);
    processed++;
    await new Promise(r => setTimeout(r, 500));
  }

  return new Response(JSON.stringify({ processed, findings }), {
    headers: { "Content-Type": "application/json" },
  });
});
