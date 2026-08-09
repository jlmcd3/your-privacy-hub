/**
 * ITEM 420 — THE CANONICAL ACTION RECORD.
 *
 * Single source of truth for the typed priority-action record the whole fleet
 * will migrate to in ITEM 421. This module changes NO writer: it exists so
 * every READER of `priority_actions` (and, later, the other three re-typed
 * surfaces) can accept either the legacy `string` element or the typed record
 * WITHOUT dropping content.
 *
 * Placement rule: multi-consumer by design — it stays in `_shared`.
 *
 * The frontend mirror lives at src/lib/action-record.ts (Deno edge code cannot
 * import from src/). A parity test pins the two implementations to identical
 * verdicts and identical formatter output.
 */

export const ACTION_RECORD_CONTRACT_VERSION = "action-record@2026-08-09-item422";

export interface ActionRecord {
  action: string;
  severity?: string;
  deadline?: string;
  deadline_basis?: string;
  statutory_basis?: string;
  owner_role?: string;
  reserved_to?: string | null;
  rank?: number;
  citation?: string;
  proposition_key?: string;
  insufficient_basis?: boolean;
}

/** Type guard — an object carrying a non-empty `action` string. */
export function isActionRecord(v: unknown): v is ActionRecord {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const a = (v as { action?: unknown }).action;
  return typeof a === "string" && a.trim().length > 0;
}

/** Remove markdown emphasis / heading / list decoration. NO markdown survives. */
function stripMarkdown(s: string): string {
  return s
    .replace(/^\s*#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-•*]\s+/, "")
    .replace(/^\s*(?:\d+[.)]\s*)+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function terminate(s: string): string {
  return /[.!?:;]$/.test(s) ? s : `${s}.`;
}

/**
 * Compose the customer-facing headline for one action record.
 *
 * Guarantees (the item399 FIX-2 artifact class becomes structurally impossible):
 *   - the statutory pinpoint appears EXACTLY ONCE,
 *   - the owner appears EXACTLY ONCE,
 *   - sentence case,
 *   - no markdown.
 */
export function formatActionHeadline(record: ActionRecord): string {
  const base = terminate(sentenceCase(stripMarkdown(String(record.action ?? ""))));
  const seen = norm(base);
  const parts: string[] = [base];

  const pinpoint = typeof record.statutory_basis === "string"
    ? stripMarkdown(record.statutory_basis)
    : "";
  if (pinpoint && !seen.includes(norm(pinpoint))) {
    parts.push(terminate(`Statutory basis: ${pinpoint}`));
  }

  const deadline = typeof record.deadline === "string" ? stripMarkdown(record.deadline) : "";
  if (deadline && !norm(parts.join(" ")).includes(norm(deadline))) {
    const basis = typeof record.deadline_basis === "string"
      ? stripMarkdown(record.deadline_basis)
      : "";
    const withBasis = basis && !norm(deadline).includes(norm(basis))
      ? `Deadline: ${deadline} (${basis})`
      : `Deadline: ${deadline}`;
    parts.push(terminate(withBasis));
  }

  const owner = (typeof record.reserved_to === "string" && record.reserved_to.trim())
    ? stripMarkdown(record.reserved_to)
    : (typeof record.owner_role === "string" ? stripMarkdown(record.owner_role) : "");
  if (owner && !norm(parts.join(" ")).includes(norm(owner))) {
    const label = (typeof record.reserved_to === "string" && record.reserved_to.trim())
      ? "Reserved to"
      : "Owner";
    parts.push(terminate(`${label}: ${owner}`));
  }

  return parts.join(" ");
}

/** One entry of a dual-read action list. */
export interface ActionListItem {
  /** Customer-facing text — legacy strings pass through UNCHANGED. */
  text: string;
  /** Present only when the source element was a typed action record. */
  record?: ActionRecord;
}

/**
 * DUAL-READ companion to `coerceNarrativeList`.
 *
 * `coerceNarrativeList` maps non-string elements to "" and filters them, so a
 * typed record would render as NOTHING. `coerceActionList` accepts both:
 *   - string element  → trimmed, emitted byte-identically to the legacy path
 *   - ActionRecord    → `formatActionHeadline(record)`
 *   - anything else   → dropped (same as legacy)
 *
 * `coerceNarrativeList` itself is NOT changed — other surfaces depend on it.
 */
export function coerceActionList(v: unknown): readonly ActionListItem[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() ? [{ text: v }] : undefined;
  if (!Array.isArray(v)) return undefined;
  const out: ActionListItem[] = [];
  for (const x of v) {
    if (typeof x === "string") {
      const t = x.trim();
      if (t.length > 0) out.push({ text: t });
      continue;
    }
    if (isActionRecord(x)) {
      const t = formatActionHeadline(x).trim();
      if (t.length > 0) out.push({ text: t, record: x });
    }
  }
  return out.length ? out : undefined;
}

/**
 * Text-only projection. For a legacy string array this returns EXACTLY what
 * `coerceNarrativeList` returns (same trim/filter semantics, same elements) —
 * that identity is the corruption guard proven by the ITEM 420 legacy tests.
 */
export function coerceActionListText(v: unknown): readonly string[] | undefined {
  const items = coerceActionList(v);
  return items ? items.map((i) => i.text) : undefined;
}

/** Rank sort: ascending, entries without a numeric rank sink last, stable. */
export function sortByRank<T>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const ar = typeof (a as { rank?: unknown })?.rank === "number"
      ? (a as { rank: number }).rank
      : Number.POSITIVE_INFINITY;
    const br = typeof (b as { rank?: unknown })?.rank === "number"
      ? (b as { rank: number }).rank
      : Number.POSITIVE_INFINITY;
    return ar - br;
  });
}
