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

async function selectBatch(cohort: Cohort, authorityClass: string, limit: number) {
  // Scan a WINDOW larger than the batch: rows whose documents already landed
  // (or whose domain is robots-disallowed) must not pin the batch to the head
  // of the id order, which would make every scheduled run re-scan the same
  // finished rows and fetch almost nothing.
  const window = Math.min(limit * 25, 500);
  let q = sb
    .from("enforcement_actions")
    .select("id, source_url, authority_class, source_document_text", { count: "exact" })
    .not("source_url", "is", null)
    .order("id", { ascending: true })
    .limit(window);

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
  };
}


/** Walk the binding class order until a class yields work. */
async function nextWork(limit: number, cohortPref: Cohort | "auto") {
  const cohorts: Cohort[] = cohortPref === "auto" ? ["A", "B"] : [cohortPref];
  for (const cohort of cohorts) {
    for (const cls of CLASS_ORDER) {
      const sel = await selectBatch(cohort, cls, limit);
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
    const work = await nextWork(limit, cohortPref);
    if (!work) {
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

    for (const row of work.rows as any[]) {
      const url = row.source_url as string;
      const dom = domainOf(url);
      try {
        const res = await fetchSourceDocument(url);
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
        } else if (res.status === "skipped") {
          skipped++;
          const reason = res.reason ?? "skipped";
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
          perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
        } else {
          fetch_failed++;
          const reason = res.reason ?? `http_${res.http_status ?? 0}`;
          failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
          perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
        }
      } catch (e) {
        fetch_failed++;
        const reason = `driver_error:${(e as Error).message}`.slice(0, 120);
        failureReasons[reason] = (failureReasons[reason] ?? 0) + 1;
        perDomainFailures[dom] = (perDomainFailures[dom] ?? 0) + 1;
      }
      last_id = row.id;
      await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
    }

    await sb.from("corpus_refetch_ledger").insert({
      campaign_id,
      cohort: work.cohort,
      authority_class: work.authorityClass,
      attempted: work.rows.length,
      fetched_ok,
      fetch_failed,
      skipped,
      per_domain_failures: perDomainFailures,
      failure_reasons: failureReasons,
      last_id,
    });

    await sb.rpc("release_job_lease" as any, { _key: lockKey });

    return new Response(
      JSON.stringify({
        campaign_id,
        cohort: work.cohort,
        authority_class: work.authorityClass,
        attempted: work.rows.length,
        fetched_ok,
        fetch_failed,
        skipped,
        remaining_in_class: work.remaining_in_class,
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
