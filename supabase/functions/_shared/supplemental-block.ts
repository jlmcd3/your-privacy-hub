// WS6 v2.1 — supplemental capture rendering.
//
// Shared helper that renders any supplemental Q&A pairs and free-text context
// the user supplied on a regeneration into a bounded, clearly-labelled section
// appended to a generator's user prompt. Consumption semantics are defined in
// _shared/prompt-core.ts under OUTPUT DISCIPLINE (SUPPLEMENTAL RESPONSES rule)
// — the text below is the delivery vehicle; the rule text lives with the rest
// of the shared prompt discipline so every tool inherits it identically.
//
// Empty / absent inputs return "" so appending is a no-op — preserving first-run
// prompt bytes for tools that have never received a supplement (byte-identity
// matters for DPA placeholder neutrality and for the QL2 baseline drift guard).

export interface SupplementalEntry {
  ref_field?: string;
  ask?: string;
  response?: string;
}

export interface SupplementalInput {
  responses?: unknown;
  context?: unknown;
}

function coerceList(v: unknown): SupplementalEntry[] {
  if (!Array.isArray(v)) return [];
  const out: SupplementalEntry[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Record<string, unknown>;
    const resp = typeof e.response === "string" ? e.response.trim() : "";
    if (!resp) continue;
    out.push({
      ref_field: typeof e.ref_field === "string" ? e.ref_field : undefined,
      ask: typeof e.ask === "string" ? e.ask : undefined,
      response: resp,
    });
  }
  return out;
}

export function renderSupplementalBlock(input: SupplementalInput | null | undefined): string {
  if (!input) return "";
  const entries = coerceList(input.responses);
  const ctx = typeof input.context === "string" ? input.context.trim() : "";
  if (entries.length === 0 && !ctx) return "";

  const lines: string[] = ["SUPPLEMENTAL RESPONSES (user-supplied on this revision run — treat as first-party intake facts of the same authority as the base intake; consumption rules in OUTPUT DISCIPLINE apply):"];
  for (const e of entries) {
    const field = e.ref_field ? ` [ref: ${e.ref_field}]` : "";
    const ask = e.ask ? ` — Q: ${e.ask}` : "";
    lines.push(`- Response${field}${ask}\n  A: ${e.response}`);
  }
  if (ctx) {
    lines.push(`- Additional context (user-supplied):\n  ${ctx}`);
  }
  return "\n\n" + lines.join("\n");
}

export const SUPPLEMENTAL_KEYS = ["supplemental_responses", "supplemental_context"] as const;
