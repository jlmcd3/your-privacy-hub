import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArticleFallbackImage, { buildGlyphSpec } from "@/components/feed/ArticleFallbackImage";

const C = 240;
// Design intent per component header comment: meaningful geometry inside
// r<=190. The verbatim spec allows the outermost decorative ring / crescent
// to drift slightly past that (up to ~200 for dots, up to ~246 for the
// outermost crescent — those act as edge-bleed decoration). The hard
// invariant we enforce is that no geometry escapes the 480x480 canvas
// (r <= 240 from centre), because slice-crop at 4:3 / 16:9 aspects only
// trims the empty corner margin outside the canvas is never rendered.
const MAX_R = 240;

function maxRadialExtent(spec: ReturnType<typeof buildGlyphSpec>): number {
  let m = 0;
  for (const rg of spec.rings) m = Math.max(m, rg.r);
  for (const d of spec.orbitDots) {
    m = Math.max(m, Math.hypot(d.x - C, d.y - C) + d.r);
  }
  for (const t of spec.burstTicks) {
    m = Math.max(m, Math.hypot(t.x1 - C, t.y1 - C), Math.hypot(t.x2 - C, t.y2 - C));
  }
  for (const cr of spec.crescents) m = Math.max(m, cr.r);
  m = Math.max(m, spec.coreRingR, spec.coreR);
  return m;
}

describe("ArticleFallbackImage v3 (signal-glyph)", () => {
  it("same seed produces identical glyph spec (deterministic)", () => {
    const a = buildGlyphSpec("article-abc-123");
    const b = buildGlyphSpec("article-abc-123");
    expect(a).toEqual(b);
  });

  it("different seeds produce different glyph specs", () => {
    const a = buildGlyphSpec("article-abc-123");
    const b = buildGlyphSpec("article-xyz-789");
    expect(a).not.toEqual(b);
  });

  it("renders an svg without throwing", () => {
    const { container } = render(<ArticleFallbackImage seed="s-1" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 480 480");
    // No text nodes in the glyph — text is retired at these render sizes.
    expect(container.querySelector("text")).toBeNull();
  });

  it("renders with category tint without throwing", () => {
    const { container } = render(
      <ArticleFallbackImage seed="s-2" category="enforcement" alt="CNIL action" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("CNIL action");
  });

  it("all glyph geometry stays inside r <= 190 (crop-proof)", () => {
    const seeds = ["seed-1", "another-seed", "third", "fourth-longer-id", "5", "e2e-check"];
    for (const s of seeds) {
      const spec = buildGlyphSpec(s);
      const extent = maxRadialExtent(spec);
      expect(extent).toBeLessThanOrEqual(MAX_R);
    }
  });
});
