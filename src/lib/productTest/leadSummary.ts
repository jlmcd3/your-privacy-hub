// /admin/product-test — "Copy summary for lead" (doc 275 follow-up,
// 2026-09-18). A compact plain-text handoff the CEO pastes into chat: the
// run id (the lead reads the full rows from the database by it), the
// settings, the per-product figures, and one line per failed check with the
// coordinates a person needs to reproduce it offline (tool, fixture,
// variant, block key, check id) plus the first characters of the quote.
// Pure function; no Supabase, no time.

import type { CheckRow, DocumentRow, ProductTestSettings, RunRow } from "./types";
import { toolSummary } from "./plan";

const QUOTE_CHARS = 100;

function one(s: unknown, n = QUOTE_CHARS): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
}

export function buildLeadSummary(run: RunRow, documents: readonly DocumentRow[], checks: readonly CheckRow[]): string {
  const lines: string[] = [];
  const settings: Partial<ProductTestSettings> = run.settings ?? {};
  lines.push(`Product test run ${run.id} — ${run.status} — ${new Date(run.created_at).toISOString()}`);
  lines.push(
    `settings: tools=${(settings.tools ?? []).join(",")} copies=${settings.copies ?? 1} repeat=${settings.repeatSameFixture ? "yes" : "no"} variants=${(settings.variantKinds ?? ["golden"]).join(",")}`,
  );
  if (run.lead_note) lines.push(`report note: ${one(run.lead_note, 600)}`);
  lines.push("");

  const tools = [...new Set(documents.map((d) => d.tool))];
  for (const tool of tools) {
    const docs = documents.filter((d) => d.tool === tool);
    const ts = run.summary?.byTool?.[tool] ?? toolSummary(docs, checks.filter((c) => c.tool === tool));
    lines.push(
      `${tool}: ${ts.documents} doc(s), doc pass ${(ts.document_pass_rate * 100).toFixed(1)}%, checks ${ts.checks_passed}/${ts.checks_total}, critical ${ts.critical}, high ${ts.high}, editorial ${ts.editorial}`,
    );
    for (const d of docs.filter((x) => x.status === "failed")) {
      lines.push(`  GENERATION FAILED ${d.fixture_id} · ${d.variant_id} · copy ${d.copy_index}: ${one(d.error, 200)}`);
    }
  }
  lines.push("");

  const failed = checks.filter((c) => !c.passed);
  lines.push(`failed checks: ${failed.length}`);
  for (const c of failed) {
    const coords = [c.tool, c.fixture_id, c.variant_id, c.block_key ?? "-"].join(" · ");
    const triage = c.status !== "open" || c.class ? ` [${c.status}${c.class ? `/${c.class}` : ""}]` : "";
    const note = c.note ? ` note: ${one(c.note)}` : "";
    lines.push(`- [${c.severity}] ${c.check_id} — ${coords}${triage}${c.quote ? ` — "${one(c.quote)}"` : ""}${note}`);
  }
  return lines.join("\n");
}
