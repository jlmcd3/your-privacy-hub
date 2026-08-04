// ITEM 369 / WAVE-1 AFTER-BATCH DEFECT 1 — FRAME SUBSTITUTION FOR DEGRADED
// SURFACES.
//
// THE DEFECT
// ----------
// The approved `prose_frame_sets` gap atoms exist precisely to replace the
// mechanical fallback text that lands on degraded or absent surfaces. Nothing
// consumed them: the emit gate wrote `renderMessage("information.needed")`
// into every degraded leaf, the T6 scrub wrote its NEUTRAL_DOWNGRADE literal
// into every unsupported assertion, and the per-product boilerplate cap then
// rewrote the surplus from a HARDCODED variant pool. The register never
// reached the document — which is why one DPIA shipped with the fallback pool
// all over it, conclusion included.
//
// WHERE THIS RUNS (A7 pipeline order)
// -----------------------------------
//   prose → span/citation validators → **frame substitution (this module)**
//   → boilerplate cap (now a true backstop) → disclaimer.
//
// It is a NEW pass. `emit-gate.ts` and `customer-messages.ts` are NOT touched:
// their literals stay byte-identical (other products' gate tests assert them),
// and this pass replaces those literals after the fact.
//
// CONTRACT
// --------
//   * DETERMINISTIC — stable key-order walk, occurrence-indexed selection. The
//     same report always yields the same document.
//   * SPAN-SAFE — only whole controlled literals are replaced. Those literals
//     never contain span sentinels, so no sentinel is ever split. Rendered
//     atoms carry their own sentinels through the normal frame realizer.
//   * FAIL-OPEN — any error leaves the report untouched.
//   * REGISTER-ONLY — atoms come from the product's frame set as approved in
//     `prose_frame_sets`. Nothing is invented here except the neutral
//     absence scaffolds below, which assert nothing.
//   * TELEMETRY — `_meta.internal.frame_substitution`.

import type { Frame, FrameSet } from "./frames.ts";
import { renderFrame } from "./frame-render.ts";
import { extractSpans } from "./span-tracking.ts";

export const FRAME_SUBSTITUTION_VERSION = "frame-substitution-2026-08-04-item369";

// ---------------------------------------------------------------------------
// The controlled literals. These are COPIES of what the upstream emitters and
// the per-product caps write; the sources of truth are `emit-gate.ts` /
// `customer-messages.ts` and each product's `_*_boilerplate_cap.ts`. They are
// restated (not imported) so this pass never pulls the gate into a bundle that
// does not already carry it — the colocated test asserts they stay in lockstep.
// ---------------------------------------------------------------------------

export const INFO_NEEDED_LITERAL =
  "We could not verify this item from the information provided; it is listed under information needed.";

export const NEUTRAL_DOWNGRADE_LITERAL =
  "The organisation should confirm whether the described position applies here.";

/**
 * Hardcoded cap pools — replaced here so the cap becomes a true backstop.
 * ITEM 372 r2 (3): the DPIA cap's pools were rewritten off "on the record";
 * BOTH the retired and the current sentences are listed, so a document
 * carrying either form is still substituted.
 */
export const CAP_POOL_SENTENCES: readonly string[] = [
  "The record as it stands does not resolve this point; it is carried in the information needed list.",
  "This point is unresolved on the present record and appears among the items of information needed.",
  "This point is unresolved and appears among the items of information needed.",
  "The information supplied does not settle this item; see the information needed list.",
  "This item remains open on the record and is tracked under information needed.",
  "This item is still open and is tracked under information needed.",
  "The record does not yet answer this point; it is listed with the other information needed.",
  "No answer to this point appears in the record; it is carried under information needed.",
  "No answer to this point appears in the material supplied; it is carried under information needed.",
  "This point is not resolved by the material supplied and sits in the information needed list.",
  "Whether the described position applies here is not settled by the record.",
  "Whether the described position applies here is not settled by the material supplied.",
  "The record does not establish that the described position applies here.",
  "It remains to be confirmed whether the described position holds in this case.",
  "The described position is stated without support in the record for this case.",
  "The described position is stated without support for this case.",
  "Nothing in the record confirms that the described position applies here.",
  "Nothing supplied confirms that the described position applies here.",
];

/** Absence scaffolds emitted by the frame realizer's fill-or-omit path. */
export const ABSENCE_SCAFFOLDS: readonly string[] = [
  "The information provided does not state this.",
];

/** Every sentence this pass is allowed to replace, longest-first. */
export const CONTROLLED_LITERALS: readonly string[] = [
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
  ...CAP_POOL_SENTENCES,
  ...ABSENCE_SCAFFOLDS,
].slice().sort((a, b) => b.length - a.length);

// ---------------------------------------------------------------------------
// Neutral absence scaffolds for leaves whose surface has no authored atom.
// These assert nothing, add no fact and no advice, and keep the reader pointed
// at the information-needed list. They exist so the old pool sentences can be
// removed everywhere, not only where the register has coverage.
//
// ITEM 372 SECOND CORRECTION ROUND (3) — the pool was six sentences long and
// off-register: "on the record" is courtroom idiom the register refuses (see
// BANNED_PHRASES in register-lint.ts), and six variants across ~20 degraded
// leaves meant every sentence recurred three or four times. The pool is now
// sixteen register-clean variants, and `register-lint.ts` lints it directly
// through `lintScaffoldPool` so an off-register sentence cannot be added back
// without the battery failing.
// ---------------------------------------------------------------------------

export const GENERIC_ABSENCE: readonly string[] = [
  "The record does not settle this point, and it is carried in the information needed list.",
  "Nothing supplied answers this, so the point stays open.",
  "This turns on a fact the record does not supply; it is listed with the information needed.",
  "The material provided leaves this unresolved, and it is tracked as information needed.",
  "No part of the material reaches this question, so it remains open.",
  "What would answer this is absent, and the point is listed as information needed.",
  "The record is silent here, and the question is carried forward.",
  "This is not established by anything supplied, and it sits in the information needed list.",
  "The documents provided do not reach this point.",
  "Whether this holds cannot be determined from what has been supplied.",
  "No supporting entry was provided, so the question is left where it stands.",
  "The intake does not describe this, and the point is listed as information needed.",
  "This remains unanswered by the material and is tracked with the other open questions.",
  "Nothing in the material provided speaks to this.",
  "The point is open, and it is carried in the information needed list.",
  "The supplied material stops short of this question.",
];

// ---------------------------------------------------------------------------
// Section mapping. Frames are authored PER SURFACE: `frame.section` is either a
// report key ("assessment_team", "duty_findings") or a dotted path suffix
// ("attestation_block.review_triggers"). A leaf at
// `section_0_overview.assessment_team.note` matches "assessment_team".
// ---------------------------------------------------------------------------

/** `section_5_interested_parties` → `interested_parties`; `foo[2]` → `foo`. */
function normalizeSegment(seg: string): string {
  return seg.replace(/^section_\d+_/, "").replace(/\[\d+\]$/, "");
}

/** Candidate section keys for a leaf path, most specific first. */
export function sectionCandidates(path: string): string[] {
  const segs = path.split(".").map(normalizeSegment).filter((s) => s && !/^\d+$/.test(s));
  const out: string[] = [];
  for (let i = segs.length; i > 0; i--) {
    for (let width = Math.min(2, i); width >= 1; width--) {
      const key = segs.slice(i - width, i).join(".");
      if (!out.includes(key)) out.push(key);
    }
  }
  return out;
}

export interface FrameSubstitutionOptions {
  readonly product: string;
  readonly frameSet: FrameSet | null | undefined;
  /** Placeholder values keyed by the frame placeholder `source` path. */
  readonly values?: Record<string, unknown>;
  /** Product contract for the enum adapter. */
  readonly contract?: string;
  /**
   * Extra section aliases: report-path segment → frame section. Used where a
   * product's report key and its authored frame section differ.
   */
  readonly sectionAliases?: Record<string, string>;
}

export interface FrameSubstitutionCounters {
  version: string;
  product: string;
  /** controlled literal occurrences found */
  occurrences: number;
  /** occurrences replaced by an APPROVED frame atom */
  atoms_applied: number;
  /** occurrences replaced by a neutral absence scaffold (no atom for surface) */
  scaffolds_applied: number;
  /** controlled literal occurrences still in the document afterwards */
  literals_remaining: number;
  /** frame ids used, in order of first use */
  frames_used: string[];
  frame_set_available: boolean;
  crashed: boolean;
}

function emptyCounters(product: string): FrameSubstitutionCounters {
  return {
    version: FRAME_SUBSTITUTION_VERSION,
    product,
    occurrences: 0,
    atoms_applied: 0,
    scaffolds_applied: 0,
    literals_remaining: 0,
    frames_used: [],
    frame_set_available: false,
    crashed: false,
  };
}

interface Selector {
  bySection: Map<string, Frame[]>;
  /** frames already spent, so an atom is not repeated across the document */
  used: Set<string>;
}

function buildSelector(set: FrameSet | null | undefined): Selector {
  const bySection = new Map<string, Frame[]>();
  for (const f of set?.frames ?? []) {
    if (f.status === "rejected") continue;
    const list = bySection.get(f.section) ?? [];
    list.push(f);
    bySection.set(f.section, list);
  }
  // Deterministic order within a section.
  for (const [, list] of bySection) list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { bySection, used: new Set() };
}

/**
 * Choose and render an atom for `path`. Returns null when the surface has no
 * authored atom, or every candidate degrades on this record (fill-or-omit).
 */
function renderAtomFor(
  path: string,
  sel: Selector,
  opts: FrameSubstitutionOptions,
): { text: string; frame_id: string } | null {
  const aliases = opts.sectionAliases ?? {};
  const candidates: Frame[] = [];
  for (const key of sectionCandidates(path)) {
    for (const k of [key, aliases[key]]) {
      if (!k) continue;
      for (const f of sel.bySection.get(k) ?? []) {
        if (!candidates.includes(f)) candidates.push(f);
      }
    }
  }
  if (!candidates.length) return null;
  // Unused atoms first (so a section's several atoms spread across its leaves),
  // then used ones as a last resort.
  const ordered = [
    ...candidates.filter((f) => !sel.used.has(f.id)),
    ...candidates.filter((f) => sel.used.has(f.id)),
  ];
  for (const frame of ordered) {
    const r = renderFrame(frame, { values: opts.values ?? {}, contract: opts.contract });
    if (r.omitted || !r.rendered || !r.rendered.trim()) continue;
    // The realizer marks record-sourced values with span sentinels. The
    // surfaces this pass writes into are plain prose leaves that the gate
    // already emitted unmarked, so the marks are stripped here — the atom's
    // words are unchanged, only the sentinels go.
    const text = extractSpans(r.rendered).text.trim();
    if (!text) continue;
    sel.used.add(frame.id);
    return { text, frame_id: frame.id };
  }
  return null;
}

function replaceInString(
  s: string,
  path: string,
  sel: Selector,
  opts: FrameSubstitutionOptions,
  c: FrameSubstitutionCounters,
  scaffoldIndex: { n: number },
): string {
  let out = s;
  for (const literal of CONTROLLED_LITERALS) {
    if (!out.includes(literal)) continue;
    let cursor = 0;
    let rebuilt = "";
    for (;;) {
      const at = out.indexOf(literal, cursor);
      if (at === -1) {
        rebuilt += out.slice(cursor);
        break;
      }
      rebuilt += out.slice(cursor, at);
      c.occurrences += 1;
      const atom = renderAtomFor(path, sel, opts);
      if (atom) {
        rebuilt += atom.text;
        c.atoms_applied += 1;
        if (!c.frames_used.includes(atom.frame_id)) c.frames_used.push(atom.frame_id);
      } else {
        rebuilt += GENERIC_ABSENCE[scaffoldIndex.n % GENERIC_ABSENCE.length];
        scaffoldIndex.n += 1;
        c.scaffolds_applied += 1;
      }
      cursor = at + literal.length;
    }
    out = rebuilt;
  }
  return out;
}

function walk(
  node: unknown,
  path: string,
  sel: Selector,
  opts: FrameSubstitutionOptions,
  c: FrameSubstitutionCounters,
  scaffoldIndex: { n: number },
): unknown {
  if (node == null) return node;
  if (typeof node === "string") return replaceInString(node, path, sel, opts, c, scaffoldIndex);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = walk(node[i], `${path}[${i}]`, sel, opts, c, scaffoldIndex);
    }
    return node;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj).sort()) {
      if (k === "_meta" || k === "_staging") continue; // never rewrite internal telemetry
      // ITEM 372 r2 (2) — the fixed disclaimer surfaces are system-supplied
      // boilerplate, not prose leaves. When the emit gate degraded one of them
      // this pass rewrote it into a gap atom, and the legacy top-of-document
      // banner then rendered that atom as the document's first line. Those two
      // keys are left exactly as the system wrote them.
      if (k === "framework_disclaimer" || k === "disclaimer") continue;
      obj[k] = walk(obj[k], path ? `${path}.${k}` : k, sel, opts, c, scaffoldIndex);
    }
    return obj;
  }
  return node;
}

/** Count remaining controlled literals in a document (test + telemetry helper). */
export function countControlledLiterals(doc: unknown): number {
  const json = typeof doc === "string" ? doc : JSON.stringify(doc ?? {});
  let n = 0;
  for (const lit of CONTROLLED_LITERALS) n += json.split(lit).length - 1;
  return n;
}

/**
 * Replace degraded-leaf fallback literals with the product's approved frame
 * atoms. Mutates in place, returns counters, never throws.
 */
export function applyFrameSubstitution(
  report: Record<string, unknown> | null | undefined,
  opts: FrameSubstitutionOptions,
): FrameSubstitutionCounters {
  const c = emptyCounters(opts.product);
  try {
    if (!report || typeof report !== "object") return c;
    const sel = buildSelector(opts.frameSet);
    c.frame_set_available = sel.bySection.size > 0;
    walk(report, "", sel, opts, c, { n: 0 });
    c.literals_remaining = countControlledLiterals(report);
    const meta = ((report as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
    const internal = ((meta as Record<string, unknown>).internal ??= {}) as Record<string, unknown>;
    internal.frame_substitution = { ...c };
  } catch (e) {
    c.crashed = true;
    console.warn("[frame-substitution] failed (non-fatal):", (e as Error)?.message);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Loader — reads the product's frame set from `prose_frame_sets`, honouring the
// ROW-level `approved` governance flag (the CEO sign-off column). Fail-open:
// any read problem returns null and the pass falls back to scaffolds.
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export async function loadApprovedFrameSet(client: any, product: string): Promise<FrameSet | null> {
  try {
    const { data, error } = await client
      .from("prose_frame_sets")
      .select("approved,frames,version")
      .eq("product", product)
      .order("version", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const row = (data ?? [])[0];
    if (!row || row.approved !== true) return null;
    const payload = row.frames as FrameSet | null;
    if (!payload || !Array.isArray(payload.frames) || payload.frames.length === 0) return null;
    return payload;
  } catch (e) {
    console.warn(
      `[frame-substitution] frame set unavailable for ${product} (non-fatal):`,
      (e as Error)?.message,
    );
    return null;
  }
}
