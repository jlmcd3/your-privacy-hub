// retry-failed-generations
// ────────────────────────────────────────────────────────────────────────────
// Cross-product sweeper. Runs every ~3 min via pg_cron. For each AI-generator
// product table, finds rows that:
//   • status in ('error','failed'), OR
//   • status='processing' AND last_attempt_at (or updated_at) older than
//     STUCK_PROCESSING_MINUTES,
//   AND retry_count < MAX_ATTEMPTS - 1.
//
// For each candidate: increment retry_count, set status='processing', clear
// last_error, set last_attempt_at=now(), then re-invoke the product's
// generator with the same id. The generator overwrites report_data on
// success — re-runs are idempotent.
//
// Exhausted candidates (retry_count >= MAX_ATTEMPTS - 1 AND still failed) go
// to the in-line resolver:
//   • Purchaser (stripe_payment_intent_id present): Stripe refund + mark
//     status='refunded'.
//   • Subscriber (stripe_payment_intent_id null): grant 1 free annual tool
//     credit + mark status='failed_resolved'.
//
// All transitions are guarded by status equality predicates so the same row
// can never be double-retried or double-refunded across overlapping cron
// invocations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import {
  MAX_ATTEMPTS,
  STUCK_PROCESSING_MINUTES,
  PRODUCT_DISPATCH,
  TABLE_DEFAULT_PRODUCT,
} from "../_shared/generation-policy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Tables this sweeper manages. cppa_assessments uses `module` to discriminate
// between three product_types sharing one table; everything else has a 1:1
// table → product_type mapping.
const TARGET_TABLES = [
  "cppa_assessments",
  "li_assessments",
  "governance_assessments",
  "dpia_frameworks",
  "ir_playbooks",
  "biometric_assessments",
  "dpa_documents",
];

function productTypeForRow(table: string, row: any): string {
  if (table === "cppa_assessments") {
    const m = row.module;
    if (m === "risk_assessment") return "cppa_risk_assessment";
    if (m === "cybersecurity")   return "cppa_cybersecurity";
    if (m === "admt")            return "cppa_admt";
  }
  return TABLE_DEFAULT_PRODUCT[table];
}

interface SweepResult {
  table: string;
  retried: number;
  refunded: number;
  credited: number;
  failed_resolved: number;
  skipped_no_evidence: number;
  errors: string[];
}

async function sweepTable(table: string): Promise<SweepResult> {
  const result: SweepResult = {
    table, retried: 0, refunded: 0, credited: 0, failed_resolved: 0, skipped_no_evidence: 0, errors: [],
  };


  const stuckCutoff = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60_000).toISOString();

  // Pull candidates. Cap to 25 per sweep per table to keep one invocation
  // bounded; the cron re-runs every few minutes.
  const { data: rows, error } = await supabase
    .from(table)
    .select("*")
    .or(
      `status.eq.error,status.eq.failed,and(status.eq.processing,last_attempt_at.lt.${stuckCutoff})`,
    )
    .lt("retry_count", MAX_ATTEMPTS)
    .limit(25);

  if (error) {
    result.errors.push(`select: ${error.message}`);
    return result;
  }
  if (!rows || rows.length === 0) return result;

  for (const row of rows) {
    const attemptsSoFar: number = row.retry_count ?? 0;
    const exhausted = attemptsSoFar >= MAX_ATTEMPTS - 1;

    if (!exhausted) {
      // ── RETRY ───────────────────────────────────────────────────────────
      const productType = productTypeForRow(table, row);
      const dispatch = PRODUCT_DISPATCH[productType];
      if (!dispatch) {
        result.errors.push(`no dispatch for ${productType} (row ${row.id})`);
        continue;
      }

      // Guarded transition: only flip if the row is still in the failed/stuck
      // state we observed. Another cron run racing us will see no rows updated.
      const { data: claimed, error: claimErr } = await supabase
        .from(table)
        .update({
          status: "processing",
          retry_count: attemptsSoFar + 1,
          last_attempt_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id)
        .in("status", ["error", "failed", "processing"])
        .eq("retry_count", attemptsSoFar)
        .select("id")
        .maybeSingle();

      if (claimErr || !claimed) {
        // Lost the race or row moved on; skip.
        continue;
      }

      const { error: invokeErr } = await supabase.functions.invoke(dispatch.fn, {
        body: { [dispatch.bodyKey]: row.id, retry_attempt: attemptsSoFar + 1 },
      });
      if (invokeErr) {
        result.errors.push(`invoke ${dispatch.fn}: ${invokeErr.message}`);
        // Roll back status so the next sweep picks it up again.
        await supabase.from(table).update({
          status: "error",
          last_error: `retry invoke failed: ${invokeErr.message}`,
        }).eq("id", row.id);
        continue;
      }
      result.retried += 1;
      console.log(`[retry-sweep] ${table}/${row.id} retried (attempt ${attemptsSoFar + 1}/${MAX_ATTEMPTS})`);
      continue;
    }

    // ── EXHAUSTED → RESOLVE (refund or service credit) ─────────────────────
    try {
      const resolution = await resolveExhausted(table, row);
      if (resolution === "refunded")        result.refunded += 1;
      else if (resolution === "credited")   result.credited += 1;
      else if (resolution === "failed")     result.failed_resolved += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`resolve ${row.id}: ${msg}`);
    }
  }
  return result;
}

type Resolution = "refunded" | "credited" | "failed" | "skipped";

async function resolveExhausted(table: string, row: any): Promise<Resolution> {
  // Purchaser path: refund via Stripe, then mark row refunded.
  if (row.stripe_payment_intent_id) {
    const env: StripeEnv = (Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox");
    const stripe = createStripeClient(env);

    // Idempotency: scope to row+pi so re-running the sweeper for the same
    // exhausted row never issues a second refund.
    const idempotencyKey = `eup-refund-${table}-${row.id}`;

    try {
      await stripe.refunds.create(
        { payment_intent: row.stripe_payment_intent_id },
        { idempotencyKey },
      );
    } catch (e: any) {
      // If the PI is already refunded Stripe returns charge_already_refunded;
      // treat as success so we still mark the row.
      const code = e?.code || e?.raw?.code;
      if (code !== "charge_already_refunded") throw e;
    }

    // Guarded write: only flip rows that are still in a terminal failed state.
    const { data: flipped } = await supabase
      .from(table)
      .update({
        status: "refunded",
        last_error: row.last_error ?? "Generation failed after max retries; payment refunded.",
      })
      .eq("id", row.id)
      .in("status", ["error", "failed", "processing"])
      .select("id")
      .maybeSingle();

    if (flipped) {
      // Mirror to the purchase ledger for reporting.
      await supabase
        .from("assessment_purchases")
        .update({ status: "refunded" })
        .eq("assessment_id", row.id);
      console.log(`[retry-sweep] ${table}/${row.id} REFUNDED via ${row.stripe_payment_intent_id}`);
      return "refunded";
    }
    return "skipped";
  }

  // Subscriber path: grant one annual tool credit + mark row resolved.
  // The credit grant is upsert-style — re-running the sweeper for the same
  // exhausted row never grants a duplicate credit because we key on
  // (user_id, redeemed_assessment_id placeholder via a deterministic
  // cycle_start + credit_index combo).
  if (row.user_id) {
    // Use the row id hashed into credit_index space (large negative integer)
    // to guarantee uniqueness per failed run without colliding with the
    // normal annual-grant credit_index range (0..N).
    const idHash = row.id.replace(/-/g, "").slice(0, 8);
    const creditIndex = -1 * (parseInt(idHash, 16) % 2_000_000_000);

    // ENT-1: server-side sweeper always grants live-scoped credits.
    const { error: insertErr } = await supabase.from("annual_tool_credits").insert({
      user_id: row.user_id,
      cycle_start: new Date().toISOString().slice(0, 10),
      granted_at: new Date().toISOString(),
      credit_index: creditIndex,
      environment: "live",
    });
    // 23505 = unique_violation → already granted for this row, idempotent.
    if (insertErr && (insertErr as any).code !== "23505") {
      throw new Error(`credit grant failed: ${insertErr.message}`);
    }

    const { data: flipped } = await supabase
      .from(table)
      .update({
        status: "failed_resolved",
        last_error: row.last_error ?? "Generation failed after max retries; service credit issued.",
      })
      .eq("id", row.id)
      .in("status", ["error", "failed", "processing"])
      .select("id")
      .maybeSingle();

    if (flipped) {
      console.log(`[retry-sweep] ${table}/${row.id} CREDITED (subscriber ${row.user_id})`);
      return "credited";
    }
    return "skipped";
  }

  // No PI and no user — just mark failed so the row stops being swept.
  await supabase
    .from(table)
    .update({ status: "failed_resolved" })
    .eq("id", row.id)
    .in("status", ["error", "failed", "processing"]);
  return "failed";
}

// ── Registration orders: finalize completed, fail genuinely-stuck ──────────
// Registration uses `fulfillment_status` (not `status`) and a fan-out worker
// architecture; this sweeper is the never-stuck backstop. It runs every ~3 min
// and either finalizes orders whose per-jurisdiction workers have all landed
// docs, or fails orders that have blown past the wall-clock budget.
async function sweepRegistrationOrders(): Promise<{ finalized: number; failed: number; errors: string[] }> {
  const out = { finalized: 0, failed: 0, errors: [] as string[] };
  const REG_STUCK_MIN = 8;
  const regCutoff = new Date(Date.now() - REG_STUCK_MIN * 60_000).toISOString();
  const { data: genOrders, error } = await supabase
    .from("registration_orders")
    .select("id, tier, jurisdictions, documents_generation_started_at")
    .eq("fulfillment_status", "generating");
  if (error) {
    out.errors.push(`select registration_orders: ${error.message}`);
    return out;
  }
  for (const o of genOrders ?? []) {
    const { data: docs } = await supabase
      .from("registration_documents")
      .select("jurisdiction_code, document_type")
      .eq("order_id", o.id);
    const haveJur = new Set((docs ?? []).map((d: any) => d.jurisdiction_code));
    const expectedJur = (o.jurisdictions ?? []).length;

    // Finalize when every expected jurisdiction has produced at least one doc.
    if (expectedJur > 0 && haveJur.size >= expectedJur && (docs ?? []).length > 0) {
      const { data: flipped } = await supabase
        .from("registration_orders")
        .update({
          fulfillment_status: o.tier === "diy" ? "documents_ready" : "ready_to_file",
          documents_generated_at: new Date().toISOString(),
        })
        .eq("id", o.id)
        .eq("fulfillment_status", "generating")
        .select("id")
        .maybeSingle();
      if (flipped) {
        out.finalized += 1;
        try { await supabase.functions.invoke("send-registration-delivery-email", { body: { order_id: o.id } }); } catch (_) {}
        try { await supabase.functions.invoke("schedule-registration-renewals", { body: { order_id: o.id } }); } catch (_) {}
      }
      continue;
    }

    // Otherwise, if it has been stuck past the wall-clock budget, fail it.
    if (o.documents_generation_started_at && o.documents_generation_started_at < regCutoff) {
      const { data: flipped } = await supabase
        .from("registration_orders")
        .update({
          fulfillment_status: "generation_failed",
          validation_notes: "reaped: incomplete past wall-clock budget",
        })
        .eq("id", o.id)
        .eq("fulfillment_status", "generating")
        .select("id")
        .maybeSingle();
      if (flipped) out.failed += 1;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const results: SweepResult[] = [];
  for (const table of TARGET_TABLES) {
    try {
      results.push(await sweepTable(table));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ table, retried: 0, refunded: 0, credited: 0, failed_resolved: 0, errors: [msg] });
    }
  }
  let registration: { finalized: number; failed: number; errors: string[] } = { finalized: 0, failed: 0, errors: [] };
  try {
    registration = await sweepRegistrationOrders();
  } catch (e) {
    registration.errors.push(e instanceof Error ? e.message : String(e));
  }
  const summary = {
    elapsed_ms: Date.now() - startedAt,
    max_attempts: MAX_ATTEMPTS,
    stuck_minutes: STUCK_PROCESSING_MINUTES,
    results,
    registration,
  };
  console.log("[retry-failed-generations] summary", JSON.stringify(summary));
  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

