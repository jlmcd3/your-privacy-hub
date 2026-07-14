// RC-C3.CLOSE-1 — QL3 grader-variance band (item 1).
//
// Contract (ratified):
//   N=3 samples per phase (pre and post). delta = median(post) − median(pre).
//   NO-SIGNAL BAND = max(bootstrappedSigma(pre), 0.75).
//   The band is derived from PRE samples ONLY so a regression cannot shrink
//   its own band (legal ruling). The 0.75 floor prevents zero-band
//   degeneracy when the three pre-samples coincide.
//   |delta| < band  → "no_signal" (neither regression nor improvement).
//   delta >=  band  → "improvement".
//   delta <= -band  → "regression".
//
// Bootstrap is deterministic: mulberry32 PRNG seeded from a stable hash of
// the pre-sample vector; B=500 iterations. Persisting the seed and B along
// with the raw sample arrays makes every band decision auditable per-run
// from telemetry alone (no cross-run history needed).

export const VARIANCE_SAMPLES_N = 3;
export const VARIANCE_BAND_FLOOR = 0.75;
export const VARIANCE_BOOTSTRAP_B = 500;

export interface VarianceResult {
  pre_median: number | null;
  post_median: number | null;
  pre_iqr: number | null;
  post_iqr: number | null;
  delta: number | null;
  sigma: number | null;         // bootstrapped sigma of pre-sample medians
  band: number | null;          // max(sigma, floor)
  band_floor: number;
  bootstrap_b: number;
  bootstrap_seed: number | null;
  verdict: "no_signal" | "improvement" | "regression" | "insufficient_samples";
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

function iqr(xs: number[]): number {
  if (xs.length < 2) return 0;
  return quantile(xs, 0.75) - quantile(xs, 0.25);
}

// Deterministic hash → 32-bit seed. FNV-1a on the JSON of the sample vector.
export function seedFromSamples(pre: number[]): number {
  const s = JSON.stringify(pre.map((x) => Number(x)));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic, seed-in / stream-out.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stdev(xs: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const v = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
}

// Bootstrap σ of the median of the pre-sample vector.
export function bootstrappedSigma(pre: number[], b = VARIANCE_BOOTSTRAP_B, seed?: number): number {
  if (pre.length < 2) return 0;
  const s = seed ?? seedFromSamples(pre);
  const rnd = mulberry32(s);
  const medians: number[] = new Array(b);
  const n = pre.length;
  for (let i = 0; i < b; i++) {
    const draw = new Array(n);
    for (let j = 0; j < n; j++) draw[j] = pre[Math.floor(rnd() * n)];
    medians[i] = median(draw);
  }
  return stdev(medians);
}

export function computeVariance(preRaw: unknown, postRaw: unknown): VarianceResult {
  const pre = Array.isArray(preRaw) ? (preRaw as unknown[]).filter((x) => typeof x === "number") as number[] : [];
  const post = Array.isArray(postRaw) ? (postRaw as unknown[]).filter((x) => typeof x === "number") as number[] : [];
  const base: VarianceResult = {
    pre_median: null, post_median: null, pre_iqr: null, post_iqr: null,
    delta: null, sigma: null, band: null,
    band_floor: VARIANCE_BAND_FLOOR,
    bootstrap_b: VARIANCE_BOOTSTRAP_B,
    bootstrap_seed: null,
    verdict: "insufficient_samples",
  };
  if (pre.length < 2 || post.length < 1) return base;
  const seed = seedFromSamples(pre);
  const sigma = bootstrappedSigma(pre, VARIANCE_BOOTSTRAP_B, seed);
  const band = Math.max(sigma, VARIANCE_BAND_FLOOR);
  const pm = median(pre);
  const qm = median(post);
  const delta = qm - pm;
  let verdict: VarianceResult["verdict"];
  if (Math.abs(delta) < band) verdict = "no_signal";
  else if (delta > 0) verdict = "improvement";
  else verdict = "regression";
  return {
    pre_median: pm, post_median: qm,
    pre_iqr: iqr(pre), post_iqr: iqr(post),
    delta, sigma, band,
    band_floor: VARIANCE_BAND_FLOOR,
    bootstrap_b: VARIANCE_BOOTSTRAP_B,
    bootstrap_seed: seed,
    verdict,
  };
}
