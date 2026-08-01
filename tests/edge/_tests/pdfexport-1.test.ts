// PDFEXPORT-1 unit tests — kickoff-pickup guards + qa_pdf_export shape.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  decidePickup,
  PICKUP_STALE_MS,
  REAP_STALE_MS,
  type KickoffRow,
} from "../../../supabase/functions/batch-kickoff-pickup/index.ts";
import {
  buildQaFileName,
  bytesToBase64,
  exportBatchPdfs,
  TOOL_SLUG_TO_PDF_TYPE,
  type ExportDeps,
  type QaDocRow,
} from "../../../supabase/functions/_shared/qa-pdf-export.ts";

const now = Date.parse("2026-07-17T12:00:00Z");
const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

// --- Task 1 tests -----------------------------------------------------------

Deno.test("single-flight: any running non-kickoff row blocks all kicks", () => {
  const rows: KickoffRow[] = [
    { id: "live", status: "running", phase: "running_tool", last_heartbeat_at: iso(1000), started_at: iso(60_000) },
    { id: "stale-kickoff", status: "running", phase: "kickoff", last_heartbeat_at: iso(REAP_STALE_MS + 5000), started_at: iso(REAP_STALE_MS + 5000) },
  ];
  const d = decidePickup(rows, now);
  assertEquals(d.kind, "single_flight_skip");
  assert(d.kind === "single_flight_skip" && d.live_run_id === "live");
});

Deno.test("stale-reap: 30-min kickoff row is reaped", () => {
  const rows: KickoffRow[] = [
    { id: "zombie", status: "running", phase: "kickoff",
      last_heartbeat_at: iso(REAP_STALE_MS + 60_000),
      started_at: iso(REAP_STALE_MS + 60_000) },
  ];
  const d = decidePickup(rows, now);
  assert(d.kind === "reap");
  assertEquals(d.run_id, "zombie");
  assert(d.age_ms >= REAP_STALE_MS);
});

Deno.test("kick: 2-min-stale kickoff row is picked", () => {
  const rows: KickoffRow[] = [
    { id: "pickme", status: "running", phase: "kickoff",
      last_heartbeat_at: iso(PICKUP_STALE_MS + 5000),
      started_at: iso(PICKUP_STALE_MS + 5000) },
  ];
  const d = decidePickup(rows, now);
  assert(d.kind === "kick");
  assertEquals(d.run_id, "pickme");
});

Deno.test("noop: fresh kickoff heartbeat is not picked", () => {
  const rows: KickoffRow[] = [
    { id: "fresh", status: "running", phase: "kickoff",
      last_heartbeat_at: iso(30_000), started_at: iso(30_000) },
  ];
  const d = decidePickup(rows, now);
  assertEquals(d.kind, "noop");
});

Deno.test("at most one kickoff picked per invocation (oldest first)", () => {
  const rows: KickoffRow[] = [
    { id: "younger", status: "running", phase: "kickoff",
      last_heartbeat_at: iso(PICKUP_STALE_MS + 10_000), started_at: iso(0) },
    { id: "older", status: "running", phase: "kickoff",
      last_heartbeat_at: iso(PICKUP_STALE_MS + 5 * 60_000), started_at: iso(0) },
  ];
  const d = decidePickup(rows, now);
  // Not reap-age; should be a kick, picking the older one.
  assert(d.kind === "kick");
  assertEquals(d.run_id, "older");
});

// --- Task 2 tests -----------------------------------------------------------

Deno.test("buildQaFileName pattern: <tool>-doc<N>-<uuid8>.pdf", () => {
  const name = buildQaFileName("dpia", 3, "a80ed6ac-daa8-49c3-bfb4-c77677816215");
  assertEquals(name, "dpia-doc3-a80ed6ac.pdf");
});

Deno.test("every run-quality-batch tool slug has a PDF renderer mapping", () => {
  const slugs = ["cppa-admt", "cppa-risk", "cppa-cyber", "governance", "dpia", "lia",
    "dpa-generator", "ir-playbook", "biometric-checker"];
  for (const s of slugs) {
    assert(TOOL_SLUG_TO_PDF_TYPE[s], `missing PDF renderer mapping for ${s}`);
  }
});

Deno.test("bytesToBase64 round-trips", () => {
  const b = new Uint8Array([80, 68, 70, 45, 49, 46, 52]); // "PDF-1.4"
  assertEquals(bytesToBase64(b), btoa("PDF-1.4"));
});

Deno.test("exportBatchPdfs inserts one row per doc with expected shape", async () => {
  const inserts: any[] = [];
  const deps: ExportDeps = {
    fetchDocs: async () => ([
      { tool: "dpia", doc_number: 1, source_row_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", source_table: "dpia_frameworks" },
      { tool: "cppa-risk", doc_number: 2, source_row_id: "11111111-2222-3333-4444-555555555555", source_table: "cppa_assessments" },
    ] as QaDocRow[]),
    invokePdf: async () => ({ ok: true, status: 200, body: JSON.stringify({ pdf_url: "https://example/signed.pdf" }) }),
    downloadPdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]), // %PDF
    insertExport: async (row) => { inserts.push(row); return { ok: true }; },
    logRun: async () => {},
  };
  const out = await exportBatchPdfs("batch-x", deps);
  assertEquals(out, { attempted: 2, inserted: 2, failed: 0 });
  assertEquals(inserts.length, 2);
  assertEquals(inserts[0].batch_id, "batch-x");
  assertEquals(inserts[0].tool, "dpia");
  assertEquals(inserts[0].doc_number, 1);
  assertEquals(inserts[0].file_name, "dpia-doc1-aaaaaaaa.pdf");
  assertEquals(typeof inserts[0].content_base64, "string");
  assertEquals(inserts[0].content_base64, btoa("%PDF"));
  assertEquals(inserts[1].file_name, "cppa-risk-doc2-11111111.pdf");
});

Deno.test("exportBatchPdfs: per-doc failure does not block others or throw", async () => {
  let calls = 0;
  const inserts: any[] = [];
  const deps: ExportDeps = {
    fetchDocs: async () => ([
      { tool: "dpia", doc_number: 1, source_row_id: "aaaaaaaa-1111-2222-3333-444444444444", source_table: null },
      { tool: "lia",  doc_number: 2, source_row_id: "bbbbbbbb-1111-2222-3333-444444444444", source_table: null },
    ] as QaDocRow[]),
    invokePdf: async () => {
      calls++;
      if (calls === 1) return { ok: false, status: 502, body: "boom" };
      return { ok: true, status: 200, body: JSON.stringify({ pdf_url: "https://example/x.pdf" }) };
    },
    downloadPdf: async () => new Uint8Array([1, 2, 3]),
    insertExport: async (row) => { inserts.push(row); return { ok: true }; },
    logRun: async () => {},
  };
  const out = await exportBatchPdfs("batch-y", deps);
  assertEquals(out.attempted, 2);
  assertEquals(out.inserted, 1);
  assertEquals(out.failed, 1);
  assertEquals(inserts.length, 1);
  assertEquals(inserts[0].tool, "lia");
});

Deno.test("exportBatchPdfs: fetchDocs throw is contained (never blocks completion)", async () => {
  const deps: ExportDeps = {
    fetchDocs: async () => { throw new Error("db down"); },
    invokePdf: async () => ({ ok: true, status: 200, body: "{}" }),
    downloadPdf: async () => new Uint8Array(),
    insertExport: async () => ({ ok: true }),
    logRun: async () => {},
  };
  const out = await exportBatchPdfs("batch-z", deps);
  assertEquals(out, { attempted: 0, inserted: 0, failed: 0 });
});
