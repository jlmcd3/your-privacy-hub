/**
 * composition-hook-audit — Stage-B AUTHOR-CHECKPOINT.
 *
 * Original A.ii RCA (Item 185): the LTP_TEST_FORCE_WRITE_AROUND hook
 * was set but the composition branch was never entered — silent
 * bypass. The audit fires on any config-vs-runtime mismatch.
 *
 * ITEM 217 AUTHORIZATION-MODEL FIX (2026-07-28) — Smoke #11 review:
 * production clock-cap write-around (Pass-1 75s cap → write_around=true;
 * seen smokes #4/#10/#11) is a DESIGNED degradation per the Item-203
 * clock contract, not a test scenario. Entry into the write-around
 * branch is now AUTHORIZED when it originates from a known runtime
 * path (`clock_cap`, `timeout`, `test_forced`). The audit throws only
 * on genuinely unauthorized entry — no origin AND no test flag.
 *
 * Truth table (hook = LTP_TEST_FORCE_WRITE_AROUND):
 *
 *   hook SET   + branch entered                         → OK
 *   hook SET   + branch NOT entered                     → THROW (silent bypass — A.ii)
 *   hook UNSET + branch NOT entered                     → OK (normal production)
 *   hook UNSET + branch entered + authorized origin     → OK (Item 217 clock-cap path)
 *   hook UNSET + branch entered + no/unknown origin     → THROW (unauthorized degradation)
 *
 * §16 kin (fail-loud config assertion).
 */

export const COMPOSITION_HOOK_AUDIT_VERSION = "composition-hook-audit@2026-07-28-item230";

export const FORCE_WRITE_AROUND_ENV = "LTP_TEST_FORCE_WRITE_AROUND";

/**
 * ITEM 217 — write-around origin.
 *   - "clock_cap"           : Pass-1 clock-cap / retry-exhaustion write-around
 *                             (designed degradation per Item 203).
 *   - "timeout"             : upstream hard timeout took the write-around path.
 *   - "pass1_abort_timeout" : T-M9 (Item 230) — Pass-1 per-attempt AbortController
 *                             fired on both N=2 attempts. Designed degradation.
 *   - "test_forced"         : test-only forcing token was used (production
 *                             requests never set this).
 *   - "unknown"             : origin not identified — treated as unauthorized
 *                             unless the hook is set.
 */
export type WriteAroundOrigin =
  | "clock_cap"
  | "timeout"
  | "pass1_abort_timeout"
  | "pass1_validator_reject"
  | "pass1_model_error"
  | "test_forced"
  | "unknown";

const AUTHORIZED_ORIGINS: ReadonlySet<WriteAroundOrigin> = new Set([
  "clock_cap",
  "timeout",
  "pass1_abort_timeout",
  "pass1_validator_reject",
  "pass1_model_error",
  "test_forced",
]);

/**
 * ITEM 240 (B) — canonical classifier from a Pass-1 telemetry.error string to
 * a WriteAroundOrigin. Central so index.ts, composition-finalize.ts, and any
 * future caller cannot drift on the mapping; unit-asserted in the composition-
 * hook-audit tests. Returns "unknown" on unrecognized input (audit will treat
 * unauthorized unless the hook is set).
 */
export function classifyPass1WriteAroundOrigin(err: string | null | undefined): WriteAroundOrigin {
  if (!err) return "unknown";
  if (err === "test_only_forced_degradation") return "test_forced";
  if (err === "pass1_abort_timeout") return "pass1_abort_timeout";
  if (err.startsWith("validator_issues:")) return "pass1_validator_reject";
  if (err.startsWith("exception:") || err === "empty_content") return "pass1_model_error";
  return "clock_cap";
}

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
  /**
   * ITEM 217: origin of the write-around entry, when known. If
   * `writeAroundEntered` is false this field is ignored.
   */
  readonly writeAroundOrigin?: WriteAroundOrigin;
}

/**
 * Fail-loud audit. See truth table in the module header.
 */
export function assertCompositionHookConformance(input: HookAuditInput): void {
  const set = typeof input.hookValue === "string" && input.hookValue.length > 0;
  if (set && !input.writeAroundEntered) {
    throw new CompositionHookAuditError(
      `${FORCE_WRITE_AROUND_ENV} is set but composition never entered the write-around branch — silent bypass (A.ii root cause).`,
    );
  }
  if (!set && input.writeAroundEntered) {
    const origin = input.writeAroundOrigin;
    if (origin && AUTHORIZED_ORIGINS.has(origin)) return; // Item 217: authorized
    throw new CompositionHookAuditError(
      `write-around branch was entered without ${FORCE_WRITE_AROUND_ENV} and without an authorized origin (got origin=${origin ?? "undefined"}) — unauthorized degradation path.`,
    );
  }
}

/** Convenience — read the env once and freeze it for the composition turn. */
export function readForceWriteAroundOnce(env: { get(name: string): string | undefined }): string | undefined {
  return env.get(FORCE_WRITE_AROUND_ENV);
}
