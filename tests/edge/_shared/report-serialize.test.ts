// LEAK-PREV-P2 — serializer core tests.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { serializeCustomerReport, SERIALIZER_VERSION, type ReportSchema } from "../../../supabase/functions/_shared/report-serialize.ts";

const TEST_SCHEMA: ReportSchema = {
  version: SERIALIZER_VERSION,
  tool: "test_tool",
  topLevel: ["title", "items", "scope", "_meta"],
  entries: { items: ["id", "text", "insufficient_basis"] },
  objects: { scope: ["applicable", "reason"] },
};

Deno.test("serializer drops unknown top-level key and records path", () => {
  const { report, telemetry } = serializeCustomerReport(
    { title: "ok", surprise: "leaked", items: [] },
    TEST_SCHEMA,
  );
  const r = report as Record<string, unknown>;
  assert(!("surprise" in r), "surprise should be dropped");
  assertEquals(r.title, "ok");
  assert(telemetry.dropped_keys.includes("surprise"));
  const internal = (r._meta as any).internal.serializer;
  assertEquals(internal.tool, "test_tool");
  assert(internal.dropped_keys.includes("surprise"));
});

Deno.test("serializer drops underscore-prefixed top-level key", () => {
  const { report } = serializeCustomerReport(
    { title: "ok", _w9_admt_wire: { pass: 1 }, _va_stamp: "x" },
    TEST_SCHEMA,
  );
  const r = report as Record<string, unknown>;
  assert(!("_w9_admt_wire" in r));
  assert(!("_va_stamp" in r));
});

Deno.test("serializer drops nested unknown entry key", () => {
  const { report } = serializeCustomerReport(
    { title: "ok", items: [{ id: "1", text: "hi", _va_stamp: "leak", secret: "no" }] },
    TEST_SCHEMA,
  );
  const items = (report as any).items;
  assertEquals(items[0].id, "1");
  assertEquals(items[0].text, "hi");
  assert(!("_va_stamp" in items[0]));
  assert(!("secret" in items[0]));
});

Deno.test("serializer preserves _meta.internal only", () => {
  const { report } = serializeCustomerReport(
    {
      title: "ok",
      _meta: {
        internal: { emit_gate: { degraded_count: 3 } },
        secret: "should be dropped",
      },
    },
    TEST_SCHEMA,
  );
  const meta = (report as any)._meta;
  assertEquals(meta.internal.emit_gate.degraded_count, 3);
  assert(!("secret" in meta));
});

Deno.test("serializer preserves declared keys byte-identical", () => {
  const src = {
    title: "Report",
    items: [{ id: "a", text: "body", insufficient_basis: true }],
    scope: { applicable: true, reason: "in scope" },
  };
  const { report } = serializeCustomerReport(src, TEST_SCHEMA);
  const r = report as any;
  delete r._meta; // added by serializer
  assertEquals(r, src);
});

Deno.test("serializer prunes object slots by allow-list", () => {
  const { report } = serializeCustomerReport(
    { title: "ok", scope: { applicable: true, reason: "x", _internal: "leak", extra: "no" } },
    TEST_SCHEMA,
  );
  const scope = (report as any).scope;
  assertEquals(scope.applicable, true);
  assertEquals(scope.reason, "x");
  assert(!("_internal" in scope));
  assert(!("extra" in scope));
});

Deno.test("serializer crash returns input unchanged with crashed flag", () => {
  const bad: any = {};
  Object.defineProperty(bad, "boom", { get() { throw new Error("nope"); }, enumerable: true });
  const { report, telemetry } = serializeCustomerReport(bad, TEST_SCHEMA);
  assert(telemetry.crashed === true);
  const internal = (report as any)._meta?.internal?.serializer;
  assert(internal?.crashed === true);
});

Deno.test("dropped_keys are capped at 100 with truncated_at marker", () => {
  const junk: Record<string, unknown> = { title: "ok" };
  for (let i = 0; i < 150; i++) junk[`extra_${i}`] = i;
  const { telemetry } = serializeCustomerReport(junk, TEST_SCHEMA);
  assertEquals(telemetry.dropped_keys.length, 100);
  assertEquals(telemetry.truncated_at, 100);
  assert(telemetry.dropped_count >= 150);
});

Deno.test("safe on non-object input", () => {
  const { report } = serializeCustomerReport(null, TEST_SCHEMA);
  assertEquals(report, null);
});
