// ITEM 365 LEG 2 — CORPUS REFETCH CAMPAIGN DRIVER.
//
// Executes the Item 356 plan as written: Cohort A (subject-defect
// unrepairable) then Cohort B (unverified, document-less), CPPA authority
// class first, then EU/EEA/UK DPAs, then the rest.
//
// It fetches through the hardened shared fetcher (robots.txt honoured, UA
// strategy, retries, 7-day source_document_cache write) and records per-domain
// failure counts into public.corpus_refetch_ledger.
//
// DEGRADATION LAW: a document either arrives and is stored verbatim, or the
// row is left untouched and the failure is counted. Nothing is invented.
//
// CPPA-INCLUSION-GATE unchanged: CPPA rows are fetched first for corpus
// quality only; no product surface is wired to them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";
import { fetchSourceDocument } from "../_shared/enforcement/source-fetcher.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const MIN_DOC_CHARS = 200;
const POLITE_DELAY_MS = 1_200;
const LEASE_SECONDS = 300;

/** Binding authority-class order from the Item 356 plan §8. */
const CLASS_ORDER = [
  "cppa",
  "eu_dpa",
  "eea_dpa",
  "uk_dpa",
  "us_state_ag",
  "us_federal_agency",
  "ca_commissioner",
  "court",
  "other",
] as const;

type Cohort = "A" | "B";

function domainOf(url: string | null): string {
  try {
    return new URL(url ?? "").hostname || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Persisted cursor per (campaign_id, cohort, authority_class): the highest
 * `last_id` this campaign has already walked past for that combination.
 * Without it every run re-scans from the head of the id order and retries the
 * same permanently-unfetchable rows forever (Item 365 Leg 2 stall).
 */
async function cursorFor(campaignId: string, cohort: Cohort, authorityClass: string) {
  const { data } = await sb
    .from("corpus_refetch_ledger")
    .select("last_id")
    .eq("campaign_id", campaignId)
    .eq("cohort", cohort)
    .eq("authority_class", authorityClass)
    .not("last_id", "is", null)
    .order("last_id", { ascending: false })
    .limit(1);
  return (data?.[0]?.last_id as string | undefined) ?? null;
}

async function selectBatch(
  campaignId: string,
  cohort: Cohort,
  authorityClass: string,
  limit: number,
) {
  // Scan a WINDOW larger than the batch: rows whose documents already landed
  // (or whose domain is robots-disallowed) must not pin the batch to the head
  // of the id order, which would make every scheduled run re-scan the same
  // finished rows and fetch almost nothing.
  const window = Math.min(limit * 25, 500);
  const cursor = await cursorFor(campaignId, cohort, authorityClass);
  let q = sb
    .from("enforcement_actions")
    .select("id, source_url, authority_class, source_document_text", { count: "exact" })
    .not("source_url", "is", null)
    .order("id", { ascending: true })
    .limit(window);

  if (cursor) q = q.gt("id", cursor);



  if (cohort === "A") {
    q = q.eq("review_reason", "corpus_defect_subject_unrepairable");
  } else {
    q = q.eq("verification_status", "unverified");
  }

  if (authorityClass === "other") {
    q = q.or(
      `authority_class.is.null,authority_class.not.in.(${CLASS_ORDER.filter((c) => c !== "other").join(",")})`,
    );
  } else {
    q = q.eq("authority_class", authorityClass);
  }

  const { data, count } = await q;
  // Rows that already carry a usable document need no fetch.
  const pending = (data ?? []).filter(
    (r: any) => (r.source_document_text?.length ?? 0) < MIN_DOC_CHARS,
  );
  const rows = pending.slice(0, limit);
  return {
    rows,
    remaining_in_class: count ?? 0,
    pending_in_window: pending.length,
    scanned: (data ?? []).length,
    cursor,
  };
}


// ─── PASS B (2026-08-03) — HOST-BUCKETED RESIDUAL REFETCH ────────────────────
// Leg 2's cursor is a one-way watermark per (cohort, authority_class): a row it
// walked past can never be re-selected, so every transient failure (timeout,
// 429, the robots false-positives fixed in the shared fetcher) was stranded.
// Pass B replaces the cursor with an attempt counter, which is self-advancing
// and retryable, and round-robins across hosts so one heavy domain
// (uodo.gov.pl holds 665 of the residual rows) cannot monopolise a run.
const PASS_B_MAX_ATTEMPTS = 3;
const PASS_B_PER_HOST_PER_RUN = 2;
const PASS_B_WINDOW = 400;
/** Reasons that will never resolve on a retry — retire the row immediately. */
const TERMINAL_REASONS = ["robots_disallow", "http_404", "http_410", "invalid_url"];

/**
 * Deterministic shard of a row id, so N workers can run concurrently over
 * disjoint slices of the same ordered window without coordinating.
 * uuids are hex, so the last nibble is a uniform 0-15 value.
 */
function shardOf(id: string, shardCount: number): number {
  const n = parseInt(String(id).replace(/[^0-9a-f]/gi, "").slice(-6) || "0", 16);
  return (Number.isFinite(n) ? n : 0) % shardCount;
}

async function selectPassB(limit: number, shard: number, shardCount: number) {
  const { data } = await sb
    .from("enforcement_actions")
    .select("id, source_url, authority_class, source_document_text, refetch_attempts")
    .not("source_url", "is", null)
    // Server-side narrowing keeps the window dense: without it most of the
    // 400-row window is already-hydrated rows and Pass B starves.
    .or("strat_has_document.is.false,strat_has_document.is.null")
    .lt("refetch_attempts", PASS_B_MAX_ATTEMPTS)
    .order("refetch_attempts", { ascending: true })
    .order("refetch_last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(PASS_B_WINDOW * (shardCount > 1 ? shardCount : 1));

  const pending = (data ?? []).filter(
    (r: any) =>
      (r.source_document_text?.length ?? 0) < MIN_DOC_CHARS &&
      (shardCount <= 1 || shardOf(r.id, shardCount) === shard),
  );


  // Round-robin the window by host, capped per host per run.
  const buckets = new Map<string, any[]>();
  for (const r of pending) {
    const h = domainOf(r.source_url);
    const b = buckets.get(h) ?? [];
    if (b.length < PASS_B_PER_HOST_PER_RUN) b.push(r);
    buckets.set(h, b);
  }
  const rows: any[] = [];
  for (let i = 0; i < PASS_B_PER_HOST_PER_RUN && rows.length < limit; i++) {
    for (const b of buckets.values()) {
      if (b[i] && rows.length < limit) rows.push(b[i]);
    }
  }
  return {
    rows,
    remaining_in_class: pending.length,
    pending_in_window: pending.length,
    scanned: (data ?? []).length,
    cursor: null as string | null,
    hosts_in_batch: new Set(rows.map((r) => domainOf(r.source_url))).size,
  };
}

/** Walk the binding class order until a class yields work. */
async function nextWork(campaignId: string, limit: number, cohortPref: Cohort | "auto") {
  const cohorts: Cohort[] = cohortPref === "auto" ? ["A", "B"] : [cohortPref];
  for (const cohort of cohorts) {
    for (const cls of CLASS_ORDER) {
      const sel = await selectBatch(campaignId, cohort, cls, limit);
      if (sel.rows.length > 0) return { cohort, authorityClass: cls, ...sel };
    }
  }
  return null;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin gate. Accepts the x-admin-token header, or the pg_cron shape used
  // elsewhere in the fleet (`x-internal-cron: 1` + admin/service bearer).
  const ADMIN = Deno.env.get("ADMIN_SECRET_TOKEN");
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const okHeader = !!ADMIN && req.headers.get("x-admin-token") === ADMIN;
  const okCron = req.headers.get("x-internal-cron") === "1" && (
    (!!ADMIN && bearer === ADMIN) || bearer === (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "\u0000")
  );
  if (!okHeader && !okCron) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const body = await req.json().catch(() => ({}));
  const campaign_id: string = body.campaign_id ?? "item365-refetch-campaign";
  const limit: number = Math.min(Math.max(Number(body.limit ?? 12), 1), 40);
  const cohortPref: Cohort | "auto" = body.cohort === "A" || body.cohort === "B" ? body.cohort : "auto";
  const dry_run: boolean = body.dry_run === true;
  const pass_b: boolean = body.mode === "pass_b";

  // Single-flight: the cron driver fires on a schedule and must never overlap.
  const lockKey = `refetch:${campaign_id}`;
  if (!dry_run) {
    const { data: got } = await sb.rpc("try_acquire_job_lease" as any, {
      _key: lockKey,
      _seconds: LEASE_SECONDS,
      _holder: "corpus-refetch-campaign",
    });
    if (got !== true) {
      return new Response(JSON.stringify({ campaign_id, skipped: "lease_held" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const work = pass_b
      ? { cohort: "B" as Cohort, authorityClass: "pass_b_multi_host", ...(await selectPassB(limit)) }
      : await nextWork(campaign_id, limit, cohortPref);
    if (!work || work.rows.length === 0) {
      if (!dry_run) await sb.rpc("release_job_lease" as any, { _key: lockKey });
      return new Response(
        JSON.stringify({ campaign_id, done: true, message: "population_exhausted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          campaign_id,
          dry_run: true,
          cohort: work.cohort,
          authority_class: work.authorityClass,
          would_fetch: work.rows.length,
          remaining_in_class: work.remaining_in_class,
          sample: work.rows.slice(0, 5).map((r: any) => ({ id: r.id, url: r.source_url })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let fetched_ok = 0, fetch_failed = 0, skipped = 0;
    const perDomainFailures: Record<string, number> = {};
    const failureReasons: Record<string, number> = {};
    let last_id: string | null = null;
    let attempted = 0;
    let deadline_hit = false;

    // ITEM 365 LEG 2 STALL FIX (2026-08-02).
    // Evidence: edge logs showed alternating `POST | 504 | execution_time_ms:
    // 150201` (wall-clock kill) and `POST | 200 | 331ms` (lease_held skip) on
    // every cycle since 16:19Z, with ZERO application log lines. The ledger
    // insert lived only AFTER the whole loop, so an isolate killed at the 150s
    // platform limit wrote nothing at all: no ledger row, no cursor advance, no
    // halted_reason. The next run then re-selected the identical eu_dpa batch
    // and died the same way — a permanent silent stall.
    //
    // Two structural defects, both fixed here:
    //  (1) NO TIME BUDGET. A single row can legitimately burn ~130s inside the
    //      shared fetcher (robots probe + 4 retry attempts x 30s timeout +
    //      10s UA-strategy wait + 21s backoffs). Twelve such rows can never
    //      finish inside 150s. We now enforce a whole-run deadline AND a
    //      per-row hard cap, so the run always returns under the limit.
    //  (2) ALL-OR-NOTHING LEDGER WRITE. Progress is now checkpointed to the
    //      ledger row after EVERY row, so a kill can never erase the cursor.
    const RUN_DEADLINE_MS = 110_000;
    const PER_ROW_CAP_MS = 45_000;
    const startedMs = Date.now();

    // Create the ledger row up-front so every subsequent row checkpoints into
    // it. If this isolate is killed mid-loop, the row survives with the
    // last_id reached so far and the cursor advances regardless.
    const { data: ledgerRow, error: ledgerErr } = await sb
      .from("corpus_refetch_ledger")
      .insert({
        campaign_id,
        cohort: work.cohort,
        authority_class: work.authorityClass,
        attempted: 0,
        fetched_ok: 0,
        fetch_failed: 0,
        skipped: 0,
        per_domain_failures: {},
        failure_reasons: {},
        last_id: null,
      })
      .select("id")
      .single();

    if (ledgerErr || !ledgerRow) {
      console.error(JSON.stringify({
        evt: "ledger_open_failed",
        fn: "corpus-refetch-campaign",
        campaign_id,
        cohort: work.cohort,
        authority_class: work.authorityClass,
        message: ledgerErr?.message ?? "no row returned",
      }));
      await sb.rpc("release_job_lease" as any, { _key: lockKey });
      return new Response(
        JSON.stringify({ error: "ledger_open_failed", message: ledgerErr?.message ?? null }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const checkpoint = async () => {
      const { error } = await sb
        .from("corpus_refetch_ledger")
        .update({
          attempted,
          fetched_ok,
          fetch_failed,
          skipped,
          per_domain_failures: perDomainFailures,
          failure_reasons: failureReasons,
          last_id,
        })
        .eq("id", ledgerRow.id);
      if (error) {
        console.error(JSON.stringify({
          evt: "ledger_checkpoint_failed",
          fn: "corpus-refetch-campaign",
          ledger_id: ledgerRow.id,
          message: error.message,
        }));
      }
    };

    console.log(JSON.stringify({
      evt: "refetch_batch_start",
      fn: "corpus-refetch-campaign",
      campaign_id,
      cohort: work.cohort,
      authority_class: work.authorityClass,
      rows: work.rows.length,
      cursor_from: work.cursor,
      ledger_id: ledgerRow.id,
    }));

    for (const row of work.rows as any[]) {
      if (Date.now() - startedMs > RUN_DEADLINE_MS) {
        deadline_hit = true;
        console.log(JSON.stringify({
          evt: "refetch_deadline_hit",
          fn: "corpus-refetch-campaign",
          processed: attempted,
          of: work.rows.length,
          elapsed_ms: Date.now() - startedMs,
          last_id,
        }));
        break;
      }

      const url = row.source_url as string;
      const dom = domainOf(url);
      const rowStart = Date.now();
      // Pass B bookkeeping: every row records its own outcome so the attempt
      // counter can retire it or hand it back for a later retry.
      let rowOk = false;
      let rowReason: string | null = null;
      try {
        // Per-row hard cap: the shared fetcher's own retry ladder can exceed
        // the whole-run budget on a single unresponsive host.
        const res = await Promise.race([
          fetchSourceDocument(url),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("row_time_cap")), PER_ROW_CAP_MS)
          ),
        ]);
        if (res.status === "ok" && (res.content_text?.length ?? 0) >= MIN_DOC_CHARS) {
          await sb
            .from("enforcement_actions")
            .update({
              source_document_text: res.content_text,
              source_document_hash: res.content_hash,
              source_document_fetched_at: new Date().toISOString(),
              strat_has_document: true,
            })
            .eq("id", row.id);
          fetched_ok++;
          rowOk = true;
        } else if (res.status === "skipped") {
          skipped++;
          const reason = res.reason ?? "skipped";
          rowReason = reason;
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
          perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
        } else {
          fetch_failed++;
          const reason = res.reason ?? `http_${res.http_status ?? 0}`;
          rowReason = reason;
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
          perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
        }
      } catch (e) {
        fetch_failed++;
        const msg = (e as Error).message;
        const reason = msg === "row_time_cap"
          ? "row_time_cap"
          : `driver_error:${msg}`.slice(0, 120);
        rowReason = reason;
        failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
        perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
        console.warn(JSON.stringify({
          evt: "refetch_row_failed",
          row_id: row.id,
          domain: dom,
          reason,
          elapsed_ms: Date.now() - rowStart,
        }));
      }

      // Attempt bookkeeping replaces the one-way watermark: a success clears
      // the counter, a terminal reason retires the row, and anything else
      // leaves it eligible for a later pass until MAX_ATTEMPTS.
      const attemptsNow = rowOk
        ? 0
        : TERMINAL_REASONS.includes(rowReason ?? "")
        ? PASS_B_MAX_ATTEMPTS
        : (row.refetch_attempts ?? 0) + 1;
      await sb
        .from("enforcement_actions")
        .update({
          refetch_attempts: attemptsNow,
          refetch_last_error: rowOk ? null : rowReason,
          refetch_last_attempt_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      last_id = row.id;
      attempted++;
      // Checkpoint BEFORE the polite delay so a kill during the sleep still
      // leaves the cursor advanced.
      await checkpoint();
      if (Date.now() - startedMs < RUN_DEADLINE_MS) {
        await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
      }
    }

    await checkpoint();

    console.log(JSON.stringify({
      evt: "refetch_batch_done",
      fn: "corpus-refetch-campaign",
      cohort: work.cohort,
      authority_class: work.authorityClass,
      attempted,
      fetched_ok,
      fetch_failed,
      skipped,
      deadline_hit,
      elapsed_ms: Date.now() - startedMs,
      last_id,
    }));


    await sb.rpc("release_job_lease" as any, { _key: lockKey });

    return new Response(
      JSON.stringify({
        campaign_id,
        cohort: work.cohort,
        authority_class: work.authorityClass,
        attempted,
        batch_size: work.rows.length,
        deadline_hit,
        fetched_ok,
        fetch_failed,
        skipped,
        remaining_in_class: work.remaining_in_class,
        cursor_from: work.cursor,
        per_domain_failures: perDomainFailures,
        failure_reasons: failureReasons,
        last_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await sb.rpc("release_job_lease" as any, { _key: lockKey });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
