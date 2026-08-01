// ITEM 338 (PROSE PROGRAM 2 of 4) — FRAME REALIZER.
//
// Extends the Item 337 typed-slot realizer to render approved frames.
// Rules that are not negotiable:
//   * Record values are rendered VERBATIM. Free text is visibly quoted so a
//     reader can always tell what the company said from what we wrote.
//   * {{CITE:key}} slots are filled ONLY by the caller's registry resolver,
//     which re-queries the verified-authority row at build time.
//   * FILL-OR-OMIT: if any required placeholder is silent on the record, the
//     frame does not render half-filled — it degrades to the honest
//     "not stated on the record" path (MANDATORY DEGRADATION LAW).

import { adapterFor, collapseRenderArtifacts, joinNaturalList, renderSlotValue } from "./slots.ts";
import {
  type Frame,
  FRAME_LIBRARY_VERSION,
  type FramePlaceholder,
  type FrameSet,
  frameSetRenderable,
} from "./frames.ts";

export const FRAME_RENDER_VERSION = FRAME_LIBRARY_VERSION;

export type CiteResolver = (propositionKey: string) => string | null | undefined;

export interface FrameRenderOptions {
  /** Record values keyed by placeholder source path. */
  readonly values: Record<string, unknown>;
  /** Registry lookup for {{CITE:...}} slots. Absent resolver = cites are silent. */
  readonly resolveCite?: CiteResolver;
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
      const quote = opts.quoteFreeText !== false;
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
  const byToken = new Map(frame.placeholders.map((p) => [p.token, p]));

  let out = String(frame.body ?? "");

  for (const p of frame.placeholders) {
    let replacement = "";
    if (p.kind === "cite") {
      const resolved = opts.resolveCite?.(p.source);
      if (isSilent(resolved)) {
        (p.required ? missingRequired : missingOptional).push(p.source);
      } else {
        replacement = String(resolved).trim();
        citesFilled.push(p.source);
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
    out = out.replace(re, replacement);
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
      degradation: {
        reason: "required placeholder silent on the record",
        information_needed: missingRequired,
      },
    };
  }

  const cleaned = collapseRenderArtifacts(out);
  return {
    rendered: cleaned,
    omitted: false,
    missing_required: [],
    missing_optional: missingOptional,
    cites_filled: citesFilled,
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
