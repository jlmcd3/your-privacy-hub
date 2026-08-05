// ITEM 379 — DELIVERABLE 2: BIDIRECTIONAL COVERAGE MATRIX (DPIA + CPPA RISK).
//
// DETERMINISTIC, NO MODEL, FLAG-ONLY (v1). The matrix walks the assembled
// document against the intake and asserts that the LINKS the product's
// structure promises actually exist IN BOTH DIRECTIONS. It never repairs, it
// never rewrites, it never blocks: it records what it found.
//
// LAWS
//   * DETERMINISTIC — pure function of (report, intake). No I/O, no clock.
//   * FAIL-OPEN — any error yields `crashed:true` telemetry and nothing else.
//   * CONSERVATIVE — a link is an orphan only when NOTHING in the document
//     evidences it. Silence in the record is never an orphan.
//
// Telemetry rides `_meta.internal.<product>_coverage`.

import {
  categorizeAsk,
  categoryAnsweredByRecord,
} from "../prose/ask-categories.ts";
import { dpiaFrameworkContract } from "../intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../intake-contracts/cppa-risk-assessment.ts";
import { assessBenefitClaim, intakeAnchorText } from "./risk-csc.ts";

export const COVERAGE_MATRIX_VERSION = "coverage-2026-08-05-item379";

export type CoverageProduct = "dpia" | "cppa-risk";

export interface CoverageOrphan {
  /** Stable machine id for the broken link. */
  type: string;
  /** Dotted/indexed document path of the node that owns the broken link. */
  path: string;
  /** One short human sentence naming what is missing. */
  detail: string;
}

export interface CoverageTelemetry {
  version: string;
  product: CoverageProduct;
  orphans: CoverageOrphan[];
  unused_intake_facts: string[];
  counts: {
    orphans: number;
    unused_intake_facts: number;
    links_checked: number;
  };
  crashed: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const STOP = new Set([
  "processing", "personal", "information", "assessment", "controller",
  "processor", "individual", "individuals", "organisation", "organization",
  "requirement", "requirements", "document", "documented", "recorded",
  "record", "records", "measures", "measure", "further", "because",
  "regulation", "article", "section", "california", "consumer", "consumers",
  "business", "however", "therefore", "provided", "including",
]);

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(text).join(" ");
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return "";
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ");
}

function contentWords(s: string, min = 7): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= min && !STOP.has(w));
}

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return String(v).trim().length > 0;
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Record<string, unknown>[] : [];
}

function getPath(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const seg of String(path).split(".")) {
    if (!seg) continue;
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** Do the two strings share at least one distinctive content word? */
function overlaps(a: string, b: string, min = 6): boolean {
  const wa = new Set(contentWords(a, min));
  if (wa.size === 0) return false;
  for (const w of contentWords(b, min)) if (wa.has(w)) return true;
  return false;
}

/** The whole customer-facing document as one lowercase blob. */
function documentText(report: Record<string, unknown>): string {
  const parts: string[] = [];
  const walk = (v: unknown, key?: string): void => {
    if (key === "_meta" || key === "_staging" || key === "_revision") return;
    if (typeof v === "string") { parts.push(v); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, k);
    }
  };
  walk(report);
  return norm(parts.join(" \n "));
}

/**
 * Narrative intake fields (contract `kind: "narrative"`, scalar keys only)
 * that the record fills but the document reflects nowhere. Conservative:
 * a fact counts as reflected when ANY distinctive content word of its value
 * appears in the document.
 */
function unusedNarrativeFacts(
  fields: readonly { key: string; kind: string }[],
  intake: Record<string, unknown>,
  docText: string,
  restrictTo?: (key: string) => boolean,
): string[] {
  const out: string[] = [];
  for (const f of fields) {
    if (f.kind !== "narrative" || f.key.includes("[]")) continue;
    if (restrictTo && !restrictTo(f.key)) continue;
    const v = intake[f.key];
    if (typeof v !== "string" || v.trim().length < 12) continue;
    const words = contentWords(v);
    if (words.length === 0) continue;
    if (!words.some((w) => docText.includes(w))) out.push(f.key);
  }
  return out;
}

// ---------------------------------------------------------------------------
// DPIA
// ---------------------------------------------------------------------------

const ARTICLE_RE = /(?:art(?:icle|\.)?)[\s_]*([0-9]{1,2}(?:\([0-9a-z]+\))*)/i;

/**
 * ITEM 379r2 (R2) — the neutral scaffold the renderer writes when the record
 * is silent. It is prose, not a determinate claim, and must not be read as one.
 */
const ABSENCE_FRAME_RE =
  /(record is silent|remains open|information needed|open questions|not established|is absent|unresolved|no part of the material|left where it stands|carried forward|remains unanswered|this unresolved|nothing supplied|no supporting entry)/i;

/** A next-step directive rather than a request for a fact the record holds. */
const CONFIRMATION_ASK_RE =
  /\b(confirm|confirming|verify|verifying|validate|re-?check|cross-?check|document (?:the|a|and|whether)|documenting|record (?:the|and|that)|identify the specific|review (?:the|and)|reviewing|assess whether|obtain and record|ensure)\b/i;

/** Placeholder scaffolding that carries no drafted content. */
const PLACEHOLDER_PREFIX_RE =
  /(\[?\s*to be (?:completed|assessed|confirmed|determined)[^\]:]*\]?\s*:?\s*)|(\btbc\b\s*:?\s*)|(^[—–-]\s*)/gi;

const ASK_TEXT_KEYS = ["dimensions", "question", "ask", "note", "detail", "enables", "provision"];

function askText(ask: unknown): string {
  if (typeof ask === "string") return ask;
  if (!ask || typeof ask !== "object") return "";
  const o = ask as Record<string, unknown>;
  return ASK_TEXT_KEYS.map((k) => text(o[k])).join(" ").trim();
}

function isConfirmationAsk(ask: unknown): boolean {
  return CONFIRMATION_ASK_RE.test(askText(ask));
}

/** Read `a.b[2].c` against the document. */
function getDocNode(root: unknown, field: string): unknown {
  let cur: unknown = root;
  for (const raw of String(field).replace(/^\$\.?/, "").split(".")) {
    if (!raw) continue;
    const m = /^([^[\]]+)((?:\[\d+\])*)$/.exec(raw);
    if (!m) return undefined;
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[m[1]];
    for (const idx of m[2].match(/\d+/g) ?? []) {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[Number(idx)];
    }
  }
  return cur;
}

/**
 * Is the ask bound to a document node that is already substantively drafted?
 * Such an ask refines drafted text; it is not an unanswered-fact orphan.
 */
function askTargetSubstantive(report: Record<string, unknown>, ask: unknown): boolean {
  if (!ask || typeof ask !== "object") return false;
  const field = String((ask as Record<string, unknown>).field ?? "").trim();
  if (!field) return false;
  const node = getDocNode(report, field);
  if (node == null) return false;
  const body = text(node).replace(PLACEHOLDER_PREFIX_RE, "").trim();
  return body.length >= 40;
}


function dpiaCoverage(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  t: CoverageTelemetry,
): void {
  const docText = documentText(report);

  // D1 — every ENGAGED authority has an analysis surface.
  const map = (report.engagement_map ?? {}) as Record<string, unknown>;
  const entries = arr(map.entries);
  entries.forEach((e, i) => {
    if (String(e.status ?? "") !== "engaged") return;
    t.counts.links_checked++;
    const ref = String(e.section_ref ?? "").trim();
    if (ref) {
      if (nonEmpty(getPath(report, ref.replace(/^\$\.?/, "")))) return;
    }
    const label = `${String(e.rule_id ?? "")} ${String(e.name ?? "")}`;
    const m = ARTICLE_RE.exec(label);
    if (m) {
      const num = m[1].replace(/\(.*$/, "");
      if (new RegExp(`art(?:icle|\\.)\\s*${num}\\b`, "i").test(docText)) return;
    } else if (!ref) {
      return; // nothing determinate to test — never guess an orphan
    }
    t.orphans.push({
      type: "engaged_authority_without_analysis",
      path: `engagement_map.entries[${i}]`,
      detail: `${String(e.name ?? e.rule_id ?? "engaged rule")} is engaged but no analysis surface in the document carries it.`,
    });
  });

  // D2/D3 — risk register ↔ mitigating measures, both directions.
  const register = arr(report.risk_register);
  const s4 = (report.section_4_risk_management ?? {}) as Record<string, unknown>;
  const measures = arr(s4.additional_mitigating_measures);
  const inherent = arr(s4.inherent_risk_assessment);

  register.forEach((r, i) => {
    t.counts.links_checked++;
    if (Array.isArray(r.measures) && r.measures.filter((m) => nonEmpty(m)).length > 0) return;
    const label = `${text(r.risk_label)} ${text(r.source)}`;
    if (measures.some((m) => overlaps(label, text(m.mitigated_risks) + " " + text(m.measure)))) return;
    t.orphans.push({
      type: "risk_without_measure",
      path: `risk_register[${i}]`,
      detail: `${text(r.risk_label) || text(r.risk_id) || "this risk"} is registered but no mitigating measure references it.`,
    });
  });

  // ITEM 379r2 (R2) — the full risk corpus the document enumerates, used as a
  // fallback when a measure states no determinate `mitigated_risks` claim
  // (the neutral scaffold "the record is silent here…" is NOT a claim).
  const riskCorpus = [
    ...register.map((r) => text(r)),
    ...inherent.map((r) => text(r)),
    ...arr(s4.residual_risk_assessment).map((r) => text(r)),
  ].join(" \n ");

  measures.forEach((m, i) => {
    t.counts.links_checked++;
    const claim = text(m.mitigated_risks);
    const determinate = claim.trim().length > 0 && !ABSENCE_FRAME_RE.test(claim);
    if (determinate) {
      const hit = register.some((r) => overlaps(claim, text(r.risk_label) + " " + text(r.source))) ||
        inherent.some((r) => overlaps(claim, text(r.risk)));
      if (hit) return;
    }
    // Fallback: does the measure itself name a risk the assessment enumerates?
    if (overlaps(text(m.measure) + " " + text(m.detail) + " " + text(m.rationale), riskCorpus)) return;
    t.orphans.push({
      type: "measure_without_risk",
      path: `section_4_risk_management.additional_mitigating_measures[${i}]`,
      detail: determinate
        ? `the measure "${text(m.measure).slice(0, 80)}" mitigates no risk enumerated in the assessment.`
        : `the measure "${text(m.measure).slice(0, 80)}" names no risk it mitigates.`,
    });
  });

  // D4 — asks raised against facts the record in fact supplies.
  const asks = Array.isArray(report.information_needed) ? report.information_needed : [];
  asks.forEach((ask, i) => {
    t.counts.links_checked++;
    // ITEM 379r2 (R2): a confirmation/verification directive is a next step,
    // not a request for a fact the record already holds; and an ask bound to a
    // document node that is already substantively drafted is not an orphan.
    if (isConfirmationAsk(ask)) return;
    if (askTargetSubstantive(report, ask)) return;
    const cat = categorizeAsk(ask);
    if (!categoryAnsweredByRecord(cat.id, intake)) return;
    t.orphans.push({
      type: "ask_against_supplied_fact",
      path: `information_needed[${i}]`,
      detail: `the ask covering ${cat.label} is raised although the record supplies it.`,
    });
  });

  t.unused_intake_facts = unusedNarrativeFacts(
    dpiaFrameworkContract.fields as never,
    intake,
    docText,
  );
}

// ---------------------------------------------------------------------------
// CPPA RISK
// ---------------------------------------------------------------------------

const RISK_FACT_KEY_RE = /^(a4_|i[0-9])/;

function riskCoverage(
  report: Record<string, unknown>,
  intake: Record<string, unknown>,
  t: CoverageTelemetry,
): void {
  const docText = documentText(report);
  const anchor = intakeAnchorText(intake);

  const activities = arr(report.activity_analytics);
  activities.forEach((act, ai) => {
    const harms = arr(act.harm_causation);
    const safeguards = arr(act.safeguard_map);
    const base = `activity_analytics[${ai}]`;

    const safeguardHarmIds = new Set<string>();
    for (const s of safeguards) {
      if (typeof s.harm_id === "string") safeguardHarmIds.add(s.harm_id);
      if (Array.isArray(s.harm_ids)) {
        for (const h of s.harm_ids) if (typeof h === "string") safeguardHarmIds.add(h);
      }
    }
    const harmIds = new Set(
      harms.map((h) => String(h.harm_id ?? "")).filter((x) => x.length > 0),
    );

    // a5 → a6
    harms.forEach((h, hi) => {
      t.counts.links_checked++;
      const id = String(h.harm_id ?? "");
      if (id && safeguardHarmIds.has(id)) return;
      t.orphans.push({
        type: "harm_without_safeguard",
        path: `${base}.harm_causation[${hi}]`,
        detail: `the § 7152(a)(5) impact ${text(h.harm_pinpoint) || id} has no § 7152(a)(6) safeguard bound to it.`,
      });
    });

    // a6 → a5, and residual stated
    safeguards.forEach((s, si) => {
      t.counts.links_checked += 2;
      const ids = [
        ...(typeof s.harm_id === "string" ? [s.harm_id] : []),
        ...(Array.isArray(s.harm_ids) ? s.harm_ids.map(String) : []),
      ].filter((x) => x.length > 0);
      if (ids.length === 0 || !ids.some((x) => harmIds.has(x))) {
        t.orphans.push({
          type: "safeguard_without_harm",
          path: `${base}.safeguard_map[${si}]`,
          detail: `the safeguard "${text(s.safeguard).slice(0, 80)}" is bound to no identified § 7152(a)(5) impact.`,
        });
      }
      if (!nonEmpty(s.residual_statement)) {
        t.orphans.push({
          type: "safeguard_without_residual",
          path: `${base}.safeguard_map[${si}]`,
          detail: `the safeguard "${text(s.safeguard).slice(0, 80)}" states no residual exposure.`,
        });
      }
    });

    // benefits → intake anchor
    arr(act.benefits).forEach((b, bi) => {
      t.counts.links_checked++;
      const claim = `${text(b.benefit)} ${text(b.supporting_record_fact)}`;
      if (!claim.trim()) return;
      if (!assessBenefitClaim(claim, anchor).pureInvention) return;
      t.orphans.push({
        type: "benefit_without_intake_anchor",
        path: `${base}.benefits[${bi}]`,
        detail: `the § 7152(a)(4) benefit for ${text(b.beneficiary_class) || "this class"} has no anchor in the record.`,
      });
    });
  });

  // priority_actions → an identified deficiency elsewhere in the document
  const deficiencyText = [
    text(report.safeguard_gaps),
    text(report.adverse_effects),
    text(report.information_needed),
    ...activities.map((a) =>
      `${text(a.harm_causation)} ${text(a.safeguard_map)} ${text((a.consequence as Record<string, unknown>)?.modifications)}`
    ),
  ].join(" ");
  arr(report.priority_actions).forEach((p, i) => {
    t.counts.links_checked++;
    const claim = `${text(p.action)} ${text(p.finding)} ${text(p.rationale)} ${text(p.addresses_risk)} ${text(p.detail)}`;
    if (!claim.trim()) return;
    if (overlaps(claim, deficiencyText)) return;
    t.orphans.push({
      type: "action_without_deficiency",
      path: `priority_actions[${i}]`,
      detail: `priority action ${text(p.rank) || String(i + 1)} addresses no deficiency identified elsewhere in the document.`,
    });
  });

  // exception analysed → exceptions_intake entry
  const exIntake = (intake.exceptions_intake ?? {}) as Record<string, unknown>;
  const claimedKeys = Object.entries(exIntake)
    .filter(([, v]) =>
      (v && typeof v === "object" && (v as Record<string, unknown>).claimed) || v === true
    )
    .map(([k]) => k);
  arr(report.exception_analysis).forEach((e, i) => {
    t.counts.links_checked++;
    const label = `${text(e.exception)} ${text(e.name)} ${text(e.exception_id)}`;
    if (!label.trim()) return;
    if (claimedKeys.some((k) => overlaps(label, k.replace(/_/g, " "), 4) || norm(label).includes(norm(k.replace(/_/g, " "))))) {
      return;
    }
    if (claimedKeys.length === 0 && /not claimed|no exception|does not claim/i.test(text(e))) return;
    t.orphans.push({
      type: "exception_without_record_entry",
      path: `exception_analysis[${i}]`,
      detail: `the exception "${label.trim().slice(0, 80)}" is analysed although the record claims no such exception.`,
    });
  });

  t.unused_intake_facts = unusedNarrativeFacts(
    cppaRiskContract.fields as never,
    intake,
    docText,
    (k) => RISK_FACT_KEY_RE.test(k),
  );
}

// ---------------------------------------------------------------------------
// the pass
// ---------------------------------------------------------------------------

export function runCoverageMatrix(
  product: CoverageProduct,
  report: Record<string, unknown> | null | undefined,
  intakeIn: unknown,
): CoverageTelemetry {
  const t: CoverageTelemetry = {
    version: COVERAGE_MATRIX_VERSION,
    product,
    orphans: [],
    unused_intake_facts: [],
    counts: { orphans: 0, unused_intake_facts: 0, links_checked: 0 },
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return t;
    const intake = (intakeIn && typeof intakeIn === "object" ? intakeIn : {}) as Record<string, unknown>;
    if (product === "dpia") dpiaCoverage(report, intake, t);
    else riskCoverage(report, intake, t);
  } catch (e) {
    t.crashed = true;
    t.error = (e as Error)?.message?.slice(0, 200) ?? "unknown";
  }
  t.counts.orphans = t.orphans.length;
  t.counts.unused_intake_facts = t.unused_intake_facts.length;
  return t;
}

/**
 * The COVERAGE list handed to the critic. Every line is an anchorable entry;
 * a `material-omission` finding must cite one of these verbatim tokens.
 */
export function coverageListForCritic(t: CoverageTelemetry | null | undefined): string {
  if (!t) return "COVERAGE: (not computed)";
  const lines: string[] = [];
  for (const o of t.orphans) lines.push(`ORPHAN ${o.type} @ ${o.path} — ${o.detail}`);
  for (const k of t.unused_intake_facts) lines.push(`UNUSED-INTAKE-FACT ${k}`);
  if (lines.length === 0) return "COVERAGE: none — every link resolves and every intake fact is reflected.";
  return `COVERAGE (deterministically computed; the ONLY permitted anchors for material-omission findings):\n${lines.join("\n")}`;
}

/** Tokens a material-omission finding's anchor must contain one of. */
export function coverageAnchorTokens(t: CoverageTelemetry | null | undefined): string[] {
  if (!t) return [];
  return [
    ...t.orphans.map((o) => o.path),
    ...t.orphans.map((o) => o.type),
    ...t.unused_intake_facts,
  ].filter((x) => typeof x === "string" && x.length > 0);
}

/** Attach coverage telemetry at `_meta.internal.<key>`; returns the telemetry. */
export function attachCoverage(
  report: Record<string, unknown>,
  key: string,
  t: CoverageTelemetry,
): CoverageTelemetry {
  try {
    const meta = ((report as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal[key] = t;
  } catch { /* non-fatal */ }
  return t;
}
