// ITEM 348 — FILE-BACKED prose library source.
//
// Reads the authored library JSON in `library/prose/`. This is the change-
// controlled source of truth that the seeding script writes into the database;
// it lives OUTSIDE `supabase/functions` so it never enters a function bundle.

import {
  contentHash,
  PROSE_LIBRARY_SCHEMA_VERSION,
  type ProseLibraryRow,
  type ProseLibrarySource,
} from "../../supabase/functions/_shared/prose/library-source.ts";

const ROOT = new URL("../../library/prose/", import.meta.url);

export async function readLibraryFile(rel: string): Promise<unknown> {
  return JSON.parse(await Deno.readTextFile(new URL(rel, ROOT)));
}

async function row(product: string, rel: string, provenance: string): Promise<ProseLibraryRow> {
  const payload = await readLibraryFile(rel);
  return {
    product,
    version: 1,
    library_schema_version: PROSE_LIBRARY_SCHEMA_VERSION,
    approved: false,
    provenance,
    content_hash: await contentHash(payload),
    payload,
  };
}

export function fileLibrarySource(): ProseLibrarySource {
  return {
    readFrameSet: (product) =>
      row(product, `frames/${product}.frames.json`, `library/prose/frames/${product}.frames.json`),
    readDocumentPlan: (product) =>
      row(product, `plans/${product}.plan.json`, `library/prose/plans/${product}.plan.json`),
  };
}
