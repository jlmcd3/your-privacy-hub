// Enforcement corpus cleanup worker.
//
// Works the flagged backlog produced by the deterministic triage pass: rows
// classed 'enrichable_full' / 'enrichable_partial' hold usable decision text
// but are missing a party name and/or the analysis fields (key compliance
// failure, preventive measures). This worker reads the stored decision text
// only — never model general knowledge — extracts what is grounded in it,
// writes back, and recomputes quality_flags so resolved rows leave the
// review list.
//
// Rows are claimed atomically (cleanup_version = -1 while in flight).
// Outcomes: 1 = resolved, 2 = partially resolved, 3 = nothing extractable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { isFragmentSubject } from "./_local/subject-rules.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a privacy enforcement analyst reading the text of
a regulatory decision. You will return a single JSON object and nothing else.

ABSOLUTE RULE: every value must be traceable to the DOCUMENT TEXT supplied.
Never use general knowledge. When the text does not support a field, return null
for it. A wrong value is far worse than null.

Fields:
- subject: the name of the organisation or person the decision is against,
  exactly as written in the text (e.g. "Airbnb Ireland UC"). Return null if the
  decision is anonymised, if the text names no respondent, or if you would have
  to guess. Never return a sentence, a description, or a regulator's own name.
- key_compliance_failure: one plain-English sentence stating the core compliance
  failure the decision found. null if the text does not state a finding.
- preventive_measures: one plain-English sentence stating what the organisation
  should have done instead. null if not determinable from the text.
- is_enforcement: true only if the text is a regulatory or judicial decision,
  determination, sanction, settlement or formal order. false for news items,
  press summaries, guidance, consultations, annual reports, or navigation pages.

Return only valid JSON.`;

interface Extracted {
  subject: string | null;
  key_compliance_failure: string | null;
  preventive_measures: string | null;
  is_enforcement: boolean;
}

function coerce(raw: unknown): Extracted | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "unknown") return null;
    return s;
  };
  return {
    subject: str(o.subject),
    key_compliance_failure: str(o.key_compliance_failure),
    preventive_measures: str(o.preventive_measures),
    is_enforcement: o.is_enforcement !== false,
  };
}

async function extract(row: Record<string, unknown>): Promise<Extracted | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  const context = JSON.stringify({
    regulator: row.regulator,
    jurisdiction: row.jurisdiction,
    law: row.law,
    case_reference: row.case_reference,
    decision_date: row.decision_date,
    known_violation_summary: row.violation,
    document_text: row.doc_text,
  });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("rate_limited");
  if (res.status === 402) throw new Error("payment_required");
  if (!res.ok) throw new Error(`ai_${res.status}`);

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") return null;
  try {
    return coerce(JSON.parse(text));
  } catch {
    return null;
  }
}

// A subject is only accepted when it is a plausible party name AND it actually
// occurs in the document text we sent — this is the anti-fabrication guard.
export function subjectAcceptable(candidate: string | null, docText: string): boolean {
  if (!candidate) return false;
  const s = candidate.trim();
  if (s.length < 2 || s.length > 120) return false;
  if (isFragmentSubject(s)) return false;
  if (/\.$/.test(s) && s.split(/\s+/).length > 6) return false;
  return docText.toLowerCase().includes(s.toLowerCase());
}

export function remainingFlags(row: {
  subject: string | null;
  key_compliance_failure: string | null;
  preventive_measures: string | null;
}): string[] {
  const flags: string[] = [];
  const s = (row.subject ?? "").trim();
  if (!s) flags.push("subject_missing");
  else if (isFragmentSubject(s)) flags.push("subject_fragment");
  if (!row.key_compliance_failure) flags.push("missing_key_compliance_failure");
  if (!row.preventive_measures) flags.push("missing_preventive_measures");
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await verifyCaller(req, "admin");
  if (!caller.ok) {
    return new Response(JSON.stringify({ error: caller.error }), {
      status: caller.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 50);

  const { data: rows, error } = await supabase.rpc("claim_enforcement_for_cleanup", {
    _limit: limit,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let resolved = 0, partial = 0, nothing = 0, notEnforcement = 0, failed = 0;

  for (const row of (rows ?? []) as Record<string, any>[]) {
    try {
      const out = await extract(row);
      if (!out) {
        failed++;
        await supabase.from("enforcement_actions")
          .update({ cleanup_version: 0, cleanup_last_error: "unparseable_model_output" })
          .eq("id", row.id);
        continue;
      }

      const docText: string = row.doc_text ?? "";
      const update: Record<string, unknown> = { cleanup_last_error: null };

      const existingSubject = (row.subject ?? "").trim();
      const keepExisting = existingSubject && !isFragmentSubject(existingSubject);
      const nextSubject = keepExisting
        ? existingSubject
        : subjectAcceptable(out.subject, docText)
          ? out.subject!.trim()
          : null;
      if (!keepExisting && nextSubject) update.subject = nextSubject;
      if (!keepExisting && !nextSubject && existingSubject) update.subject = null;

      if (out.key_compliance_failure) update.key_compliance_failure = out.key_compliance_failure;
      if (out.preventive_measures) update.preventive_measures = out.preventive_measures;

      const flags = remainingFlags({
        subject: nextSubject,
        key_compliance_failure: out.key_compliance_failure,
        preventive_measures: out.preventive_measures,
      });

      update.quality_flags = flags.length ? flags : null;
      update.quality_flagged_at = flags.length ? new Date().toISOString() : null;

      if (!out.is_enforcement) {
        update.triage_class = "not_enforcement";
        update.public_listed = false;
        update.cleanup_version = 3;
        notEnforcement++;
      } else if (flags.length === 0) {
        update.triage_class = "resolved";
        update.cleanup_version = 1;
        resolved++;
      } else if (out.key_compliance_failure || out.preventive_measures || nextSubject) {
        update.triage_class = "partially_resolved";
        update.cleanup_version = 2;
        partial++;
      } else {
        update.triage_class = "text_not_probative";
        update.cleanup_version = 3;
        nothing++;
      }

      const { error: upErr } = await supabase.from("enforcement_actions")
        .update(update).eq("id", row.id);
      if (upErr) {
        failed++;
        await supabase.from("enforcement_actions")
          .update({ cleanup_version: 0, cleanup_last_error: upErr.message.slice(0, 300) })
          .eq("id", row.id);
      }
    } catch (e) {
      const msg = (e as Error).message;
      failed++;
      await supabase.from("enforcement_actions")
        .update({ cleanup_version: 0, cleanup_last_error: msg.slice(0, 300) })
        .eq("id", row.id);
      if (msg === "rate_limited") await new Promise((r) => setTimeout(r, 3000));
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return new Response(
    JSON.stringify({
      claimed: rows?.length ?? 0,
      resolved,
      partial,
      nothing,
      notEnforcement,
      failed,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
