// ITEM 347 (DOCUMENT-PLAN REWORK) — THE ENGINE'S REASONING GRAPH.
//
// CEO ruling (CONNECTIVE-EDGE RULE, hard): a connective may be emitted ONLY
// when the engine's reasoning graph carries an explicit COMPUTED edge between
// the two joined statements. No edge → plain juxtaposition, no connective.
//
// The rejected Item 339 render said "risk level Moderate, because sector is
// Believed-basis Pilot" — a causal relation the engine never computed. The
// defect was that the renderer chose a connective from a field-name heuristic
// (`relationFor(key, index)`), not from the engine's own reasoning. This module
// removes the heuristic: relations are now DATA the engine emits, and the
// renderer may only speak a relation that is present here.
//
// An edge is only ever created next to the engine structure that computed it,
// and it records that structure in `basis` so a reviewer can trace the claim.

import type { Relation } from "./connectives.ts";

export const REASONING_GRAPH_VERSION = "prose-graph-2026-08-01-item347";

/** The lead statement of a section (its determination) as an edge endpoint. */
export const LEAD_NODE = "$lead";

/** Relations an edge may carry. `none` is the absence of an edge, not an edge. */
export type EdgeKind = Exclude<Relation, "none">;

export interface ReasoningEdge {
  /** Node id the relation runs FROM (a statement id, or `$lead`). */
  readonly from: string;
  /** Node id the relation runs TO. */
  readonly to: string;
  readonly kind: EdgeKind;
  /**
   * The engine structure that computed this relation — e.g.
   * `necessity_analysis[0].verdict` or `consequence.decision`. Free text is not
   * permitted: this must name a path in the engine's output.
   */
  readonly basis: string;
}

const key = (from: string, to: string, kind: EdgeKind) => `${from}\u0000${to}\u0000${kind}`;

export class ReasoningGraph {
  readonly #index = new Map<string, ReasoningEdge>();
  readonly #edges: ReasoningEdge[] = [];

  constructor(edges: readonly ReasoningEdge[] = []) {
    for (const e of edges) this.add(e);
  }

  add(edge: ReasoningEdge): this {
    if (!edge.basis?.trim()) {
      throw new Error(
        `reasoning edge ${edge.from}->${edge.to} (${edge.kind}) has no engine basis; ` +
          "an edge without a computed basis is exactly the fabrication this rule bans",
      );
    }
    const k = key(edge.from, edge.to, edge.kind);
    if (!this.#index.has(k)) {
      this.#index.set(k, edge);
      this.#edges.push(edge);
    }
    return this;
  }

  has(from: string, to: string, kind: Relation): boolean {
    if (kind === "none") return false;
    return this.#index.has(key(from, to, kind as EdgeKind));
  }

  get(from: string, to: string, kind: Relation): ReasoningEdge | null {
    if (kind === "none") return null;
    return this.#index.get(key(from, to, kind as EdgeKind)) ?? null;
  }

  get edges(): readonly ReasoningEdge[] {
    return this.#edges;
  }

  get size(): number {
    return this.#edges.length;
  }
}

export function edge(from: string, to: string, kind: EdgeKind, basis: string): ReasoningEdge {
  return { from, to, kind, basis };
}

// ---------------------------------------------------------------------------
// CONNECTIVE AUDIT
// ---------------------------------------------------------------------------
//
// Enumerates every connective actually present in a rendered section, in the
// two join shapes the renderer can produce, and reports any that the render's
// own licence ledger does not account for. This is the mechanical form of the
// CEO's test: "enumerate every emitted connective in a render and assert each
// maps to a real edge".

import { CONNECTIVES } from "./connectives.ts";

const ALL_WORDS: readonly string[] = Object.values(CONNECTIVES).flat();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALT = ALL_WORDS.slice().sort((a, b) => b.length - a.length).map(escapeRe).join("|");

/** Subordinated join: "…, because …". */
const SUBORDINATED = new RegExp(`,\\s(${ALT})\\s`, "gi");
/** New-sentence join: ". However, …" (also at the very start of the text). */
const SENTENCE_INITIAL = new RegExp(`(?:^|[.;]\\s)(${ALT}),\\s`, "gi");

export interface EmittedConnective {
  readonly word: string;
  readonly index: number;
}

export function enumerateConnectives(text: string): EmittedConnective[] {
  const out: EmittedConnective[] = [];
  for (const re of [SUBORDINATED, SENTENCE_INITIAL]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ word: m[1].toLowerCase(), index: m.index + m[0].indexOf(m[1]) });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

/** One connective the renderer emitted, with the edge that licensed it. */
export interface ConnectiveUse {
  readonly word: string;
  readonly relation: Relation;
  readonly from: string;
  readonly to: string;
  readonly basis: string;
}

export interface ConnectiveAuditFinding {
  readonly word: string;
  readonly index: number;
  readonly reason: "no_licensing_edge";
}

export interface ConnectiveAudit {
  readonly emitted: readonly EmittedConnective[];
  readonly licensed: readonly ConnectiveUse[];
  readonly findings: readonly ConnectiveAuditFinding[];
  readonly ok: boolean;
}

/**
 * Every connective present in `text` must be accounted for by a licence in
 * `licensed` (which the renderer only issues against a real graph edge).
 * Multiplicity is respected: three "however"s need three licences.
 */
export function auditConnectives(
  text: string,
  licensed: readonly ConnectiveUse[],
): ConnectiveAudit {
  const emitted = enumerateConnectives(text);
  const budget = new Map<string, number>();
  for (const l of licensed) budget.set(l.word, (budget.get(l.word) ?? 0) + 1);

  const findings: ConnectiveAuditFinding[] = [];
  for (const e of emitted) {
    const left = budget.get(e.word) ?? 0;
    if (left <= 0) {
      findings.push({ word: e.word, index: e.index, reason: "no_licensing_edge" });
    } else {
      budget.set(e.word, left - 1);
    }
  }
  return { emitted, licensed, findings, ok: findings.length === 0 };
}
