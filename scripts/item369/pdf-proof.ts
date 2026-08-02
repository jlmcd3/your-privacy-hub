#!/usr/bin/env -S deno run --allow-read --allow-write
// ITEM 369 PHASE 2, step 3a — PDF EVIDENCE.
// Renders the real exporter HTML from the persisted prose-9 payloads produced
// by scripts/item369/prove.ts and asserts the body is neither blank nor
// malformed (no raw JSON, no sentinels, all nine sections present).

import { buildCPPARiskProse9HTML } from "../../supabase/functions/generate-report-pdf/prose9-html.ts";
import { CPPA_RISK_SECTION_ORDER } from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";

const DIR = new URL("../../docs/reviews/item369/", import.meta.url);
const slugs = ["perfect-item350-", "messy-item350-", "risk-saas-clean-tuning"];
let failures = 0;
const out: string[] = [];
const note = (ok: boolean, name: string, detail = "") => {
  if (!ok) failures++;
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  out.push(line);
};

for (const slug of slugs) {
  console.log(`\n## PDF HTML: ${slug}`);
  out.push(`\n## PDF HTML: ${slug}`);
  const report = JSON.parse(await Deno.readTextFile(new URL(`payload-${slug}.json`, DIR)));
  const html = buildCPPARiskProse9HTML(report, { intake_data: {} });
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  note(text.length > 1500, "PDF body is not blank", `${text.length} chars of text`);
  for (const id of CPPA_RISK_SECTION_ORDER) {
    note(html.includes(`data-section-id="${id}"`), `section rendered: ${id}`);
  }
  note(!/[\uE000\uE001]/.test(html), "no sentinel characters leak into the PDF");
  note(!/\{"|\[\{|_meta|undefined|\[object Object\]/.test(text), "no raw JSON / undefined in PDF text");
  note(html.includes("<table class=\"record-card\">"), "record card renders as a table, not sentences");
  note(/not legal advice/.test(text), "disclaimer present");
  await Deno.writeTextFile(new URL(`pdf-${slug}.html`, DIR), html);
}

console.log(`\n### PDF EVIDENCE: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILING`}`);
out.push(`\n### PDF EVIDENCE: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILING`}`);
await Deno.writeTextFile(new URL("pdf-evidence.md", DIR), out.join("\n"));
if (failures) Deno.exit(1);
