// ITEM 392 — ADMT REGISTER BATTERY + SEAM BATTERY + FACT-EXEMPT REFERENCE RENDER.
//
// The battery reads the ADMT-owned surfaces as source text and asserts that no
// banned register idiom and no reference-render token survives in a literal,
// then drives the prose-gold pass over a synthetic record and applies the seam
// battery (opening-12-words, bare-enum, splice, litany, duplicate-sentence,
// wrong-field) to what it produces.
//
// FACT-EXEMPT HARD RULE: the ratified reference render (quality_run_documents
// 562f1770-990e-4b4b-8f13-e7354dc6aa9b) is an architecture/register reference
// ONLY. No fact, name, figure or scenario from it may reach a customer document
// or a fixture — including the fixtures in this file.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_BANNED_REGISTER,
  ADMT_PIPELINE_STAMP,
  REFERENCE_RENDER_TOKENS,
} from "../../../supabase/functions/_shared/prose/plans/admt.spine.ts";
import {
  applyAdmtProseGold,
  ADMT_MACHINE_KEYED_FIELDS,
  isHedgeLitany,
} from "../../../supabase/functions/_shared/ltp/admt-prose-gold.ts";

const ROOT = new URL("../../../", import.meta.url);

/** ADMT-owned builder surfaces. Non-ADMT surfaces are out of scope by ruling. */
const SURFACES = [
  "supabase/functions/_shared/ltp/admt-prose-gold.ts",
  "supabase/functions/_shared/prose/plans/admt.spine.ts",
];

/** Extract string/template literals, skipping comments and regex literals. */
function literals(src: string): string[] {
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .filter((l) => !/=\s*\/|re:\s*\/|\/[gimsuy]*,\s*$/.test(l))
    .join("\n");
  const out: string[] = [];
  for (const m of noComments.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}

async function surfaceLiterals(): Promise<{ file: string; text: string }[]> {
  const rows: { file: string; text: string }[] = [];
  for (const rel of SURFACES) {
    const src = await Deno.readTextFile(new URL(rel, ROOT));
    for (const lit of literals(src)) rows.push({ file: rel, text: lit });
  }
  return rows;
}

Deno.test("ITEM 392 — no ADMT builder literal carries a banned register idiom", async () => {
  const rows = await surfaceLiterals();
  const hits: string[] = [];
  for (const { file, text } of rows) {
    for (const ban of ADMT_BANNED_REGISTER) {
      // The label maps and substitution targets are the cure, not the disease:
      // they are keyed by the enum token and must be allowed to name it.
      if (ban.id === "internal_vocabulary" && /^[a-z_]+$/.test(text)) continue;
      if (ban.re.test(text)) hits.push(`${file}: [${ban.id}] ${text.slice(0, 90)}`);
    }
  }
  assertEquals(hits, [], hits.join("\n"));
});

Deno.test("ITEM 392 — no ADMT builder literal carries a fact from the reference render", async () => {
  const rows = await surfaceLiterals();
  const hits: string[] = [];
  for (const { file, text } of rows) {
    for (const tok of REFERENCE_RENDER_TOKENS) {
      // The token list itself is the detector.
      if (text === tok) continue;
      if (text.toLowerCase().includes(tok.toLowerCase())) hits.push(`${file}: ${tok}`);
    }
  }
  assertEquals(hits, [], hits.join("\n"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEAM BATTERY — driven over the pass output.
// ─────────────────────────────────────────────────────────────────────────────

const HEDGE =
  "The information provided does not resolve this question; the missing intake dimensions are listed under information needed.";

function degradedRecord(): Record<string, unknown> {
  return {
    system_name: "Case-routing scorer",
    overall_status: "gaps_identified",
    adequacy_finding: {
      logic_disclosure: { conclusion: "insufficient_basis", reason: HEDGE, authorities: [] },
      human_intervention: { conclusion: "insufficient_basis", reason: HEDGE, authorities: [] },
    },
    applicability_verdict: { label: "in_scope", reason: "The system is used to make a significant decision." },
    notice_gaps: [
      { element: "Specific purpose statement", status: "gap", finding: "The published text is not supplied.", remediation: "" },
      { element: "Opt-out right description", status: "insufficient_basis", finding: "The intake is silent on this element.", remediation: "" },
    ],
    information_needed: [{}, {}],
    consolidated_notice_analysis: {
      applicable: false,
      basis: "The record identifies a single system operated for a single purpose.",
      consolidation_risk: "",
      consolidation_benefit: "",
      conditions_to_consolidate: "",
    },
  };
}

function completeRecord(): Record<string, unknown> {
  return {
    system_name: "Case-routing scorer",
    overall_status: "compliant",
    adequacy_finding: {
      logic_disclosure: {
        conclusion: "adequate",
        reason: "The business supplied the published explanation of how the technology produces its output.",
      },
      human_intervention: {
        conclusion: "qualifies",
        reason: "The reviewer interprets the output, weighs other information, and may change the decision before it issues.",
      },
    },
    applicability_verdict: { label: "in_scope", reason: "The system is used to make a significant decision." },
    notice_gaps: [{ element: "Specific purpose statement", status: "compliant", finding: "The published text names the decision." }],
    information_needed: [],
    consolidated_notice_analysis: {
      applicable: false,
      basis: "The record identifies a single system operated for a single purpose.",
    },
  };
}

function readerStrings(node: unknown, path = "", out: [string, string][] = []): [string, string][] {
  if (typeof node === "string") {
    out.push([path, node]);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => readerStrings(v, `${path}[${i}]`, out));
    return out;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "_meta" || k.startsWith("_")) continue;
      readerStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

/** Machine-keyed leaf names — enums are allowed to live here and only here. */
const MACHINE_LEAVES = new Set(["overall_status", "status", "conclusion", "label", "enforcement_exposure", "element_id", "proposition_key", "citation", "deadline", "system_name"]);

Deno.test("ITEM 392 seam — no reader surface opens on a hedge (opening-12-words)", () => {
  const r = degradedRecord();
  applyAdmtProseGold(r);
  for (const [path, text] of readerStrings(r)) {
    const first12 = text.trim().split(/\s+/).slice(0, 12).join(" ");
    assert(!isHedgeLitany(`${first12}.`), `${path} opens on a hedge: ${first12}`);
  }
});

Deno.test("ITEM 392 seam — no bare enum reaches a reader leaf", () => {
  const r = degradedRecord();
  applyAdmtProseGold(r);
  for (const [path, text] of readerStrings(r)) {
    const leaf = path.split(".").pop()!.replace(/\[\d+\]$/, "");
    if (MACHINE_LEAVES.has(leaf)) continue;
    assert(!/\b(insufficient_basis|gaps_identified|significant_gaps|does_not_qualify)\b/.test(text), `${path}: ${text}`);
  }
});

Deno.test("ITEM 392 seam — no splice: every reader sentence is terminated and spaced", () => {
  const r = degradedRecord();
  applyAdmtProseGold(r);
  for (const [path, text] of readerStrings(r)) {
    const leaf = path.split(".").pop()!.replace(/\[\d+\]$/, "");
    if (MACHINE_LEAVES.has(leaf)) continue;
    assert(!/\s{2,}/.test(text), `${path} double space`);
    assert(!/[a-z]\.[A-Z]/.test(text), `${path} missing space after terminator`);
    assert(/[.!?]$/.test(text.trim()), `${path} unterminated: ${text}`);
  }
});

Deno.test("ITEM 392 seam — litany: the hedge is never repeated across elements", () => {
  const r = degradedRecord();
  applyAdmtProseGold(r);
  const hedged = readerStrings(r).filter(([, t]) => isHedgeLitany(t));
  assertEquals(hedged, [], JSON.stringify(hedged));
});

Deno.test("ITEM 392 seam — duplicate-sentence: no sentence ships twice on the reader surface", () => {
  const r = degradedRecord();
  applyAdmtProseGold(r);
  const seen = new Map<string, string>();
  for (const [path, text] of readerStrings(r)) {
    const leaf = path.split(".").pop()!.replace(/\[\d+\]$/, "");
    if (MACHINE_LEAVES.has(leaf)) continue;
    for (const s of text.split(/(?<=[.!?])\s+/)) {
      const key = s.trim().toLowerCase();
      if (key.length < 25) continue;
      const prior = seen.get(key);
      assert(!prior, `duplicate sentence at ${path} (also ${prior}): ${s}`);
      seen.set(key, path);
    }
  }
});

Deno.test("ITEM 392 seam — wrong-field: labels land in label fields, enums stay in machine fields", () => {
  const r = degradedRecord() as any;
  applyAdmtProseGold(r);
  assertEquals(r.overall_status, "gaps_identified");
  assertEquals(r.overall_status_label, "Action required in some areas");
  assertEquals(r.adequacy_finding.logic_disclosure.conclusion, "insufficient_basis");
  assertEquals(
    r.adequacy_finding.logic_disclosure.conclusion_label,
    "not established from the information supplied",
  );
  assertEquals(r.notice_gaps[1].status, "insufficient_basis");
  assertEquals(r.notice_gaps[1].status_label, "More information needed");
  assertEquals(r.applicability_verdict.label, "in_scope");
  assertEquals(r.applicability_verdict.label_display, "in scope");
  assert(ADMT_MACHINE_KEYED_FIELDS.includes("overall_status"));
});

Deno.test("ITEM 392 — the pipeline stamp is written at the finalize point", () => {
  const r = degradedRecord() as any;
  const t = applyAdmtProseGold(r);
  assertEquals(t.stamp, ADMT_PIPELINE_STAMP);
  assertEquals(r._meta.internal.admt_pipeline_stamp, "admt-pipeline@item392-2026-08-06");
});
