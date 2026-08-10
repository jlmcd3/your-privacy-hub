// BRIEF-2 backfill — repair residual enforcement_actions.subject values that
// are narrative fragments rather than party names.
//
// Selection: every non-null subject rejected by the shared intake gate
// (_shared/enforcement-subject.ts). Recovery order per row:
//   1. deterministic — leading proper-noun phrase of the row's own narrative
//   2. LLM verbatim pass over the row's own document (no invention: the model
//      may only copy a string that appears verbatim in that document)
// Nothing usable => subject left untouched and the row flagged
// `corpus_defect_subject_unrepairable` so the residual stays measurable.
//
// Batched and resumable by id cursor; repaired rows drop out of the predicate,
// so a re-run is a no-op.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import {
  classifySubject,
  entityFromNarrative,
  looksLikeEntityName,
} from "../_shared/enforcement-subject.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

const MODEL = "openai/gpt-5.6-sol";
const MIN_DOC_CHARS = 200;
const MAX_MODEL_DOC_CHARS = 18_000;

const norm = (s: string) => s.toLowerCase().replace(/[\s\u00a0]+/g, " ").replace(/[’‘]/g, "'").trim();

function isJunkCapture(text: string): boolean {
  const head = text.slice(0, 400).toLowerCase();
  return /making sure you're not a bot|oh noes!|target url ret|403 forbidden|access denied|just a moment/.test(head);
}

function pickDocument(row: any): { text: string; origin: string } | null {
  const candidates: Array<[string, string | null]> = [
    ["source_document_text", row.source_document_text ?? null],
    ["raw_text", row.raw_text ?? null],
    ["legacy_summary_text", row.legacy_summary_text ?? null],
  ];
  for (const [origin, text] of candidates) {
    if (text && text.length >= MIN_DOC_CHARS && !isJunkCapture(text)) return { text, origin };
  }
  return null;
}

async function extractSubject(doc: string): Promise<string | null> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "none",
      messages: [
        {
          role: "system",
          content:
            "You extract the name of the controller/processor/respondent that an enforcement decision is against. " +
            "COPY RULE: you may only output a string that appears VERBATIM in the supplied document. " +
            "If the document does not state a named entity (e.g. it is anonymised, redacted, or refers only to 'the controller'), " +
            "output exactly NONE. Never infer from a title, URL, case number or your own knowledge. " +
            "Output only the name, with no quotes, labels or commentary.",
        },
        { role: "user", content: `DOCUMENT:\n${doc.slice(0, MAX_MODEL_DOC_CHARS)}\n\nNAME:` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const raw = (json?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw || /^none$/i.test(raw)) return null;
  return raw.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

async function scanResidual(startAfterId: string | null): Promise<Array<{ id: string; subject: string }>> {
  const out: Array<{ id: string; subject: string }> = [];
  let cursor = startAfterId;
  for (let page = 0; page < 60; page++) {
    let q = sb.from("enforcement_actions").select("id, subject, review_reason")
      .not("subject", "is", null).order("id", { ascending: true }).limit(1000);
    if (cursor) q = q.gt("id", cursor);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      // already-attempted rows stay out of the queue so batching terminates
      if (r.review_reason === "corpus_defect_subject_unrepairable") continue;
      if (classifySubject(r.subject as string) !== null) out.push({ id: r.id as string, subject: r.subject as string });
    }
    cursor = rows[rows.length - 1].id as string;
    if (rows.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dryRun = body.dry_run === true;
    const maxRows = Math.min(Number(body.max_rows ?? 100), 400);
    const startAfterId: string | null = body.start_after_id ?? null;

    const residual = await scanResidual(startAfterId);
    const batch = residual.slice(0, maxRows);

    const stats = {
      residual_total: residual.length,
      processed: 0,
      repaired_deterministic: 0,
      repaired_llm: 0,
      unrepairable: 0,
      deferred: 0,
    };
    const samples: any[] = [];

    for (const item of batch) {
      stats.processed++;
      const { data: row, error } = await sb
        .from("enforcement_actions")
        .select("id, subject, review_reason, raw_text, legacy_summary_text, source_document_text")
        .eq("id", item.id).maybeSingle();
      if (error || !row) { stats.deferred++; continue; }

      const narrative = (row.raw_text as string) || (row.legacy_summary_text as string) ||
        (row.source_document_text as string) || "";

      // (1) deterministic recovery
      let name = entityFromNarrative(narrative) ?? entityFromNarrative(row.subject as string);
      let via: "deterministic" | "llm" | null = name ? "deterministic" : null;

      // (2) verbatim LLM pass over the row's own document
      if (!name) {
        const doc = pickDocument(row);
        if (doc) {
          try {
            const candidate = await extractSubject(doc.text);
            if (candidate && looksLikeEntityName(candidate) && norm(doc.text).includes(norm(candidate))) {
              name = candidate;
              via = "llm";
            }
          } catch (e) {
            stats.deferred++;
            samples.push({ id: row.id, outcome: "deferred", reason: String(e).slice(0, 140) });
            continue;
          }
        }
      }

      if (!name) {
        stats.unrepairable++;
        if (!dryRun) {
          await sb.from("enforcement_actions")
            .update({ review_reason: "corpus_defect_subject_unrepairable" })
            .eq("id", row.id);
        }
        samples.push({ id: row.id, outcome: "unrepairable", was: (row.subject as string).slice(0, 70) });
        continue;
      }

      if (via === "deterministic") stats.repaired_deterministic++; else stats.repaired_llm++;
      if (!dryRun) {
        const clearFlag = typeof row.review_reason === "string" && row.review_reason.startsWith("corpus_defect_subject");
        await sb.from("enforcement_actions").update({
          subject: name,
          ...(clearFlag ? { review_reason: null } : {}),
        }).eq("id", row.id);
      }
      if (samples.length < 25) {
        samples.push({ id: row.id, outcome: "repaired", via, was: (row.subject as string).slice(0, 70), now: name });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        ...stats,
        remaining_after_batch: Math.max(0, residual.length - batch.length),
        samples,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
