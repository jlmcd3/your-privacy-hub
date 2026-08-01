#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * ITEM 340 (PROSE PROGRAM 4 of 4) — ENTAILMENT VALIDATOR CALIBRATION.
 *
 * Offline tooling. NOT runtime code; no edge function imports this.
 *
 *   deno run --allow-read --allow-write scripts/prose/calibrate-entailment.ts [--write]
 *
 * The evaluation set has two halves, both built from artifacts already on
 * disk — the Item 338 frame BEFORE/AFTER pairs and the Item 339 planned
 * documents, which are themselves derived from the July `sample_reports`
 * corpus:
 *
 *   SET A — NATURAL PAIRS. Deterministic input = the rebuilt (frame/plan)
 *   render; candidate = the July donor prose for the same fixture and
 *   section. This measures the gate against real, human-grade fluent prose
 *   that was NOT generated from our deterministic text. Most of it SHOULD be
 *   rejected: the donor carries facts our record does not. Set A therefore
 *   measures how the gate behaves at its hardest, not a target accept rate.
 *
 *   SET B — LABELLED MUTATIONS. Deterministic input = a rebuilt section;
 *   candidate = that same section put through one transform with a KNOWN
 *   label. SAFE transforms (connective swaps, clause order, sentence joins)
 *   must be ACCEPTED. UNSAFE transforms (invented figure, dropped pinpoint,
 *   smoothed-away disclosure, paraphrased quote, added conclusion) must be
 *   REJECTED. Set B is where precision and recall are actually measured,
 *   because only there is ground truth known.
 */

import {
  validateEntailment,
  type EntailmentResult,
} from "../../supabase/functions/_shared/prose/entailment.ts";

const ROOT = new URL("../../", import.meta.url).pathname;
const REVIEW_DIR = `${ROOT}docs/reviews`;
const OUT = `${REVIEW_DIR}/POLISH-CALIBRATION-2026-08-01.md`;

// ---------------------------------------------------------------------
// Corpus load — parse the on-disk review artifacts
// ---------------------------------------------------------------------

interface Pair {
  readonly file: string;
  readonly product: string;
  readonly section: string;
  readonly deterministic: string;
  readonly donor: string;
}

function quoteBlock(lines: string[], from: number): { text: string; next: number } {
  const parts: string[] = [];
  let i = from;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("> ")) parts.push(l.slice(2).trim());
    else if (l.trim() === "" && parts.length === 0) continue;
    else if (parts.length > 0) break;
    else if (l.startsWith("**") || l.startsWith("#")) break;
  }
  return { text: parts.join(" ").trim(), next: i };
}

/** Item 338 frame pairs: per-section BEFORE (donor) / AFTER (deterministic). */
function readFramePairs(file: string, product: string): Pair[] {
  const lines = Deno.readTextFileSync(`${REVIEW_DIR}/${file}`).split("\n");
  const pairs: Pair[] = [];
  let section = "";
  let donor = "";
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("### ")) {
      section = l.slice(4).trim();
      donor = "";
      continue;
    }
    if (l.startsWith("**BEFORE")) {
      donor = quoteBlock(lines, i + 1).text;
      continue;
    }
    if (l.startsWith("**AFTER")) {
      const after = quoteBlock(lines, i + 1).text;
      if (donor && after && !after.startsWith("(omitted")) {
        pairs.push({ file, product, section, deterministic: after, donor });
      }
    }
  }
  return pairs;
}

/** Item 339 planned documents: the AFTER half supplies deterministic sections. */
function readPlanSections(file: string, product: string): Pair[] {
  const text = Deno.readTextFileSync(`${REVIEW_DIR}/${file}`);
  const afterIdx = text.indexOf("## AFTER");
  if (afterIdx < 0) return [];
  const lines = text.slice(afterIdx).split("\n");
  const out: Pair[] = [];
  let section = "";
  let buf: string[] = [];
  const flush = () => {
    const body = buf.join(" ").replace(/\s+/g, " ").trim();
    if (section && body.length >= 160) {
      out.push({ file, product, section, deterministic: body, donor: "" });
    }
    buf = [];
  };
  for (const l of lines) {
    if (l.startsWith("### ")) {
      flush();
      section = l.slice(4).replace(/\*\(.*?\)\*/g, "").trim();
      continue;
    }
    if (l.startsWith("## ")) continue;
    if (l.trim()) buf.push(l.replace(/^> /, "").trim());
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------
// SET B — labelled mutations
// ---------------------------------------------------------------------

type Label = "accept" | "reject";

interface Mutation {
  readonly id: string;
  readonly label: Label;
  readonly apply: (s: string) => string | null;
}

const CONNECTIVE_SWAPS: [RegExp, string][] = [
  [/\bTherefore\b/g, "Accordingly"],
  [/\bHowever\b/g, "That said"],
  [/\bIn addition\b/gi, "Further"],
  [/\bmust\b/g, "is required to"],
  [/\bstates\b/g, "records"],
];

const MUTATIONS: Mutation[] = [
  {
    id: "safe/connective_swap",
    label: "accept",
    apply: (s) => {
      let out = s;
      let changed = false;
      for (const [re, to] of CONNECTIVE_SWAPS) {
        if (re.test(out)) {
          out = out.replace(re, to);
          changed = true;
        }
      }
      return changed ? out : null;
    },
  },
  {
    id: "safe/sentence_join",
    label: "accept",
    apply: (s) => {
      const m = s.match(/^(.*?[a-z])\.\s+([A-Z][^.]{20,120}\.)/s);
      return m ? s.replace(m[0], `${m[1]}, and ${m[2][0].toLowerCase()}${m[2].slice(1)}`) : null;
    },
  },
  {
    id: "safe/clause_fronting",
    label: "accept",
    apply: (s) => {
      const m = s.match(/\b(?:The record|The intake|The assessment record) (states|records|describes) ([^.]{20,160})\./);
      return m ? s.replace(m[0], `On the record, ${m[2]}, as the record ${m[1]}.`) : null;
    },
  },
  {
    id: "unsafe/invented_figure",
    label: "reject",
    apply: (s) => s.replace(/\.(\s|$)/, ", affecting 8,317,449 consumers.$1"),
  },
  {
    id: "unsafe/dropped_pinpoint",
    label: "reject",
    apply: (s) => {
      const m = s.match(/§+\s*[\d.]+[\dA-Za-z()\-]*/);
      return m ? s.replace(m[0], "the regulation") : null;
    },
  },
  {
    id: "unsafe/smoothed_disclosure",
    label: "reject",
    apply: (s) => {
      const m = s.match(/[^.]*\b(?:does not state|not stated on the record|the record does not|information needed|silent on)\b[^.]*\.\s*/i);
      return m ? s.replace(m[0], "") : null;
    },
  },
  {
    id: "unsafe/paraphrased_quote",
    label: "reject",
    apply: (s) => {
      const m = s.match(/[“"]([^”"\n]{16,200})[”"]/);
      if (!m) return null;
      const words = m[1].split(/\s+/);
      if (words.length < 4) return null;
      return s.replace(m[0], `“${words.slice(0, -1).join(" ")}”`);
    },
  },
  {
    id: "unsafe/added_conclusion",
    label: "reject",
    apply: (s) =>
      `${s} On balance the programme appears mature and the organisation diligent in its handling.`,
  },
  {
    id: "unsafe/invented_party",
    label: "reject",
    apply: (s) => `${s.replace(/\.$/, "")}, as confirmed by Halvorsen Compliance Partners.`,
  },
  {
    id: "unsafe/dropped_counsel_close",
    label: "reject",
    apply: (s) => {
      const m = s.match(/[^.]*\b(?:not legal advice|qualified legal counsel|before any operational use)\b[^.]*\.\s*/i);
      return m ? s.replace(m[0], "") : null;
    },
  },
];

// ---------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------

interface Case {
  readonly set: "A" | "B";
  readonly product: string;
  readonly section: string;
  readonly mutation?: string;
  readonly label?: Label;
  readonly deterministic: string;
  readonly candidate: string;
  readonly result: EntailmentResult;
}

function truncate(s: string, n = 260): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length <= n ? one : `${one.slice(0, n)}…`;
}

function main() {
  const framePairs = [...readFramePairs("FRAMES-BEFORE-AFTER-cppa-risk-2026-08-01.md", "cppa-risk")];
  const planSections = [
    ...readPlanSections("PLAN-BEFORE-AFTER-cppa-risk-2026-08-01.md", "cppa-risk"),
    ...readPlanSections("PLAN-BEFORE-AFTER-dpia-2026-08-01.md", "dpia"),
    ...readPlanSections("PLAN-BEFORE-AFTER-governance-2026-08-01.md", "governance"),
  ];

  const cases: Case[] = [];

  for (const p of framePairs) {
    cases.push({
      set: "A",
      product: p.product,
      section: p.section,
      deterministic: p.deterministic,
      candidate: p.donor,
      result: validateEntailment({ deterministic: p.deterministic, polished: p.donor }),
    });
  }

  const bases = [...planSections, ...framePairs.map((p) => ({ ...p, donor: "" }))];
  for (const b of bases) {
    for (const m of MUTATIONS) {
      const candidate = m.apply(b.deterministic);
      if (!candidate || candidate === b.deterministic) continue;
      cases.push({
        set: "B",
        product: b.product,
        section: b.section,
        mutation: m.id,
        label: m.label,
        deterministic: b.deterministic,
        candidate,
        result: validateEntailment({ deterministic: b.deterministic, polished: candidate }),
      });
    }
  }

  const setA = cases.filter((c) => c.set === "A");
  const setB = cases.filter((c) => c.set === "B");
  const acceptedA = setA.filter((c) => c.result.ok);
  const correctB = setB.filter((c) => (c.result.ok ? "accept" : "reject") === c.label);
  const safeB = setB.filter((c) => c.label === "accept");
  const unsafeB = setB.filter((c) => c.label === "reject");
  const safeOk = safeB.filter((c) => c.result.ok);
  const unsafeCaught = unsafeB.filter((c) => !c.result.ok);

  const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${((n / d) * 100).toFixed(1)}%`);

  const byMutation = MUTATIONS.map((m) => {
    const rows = setB.filter((c) => c.mutation === m.id);
    const ok = rows.filter((c) => (c.result.ok ? "accept" : "reject") === c.label);
    return `| \`${m.id}\` | ${m.label} | ${rows.length} | ${ok.length} | ${pct(ok.length, rows.length)} |`;
  }).join("\n");

  const ruleCounts = new Map<string, number>();
  for (const c of cases) {
    for (const f of c.result.findings) {
      const k = `${f.rule}/${f.code}`;
      ruleCounts.set(k, (ruleCounts.get(k) ?? 0) + 1);
    }
  }

  const accepted = cases.filter((c) => c.result.ok).slice(0, 5);
  const rejected = cases.filter((c) => !c.result.ok).slice(0, 5);

  const sample = (c: Case, i: number) =>
    [
      `**${i + 1}. ${c.product} — ${c.section}** (set ${c.set}${c.mutation ? `, \`${c.mutation}\`` : ""})`,
      "",
      `- DETERMINISTIC: ${truncate(c.deterministic)}`,
      `- CANDIDATE: ${truncate(c.candidate)}`,
      c.result.ok ? "- VERDICT: ACCEPTED" : `- VERDICT: REJECTED — ${truncate(c.result.reject_reason, 400)}`,
      "",
    ].join("\n");

  const md = `# ITEM 340 — ENTAILMENT VALIDATOR CALIBRATION (2026-08-01)

Validator: \`${cases[0]?.result.version ?? "n/a"}\`. Regenerate:
\`deno run --allow-read --allow-write scripts/prose/calibrate-entailment.ts --write\`

## Evaluation set

| set | description | cases |
| --- | --- | --- |
| A | July donor prose judged against the rebuilt deterministic render (natural pairs, no ground truth) | ${setA.length} |
| B | labelled mutations of rebuilt deterministic sections (ground truth known) | ${setB.length} |

## Headline numbers

- Set A accept rate: **${pct(acceptedA.length, setA.length)}** (${acceptedA.length}/${setA.length}).
- Set B overall agreement with label: **${pct(correctB.length, setB.length)}** (${correctB.length}/${setB.length}).
- SAFE transforms accepted (false-reject cost): **${pct(safeOk.length, safeB.length)}** (${safeOk.length}/${safeB.length}).
- UNSAFE transforms caught (the number that matters): **${pct(unsafeCaught.length, unsafeB.length)}** (${unsafeCaught.length}/${unsafeB.length}).

Set A's low accept rate is expected and is not a defect: the July donor prose
asserts facts the rebuilt record does not carry, which is precisely what the
gate exists to refuse. The operating number for rollout is the UNSAFE catch
rate; a false reject only costs fluency, since the deterministic text ships.

## Per-mutation results

| mutation | label | cases | correct | rate |
| --- | --- | --- | --- | --- |
${byMutation}

## Rejection reasons observed

| rule/code | count |
| --- | --- |
${[...ruleCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | ${v} |`).join("\n")}

## Five accepted polishes

${accepted.map(sample).join("\n")}

## Five rejections with reasons

${rejected.map(sample).join("\n")}
`;

  if (Deno.args.includes("--write")) {
    Deno.writeTextFileSync(OUT, md);
    console.log(`wrote ${OUT}`);
  } else {
    console.log(md);
  }
}

main();
