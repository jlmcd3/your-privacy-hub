// verification-scan: per-row extraction + verification.
// Modes: 'initial' | 'targeted' | 'sample' | 'cached'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { fetchSourceDocument, sha256 } from "./_local/source-fetcher.ts";
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
} from "./_local/paraphrase-faithfulness.ts";

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

// Cached verification sweep: hard budget cap (USD of model spend) tracked in
// public.verification_sweep_ledger so the sweep is resumable and idempotent
// across invocations. Default matches the CEO-approved cap ($250).
const DEFAULT_BUDGET_CAP_USD = 250;

function costOf(t: { haiku_in: number; haiku_out: number; sonnet_in: number; sonnet_out: number }): number {
  return (t.haiku_in / 1e6) * PRICE.haiku_in +
    (t.haiku_out / 1e6) * PRICE.haiku_out +
    (t.sonnet_in / 1e6) * PRICE.sonnet_in +
    (t.sonnet_out / 1e6) * PRICE.sonnet_out;
}

async function sweepSpentSoFar(sweep_id: string): Promise<number> {
  const { data } = await sb
    .from("verification_sweep_ledger")
    .select("batch_cost_usd")
    .eq("sweep_id", sweep_id);
  return (data ?? []).reduce((a: number, r: any) => a + Number(r.batch_cost_usd ?? 0), 0);
}

const CACHED_MIN_DOC_CHARS = 200;

// Item 333: hard cap on the document text passed to any model in a single
// invocation (was an implicit 60k inside each helper, applied twice per row).
const MAX_MODEL_DOC_CHARS = 40_000;

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
  "instrument_class",
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
    // Rows eligible for a no-network verification pass. ITEM 366 (b): a row is
    // eligible when it carries its OWN captured document (>= CACHED_MIN_DOC_CHARS)
    // OR when public.source_document_cache holds a non-expired document of that
    // size for its source_url. Previously the query hard-filtered on
    // `source_document_text is not null`, so rows whose document lived only in
    // the shared cache could never enter the sweep at all.
    let q = sb
      .from("enforcement_actions")
      .select(
        "id, regulator, subject, jurisdiction, decision_date, law, source_url, key_compliance_failure, fine_eur_equivalent, source_document_hash, source_document_text, source_document_fetched_at, verification_status",
        { count: "exact" },
      )
      .eq("verification_status", "unverified")
      // SOURCE-QUALITY GATE (2026-08-02): rows whose source can never be the
      // regulator's own text (regulator news feeds, the GDPRhub wiki) are not
      // citable even once verified, so they are excluded from the sweep's
      // population and the spend goes to primary-source rows instead.
      .not("source_type", "in", "(regulator_press,third_party_commentary)")
      .order("id", { ascending: true })
      .limit(batchSize);
    if (jurisdictionIn && jurisdictionIn.length > 0) q = q.in("jurisdiction", jurisdictionIn);
    if (startAfterId) q = q.gt("id", startAfterId);
    const { data, count } = await q;
    const all = data ?? [];

    // Cache fallback: single batched lookup for every row lacking its own text.
    const needCache = all.filter(
      (r: any) => (r.source_document_text?.length ?? 0) < CACHED_MIN_DOC_CHARS && !!r.source_url,
    );
    const cacheByUrl = new Map<string, { content_text: string; content_hash: string | null }>();
    if (needCache.length > 0) {
      const urls = Array.from(new Set(needCache.map((r: any) => r.source_url as string)));
      const { data: cached } = await sb
        .from("source_document_cache")
        .select("source_url, content_text, content_hash, expires_at")
        .in("source_url", urls)
        .gt("expires_at", new Date().toISOString());
      for (const c of (cached ?? []) as any[]) {
        if ((c.content_text?.length ?? 0) >= CACHED_MIN_DOC_CHARS) {
          cacheByUrl.set(c.source_url, {
            content_text: c.content_text,
            content_hash: c.content_hash ?? null,
          });
        }
      }
    }

    const rows: any[] = [];
    const skippedShortIds: string[] = [];
    let cacheFallbackUsed = 0;
    for (const r of all as any[]) {
      if ((r.source_document_text?.length ?? 0) >= CACHED_MIN_DOC_CHARS) {
        rows.push(r);
        continue;
      }
      const hit = r.source_url ? cacheByUrl.get(r.source_url) : undefined;
      if (hit) {
        cacheFallbackUsed++;
        rows.push({
          ...r,
          source_document_text: hit.content_text,
          _document_from_shared_cache: true,
          _cached_content_hash: hit.content_hash,
        });
        continue;
      }
      // ITEM 336 (c): no document on the row and none in the shared cache.
      skippedShortIds.push(r.id as string);
    }
    if (skippedShortIds.length > 0) {
      console.log(
        `[verification-scan] cached mode skipped ${skippedShortIds.length} row(s) with no document >= ${CACHED_MIN_DOC_CHARS} chars (own field or shared cache): ${skippedShortIds.join(",")}`,
      );
    }
    if (cacheFallbackUsed > 0) {
      console.log(
        `[verification-scan] cached mode resolved ${cacheFallbackUsed} row(s) via source_document_cache fallback`,
      );
    }
    return {
      rows,
      remaining: (count ?? 0) - all.length,
      scanned: all.length,
      lastScannedId: all.length ? all[all.length - 1].id : null,
      skippedShortIds,
      cacheFallbackUsed,
    };
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
      // Item 334: mechanical corpus defect, NOT a genuine human-review item.
      review_reason: "corpus_defect_subject",
      verification_deterministic_pass: false,
      memo_eligible: false,
      verification_last_run_at: new Date().toISOString(),
    }).eq("id", id);
    return {
      verdict: "requires_review",
      reason: "corpus_defect_subject",
      tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 },
    };
  }

  // Swappable "get document text" step.
  //  - cached mode reuses the row's captured source_document_text verbatim, or
  //    the shared-cache document attached by selectRows (Item 366 (b));
  //  - Item 333: every other mode now consults source_document_cache FIRST
  //    (non-expired entry keyed by source_url) before a live refetch. The 24
  //    queue rows stuck at attempts>=3 all had a warm cache entry but were
  //    being refetched (and re-parsed) on every drain attempt, which is what
  //    blew the worker memory/idle budget.
  const getDocument = async () => {
    if (mode === "cached") {
      const text = (row.source_document_text ?? "") as string;
      return {
        status: "ok" as const,
        content_text: text,
        content_hash: (row._cached_content_hash as string | null) ?? (await sha256(text)),
        fetched_from_cache: true,
      };
    }

    const url = (row.source_url ?? "") as string;
    if (url) {
      const { data: cached } = await sb
        .from("source_document_cache")
        .select("content_text, content_hash, expires_at")
        .eq("source_url", url)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      const text = (cached as any)?.content_text as string | undefined;
      if (text && text.length >= CACHED_MIN_DOC_CHARS) {
        return {
          status: "ok" as const,
          content_text: text,
          content_hash: (cached as any).content_hash ?? (await sha256(text)),
          fetched_from_cache: true,
        };
      }
    }
    return await fetchSourceDocument(url);
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
      // Item 334: a js_required source is a genuine "needs a human" routing.
      review_reason: next_status === "requires_review" ? "verification_uncertain" : null,
      verification_deterministic_pass: false,
      verification_last_run_at: new Date().toISOString(),
      memo_eligible: false,
      last_source_fetch_at: new Date().toISOString(),
    }).eq("id", id);
    return {
      verdict: next_status,
      reason: `fetch_${fetched.reason ?? "unavailable"}`,
      tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 },
    };

  }

  const doc = fetched.content_text!;
  // Item 333: cap the text handed to the models per invocation. Deterministic
  // checks still run over the full document; only the LLM payloads are capped,
  // which is what drove WORKER_RESOURCE_LIMIT on 100k+ char sources.
  const docForModel = doc.length > MAX_MODEL_DOC_CHARS
    ? doc.slice(0, MAX_MODEL_DOC_CHARS)
    : doc;
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
      reason: "deterministic_subject_and_regulator_absent",
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
      doc: docForModel,
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
    return { verdict: "failed", reason: "extraction_fatal", tokens: { haiku_in: 0, haiku_out: 0, sonnet_in: 0, sonnet_out: 0 } };
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
      sourceB: docForModel,
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
  // ITEM 366 (a): record WHY a row failed so the sweep ledger can carry a
  // batch-level triage histogram instead of a bare failure count.
  let failReason: string | null = null;
  if (status === "failed") {
    const failedChecks: string[] = [];
    if (subjectCheck.verdict === "fail") failedChecks.push("subject");
    if (regulatorCheck.verdict === "fail") failedChecks.push("regulator");
    if (dateCheck.verdict === "fail") failedChecks.push("decision_date");
    if (provCheck.verdict === "fail") failedChecks.push("statutory_provision");
    if (amtCheck.verdict === "fail") failedChecks.push("fine_amount");
    if (caseRefCheck.verdict === "fail") failedChecks.push("case_reference");
    if (para.confidence === "failed") {
      failReason = para.verdict === "parse_error"
        ? "paraphrase_parse_error"
        : "paraphrase_unfaithful";
    } else {
      failReason = failedChecks.length
        ? `deterministic_fail:${failedChecks.join("+")}`
        : "deterministic_fail:unattributed";
    }
  }

  const memoEligible =
    status === "verified" &&
    (para.confidence === "high" || para.confidence === "medium") &&
    extraction.statutory_provisions.length >= 1 &&
    !!row.source_url;

  // Write field history (only if changed, plus baseline on initial pass)
  const newVals: Record<string, any> = {
    statutory_provisions: extraction.statutory_provisions,
    disposition_type: extraction.disposition_type,
    instrument_class: extraction.instrument_class,
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
    instrument_class: extraction.instrument_class,
    instrument_class_extraction_method: extraction.instrument_class ? "source_extracted" : null,
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
    // Item 334: model-driven routings are genuine review items.
    review_reason: (status as string) === "requires_review" ? "verification_uncertain" : null,
    verification_deterministic_pass: detPass,
    verification_paraphrase_confidence: para.confidence,
    memo_eligible: memoEligible,
  }).eq("id", id);

  return {
    verdict: status,
    reason: failReason,
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
    let start_after_id: string | null = body.start_after_id ?? null;
    const target_ids: string[] | null = body.target_ids ?? null;
    const jurisdiction_in: string[] | null = Array.isArray(body.jurisdiction_in) && body.jurisdiction_in.length > 0
      ? body.jurisdiction_in as string[]
      : null;
    const sweep_id: string | null = typeof body.sweep_id === "string" && body.sweep_id ? body.sweep_id : null;
    const budget_cap_usd: number = Number.isFinite(body.budget_cap_usd)
      ? Number(body.budget_cap_usd)
      : DEFAULT_BUDGET_CAP_USD;
    let batch_index: number | null = Number.isFinite(body.batch_index) ? Number(body.batch_index) : null;
    // ITEM 365 — CRON RESUME DRIVER. With `resume: true` the invocation reads
    // its own cursor from the sweep ledger, so a pg_cron job can drive the
    // sweep to exhaustion (or to the cap) with no manual cursor passing.
    const resume: boolean = body.resume === true;

    if (!["initial", "targeted", "sample", "cached"].includes(mode)) {
      return new Response(JSON.stringify({ error: "invalid_mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ITEM 365 — single-flight lease. Scheduled invocations must never overlap
    // and double-bill a row.
    let leaseKey: string | null = null;
    if (resume && sweep_id) {
      leaseKey = `sweep:${sweep_id}`;
      const { data: got } = await sb.rpc("try_acquire_job_lease" as any, {
        _key: leaseKey,
        _seconds: 900,
        _holder: "verification-scan",
      });
      if (got !== true) {
        return new Response(JSON.stringify({ sweep_id, skipped: "lease_held" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: lastBatch } = await sb
        .from("verification_sweep_ledger")
        .select("last_id, start_after_id, batch_index")
        .eq("sweep_id", sweep_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastBatch) {
        start_after_id = (lastBatch as any).last_id ?? (lastBatch as any).start_after_id ?? start_after_id;
        if (batch_index === null) {
          batch_index = Number((lastBatch as any).batch_index ?? 0) + 1;
        }
      }
    }
    const releaseLease = async () => {
      if (leaseKey) await sb.rpc("release_job_lease" as any, { _key: leaseKey });
    };



    // Fail-closed budget gate: refuse to spend anything once the sweep's
    // recorded cumulative spend has reached the cap. Cursor is returned so the
    // sweep can be resumed after an explicit cap raise.
    let spent_before = 0;
    if (sweep_id) {
      spent_before = await sweepSpentSoFar(sweep_id);
      if (spent_before >= budget_cap_usd) {
        await releaseLease();
        return new Response(JSON.stringify({
          mode,
          sweep_id,
          halted: true,
          halted_reason: "budget_cap_reached",
          processed: 0,
          cumulative_cost_usd: Number(spent_before.toFixed(4)),
          budget_cap_usd,
          resume_after_id: start_after_id,
          next_batch_available: false,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let sel: any = await selectRows(mode, batch_size, start_after_id, target_ids, jurisdiction_in);
    // ITEM 365 — cursor wrap-around for the cron driver: once the cursor has
    // walked past the end, rescan from the start so rows whose documents
    // arrived later (Leg 2 refetch) are picked up. Cached mode only selects
    // still-unverified rows, so a wrap can never re-bill finished work.
    if (mode === "cached" && resume && start_after_id && (sel.scanned ?? 0) === 0) {
      start_after_id = null;
      sel = await selectRows(mode, batch_size, null, target_ids, jurisdiction_in);
    }
    const rows = sel.rows;
    const remaining = sel.remaining;


    let verified = 0, failed = 0, requires_review = 0, memo_eligible_after = 0;
    const tokens = { haiku_input: 0, haiku_output: 0, sonnet_input: 0, sonnet_output: 0 };
    let last_id: string | null = null;

    const failure_reasons: Record<string, number> = {};
    let halted_reason: string | null = null;
    let batch_spend = 0;
    let processed = 0;

    for (const row of rows) {
      if (sweep_id && spent_before + batch_spend >= budget_cap_usd) {
        halted_reason = "budget_cap_reached";
        break;
      }
      try {
        const r = await processRow(row, mode);
        processed++;
        batch_spend += costOf(r.tokens);
        if (r.verdict === "verified") verified++;
        else if (r.verdict === "requires_review") requires_review++;
        else failed++;
        // ITEM 366 (a): tally every non-verified outcome, not just thrown
        // exceptions. Prefix keeps triage classes separable in the ledger.
        if (r.verdict !== "verified") {
          const key = `${r.verdict}:${(r as any).reason ?? "unspecified"}`;
          failure_reasons[key] = (failure_reasons[key] ?? 0) + 1;
        }

        tokens.haiku_input += r.tokens.haiku_in;
        tokens.haiku_output += r.tokens.haiku_out;
        tokens.sonnet_input += r.tokens.sonnet_in;
        tokens.sonnet_output += r.tokens.sonnet_out;
        last_id = row.id;
      } catch (e) {
        failed++;
        processed++;
        const reason = `exception:${((e as Error).message ?? String(e)).slice(0, 120)}`;
        failure_reasons[reason] = (failure_reasons[reason] ?? 0) + 1;

        last_id = row.id;
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

    // Only advance the cursor past skipped-short rows when the whole selected
    // window was actually processed; a mid-batch halt must not skip work.
    if (mode === "cached" && sel.lastScannedId && !halted_reason && processed === rows.length) {
      last_id = sel.lastScannedId;
    }

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

    const cumulative_cost_usd = spent_before + batch_cost_usd;
    // ITEM 366 (a): non-billed skips are triage data too — a row scanned with no
    // document anywhere is a repair candidate, not a verification failure.
    const skippedNoDoc = (sel.skippedShortIds ?? []).length;
    if (skippedNoDoc > 0) failure_reasons["skipped:no_document_available"] = skippedNoDoc;
    if ((sel.cacheFallbackUsed ?? 0) > 0) {
      failure_reasons["info:resolved_via_shared_cache"] = sel.cacheFallbackUsed;
    }
    if (sweep_id) {

      if (!halted_reason && cumulative_cost_usd >= budget_cap_usd) halted_reason = "budget_cap_reached";
      await sb.from("verification_sweep_ledger").insert({
        sweep_id,
        mode,
        batch_index,
        start_after_id,
        last_id,
        processed,
        verified,
        failed,
        requires_review,
        skipped_short_doc: (sel.skippedShortIds ?? []).length,
        batch_cost_usd: Number(batch_cost_usd.toFixed(6)),
        cumulative_cost_usd: Number(cumulative_cost_usd.toFixed(6)),
        budget_cap_usd,
        halted_reason,
        failure_reasons: Object.keys(failure_reasons).length ? failure_reasons : null,
        tokens,
      });
    }

    await releaseLease();

    return new Response(JSON.stringify({

      mode,
      sweep_id,
      batch_size,
      processed,
      selected: rows.length,
      verified,
      failed,
      requires_review,
      memo_eligible_after_batch: memo_eligible_after,
      skipped_short_doc: (sel.skippedShortIds ?? []).length,
      skipped_short_doc_ids: sel.skippedShortIds ?? [],
      last_id,
      estimated_remaining: Math.max(remaining, 0),
      batch_cost_usd: Number(batch_cost_usd.toFixed(4)),
      cumulative_cost_usd: Number(cumulative_cost_usd.toFixed(4)),
      budget_cap_usd,
      halted: !!halted_reason,
      halted_reason,
      failure_reasons,
      resume_after_id: last_id ?? start_after_id,
      estimated_cost_remaining_usd: Number(estimated_cost_remaining_usd.toFixed(2)),
      next_batch_available: halted_reason ? false : mode === "initial"
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
