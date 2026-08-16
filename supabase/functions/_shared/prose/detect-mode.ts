/**
 * PROMPT 9K (CEO-ruled 2026-08-16) — ASSERT-ONLY COMPOSITION PIPELINE.
 *
 * GOVERNING PRINCIPLE: on the DPIA new-document path, MUTATION RIGHTS ARE
 * RESERVED TO THE BUILDERS AND THE ASSEMBLER. Every downstream "police" pass
 * may DETECT and report; none may rewrite reader-facing text. Checks stay;
 * pens go.
 *
 * MECHANISM. A police pass gains a `detectOnly` option. When it is on, the
 * pass runs against a DEEP CLONE of the report — its check logic is executed
 * EXACTLY as today, byte for byte, no branch inside the detector changes —
 * and the clone is then diffed against the real report. Every reader-facing
 * string the pass WOULD have rewritten becomes a detect finding (pass id,
 * path, before/after evidence sample). The real report is never written to.
 *
 * Fail-open in production: a crash in this wrapper leaves the report
 * untouched and records `crashed: true`. Never throws.
 */

export const DETECT_MODE_VERSION = "detect-mode@9k-2026-08-16";

export interface DetectFinding {
  /** Which police pass raised it. */
  pass: string;
  /** Stable check id (pass-specific; "would_rewrite" for diff-derived). */
  check_id: string;
  /** Dot-path of the reader-facing leaf. */
  path: string;
  /** Trimmed sample of the offending text (<=200 chars). */
  evidence: string;
}

export interface DetectRunTelemetry {
  version: string;
  pass: string;
  detect_only: true;
  findings_count: number;
  writes_suppressed: number;
  crashed: boolean;
}

const SKIP_KEYS = new Set(["_meta", "_staging"]);

function deepClone<T>(v: T): T {
  try {
    // deno-lint-ignore no-explicit-any
    const sc = (globalThis as any).structuredClone;
    if (typeof sc === "function") return sc(v);
  } catch { /* fall through */ }
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Every reader-facing string leaf, keyed by dot-path. `_meta` excluded. */
export function collectStringLeaves(
  node: unknown,
  path: string,
  out: Map<string, string>,
): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") out.set(`${path}[${i}]`, v);
      else collectStringLeaves(v, `${path}[${i}]`, out);
    }
    return;
  }
  if (typeof node !== "object") return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (SKIP_KEYS.has(k)) continue;
    const p = path ? `${path}.${k}` : k;
    if (typeof v === "string") out.set(p, v);
    else collectStringLeaves(v, p, out);
  }
}

/**
 * Diff two documents over reader-facing string leaves. Any leaf that changed,
 * disappeared or appeared is a suppressed write.
 */
export function diffReaderFacing(
  before: unknown,
  after: unknown,
  pass: string,
): DetectFinding[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  collectStringLeaves(before, "", a);
  collectStringLeaves(after, "", b);
  const findings: DetectFinding[] = [];
  for (const [p, was] of a) {
    const now = b.get(p);
    if (now === was) continue;
    findings.push({
      pass,
      check_id: now === undefined ? "would_remove" : "would_rewrite",
      path: p,
      evidence: String(was).slice(0, 200),
    });
  }
  for (const [p, now] of b) {
    if (a.has(p)) continue;
    findings.push({ pass, check_id: "would_insert", path: p, evidence: String(now).slice(0, 200) });
  }
  return findings;
}

/** Append findings to `_meta.internal.detect_mode` on the REAL report. */
export function recordDetectFindings(
  report: Record<string, unknown> | null | undefined,
  pass: string,
  findings: readonly DetectFinding[],
  extra: Record<string, unknown> = {},
): void {
  try {
    if (!report || typeof report !== "object") return;
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    const dm = (internal.detect_mode ??= {
      version: DETECT_MODE_VERSION,
      passes: {} as Record<string, unknown>,
      findings: [] as DetectFinding[],
      findings_count: 0,
    }) as Record<string, unknown>;
    const all = (dm.findings ??= []) as DetectFinding[];
    for (const f of findings) all.push(f);
    dm.findings_count = all.length;
    (dm.passes as Record<string, unknown>)[pass] = {
      detect_only: true,
      findings_count: findings.length,
      ...extra,
    };
    console.log(JSON.stringify({
      evt: "detect_mode_pass",
      version: DETECT_MODE_VERSION,
      pass,
      findings_count: findings.length,
      sample: findings.slice(0, 3),
    }));
  } catch { /* telemetry only — never block emission */ }
}

/**
 * Run a police pass in DETECT mode.
 *
 * `run` receives a deep clone and executes the pass exactly as it would in
 * write mode. Nothing it writes reaches the real report; every reader-facing
 * write it attempted is recorded as a finding.
 */
export function detectOnlyRun<T>(
  report: Record<string, unknown> | null | undefined,
  pass: string,
  run: (clone: Record<string, unknown>) => T,
  fallback: T,
): T {
  if (!report || typeof report !== "object") return fallback;
  let counters: T = fallback;
  let findings: DetectFinding[] = [];
  let crashed = false;
  try {
    const clone = deepClone(report) as Record<string, unknown>;
    counters = run(clone);
    findings = diffReaderFacing(report, clone, pass);
  } catch (e) {
    crashed = true;
    console.warn(`[detect-mode:${pass}] failed (non-fatal):`, (e as Error)?.message);
  }
  recordDetectFindings(report, pass, findings, {
    writes_suppressed: findings.length,
    crashed,
    counters: counters as unknown,
  });
  return counters;
}

/** Detect findings recorded on a document (test + harness helper). */
export function readDetectFindings(report: unknown): DetectFinding[] {
  try {
    // deno-lint-ignore no-explicit-any
    const f = (report as any)?._meta?.internal?.detect_mode?.findings;
    return Array.isArray(f) ? f as DetectFinding[] : [];
  } catch {
    return [];
  }
}
