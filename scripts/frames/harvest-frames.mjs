#!/usr/bin/env node
// ITEM 338 (PROSE PROGRAM 2 of 4) — OFFLINE FRAME HARVEST PIPELINE.
//
// Compile-time tooling. NOT runtime code, never imported by an edge function.
//
//   node scripts/frames/harvest-frames.mjs <tool_slug> [--limit N] [--write]
//
// Stages: ALIGN -> DE-FACT -> STRIP LEGAL -> LINT -> emit candidate frames.
// The July sample_reports corpus is a STYLE DONOR ONLY: this pipeline is
// designed so that no fact, citation, or legal standard survives into a frame.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..", "..");
const OUT_DIR = join(ROOT, "supabase/functions/_shared/prose/frames");
const MIN_LEN = 120;

// --- placeholder typing -----------------------------------------------------
// Intake key -> { token, kind }. Order matters: first match wins.
const TOKEN_RULES = [
  [/entity_name|company_name|organisation|organization_name/i, "ENTITY", "text"],
  [/subject_anchor|activity_name|primary_activity/i, "ACTIVITY", "text"],
  [/sector|industry/i, "SECTOR", "text"],
  [/retention/i, "RETENTION_PERIOD", "text"],
  [/vendor|processor|service_provider/i, "VENDORS", "list"],
  [/categor/i, "DATA_CATEGORIES", "list"],
  [/source/i, "SOURCE_CLAUSE", "text"],
  [/purpose/i, "PURPOSES", "list"],
  [/safeguard|control/i, "SAFEGUARDS", "list"],
  [/consumers|count|volume|number/i, "COUNT", "count"],
  [/revenue/i, "REVENUE_BAND", "enum"],
  [/date|_at$/i, "DATE", "date"],
  [/email|phone|contact/i, "CONTACT", "text"],
];

function tokenFor(path) {
  for (const [re, token, kind] of TOKEN_RULES) if (re.test(path)) return { token, kind };
  const leaf = path.split(/[.\[]/).filter(Boolean).pop() || "VALUE";
  return { token: leaf.toUpperCase().replace(/[^A-Z0-9]+/g, "_"), kind: "text" };
}

// --- corpus load ------------------------------------------------------------
function psqlJson(sql) {
  const out = execFileSync("psql", ["-t", "-A", "-c", sql], { maxBuffer: 1 << 28 }).toString();
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function loadRows(tool, limit) {
  return psqlJson(
    `select json_build_object('id',id,'tool',tool_slug,'fixture',fixture,'report',report_data)::text
       from sample_reports
      where tool_slug = '${tool}' and report_data is not null
      order by created_at
      limit ${Number(limit) || 200}`,
  );
}

// --- flatten helpers --------------------------------------------------------
function* walk(node, path = "") {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) yield* walk(node[i], `${path}[${i}]`);
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) yield* walk(v, path ? `${path}.${k}` : k);
    return;
  }
  yield [path, node];
}

const norm = (s) =>
  String(s)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- STAGE 1/2: ALIGN + DE-FACT --------------------------------------------
function deFact(text, fixture) {
  let body = norm(text);
  const placeholders = [];
  const used = new Set();

  const facts = [...walk(fixture)]
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([p, v]) => [p, String(v)])
    .filter(([, v]) => norm(v).length >= 3)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [path, value] of facts) {
    const needle = norm(value);
    if (!body.includes(needle)) {
      // Try comma-separated list members ("AWS, Snowflake, Zendesk").
      const parts = needle.split(/,\s*/).filter((p) => p.length >= 3);
      if (parts.length < 2 || !parts.every((p) => body.includes(p))) continue;
      const { token, kind } = tokenFor(path);
      const t = uniqueToken(token, used);
      const re = new RegExp(parts.map(escapeRe).join("(?:,| and|,? and)\\s*"), "g");
      if (!re.test(body)) continue;
      body = body.replace(re, `{{${t}:list}}`);
      placeholders.push({ token: t, kind: "list", source: path, required: true });
      continue;
    }
    const { token, kind } = tokenFor(path);
    const t = uniqueToken(token, used);
    const suffix = kind === "text" ? "" : `:${kind}`;
    body = body.split(needle).join(`{{${t}${suffix}}}`);
    placeholders.push({ token: t, kind, source: path, required: true });
  }
  return { body, placeholders };
}

function uniqueToken(base, used) {
  let t = base;
  let n = 2;
  while (used.has(t)) t = `${base}_${n++}`;
  used.add(t);
  return t;
}

// --- STAGE 3: STRIP LEGAL CONTENT ------------------------------------------
const LEGAL_SENTENCE = [
  /§+\s*\d/,
  /\bArt(?:icle|\.)\s*\d/i,
  /\bCCR\b/,
  /\bC\.?F\.?R\.?\b/,
  /\bRCW\b/,
  /\bGDPR\b/i,
  /\bCCPA\b|\bCPRA\b|\bHIPAA\b/i,
  /\bWP\s*248\b/i,
  /\bRecital\s*\d/i,
  /\bCPPA\b|\bEDPB\b|\bICO\b|\bFTC\b|\bAttorney General\b/i,
  /\bsupervisory authority\b/i,
  /\b(?:is|are|shall be|must be)\s+(?:legally\s+)?required\b/i,
  /\bthe law requires\b/i,
  /\bregulations?\s+requires?\b/i,
  /\bconstitutes? (?:a )?violation\b/i,
];

function splitSentences(text) {
  return text.split(/(?<=[.;:!?])\s+(?=[A-Z“"({])/g).filter(Boolean);
}

function stripLegal(body, placeholders, section) {
  const kept = [];
  let cites = 0;
  for (const sentence of splitSentences(body)) {
    if (LEGAL_SENTENCE.some((re) => re.test(sentence))) {
      // A legal sentence becomes a registry-only CITE slot, once per frame.
      if (cites === 0) {
        const token = "CITE_1";
        kept.push(`{{${token}:cite}}`);
        placeholders.push({
          token,
          kind: "cite",
          source: `${section}_authority`,
          required: false,
        });
        cites++;
      }
      continue;
    }
    kept.push(sentence);
  }
  return kept.join(" ").replace(/\s+/g, " ").trim();
}

// --- main -------------------------------------------------------------------
const [, , toolArg, ...rest] = process.argv;
if (!toolArg) {
  console.error("usage: harvest-frames.mjs <tool_slug> [--limit N] [--write]");
  process.exit(1);
}
const limit = Number((rest.find((a) => a.startsWith("--limit=")) || "").split("=")[1]) || 200;
const write = rest.includes("--write");

const rows = loadRows(toolArg, limit);
const frames = [];
const stats = { rows: rows.length, candidates: 0, dropped_no_alignment: 0, dropped_empty_after_strip: 0 };
const seen = new Set();

for (const row of rows) {
  for (const [path, value] of walk(row.report)) {
    if (typeof value !== "string" || value.length < MIN_LEN) continue;
    const section = path.replace(/\[\d+\]/g, "").split(".").pop();
    const { body, placeholders } = deFact(value, row.fixture);
    if (placeholders.length === 0) {
      stats.dropped_no_alignment++;
      continue; // no record value found: boilerplate, not a frame
    }
    const stripped = stripLegal(body, placeholders, section);
    const live = placeholders.filter((p) => stripped.includes(`{{${p.token}`));
    if (stripped.replace(/\{\{[^}]+\}\}/g, "").trim().length < 60 || live.length === 0) {
      stats.dropped_empty_after_strip++;
      continue;
    }
    const key = `${section}::${stripped}`;
    if (seen.has(key)) continue;
    seen.add(key);
    stats.candidates++;
    frames.push({
      id: `${toolArg}.${section}.${String(stats.candidates).padStart(3, "0")}`,
      product: toolArg,
      section,
      body: stripped,
      placeholders: live,
      provenance: {
        sample_report_id: row.id,
        tool_slug: row.tool,
        report_path: path,
        harvested_at: new Date().toISOString().slice(0, 10),
        origin: "harvest",
      },
      status: "pending_review",
    });
  }
}

const set = {
  product: toolArg,
  version: "prose-frames-2026-08-01-item338",
  approved: false,
  frames,
};

console.log(JSON.stringify({ tool: toolArg, ...stats, frames: frames.length }, null, 2));
if (write) {
  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `${toolArg}.candidates.json`);
  writeFileSync(out, JSON.stringify(set, null, 2) + "\n");
  console.log("wrote", out);
}
