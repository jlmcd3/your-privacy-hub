// ALL-PRODUCTS-TEST — Claude-generated intake source.
//
// /admin/static-stress generates intake data per company with Claude
// (generate-stress-fixtures → static_stress_jobs.fixture_data) and then runs
// every product against it through run-stress-job. This module ports that
// exact pipeline so /admin/all-products-test can run any product against
// Claude-generated intake instead of the pre-set sample package. Nothing is
// re-implemented here: the batch is launched with start-stress-batch and the
// resulting jobs are polled — the same server path AdminStaticStress uses.

import { supabase } from "@/integrations/supabase/client";
import type { ToolSlug } from "@/lib/sampleFixtures";
import { invokeWithTimeout } from "@/lib/sampleGenerators";

// FREEZE FIX (2026-08-30): a hung network call in the batch monitor loop
// froze the page's progress display even though the batch kept running
// server-side. Every await in this module now settles within a bounded time;
// the monitor's per-iteration try/catch turns a timeout into a logged retry.
function raceTimeout<T>(p: PromiseLike<T>, ms: number, what: string): Promise<T> {
  // Supabase query builders are PromiseLike (thenable) but lack .catch/.finally —
  // normalize through Promise.resolve so the timeout wrapper always works.
  const real = Promise.resolve(p);
  void real.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** Industries recognised by generate-stress-fixtures (AdminStaticStress list). */
export const STRESS_INDUSTRIES: Array<{ id: string; label: string }> = [
  { id: "web", label: "Online & Web Services" },
  { id: "mobile", label: "Mobile Applications" },
  { id: "adtech", label: "AdTech & Digital Media" },
  { id: "ai", label: "AI & Machine Learning" },
  { id: "healthcare", label: "Healthcare & Life Sciences" },
  { id: "fintech", label: "Financial Services & Fintech" },
  { id: "hr", label: "HR & Employment Data" },
  { id: "edtech", label: "Children & EdTech" },
  { id: "retail", label: "Retail & E-Commerce" },
  { id: "databroker", label: "Data Brokers" },
  { id: "insurance", label: "Insurance" },
  { id: "telecom", label: "Telecommunications" },
  { id: "gaming", label: "Gaming & Entertainment" },
  { id: "auto", label: "Automotive & Connected Vehicles" },
  { id: "iot", label: "Smart Home & IoT" },
  { id: "media", label: "Media & Publishing" },
  { id: "gov", label: "Government & Public Sector" },
  { id: "cyber", label: "Cybersecurity" },
  { id: "pharma", label: "Pharma & Clinical Research" },
  { id: "biotech", label: "Biotech & Genomics" },
  { id: "kyc", label: "Identity Verification & KYC" },
];

/** Panel product slug → the stress-harness tool id used by run-stress-job. */
export const SLUG_TO_STRESS_TOOL: Record<ToolSlug, string> = {
  li_assessment: "lia",
  dpia: "dpia",
  dpa: "dpa",
  governance: "governance",
  ir_playbook: "ir-playbook",
  biometric: "biometric",
  cppa_risk: "cppa-risk",
  cppa_cyber: "cppa-cyber",
  cppa_admt: "cppa-admt",
  ropa: "ropa",
  us_notice: "us-notice",
  eu_notice: "eu-notice",
  registration: "registration",
};

export const STRESS_TOOL_TO_SLUG: Record<string, ToolSlug> = Object.fromEntries(
  Object.entries(SLUG_TO_STRESS_TOOL).map(([slug, tool]) => [tool, slug as ToolSlug]),
) as Record<string, ToolSlug>;

export interface StressJobRow {
  id: string;
  tool_slug: string;
  status: string;
  company_name: string | null;
  error_message: string | null;
  source_row_id: string | null;
}

/**
 * GEO-DEMAND LAW (2026-09-03): the number of documents a product gets equals
 * the number of companies in ITS geo. Requesting N runs of a US-only product
 * (CPPA suite / US Notice) with geo_filter="both" produced only the US wave's
 * companies — and the old cap of 2 slots meant a 4-document request yielded 2.
 * geo_filter is now derived from the selected products, and slots_per_geo
 * carries the requested count (up to 8) so N requested = N produced.
 */
const STRESS_TOOL_GEO: Record<string, "us" | "eu" | "both"> = {
  governance: "eu", dpa: "both", "ir-playbook": "both", biometric: "both",
  registration: "eu", lia: "eu", dpia: "eu", ropa: "eu", "eu-notice": "eu",
  "us-notice": "us", "cppa-risk": "us", "cppa-cyber": "us", "cppa-admt": "us",
};

export async function launchClaudeIntakeBatch(opts: {
  userId: string;
  slugs: ToolSlug[];
  industryId: string;
  companiesPerGeo: number;
}): Promise<string> {
  // AUTH-GATE (2026-09-05): start-stress-batch is admin-only. When the browser
  // session has lapsed, supabase-js falls back to the publishable key as the
  // bearer, which the auth server rejects (bad_jwt) and the function answers
  // 403 forbidden. Refresh/verify the session first and fail with a clear message.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    throw new Error("Your session has expired — sign in again to start a batch.");
  }

  const industry = STRESS_INDUSTRIES.find((i) => i.id === opts.industryId);
  if (!industry) throw new Error(`unknown industry: ${opts.industryId}`);
  const tools = Array.from(new Set(opts.slugs.map((s) => SLUG_TO_STRESS_TOOL[s]))).filter(Boolean);
  if (!tools.length) throw new Error("no products selected");


  const geos = new Set<string>();
  for (const t of tools) {
    const g = STRESS_TOOL_GEO[t] ?? "both";
    if (g === "both") { geos.add("us"); geos.add("eu"); } else geos.add(g);
  }
  const geoFilter = geos.size === 1 ? [...geos][0] : "both";

  const { data, error } = await invokeWithTimeout<{ batch_id?: string; error?: string }>(
    "start-stress-batch",
    {
      run_by: opts.userId,
      industries: [{ id: industry.id, label: industry.label }],
      geo_filter: geoFilter,
      selected_tools: tools,
      slots_per_geo: Math.max(1, Math.min(8, Math.round(opts.companiesPerGeo || 1))),
    },
    90_000,
  );

  if (error || !data?.batch_id) {
    throw new Error(error?.message ?? data?.error ?? "start-stress-batch returned no batch_id");
  }
  return data.batch_id as string;
}

export async function fetchClaudeBatchJobs(batchId: string): Promise<StressJobRow[]> {
  const { data, error } = await raceTimeout(
    supabase
      .from("static_stress_jobs")
      .select("id, tool_slug, status, company_name, error_message, source_row_id")
      .eq("batch_id", batchId) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
    20_000,
    "job status read",
  );
  if (error) throw error;
  return ((data as StressJobRow[] | null) ?? []);
}

export async function fetchClaudeBatchStatus(
  batchId: string,
): Promise<{ status: string; total_jobs: number; completed_jobs: number; failed_jobs: number; setup_total: number; setup_done: number }> {
  const { data, error } = await raceTimeout(
    supabase
      .from("static_stress_batches")
      .select("status, total_jobs, completed_jobs, failed_jobs, setup_total, setup_done")
      .eq("id", batchId)
      .single() as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
    20_000,
    "batch status read",
  );
  if (error || !data) throw new Error(error?.message ?? "batch not found");
  return data as any;
}

/**
 * CANCEL BATCH — admin stop for a Claude-intake stress batch. Jobs that have
 * not finished are marked cancelled so run-stress-job's dispatcher stops
 * picking them up, and the batch row itself moves to a terminal state so the
 * panel's progress monitor detaches.
 */
export async function cancelClaudeBatch(batchId: string): Promise<{ cancelledJobs: number }> {
  const { data: jobs, error: jobErr } = await supabase
    .from("static_stress_jobs")
    .update({ status: "cancelled", error_message: "cancelled by admin" })
    .eq("batch_id", batchId)
    .in("status", ["pending", "queued", "running", "processing"])
    .select("id");
  if (jobErr) throw jobErr;

  const { error: batchErr } = await supabase
    .from("static_stress_batches")
    .update({ status: "cancelled" })
    .eq("id", batchId);
  if (batchErr) throw batchErr;

  return { cancelledJobs: jobs?.length ?? 0 };
}
