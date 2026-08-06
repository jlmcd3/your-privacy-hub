// CHANGE-CONTROL — prose library seed SQL builder.
//
// APPROVAL LIVES ONLY IN THE DATABASE. `prose_document_plans.approved` and
// `prose_frame_sets.approved` record the CEO's sign-off act. No seeding path
// may write that column on an EXISTING row: content, hash, provenance and the
// schema/version fields update; approval is preserved exactly as found.
// A brand-new row inserts with `approved = false`.
//
// This module is pure (no imports, no I/O) so the regression suite can pin the
// statement shape and exercise it against a scratch table.

export interface SeedItem {
  readonly table: "prose_frame_sets" | "prose_document_plans";
  readonly column: "frames" | "plan";
  readonly product: string;
  readonly rel: string;
}

export const SEED_ITEMS: readonly SeedItem[] = [
  { table: "prose_frame_sets", column: "frames", product: "cppa-risk", rel: "frames/cppa-risk.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "cppa-risk", rel: "plans/cppa-risk.plan.json" },
  { table: "prose_frame_sets", column: "frames", product: "dpia", rel: "frames/dpia.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "dpia", rel: "plans/dpia.plan.json" },
  { table: "prose_frame_sets", column: "frames", product: "lia", rel: "frames/lia.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "lia", rel: "plans/lia.plan.json" },
  { table: "prose_document_plans", column: "plan", product: "governance", rel: "plans/governance.plan.json" },
  { table: "prose_document_plans", column: "plan", product: "registration", rel: "plans/registration.plan.json" },
  { table: "prose_frame_sets", column: "frames", product: "registration", rel: "frames/registration.frames.json" },
  { table: "prose_document_plans", column: "plan", product: "biometric", rel: "plans/biometric.plan.json" },
  { table: "prose_frame_sets", column: "frames", product: "biometric", rel: "frames/biometric.frames.json" },
  // ITEM 392 — ADMT prose plan (leg A).
  { table: "prose_document_plans", column: "plan", product: "admt", rel: "plans/admt.plan.json" },
];

/** Columns an upsert may refresh on an existing row. `approved` is NOT one. */
export const UPDATABLE_COLUMNS = ["library_schema_version", "provenance", "content_hash"] as const;

export interface SeedStatementInput {
  readonly table: string;
  readonly column: string;
  readonly product: string;
  readonly rel: string;
  readonly hash: string;
  /** Canonical JSON payload, already stringified. */
  readonly json: string;
  readonly schemaVersion: number;
  /** Defaults to 1; the row version, not the artifact's version label. */
  readonly version?: number;
  /** Defaults to `public`; overridden only by the regression suite's scratch table. */
  readonly schema?: string;
}

export function buildSeedStatement(input: SeedStatementInput): string {
  const json = input.json.replace(/'/g, "''");
  const provenance = `library/prose/${input.rel} @ item348`.replace(/'/g, "''");
  const setList = [...UPDATABLE_COLUMNS, input.column]
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");

  // Belt and braces: a future edit that reintroduces approval into the update
  // path fails loudly here rather than silently reverting a CEO sign-off.
  if (/\bapproved\b/.test(setList)) {
    throw new Error("seed upsert must never write the approved column on an existing row");
  }

  return (
    `INSERT INTO ${input.schema ?? "public"}.${input.table} (product, version, library_schema_version, approved, provenance, content_hash, ${input.column})\n` +
    `VALUES ('${input.product}', ${input.version ?? 1}, ${input.schemaVersion}, false, '${provenance}', '${input.hash}', '${json}'::jsonb)\n` +
    `ON CONFLICT (product, version) DO UPDATE SET ${setList};`
  );
}
