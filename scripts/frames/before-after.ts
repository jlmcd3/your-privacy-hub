#!/usr/bin/env -S deno run --allow-read --allow-run
// ITEM 338 — BEFORE/AFTER RENDER PAIR for CEO sign-off.
//   deno run --allow-read --allow-run scripts/frames/before-after.ts <sample_report_id>
// BEFORE = the July donor prose as shipped. AFTER = the same fixture rendered
// through the reviewed frame set (temporarily marked approved IN MEMORY ONLY —
// the on-disk set stays unapproved until the ledger records the sign-off).

import { CPPA_RISK_FRAMES } from "../../supabase/functions/_shared/prose/frames/cppa-risk.frames.ts";
import { renderSectionFromFrames } from "../../supabase/functions/_shared/prose/frame-render.ts";

const id = Deno.args[0];
const sql =
  `select json_build_object('fixture',fixture,'report',report_data)::text from sample_reports where id = '${id}'`;
const out = new TextDecoder().decode(
  (await new Deno.Command("psql", { args: ["-t", "-A", "-c", sql] }).output()).stdout,
).trim();
const row = JSON.parse(out);

function flat(node: unknown, path = "", acc: Record<string, unknown> = {}) {
  if (node === null || node === undefined) return acc;
  if (Array.isArray(node)) {
    acc[path] = node;
    return acc;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      flat(v, path ? `${path}.${k}` : k, acc);
    }
    return acc;
  }
  acc[path] = node;
  return acc;
}

const values = flat(row.fixture);
// Comma lists in the donor fixtures arrive as free text; the realizer's list
// slots take arrays, so split on the record's own separators.
for (const k of ["i6_vendors", "i1_categories", "impact_intake.safeguards"]) {
  const v = values[k];
  if (typeof v === "string") values[k] = v.split(/[;,]\s*/).filter(Boolean);
}

const approved = {
  ...CPPA_RISK_FRAMES,
  approved: true,
  frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
};

const cites: Record<string, string> = {
  processing_purpose_documentation: "[registry: re-queried at build time]",
  scope_of_assessment: "[registry: re-queried at build time]",
  benefit_impact_balancing: "[registry: re-queried at build time]",
};

const donor = row.report?.risk_assessment_by_activity?.[0] ?? {};
const pairs = [
  ["processing_narrative", donor.purpose],
  ["record_echo", donor.current_safeguards],
  ["scope_notes", row.report?.scope_and_triggers?.scope_notes],
  ["benefits_rationale", donor.benefits_outweigh_risks_rationale],
] as const;

for (const [section, before] of pairs) {
  const after = renderSectionFromFrames(approved, section, {
    values,
    resolveCite: (k) => cites[k] ?? null,
  });
  console.log(`\n### ${section}\n`);
  console.log("**BEFORE (July donor prose, as shipped):**\n");
  console.log("> " + String(before ?? "(absent)").replace(/\n/g, "\n> "));
  console.log("\n**AFTER (frame realizer, same fixture):**\n");
  console.log(
    "> " +
      (after.rendered ??
        `(omitted — FILL-OR-OMIT: required record values silent: ${after.missing_required.join(", ")})`),
  );
}
