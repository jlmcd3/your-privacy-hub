// ITEM 376 — DPIA REFINEMENT PASS (Method #4, panel-final design).
//
// One pass, no loops: CRITIC (Claude) → VERIFIER (GPT-4o) → DETERMINISTIC
// SPLICER (no model). Runs after stitch + deliverable attaches and BEFORE the
// deterministic battery, so the battery always runs on whatever ships.
//
// FAIL-OPEN (panel amendment B6): critic error/timeout/unparseable → skip
// refinement entirely; verifier error → ZERO splices; splicer partial failures
// skip only the failed proposal. The document always proceeds to the battery.
//
// The model callers are injected so the pass is fully testable without any
// live API call.

export const DPIA_REFINEMENT_VERSION = "refine-2026-08-04-item376";

export const MAX_SPLICES = 12;

// ── Prompts (byte-verbatim, change-controlled) ───────────────────────────────

export const CRITIC_SYSTEM_PROMPT =
  `You are the revision editor for a completed legal compliance document. You receive the full INTAKE RECORD and the full DOCUMENT (JSON). Find defects a targeted rewrite can fix, and write the fix. You see only the intake and the document — no scores, no reviews.

FIND freely — no fixed checklist. Every finding must contain:
  path: exact JSONPath of ONE node, with array indices (e.g. $.risk_register[3].source)
  quote: the offending text at that node, verbatim
  class: record-contradiction | internal-inconsistency | unsupported-assertion | citation-misapplication | missing-argument | register-defect | generic-boilerplate
  anchor: the intake field(s) the fix restores, OR the two document passages that contradict each other (both quoted), OR the register rule violated
  replacement: the full corrected text of that node, in the document's professional register, matching surrounding cadence, no longer than twice the original node unless class is missing-argument
  confidence: high | medium

HARD RULES: A replacement may remove, reconcile, or restate what the record supports. It may NEVER assert a fact absent from the intake. A missing-argument replacement may only combine facts already in the record with citations already present in the document. NEVER touch: the final disclaimer, quoted statutory text, "[TO BE COMPLETED …]" / "[TO BE ASSESSED]" placeholders, "(default — confirm)" markers, the canonical advisory closes ("…further clarification is advisable." / "…further internal investigation is advisable."), determination outcomes, enum values, dates, names, ids, schema keys. A statement that something is absent from the record is CORRECT prose when the record is in fact silent — check the intake before flagging one. Avoid in replacements: leverage, utilize, robust, comprehensive, holistic, seamless, "in order to", "it should be noted", "as such", "on the record", "it is worth noting", "as noted above", please, simply.

Maximum 12 findings, ordered most severe first. A defect not fixable by rewriting one node goes under structural_findings with no replacement.
Return ONLY JSON: {"findings":[{path,quote,class,anchor,replacement,confidence}],"structural_findings":[{path,quote,class,note}]}`;

export const VERIFIER_SYSTEM_PROMPT =
  `You are an independent verifier. You receive the INTAKE RECORD, the DOCUMENT (JSON), and PROPOSED REVISIONS (path, quote, class, anchor, replacement). Approve a proposal ONLY if ALL hold: (1) the quote exists at the stated path; (2) the anchor is real — the cited intake field says what the proposal claims, or both quoted contradictory passages exist; (3) the replacement contains no factual assertion absent from the intake record; (4) the replacement does not alter any protected surface: the final disclaimer, quoted statutory text, bracketed placeholders, "(default — confirm)" markers, the canonical advisory closes, determination outcomes, enum values, dates, names, ids. You never propose revisions. You never improve replacements.
Return ONLY JSON: {"verdicts":[{"path":"...","verdict":"approve"|"reject","reason":"one sentence"}]}`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CriticFinding {
  path: string;
  quote: string;
  class: string;
  anchor: string;
  replacement: string;
  confidence: string;
}

export interface StructuralFinding {
  path?: string;
  quote?: string;
  class?: string;
  note?: string;
}

export interface Verdict {
  path: string;
  verdict: string;
  reason?: string;
}

export interface RefinementTelemetry {
  version: string;
  enabled: boolean;
  critic_findings: number;
  structural_findings: number;
  verifier_approved: number;
  verifier_rejected: number;
  spliced: number;
  quote_drift: number;
  capped: boolean;
  crashed: string | null;
  spliced_paths: string[];
}

// ── Protected surfaces (defense in depth; the prompts say the same) ──────────

export const PROTECTED_ROOT_KEYS = [
  "framework_disclaimer",
  "guidance_verbatim",
];

export const PROTECTED_LEAF_KEYS = [
  "name",
  "role",
  "approved_by_name",
  "approved_by_title",
  "approval_date",
  "status",
  "citation",
  "template_ref",
  "risk_id",
  "rule_id",
  "likelihood",
  "severity",
];

export function isProtectedPath(path: string): boolean {
  const segs = parsePath(path);
  if (!segs) return true; // unresolvable → treat as protected
  for (const s of segs) {
    if (typeof s === "string" && PROTECTED_ROOT_KEYS.includes(s)) return true;
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (typeof s === "string") {
      return PROTECTED_LEAF_KEYS.includes(s);
    }
  }
  return false;
}

// ── JSONPath (the narrow dialect the critic is instructed to emit) ───────────

export type PathSeg = string | number;

/** Parse `$.a.b[3].c` / `$["a b"][0]` into segments. Returns null if unparseable. */
export function parsePath(path: string): PathSeg[] | null {
  if (typeof path !== "string") return null;
  let p = path.trim();
  if (!p.startsWith("$")) return null;
  p = p.slice(1);
  const segs: PathSeg[] = [];
  const re = /^(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[(\d+)\]|\["([^"]+)"\]|\['([^']+)'\])/;
  while (p.length > 0) {
    const m = re.exec(p);
    if (!m) return null;
    if (m[1] !== undefined) segs.push(m[1]);
    else if (m[2] !== undefined) segs.push(Number(m[2]));
    else segs.push((m[3] ?? m[4])!);
    p = p.slice(m[0].length);
  }
  return segs.length > 0 ? segs : null;
}

export function readPath(root: unknown, path: string): unknown {
  const segs = parsePath(path);
  if (!segs) return undefined;
  let cur: any = root;
  for (const s of segs) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[s as any];
  }
  return cur;
}

function writePath(root: unknown, path: string, value: string): boolean {
  const segs = parsePath(path);
  if (!segs) return false;
  let cur: any = root;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur === null || cur === undefined || typeof cur !== "object") return false;
    cur = cur[segs[i] as any];
  }
  if (cur === null || cur === undefined || typeof cur !== "object") return false;
  cur[segs[segs.length - 1] as any] = value;
  return true;
}

// ── Parsing model output ─────────────────────────────────────────────────────

export function parseJsonLoose(text: string): any | null {
  if (typeof text !== "string") return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch { /* fall through */ }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { /* */ }
  }
  return null;
}

function asFindings(parsed: any): { findings: CriticFinding[]; structural: StructuralFinding[] } | null {
  if (!parsed || typeof parsed !== "object") return null;
  const rawF = Array.isArray(parsed.findings) ? parsed.findings : null;
  if (!rawF) return null;
  const findings: CriticFinding[] = [];
  for (const f of rawF) {
    if (!f || typeof f !== "object") continue;
    if (typeof f.path !== "string" || typeof f.quote !== "string" || typeof f.replacement !== "string") continue;
    findings.push({
      path: f.path,
      quote: f.quote,
      class: String(f.class ?? ""),
      anchor: String(f.anchor ?? ""),
      replacement: f.replacement,
      confidence: String(f.confidence ?? ""),
    });
  }
  const structural = Array.isArray(parsed.structural_findings)
    ? (parsed.structural_findings as StructuralFinding[])
    : [];
  return { findings, structural };
}

function asVerdicts(parsed: any): Verdict[] | null {
  if (!parsed || typeof parsed !== "object") return null;
  if (!Array.isArray(parsed.verdicts)) return null;
  const out: Verdict[] = [];
  for (const v of parsed.verdicts) {
    if (!v || typeof v !== "object" || typeof v.path !== "string") continue;
    out.push({ path: v.path, verdict: String(v.verdict ?? ""), reason: String(v.reason ?? "") });
  }
  return out;
}

// ── Deterministic splicer (panel amendment B1 — double anchor) ───────────────

export interface SpliceResult {
  spliced: number;
  quote_drift: number;
  capped: boolean;
  spliced_paths: string[];
  rejected: { path: string; reason: string }[];
}

export function applySplices(
  report: Record<string, unknown>,
  approved: CriticFinding[],
): SpliceResult {
  const res: SpliceResult = {
    spliced: 0,
    quote_drift: 0,
    capped: false,
    spliced_paths: [],
    rejected: [],
  };
  for (const f of approved) {
    if (res.spliced >= MAX_SPLICES) {
      res.capped = true;
      res.rejected.push({ path: f.path, reason: "cap_reached" });
      continue;
    }
    try {
      if (isProtectedPath(f.path)) {
        res.rejected.push({ path: f.path, reason: "protected_surface" });
        continue;
      }
      const current = readPath(report, f.path);
      if (typeof current !== "string") {
        res.rejected.push({ path: f.path, reason: "not_a_string_node" });
        continue;
      }
      // DOUBLE ANCHOR: splice only if the node still contains the quote.
      if (!f.quote || !current.includes(f.quote)) {
        res.quote_drift++;
        res.rejected.push({ path: f.path, reason: "quote_drift" });
        continue;
      }
      if (typeof f.replacement !== "string" || f.replacement.length === 0) {
        res.rejected.push({ path: f.path, reason: "empty_replacement" });
        continue;
      }
      if (!writePath(report, f.path, f.replacement)) {
        res.rejected.push({ path: f.path, reason: "write_failed" });
        continue;
      }
      res.spliced++;
      res.spliced_paths.push(f.path);
    } catch (e) {
      res.rejected.push({ path: f.path, reason: `splice_error:${(e as Error)?.message ?? "unknown"}` });
    }
  }
  return res;
}

// ── User-message builders ────────────────────────────────────────────────────

export function buildCriticUser(report: unknown, intake: unknown): string {
  return [
    "INTAKE RECORD:",
    JSON.stringify(intake ?? {}),
    "",
    "DOCUMENT:",
    JSON.stringify(report ?? {}),
  ].join("\n");
}

export function buildVerifierUser(
  report: unknown,
  intake: unknown,
  findings: CriticFinding[],
): string {
  return [
    "INTAKE RECORD:",
    JSON.stringify(intake ?? {}),
    "",
    "DOCUMENT:",
    JSON.stringify(report ?? {}),
    "",
    "PROPOSED REVISIONS:",
    JSON.stringify(findings.map((f) => ({
      path: f.path,
      quote: f.quote,
      class: f.class,
      anchor: f.anchor,
      replacement: f.replacement,
    }))),
  ].join("\n");
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface RefinementDeps {
  /** CRITIC — Claude, one call. Returns raw text. */
  critic: (system: string, user: string) => Promise<string>;
  /** VERIFIER — GPT-4o, one call. Returns raw text. */
  verifier: (system: string, user: string) => Promise<string>;
}

function emptyTelemetry(enabled: boolean, crashed: string | null = null): RefinementTelemetry {
  return {
    version: DPIA_REFINEMENT_VERSION,
    enabled,
    critic_findings: 0,
    structural_findings: 0,
    verifier_approved: 0,
    verifier_rejected: 0,
    spliced: 0,
    quote_drift: 0,
    capped: false,
    crashed,
    spliced_paths: [],
  };
}

export async function runDpiaRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  opts: { enabled?: boolean } = {},
): Promise<RefinementTelemetry> {
  const enabled = opts.enabled !== false;
  if (!enabled) return emptyTelemetry(false);

  // 1. CRITIC — any failure skips refinement entirely.
  let findings: CriticFinding[] = [];
  let structural: StructuralFinding[] = [];
  try {
    const raw = await deps.critic(CRITIC_SYSTEM_PROMPT, buildCriticUser(report, intake));
    const parsed = asFindings(parseJsonLoose(raw));
    if (!parsed) return emptyTelemetry(true, "critic_unparseable");
    findings = parsed.findings.slice(0, MAX_SPLICES);
    structural = parsed.structural;
  } catch (e) {
    return emptyTelemetry(true, `critic_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`);
  }

  const tel = emptyTelemetry(true);
  tel.critic_findings = findings.length;
  tel.structural_findings = structural.length;
  if (findings.length === 0) return tel;

  // 2. VERIFIER — any failure means ZERO splices.
  let verdicts: Verdict[] = [];
  try {
    const raw = await deps.verifier(
      VERIFIER_SYSTEM_PROMPT,
      buildVerifierUser(report, intake, findings),
    );
    const parsed = asVerdicts(parseJsonLoose(raw));
    if (!parsed) {
      tel.crashed = "verifier_unparseable";
      tel.verifier_rejected = findings.length;
      return tel;
    }
    verdicts = parsed;
  } catch (e) {
    tel.crashed = `verifier_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`;
    tel.verifier_rejected = findings.length;
    return tel;
  }

  const approvedPaths = new Set(
    verdicts.filter((v) => v.verdict === "approve").map((v) => v.path),
  );
  const approved = findings.filter((f) => approvedPaths.has(f.path));
  tel.verifier_approved = approved.length;
  tel.verifier_rejected = findings.length - approved.length;
  if (approved.length === 0) return tel;

  // 3. DETERMINISTIC SPLICER.
  try {
    const s = applySplices(report, approved);
    tel.spliced = s.spliced;
    tel.quote_drift = s.quote_drift;
    tel.capped = s.capped;
    tel.spliced_paths = s.spliced_paths;
  } catch (e) {
    tel.crashed = `splicer_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`;
  }
  return tel;
}
