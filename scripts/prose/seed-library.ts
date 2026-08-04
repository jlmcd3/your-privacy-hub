#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run
// ITEM 348 — SEED the prose library rows from the authored JSON in `library/prose/`.
//
// `library/prose/` is the change-controlled source of truth; the database rows
// are what the edge runtime reads. This script re-derives each row's
// `content_hash` and writes the payload, leaving `approved` alone (gating is a
// column value now and only a CEO sign-off flips it).
//
//   deno run --allow-read --allow-write --allow-env --allow-run scripts/prose/seed-library.ts [--apply]
//
// Without --apply it prints the SQL. With --apply it runs it through psql.

import { contentHash, PROSE_LIBRARY_SCHEMA_VERSION } from "../../supabase/functions/_shared/prose/library-source.ts";

const ITEMS = [
  { table: "prose_frame_sets", column: "frames", product: "cppa-risk", rel: "frames/cppa-risk.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "cppa-risk", rel: "plans/cppa-risk.plan.json" },
  { table: "prose_frame_sets", column: "frames", product: "dpia", rel: "frames/dpia.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "dpia", rel: "plans/dpia.plan.json" },
  { table: "prose_document_plans", column: "plan", product: "governance", rel: "plans/governance.plan.json" },
  { table: "prose_document_plans", column: "plan", product: "registration", rel: "plans/registration.plan.json" },
] as const;

const ROOT = new URL("../../library/prose/", import.meta.url);
const statements: string[] = [];

for (const it of ITEMS) {
  const payload = JSON.parse(await Deno.readTextFile(new URL(it.rel, ROOT)));
  const hash = await contentHash(payload);
  const json = JSON.stringify(payload).replace(/'/g, "''");
  statements.push(
    `INSERT INTO public.${it.table} (product, version, library_schema_version, approved, provenance, content_hash, ${it.column})\n` +
      `VALUES ('${it.product}', 1, ${PROSE_LIBRARY_SCHEMA_VERSION}, false, 'library/prose/${it.rel} @ item348', '${hash}', '${json}'::jsonb)\n` +
      `ON CONFLICT (product, version) DO UPDATE SET library_schema_version = EXCLUDED.library_schema_version, provenance = EXCLUDED.provenance, content_hash = EXCLUDED.content_hash, ${it.column} = EXCLUDED.${it.column};`,
  );
  console.error(`${it.product}/${it.table} content_hash=${hash}`);
}

const sql = statements.join("\n");

if (Deno.args.includes("--apply")) {
  const file = await Deno.makeTempFile({ suffix: ".sql" });
  await Deno.writeTextFile(file, sql);
  const { code, stderr } = await new Deno.Command("psql", {
    args: ["-q", "-f", file],
    stderr: "piped",
  }).output();
  const err = new TextDecoder().decode(stderr).trim();
  if (code !== 0) {
    console.error(err);
    Deno.exit(1);
  }
  console.error("seeded");
} else {
  console.log(sql);
}
