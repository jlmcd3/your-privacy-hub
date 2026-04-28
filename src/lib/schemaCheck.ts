import { supabase } from "@/integrations/supabase/client";

/**
 * Columns the app expects to exist on the `updates` table.
 * Keep this list in sync with the SELECT in src/components/LatestUpdates.tsx
 * and other consumers of the updates feed.
 */
const REQUIRED_UPDATES_COLUMNS = [
  "id",
  "title",
  "summary",
  "url",
  "source_name",
  "source_domain",
  "image_url",
  "published_at",
  "category",
  "regulator",
  "is_premium",
  "ai_summary",
  "topic_tags",
  "attention_level",
  "affected_sectors",
  "regulatory_theory",
  "related_development",
  "enrichment_version",
  "key_date",
  "direct_jurisdictions",
] as const;

const PG_UNDEFINED_COLUMN = "42703";

let hasRun = false;

/**
 * Verifies each required column on `updates` is queryable.
 * Probes columns one at a time so we can pinpoint exactly which are missing
 * (a multi-column SELECT fails atomically and only reports the first bad column).
 *
 * Logs a single grouped warning if any columns are missing or the table is unreachable.
 * Safe to call multiple times — only runs once per session.
 */
export async function verifyUpdatesSchema(): Promise<void> {
  if (hasRun) return;
  hasRun = true;

  const missing: string[] = [];
  const otherErrors: { column: string; message: string; code?: string }[] = [];

  await Promise.all(
    REQUIRED_UPDATES_COLUMNS.map(async (col) => {
      const { error } = await (supabase as any)
        .from("updates")
        .select(col)
        .limit(1);

      if (!error) return;
      if (error.code === PG_UNDEFINED_COLUMN) {
        missing.push(col);
      } else {
        otherErrors.push({ column: col, message: error.message, code: error.code });
      }
    })
  );

  if (missing.length === 0 && otherErrors.length === 0) {
    // eslint-disable-next-line no-console
    console.info(
      `[schemaCheck] ✓ updates table schema OK (${REQUIRED_UPDATES_COLUMNS.length} columns verified)`
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.group("[schemaCheck] ⚠ updates table schema mismatch");
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `Missing ${missing.length} expected column(s) on public.updates:`,
      missing
    );
    // eslint-disable-next-line no-console
    console.warn(
      "Queries selecting these columns will return HTTP 400 (Postgres error 42703). " +
        "Update REQUIRED_UPDATES_COLUMNS in src/lib/schemaCheck.ts or add the columns via a migration."
    );
  }
  if (otherErrors.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("Other column probe errors:", otherErrors);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}
