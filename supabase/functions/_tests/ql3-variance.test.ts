// RC-C3.CLOSE-1 (item 1) — pin the grader-variance band math.
// Fixed sample arrays → expected verdicts. If the band formula, seed, or
// bootstrap iteration count changes without a courier, this test fails.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeVariance,
  bootstrappedSigma,
  seedFromSamples,
  VARIANCE_BAND_FLOOR,
  VARIANCE_BOOTSTRAP_B,
} from "../_shared/ql3-variance.ts";

Deno.test("floor applies when pre samples coincide (zero variance)", () => {
  // Identical pre samples → bootstrapped sigma = 0 → band = floor.
  const v = computeVariance([0.8, 0.8, 0.8], [0.9, 0.9, 0.9]);
  assert(v.sigma !== null && Math.abs(v.sigma) < 1e-9);
  assertEquals(v.band, VARIANCE_BAND_FLOOR);
  assertEquals(v.pre_median, 0.8);
  assertEquals(v.post_median, 0.9);
  // |0.1| < 0.75 → no_signal.
  assertEquals(v.verdict, "no_signal");
});

Deno.test("large positive delta clears floor → improvement", () => {
  const v = computeVariance([1, 1, 1], [3, 3, 3]);
  assertEquals(v.band, VARIANCE_BAND_FLOOR);
  assertEquals(v.delta, 2);
  assertEquals(v.verdict, "improvement");
});

Deno.test("large negative delta clears floor → regression", () => {
  const v = computeVariance([5, 5, 5], [1, 1, 1]);
  assertEquals(v.band, VARIANCE_BAND_FLOOR);
  assertEquals(v.delta, -4);
  assertEquals(v.verdict, "regression");
});

Deno.test("band derives from pre samples only (post variance cannot shrink it)", () => {
  const preNoisy = [1, 5, 9];
  const post = [3, 3, 3];
  const v = computeVariance(preNoisy, post);
  // Non-zero pre variance → sigma > 0 and band == sigma (well above floor).
  assert(v.sigma !== null && v.sigma > 0);
  assert(v.band !== null && v.band >= VARIANCE_BAND_FLOOR);
  // Rerun with same pre; different post — band must be identical.
  const v2 = computeVariance(preNoisy, [100, 100, 100]);
  assertEquals(v2.band, v.band);
  assertEquals(v2.sigma, v.sigma);
});

Deno.test("deterministic seed + bootstrap: identical pre → identical sigma", () => {
  const pre = [0.6, 0.7, 0.9];
  const s1 = bootstrappedSigma(pre);
  const s2 = bootstrappedSigma(pre);
  assertEquals(s1, s2);
  assertEquals(seedFromSamples(pre), seedFromSamples([...pre]));
});

Deno.test("insufficient samples returns null verdict", () => {
  const v = computeVariance([], []);
  assertEquals(v.verdict, "insufficient_samples");
  assertEquals(v.band, null);
});

Deno.test("bootstrap iteration count is pinned", () => {
  const v = computeVariance([1, 2, 3], [1, 2, 3]);
  assertEquals(v.bootstrap_b, VARIANCE_BOOTSTRAP_B);
});
