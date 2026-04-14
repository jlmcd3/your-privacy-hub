import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EXTRACTION_PROMPT = (authority: string, jurisdiction: string) =>
  `You are a GDPR legal analyst. The following text is from ${authority === "EDPB" ? "the EDPB's Guidelines 1/2024 on Legitimate Interests" : "the ICO's Legitimate Interests guidance"}. Extract every concrete example of a processing activity the ${authority} treats as accepted, conditional, or rejected under Article 6(1)(f). For each, return a JSON object with: "processing_activity", "outcome" (accepted/conditional/rejected), "signal_type" ("Official Guidance"), "dpa_source" ("${authority}"), "jurisdiction" ("${jurisdiction}"), "summary" (one factual sentence describing the regulatory position), "case_reference" (${authority === "EDPB" ? '"Guidelines 1/2024"' : '"ICO Legitimate Interests Guidance"'}). Return only a JSON array.`;

const DOCS = [
  {
    url: "https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-012024-processing-personal-data_en",
    authority: "EDPB",
    jurisdiction: "EU",
    model: "claude-sonnet-4-6",
  },
  {
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/",
    authority: "ICO",
    jurisdiction: "United Kingdom",
    model: "claude-haiku-4-5-20251001",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  let totalAdded = 0;
  const errors: string[] = [];

  for (const doc of DOCS) {
    try {
      // Fetch document page
      const pageRes = await fetch(doc.url, {
        headers: { "User-Agent": "EndUserPrivacy-Bot/1.0" },
      });
      if (!pageRes.ok) {
        errors.push(`Failed to fetch ${doc.authority}: ${pageRes.status}`);
        continue;
      }
      let pageText = await pageRes.text();
      // Strip HTML tags for cleaner text
      pageText = pageText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      // Limit to ~50k chars to stay within context window
      if (pageText.length > 50000) pageText = pageText.substring(0, 50000);

      const prompt = EXTRACTION_PROMPT(doc.authority, doc.jurisdiction);

      const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: doc.model,
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `${prompt}\n\n${pageText}`,
          }],
        }),
      });

      if (!aiRes.ok) {
        errors.push(`AI call failed for ${doc.authority}: ${aiRes.status}`);
        continue;
      }

      const aiData = await aiRes.json();
      const text = aiData.content?.[0]?.text;
      const match = text?.match(/\[[\s\S]*\]/);
      if (!match) {
        errors.push(`No JSON array found in ${doc.authority} response`);
        continue;
      }

      const entries = JSON.parse(match[0]);
      const today = new Date().toISOString().split("T")[0];

      for (const entry of entries) {
        if (!entry.processing_activity || !entry.outcome) continue;

        // Check if already exists
        const { data: existing } = await supabase
          .from("li_tracker_entries")
          .select("id")
          .eq("processing_activity", entry.processing_activity)
          .eq("dpa_source", entry.dpa_source)
          .maybeSingle();

        if (existing) continue; // Don't overwrite seed data

        await supabase.from("li_tracker_entries").insert({
          processing_activity: entry.processing_activity,
          outcome: entry.outcome,
          signal_type: entry.signal_type || "Official Guidance",
          dpa_source: entry.dpa_source || doc.authority,
          jurisdiction: entry.jurisdiction || doc.jurisdiction,
          summary: entry.summary,
          case_reference: entry.case_reference || null,
          confidence: "high",
          source_article_id: null,
          last_confirmed: today,
        });
        totalAdded++;
      }
    } catch (e) {
      errors.push(`Error processing ${doc.authority}: ${(e as Error).message}`);
    }
  }

  console.log(`Fetched and processed EDPB/ICO documents. ${totalAdded} new entries added.`);

  return new Response(JSON.stringify({ added: totalAdded, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
