// DOC 191 §6.3 (per-stage checkpoint) and §6.2 stage 4 (statistical audit) —
// THE STRATIFIED DRAW.
//
// Auditing only at the very end tells you the pipeline was wrong somewhere,
// not which stage broke it. So each of stages 0–3 gets its own small
// checkpoint: about ten items drawn from THAT stage's own output, weighted
// toward whatever the stage is least sure of (its lower-confidence rows, and
// especially anything it just promoted toward `rule`) — NOT a plain uniform
// draw, which would usually land entirely in the bucket the stage was never
// in doubt about.
//
// This is deliberately one reusable function rather than four copies: it runs
// after every stage, and stage 4's larger final draw is the same function
// with a bigger `size`.
//
// DETERMINISM. The draw is seeded and reproducible. An audit whose sample
// cannot be reconstructed is not an audit — a reviewer must be able to re-run
// the exact draw the checkpoint reported, and a test must be able to pin it.

import type { ConfidenceTier } from "../../../_shared/corpus/authority-relevance-profile.ts";

export interface SampleableItem {
  readonly id: string;
  readonly confidence_tier: ConfidenceTier;
  /** True where this stage moved the row TOWARD `rule`. Weighted hardest:
   *  per §6.1 that is the only direction whose errors are expensive. */
  readonly promoted_toward_rule: boolean;
  /** True where the §6.4 sibling-consistency check flagged this row — §6.4
   *  routes those into the audit sample explicitly. */
  readonly sibling_conflict?: boolean;
}

/** §6.3 step 1's "weighted toward whatever the stage is least sure of". */
export const SAMPLE_WEIGHTS = {
  promoted_toward_rule: 8,
  sibling_conflict: 4,
  low: 4,
  medium: 2,
  high: 1,
} as const;

export function sampleWeight(item: SampleableItem): number {
  let w = SAMPLE_WEIGHTS[item.confidence_tier];
  if (item.promoted_toward_rule) w += SAMPLE_WEIGHTS.promoted_toward_rule;
  if (item.sibling_conflict) w += SAMPLE_WEIGHTS.sibling_conflict;
  return w;
}

/** The §6.3 default: "a stratified sample of about 10 items". */
export const CHECKPOINT_SAMPLE_SIZE = 10;

// FNV-1a → mulberry32. Small, dependency-free, and stable across runs and
// platforms, which is the whole point.
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StratifiedDraw<T extends SampleableItem> {
  readonly items: readonly T[];
  /** Every stratum's population and how many of it the draw took — the
   *  reviewer's evidence that the weighting actually did something. */
  readonly strata: Readonly<Record<string, { population: number; drawn: number }>>;
  readonly seed: string;
  readonly size: number;
  readonly population: number;
}

function stratumOf(item: SampleableItem): string {
  if (item.promoted_toward_rule) return "promoted_toward_rule";
  if (item.sibling_conflict) return "sibling_conflict";
  return item.confidence_tier;
}

/**
 * Weighted sampling WITHOUT replacement, via the Efraimidis–Spirakis key
 * `u^(1/w)`: each item draws a uniform u, its key is u**(1/weight), and the
 * top `size` keys win. Higher weight ⇒ systematically higher key ⇒ more
 * likely drawn, with no item ever drawn twice.
 *
 * Everything promoted toward `rule` is drawn FIRST and unconditionally,
 * before the weighted draw fills the rest: §6.3 step 4 says a miss that
 * wrongly promoted something toward `rule` gets chased hard, immediately —
 * leaving one to chance would not be chasing it hard.
 */
export function drawStratifiedSample<T extends SampleableItem>(
  items: readonly T[],
  opts: { size?: number; seed: string } ,
): StratifiedDraw<T> {
  const size = opts.size ?? CHECKPOINT_SAMPLE_SIZE;
  const rand = mulberry32(hashSeed(opts.seed));

  const promoted = items.filter((i) => i.promoted_toward_rule);
  const rest = items.filter((i) => !i.promoted_toward_rule);

  const chosen: T[] = [];
  // Deterministic order for the mandatory block too.
  for (const p of [...promoted].sort((a, b) => a.id.localeCompare(b.id))) {
    if (chosen.length >= size) break;
    chosen.push(p);
  }

  if (chosen.length < size) {
    const keyed = [...rest]
      .sort((a, b) => a.id.localeCompare(b.id)) // stable input order first
      .map((item) => {
        const u = rand();
        // u === 0 would collapse every key to 0; nudge it off the boundary.
        const uu = u === 0 ? Number.MIN_VALUE : u;
        return { item, key: Math.pow(uu, 1 / sampleWeight(item)) };
      })
      .sort((a, b) => (b.key - a.key) || a.item.id.localeCompare(b.item.id));
    for (const k of keyed) {
      if (chosen.length >= size) break;
      chosen.push(k.item);
    }
  }

  const strata: Record<string, { population: number; drawn: number }> = {};
  for (const i of items) {
    const s = stratumOf(i);
    strata[s] = strata[s] ?? { population: 0, drawn: 0 };
    strata[s].population++;
  }
  for (const i of chosen) {
    const s = stratumOf(i);
    strata[s] = strata[s] ?? { population: 0, drawn: 0 };
    strata[s].drawn++;
  }

  return { items: chosen, strata, seed: opts.seed, size, population: items.length };
}

/**
 * §6.2 stage 4's rule-of-three bound: zero observed errors on a sample of n
 * bounds the true error rate below roughly 3/n at 95% confidence (n=50 → ~6%).
 * Returned as a number so a checkpoint report can state the claim honestly
 * rather than gesturing at it.
 */
export function ruleOfThreeUpperBound(sampleSize: number): number | null {
  if (sampleSize <= 0) return null;
  return 3 / sampleSize;
}
