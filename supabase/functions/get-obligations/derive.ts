// Pure date math + severity helpers for obligations derivation.
// Kept Deno-API-free so it can be unit-tested under vitest.

export type Severity = "overdue" | "due_soon" | "upcoming" | "scheduled";
export type BasisType = "statutory" | "recommended";

export interface Obligation {
  id: string;
  kind: string;
  source_table: string;
  source_id: string;
  title: string;
  due_date: string; // ISO
  days_until: number;
  severity: Severity;
  basis: string;
  basis_type: BasisType;
  source_route: string;
}

export function daysUntil(dueISO: string, today: Date = new Date()): number {
  const due = new Date(dueISO);
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.floor((dueUTC - todayUTC) / 86400000);
}

export function severityFor(daysUntilDue: number): Severity {
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 60) return "due_soon";
  if (daysUntilDue <= 180) return "upcoming";
  return "scheduled";
}

export function obligationId(
  kind: string,
  sourceTable: string,
  sourceId: string,
  dueDate: string
): string {
  return `${kind}:${sourceTable}:${sourceId}:${dueDate}`;
}

// Returns earliest generated_at + 365d for a set of EU notice documents that
// are current and not combined. Returns null if no documents qualify.
export function euNoticeRefreshDate(
  docs: Array<{ is_current: boolean; is_combined: boolean; generated_at?: string | null }>
): string | null {
  const eligible = docs.filter(
    (d) => d.is_current === true && d.is_combined === false && d.generated_at
  );
  if (eligible.length === 0) return null;
  const earliest = eligible
    .map((d) => new Date(d.generated_at as string).getTime())
    .reduce((a, b) => Math.min(a, b));
  return new Date(earliest + 365 * 86400000).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString();
}
