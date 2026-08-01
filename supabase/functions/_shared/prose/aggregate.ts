// ITEM 339 (PROSE PROGRAM 3 of 4) — AGGREGATION.
//
// Adjacent single-fact sentences about the same topic read like a database
// walk ("The retention period is X. The deletion process is Y."). Aggregation
// merges them into one sentence — but ONLY through a pinned frame variant from
// the Item 338 library. There is no runtime sentence generation here: if no
// approved variant exists for a topic, the facts stay as separate sentences.

import type { Frame, FrameSet } from "./frames.ts";
import { renderFrame } from "./frame-render.ts";

export interface AtomicFact {
  /** Engine-assigned topic. Facts aggregate only within one topic. */
  readonly topic: string;
  /** The already-realized single-fact sentence. */
  readonly sentence: string;
  /** Record values available to a variant frame, keyed by placeholder source. */
  readonly values?: Readonly<Record<string, unknown>>;
}

export interface AggregateOptions {
  /** Frame set to draw variants from. Unapproved sets are ignored. */
  readonly frames?: FrameSet;
  /** Resolver for {{CITE}} slots inside a variant frame. */
  readonly resolveCite?: (key: string) => string | null;
  /** Maximum facts a single variant may absorb. */
  readonly maxGroup?: number;
}

export interface AggregateResult {
  readonly sentences: readonly string[];
  /** Ids of variant frames actually used; empty when nothing merged. */
  readonly variants_used: readonly string[];
  /** Topics that had 2+ adjacent facts but no approved variant. */
  readonly unmerged_topics: readonly string[];
}

/** A variant frame is one whose section is `aggregate:<topic>`. */
function variantFor(frames: FrameSet | undefined, topic: string, arity: number): Frame | null {
  if (!frames?.approved) return null;
  const want = `aggregate:${topic}`;
  const candidates = frames.frames.filter((f) => f.section === want && f.status === "approved");
  if (!candidates.length) return null;
  // Deterministic: prefer the variant whose required placeholder count matches
  // the group arity, then the lowest id.
  const sorted = [...candidates].sort((a, b) => {
    const da = Math.abs(requiredCount(a) - arity) - Math.abs(requiredCount(b) - arity);
    return da !== 0 ? da : a.id.localeCompare(b.id);
  });
  return sorted[0];
}

const requiredCount = (f: Frame) => f.placeholders.filter((p) => p.required).length;

export function aggregateFacts(
  facts: readonly AtomicFact[],
  opts: AggregateOptions = {},
): AggregateResult {
  const maxGroup = opts.maxGroup ?? 3;
  const sentences: string[] = [];
  const used: string[] = [];
  const unmerged = new Set<string>();

  let i = 0;
  while (i < facts.length) {
    // Greedily take the adjacent run sharing this topic.
    let j = i + 1;
    while (j < facts.length && facts[j].topic === facts[i].topic && j - i < maxGroup) j++;
    const group = facts.slice(i, j);

    if (group.length === 1) {
      sentences.push(group[0].sentence);
      i = j;
      continue;
    }

    const frame = variantFor(opts.frames, group[0].topic, group.length);
    if (!frame) {
      unmerged.add(group[0].topic);
      for (const g of group) sentences.push(g.sentence);
      i = j;
      continue;
    }

    const values: Record<string, unknown> = {};
    for (const g of group) Object.assign(values, g.values ?? {});
    const rendered = renderFrame(frame, { values, resolveCite: opts.resolveCite });

    if (rendered.omitted) {
      // FILL-OR-OMIT: a variant that cannot be filled never half-renders. The
      // atomic sentences stand instead — the reader loses flow, not facts.
      unmerged.add(group[0].topic);
      for (const g of group) sentences.push(g.sentence);
    } else {
      sentences.push(rendered.rendered ?? "");
      used.push(frame.id);
    }
    i = j;
  }

  return {
    sentences,
    variants_used: used,
    unmerged_topics: [...unmerged],
  };
}
