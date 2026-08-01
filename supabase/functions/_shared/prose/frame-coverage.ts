// ITEM 346 (FRAME LIBRARY REVISION) — CONTENT-COVERAGE CHECK.
//
// CEO ruling: "Analytic frames are NO LONGER permitted to flatten content:
// every determination, contradiction flag, and gap in the composer output must
// survive into the framed render."
//
// This module is the mechanical enforcement of that ruling. It reads ATOMS out
// of the composer's own output — never out of prose we wrote — and checks each
// one against the framed render. A dropped atom is a coverage failure, and a
// failing frame set may not ship.
//
// MATCHING IS CONSERVATIVE. An atom counts as covered only when the framed text
// carries it as a normalised substring (typography folded, whitespace
// collapsed), or, for a determination, when the pinned clause the engine chose
// for that determination is present. Anything uncertain counts as DROPPED.

export const FRAME_COVERAGE_VERSION = "prose-coverage-2026-08-01-item346";

export type CoverageAtomKind =
  | "determination"
  | "contradiction_flag"
  | "gap"
  | "citation"
  | "record_value";

export interface CoverageAtom {
  readonly kind: CoverageAtomKind;
  /** Where in the composer output this atom came from. */
  readonly path: string;
  /** The thing that must survive. */
  readonly value: string;
  /** For determinations: the pinned conclusion key whose clause also satisfies it. */
  readonly conclusion_key?: string;
}

export interface CoverageFinding {
  readonly atom: CoverageAtom;
  readonly reason: "dropped";
}

export interface CoverageReport {
  readonly total: number;
  readonly covered: number;
  readonly findings: readonly CoverageFinding[];
  readonly ok: boolean;
}

function norm(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const CITE_RE = /(?:11\s*CCR\s*)?§+\s*\d{4}(?:\([a-z0-9]+\))*/gi;

/** Every § pinpoint appearing anywhere in the node. */
export function citationsIn(node: unknown): string[] {
  const text = JSON.stringify(node ?? "");
  return Array.from(new Set((text.match(CITE_RE) ?? []).map((c) => c.replace(/\s+/g, " ").trim())));
}

interface AnalyticsLike {
  activity_name?: string;
  necessity_analysis?: { element?: string; verdict?: string; information_needed?: string; status?: string }[];
  harm_causation?: { harm_pinpoint?: string; harm_label?: string; information_needed?: string; status?: string }[];
  safeguard_map?: { harm_id?: string; safeguard?: string; residual_band?: string; information_needed?: string; status?: string }[];
  weighing?: { beneficiary_class?: string; sufficiency?: string; information_needed?: string; status?: string }[];
  consequence?: { decision?: string; reasons?: string[]; conditions?: string[]; information_needed?: string };
}

/**
 * Collect the atoms a framed render must carry for ONE activity's analytics
 * plus the report-level honesty surfaces.
 */
export function collectCoverageAtoms(input: {
  analytics?: AnalyticsLike | null;
  inconsistency_flags?: unknown[] | null;
  information_needed?: unknown[] | null;
  record_sufficiency?: unknown[] | null;
}): CoverageAtom[] {
  const atoms: CoverageAtom[] = [];
  const a = input.analytics ?? undefined;

  if (a) {
    const base = `activity_analytics[${a.activity_name ?? "0"}]`;
    for (const [i, n] of (a.necessity_analysis ?? []).entries()) {
      if (n?.verdict) {
        atoms.push({
          kind: "determination",
          path: `${base}.necessity_analysis[${i}].verdict`,
          value: String(n.verdict),
          conclusion_key: `necessity.${n.verdict}`,
        });
      }
      if (n?.element) {
        atoms.push({ kind: "record_value", path: `${base}.necessity_analysis[${i}].element`, value: String(n.element) });
      }
      if (n?.information_needed) {
        atoms.push({ kind: "gap", path: `${base}.necessity_analysis[${i}].information_needed`, value: String(n.information_needed) });
      }
    }
    for (const [i, h] of (a.harm_causation ?? []).entries()) {
      if (h?.harm_pinpoint) {
        atoms.push({ kind: "citation", path: `${base}.harm_causation[${i}].harm_pinpoint`, value: String(h.harm_pinpoint) });
      }
      if (h?.information_needed) {
        atoms.push({ kind: "gap", path: `${base}.harm_causation[${i}].information_needed`, value: String(h.information_needed) });
      }
    }
    for (const [i, s] of (a.safeguard_map ?? []).entries()) {
      if (s?.residual_band) {
        atoms.push({
          kind: "determination",
          path: `${base}.safeguard_map[${i}].residual_band`,
          value: String(s.residual_band),
        });
      }
      if (s?.information_needed) {
        atoms.push({ kind: "gap", path: `${base}.safeguard_map[${i}].information_needed`, value: String(s.information_needed) });
      }
    }
    for (const [i, w] of (a.weighing ?? []).entries()) {
      if (w?.sufficiency) {
        atoms.push({
          kind: "determination",
          path: `${base}.weighing[${i}].sufficiency`,
          value: String(w.sufficiency),
          conclusion_key: `weighing.${w.sufficiency}`,
        });
      }
      if (w?.information_needed) {
        atoms.push({ kind: "gap", path: `${base}.weighing[${i}].information_needed`, value: String(w.information_needed) });
      }
    }
    if (a.consequence?.decision) {
      atoms.push({
        kind: "determination",
        path: `${base}.consequence.decision`,
        value: String(a.consequence.decision),
        conclusion_key: `consequence.${a.consequence.decision}`,
      });
    }
    for (const [i, c] of (a.consequence?.conditions ?? []).entries()) {
      atoms.push({ kind: "gap", path: `${base}.consequence.conditions[${i}]`, value: String(c) });
    }
  }

  for (const [i, f] of (input.inconsistency_flags ?? []).entries()) {
    if (f) atoms.push({ kind: "contradiction_flag", path: `inconsistency_flags[${i}]`, value: typeof f === "string" ? f : JSON.stringify(f) });
  }
  for (const [i, g] of (input.information_needed ?? []).entries()) {
    if (g) atoms.push({ kind: "gap", path: `information_needed[${i}]`, value: typeof g === "string" ? g : JSON.stringify(g) });
  }

  return atoms;
}

/**
 * An atom is covered when its own text survives, or — for a determination —
 * when the pinned clause the library maps that determination to is present.
 */
export function checkCoverage(
  atoms: readonly CoverageAtom[],
  framedText: string,
  opts?: { readonly clauseFor?: (conclusionKey: string) => string | null | undefined },
): CoverageReport {
  const hay = norm(framedText);
  const findings: CoverageFinding[] = [];
  for (const atom of atoms) {
    let covered = hay.includes(norm(atom.value));
    if (!covered && atom.conclusion_key && opts?.clauseFor) {
      const clause = opts.clauseFor(atom.conclusion_key);
      if (clause && norm(clause) && hay.includes(norm(clause))) covered = true;
    }
    if (!covered) findings.push({ atom, reason: "dropped" });
  }
  return {
    total: atoms.length,
    covered: atoms.length - findings.length,
    findings,
    ok: findings.length === 0,
  };
}
