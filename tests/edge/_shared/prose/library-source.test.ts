// ITEM 348 — PROSE LIBRARY LOADER: reliability contract §5(a)–(c).
//
// (a) fail-closed loading, (b) warm caching, (c) version pinning. The live-row
// pin test for §5(d) lives in `src/registry/__tests__/prose-library-pin.test.ts`
// because it needs direct Postgres access.

import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  contentHash,
  createDatabaseLibrarySource,
  libraryCacheStats,
  loadDocumentPlan,
  loadFrameSet,
  PROSE_LIBRARY_SCHEMA_VERSION,
  ProseLibraryUnavailableError,
  resetProseLibraryCache,
  tryLoadProseLibrary,
  type ProseLibraryRow,
  type ProseLibrarySource,
} from "../../../../supabase/functions/_shared/prose/library-source.ts";

const FRAMES = {
  product: "unit",
  version: "unit-frames",
  approved: false,
  frames: [],
};
const PLAN = {
  product: "unit",
  version: "unit-plan",
  approved: false,
  provenance: { method: "draft", donors_total: 0, donors_with_text: 0, extracted_at: "2026-08-01" },
  sections: [],
};

async function row(payload: unknown, over: Partial<ProseLibraryRow> = {}): Promise<ProseLibraryRow> {
  return {
    product: "unit",
    version: 1,
    library_schema_version: PROSE_LIBRARY_SCHEMA_VERSION,
    approved: false,
    provenance: "unit",
    content_hash: await contentHash(payload),
    payload,
    ...over,
  };
}

function source(
  frames: () => Promise<ProseLibraryRow | null>,
  plan: () => Promise<ProseLibraryRow | null>,
): ProseLibrarySource {
  return { readFrameSet: frames, readDocumentPlan: plan };
}

Deno.test("L1 — a healthy row loads and verifies its content hash", async () => {
  resetProseLibraryCache();
  const src = source(() => row(FRAMES), () => row(PLAN));
  const set = await loadFrameSet("unit", src);
  assertEquals(set.version, "unit-frames");
  const plan = await loadDocumentPlan("unit", src);
  assertEquals(plan.version, "unit-plan");
});

Deno.test("L2 — (a) a failing read throws the named error, never a partial library", async () => {
  resetProseLibraryCache();
  const src = source(
    () => Promise.reject(new Error("connection reset")),
    () => row(PLAN),
  );
  const err = await assertRejects(
    () => loadFrameSet("unit", src),
    ProseLibraryUnavailableError,
  );
  assertEquals(err.name, "ProseLibraryUnavailableError");
  assertEquals(err.reason, "read_failed");
  assert(err.message.includes("connection reset"));
});

Deno.test("L3 — (a) a missing row is fail-closed, not an empty render", async () => {
  resetProseLibraryCache();
  const src = source(() => Promise.resolve(null), () => Promise.resolve(null));
  const err = await assertRejects(() => loadDocumentPlan("unit", src), ProseLibraryUnavailableError);
  assertEquals(err.reason, "not_found");
});

Deno.test("L4 — (c) a schema-version mismatch is refused, never rendered silently", async () => {
  resetProseLibraryCache();
  const bad = await row(FRAMES, { library_schema_version: PROSE_LIBRARY_SCHEMA_VERSION + 1 });
  const src = source(() => Promise.resolve(bad), () => row(PLAN));
  const err = await assertRejects(() => loadFrameSet("unit", src), ProseLibraryUnavailableError);
  assertEquals(err.reason, "schema_mismatch");
  assert(err.message.includes(String(PROSE_LIBRARY_SCHEMA_VERSION)));
});

Deno.test("L5 — (d) a content-hash mismatch is refused", async () => {
  resetProseLibraryCache();
  const tampered = await row(FRAMES, { content_hash: "0".repeat(64) });
  const src = source(() => Promise.resolve(tampered), () => row(PLAN));
  const err = await assertRejects(() => loadFrameSet("unit", src), ProseLibraryUnavailableError);
  assertEquals(err.reason, "hash_mismatch");
});

Deno.test("L6 — a malformed payload is refused", async () => {
  resetProseLibraryCache();
  const bad = await row("not-an-object" as unknown);
  const src = source(() => Promise.resolve(bad), () => row(PLAN));
  const err = await assertRejects(() => loadFrameSet("unit", src), ProseLibraryUnavailableError);
  assertEquals(err.reason, "malformed_payload");
});

Deno.test("L7 — (b) warm cache: one source read per product per isolate", async () => {
  resetProseLibraryCache();
  let frameReads = 0;
  let planReads = 0;
  const src = source(
    () => {
      frameReads++;
      return row(FRAMES);
    },
    () => {
      planReads++;
      return row(PLAN);
    },
  );
  for (let i = 0; i < 5; i++) {
    await loadFrameSet("unit", src);
    await loadDocumentPlan("unit", src);
  }
  assertEquals(frameReads, 1);
  assertEquals(planReads, 1);
  const stats = libraryCacheStats();
  assertEquals(stats.frame_reads, 1);
  assertEquals(stats.frame_hits, 4);
  assert(stats.last_cold_ms !== null);
});

Deno.test("L8 — (a) tryLoadProseLibrary returns null so the caller can fall back", async () => {
  resetProseLibraryCache();
  const src = source(() => Promise.reject(new Error("down")), () => row(PLAN));
  assertEquals(await tryLoadProseLibrary("unit", src), null);

  resetProseLibraryCache();
  const ok = source(() => row(FRAMES), () => row(PLAN));
  const loaded = await tryLoadProseLibrary("unit", ok);
  assert(loaded !== null);
  assertEquals(loaded.frames.version, "unit-frames");
  assertEquals(loaded.plan.version, "unit-plan");
});

Deno.test("L9 — the database source reads the newest version and maps the payload column", async () => {
  resetProseLibraryCache();
  const seen: string[] = [];
  const client = {
    from(table: string) {
      seen.push(table);
      return {
        select: (cols: string) => {
          seen.push(cols);
          return {
            eq: () => ({
              order: (col: string, opts: { ascending: boolean }) => {
                seen.push(`${col}:${opts.ascending}`);
                return {
                  limit: () =>
                    Promise.resolve({
                      data: [
                        {
                          product: "unit",
                          version: 3,
                          library_schema_version: PROSE_LIBRARY_SCHEMA_VERSION,
                          approved: false,
                          provenance: "db",
                          content_hash: hash,
                          frames: FRAMES,
                        },
                      ],
                      error: null,
                    }),
                };
              },
            }),
          };
        },
      };
    },
  };
  const hash = await contentHash(FRAMES);
  const set = await loadFrameSet("unit", createDatabaseLibrarySource(client));
  assertEquals(set.version, "unit-frames");
  assert(seen.includes("prose_frame_sets"));
  assert(seen.includes("version:false"));
});

Deno.test("L10 — a database error is surfaced fail-closed", async () => {
  resetProseLibraryCache();
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: null, error: { message: "permission denied" } }),
          }),
        }),
      }),
    }),
  };
  const err = await assertRejects(
    () => loadFrameSet("unit", createDatabaseLibrarySource(client)),
    ProseLibraryUnavailableError,
  );
  assertEquals(err.reason, "read_failed");
  assert(err.message.includes("permission denied"));
});
