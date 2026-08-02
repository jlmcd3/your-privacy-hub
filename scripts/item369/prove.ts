#!/usr/bin/env -S deno run --allow-read --allow-env --allow-write
// ITEM 369 PHASE 2 — PROOF HARNESS.
//
// Runs the Item-363 preview entrypoint on three fixtures, applies the full
// Item 363/368 lint battery to the PERSISTED-SHAPE output (the envelope
// sections, not a markdown dump), and writes the evidence artifacts the
// Phase-2 report cites.
//
//   deno run --allow-read --allow-env --allow-write scripts/item369/prove.ts

import { generateCppaRiskReportItem363Preview } from "../../supabase/functions/_shared/ltp/generate-cppa-risk-item363-preview.ts";
import { fileLibrarySource } from "../prose/file-source.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  CPPA_RISK_MIN_PARAGRAPHS,
  CPPA_RISK_SECTION_ORDER,
} from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";
import { lintDocumentStyle } from "../../supabase/functions/_shared/prose/style-lint.ts";
import { auditSectionConnectives } from "../../supabase/functions/_shared/prose/plan-render.ts";
import { hasProse9Document } from "../../supabase/functions/_shared/report-contracts/cppa-risk-prose9.ts";

const OUT = new URL("../../docs/reviews/item369/", import.meta.url);
await Deno.mkdir(OUT, { recursive: true });

const source = fileLibrarySource();

async function fixtures(): Promise<Array<{ id: string; intake: Record<string, unknown> }>> {
  const golden = CPPA_RISK_GOLDEN.find((f: { id: string }) => f.id === "risk-saas-clean-tuning") ??
    CPPA_RISK_GOLDEN[0];
  const read = async (rel: string) =>
    JSON.parse(await Deno.readTextFile(new URL(rel, import.meta.url))) as Record<string, unknown>;
  return [
    { id: "perfect (item350)", intake: await read("../../tests/edge/fixtures/item350/perfect-a073d9c5.json") },
    { id: "messy (item350)", intake: await read("../../tests/edge/fixtures/item350/messy-bd458f0d.json") },
    { id: "risk-saas-clean-tuning", intake: golden.intake as Record<string, unknown> },
  ];
}

let failures = 0;
const report: string[] = [];
const say = (s: string) => {
  console.log(s);
  report.push(s);
};
const note = (ok: boolean, name: string, detail = "") => {
  if (!ok) failures++;
  say(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

for (const fx of await fixtures()) {
  say(`\n## Fixture: ${fx.id}\n`);
  let res;
  try {
    res = await generateCppaRiskReportItem363Preview(fx.intake, {
      buildStamp: "item369-preview@2026-08-02",
      runId: `item369-${fx.id}`,
      pass1: "deterministic",
      pass2rEnabled: false,
      euCorpus: [],
      librarySource: source,
      // File source cannot carry the DB approval flag; the DB-backed source can.
      allowUnapprovedLibrary: true,
    });
  } catch (e) {
    note(false, "preview entrypoint ran", (e as Error).message);
    continue;
  }
  note(true, "preview entrypoint ran");

  // ── Persisted-shape assertions ────────────────────────────────────────
  const payload = res.report;
  note(hasProse9Document(payload), "prose-9 envelope present on persisted payload");
  note(
    res.envelope.sections.length === CPPA_RISK_SECTION_ORDER.length,
    "nine sections rendered",
    `${res.envelope.sections.length}/${CPPA_RISK_SECTION_ORDER.length}`,
  );
  note(
    res.envelope.sections.every((s, i) => s.section_id === CPPA_RISK_SECTION_ORDER[i]),
    "sections in plan order",
  );
  note(res.envelope.span_count > 0, "record spans tracked", `${res.envelope.span_count}`);

  // Overlays landed, carried-over keys survived.
  for (const k of ["opening_summary", "executive_summary", "scope_and_triggers", "record_sufficiency", "priority_actions"]) {
    const v = payload[k];
    note(v !== undefined && v !== null, `overlay key present: ${k}`);
  }
  for (const k of ["submission_summary", "next_steps", "information_needed", "risk_level", "disclaimer"]) {
    note(k in payload, `carried-over key survives: ${k}`);
  }
  // The live baseline must be untouched by the overlay.
  note(
    (res.baselineReport as Record<string, unknown>).prose_document === undefined,
    "live baseline payload carries no prose_document (live path unaffected)",
  );

  // ── Full lint battery on the persisted sections ───────────────────────
  const lintable = res.envelope.sections.map((s) => ({
    section_id: s.section_id,
    title: s.title,
    text: s.text,
    spans: s.spans.map((sp) => ({
      source: sp.source_path ?? "",
      value: sp.value ?? "",
      start: sp.start,
      end: sp.end,
    })),
  }));
  const style = lintDocumentStyle(lintable, {
    entity: res.composed.entity,
    expected_order: CPPA_RISK_SECTION_ORDER,
    min_paragraphs: CPPA_RISK_MIN_PARAGRAPHS,
    analogy_section_id: "corpus_analogies",
    analogy_count: res.composed.analogies.items.length,
  });
  const byRule = new Map<string, string[]>();
  for (const f of style) {
    const arr = byRule.get(f.rule) ?? [];
    arr.push(`${f.section_id}: ${f.detail}`);
    byRule.set(f.rule, arr);
  }
  const RULES = [
    "quoted_intake_value",
    "banned_record_phrase",
    "attribution_missing",
    "attribution_vocabulary_thin",
    "mechanical_verb_rotation",
    "pluralisation_artifact",
    "punctuation_collision",
    "section_order",
    "sentence_duplication",
    "paragraph_segmentation",
    "analogy_missing_why",
    "analogy_missing_impact",
    "analogy_outcome_predictive",
    "analogy_empty_sentence",
    "unbalanced_sentinel",
  ];
  for (const rule of RULES) {
    const hits = byRule.get(rule) ?? [];
    note(hits.length === 0, `style/${rule}`, hits.slice(0, 3).join(" | "));
  }

  // Item 347 render lints + connective edges.
  // deno-lint-ignore no-explicit-any
  const renderLint = (res.rendered.sections as any[]).flatMap((s) => s.lint);
  note(
    renderLint.length === 0,
    "Item 347 render lint",
    renderLint.slice(0, 3).map((f) => `${f.section_id}/${f.rule}`).join(" | "),
  );
  // deno-lint-ignore no-explicit-any
  const connFindings = (res.rendered.sections as any[])
    .flatMap((s) => auditSectionConnectives(s).findings);
  note(connFindings.length === 0, "connective-edge rule", JSON.stringify(connFindings.slice(0, 2)));

  // ── Artifacts ─────────────────────────────────────────────────────────
  const slug = fx.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const md = res.envelope.sections
    .map((s) => `## ${s.title}${s.degraded ? "  *(record incomplete)*" : ""}\n\n${
      s.record_card.length
        ? s.record_card.map((r) => `- **${r.label}:** ${r.value}`).join("\n") + "\n\n"
        : ""
    }${s.text}`)
    .join("\n\n");
  await Deno.writeTextFile(new URL(`after-${slug}.md`, OUT), md);
  await Deno.writeTextFile(
    new URL(`before-${slug}.md`, OUT),
    JSON.stringify(res.baselineReport, null, 2),
  );
  await Deno.writeTextFile(
    new URL(`payload-${slug}.json`, OUT),
    JSON.stringify(payload, null, 2),
  );
  say(`\nartifacts: after-${slug}.md, before-${slug}.md, payload-${slug}.json`);
}

say(`\n### ITEM 369 PHASE 2: ${failures === 0 ? "ALL CHECKS PASSED" : `${failures} FAILING CHECK(S)`}`);
await Deno.writeTextFile(new URL("lint-results.md", OUT), report.join("\n"));
if (failures) Deno.exit(1);
