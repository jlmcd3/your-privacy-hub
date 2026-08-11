/**
 * FACT POINTERS — deterministic verification that a model-asserted pointer
 * back into the intake actually resolves.
 *
 * PROPOSAL 2026-08-11 §Governance(2) / §LIA. Two tools already ask the model
 * to attach a pointer to every claim it makes:
 *
 *   • LIA  — `balancing_assessment.factor_analysis[].intake_evidence[]`
 *            ({ field, value }) behind each balancing factor.
 *   • Governance — `regulatory_basis_v2[].engaged_because` (the named intake
 *            fact that engages the cited provision).
 *
 * Nothing verified those pointers, so a citation or a weighed impact could be
 * attached to a fact the record does not contain — the "citation is real but
 * attached to the wrong claim" defect class. These checks are deterministic,
 * make no model call, and fail open: a pointer that cannot be resolved is
 * removed (LIA) or flagged (Governance) and counted in telemetry, never
 * silently trusted.
 */

export interface PointerTelemetry {
  checked: number;
  unresolved: number;
  removed: number;
  examples: string[];
}

const emptyTelemetry = (): PointerTelemetry => ({ checked: 0, unresolved: 0, removed: 0, examples: [] });

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "under", "their", "there",
  "which", "where", "when", "have", "has", "been", "were", "was", "are", "not", "any",
  "all", "its", "it's", "record", "records", "intake", "data", "personal", "processing",
  "controller", "assessment", "information", "field", "fields", "value", "values",
  "provision", "article", "section", "gdpr", "state", "states", "company", "organisation",
  "organization", "because", "engaged", "engages", "named", "fact", "facts",
]);

/** Content tokens of the whole intake — words (>3 chars) and any number. */
export function intakeTokenIndex(intake: unknown): Set<string> {
  let text = "";
  try { text = JSON.stringify(intake ?? {}); } catch { text = ""; }
  const out = new Set<string>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z'’-]{2,}|\d[\d.,%]*/g) ?? []) {
    const tok = raw.replace(/[.,]+$/, "");
    if (tok.length < 3) continue;
    if (STOPWORDS.has(tok)) continue;
    out.add(tok);
  }
  return out;
}

/** Dotted-path lookup, tolerant of snake/camel and of `a.b[0].c`. */
export function resolveIntakeField(intake: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = String(path).replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let node: unknown = intake;
  for (const part of parts) {
    if (node === null || node === undefined) return undefined;
    if (Array.isArray(node)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) return undefined;
      node = node[idx];
      continue;
    }
    if (typeof node !== "object") return undefined;
    const bag = node as Record<string, unknown>;
    if (part in bag) { node = bag[part]; continue; }
    const lower = part.toLowerCase().replace(/[_\s-]/g, "");
    const key = Object.keys(bag).find((k) => k.toLowerCase().replace(/[_\s-]/g, "") === lower);
    if (key === undefined) return undefined;
    node = bag[key];
  }
  return node;
}

/**
 * A free-text pointer ("the GBP 96,400 stock cost recorded at intake") resolves
 * when at least `minMatches` of its content tokens appear somewhere in the
 * intake. Deliberately generous: the goal is to catch a pointer to a fact the
 * record nowhere contains, not to police wording.
 */
export function pointerResolves(pointer: string, index: Set<string>, minMatches = 2): boolean {
  const toks = (String(pointer ?? "").toLowerCase().match(/[a-z][a-z'’-]{2,}|\d[\d.,%]*/g) ?? [])
    .map((t) => t.replace(/[.,]+$/, ""))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  if (toks.length === 0) return false;
  let hits = 0;
  for (const t of new Set(toks)) if (index.has(t)) hits++;
  return hits >= Math.min(minMatches, toks.length);
}

const CANONICAL_ABSENCE = (factor: string) =>
  `The record supplied to this assessment does not present a documented fact bearing on ${factor}; ` +
  `document the supporting facts in the balancing record.`;

/**
 * LIA — every `intake_evidence` entry must name an intake field that exists and
 * whose value is recognisably what the entry quotes. Unresolvable entries are
 * dropped; a factor left with no evidence gets the canonical absence notice
 * (the same convention the prompt defines) rather than an unsupported claim.
 */
export function verifyLiaIntakeEvidence(
  report: Record<string, unknown> | null | undefined,
  intake: unknown,
): PointerTelemetry {
  const t = emptyTelemetry();
  const balancing = (report as any)?.balancing_assessment;
  const factors = balancing?.factor_analysis;
  if (!Array.isArray(factors)) return t;
  const index = intakeTokenIndex(intake);

  for (const factor of factors) {
    if (!factor || typeof factor !== "object") continue;
    const f = factor as Record<string, unknown>;
    const evidence = f.intake_evidence;
    if (!Array.isArray(evidence)) continue;
    const kept: unknown[] = [];
    for (const entry of evidence) {
      t.checked++;
      const e = (entry ?? {}) as Record<string, unknown>;
      const field = String(e.field ?? "").trim();
      const value = String(e.value ?? "").trim();
      const resolvedField = field ? resolveIntakeField(intake, field) : undefined;
      const fieldOk = resolvedField !== undefined && resolvedField !== null && String(resolvedField).trim() !== "";
      const valueOk = value ? pointerResolves(value, index) : false;
      if (fieldOk || valueOk) { kept.push(entry); continue; }
      t.unresolved++;
      t.removed++;
      if (t.examples.length < 5) t.examples.push(`${field || "(no field)"}: ${value.slice(0, 60)}`);
    }
    if (kept.length !== evidence.length) {
      f.intake_evidence = kept;
      if (kept.length === 0 && !String(f.evidence_absence ?? "").trim()) {
        f.evidence_absence = CANONICAL_ABSENCE(String(f.factor ?? "this factor").replace(/_/g, " "));
      }
    }
  }
  return t;
}

/**
 * Governance — every `regulatory_basis_v2[].engaged_because` must name a fact
 * the intake actually contains. An entry whose pointer does not resolve is
 * marked `pointer_verified: false` and its `engaged_because` is replaced with
 * an honest statement, so a real citation can no longer ride an invented
 * engagement fact into the report.
 */
export function verifyGovernanceBasisPointers(
  report: Record<string, unknown> | null | undefined,
  intake: unknown,
): PointerTelemetry {
  const t = emptyTelemetry();
  if (!report || typeof report !== "object") return t;
  const index = intakeTokenIndex(intake);

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { for (const n of node) walk(n); return; }
    if (!node || typeof node !== "object") return;
    const bag = node as Record<string, unknown>;
    const basis = bag.regulatory_basis_v2;
    if (Array.isArray(basis)) {
      for (const rawEntry of basis) {
        if (!rawEntry || typeof rawEntry !== "object") continue;
        const entry = rawEntry as Record<string, unknown>;
        const pointer = String(entry.engaged_because ?? "").trim();
        t.checked++;
        if (pointer && pointerResolves(pointer, index)) { entry.pointer_verified = true; continue; }
        t.unresolved++;
        entry.pointer_verified = false;
        entry.engaged_because =
          "The record as documented does not name the fact that would engage this provision; " +
          "confirm the engaging fact before relying on this citation.";
        if (t.examples.length < 5) {
          t.examples.push(`${String(entry.citation ?? "(no citation)")}: ${pointer.slice(0, 60)}`);
        }
      }
    }
    for (const [k, v] of Object.entries(bag)) {
      if (k === "_meta" || k === "_staging" || k === "regulatory_basis_v2") continue;
      walk(v);
    }
  };
  walk(report);
  return t;
}

/**
 * CPPA-CYBER — fabricated numeric maturity scores.
 *
 * PROPOSAL 2026-08-11: the intake's per-control `maturity` field carries
 * QUALITATIVE labels only; there is no 0–100 scale in the record. The prompt
 * bans invented numbers (SO-FT2 FIX 6) but nothing verified the output. This
 * scans the customer-facing prose fields for numeric score claims and reports
 * them; the structured `controls[].score` band value is not prose and is not
 * examined.
 */
export interface NumericScoreFinding { path: string; quote: string }

const PROSE_FIELDS = ["finding", "evidence", "differentiator", "remediation"];
const NUMERIC_SCORE_RE =
  /\b(?:scores?|scored|rated|rating|maturity)\b[^.\n]{0,40}?\b(\d{1,3})\s*(?:\/\s*100|out of 100|%)?\b/gi;

export function detectFabricatedNumericScores(
  report: Record<string, unknown> | null | undefined,
): NumericScoreFinding[] {
  const out: NumericScoreFinding[] = [];
  const scan = (path: string, text: unknown) => {
    const s = String(text ?? "");
    if (!s) return;
    const re = new RegExp(NUMERIC_SCORE_RE.source, NUMERIC_SCORE_RE.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const n = Number(m[1]);
      if (!Number.isFinite(n) || n < 0 || n > 100) continue;
      // A count sentence ("3 controls rated Implemented") is not a score claim.
      if (/\bcontrols?\b|\bcomponents?\b/i.test(m[0])) continue;
      out.push({ path, quote: m[0].trim().slice(0, 120) });
      if (out.length >= 25) return;
    }
  };
  if (!report || typeof report !== "object") return out;
  scan("executive_summary", (report as any).executive_summary);
  const controls = (report as any).controls;
  if (Array.isArray(controls)) {
    controls.forEach((c: any, i: number) => {
      if (!c || typeof c !== "object") return;
      for (const f of PROSE_FIELDS) scan(`controls[${i}].${f}`, c[f]);
    });
  }
  return out;
}
