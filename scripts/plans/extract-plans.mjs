#!/usr/bin/env node
// ITEM 339 (PROSE PROGRAM 3 of 4) — OFFLINE DOCUMENT-PLAN EXTRACTION.
//
// Compile-time tooling. NOT runtime code, never imported by an edge function.
//
//   node scripts/plans/extract-plans.mjs [tool_slug ...] [--write]
//
// Derives, from the July quality-loop2 `sample_reports` corpus:
//   * SECTION ORDERING     — the canonical sequence the well-written donors use
//   * ESCALATION ARC       — the movement across those sections (what → so what
//                            → what now), read off the section labels
//   * DISCOURSE STRUCTURE  — per section, whether the donor leads with a
//                            determination or with facts, and how many
//                            paragraphs / lead sentences it runs
//
// STYLE DONORS ONLY. This extractor deliberately records SHAPE and never
// content: no sentence, fact, citation, or legal standard is copied into a
// plan artifact. Only labels, ordering, counts, and lead-type classifications.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT_DIR = join(ROOT, "supabase/functions/_shared/prose/plans");

const ALL_TOOLS = [
  "cppa_risk",
  "dpia",
  "governance",
  "registration",
  "ir_playbook",
  "li_assessment",
  "cppa_admt",
  "cppa_cyber",
  "biometric",
];

// ---------------------------------------------------------------------------
// corpus
// ---------------------------------------------------------------------------
function psqlRows(sql) {
  const out = execFileSync("psql", ["-t", "-A", "-c", sql], { maxBuffer: 1 << 28 }).toString();
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function loadDonors(tool) {
  return psqlRows(
    `select json_build_object('id',id,'text',document_text,'report',report_data)::text
       from sample_reports
      where tool_slug = '${tool}'
      order by created_at`,
  );
}

// ---------------------------------------------------------------------------
// heading detection
// ---------------------------------------------------------------------------
const HEADING_PATTERNS = [
  /^section\s+\d+\s*[:.\-—]\s*(.+)$/i,
  /^#{1,3}\s+(.+)$/,
  /^\d+(?:\.\d+)*\s+([A-Z][^.]{4,80})$/,
];

function headingOf(line) {
  const t = line.trim();
  if (!t || t.length > 120) return null;
  for (const re of HEADING_PATTERNS) {
    const m = t.match(re);
    if (m) return normLabel(m[1]);
  }
  // Bare ALL-CAPS line used as a heading by several donors.
  if (/^[A-Z0-9][A-Z0-9 ,'()\/&–—-]{6,}$/.test(t) && !/[.;:]$/.test(t)) return normLabel(t);
  return null;
}

function normLabel(s) {
  return s
    .replace(/\([^)]*\)/g, " ") // drop parenthetical timings: "(0–2 HOURS)"
    .replace(/[^A-Za-z ]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// discourse classification (SHAPE ONLY — no content is retained)
// ---------------------------------------------------------------------------
// A donor paragraph "leads with a determination" when its first sentence
// asserts an outcome rather than reciting a record value.
const DETERMINATION_LEAD = [
  /\b(is|are|was|were)\s+(required|not required|likely|unlikely|reasonably likely|necessary|permitted|prohibited)\b/i,
  /\b(this|the)\s+(assessment|activity|processing|report|playbook|analysis)\s+(concludes|finds|determines|identifies)\b/i,
  /\b(concludes|finds|determines|does not support|supports|triggers|does not trigger)\b/i,
  /^(on the record|on this record|the record does not|the record supports)/i,
];
const RECORD_LEAD = [
  /^(the record (states|describes|lists)|the company (reports|states)|according to the (record|intake))/i,
];

function classifyLead(paragraph) {
  const first = paragraph.split(/(?<=[.?!])\s+/)[0] || paragraph;
  if (DETERMINATION_LEAD.some((re) => re.test(first))) return "determination";
  if (RECORD_LEAD.some((re) => re.test(first))) return "record";
  return "unclassified";
}

// ---------------------------------------------------------------------------
// arc inference — labels only
// ---------------------------------------------------------------------------
const ARC_RULES = [
  [/immediate|first|hour|containment|triage/, "act"],
  [/scope|trigger|applicab|threshold|eligib/, "scope"],
  [/record|intake|describ|activity|processing|inventory/, "record"],
  [/risk|harm|impact|assess|weigh|balanc|factor/, "analysis"],
  [/obligation|duty|requirement|notif|deadline|filing|register/, "duty"],
  [/gap|deficien|information needed|outstanding|open item/, "ask"],
  [/recommend|remediat|next step|action plan|safeguard|control/, "remedy"],
  [/communicat|notice|statement|disclosure/, "communicate"],
  [/certif|sign|attest|conclusion|summary|executive/, "close"],
];
const ARC_ORDER = [
  "act",
  "scope",
  "record",
  "analysis",
  "duty",
  "ask",
  "remedy",
  "communicate",
  "close",
];

function arcStageOf(label) {
  for (const [re, stage] of ARC_RULES) if (re.test(label)) return stage;
  return "unclassified";
}

// ---------------------------------------------------------------------------
// extraction
// ---------------------------------------------------------------------------
function extract(tool) {
  const donors = loadDonors(tool);
  const withText = donors.filter((d) => typeof d.text === "string" && d.text.length > 400);

  const positions = new Map(); // label -> { total, n, docs:Set, leads:{}, paras:[] }
  for (const d of withText) {
    const lines = d.text.split(/\r?\n/);
    const seq = [];
    let current = null;
    let buf = [];
    const flush = () => {
      if (current) {
        const body = buf.join("\n").trim();
        if (body) seq.push([current, body]);
      }
      buf = [];
    };
    for (const line of lines) {
      const h = headingOf(line);
      if (h) {
        flush();
        current = h;
      } else if (current) buf.push(line);
    }
    flush();

    seq.forEach(([label, body], i) => {
      const rel = seq.length > 1 ? i / (seq.length - 1) : 0;
      let e = positions.get(label);
      if (!e) {
        e = { total: 0, n: 0, docs: new Set(), leads: {}, paras: [] };
        positions.set(label, e);
      }
      e.total += rel;
      e.n += 1;
      e.docs.add(d.id);
      const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 60);
      e.paras.push(paragraphs.length);
      const lead = classifyLead(paragraphs[0] || body);
      e.leads[lead] = (e.leads[lead] || 0) + 1;
    });
  }

  // Keep labels seen in at least 20% of donors — one-off headings are noise.
  const min = Math.max(2, Math.ceil(withText.length * 0.2));
  const sections = [...positions.entries()]
    .filter(([, e]) => e.docs.size >= min)
    .map(([label, e]) => ({
      label,
      arc_stage: arcStageOf(label),
      mean_position: +(e.total / e.n).toFixed(3),
      donors: e.docs.size,
      median_paragraphs: median(e.paras),
      lead_type: dominant(e.leads),
      lead_counts: e.leads,
    }))
    .sort((a, b) => a.mean_position - b.mean_position);

  return {
    product: tool,
    donors_total: donors.length,
    donors_with_text: withText.length,
    method: withText.length
      ? "extracted"
      : "no_document_text — plan must be drafted fresh from exemplars",
    sections,
    arc: dedupe(sections.map((s) => s.arc_stage).filter((s) => s !== "unclassified")),
    extracted_at: new Date().toISOString().slice(0, 10),
  };
}

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);
const dominant = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unclassified";
const dedupe = (a) => a.filter((v, i) => a[i - 1] !== v);

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const write = args.includes("--write");
const tools = args.filter((a) => !a.startsWith("--"));
const targets = tools.length ? tools : ALL_TOOLS;

const summary = [];
for (const tool of targets) {
  const plan = extract(tool);
  summary.push({
    product: tool,
    donors: plan.donors_total,
    with_text: plan.donors_with_text,
    sections: plan.sections.length,
    arc: plan.arc.join(" → ") || "(none)",
  });
  if (write) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, `${tool}.plan.candidate.json`), JSON.stringify(plan, null, 2));
  }
}
console.log(JSON.stringify(summary, null, 2));
if (write) console.log(`\nwrote candidates to ${OUT_DIR}`);
