/**
 * created-by-guard — Stage-B AUTHOR-CHECKPOINT (2026-07-27).
 *
 * Item 179 / Item 188 root-cause: nil / placeholder / unregistered UUID
 * reached the FK `quality_runs_created_by_fkey` because the born-state
 * controller accepted `created_by` without validating it against
 * `auth.users`. Kin of the outlawed placeholder-id class
 * (§25 GENERATED-IDS-ONLY / §19 GUARDED-MUTATIONS).
 *
 * Contract: call assertCreatedByIsRealUser at the born-state insert
 * boundary in quality-batch-orchestrator BEFORE any
 * INSERT INTO quality_batch_runs / quality_runs.
 *
 * Rejects, in priority order:
 *   1. Malformed UUID (§25)  — not a UUID string.
 *   2. Nil UUID (§25)        — 00000000-...-000000000000.
 *   3. Unknown UUID (§19)    — well-formed but absent from auth.users.
 *
 * Fail-loud (throws). No silent fallback. No placeholder substitution.
 */

export const CREATED_BY_GUARD_VERSION = "created-by-guard@2026-07-27";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export type UserLookup = (id: string) => Promise<boolean>;

export class CreatedByGuardError extends Error {
  readonly code: "malformed" | "nil" | "unknown";
  constructor(code: "malformed" | "nil" | "unknown", detail: string) {
    super(`[created-by-guard] ${code}: ${detail}`);
    this.code = code;
    this.name = "CreatedByGuardError";
  }
}

/**
 * Validate created_by against auth.users.
 *
 * @param createdBy    The value the controller received.
 * @param userExists   Injectable lookup — in production, a bound
 *                     supabase.auth.admin.getUserById call; in tests,
 *                     a stub returning true/false.
 */
export async function assertCreatedByIsRealUser(
  createdBy: unknown,
  userExists: UserLookup,
): Promise<string> {
  if (typeof createdBy !== "string" || !UUID_RE.test(createdBy)) {
    throw new CreatedByGuardError(
      "malformed",
      `created_by is not a well-formed UUID: ${JSON.stringify(createdBy)}`,
    );
  }
  if (createdBy.toLowerCase() === NIL_UUID) {
    throw new CreatedByGuardError(
      "nil",
      "created_by is the nil UUID; placeholder-id class forbidden by §25",
    );
  }
  const ok = await userExists(createdBy);
  if (!ok) {
    throw new CreatedByGuardError(
      "unknown",
      `created_by ${createdBy} is well-formed but not present in auth.users (§19 GUARDED-MUTATIONS)`,
    );
  }
  return createdBy;
}
