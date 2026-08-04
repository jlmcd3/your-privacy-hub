// CHANGE-CONTROL REGRESSION — seeding must never revert a CEO approval.
//
// Background: a content re-seed silently flipped approved rows back to false.
// `approved` is the record of the CEO's sign-off act and lives ONLY in the
// database column. This suite pins that:
//
//   * the generated upsert's SET list contains no `approved`,
//   * a brand-new row inserts with approved = false,
//   * seeding over an APPROVED row leaves approved = true while content,
//     hash, provenance and schema version all refresh.
//
// The live half runs against a scratch TEMP table that mirrors the real
// columns, so it exercises the actual SQL without touching production rows.

import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { buildSeedStatement, SEED_ITEMS, UPDATABLE_COLUMNS } from "../../../scripts/prose/seed-sql";

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

const stmt = (over: Partial<Parameters<typeof buildSeedStatement>[0]> = {}) =>
  buildSeedStatement({
    table: "prose_document_plans",
    column: "plan",
    product: "dpia",
    rel: "plans/dpia.plan.json",
    hash: "deadbeef",
    json: JSON.stringify({ product: "dpia", seed_default_approved: false }),
    schemaVersion: 2,
    ...over,
  });

describe("prose seed — approval is never written on an existing row", () => {
  it("the upsert SET list excludes approved", () => {
    const sql = stmt();
    const setList = sql.slice(sql.indexOf("DO UPDATE SET"));
    expect(setList).not.toMatch(/\bapproved\b/);
    expect(UPDATABLE_COLUMNS).not.toContain("approved" as never);
  });

  it("a new row inserts with approved = false", () => {
    expect(stmt()).toContain("VALUES ('dpia', 1, 2, false,");
  });

  it("every seeded item builds an approval-safe statement", () => {
    for (const it of SEED_ITEMS) {
      const sql = buildSeedStatement({
        table: it.table,
        column: it.column,
        product: it.product,
        rel: it.rel,
        hash: "h",
        json: "{}",
        schemaVersion: 2,
      });
      expect(sql.slice(sql.indexOf("DO UPDATE SET"))).not.toMatch(/\bapproved\b/);
    }
  });
});

describe.skipIf(!CAN_RUN)("prose seed — live upsert over an approved row", () => {
  it("preserves approved = true and refreshes content", () => {
    const sql = stmt({
      table: "scratch_plans",
      schema: "pg_temp",
      hash: "newhash",
      json: JSON.stringify({ product: "dpia", revision: "second" }),
      schemaVersion: 2,
    });

    const script = [
      `create temp table scratch_plans (
         product text not null,
         version int not null,
         library_schema_version int not null,
         approved boolean not null default false,
         provenance text,
         content_hash text,
         plan jsonb,
         primary key (product, version)
       );`,
      `insert into scratch_plans (product, version, library_schema_version, approved, provenance, content_hash, plan)
       values ('dpia', 1, 1, true, 'old', 'oldhash', '{"revision":"first"}'::jsonb);`,
      sql,
      `select row_to_json(t) from (select approved, content_hash, library_schema_version, plan->>'revision' as revision from scratch_plans where product='dpia') t;`,
    ].join("\n");

    const out = execFileSync("psql", ["-tAX", "-c", script], { encoding: "utf8" }).trim();
    const row = JSON.parse(out.split("\n").filter(Boolean).pop() as string) as {
      approved: boolean;
      content_hash: string;
      library_schema_version: number;
      revision: string;
    };

    expect(row.approved).toBe(true); // the CEO's sign-off survived the re-seed
    expect(row.content_hash).toBe("newhash");
    expect(row.library_schema_version).toBe(2);
    expect(row.revision).toBe("second");
  });
});
