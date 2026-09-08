// AUDIT 2026-09-08 (ledger A8-3, doc 215 §3) — MODEL RESPONSES ARE READ BY
// WALKING EVERY TEXT BLOCK, NEVER `content[0]`.
//
// Adaptive-thinking models (claude-opus-5, claude-sonnet-5, claude-fable-5,
// and every 4.7+ model) may put a `thinking` block first; a reader of
// `content[0].text` then sees "" and, in the worst case seen (the biometric
// checker's retry paths), replaced a customer report with an empty string.
// `_shared/anthropic-call.ts`'s `extractTextBlocks` is the one sanctioned
// reader.
//
// This is a RATCHET: the files that still read the first block today are
// frozen in ALLOWED_FIRST_BLOCK_READERS. A NEW reader anywhere under
// supabase/functions fails the build; a file removed from the list because it
// was fixed must stay fixed (FIXED_MUST_NOT_REGRESS). Remove entries from the
// allowlist as the sweep proceeds — never add one.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import { fromFileUrl, join, relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const ROOT = fromFileUrl(new URL("../../../", import.meta.url));
const FUNCTIONS = join(ROOT, "supabase", "functions");

const FIRST_BLOCK_READ = /content\??\.\[0\]|content\[0\]/;

/** Files known to read the first block on 2026-09-08. Shrink only. */
const ALLOWED_FIRST_BLOCK_READERS: ReadonlySet<string> = new Set([
  "_shared/github-apply.ts",
  "ask-privacy/index.ts",
  "backfill-action-items/index.ts",
  "backfill-ai-summaries/index.ts",
  "backfill-fsor-summaries/index.ts",
  "backfill-update-signals/index.ts",
  "consolidate-rulebook/index.ts",
  "cppa-ingest-authorities/index.ts",
  "cppa-ingest-fsor/index.ts",
  "deliberate-quality-fixes/index.ts",
  "enrich-with-context/index.ts",
  "fetch-newsapi/index.ts",
  "fetch-updates/index.ts",
  "generate-custom-brief/index.ts",
  "generate-dpa/index.ts",
  "generate-longitudinal-synthesis/index.ts",
  "generate-registration-docs/index.ts",
  "generate-research-syntheses/index.ts",
  "generate-trend-report/index.ts",
  "generate-weekly-brief/index.ts",
  "ingest-gov-enforcement/index.ts",
  "run-admt-checker/index.ts",
  "run-cppa-cybersecurity/index.ts",
  "run-governance-assessment/index.ts",
  "run-li-assessment/index.ts",
  "run-quality-batch/index.ts",
  "synthesize-li-trends/index.ts",
  "translate-articles/index.ts",
]);

/** Fixed on 2026-09-08 — a first-block read reappearing here is a regression. */
const FIXED_MUST_NOT_REGRESS: readonly string[] = [
  "check-biometric-compliance/index.ts",
  "grade-single-assessment/index.ts",
  "backfill-li-relevance/index.ts",
  "process-li-updates/index.ts",
  "fetch-edpb-documents/index.ts",
  "_shared/llm-extraction.ts",
  "_shared/constrained-extraction.ts",
  "verification-scan/_local/paraphrase-faithfulness.ts",
];

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

async function readersToday(): Promise<string[]> {
  const out: string[] = [];
  for await (const entry of walk(FUNCTIONS, { exts: [".ts"], includeDirs: false })) {
    const rel = relative(FUNCTIONS, entry.path).replaceAll("\\", "/");
    if (rel.includes("_tests/") || rel.endsWith(".test.ts")) continue;
    const src = stripComments(await Deno.readTextFile(entry.path));
    if (FIRST_BLOCK_READ.test(src)) out.push(rel);
  }
  return out.sort();
}

Deno.test("fleet-lint — no NEW reader of a model response's first content block", async () => {
  const readers = await readersToday();
  const newReaders = readers.filter((f) => !ALLOWED_FIRST_BLOCK_READERS.has(f));
  assertEquals(
    newReaders,
    [],
    `new first-block readers (use extractTextBlocks from _shared/anthropic-call.ts):\n${newReaders.join("\n")}`,
  );
});

Deno.test("fleet-lint — the files fixed on 2026-09-08 do not regress to a first-block read", async () => {
  const readers = new Set(await readersToday());
  for (const f of FIXED_MUST_NOT_REGRESS) {
    assert(!readers.has(f), `${f} reads content[0] again`);
  }
});

Deno.test("fleet-lint — the allowlist only shrinks (a listed file that no longer reads content[0] should be removed)", async () => {
  const readers = new Set(await readersToday());
  const stale = [...ALLOWED_FIRST_BLOCK_READERS].filter((f) => !readers.has(f));
  // Informational, not a failure: print so the sweep can prune the list.
  if (stale.length) console.log(`allowlist entries that no longer read content[0] (prune): ${stale.join(", ")}`);
});
