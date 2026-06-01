// Admin audit of public.jurisdiction_requirements.
// For each row, fetches the authority_url via Jina Reader, asks Gemini 2.5 Pro
// to compare every field against the fetched authority text, and writes
// per-field findings to jurisdiction_requirement_audits.
//
// Never auto-edits the source table — humans accept/reject in the admin UI.
//
// Body: { codes?: string[], limit?: number }
//   - codes: optional list of jurisdiction_code values to limit the run
//   - limit: cap rows checked (default 100)
//
// Requires header: x-admin-token = ADMIN_SECRET_TOKEN
//                  OR a logged-in admin JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const JINA_API_KEY = Deno.env.get("JINA_API_KEY") || "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") || "";
const MODEL = "google/gemini-2.5-pro";

const AUDITED_FIELDS = [
  "authority_name",
  "authority_url",
  "law_name",
  "registration_required",
  "registration_threshold",
  "dpo_required",
  "dpo_threshold",
  "ai_registration_required",
  "ai_threshold",
  "representative_required",
  "filing_fee_cents",
  "filing_currency",
  "renewal_period_months",
  "language_requirements",
  "notes",
] as const;

async function isCallerAdmin(req: Request): Promise<boolean> {
  const adminHeader = req.headers.get("x-admin-token");
  if (adminHeader && ADMIN_TOKEN && adminHeader === ADMIN_TOKEN) return true;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const jwt = auth.slice(7);
  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

async function fetchAuthorityText(url: string): Promise<string> {
  if (!url) return "";
  const target = `https://r.jina.ai/${url}`;
  try {
    const resp = await fetch(target, {
      headers: {
        ...(JINA_API_KEY ? { Authorization: `Bearer ${JINA_API_KEY}` } : {}),
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!resp.ok) return "";
    const text = await resp.text();
    return text.slice(0, 60_000);
  } catch {
    return "";
  }
}

async function auditOne(row: any): Promise<any[]> {
  const authorityText = await fetchAuthorityText(row.authority_url);

  const currentFields = Object.fromEntries(
    AUDITED_FIELDS.map((f) => [f, row[f] ?? null])
  );

  const prompt = `You are auditing a privacy-law jurisdiction requirements record against the official authority's website.

JURISDICTION: ${row.jurisdiction_name} (${row.jurisdiction_code})
AUTHORITY URL: ${row.authority_url}

CURRENT STORED VALUES (JSON):
${JSON.stringify(currentFields, null, 2)}

OFFICIAL AUTHORITY PAGE TEXT (markdown extract, may be truncated):
"""
${authorityText || "(no text could be fetched — base your answer on your general training knowledge and mark confidence accordingly)"}
"""

For EACH of these fields, evaluate whether the stored value is correct for a generic business subject to this jurisdiction's privacy law (NOT data-broker-specific, NOT AI-Act-specific unless the field name says so):
${AUDITED_FIELDS.join(", ")}

Pay special attention to:
- "filing_fee_cents" — must reflect the general/default privacy registration fee, NOT niche regimes like US data broker fees. If there is no general filing fee, the correct value is 0.
- "registration_required" — true only if a general privacy registration with the authority is mandatory for normal businesses. Data broker registration alone is NOT enough.
- Booleans must be true/false, not strings.
- Notes field disagreements are only worth flagging if materially misleading.

Return STRICT JSON of this shape, no prose:
{
  "findings": [
    {
      "field": "<one of the audited fields>",
      "agreement": "agrees" | "disagrees" | "unclear",
      "confidence": "high" | "medium" | "low",
      "suggested_value": <correct value, same type as the field; null if you don't know>,
      "source_quote": "<short verbatim quote from the authority text, or empty string if unfetched>",
      "source_url": "<URL the quote came from, default to the authority URL>"
    }
  ]
}

Only include a finding for a field when agreement is "disagrees" OR "unclear". Skip fields that clearly agree.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a senior privacy compliance researcher. You return only valid JSON matching the requested schema. Never invent statutes, fees, or thresholds.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { findings: [] };
  }
  const findings = Array.isArray(parsed.findings) ? parsed.findings : [];

  return findings
    .filter((f: any) => f && typeof f.field === "string" && AUDITED_FIELDS.includes(f.field))
    .filter((f: any) => f.agreement === "disagrees" || f.agreement === "unclear")
    .map((f: any) => ({
      jurisdiction_code: row.jurisdiction_code,
      field_name: f.field,
      current_value: currentFields[f.field as keyof typeof currentFields] ?? null,
      suggested_value: f.suggested_value ?? null,
      agreement: f.agreement,
      confidence: f.confidence || null,
      source_quote: (f.source_quote || "").slice(0, 1000),
      source_url: f.source_url || row.authority_url || null,
      model: MODEL,
    }));
}

async function runAudit(runId: string, codes: string[] | null, limit: number) {
  let q = supabase.from("jurisdiction_requirements").select("*").order("jurisdiction_code");
  if (codes && codes.length) q = q.in("jurisdiction_code", codes);
  q = q.limit(limit);
  const { data: rows, error } = await q;
  if (error) {
    await supabase.from("jurisdiction_audit_runs").update({
      status: "error",
      error: error.message,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    return;
  }

  let checked = 0;
  let issues = 0;
  for (const row of rows || []) {
    try {
      const findings = await auditOne(row);
      if (findings.length) {
        await supabase.from("jurisdiction_requirement_audits").insert(
          findings.map((f) => ({ ...f, run_id: runId }))
        );
        issues += findings.length;
      }
      checked++;
      await supabase.from("jurisdiction_audit_runs").update({
        jurisdictions_checked: checked,
        issues_found: issues,
      }).eq("id", runId);
    } catch (e) {
      console.error(`audit failed for ${row.jurisdiction_code}:`, (e as Error).message);
    }
  }

  await supabase.from("jurisdiction_audit_runs").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    jurisdictions_checked: checked,
    issues_found: issues,
  }).eq("id", runId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await isCallerAdmin(req))) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const codes: string[] | null = Array.isArray(body.codes) ? body.codes : null;
    const limit: number = Math.min(Math.max(parseInt(body.limit || "100", 10) || 100, 1), 200);

    const { data: run, error: runErr } = await supabase
      .from("jurisdiction_audit_runs")
      .insert({
        status: "running",
        model: MODEL,
        params: { codes, limit },
      })
      .select()
      .single();
    if (runErr) throw runErr;

    // Fire and forget so the HTTP call returns quickly.
    // @ts-ignore EdgeRuntime is available in Supabase functions.
    EdgeRuntime.waitUntil(runAudit(run.id, codes, limit));

    return new Response(JSON.stringify({ run_id: run.id, status: "running" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("audit-jurisdiction-requirements error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
