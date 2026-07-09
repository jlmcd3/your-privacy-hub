import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArticleFallbackImage, { buildTileSpec } from "@/components/feed/ArticleFallbackImage";

describe("ArticleFallbackImage", () => {
  it("same seed produces identical tile spec (deterministic)", () => {
    const a = buildTileSpec("article-abc-123");
    const b = buildTileSpec("article-abc-123");
    expect(a).toEqual(b);
  });

  it("different seeds produce different tile specs", () => {
    const a = buildTileSpec("article-abc-123");
    const b = buildTileSpec("article-xyz-789");
    expect(a).not.toEqual(b);
    // At least one of the salient variation axes must differ.
    const diff =
      a.angle !== b.angle ||
      a.mid !== b.mid ||
      a.pattern !== b.pattern ||
      a.arcCorner.x !== b.arcCorner.x ||
      a.arcCorner.y !== b.arcCorner.y;
    expect(diff).toBe(true);
  });

  it("renders without label (wordmark branch) without throwing", () => {
    const { container } = render(
      <ArticleFallbackImage seed="wordmark-seed" />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Wordmark text appears in the no-label branch.
    expect(container.textContent).toContain("End User Privacy");
  });

  it("renders with label + eyebrow + category tint", () => {
    const { container } = render(
      <ArticleFallbackImage
        seed="labelled-seed"
        label="CNIL"
        eyebrow="Enforcement"
        category="enforcement"
      />
    );
    expect(container.textContent).toContain("CNIL");
    expect(container.textContent).toContain("ENFORCEMENT");
  });
});
