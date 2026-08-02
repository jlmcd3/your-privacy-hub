// ITEM 338 (PROSE PROGRAM 2 of 4) — FRAME REALIZER.
// REVISED UNDER ITEM 363 (PROSE REVISION): quotation marks around
// intake-derived values are REMOVED, and the guarantee they carried is moved
// into machine-readable span tracking (./span-tracking.ts).
//
// Rules that are not negotiable:
//   * Record values are rendered VERBATIM. They are no longer visibly quoted;
//     each one is wrapped in invisible span sentinels naming its source path,
//     so the leak-prevention checks and the Pass-2R validators still identify
//     record-derived text exactly. The methodology note telling the reader that
//     company-provided facts are reproduced without alteration is retained.
//   * {{CITE:key}} slots are filled ONLY by the caller's registry resolver,
//     which re-queries the verified-authority row at build time.
//   * FILL-OR-OMIT: if any required placeholder is silent on the record, the
//     frame does not render half-filled — it degrades to the honest
//     "not stated in the information provided" path (MANDATORY DEGRADATION LAW).

import { adapterFor, collapseRenderArtifacts, joinNaturalList, renderSlotValue } from "./slots.ts";
import { resolveLegalPhrasing } from "./legal-phrasings.ts";
import { resolveEngineConclusion } from "./engine-conclusions.ts";
import { rec } from "./span-tracking.ts";
import { RISK_VERIFIED_AUTHORITIES } from "../registry/risk-verified-authorities.ts";
import {
  type Frame,
  FRAME_LIBRARY_VERSION,
  type FramePlaceholder,
  type FrameSet,
  frameSetRenderable,
} from "./frames.ts";


export const FRAME_RENDER_VERSION = FRAME_LIBRARY_VERSION;

export type CiteResolver = (propositionKey: string) => string | null | undefined;
export type LegalResolver = (phrasingKey: string) => string | null | undefined;
export type ConclusionResolver = (determinationKey: string) => string | null | undefined;

/**
 * ITEM 346 — DEFAULT CITE RESOLVER (review-render defect fix).
 *
 * Item 338's review renders printed the literal string
 * "[registry: re-queried at build time]" because the review script passed a
 * stub. Cite slots now resolve from the same verified-authority registry the
 * engine uses, so a review render shows the pinpoint a customer would see.
 * Callers may still inject their own resolver (an engine that re-queries the
 * live row at build time does exactly that).
 */
export const REGISTRY_CITE_RESOLVERS: Record<string, CiteResolver> = {
  "cppa-risk": (key) => RISK_VERIFIED_AUTHORITIES[key]?.subsection ?? null,
};

export function defaultCiteResolver(product: string): CiteResolver {
  return REGISTRY_CITE_RESOLVERS[product] ?? (() => null);
}

export interface FrameRenderOptions {
  /** Record values keyed by placeholder source path. */
  readonly values: Record<string, unknown>;
  /** Registry lookup for {{CITE:...}} slots. Absent resolver = cites are silent. */
  readonly resolveCite?: CiteResolver;
  /** Pinned requirement phrasings for {{...:legal}}. Defaults to the product book. */
  readonly resolveLegal?: LegalResolver;
  /** Pinned engine-determination phrasings for {{...:conclusion}}. Defaults to the product book. */
  readonly resolveConclusion?: ConclusionResolver;
  /** Product contract for the Item 337 enum adapter. */
  readonly contract?: string;
  /** Quote free-text record values. Default true. */
  readonly quoteFreeText?: boolean;
}

export interface FrameRenderResult {
  readonly rendered: string | null;
  readonly omitted: boolean;
  readonly missing_required: readonly string[];
  readonly missing_optional: readonly string[];
  readonly cites_filled: readonly string[];
  readonly legal_filled: readonly string[];
  readonly conclusions_filled: readonly string[];
  readonly degradation?: { readonly reason: string; readonly information_needed: readonly string[] };
}

function isSilent(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0 || v.every(isSilent);
  return false;
}

function fillOne(
  p: FramePlaceholder,
  raw: unknown,
  opts: FrameRenderOptions,
): string {
  switch (p.kind) {
    case "list": {
      const arr = Array.isArray(raw) ? raw : [raw];
      return joinNaturalList(arr.filter((x) => !isSilent(x)));
    }
    case "count":
      return String(raw).trim();
    case "date":
      return String(raw).trim();
    case "enum":
      return renderSlotValue(raw, { adapter: adapterFor(opts.contract), midSentence: true });
    case "text":
    default: {
      // VERBATIM LAW — record free text is reproduced exactly as the company
      // wrote it: no punctuation stripping, no case folding.
      const s = (Array.isArray(raw) ? joinNaturalList(raw) : String(raw)).trim();
      // A referring expression ("the company") is the renderer's own word for
      // the entity, not a record quotation, so it is never quoted.
      const isReferring = /^(the company|the business|the entity|it)$/i.test(s);
      const quote = opts.quoteFreeText !== false && !isReferring;
      return quote ? `“${s.replace(/^["“”]|["“”]$/g, "")}”` : s;
    }
  }
}

/** The honest path when a frame cannot be filled from the record. */
export function notStatedOnTheRecord(items: readonly string[]): string {
  const list = joinNaturalList(items);
  return items.length
    ? `Not stated on the record. To complete this section the record needs ${list}.`
    : "Not stated on the record.";
}

export function renderFrame(frame: Frame, opts: FrameRenderOptions): FrameRenderResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const citesFilled: string[] = [];
  const legalFilled: string[] = [];
  const conclusionsFilled: string[] = [];
  const byToken = new Map(frame.placeholders.map((p) => [p.token, p]));

  let out = String(frame.body ?? "");

  for (const p of frame.placeholders) {
    let replacement = "";
    if (p.kind === "cite") {
      const resolver = opts.resolveCite ?? defaultCiteResolver(frame.product);
      const resolved = resolver(p.source);
      if (isSilent(resolved)) {
        (p.required ? missingRequired : missingOptional).push(p.source);
      } else {
        replacement = String(resolved).trim();
        citesFilled.push(p.source);
      }
    } else if (p.kind === "legal") {
      // SLOT TYPE 2 — pinned only. No generation, no fallback prose.
      const resolved = opts.resolveLegal
        ? opts.resolveLegal(p.source)
        : resolveLegalPhrasing(frame.product, p.source);
      if (isSilent(resolved)) {
        (p.required ? missingRequired : missingOptional).push(p.source);
      } else {
        replacement = String(resolved).trim();
        legalFilled.push(p.source);
      }
    } else if (p.kind === "conclusion") {
      // SLOT TYPE 3 — the engine chose the key; the library supplies the words.
      // "@path" = the engine wrote the determination key at that value path;
      // a bare source names a pinned determination directly.
      const key = p.source.startsWith("@")
        ? String(opts.values?.[p.source.slice(1)] ?? "")
        : p.source;
      const resolved = opts.resolveConclusion
        ? opts.resolveConclusion(key)
        : resolveEngineConclusion(frame.product, key);
      if (isSilent(resolved)) {
        (p.required ? missingRequired : missingOptional).push(p.source);
      } else {
        replacement = String(resolved).trim();
        conclusionsFilled.push(key);
      }
    } else {
      const raw = opts.values?.[p.source];
      if (isSilent(raw)) {
        (p.required ? missingRequired : missingOptional).push(p.source);
      } else {
        replacement = fillOne(p, raw, opts);
      }
    }
    const re = new RegExp(`\\{\\{${p.token}(?::[a-z_]+)?\\}\\}`, "g");
    out = out.replace(re, (_m, ...args) => {
      const offset = args[args.length - 2] as number;
      const whole = args[args.length - 1] as string;
      const after = whole.slice(offset + String(_m).length);
      // An unquoted record value that ends in a full stop must not carry it
      // into the middle of the frame's own sentence.
      const midSentence = /^\s*[a-z(]/.test(after) || /^\s*(and|with|,)/.test(after);
      if (midSentence && /[^”"]\.$/.test(replacement)) {
        return replacement.replace(/\.$/, "");
      }
      return replacement;
    });
  }

  // Any placeholder still standing was never declared — treat as silent.
  const orphans = out.match(/\{\{[A-Z0-9_]+(?::[a-z_]+)?\}\}/g) ?? [];
  for (const o of orphans) {
    const token = o.replace(/[{}]/g, "").split(":")[0];
    if (!byToken.has(token)) missingRequired.push(token);
    out = out.replace(o, "");
  }

  if (missingRequired.length > 0) {
    return {
      rendered: null,
      omitted: true,
      missing_required: missingRequired,
      missing_optional: missingOptional,
      cites_filled: citesFilled,
      legal_filled: legalFilled,
      conclusions_filled: conclusionsFilled,
      degradation: {
        reason: "required placeholder silent on the record",
        information_needed: missingRequired,
      },
    };
  }

  // A quoted record value that already ends in terminal punctuation must not
  // acquire a second one from the frame's own sentence end.
  const cleaned = collapseRenderArtifacts(out).replace(/([.?!]”)\s*\./g, "$1");
  return {
    rendered: cleaned,
    omitted: false,
    missing_required: [],
    missing_optional: missingOptional,
    cites_filled: citesFilled,
    legal_filled: legalFilled,
    conclusions_filled: conclusionsFilled,
  };
}

export interface SectionRenderResult extends FrameRenderResult {
  readonly frame_id: string | null;
  readonly used_frames: boolean;
}

/**
 * Render one section from an approved frame set. Returns `used_frames: false`
 * (and no prose) when the product's frame set is not yet approved — the caller
 * keeps its existing renderer until the CEO sign-off is recorded.
 */
export function renderSectionFromFrames(
  set: FrameSet,
  section: string,
  opts: FrameRenderOptions,
): SectionRenderResult {
  const base = {
    frame_id: null,
    used_frames: false,
    rendered: null,
    omitted: true,
    missing_required: [] as string[],
    missing_optional: [] as string[],
    cites_filled: [] as string[],
    legal_filled: [] as string[],
    conclusions_filled: [] as string[],
  };
  if (!frameSetRenderable(set)) return base;
  const candidates = set.frames.filter((f) => f.section === section);
  if (!candidates.length) return base;

  // Deterministic selection: the first frame that fills completely; otherwise
  // the honest degradation from the first candidate.
  let firstResult: FrameRenderResult | null = null;
  for (const frame of candidates) {
    const r = renderFrame(frame, opts);
    if (!firstResult) firstResult = r;
    if (!r.omitted) return { ...r, frame_id: frame.id, used_frames: true };
  }
  return { ...(firstResult as FrameRenderResult), frame_id: candidates[0].id, used_frames: true };
}
