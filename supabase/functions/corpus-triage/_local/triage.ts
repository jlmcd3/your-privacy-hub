// Pure logic for the corpus triage pass (dark, additive).
//
// The deterministic sweep (corpus_sweep_v2) left a bucket of rows tagged
// `needs_triage`: records with no recoverable subject, or whose document class
// the keyword rules could not decide. This module holds everything that can be
// reasoned about without a network call, so the handler stays thin and the
// logic is testable.
//
// NOTHING here writes to enforcement_actions. Results land in
// corpus_triage_results and wait for human ratification, exactly as the
// taxonomy document requires.

export const TRIAGE_PIPELINE_VERSION = "corpus-triage-v1-2026-09-07";
export const TRIAGE_LEASE_SECONDS = 330;
export const MAX_BATCH_SIZE = 24;
export const MAX_CONCURRENCY = 8;
/** Wall-clock budget for one invocation; waves keep running until it is spent. */
export const INVOCATION_BUDGET_MS = 240_000;
/** Shard counts must divide the 16 leading hex values of a uuid evenly. */
export const SHARD_COUNTS = [1, 2, 4, 8, 16] as const;
export const EXCERPT_CHARS = 6000;

export const RECORD_CLASSES = [
  "enforcement_decision",
  "enforcement_procedural",
  "regulator_guidance",
  "statutory_code",
  "legislation_or_provision",
  "court_judgment",
  "litigation_matter",
  "breach_notification",
  "news_or_press",
  "consultation_draft",
  "site_boilerplate",
  "junk_asset",
  "insufficient_content",
  "unclassified_document",
] as const;

export const USABLE_FOR = [
  "enforcement_database",
  "li_precedent_candidate",
  "guidance_corpus",
  "authority_rules_source",
  "news_digest",
  "weekly_brief",
  "breach_intelligence",
  "litigation_watch",
  "legislation_tracker",
  "training_context_only",
  "needs_triage",
  "discard",
] as const;

export const TOPIC_TAGS = [
  "legitimate_interests", "consent", "transparency", "data_minimisation", "security_art32",
  "breach_notification", "dsar_rights", "international_transfers", "direct_marketing_pecr",
  "cookies_tracking", "adtech_profiling", "admt_ai", "biometrics", "children",
  "employee_monitoring", "special_category", "dpo_governance", "ropa_records",
  "dpia_required", "processor_contracts", "retention", "credit_fraud_scoring",
] as const;

export const LI_RELEVANCE = ["direct", "adjacent", "none"] as const;

export interface TriageRequest {
  run_id: string;
  batch_size: number;
  cursor?: string | null;
  dry_run: boolean;
  shard_index: number;
  shard_count: number;
}

/**
 * Inclusive lower / exclusive upper uuid bound for a shard. Sharding on the
 * leading hex nibble lets several workers walk disjoint slices of the same
 * queue in parallel without any coordination beyond their own cursor.
 */
export function shardBounds(index: number, count: number): { lo: string; hi: string | null } {
  const per = 16 / count;
  const loNibble = Math.round(index * per);
  const hiNibble = Math.round((index + 1) * per);
  const hex = (n: number) => n.toString(16);
  return {
    lo: `${hex(loNibble)}0000000-0000-0000-0000-000000000000`,
    hi: hiNibble >= 16 ? null : `${hex(hiNibble)}0000000-0000-0000-0000-000000000000`,
  };
}

/** Records worth handing to the LIA classifier once triage has labelled them. */
const HANDOFF_CLASSES = [
  "enforcement_decision",
  "enforcement_procedural",
  "court_judgment",
  "regulator_guidance",
];

export function isLiaHandoff(outcome: TriageOutcome): boolean {
  if (outcome.status !== "ok") return false;
  if (!outcome.proposed_record_class || !HANDOFF_CLASSES.includes(outcome.proposed_record_class)) return false;
  if (outcome.proposed_usable_for.includes("li_precedent_candidate")) return true;
  return outcome.proposed_li_relevance === "direct" || outcome.proposed_li_relevance === "adjacent";
}

export function parseTriageRequest(body: Record<string, unknown>): TriageRequest {
  const runId = typeof body.run_id === "string" ? body.run_id.trim() : "";
  if (!runId) throw new Error("missing required field: run_id");
  const raw = typeof body.batch_size === "number" ? Math.floor(body.batch_size) : 6;
  if (!Number.isFinite(raw) || raw < 1 || raw > MAX_BATCH_SIZE) {
    throw new Error(`batch_size must be between 1 and ${MAX_BATCH_SIZE}`);
  }
  const cursor = body.cursor === undefined
    ? undefined
    : (body.cursor === null ? null : String(body.cursor));
  const shardCount = typeof body.shard_count === "number" ? Math.floor(body.shard_count) : 1;
  if (!(SHARD_COUNTS as readonly number[]).includes(shardCount)) {
    throw new Error(`shard_count must be one of ${SHARD_COUNTS.join(", ")}`);
  }
  const shardIndex = typeof body.shard_index === "number" ? Math.floor(body.shard_index) : 0;
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= shardCount) {
    throw new Error(`shard_index must be between 0 and ${shardCount - 1}`);
  }
  return {
    run_id: runId,
    batch_size: raw,
    cursor,
    dry_run: body.dry_run === true,
    shard_index: shardIndex,
    shard_count: shardCount,
  };
}

export interface ActionText {
  id: string;
  subject: string | null;
  regulator: string | null;
  jurisdiction: string | null;
  source_url: string | null;
  source_database: string | null;
  decision_date: string | null;
  source_document_text: string | null;
  raw_text: string | null;
  legacy_summary_text: string | null;
}

/** Longest available body text, capped, with the metadata header the model sees. */
export function triageExcerpt(row: ActionText): string {
  const body = [row.source_document_text, row.raw_text, row.legacy_summary_text]
    .map((value) => (value ?? "").trim())
    .sort((a, b) => b.length - a.length)[0] ?? "";
  const header = [
    `SOURCE: ${row.source_database ?? "unknown"}`,
    `URL: ${row.source_url ?? "none"}`,
    `RECORDED REGULATOR: ${row.regulator ?? "none"}`,
    `RECORDED SUBJECT: ${row.subject ?? "none"}`,
    `RECORDED JURISDICTION: ${row.jurisdiction ?? "none"}`,
    `RECORDED DATE: ${row.decision_date ?? "none"}`,
  ].join("\n");
  return `${header}\n\nTEXT:\n${body.slice(0, EXCERPT_CHARS)}`;
}

export const TRIAGE_SYSTEM = [
  "You label privacy-law records for an internal research corpus. You never invent facts.",
  "Read the record and answer ONLY with a single JSON object, no prose and no code fence.",
  "Fields:",
  '  "subject": the organisation the matter concerns, copied from the text, or null if the text does not name one.',
  `  "record_class": exactly one of ${RECORD_CLASSES.join(", ")}.`,
  `  "usable_for": array (may be empty) drawn only from ${USABLE_FOR.join(", ")}.`,
  `  "topic_tags": array (may be empty) drawn only from ${TOPIC_TAGS.join(", ")}.`,
  '  "li_relevance": "direct" when legitimate interests was the basis pleaded or decided, "adjacent" when the text reasons about balancing, necessity or reasonable expectations without an LI holding, otherwise "none".',
  '  "confidence": number between 0 and 1.',
  '  "rationale": one sentence, under 200 characters.',
  "If the record is an image, stylesheet, script, cookie notice, sitemap or otherwise has no substantive content,",
  'answer with record_class "junk_asset" or "site_boilerplate" and usable_for ["discard"].',
].join("\n");

export interface TriageOutcome {
  proposed_subject: string | null;
  proposed_record_class: string | null;
  proposed_usable_for: string[];
  proposed_topic_tags: string[];
  proposed_li_relevance: string | null;
  confidence: number | null;
  rationale: string | null;
  status: "ok" | "unusable" | "error";
}

function pickList(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const s = typeof item === "string" ? item.trim().toLowerCase() : "";
    if (allowed.includes(s) && !out.includes(s)) out.push(s);
  }
  return out;
}

/** Strip fences, take the outermost JSON object, and coerce to the taxonomy vocabulary. */
export function parseTriageOutcome(raw: string): TriageOutcome {
  const base: TriageOutcome = {
    proposed_subject: null,
    proposed_record_class: null,
    proposed_usable_for: [],
    proposed_topic_tags: [],
    proposed_li_relevance: null,
    confidence: null,
    rationale: null,
    status: "error",
  };
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return base;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return base;
  }

  const subjectRaw = typeof parsed.subject === "string" ? parsed.subject.trim() : "";
  const subject = subjectRaw && subjectRaw.toLowerCase() !== "null" && subjectRaw.length <= 200
    ? subjectRaw
    : null;
  const classRaw = typeof parsed.record_class === "string" ? parsed.record_class.trim().toLowerCase() : "";
  const recordClass = (RECORD_CLASSES as readonly string[]).includes(classRaw) ? classRaw : null;
  const li = typeof parsed.li_relevance === "string" ? parsed.li_relevance.trim().toLowerCase() : "";
  const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : Number.NaN;
  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim().slice(0, 400) : null;

  const usableFor = pickList(parsed.usable_for, USABLE_FOR);
  const outcome: TriageOutcome = {
    proposed_subject: subject,
    proposed_record_class: recordClass,
    proposed_usable_for: usableFor,
    proposed_topic_tags: pickList(parsed.topic_tags, TOPIC_TAGS),
    proposed_li_relevance: (LI_RELEVANCE as readonly string[]).includes(li) ? li : null,
    confidence: Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : null,
    rationale: rationale || null,
    status: "error",
  };
  if (!recordClass) return outcome;
  const discarded = usableFor.length === 1 && usableFor[0] === "discard";
  const worthless = ["junk_asset", "site_boilerplate", "insufficient_content"].includes(recordClass);
  outcome.status = discarded || worthless ? "unusable" : "ok";
  return outcome;
}
