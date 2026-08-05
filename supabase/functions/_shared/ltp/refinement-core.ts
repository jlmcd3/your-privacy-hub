// ITEM 378 — GENERIC REFINEMENT CORE (per-product config).
//
// Extracted verbatim from the item376/item377 DPIA refinement pass so the
// same one-pass loop — CRITIC (Claude) -> VERIFIER (GPT-4o) -> DETERMINISTIC
// SPLICER (no model) — can serve more than one product. The DPIA config
// reproduces the item377 behaviour BYTE-FOR-BYTE (see dpia-refinement.ts,
// whose prompt constants are asserted unchanged by the item376/item377
// suites); the risk config lives in risk-refinement.ts.
//
// FAIL-OPEN: critic error/timeout/unparseable -> skip refinement entirely;
// verifier error -> ZERO splices; splicer partial failures skip only the
// failed proposal. The document always proceeds.

export const MAX_SPLICES = 12;
export const FINDINGS_LOG_QUOTE_MAX = 160;

// -- Shared prompt cores (product-neutral; a product appends its own block) --

export const CRITIC_PROMPT_BASE =
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
Return ONLY JSON: {"findings":[{path,quote,class,anchor,replacement,confidence}],"structural_findings":[{path,quote,class,note}]}

MATERIAL OMISSIONS — you will receive a COVERAGE list (unused intake facts and orphaned links, computed deterministically). You may raise class 'material-omission' findings ONLY anchored to an entry in that list or to an engaged authority with no corresponding analysis. An omission finding's replacement expands ONE existing node using ONLY the cited unused fact or the cited authority already in the document; no other new content. Unanchored omission claims are forbidden.`;

export const VERIFIER_PROMPT_BASE =
  `You are an independent verifier. You receive the INTAKE RECORD, the DOCUMENT (JSON), and PROPOSED REVISIONS (path, quote, class, anchor, replacement). Approve a proposal ONLY if ALL hold: (1) the quote exists at the stated path; (2) the anchor is real — the cited intake field says what the proposal claims, or both quoted contradictory passages exist; (3) the replacement contains no factual assertion absent from the intake record; (4) the replacement does not alter any protected surface: the final disclaimer, quoted statutory text, bracketed placeholders, "(default — confirm)" markers, the canonical advisory closes, determination outcomes, enum values, dates, names, ids; (5) the replacement affirmatively performs better than the original — more accurate, more complete against the finding, or clearer; when the original is equally good, REJECT with reason "necessity". You never propose revisions. You never improve replacements.
Rejection reason vocabulary — use exactly one of: quote-not-found | anchor-unreal | new-fact | protected-surface | necessity.
Return ONLY JSON: {"verdicts":[{"path":"...","verdict":"approve"|"reject","reason":"one sentence"}]}`;

/** Compose a product prompt: shared core + "\n\n" + the product block. */
export function composePrompt(base: string, productBlock: string): string {
  return `${base}\n\n${productBlock}`;
}

// -- Types -------------------------------------------------------------------

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

/** One bucket per critic proposal (item377 section 1). */
export interface ProtectedRejection {
  path: string;
  leaf_key_or_rule: string;
}

export interface FindingLogEntry {
  path: string;
  class: string;
  confidence: string;
  quote: string; // truncated to FINDINGS_LOG_QUOTE_MAX
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
  protected_rejected: { count: number; items: ProtectedRejection[] };
  cap_overflow: number;
  capped: boolean;
  crashed: string | null;
  spliced_paths: string[];
  findings_log: FindingLogEntry[];
  // ── ITEM 379 additions ────────────────────────────────────────────────
  /** Verifier rejections attributed to the necessity condition (5). */
  necessity_rejected: number;
  /** Every verifier rejection, counted by normalised reason. */
  verifier_reject_reasons: Record<string, number>;
  /** class === "material-omission" proposals the critic raised. */
  omission_findings: number;
  /** Omission proposals rejected in code for citing no coverage entry. */
  omission_unanchored: number;
  /** True when a deterministic coverage list was supplied to the critic. */
  coverage_supplied: boolean;
}

/** Everything that varies per product. */
export interface RefinementConfig {
  readonly product: string;
  readonly version: string;
  readonly criticSystemPrompt: string;
  readonly verifierSystemPrompt: string;
  readonly protectedRootKeys: readonly string[];
  readonly protectedLeafKeys: readonly string[];
}

// -- Protected surfaces (defense in depth; the prompts say the same) ---------

export function isProtectedPathFor(path: string, cfg: RefinementConfig): boolean {
  return protectedReasonFor(path, cfg) !== null;
}

/** The rule that protects a path, or null when unprotected. */
export function protectedReasonFor(path: string, cfg: RefinementConfig): string | null {
  const segs = parsePath(path);
  if (!segs) return "unparseable_path"; // unresolvable -> treat as protected
  // ITEM 379r2 (R1) — the internal telemetry subtree is never a revision
  // target. The critic never sees it; if a proposal names it anyway, the
  // splicer refuses it in code.
  if (segs[0] === "_meta") return "_meta_subtree";
  for (const s of segs) {
    if (typeof s === "string" && cfg.protectedRootKeys.includes(s)) return s;
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    if (typeof s === "string") {
      return cfg.protectedLeafKeys.includes(s) ? s : null;
    }
  }
  return null;
}

/**
 * ITEM 379r2 (R1) — the document as the models may see it: the ENTIRE `_meta`
 * subtree (and its sibling staging buckets) removed. Pure; the original object
 * is never mutated.
 */
export function stripMeta<T>(report: T): T {
  if (!report || typeof report !== "object") return report;
  if (Array.isArray(report)) return report.map((x) => stripMeta(x)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(report as Record<string, unknown>)) {
    if (k === "_meta" || k === "_staging") continue;
    out[k] = (v && typeof v === "object") ? stripMeta(v) : v;
  }
  return out as unknown as T;
}


// -- JSONPath (the narrow dialect the critic is instructed to emit) ----------

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

// -- Parsing model output ----------------------------------------------------

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

// -- Deterministic splicer (double anchor) -----------------------------------

export interface SpliceResult {
  spliced: number;
  quote_drift: number;
  capped: boolean;
  cap_overflow: number;
  spliced_paths: string[];
  protected_rejected: ProtectedRejection[];
  rejected: { path: string; reason: string }[];
}

export function applySplicesWith(
  report: Record<string, unknown>,
  approved: CriticFinding[],
  cfg: RefinementConfig,
): SpliceResult {
  const res: SpliceResult = {
    spliced: 0,
    quote_drift: 0,
    capped: false,
    cap_overflow: 0,
    spliced_paths: [],
    protected_rejected: [],
    rejected: [],
  };
  for (const f of approved) {
    if (res.spliced >= MAX_SPLICES) {
      res.capped = true;
      res.cap_overflow++;
      res.rejected.push({ path: f.path, reason: "cap_reached" });
      continue;
    }
    try {
      const prot = protectedReasonFor(f.path, cfg);
      if (prot !== null) {
        res.protected_rejected.push({ path: f.path, leaf_key_or_rule: prot });
        res.rejected.push({ path: f.path, reason: "protected_surface" });
        continue;
      }
      const current = readPath(report, f.path);
      if (typeof current !== "string") {
        res.quote_drift++;
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
        res.quote_drift++;
        res.rejected.push({ path: f.path, reason: "empty_replacement" });
        continue;
      }
      if (!writePath(report, f.path, f.replacement)) {
        res.quote_drift++;
        res.rejected.push({ path: f.path, reason: "write_failed" });
        continue;
      }
      res.spliced++;
      res.spliced_paths.push(f.path);
    } catch (e) {
      res.quote_drift++;
      res.rejected.push({ path: f.path, reason: `splice_error:${(e as Error)?.message ?? "unknown"}` });
    }
  }
  return res;
}

// -- User-message builders ---------------------------------------------------

export function buildCriticUser(
  report: unknown,
  intake: unknown,
  coverageList?: string | null,
): string {
  const parts = [
    "INTAKE RECORD:",
    JSON.stringify(intake ?? {}),
    "",
    "DOCUMENT:",
    // ITEM 379r2 (R1) — the critic never sees `_meta`.
    JSON.stringify(stripMeta(report ?? {})),
  ];
  if (typeof coverageList === "string" && coverageList.trim().length > 0) {
    parts.push("", coverageList);
  }
  return parts.join("\n");
}

/** ITEM 379 — is a material-omission finding anchored to a coverage entry? */
export function omissionIsAnchored(
  finding: CriticFinding,
  anchorTokens: readonly string[],
): boolean {
  if (anchorTokens.length === 0) return false;
  const hay = `${finding.anchor ?? ""} ${finding.path ?? ""} ${finding.quote ?? ""}`.toLowerCase();
  return anchorTokens.some((tok) => tok && hay.includes(String(tok).toLowerCase()));
}

/** Normalise a verifier reason sentence to the fixed reason vocabulary. */
export function classifyRejectReason(reason: string | undefined): string {
  const r = String(reason ?? "").toLowerCase();
  if (/necessit|equally good|no improvement|not better/.test(r)) return "necessity";
  if (/quote|not found at|drift/.test(r)) return "quote-not-found";
  if (/anchor|unreal|does not say/.test(r)) return "anchor-unreal";
  if (/new fact|absent from the intake|unsupported|invent/.test(r)) return "new-fact";
  if (/protected|disclaimer|placeholder|enum|determination/.test(r)) return "protected-surface";
  return "unspecified";
}

/** ITEM 379r2 (R3) — the node text supplied to the verifier, per proposal. */
export const VERIFIER_NODE_CONTENT_MAX = 4000;

export function buildVerifierUser(
  report: unknown,
  intake: unknown,
  findings: CriticFinding[],
): string {
  const clean = stripMeta(report ?? {});
  return [
    "INTAKE RECORD:",
    JSON.stringify(intake ?? {}),
    "",
    "DOCUMENT:",
    JSON.stringify(clean),
    "",
    "PROPOSED REVISIONS — `node_content` is the EXACT current text at the stated path, supplied so conditions (1) and (2) are checked against it rather than searched for:",
    JSON.stringify(findings.map((f) => {
      const node = readPath(clean, f.path);
      return {
        path: f.path,
        quote: f.quote,
        class: f.class,
        anchor: f.anchor,
        replacement: f.replacement,
        node_content: typeof node === "string"
          ? node.slice(0, VERIFIER_NODE_CONTENT_MAX)
          : null,
        quote_present_in_node: typeof node === "string" && !!f.quote && node.includes(f.quote),
      };
    })),
  ].join("\n");
}

// -- Orchestrator ------------------------------------------------------------

export interface RefinementDeps {
  /** CRITIC — Claude, one call. Returns raw text. */
  critic: (system: string, user: string) => Promise<string>;
  /** VERIFIER — GPT-4o, one call. Returns raw text. */
  verifier: (system: string, user: string) => Promise<string>;
}

export function emptyTelemetryFor(
  cfg: RefinementConfig,
  enabled: boolean,
  crashed: string | null = null,
): RefinementTelemetry {
  return {
    version: cfg.version,
    enabled,
    critic_findings: 0,
    structural_findings: 0,
    verifier_approved: 0,
    verifier_rejected: 0,
    spliced: 0,
    quote_drift: 0,
    protected_rejected: { count: 0, items: [] },
    cap_overflow: 0,
    capped: false,
    crashed,
    spliced_paths: [],
    findings_log: [],
    necessity_rejected: 0,
    verifier_reject_reasons: {},
    omission_findings: 0,
    omission_unanchored: 0,
    coverage_supplied: false,
  };
}

/**
 * FULL PROPOSAL ACCOUNTING. Every critic proposal ends in exactly one bucket:
 * spliced | verifier_rejected | protected_rejected | quote_drift |
 * cap_overflow | omission_unanchored (item379).
 * Any residue is attributed to quote_drift so the invariant always holds.
 */
export function balanceBuckets(tel: RefinementTelemetry): RefinementTelemetry {
  const accounted = tel.spliced + tel.verifier_rejected +
    tel.protected_rejected.count + tel.quote_drift + tel.cap_overflow +
    tel.omission_unanchored;
  const residue = tel.critic_findings - accounted;
  if (residue > 0) tel.quote_drift += residue;
  return tel;
}

export interface RefinementRunOptions {
  enabled?: boolean;
  /** ITEM 379 — the deterministic COVERAGE list handed to the critic. */
  coverageList?: string | null;
  /** ITEM 379 — the only permitted anchors for material-omission findings. */
  coverageAnchors?: readonly string[];
}

export async function runRefinement(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  deps: RefinementDeps,
  cfg: RefinementConfig,
  opts: RefinementRunOptions = {},
): Promise<RefinementTelemetry> {
  const enabled = opts.enabled !== false;
  if (!enabled) return emptyTelemetryFor(cfg, false);
  const coverageList = opts.coverageList ?? null;
  const coverageAnchors = opts.coverageAnchors ?? [];
  const coverageSupplied = typeof coverageList === "string" && coverageList.trim().length > 0;

  // 1. CRITIC — any failure skips refinement entirely.
  let findings: CriticFinding[] = [];
  let structural: StructuralFinding[] = [];
  let allFindings: CriticFinding[] = [];
  try {
    const raw = await deps.critic(
      cfg.criticSystemPrompt,
      buildCriticUser(report, intake, coverageList),
    );
    const parsed = asFindings(parseJsonLoose(raw));
    if (!parsed) {
      const t = emptyTelemetryFor(cfg, true, "critic_unparseable");
      t.coverage_supplied = coverageSupplied;
      return t;
    }
    allFindings = parsed.findings;
    findings = allFindings.slice(0, MAX_SPLICES);
    structural = parsed.structural;
  } catch (e) {
    const t = emptyTelemetryFor(
      cfg,
      true,
      `critic_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`,
    );
    t.coverage_supplied = coverageSupplied;
    return t;
  }

  const tel = emptyTelemetryFor(cfg, true);
  tel.coverage_supplied = coverageSupplied;
  tel.critic_findings = allFindings.length;
  tel.structural_findings = structural.length;
  tel.cap_overflow = allFindings.length - findings.length;
  if (tel.cap_overflow > 0) tel.capped = true;
  tel.findings_log = allFindings.map((f) => ({
    path: f.path,
    class: f.class,
    confidence: f.confidence,
    quote: (f.quote ?? "").slice(0, FINDINGS_LOG_QUOTE_MAX),
  }));
  tel.omission_findings = allFindings.filter((f) => f.class === "material-omission").length;

  // ITEM 379 §3 — an omission finding must cite a coverage entry. Enforced in
  // code, before the verifier ever sees it.
  const gated: CriticFinding[] = [];
  for (const f of findings) {
    if (f.class === "material-omission" && !omissionIsAnchored(f, coverageAnchors)) {
      tel.omission_unanchored++;
      continue;
    }
    gated.push(f);
  }
  findings = gated;
  if (findings.length === 0) return balanceBuckets(tel);

  // 2. VERIFIER — any failure means ZERO splices.
  let verdicts: Verdict[] = [];
  try {
    const raw = await deps.verifier(
      cfg.verifierSystemPrompt,
      buildVerifierUser(report, intake, findings),
    );
    const parsed = asVerdicts(parseJsonLoose(raw));
    if (!parsed) {
      tel.crashed = "verifier_unparseable";
      tel.verifier_rejected = findings.length;
      return balanceBuckets(tel);
    }
    verdicts = parsed;
  } catch (e) {
    tel.crashed = `verifier_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`;
    tel.verifier_rejected = findings.length;
    return balanceBuckets(tel);
  }

  const approvedPaths = new Set(
    verdicts.filter((v) => v.verdict === "approve").map((v) => v.path),
  );
  const approved = findings.filter((f) => approvedPaths.has(f.path));
  tel.verifier_approved = approved.length;
  tel.verifier_rejected = findings.length - approved.length;
  for (const v of verdicts) {
    if (v.verdict === "approve") continue;
    const reason = classifyRejectReason(v.reason);
    tel.verifier_reject_reasons[reason] = (tel.verifier_reject_reasons[reason] ?? 0) + 1;
    if (reason === "necessity") tel.necessity_rejected++;
  }
  if (approved.length === 0) return balanceBuckets(tel);

  // 3. DETERMINISTIC SPLICER.
  try {
    const s = applySplicesWith(report, approved, cfg);
    tel.spliced = s.spliced;
    tel.quote_drift = s.quote_drift;
    tel.capped = tel.capped || s.capped;
    tel.cap_overflow += s.cap_overflow;
    tel.spliced_paths = s.spliced_paths;
    tel.protected_rejected = { count: s.protected_rejected.length, items: s.protected_rejected };
  } catch (e) {
    tel.crashed = `splicer_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`;
  }
  return balanceBuckets(tel);
}
