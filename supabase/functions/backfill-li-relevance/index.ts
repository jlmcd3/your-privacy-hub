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
If the article contains multiple findings, return an array of objects. If no legitimate interest findings are present, return an empty array. Return only valid JSON with no preamble or explanation.`;

const TITLE_KEYWORDS = [
  '%legitimate interest%',
  '%Article 6(1)(f)%',
  '%LIA%',
  '%balancing test%',
  '%lawful basis%',
  '%6(1)(f)%',
  '%processing basis%',
  '%legal basis%',
  '%EDPB guidelines%',
  '%recognized legitimate%',
];

const SUMMARY_KEYWORDS = [
  '%legitimate interest%',
  '%Article 6(1)(f)%',
  '%LIA%',
  '%balancing test%',
  '%lawful basis%',
  '%6(1)(f)%',
  '%processing basis%',
  '%legal basis%',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  // Expanded keyword query
  const titleFilter = TITLE_KEYWORDS.map(k => `title.ilike.${k}`).join(",");
  const summaryFilter = SUMMARY_KEYWORDS.map(k => `summary.ilike.${k}`).join(",");

  const { data: articles } = await supabase
    .from("updates")
    .select("id, title, summary")
    .eq("li_processed", false)
    .or(`${titleFilter},${summaryFilter}`)
    .limit(100);

  let processed = 0, findings = 0;

  for (const article of articles ?? []) {
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

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text;
      try {
        const match = text?.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const results = Array.isArray(parsed) ? parsed : [parsed];
          const today = new Date().toISOString().split("T")[0];

          for (const finding of results) {
            if (!finding.processing_activity || !finding.outcome) continue;
            const { data: existing } = await supabase
              .from("li_tracker_entries")
              .select("id, outcome")
              .eq("processing_activity", finding.processing_activity)
              .eq("dpa_source", finding.dpa_source)
              .maybeSingle();

            if (existing) {
              if (existing.outcome === finding.outcome) {
                await supabase.from("li_tracker_entries").update({ last_confirmed: today, updated_at: new Date().toISOString() }).eq("id", existing.id);
              } else {
                await supabase.from("li_tracker_entries").update({
                  outcome: "contested",
                  summary: `Conflicting: previously ${existing.outcome}, new signal suggests ${finding.outcome}. ${finding.summary}`,
                  last_confirmed: today,
                  updated_at: new Date().toISOString(),
                }).eq("id", existing.id);
              }
            } else {
              await supabase.from("li_tracker_entries").insert({
                processing_activity: finding.processing_activity,
                outcome: finding.outcome,
                signal_type: finding.signal_type,
                dpa_source: finding.dpa_source,
                jurisdiction: finding.jurisdiction,
                case_reference: finding.case_reference || null,
                summary: finding.summary,
                source_article_id: article.id,
                confidence: finding.confidence || "medium",
                last_confirmed: today,
              });
            }
            findings++;
          }
        }
      } catch { /* parse error, skip */ }
    }

    await supabase.from("updates").update({ li_relevant: true, li_processed: true }).eq("id", article.id);
    processed++;
    await new Promise(r => setTimeout(r, 500));
  }

  return new Response(JSON.stringify({ processed, findings }), {
    headers: { "Content-Type": "application/json" },
  });
});
