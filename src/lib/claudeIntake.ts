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
 * Launch a Claude-intake batch for the given products.
 * geo_filter is always "both" so EU-only (LIA/DPIA/RoPA/EU Notice) and
 * US-only (CPPA suite / US Notice) tools all receive an applicable company.
 */
export async function launchClaudeIntakeBatch(opts: {
  userId: string;
  slugs: ToolSlug[];
  industryId: string;
  companiesPerGeo: number;
}): Promise<string> {
  const industry = STRESS_INDUSTRIES.find((i) => i.id === opts.industryId);
  if (!industry) throw new Error(`unknown industry: ${opts.industryId}`);
  const tools = Array.from(new Set(opts.slugs.map((s) => SLUG_TO_STRESS_TOOL[s]))).filter(Boolean);
  if (!tools.length) throw new Error("no products selected");

  const { data, error } = await supabase.functions.invoke("start-stress-batch", {
    body: {
      run_by: opts.userId,
      industries: [{ id: industry.id, label: industry.label }],
      geo_filter: "both",
      selected_tools: tools,
      slots_per_geo: Math.max(1, Math.min(2, opts.companiesPerGeo)),
    },
  });
  if (error || !data?.batch_id) {
    throw new Error(error?.message ?? data?.error ?? "start-stress-batch returned no batch_id");
  }
  return data.batch_id as string;
}

export async function fetchClaudeBatchJobs(batchId: string): Promise<StressJobRow[]> {
  const { data, error } = await supabase
    .from("static_stress_jobs")
    .select("id, tool_slug, status, company_name, error_message, source_row_id")
    .eq("batch_id", batchId);
  if (error) throw error;
  return (data ?? []) as StressJobRow[];
}

export async function fetchClaudeBatchStatus(
  batchId: string,
): Promise<{ status: string; total_jobs: number; completed_jobs: number; failed_jobs: number; setup_total: number; setup_done: number }> {
  const { data, error } = await supabase
    .from("static_stress_batches")
    .select("status, total_jobs, completed_jobs, failed_jobs, setup_total, setup_done")
    .eq("id", batchId)
    .single();
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
