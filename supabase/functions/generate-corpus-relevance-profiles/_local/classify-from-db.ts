import type { ClassificationCandidate, ClassificationOutcome } from "./classify/types.ts";

export const DEFAULT_BATCH_SIZE = 6;
export const MAX_BATCH_SIZE = 10;
export const CLASSIFICATION_LEASE_SECONDS = 480;

export interface ProfileForClassification {
  readonly id: string;
  readonly product: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly rule_or_pattern: string;
  readonly curation_note: string | null;
}

export interface CandidateWithLength {
  readonly profile_id: string;
  readonly candidate: ClassificationCandidate;
  readonly excerpt_chars: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseClassifyFromDbRequest(body: Record<string, unknown>): {
  product: "lia";
  run_id: string;
  batch_size: number;
  cursor: string | null | undefined;
  only_unclassified: boolean;
} {
  if (body.product !== "lia") throw new Error('classify_from_db requires product: "lia"');
  if (typeof body.run_id !== "string" || body.run_id.trim() === "" || body.run_id.length > 160) {
    throw new Error("classify_from_db requires a non-empty run_id of at most 160 characters");
  }
  const batchSize = body.batch_size === undefined ? DEFAULT_BATCH_SIZE : body.batch_size;
  if (!Number.isInteger(batchSize) || (batchSize as number) < 1 || (batchSize as number) > MAX_BATCH_SIZE) {
    throw new Error(`batch_size must be an integer from 1 to ${MAX_BATCH_SIZE}`);
  }
  if (body.cursor !== undefined && body.cursor !== null &&
    (typeof body.cursor !== "string" || !UUID_RE.test(body.cursor))) {
    throw new Error("cursor must be a UUID or null");
  }
  if (body.only_unclassified !== undefined && typeof body.only_unclassified !== "boolean") {
    throw new Error("only_unclassified must be a boolean");
  }
  return {
    product: "lia",
    run_id: body.run_id.trim(),
    batch_size: batchSize as number,
    cursor: body.cursor as string | null | undefined,
    only_unclassified: body.only_unclassified !== false,
  };
}

export function firstQuotedSentence(note: string | null): string | null {
  return note?.match(/"([^"]{20,300})"/)?.[1] ?? null;
}

export function windowAround(text: string, needle: string | null, radius: number, fallbackLength: number): string {
  if (needle) {
    const at = text.indexOf(needle);
    if (at >= 0) return text.slice(Math.max(0, at - radius), Math.min(text.length, at + needle.length + radius));
  }
  return text.slice(0, fallbackLength);
}

export function regulatoryGuidanceExcerpt(fullText: string | null, note: string | null): string {
  return windowAround(fullText ?? "", firstQuotedSentence(note), 3_000, 6_000);
}

export function enforcementExcerpt(sourceDocumentText: string | null, rawText: string | null,
  legacySummaryText: string | null, keyComplianceFailure: string | null, note: string | null): string {
  const searchable = sourceDocumentText ?? rawText ?? "";
  const quote = firstQuotedSentence(note);
  if (quote && searchable.includes(quote)) return windowAround(searchable, quote, 2_000, 4_000);
  const fallbackSource = sourceDocumentText ?? rawText ?? legacySummaryText ?? "";
  return `${keyComplianceFailure ?? ""}\n\n${fallbackSource.slice(0, 4_000)}`;
}

export function candidateFor(profile: ProfileForClassification, excerpt: string): CandidateWithLength {
  return {
    profile_id: profile.id,
    excerpt_chars: excerpt.length,
    candidate: {
      id: profile.id,
      product: profile.product,
      source_table: profile.source_table,
      source_row_id: profile.source_row_id,
      role: profile.rule_or_pattern,
      pinned_excerpt: excerpt,
      curation_note: profile.curation_note ?? "",
      display_bearing: null,
    },
  };
}

export function resultRows(args: {
  runId: string;
  model: string;
  pipelineVersion: string;
  candidates: readonly CandidateWithLength[];
  outcomes: readonly ClassificationOutcome[];
  stage2CandidateIds: readonly string[];
  promotedIds: readonly string[];
}) {
  const outcomes = new Map(args.outcomes.map((outcome) => [outcome.candidate.id, outcome]));
  const stage2 = new Set(args.stage2CandidateIds);
  const promoted = new Set(args.promotedIds);
  return args.candidates.map(({ profile_id, candidate, excerpt_chars }) => {
    const outcome = outcomes.get(candidate.id);
    if (!outcome) throw new Error(`classification outcome missing for profile ${profile_id}`);
    return {
      run_id: args.runId,
      profile_id,
      product: candidate.product,
      source_table: candidate.source_table,
      source_row_id: candidate.source_row_id,
      model: args.model,
      pipeline_version: args.pipelineVersion,
      excerpt_chars,
      outcome,
      stage2: stage2.has(candidate.id) ? { candidate_id: candidate.id } : null,
      promoted: promoted.has(candidate.id),
    };
  });
}