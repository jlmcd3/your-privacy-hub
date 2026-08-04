#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-run
// ITEM 348 — SEED the prose library rows from the authored JSON in `library/prose/`.
//
// `library/prose/` is the change-controlled source of truth for CONTENT; the
// database rows are what the edge runtime reads. This script re-derives each
// row's `content_hash` and writes the payload.
//
// CHANGE CONTROL — APPROVAL LIVES ONLY IN THE DATABASE. The `approved` column
// records the CEO's sign-off act. This script NEVER writes it on an existing
// row (see `seed-sql.ts`: the upsert's SET list excludes it); a brand-new row
// inserts with `approved = false`. The authored JSON carries only
// `seed_default_approved`, which is informational.
//
//   deno run --allow-read --allow-write --allow-env --allow-run scripts/prose/seed-library.ts [--apply]
//
// Without --apply it prints the SQL. With --apply it runs it through psql.

import { contentHash, PROSE_LIBRARY_SCHEMA_VERSION } from "../../supabase/functions/_shared/prose/library-source.ts";
import { buildSeedStatement, SEED_ITEMS } from "./seed-sql.ts";

const ROOT = new URL("../../library/prose/", import.meta.url);
const statements: string[] = [];

for (const it of SEED_ITEMS) {
  const payload = JSON.parse(await Deno.readTextFile(new URL(it.rel, ROOT)));
  const hash = await contentHash(payload);
  statements.push(
    buildSeedStatement({
      table: it.table,
      column: it.column,
      product: it.product,
      rel: it.rel,
      hash,
      json: JSON.stringify(payload),
      schemaVersion: PROSE_LIBRARY_SCHEMA_VERSION,
    }),
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
