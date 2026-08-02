// ITEM 348 — PROSE LIBRARY ROW PIN (§5(d)).
//
// The frame set (Items 338/346) and document plans (Items 339/347) now live in
// `public.prose_frame_sets` / `public.prose_document_plans`. This pin covers
// those rows the same way the corpus pins cover registry rows:
//
//   * the row exists for every product the repo authors,
//   * its `content_hash` matches a canonical hash of the stored payload,
//   * the stored payload equals the authored JSON in `library/prose/`,
//   * `library_schema_version` matches the version the loader asserts,
//   * gating carries over as data: `approved` is still false (no CEO sign-off).
//
// Do NOT edit a pin to make a failing row pass; re-seed the row from
// `library/prose/` with `scripts/prose/seed-library.ts`.
//
// Skipped when the sandbox has no direct Postgres access (PGHOST unset).

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

/** The loader's PROSE_LIBRARY_SCHEMA_VERSION. Bump both together. */
const EXPECTED_SCHEMA_VERSION = 2;

const ROOT = path.resolve(__dirname, "../../../library/prose");

function q(sql: string): string {
  return execFileSync("psql", ["-tAX", "-c", sql], { encoding: "utf8" }).trim();
}

/** Mirrors `canonicalize()` in `_shared/prose/library-source.ts`. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

function hash(payload: unknown): string {
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

const ROWS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["prose_frame_sets", "frames", "cppa-risk", "frames/cppa-risk.frames.json"],
  ["prose_document_plans", "plan", "cppa-risk", "plans/cppa-risk.plan.json"],
  ["prose_document_plans", "plan", "dpia", "plans/dpia.plan.json"],
  ["prose_document_plans", "plan", "governance", "plans/governance.plan.json"],
  ["prose_document_plans", "plan", "registration", "plans/registration.plan.json"],
];

describe.skipIf(!CAN_RUN)("prose library rows — content pin", () => {
  for (const [table, col, product, rel] of ROWS) {
    it(`${table}/${product} matches ${rel} and its own content_hash`, () => {
      const raw = q(
        `select row_to_json(t) from (select library_schema_version, approved, content_hash, ${col} as payload from public.${table} where product='${product}' order by version desc limit 1) t`,
      );
      expect(raw, `no row for ${product} in ${table}`).not.toBe("");
      const row = JSON.parse(raw) as {
        library_schema_version: number;
        approved: boolean;
        content_hash: string;
        payload: unknown;
      };

      expect(row.library_schema_version).toBe(EXPECTED_SCHEMA_VERSION);
      expect(row.content_hash).toBe(hash(row.payload));

      const authored = JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));
      expect(canonicalize(row.payload)).toBe(canonicalize(authored));

      // Gating carries over as a column value. cppa-risk was approved under
      // Item 363 (CEO conditional approval satisfied); the rest still await
      // sign-off.
      const expectedApproved = product === "cppa-risk";
      expect(row.approved).toBe(expectedApproved);
      expect((row.payload as { approved?: boolean }).approved).toBe(expectedApproved);
    });
  }

  it("harvested candidate artifacts are recorded in the manifest, not in the shared tree", () => {
    const n = Number(q("select count(*) from public.prose_library_artifacts"));
    expect(n).toBeGreaterThanOrEqual(9);
    const bad = q(
      "select count(*) from public.prose_library_artifacts where content_hash = '' or byte_size <= 0",
    );
    expect(Number(bad)).toBe(0);
  });
});
