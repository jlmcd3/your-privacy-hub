// ITEM 392 — ADMT REGISTER REPAIRS AT THE PROVEN SEAMS (AG-1 … AG-3).
//
// Ratified by the review panel under the CEO's delegation from the live render
// of quality_run_documents 562f1770-990e-4b4b-8f13-e7354dc6aa9b. Every defect
// below was verified on that document before this module was written.
//
//   AG-1 HEDGE LITANY — `adequacy_finding` repeated one sentence verbatim under
//        every element. The adequacy surface now states each element's own
//        conclusion once, and the unresolved elements are named ONCE in a
//        single open-items ledger sentence (the G-6 discipline). Honest
//        degradation is preserved: nothing is lost, only de-duplicated.
//   AG-2 INTERNAL VOCABULARY — machine enums reached the reader. The enums stay
//        where the renderers key on them; reader-facing label fields now carry
//        the words, and prose leaves no longer carry a raw enum token.
//   AG-3 SHAPE HYGIENE — empty strings and empty objects are never shipped.
//
// This module never edits determination outcomes, gate conditions, emit-gate or
// customer-message semantics, disclaimers, or any non-ADMT surface.

import { ADMT_PIPELINE_STAMP } from "../prose/plans/admt.spine.ts";

export const ADMT_PROSE_GOLD_VERSION = "admt-prose-gold@item392-2026-08-06";

// ─────────────────────────────────────────────────────────────────────────────
// AG-1 — HEDGE LITANY → PER-ELEMENT CONCLUSION + ONE LEDGER
// ─────────────────────────────────────────────────────────────────────────────

/** The hedge sentences that shipped repeated, as they land in prose leaves. */
export const HEDGE_LITANY_RES: readonly RegExp[] = [
  /the information provided does not resolve this question;[^\n]{0,200}?information needed\./i,
  /we could not verify this item from the information provided;[^\n]{0,200}?information needed\./i,
  /more information is needed before this item can be assessed\./i,
];

export function isHedgeLitany(s: unknown): boolean {
  const t = String(s ?? "");
  return HEDGE_LITANY_RES.some((re) => re.test(t));
}

/** Element → the question that element answers, and its ledger name. */
export const ADEQUACY_ELEMENTS: Record<string, { readonly label: string; readonly question: string }> = {
  logic_disclosure: {
    label: "the logic-disclosure element",
    question: "Whether the business can explain how the technology produced its output",
  },
  human_intervention: {
    label: "the human-involvement element",
    question: "Whether a human reviewer's involvement meets the three-part standard",
  },
};

export function elementMeta(key: string): { label: string; question: string } {
  const known = ADEQUACY_ELEMENTS[key];
  if (known) return { label: known.label, question: known.question };
  const plain = key.replace(/_/g, " ").trim();
  return {
    label: `the ${plain} element`,
    question: `Whether the record answers the ${plain} question`,
  };
}

/** Reader wording for adequacy conclusions. Machine enums are untouched. */
export const ADMT_CONCLUSION_LABELS: Record<string, string> = {
  adequate: "adequate",
  inadequate: "inadequate",
  qualifies: "qualifies",
  does_not_qualify: "does not qualify",
  insufficient_basis: "not established from the information supplied",
};

export function admtConclusionLabel(v: unknown): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  return ADMT_CONCLUSION_LABELS[raw] ?? raw.replace(/_/g, " ");
}

/** The conclusion values that leave an element open. */
const UNRESOLVED_CONCLUSIONS = new Set(["insufficient_basis"]);

/** ITEM 396 — the single predicate the ledger and the CSC both read. */
export function isUnresolvedConclusion(v: unknown): boolean {
  return UNRESOLVED_CONCLUSIONS.has(String(v ?? "").trim());
}

/**
 * ITEM 396 — the reader label an element carries once the CSC has established
 * it from the persisted record. The machine `conclusion` enum is NOT touched.
 */
export const ADMT_RECORD_BACKED_LABEL = "established on the record";

function joinList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** ITEM 396 — the ONE open-items ledger sentence (G-6). Single writer. */
export function buildOpenItemsLedger(unresolved: readonly string[]): string {
  if (unresolved.length === 0) return "";
  return (
    `Open items: ${joinList(unresolved)} ${unresolved.length === 1 ? "is" : "are"} unresolved; ` +
    `the intake details that would close ${unresolved.length === 1 ? "it" : "them"} are listed under what the record does not yet state.`
  );
}

/**
 * ITEM 396 — every absence-class phrasing this module can write to a reader
 * surface. The ADMT CSC detector MUST match each of these (linkage test
 * `item396 linkage every prose-gold absence phrasing is detected`), so a future
 * relabeling cannot escape false-absence detection.
 */
export const ADMT_ABSENCE_LABEL_PHRASINGS: readonly string[] = [
  ADMT_CONCLUSION_LABELS.insufficient_basis,
  ADMT_VERDICT_LABELS_PLACEHOLDER_GUARD,
  "Whether the business can explain how the technology produced its output is not established from the information supplied.",
  buildOpenItemsLedger(["the logic-disclosure element"]),
  buildOpenItemsLedger(["the logic-disclosure element", "the human-involvement element"]),
];

export interface HedgeLedgerResult {
  readonly rewritten: number;
  readonly unresolved: readonly string[];
  readonly ledger: string;
}

/**
 * AG-1. Rewrites every hedged `reason` under `adequacy_finding` into that
 * element's own one-sentence conclusion, and writes ONE ledger sentence naming
 * the unresolved elements. On a record that resolves every element there is no
 * ledger and no hedge.
 *
 * ITEM 396: an element the CSC has established from the record (`record_backed`)
 * never enters the ledger, however its machine enum reads.
 */
export function applyHedgeLedger(report: unknown): HedgeLedgerResult {
  const r = report as Record<string, unknown> | null;
  const af = r && typeof r === "object" ? (r.adequacy_finding as Record<string, unknown> | undefined) : undefined;
  if (!af || typeof af !== "object" || Array.isArray(af)) {
    return { rewritten: 0, unresolved: [], ledger: "" };
  }

  let rewritten = 0;
  const unresolved: string[] = [];

  for (const [key, value] of Object.entries(af)) {
    if (key === "open_items" || !value || typeof value !== "object" || Array.isArray(value)) continue;
    const el = value as Record<string, unknown>;
    const conclusion = String(el.conclusion ?? "").trim();
    const meta = elementMeta(key);
    const open = isUnresolvedConclusion(conclusion) && el.record_backed !== true;
    if (open) unresolved.push(meta.label);

    if (isHedgeLitany(el.reason)) {
      el.reason = `${meta.question} is ${admtConclusionLabel(conclusion) || "not established from the information supplied"}.`;
      rewritten++;
    }
  }

  const ledger = buildOpenItemsLedger(unresolved);
  if (ledger) {
    (af as Record<string, unknown>).open_items = ledger;
  } else if ("open_items" in af) {
    delete (af as Record<string, unknown>).open_items;
  }


  return { rewritten, unresolved, ledger };
}

// ─────────────────────────────────────────────────────────────────────────────
// AG-2 — INTERNAL VOCABULARY → CUSTOMER WORDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MACHINE-KEYED FIELDS — enums LEFT IN PLACE because renderers key on them:
 *   overall_status, <bucket>[].status, <bucket>[].enforcement_exposure,
 *   <bucket>[].insufficient_basis, adequacy_finding.<element>.conclusion,
 *   applicability_verdict.label, scope_analysis.determination_basis,
 *   scope_analysis.exception_qualifies.
 * Each gains a reader-facing sibling label; only the READER-facing renders
 * change.
 */
export const ADMT_MACHINE_KEYED_FIELDS: readonly string[] = [
  "overall_status",
  "notice_gaps[].status",
  "opt_out_gaps[].status",
  "access_gaps[].status",
  "documentation_to_maintain[].status",
  "top_3_actions[].insufficient_basis",
  "adequacy_finding.<element>.conclusion",
  "applicability_verdict.label",
  "scope_analysis.determination_basis",
  "scope_analysis.exception_qualifies",
];

export const ADMT_OVERALL_STATUS_LABELS: Record<string, string> = {
  compliant: "Compliant",
  gaps_identified: "Action required in some areas",
  significant_gaps: "Significant action required",
};

export const ADMT_ENTRY_STATUS_LABELS: Record<string, string> = {
  compliant: "Met",
  gap: "Action required",
  insufficient_basis: "More information needed",
  not_applicable: "Not applicable",
};

export const ADMT_VERDICT_LABELS: Record<string, string> = {
  in_scope: "in scope",
  out_of_scope: "out of scope",
  conservative_assumption: "in scope on a conservative reading",
  insufficient_basis: "not established from the information supplied",
};

const ENTRY_BUCKETS = [
  "notice_gaps",
  "opt_out_gaps",
  "access_gaps",
  "documentation_to_maintain",
  "priority_actions",
  "top_3_actions",
] as const;

/** Raw enum tokens must never appear inside reader prose. */
const PROSE_ENUM_SUBSTITUTIONS: readonly { readonly re: RegExp; readonly to: string }[] = [
  { re: /\binsufficient_basis\b/g, to: "not established from the information supplied" },
  { re: /\bgaps_identified\b/g, to: "action required in some areas" },
  { re: /\bsignificant_gaps\b/g, to: "significant action required" },
  { re: /\bdoes_not_qualify\b/g, to: "does not qualify" },
  { re: /\bconservative_assumption\b/g, to: "a conservative reading" },
];

const PROSE_LEAF_KEYS = new Set([
  "reason",
  "finding",
  "remediation",
  "summary",
  "basis",
  "recommendation",
  "explanation",
  "why",
  "action",
  "note",
  "notes",
  "statement",
  "description",
  "detail",
  "open_items",
]);

export interface CustomerRegisterResult {
  readonly labels_added: number;
  readonly prose_scrubbed: number;
}

/** AG-2. Adds reader-facing labels and scrubs raw enums out of prose leaves. */
export function applyCustomerRegister(report: unknown): CustomerRegisterResult {
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return { labels_added: 0, prose_scrubbed: 0 };

  let labels = 0;
  let scrubbed = 0;

  const overall = String(r.overall_status ?? "").trim();
  if (overall) {
    r.overall_status_label = ADMT_OVERALL_STATUS_LABELS[overall] ?? overall.replace(/_/g, " ");
    labels++;
  }

  for (const bucket of ENTRY_BUCKETS) {
    const arr = r[bucket];
    if (!Array.isArray(arr)) continue;
    for (const entry of arr) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const st = String(e.status ?? "").trim();
      if (st) {
        e.status_label = ADMT_ENTRY_STATUS_LABELS[st] ?? st.replace(/_/g, " ");
        labels++;
      }
    }
  }

  const af = r.adequacy_finding as Record<string, unknown> | undefined;
  if (af && typeof af === "object" && !Array.isArray(af)) {
    for (const [key, value] of Object.entries(af)) {
      if (key === "open_items" || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const el = value as Record<string, unknown>;
      const c = String(el.conclusion ?? "").trim();
      if (c) {
        el.conclusion_label = admtConclusionLabel(c);
        labels++;
      }
    }
  }

  const av = r.applicability_verdict as Record<string, unknown> | undefined;
  if (av && typeof av === "object" && !Array.isArray(av)) {
    const l = String(av.label ?? "").trim();
    if (l) {
      av.label_display = ADMT_VERDICT_LABELS[l] ?? l.replace(/_/g, " ");
      labels++;
    }
  }

  // Prose scrub — reader-facing leaves only.
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "_meta" || k.startsWith("_")) continue;
      if (typeof v === "string") {
        if (!PROSE_LEAF_KEYS.has(k)) continue;
        let next = v;
        for (const sub of PROSE_ENUM_SUBSTITUTIONS) next = next.replace(sub.re, sub.to);
        if (next !== v) {
          (node as Record<string, unknown>)[k] = next;
          scrubbed++;
        }
      } else {
        walk(v);
      }
    }
  };
  for (const [k, v] of Object.entries(r)) {
    if (k === "_meta") continue;
    walk(v);
  }

  return { labels_added: labels, prose_scrubbed: scrubbed };
}

// ─────────────────────────────────────────────────────────────────────────────
// AG-3 — SHAPE HYGIENE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keys that are never pruned even when empty: determination machinery and the
 * flags renderers branch on. Everything else must carry substance or go.
 */
export const SHAPE_PROTECTED_KEYS: readonly string[] = [
  "decision",
  "rule_ids",
  "conclusion",
  "status",
  "label",
  "verdict",
  "applicable",
  "required",
  "is_admt",
  "insufficient_basis",
  "information_needed",
  "schema_version",
  "disclaimer",
  "framework_disclaimer",
];

function isHollow(v: unknown): boolean {
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
  return false;
}

export interface ShapeHygieneResult {
  readonly fields_omitted: number;
  readonly entries_dropped: number;
  readonly paths: readonly string[];
}

/** AG-3. Omits hollow fields and drops hollow entries from customer arrays. */
export function applyShapeHygiene(report: unknown): ShapeHygieneResult {
  const r = report as Record<string, unknown> | null;
  if (!r || typeof r !== "object") return { fields_omitted: 0, entries_dropped: 0, paths: [] };

  let omitted = 0;
  let dropped = 0;
  const paths: string[] = [];
  const protectedKeys = new Set(SHAPE_PROTECTED_KEYS);

  const prune = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        prune(node[i], `${path}[${i}]`);
        const item = node[i];
        if (item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) {
          node.splice(i, 1);
          dropped++;
          if (paths.length < 40) paths.push(`${path}[${i}]`);
        }
      }
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_meta" || k.startsWith("_")) continue;
      const child = `${path}.${k}`;
      if (v && typeof v === "object") prune(v, child);
      if (protectedKeys.has(k)) continue;
      if (isHollow(obj[k])) {
        delete obj[k];
        omitted++;
        if (paths.length < 40) paths.push(child);
      }
    }
  };

  for (const [k, v] of Object.entries(r)) {
    if (k === "_meta" || k.startsWith("_")) continue;
    if (v && typeof v === "object") prune(v, k);
  }

  return { fields_omitted: omitted, entries_dropped: dropped, paths };
}

// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export interface AdmtProseGoldTelemetry {
  readonly version: string;
  readonly stamp: string;
  readonly hedges_rewritten: number;
  readonly ledger_written: boolean;
  readonly unresolved_elements: readonly string[];
  readonly labels_added: number;
  readonly prose_scrubbed: number;
  readonly fields_omitted: number;
  readonly entries_dropped: number;
  readonly paths: readonly string[];
}

/**
 * The single ADMT prose-gold pass. Runs at the finalize seam, after every
 * content-shaping pass and before the emit gate, so the surfaces it repairs are
 * the surfaces that ship. Writes the pipeline stamp into `_meta.internal`.
 */
export function applyAdmtProseGold(report: unknown): AdmtProseGoldTelemetry {
  const hedge = applyHedgeLedger(report);
  const register = applyCustomerRegister(report);
  const shape = applyShapeHygiene(report);

  const r = report as Record<string, unknown>;
  if (r && typeof r === "object") {
    const meta = (r._meta = (r._meta && typeof r._meta === "object" ? r._meta : {}) as Record<string, unknown>);
    const internal = (meta.internal = (meta.internal && typeof meta.internal === "object"
      ? meta.internal
      : {}) as Record<string, unknown>);
    internal.admt_pipeline_stamp = ADMT_PIPELINE_STAMP;
    internal.admt_prose_gold = ADMT_PROSE_GOLD_VERSION;
  }

  return {
    version: ADMT_PROSE_GOLD_VERSION,
    stamp: ADMT_PIPELINE_STAMP,
    hedges_rewritten: hedge.rewritten,
    ledger_written: hedge.ledger.length > 0,
    unresolved_elements: hedge.unresolved,
    labels_added: register.labels_added,
    prose_scrubbed: register.prose_scrubbed,
    fields_omitted: shape.fields_omitted,
    entries_dropped: shape.entries_dropped,
    paths: shape.paths,
  };
}
