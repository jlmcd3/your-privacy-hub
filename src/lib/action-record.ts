/**
 * ITEM 420 — FRONTEND MIRROR of the canonical action record.
 *
 * Byte-equivalent logic to supabase/functions/_shared/report-contracts/action-record.ts.
 * Deno edge code cannot import from src/, so this module is the sanctioned
 * mirror; the ITEM 420 parity test pins both to identical verdicts and
 * identical formatter output.
 */

export const ACTION_RECORD_CONTRACT_VERSION = "action-record@2026-08-09-item420";

export interface ActionRecord {
  action: string;
  severity?: string;
  deadline?: string;
  deadline_basis?: string;
  statutory_basis?: string;
  owner_role?: string;
  reserved_to?: string | null;
  rank?: number;
}

export function isActionRecord(v: unknown): v is ActionRecord {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const a = (v as { action?: unknown }).action;
  return typeof a === "string" && a.trim().length > 0;
}

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

export interface ActionListItem {
  text: string;
  record?: ActionRecord;
}

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

export function coerceActionListText(v: unknown): readonly string[] | undefined {
  const items = coerceActionList(v);
  return items ? items.map((i) => i.text) : undefined;
}

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
