// Shared star palette for both the 2D StarFieldBackground and the
// Three.js star field inside SpinTheGlobe. Single source of truth
// so the canvas circle and the page-level sky read as ONE sky.

export type StarClass = {
  name: string;
  weight: number;
  rgb: [number, number, number];
};

// Weighted stellar color classes modelled on real stellar populations
// as seen by eye — mostly cool-white / blue-white, occasional warm stars.
export const STAR_CLASSES: StarClass[] = [
  { name: "blue_white", weight: 0.38, rgb: [200, 215, 255] },
  { name: "white",      weight: 0.32, rgb: [235, 238, 248] },
  { name: "warm_white", weight: 0.15, rgb: [248, 240, 220] },
  { name: "yellow",     weight: 0.10, rgb: [250, 230, 180] },
  { name: "orange_red", weight: 0.05, rgb: [255, 200, 160] },
];

// Map a 0..1 random value to a star class via cumulative weight.
export function pickStarClass(rand: number): StarClass {
  let acc = 0;
  for (const c of STAR_CLASSES) {
    acc += c.weight;
    if (rand <= acc) return c;
  }
  return STAR_CLASSES[STAR_CLASSES.length - 1];
}

// Exponent for the power-law brightness / size distribution.
// Most stars dim, few bright.
export const BRIGHTNESS_POWER = 2.5;

// Return a 0..1 base brightness skewed so MOST values are small
// and FEW are large. b = 1 - r^(1/p) inverts the curve so the
// long tail is at the bright end.
export function powerLawBrightness(rand = Math.random()): number {
  return 1 - Math.pow(rand, 1 / BRIGHTNESS_POWER);
}

// Irregular scintillation. Sum of two sines at incommensurate
// frequencies (golden ratio), with twinkle amplitude SCALING WITH
// baseBrightness so bright stars visibly shimmer and dim stars hold
// nearly steady. Returns a 0.05..1.0 multiplier.
export function twinkle(
  t: number,
  phase: number,
  speedA: number,
  speedB: number,
  baseBrightness: number,
): number {
  const s1 = Math.sin(t * speedA + phase);
  const s2 = Math.sin(t * speedB + phase * 1.7);
  const raw = (s1 + s2) * 0.5; // -1..1
  // Amplitude scales with brightness: dim stars ~0.05 swing, bright ~0.45
  const amp = 0.05 + 0.4 * baseBrightness;
  const m = 1 + raw * amp - amp * 0.3;
  return Math.max(0.05, Math.min(1, m));
}

// Hero ("standout") star configuration for the 2D field.
export const HERO_STAR_COUNT = 8;
export const HERO_GLOW = {
  radiusMultiplier: 6, // glow sprite radius vs star radius
  alpha: 0.45,         // gradient inner alpha
};
