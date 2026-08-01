// verification-scan: per-row extraction + verification.
// Modes: 'initial' | 'targeted' | 'sample' | 'cached'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { fetchSourceDocument, sha256 } from "../_shared/source-fetcher.ts";
import {
  checkSubjectPresent,
  checkRegulatorPresent,
  checkDecisionDatePresent,
  checkSourceUrlResolves,
  checkStatutoryProvisionPresent,
  checkFineAmountPresent,
  checkCaseReferencePresent,
  aggregateDeterministic,
  type CheckResult,
} from "../_shared/deterministic-checks.ts";
import {
  constrainedExtract,
  HAIKU_MODEL_ID,
} from "../_shared/constrained-extraction.ts";
import {
  paraphraseFaithfulness,
  SONNET_MODEL_ID,
} from "../_shared/paraphrase-faithfulness.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

// Anthropic pricing per million tokens (May 2026).
const PRICE = {
  haiku_in: 1.0, haiku_out: 5.0,
  sonnet_in: 3.0, sonnet_out: 15.0,
};

type Mode = "initial" | "targeted" | "sample" | "cached";

const CACHED_MIN_DOC_CHARS = 200;

// Placeholder-subject precheck. Skip corpus rows whose subject is a generic
// placeholder before any fetch or LLM cost is incurred.
const SUBJECT_PLACEHOLDERS = new Set<string>([
  "company", "controller", "processor", "respondent", "defendant",
  "entity", "organization", "organisation", "data controller",
  "data processor", "the company", "the controller", "the respondent",
  "unknown", "redacted", "anonymous", "n/a", "na", "unspecified",
  "tbd", "tba", "placeholder",
]);

function isPlaceholderSubject(subject: string | null | undefined): boolean {
  if (!subject) return true;
  const normalised = subject.trim().toLowerCase();
  if (normalised.length < 3) return true;
  return SUBJECT_PLACEHOLDERS.has(normalised);
}

const TIER_FIELDS = [
  "statutory_provisions",
  "disposition_type",
  "appeal_status",
  "case_reference",
  "sector",
  "original_currency",
  "original_amount",
] as const;

async function logResult(
  enforcement_action_id: string,
  check_name: string,
  check_category: string,
  result: CheckResult | { verdict: string; evidence_text?: string },
  extras: { source_document_hash?: string | null; model_used?: string | null; notes?: string | null } = {},
) {
  await sb.from("verification_results").insert({
    enforcement_action_id,
    check_name,
    check_category,
    verdict: result.verdict,
    evidence_text: (result as any).evidence_text ?? null,
    evidence_offset_start: (result as any).evidence_offset_start ?? null,
    evidence_offset_end: (result as any).evidence_offset_end ?? null,
    source_document_hash: extras.source_document_hash ?? null,
    model_used: extras.model_used ?? null,
    notes: extras.notes ?? null,
    ran_at: new Date().toISOString(),
  });
}

async function selectRows(
  mode: Mode,
  batchSize: number,
  startAfterId: string | null,
  targetIds: string[] | null,
  jurisdictionIn: string[] | null = null,
) {
  if (mode === "cached") {
    // Rows that already carry a captured source document — no network refetch.
    let q = sb
      .from("enforcement_actions")
      .select(
        "id, regulator, subject, jurisdiction, decision_date, law, source_url, key_compliance_failure, fine_eur_equivalent, source_document_hash, source_document_text, source_document_fetched_at, verification_status",
        { count: "exact" },
      )
      .eq("verification_status", "unverified")
      .not("source_document_text", "is", null)
      .order("id", { ascending: true })
      .limit(batchSize);
    if (jurisdictionIn && jurisdictionIn.length > 0) q = q.in("jurisdiction", jurisdictionIn);
    if (startAfterId) q = q.gt("id", startAfterId);
    const { data, count } = await q;
    const all = data ?? [];
    const rows = all.filter(
      (r: any) => (r.source_document_text?.length ?? 0) >= CACHED_MIN_DOC_CHARS,
    );
    return { rows, remaining: (count ?? 0) - all.length, scanned: all.length, lastScannedId: all.length ? all[all.length - 1].id : null };
  }
  if (mode === "targeted") {
    if (!targetIds || targetIds.length === 0) return { rows: [], remaining: 0 };
    const { data } = await sb
      .from("enforcement_actions")
      .select("id, regulator, subject, decision_date, law, source_url, key_compliance_failure, fine_eur_equivalent, source_document_hash, verification_status")
      .in("id", targetIds);
    return { rows: data ?? [], remaining: 0 };
  }
  if (mode === "sample") {
    // Random sample of already-verified rows.
    const { data } = await sb.rpc("verification_random_sample" as any, { _limit: batchSize }).select?.() ?? { data: null };
    if (data && Array.isArray(data) && data.length > 0) {
      return { rows: data, remaining: 0 };
    }
    // Fallback: order by id offset.
    const { data: fallback } = await sb
      .from("enforcement_actions")
      .select("id, regulator, subject, decision_date, law, source_url, key_compliance_failure, fine_eur_equivalent, source_document_hash, verification_status")
      .eq("verification_status", "verified")
      .limit(batchSize);
    return { rows: fallback ?? [], remaining: 0 };
  }
  // initial
  let q = sb
    .from("enforcement_actions")
    .select("id, regulator, subject, decision_date, law, source_url, key_compliance_failure, fine_eur_equivalent, source_document_hash, verification_status", { count: "exact" })
    .eq("verification_status", "unverified")
    .order("id", { ascending: true })
    .limit(batchSize);
  if (startAfterId) q = q.gt("id", startAfterId);
  const { data, count } = await q;
  return { rows: data ?? [], remaining: (count ?? 0) - (data?.length ?? 0) };
}

async function processRow(row: any, mode: Mode = "initial") {
  const id = row.id as string;
  const prevHash = row.source_document_hash as string | null;
  const prevStatus = row.verification_status as string | null;

  // Precheck: skip rows with placeholder or empty subjects. Corpus data
  // quality issue — flag for review without burning fetch + LLM budget.
  if (isPlaceholderSubject(row.subject)) {
    await sb.from("verification_results").insert({
      enforcement_action_id: id,
      check_name: "subject_quality_precheck",
      check_category: "deterministic",
      verdict: "fail",
      evidence_text:
        `corpus subject "${row.subject ?? ""}" is a placeholder or too short to verify; flagged for corpus review`,
      ran_at: new Date().toISOString(),
    });
    await sb.from("enforcement_actions").update({
      verification_status: "requires_review",
      verification_deterministic_pass: false,
      memo_eligible: false,
      verification_last_run_at: new Date().toISOString(),
    }).eq("id", id);
    return {
      verdict: "requires_review",
      tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 },
    };
  }

  // Swappable "get document text" step. Live fetch for initial/targeted/sample;
  // cached mode reuses the already-captured source_document_text verbatim.
  const getDocument = async () => {
    if (mode === "cached") {
      const text = (row.source_document_text ?? "") as string;
      return {
        status: "ok" as const,
        content_text: text,
        content_hash: await sha256(text),
      };
    }
    return await fetchSourceDocument(row.source_url ?? "");
  };

  const fetched: any = await getDocument();
  const fetchCheck = checkSourceUrlResolves(fetched.status);

  // Drift detection
  if (fetched.status === "ok" && prevStatus === "verified" && prevHash && fetched.content_hash && prevHash !== fetched.content_hash) {
    await sb.from("corpus_drift_log").insert({
      enforcement_action_id: id,
      previous_hash: prevHash,
      new_hash: fetched.content_hash,
      previous_verdict: "verified",
      new_verdict: "re-verifying",
      trigger_source: "lazy_re_verification",
    });
  }

  await logResult(id, "source_url_resolves", "fetch", fetchCheck, {
    notes: fetched.reason ?? null,
    source_document_hash: fetched.content_hash ?? null,
  });

  if (fetched.status !== "ok") {
    const next_status = fetched.reason === "js_required" ? "requires_review" : "failed";
    await sb.from("enforcement_actions").update({
      verification_status: next_status,
      verification_deterministic_pass: false,
      verification_last_run_at: new Date().toISOString(),
      memo_eligible: false,
      last_source_fetch_at: new Date().toISOString(),
    }).eq("id", id);
    return {
      verdict: next_status,
      tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 },
    };
  }

  const doc = fetched.content_text!;
  const docHash = fetched.content_hash!;

  // Pre-extraction checks
  const subjectCheck = checkSubjectPresent(doc, row.subject);
  const regulatorCheck = checkRegulatorPresent(doc, row.regulator);
  const dateCheck = checkDecisionDatePresent(doc, row.decision_date);
  await Promise.all([
    logResult(id, "subject_present", "deterministic", subjectCheck, { source_document_hash: docHash }),
    logResult(id, "regulator_present", "deterministic", regulatorCheck, { source_document_hash: docHash }),
    logResult(id, "decision_date_present", "deterministic", dateCheck, { source_document_hash: docHash }),
  ]);

  // Hard-fail short-circuit
  if (subjectCheck.verdict === "fail" && regulatorCheck.verdict === "fail") {
    await sb.from("enforcement_actions").update({
      verification_status: "failed",
      verification_deterministic_pass: false,
      verification_last_run_at: new Date().toISOString(),
      memo_eligible: false,
      source_document_hash: docHash,
      last_source_fetch_at: new Date().toISOString(),
    }).eq("id", id);
    return {
      verdict: "failed",
      tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 },
    };
  }

  // Capture previous tier-A/B values for history
  const { data: prevRow } = await sb
    .from("enforcement_actions")
    .select(TIER_FIELDS.join(","))
    .eq("id", id)
    .maybeSingle();

  // Constrained extraction
  let extraction;
  try {
    extraction = await constrainedExtract({
      apiKey: anthropicKey,
      doc,
      regulator: row.regulator,
      subject: row.subject,
      decisionDate: row.decision_date,
      law: row.law,
    });
  } catch (e) {
    await logResult(id, "extraction_fatal", "semantic", { verdict: "fail", evidence_text: (e as Error).message?.slice(0, 200) }, { source_document_hash: docHash, model_used: HAIKU_MODEL_ID });
    await sb.from("enforcement_actions").update({
      verification_status: "failed",
      verification_deterministic_pass: false,
      verification_last_run_at: new Date().toISOString(),
      memo_eligible: false,
      source_document_hash: docHash,
      last_source_fetch_at: new Date().toISOString(),
    }).eq("id", id);
    return { verdict: "failed", tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 } };
  }

  if (extraction.parse_error) {
    await logResult(id, "extraction_parse_error", "semantic", { verdict: "fail", evidence_text: extraction.parse_error.slice(0, 200) }, { source_document_hash: docHash, model_used: HAIKU_MODEL_ID });
  }

  // Write evidence quotes per field
  for (const [field, quote] of Object.entries(extraction.evidence_quotes)) {
    await logResult(id, `extracted_${field}`, "semantic", { verdict: "pass", evidence_text: quote.slice(0, 200) }, { source_document_hash: docHash, model_used: HAIKU_MODEL_ID });
  }

  // Post-extraction deterministic checks
  const provCheck = checkStatutoryProvisionPresent(doc, extraction.statutory_provisions);
  const amtCheck = checkFineAmountPresent(doc, extraction.original_amount, extraction.original_currency, row.fine_eur_equivalent);
  const caseRefCheck = checkCaseReferencePresent(doc, extraction.case_reference);
  await Promise.all([
    logResult(id, "statutory_provision_present", "deterministic", provCheck, { source_document_hash: docHash }),
    logResult(id, "fine_amount_present", "deterministic", amtCheck, { source_document_hash: docHash }),
    logResult(id, "case_reference_present", "deterministic", caseRefCheck, { source_document_hash: docHash }),
  ]);

  // Paraphrase faithfulness
  let para;
  try {
    para = await paraphraseFaithfulness({
      apiKey: anthropicKey,
      paraphraseA: row.key_compliance_failure ?? "",
      sourceB: doc,
    });
  } catch (e) {
    para = {
      verdict: "parse_error" as const,
      supporting_quote: null,
      concerns: (e as Error).message?.slice(0, 200) ?? null,
      confidence: "failed" as const,
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }

  await logResult(id, "paraphrase_faithfulness", "paraphrase", {
    // Item 332 FIX 2 — a parse failure is not evidence of unfaithfulness.
    // Record it honestly as `uncertain` with the parse error in notes.
    verdict: para.verdict === "parse_error" ? "uncertain" : "pass",
    evidence_text: para.supporting_quote ?? undefined,
  }, {
    source_document_hash: docHash,
    model_used: SONNET_MODEL_ID,
    notes: para.concerns ?? para.downgrade_reason ?? para.parse_error ?? null,
  });

  const detPass = aggregateDeterministic(
    [subjectCheck, regulatorCheck, dateCheck, fetchCheck],
    [provCheck, amtCheck, caseRefCheck],
  );
  const status =
    para.confidence === "failed" || !detPass ? "failed" : "verified";
  const memoEligible =
    status === "verified" &&
    (para.confidence === "high" || para.confidence === "medium") &&
    extraction.statutory_provisions.length >= 1 &&
    !!row.source_url;

  // Write field history (only if changed, plus baseline on initial pass)
  const newVals: Record<string, any> = {
    statutory_provisions: extraction.statutory_provisions,
    disposition_type: extraction.disposition_type,
    appeal_status: extraction.appeal_status,
    case_reference: extraction.case_reference,
    sector: extraction.sector,
    original_currency: extraction.original_currency,
    original_amount: extraction.original_amount,
  };
  const historyRows: any[] = [];
  for (const field of TIER_FIELDS) {
    const oldV = (prevRow as any)?.[field] ?? null;
    const newV = newVals[field];
    const changed = JSON.stringify(oldV) !== JSON.stringify(newV);
    if (changed || prevStatus === "unverified") {
      historyRows.push({
        enforcement_action_id: id,
        field_name: field,
        previous_value: oldV,
        new_value: newV,
        extraction_method: "source_extracted",
        source_url: row.source_url,
        source_document_hash: docHash,
        model_used: HAIKU_MODEL_ID,
      });
    }
  }
  if (historyRows.length > 0) {
    await sb.from("corpus_field_history").insert(historyRows);
  }

  // Update row
  await sb.from("enforcement_actions").update({
    statutory_provisions: extraction.statutory_provisions,
    statutory_provisions_extraction_method: "source_extracted",
    disposition_type: extraction.disposition_type,
    disposition_type_extraction_method: "source_extracted",
    appeal_status: extraction.appeal_status,
    appeal_status_extraction_method: "source_extracted",
    case_reference: extraction.case_reference,
    case_reference_extraction_method: "source_extracted",
    sector: extraction.sector,
    sector_extraction_method: "source_extracted",
    original_currency: extraction.original_currency,
    original_amount: extraction.original_amount,
    source_document_hash: docHash,
    last_source_fetch_at: new Date().toISOString(),
    verification_last_run_at: new Date().toISOString(),
    verification_status: status,
    verification_deterministic_pass: detPass,
    verification_paraphrase_confidence: para.confidence,
    memo_eligible: memoEligible,
  }).eq("id", id);

  return {
    verdict: status,
    tokens: {
      haiku_in: extraction.usage.input_tokens,
      haiku_out: extraction.usage.output_tokens,
      sonnet_in: para.usage.input_tokens,
      sonnet_out: para.usage.output_tokens,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const mode: Mode = (body.mode as Mode) ?? "initial";
    const batch_size: number = Math.min(Math.max(body.batch_size ?? 10, 1), 50);
    const start_after_id: string | null = body.start_after_id ?? null;
    const target_ids: string[] | null = body.target_ids ?? null;
    const jurisdiction_in: string[] | null = Array.isArray(body.jurisdiction_in) && body.jurisdiction_in.length > 0
      ? body.jurisdiction_in as string[]
      : null;

    if (!["initial", "targeted", "sample", "cached"].includes(mode)) {
      return new Response(JSON.stringify({ error: "invalid_mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sel: any = await selectRows(mode, batch_size, start_after_id, target_ids, jurisdiction_in);
    const rows = sel.rows;
    const remaining = sel.remaining;

    let verified = 0, failed = 0, requires_review = 0, memo_eligible_after = 0;
    const tokens = { haiku_input: 0, haiku_output: 0, sonnet_input: 0, sonnet_output: 0 };
    let last_id: string | null = null;

    for (const row of rows) {
      try {
        const r = await processRow(row, mode);
        if (r.verdict === "verified") verified++;
        else if (r.verdict === "requires_review") requires_review++;
        else failed++;
        tokens.haiku_input += r.tokens.haiku_in;
        tokens.haiku_output += r.tokens.haiku_out;
        tokens.sonnet_input += r.tokens.sonnet_in;
        tokens.sonnet_output += r.tokens.sonnet_out;
        last_id = row.id;
      } catch (e) {
        failed++;
        await sb.from("verification_results").insert({
          enforcement_action_id: row.id,
          check_name: "fatal_error",
          check_category: "fetch",
          verdict: "fail",
          evidence_text: ((e as Error).message ?? String(e)).slice(0, 500),
          ran_at: new Date().toISOString(),
        });
      }
    }

    if (mode === "cached" && sel.lastScannedId) last_id = sel.lastScannedId;

    // Recompute memo_eligible_after_batch as count of just-processed rows that ended eligible.
    if (last_id || (target_ids?.length ?? 0) > 0) {
      const ids = rows.map((r: any) => r.id);
      if (ids.length > 0) {
        const { count } = await sb
          .from("enforcement_actions")
          .select("id", { count: "exact", head: true })
          .in("id", ids)
          .eq("memo_eligible", true);
        memo_eligible_after = count ?? 0;
      }
    }

    const batch_cost_usd =
      (tokens.haiku_input / 1e6) * PRICE.haiku_in +
      (tokens.haiku_output / 1e6) * PRICE.haiku_out +
      (tokens.sonnet_input / 1e6) * PRICE.sonnet_in +
      (tokens.sonnet_output / 1e6) * PRICE.sonnet_out;

    const per_row_avg = rows.length > 0 ? batch_cost_usd / rows.length : 0;
    const estimated_cost_remaining_usd = per_row_avg * Math.max(remaining, 0);

    return new Response(JSON.stringify({
      mode,
      batch_size,
      processed: rows.length,
      verified,
      failed,
      requires_review,
      memo_eligible_after_batch: memo_eligible_after,
      last_id,
      estimated_remaining: Math.max(remaining, 0),
      batch_cost_usd: Number(batch_cost_usd.toFixed(4)),
      estimated_cost_remaining_usd: Number(estimated_cost_remaining_usd.toFixed(2)),
      next_batch_available: mode === "initial"
        ? rows.length === batch_size
        : mode === "cached"
          ? (sel.scanned ?? 0) === batch_size
          : false,
      tokens_used: tokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
