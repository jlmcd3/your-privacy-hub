// Shared logic for legislation ingestion functions.
// Topic-keyword allowlist, stage normalization, and upsert helpers.

export const TOPIC_KEYWORDS: string[] = [
  "privacy",
  "data protection",
  "personal data",
  "personal information",
  "data broker",
  "ai",
  "artificial intelligence",
  "automated decision",
  "biometric",
  "facial recognition",
  "consent",
  "surveillance",
  "cybersecurity",
  "cyber security",
  "breach notification",
  "data breach",
  "children's online",
  "childrens online",
  "kids online",
  "online safety",
];

// Phrases / words that should require *boundary* matches because the bare term is too broad.
// e.g. matching "ai" inside "said" / "again" would over-fire.
const WORD_BOUNDARY_TERMS = new Set(["ai"]);

export function matchTopicKeywords(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const kw of TOPIC_KEYWORDS) {
    if (WORD_BOUNDARY_TERMS.has(kw)) {
      const re = new RegExp(`\\b${kw}\\b`, "i");
      if (re.test(lower)) matched.push(kw);
    } else if (lower.includes(kw)) {
      matched.push(kw);
    }
  }
  return matched;
}

export function isPrivacyRelated(...texts: (string | null | undefined)[]): {
  match: boolean;
  keywords: string[];
} {
  const combined = texts.filter(Boolean).join(" \n ");
  const keywords = matchTopicKeywords(combined);
  return { match: keywords.length > 0, keywords };
}

export type NormalizedStage =
  | "enacted"
  | "passed"
  | "committee"
  | "introduced"
  | "proposed"
  | "withdrawn";

export function normalizeStage(raw: string | null | undefined): NormalizedStage {
  if (!raw) return "introduced";
  const s = raw.toLowerCase();
  if (/(enacted|signed|became law|in force|royal assent|promulgated|sancion)/.test(s)) return "enacted";
  if (/(passed|approved by|adopted|aprovad|aprobad)/.test(s)) return "passed";
  if (/(committee|comissão|commission|comité|comite)/.test(s)) return "committee";
  if (/(withdrawn|rejected|defeated|archivad|arquivad)/.test(s)) return "withdrawn";
  if (/(proposed|consultation|draft|projeto de lei|propuesta)/.test(s)) return "proposed";
  return "introduced";
}

export interface NormalizedBill {
  source: string;
  external_id: string;
  jurisdiction: string;
  iso2?: string | null;
  jurisdiction_slug?: string | null;
  region?: string | null;
  bill_name: string;
  bill_number?: string | null;
  stage: NormalizedStage;
  summary?: string | null;
  key_provisions?: string[];
  source_url?: string | null;
  source_name?: string | null;
  introduced_at?: string | null; // YYYY-MM-DD
  source_last_action_at?: string | null;
  matched_keywords?: string[];
  raw_payload?: unknown;
}

export interface RunCounts {
  fetched: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  rejected_samples: { title?: string; reason: string }[];
}

export function newRunCounts(): RunCounts {
  return { fetched: 0, inserted: 0, updated: 0, unchanged: 0, rejected: 0, rejected_samples: [] };
}

export function reject(counts: RunCounts, title: string | undefined, reason: string) {
  counts.rejected += 1;
  if (counts.rejected_samples.length < 25) {
    counts.rejected_samples.push({ title, reason });
  }
}

export function validateBill(b: Partial<NormalizedBill>): string | null {
  if (!b.bill_name || b.bill_name.trim().length < 3) return "missing_or_short_name";
  if (!b.external_id) return "missing_external_id";
  if (!b.source) return "missing_source";
  if (!b.jurisdiction) return "missing_jurisdiction";
  return null;
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export async function upsertBill(
  supabase: SupabaseClient,
  bill: NormalizedBill,
  counts: RunCounts,
): Promise<void> {
  // Fetch existing for change detection.
  const { data: existing } = await supabase
    .from("legislation_bills")
    .select("id, stage, summary, source_url")
    .eq("source", bill.source)
    .eq("external_id", bill.external_id)
    .maybeSingle();

  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await supabase.from("legislation_bills").insert({
      ...bill,
      key_provisions: bill.key_provisions ?? [],
      matched_keywords: bill.matched_keywords ?? [],
      status: "active",
      last_seen_at: now,
      last_changed_at: now,
    });
    if (error) {
      reject(counts, bill.bill_name, `insert_failed:${error.message}`);
      return;
    }
    counts.inserted += 1;
    return;
  }

  const stageChanged = existing.stage !== bill.stage;
  const summaryChanged = (existing.summary ?? "") !== (bill.summary ?? "");
  const urlChanged = (existing.source_url ?? "") !== (bill.source_url ?? "");
  const changed = stageChanged || summaryChanged || urlChanged;

  const { error } = await supabase
    .from("legislation_bills")
    .update({
      bill_name: bill.bill_name,
      bill_number: bill.bill_number,
      jurisdiction: bill.jurisdiction,
      iso2: bill.iso2,
      jurisdiction_slug: bill.jurisdiction_slug,
      region: bill.region,
      stage: bill.stage,
      summary: bill.summary,
      key_provisions: bill.key_provisions ?? [],
      source_url: bill.source_url,
      source_name: bill.source_name,
      introduced_at: bill.introduced_at,
      source_last_action_at: bill.source_last_action_at,
      matched_keywords: bill.matched_keywords ?? [],
      raw_payload: bill.raw_payload,
      status: "active",
      last_seen_at: now,
      ...(changed ? { last_changed_at: now } : {}),
    })
    .eq("id", existing.id);

  if (error) {
    reject(counts, bill.bill_name, `update_failed:${error.message}`);
    return;
  }
  if (changed) counts.updated += 1;
  else counts.unchanged += 1;
}

export async function startRun(supabase: SupabaseClient, source: string): Promise<string> {
  const { data, error } = await supabase
    .from("legislation_ingestion_runs")
    .insert({ source, started_at: new Date().toISOString(), status: "running" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to start run: ${error.message}`);
  return data.id as string;
}

export async function finishRun(
  supabase: SupabaseClient,
  runId: string,
  startedMs: number,
  counts: RunCounts,
  status: "success" | "partial" | "failed",
  errorMessage?: string,
) {
  const finishedAt = new Date();
  await supabase
    .from("legislation_ingestion_runs")
    .update({
      finished_at: finishedAt.toISOString(),
      duration_ms: Date.now() - startedMs,
      status,
      fetched: counts.fetched,
      inserted: counts.inserted,
      updated: counts.updated,
      unchanged: counts.unchanged,
      rejected: counts.rejected,
      rejected_samples: counts.rejected_samples,
      error_message: errorMessage ?? null,
    })
    .eq("id", runId);
}

// Mark bills not seen in last N days as 'stale'. Source-scoped.
export async function markStaleBills(
  supabase: SupabaseClient,
  source: string,
  staleDays = 60,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleDays * 86400_000).toISOString();
  const { data, error } = await supabase
    .from("legislation_bills")
    .update({ status: "stale" })
    .eq("source", source)
    .eq("status", "active")
    .lt("last_seen_at", cutoff)
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}
