// ITEM 348 — psql-backed prose library source (sandbox/CI only).
//
// The database rows are admin/service-role only; the sandbox reaches them
// through the managed `psql` connection so the byte-identity probe and the pin
// tests can read exactly what the edge runtime reads.

import type {
  ProseLibraryRow,
  ProseLibrarySource,
} from "../../supabase/functions/_shared/prose/library-source.ts";

async function queryRow(sql: string): Promise<Record<string, unknown> | null> {
  const cmd = new Deno.Command("psql", {
    args: ["-At", "-c", sql],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await cmd.output();
  if (code !== 0) throw new Error(new TextDecoder().decode(stderr).trim());
  const out = new TextDecoder().decode(stdout).trim();
  if (!out) return null;
  return JSON.parse(out) as Record<string, unknown>;
}

function toRow(r: Record<string, unknown>, payloadCol: string): ProseLibraryRow {
  return {
    product: String(r.product),
    version: Number(r.version),
    library_schema_version: Number(r.library_schema_version),
    approved: Boolean(r.approved),
    provenance: String(r.provenance ?? ""),
    content_hash: String(r.content_hash ?? ""),
    payload: r[payloadCol],
  };
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

export function psqlLibrarySource(): ProseLibrarySource {
  return {
    async readFrameSet(product) {
      const r = await queryRow(
        `select row_to_json(t) from (select product,version,library_schema_version,approved,provenance,content_hash,frames from public.prose_frame_sets where product='${esc(product)}' order by version desc limit 1) t`,
      );
      return r ? toRow(r, "frames") : null;
    },
    async readDocumentPlan(product) {
      const r = await queryRow(
        `select row_to_json(t) from (select product,version,library_schema_version,approved,provenance,content_hash,plan from public.prose_document_plans where product='${esc(product)}' order by version desc limit 1) t`,
      );
      return r ? toRow(r, "plan") : null;
    },
  };
}
