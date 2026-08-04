// ITEM 348 (SHARED-TREE SLIMMING) — PROSE LIBRARY LOADER.
//
// The frame sets (Items 338/346) and document plans (Items 339/347) are DATA,
// not code. They live in `public.prose_frame_sets` / `public.prose_document_plans`
// and are loaded at generation time through this module. `_shared` carries the
// CODE that renders them and nothing else.
//
// RELIABILITY CONTRACT (Item 348 §5):
//   (a) FAIL-CLOSED   — any read failure, missing row, schema mismatch or hash
//                       mismatch throws `ProseLibraryUnavailableError`. Callers
//                       fall back to the deterministic renderer or abort
//                       visibly. There is no partial render.
//   (b) WARM CACHING  — one source read per product per isolate (module scope).
//   (c) VERSION PIN   — the code asserts PROSE_LIBRARY_SCHEMA_VERSION. A row
//                       written by an incompatible library version is refused
//                       and an alarm is logged; it is never rendered silently.
//   (d) PIN TESTS     — every row carries `content_hash` over its canonical
//                       payload; the loader verifies it on every cold read.

import type { FrameSet } from "./frames.ts";
import type { DocumentPlan } from "./plan.ts";

/**
 * Schema version of the frame/plan payload shape this code understands.
 * Bump whenever the payload shape changes in a way older code cannot render.
 */
export const PROSE_LIBRARY_SCHEMA_VERSION = 2;

export type ProseLibraryKind = "frame_set" | "document_plan";

export class ProseLibraryUnavailableError extends Error {
  override readonly name = "ProseLibraryUnavailableError";
  constructor(
    readonly kind: ProseLibraryKind,
    readonly product: string,
    readonly reason:
      | "read_failed"
      | "not_found"
      | "schema_mismatch"
      | "hash_mismatch"
      | "malformed_payload",
    detail?: string,
  ) {
    super(
      `prose library unavailable: ${kind} for "${product}" (${reason})` +
        (detail ? ` — ${detail}` : ""),
    );
  }
}

export interface ProseLibraryRow {
  readonly product: string;
  readonly version: number;
  readonly library_schema_version: number;
  readonly approved: boolean;
  readonly provenance: string;
  readonly content_hash: string;
  readonly payload: unknown;
}

/** A place rows can be read from: the database, a file, or a test double. */
export interface ProseLibrarySource {
  readFrameSet(product: string): Promise<ProseLibraryRow | null>;
  readDocumentPlan(product: string): Promise<ProseLibraryRow | null>;
}

// ---------------------------------------------------------------------------
// Canonical hashing — key-order independent, so a round-trip through jsonb
// cannot change a row's hash.
// ---------------------------------------------------------------------------

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

export async function contentHash(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalize(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// (b) WARM CACHE — module scope, so one read per isolate.
// ---------------------------------------------------------------------------

const frameCache = new Map<string, FrameSet>();
const planCache = new Map<string, DocumentPlan>();

export interface LibraryCacheStats {
  readonly frame_reads: number;
  readonly plan_reads: number;
  readonly frame_hits: number;
  readonly plan_hits: number;
  readonly last_cold_ms: number | null;
}

let stats = { frame_reads: 0, plan_reads: 0, frame_hits: 0, plan_hits: 0, last_cold_ms: null as number | null };

export function libraryCacheStats(): LibraryCacheStats {
  return { ...stats };
}

/** Test-only: drop the isolate cache so a cold read can be measured again. */
export function resetProseLibraryCache(): void {
  frameCache.clear();
  planCache.clear();
  stats = { frame_reads: 0, plan_reads: 0, frame_hits: 0, plan_hits: 0, last_cold_ms: null };
}

/** Emitted on every refusal so an incompatible library is never silent. */
function alarm(kind: ProseLibraryKind, product: string, reason: string, detail: string): void {
  console.error(
    JSON.stringify({
      alarm: "prose_library_refused",
      kind,
      product,
      reason,
      detail,
      expected_schema_version: PROSE_LIBRARY_SCHEMA_VERSION,
    }),
  );
}

async function verify(
  kind: ProseLibraryKind,
  product: string,
  row: ProseLibraryRow | null,
): Promise<unknown> {
  if (!row) {
    alarm(kind, product, "not_found", "no row for product");
    throw new ProseLibraryUnavailableError(kind, product, "not_found");
  }
  if (row.library_schema_version !== PROSE_LIBRARY_SCHEMA_VERSION) {
    const detail = `row schema ${row.library_schema_version}, code expects ${PROSE_LIBRARY_SCHEMA_VERSION}`;
    alarm(kind, product, "schema_mismatch", detail);
    throw new ProseLibraryUnavailableError(kind, product, "schema_mismatch", detail);
  }
  if (!row.payload || typeof row.payload !== "object") {
    alarm(kind, product, "malformed_payload", typeof row.payload);
    throw new ProseLibraryUnavailableError(kind, product, "malformed_payload");
  }
  const actual = await contentHash(row.payload);
  if (actual !== row.content_hash) {
    const detail = `expected ${row.content_hash}, got ${actual}`;
    alarm(kind, product, "hash_mismatch", detail);
    throw new ProseLibraryUnavailableError(kind, product, "hash_mismatch", detail);
  }
  // CHANGE CONTROL — APPROVAL LIVES ONLY IN THE DATABASE COLUMN.
  //
  // The authored payload no longer carries an operative `approved` field (it
  // carries `seed_default_approved`, used only when seeding inserts a new
  // row). The renderable gates read `payload.approved`, so the row's column —
  // the record of the CEO's sign-off act — is overlaid here, AFTER the hash
  // check, so content integrity is still verified against what was stored.
  return { ...(row.payload as Record<string, unknown>), approved: row.approved };
}

export async function loadFrameSet(
  product: string,
  source: ProseLibrarySource,
): Promise<FrameSet> {
  const cached = frameCache.get(product);
  if (cached) {
    stats.frame_hits++;
    return cached;
  }
  const t0 = Date.now();
  let row: ProseLibraryRow | null;
  try {
    row = await source.readFrameSet(product);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    alarm("frame_set", product, "read_failed", detail);
    throw new ProseLibraryUnavailableError("frame_set", product, "read_failed", detail);
  }
  stats.frame_reads++;
  const payload = (await verify("frame_set", product, row)) as FrameSet;
  stats.last_cold_ms = Date.now() - t0;
  frameCache.set(product, payload);
  return payload;
}

export async function loadDocumentPlan(
  product: string,
  source: ProseLibrarySource,
): Promise<DocumentPlan> {
  const cached = planCache.get(product);
  if (cached) {
    stats.plan_hits++;
    return cached;
  }
  const t0 = Date.now();
  let row: ProseLibraryRow | null;
  try {
    row = await source.readDocumentPlan(product);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    alarm("document_plan", product, "read_failed", detail);
    throw new ProseLibraryUnavailableError("document_plan", product, "read_failed", detail);
  }
  stats.plan_reads++;
  const payload = (await verify("document_plan", product, row)) as DocumentPlan;
  stats.last_cold_ms = Date.now() - t0;
  planCache.set(product, payload);
  return payload;
}

/**
 * FAIL-CLOSED helper for generators: returns null instead of throwing so the
 * caller can switch to the deterministic renderer. Never returns a partial
 * library.
 */
export async function tryLoadProseLibrary(
  product: string,
  source: ProseLibrarySource,
): Promise<{ frames: FrameSet; plan: DocumentPlan } | null> {
  try {
    const [frames, plan] = await Promise.all([
      loadFrameSet(product, source),
      loadDocumentPlan(product, source),
    ]);
    return { frames, plan };
  } catch (err) {
    if (err instanceof ProseLibraryUnavailableError) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Database-backed source (the one the edge functions use).
// ---------------------------------------------------------------------------

interface MinimalPostgrestClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
        };
      };
    };
  };
}

const ROW_COLUMNS = "product,version,library_schema_version,approved,provenance,content_hash";

export function createDatabaseLibrarySource(client: MinimalPostgrestClient): ProseLibrarySource {
  async function read(table: string, payloadCol: string, product: string) {
    const { data, error } = await client
      .from(table)
      .select(`${ROW_COLUMNS},${payloadCol}`)
      .eq("product", product)
      .order("version", { ascending: false })
      .limit(1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      product: String(row.product),
      version: Number(row.version),
      library_schema_version: Number(row.library_schema_version),
      approved: Boolean(row.approved),
      provenance: String(row.provenance ?? ""),
      content_hash: String(row.content_hash ?? ""),
      payload: row[payloadCol],
    } satisfies ProseLibraryRow;
  }

  return {
    readFrameSet: (product) => read("prose_frame_sets", "frames", product),
    readDocumentPlan: (product) => read("prose_document_plans", "plan", product),
  };
}
