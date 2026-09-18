// /admin/product-test — markdown archive export (doc 272 §5, §9).
//
// One markdown file per run: settings, a per-tool results table, every
// failed check in full (never truncated), and the run log. Downloaded from
// the page as `<date>-<run id first 8>.md`.

import type { CheckRow, DocumentRow, RunRow } from "./types";
import { evaluateLaunchBars, wantsMessyVariants } from "./plan";

function fence(s: string | null | undefined): string {
  const t = (s ?? "").toString().trim();
  return t.length ? t : "—";
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function buildRunMarkdown(run: RunRow, documents: DocumentRow[], checks: CheckRow[]): string {
  const L: string[] = [];
  const settings = run.settings;
  const messy = wantsMessyVariants(settings?.variantKinds ?? ["golden"]);

  L.push(`# Product test run \`${run.id}\``);
  L.push("");
  L.push(`- Status: ${run.status}`);
  L.push(`- Created: ${run.created_at}`);
  L.push(`- Products: ${settings?.tools?.join(", ") ?? "—"}`);
  L.push(`- Copies per product: ${settings?.copies ?? "—"} · repeat same fixture: ${settings?.repeatSameFixture ? "yes" : "no"}`);
  L.push(`- Variant kinds: ${settings?.variantKinds?.join(", ") ?? "golden"}`);
  L.push(`- Concurrency: ${settings?.concurrency ?? "—"}`);
  L.push("");

  if (run.summary) {
    const o = run.summary.overall;
    const bars = evaluateLaunchBars(o, messy);
    L.push(`## Overall`);
    L.push("");
    L.push(`| Documents | Doc pass rate | Launch bar (${pct(bars.documentBar)}) | Checks | Check pass rate | Launch bar (${pct(bars.checkBar)}) | Critical | High | Editorial |`);
    L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    L.push(`| ${o.documents} | ${pct(o.document_pass_rate)} | ${bars.documentBarMet ? "MET" : "MISSED"} | ${o.checks_total} | ${pct(o.check_pass_rate)} | ${bars.checkBarMet ? "MET" : "MISSED"} | ${o.critical} | ${o.high} | ${o.editorial} |`);
    L.push("");

    L.push(`## Per product`);
    L.push("");
    L.push("| Product | Documents | Doc pass rate | Checks | Check pass rate | Critical | High | Editorial |");
    L.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const [tool, ts] of Object.entries(run.summary.byTool)) {
      if (!ts) continue;
      L.push(`| ${tool} | ${ts.documents} | ${pct(ts.document_pass_rate)} | ${ts.checks_total} | ${pct(ts.check_pass_rate)} | ${ts.critical} | ${ts.high} | ${ts.editorial} |`);
    }
    L.push("");
  } else {
    L.push(`_Run has no summary yet (status: ${run.status})._`);
    L.push("");
  }

  L.push(`## Documents (${documents.length})`);
  L.push("");
  L.push("| Tool | Fixture | Variant | Copy | Status | Hash | Checks | Critical | High | Editorial | Pass |");
  L.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const d of documents) {
    L.push(`| ${d.tool} | ${d.fixture_id} | ${d.variant_id} | ${d.copy_index} | ${d.status} | ${d.document_hash ? d.document_hash.slice(0, 12) : "—"} | ${d.checks_total - d.checks_failed}/${d.checks_total} | ${d.critical} | ${d.high} | ${d.editorial} | ${d.document_pass === null ? "—" : d.document_pass ? "PASS" : "FAIL"} |`);
  }
  L.push("");

  const failed = checks.filter((c) => !c.passed);
  L.push(`## Failed checks (${failed.length} of ${checks.length})`);
  L.push("");
  if (!failed.length) L.push("_None._");
  failed.forEach((c, i) => {
    L.push(`### ${i + 1}. \`${c.check_id}\` — ${c.tool} · ${c.fixture_id} · ${c.variant_id}`);
    L.push(`- Family: ${c.family} · Severity: ${c.severity} · Status: ${c.status}${c.class ? ` · Class: ${c.class}` : ""}`);
    L.push(`- Block: ${fence(c.block_key)}`);
    L.push(`- Quote: ${fence(c.quote)}`);
    L.push(`- Expected: ${fence(c.expected)}`);
    L.push(`- Actual: ${fence(c.actual)}`);
    L.push(`- Rule ref: ${fence(c.rule_ref)}`);
    if (c.note) L.push(`- Note: ${c.note}`);
    L.push("");
  });

  L.push(`## Run log (${run.log.length} line(s))`);
  L.push("");
  L.push("```");
  L.push(...run.log);
  L.push("```");

  return L.join("\n");
}

export function downloadMarkdown(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export function runExportFilename(run: RunRow): string {
  const date = (run.created_at || new Date().toISOString()).slice(0, 10);
  return `${date}-${run.id.slice(0, 8)}.md`;
}
