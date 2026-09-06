// QA round two (ROPA-B-02 / ROPA-C02, 2026-09-06) — RoPA refresh versions did
// not form a per-register sequence. The QA account produced versions 1–5 for
// customer A, 6–8 for customer B, then 9–11 for customer C, because
// start-ropa-refresh took MAX(version_number) across the whole client. A
// refresh the UI promised as "v2" was generated as "Version 9".
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  lineageMembers,
  lineageRoot,
  nextLineageVersion,
  type LineageRow,
} from "../../../supabase/functions/start-ropa-refresh/_local/version-lineage.ts";

/**
 * The exact shape the QA account reached: three separate registers, all under
 * one client row, each its own chain of refreshes.
 */
const QA_ACCOUNT: LineageRow[] = [
  // Customer A — initial plus four refreshes.
  { id: "a1", parent_session_id: null, version_number: 1 },
  { id: "a2", parent_session_id: "a1", version_number: 2 },
  { id: "a3", parent_session_id: "a2", version_number: 3 },
  { id: "a4", parent_session_id: "a3", version_number: 4 },
  { id: "a5", parent_session_id: "a4", version_number: 5 },
  // Customer B — a separate register that the old counter numbered 6, 7, 8.
  { id: "b1", parent_session_id: null, version_number: 1 },
  // Customer C — a separate register that the old counter numbered 9, 10, 11.
  { id: "c1", parent_session_id: null, version_number: 1 },
];

Deno.test("a second register's first refresh is v2, not the account-wide next number", () => {
  // The reported defect: refreshing customer B's v1 produced Version 6, and
  // refreshing customer C's v1 produced Version 9.
  assertEquals(nextLineageVersion(QA_ACCOUNT, "b1", 1), 2);
  assertEquals(nextLineageVersion(QA_ACCOUNT, "c1", 1), 2);
});

Deno.test("a register's own chain still advances", () => {
  assertEquals(nextLineageVersion(QA_ACCOUNT, "a5", 5), 6);
});

Deno.test("refreshing an older version in a chain does not collide with a later one", () => {
  // Branching from a2 while a5 exists must not re-issue v3.
  assertEquals(nextLineageVersion(QA_ACCOUNT, "a2", 2), 6);
});

Deno.test("the root of a chain is found from any member", () => {
  assertEquals(lineageRoot(QA_ACCOUNT, "a4"), "a1");
  assertEquals(lineageRoot(QA_ACCOUNT, "a1"), "a1");
  assertEquals(lineageRoot(QA_ACCOUNT, "b1"), "b1");
});

Deno.test("a lineage contains only its own register's sessions", () => {
  assertEquals([...lineageMembers(QA_ACCOUNT, "a1")].sort(), ["a1", "a2", "a3", "a4", "a5"]);
  assertEquals([...lineageMembers(QA_ACCOUNT, "b1")], ["b1"]);
});

Deno.test("a parent outside the visible rows does not strand the walk", () => {
  const orphan: LineageRow[] = [{ id: "x2", parent_session_id: "missing", version_number: 4 }];
  assertEquals(lineageRoot(orphan, "x2"), "x2");
  assertEquals(nextLineageVersion(orphan, "x2", 4), 5);
});

Deno.test("a cycle terminates instead of hanging", () => {
  const cyclic: LineageRow[] = [
    { id: "p", parent_session_id: "q", version_number: 1 },
    { id: "q", parent_session_id: "p", version_number: 2 },
  ];
  const root = lineageRoot(cyclic, "p");
  assertEquals(root === "p" || root === "q", true);
  assertEquals(nextLineageVersion(cyclic, "p", 1), 3);
});

Deno.test("a null version number is treated as zero, never NaN", () => {
  const rows: LineageRow[] = [{ id: "n1", parent_session_id: null, version_number: null }];
  assertEquals(nextLineageVersion(rows, "n1", 0), 1);
});
