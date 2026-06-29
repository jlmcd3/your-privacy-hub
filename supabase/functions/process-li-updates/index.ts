import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LI_SYSTEM_PROMPT = `You are a GDPR legal analyst. Review the provided source material and determine whether it documents any regulatory position on the use of legitimate interests (Article 6(1)(f) GDPR or the equivalent UK GDPR provision) as a legal basis for data processing. For each regulatory position found, extract a structured JSON object with these fields:
- processing_activity (string): The specific data processing activity being assessed
- outcome (string): One of exactly: accepted | conditional | rejected | contested
- signal_type (string): One of exactly: Enforcement Decision | Official Guidance | Regulatory Statement | Early Warning | Complaint Dismissed
- dpa_source (string): The name of the authority or body (e.g. CNIL, EDPB, ICO, BfDI)
- jurisdiction (string): The jurisdiction (e.g. France, EU, United Kingdom)
- case_reference (string or null): Case name, opinion number, or guidance title if stated
- summary (string): One factual sentence describing the regulatory position
- confidence (string): Classify based on the nature of the source: high = the source documents an enforcement decision, final consent order, or official published guidance with an explicit stated position on the LI use case | medium = the source documents a regulatory statement, supervisory authority report, formal complaint outcome, or early warning signal with a discernible but non-binding LI position | low = the LI position is inferred from indirect reference, media interpretation, a partial quote from a regulatory official, or a preliminary or consultative document
- source_url (string or null): Set to null in almost all cases. Only populate this field if a full, complete URL beginning with https:// appears verbatim and explicitly in the source text provided to you. Do not construct, infer, guess, or approximate any URL. Do not use your training knowledge to produce a URL for a document. If you are not copying a URL character-for-character from the text, return null.

If the source contains multiple findings, return an array of objects. If no legitimate interest findings are present, return an empty array.

QUALITY STANDARDS:
- confidence "high": enforcement decision, consent order, or official published guidance with an explicit LI ruling
- confidence "medium": regulatory statement, formal complaint outcome, or early warning with a clear but non-binding LI position
- confidence "low": inferred from indirect reference, media interpretation, or partial quote from a regulatory official

Do not construct, guess, or approximate URLs. The source_url field must be either a URL copied verbatim from the source text or null.

Return ONLY valid JSON — no preamble, no explanation.`;

// Keywords that suggest an enforcement action might involve a legitimate-interest analysis.
// Used to pre-filter enforcement_actions before spending Claude tokens on them.
const LI_KEYWORD_RE =
  /\b(legitimate interest|article\s*6\(1\)\(f\)|6\.1\.f|balancing test|art\.?\s*6\s*par\.?\s*1\s*lit\.?\s*f|berechtigt(es|en)?\s+interesse|int[ée]r[êe]t\s+l[ée]gitime|inter[eé]s\s+leg[ií]timo)\b/i;

async function callClaude(content: string) {
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
      max_tokens: 4000,
      system: LI_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
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

async function upsertFinding(
  finding: any,
  source: { articleId?: string; enforcementId?: string },
) {
  const { data: existing } = await supabase
    .from("li_tracker_entries")
    .select("id, outcome, source_url")
    .eq("processing_activity", finding.processing_activity)
    .eq("dpa_source", finding.dpa_source)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  if (existing) {
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
      source_article_id: source.articleId || null,
      source_enforcement_id: source.enforcementId || null,
      source_url: finding.source_url || null,
      confidence: finding.confidence || "medium",
      last_confirmed: today,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const run = await startRun(supabase, "process-li-updates");
  const startedMs = Date.now();
  const maxRuntimeMs = 120_000;
  let articlesProcessed = 0;
  let enforcementProcessed = 0;
  let findings = 0;

  try {
    // ── 1. RSS-derived articles (existing behavior) ────────────────────
    const { data: articles } = await supabase
      .from("updates")
      .select("id, title, summary")
      .eq("li_relevant", true)
      .eq("li_processed", false)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    for (const article of articles ?? []) {
      if (Date.now() - startedMs > maxRuntimeMs) break;
      const content = `Title: ${article.title}\nSummary: ${article.summary || "No summary."}`;
      const results = await callClaude(content);
      for (const finding of results) {
        if (finding.processing_activity && finding.outcome) {
          await upsertFinding(finding, { articleId: article.id });
          findings++;
        }
      }
      await supabase.from("updates").update({ li_processed: true }).eq("id", article.id);
      articlesProcessed++;
      await new Promise((r) => setTimeout(r, 500));
    }

    // ── 2. Enforcement actions (new) ───────────────────────────────────
    // Pull recent unprocessed enforcement decisions, then keyword-filter to
    // those whose violation/raw text actually plausibly involves an LI
    // analysis. Mark all of them li_processed afterward — even non-matches —
    // so we don't re-scan the same haystack every cron tick.
    const { data: enforcement } = await supabase
      .from("enforcement_actions")
      .select("id, regulator, jurisdiction, subject, law, violation, raw_text, decision_date, source_url")
      .eq("li_processed", false)
      .gte("decision_date", new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0])
      .order("decision_date", { ascending: false })
      .limit(200);

    for (const action of enforcement ?? []) {
      if (Date.now() - startedMs > maxRuntimeMs) break;

      const haystack = `${action.violation || ""} ${action.raw_text || ""}`;
      const looksLI = LI_KEYWORD_RE.test(haystack);

      if (looksLI) {
        const content = [
          `Regulator: ${action.regulator}`,
          `Jurisdiction: ${action.jurisdiction}`,
          `Subject: ${action.subject || "n/a"}`,
          `Law: ${action.law || "n/a"}`,
          `Decision date: ${action.decision_date || "n/a"}`,
          `Source URL (verbatim, may be used): ${action.source_url || "n/a"}`,
          `Violation: ${action.violation || ""}`,
          `Decision text: ${(action.raw_text || "").slice(0, 8000)}`,
        ].join("\n");

        const results = await callClaude(content);
        for (const finding of results) {
          if (finding.processing_activity && finding.outcome) {
            await upsertFinding(finding, { enforcementId: action.id });
            findings++;
          }
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      await supabase
        .from("enforcement_actions")
        .update({ li_processed: true })
        .eq("id", action.id);
      enforcementProcessed++;
    }

    await finishRun(supabase, run, {
      inserted: findings,
      enriched: articlesProcessed + enforcementProcessed,
      metadata: {
        articles_processed: articlesProcessed,
        enforcement_processed: enforcementProcessed,
        findings,
      },
    });

    return new Response(
      JSON.stringify({
        articles_processed: articlesProcessed,
        enforcement_processed: enforcementProcessed,
        findings,
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (err) {
    await failRun(supabase, run, err, {
      inserted: findings,
      enriched: articlesProcessed + enforcementProcessed,
      metadata: { articles_processed: articlesProcessed, enforcement_processed: enforcementProcessed },
    });
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    );
  }
});
