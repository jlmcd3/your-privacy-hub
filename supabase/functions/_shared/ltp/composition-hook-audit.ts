/**
 * composition-hook-audit — Stage-B AUTHOR-CHECKPOINT (2026-07-27).
 *
 * A.ii RCA (Item 185): env var LTP_TEST_FORCE_WRITE_AROUND was set but
 * the composition branch was never entered — telemetry showed
 * ltp.composition.write_around=false across 3/3 documents. The hook
 * reader was silently absent from the composition path.
 *
 * Contract: call at end of composition. If the hook secret is present
 * but the write_around branch was NOT taken, throw. Prevents future
 * "hook set + branch not entered" silent failures.
 *
 * §16 kin (fail-loud config assertion).
 */

export const COMPOSITION_HOOK_AUDIT_VERSION = "composition-hook-audit@2026-07-27";

export const FORCE_WRITE_AROUND_ENV = "LTP_TEST_FORCE_WRITE_AROUND";

export class CompositionHookAuditError extends Error {
  constructor(msg: string) {
    super(`[composition-hook-audit] ${msg}`);
    this.name = "CompositionHookAuditError";
  }
}

export interface HookAuditInput {
  /** Value read from env at composition start; empty/undefined = unset. */
  readonly hookValue: string | undefined | null;
  /** Whether the composition branch actually took the write-around path. */
  readonly writeAroundEntered: boolean;
}

/**
 * Fail-loud audit.
 *   hook SET     + branch entered      → OK
 *   hook SET     + branch NOT entered  → THROW  (silent bypass — the A.ii bug)
 *   hook UNSET   + branch entered      → THROW  (unauthorized degradation)
 *   hook UNSET   + branch NOT entered  → OK  (normal production)
 */
export function assertCompositionHookConformance(input: HookAuditInput): void {
  const set = typeof input.hookValue === "string" && input.hookValue.length > 0;
  if (set && !input.writeAroundEntered) {
    throw new CompositionHookAuditError(
      `${FORCE_WRITE_AROUND_ENV} is set but composition never entered the write-around branch — silent bypass (A.ii root cause).`,
    );
  }
  if (!set && input.writeAroundEntered) {
    throw new CompositionHookAuditError(
      `write-around branch was entered but ${FORCE_WRITE_AROUND_ENV} is not set — unauthorized degradation path.`,
    );
  }
}

/** Convenience — read the env once and freeze it for the composition turn. */
export function readForceWriteAroundOnce(env: { get(name: string): string | undefined }): string | undefined {
  return env.get(FORCE_WRITE_AROUND_ENV);
}
