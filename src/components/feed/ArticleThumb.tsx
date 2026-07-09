// Thin composition helper: renders <img> when the article has a real
// image_url (and it loads), otherwise renders the deterministic branded
// SVG glyph from ArticleFallbackImage. Keeps the render sites (ArticleCard,
// AnonymousUpdatesCard, HomepageSpotlight, HomepageFeedPanel, CategoryPage,
// TopicHub) tidy — one component, one place to update fallback behavior.
//
// See FEEDART-3 spec: seed = stable article id/url; category tints accent.
// No text, no label, no eyebrow — text at 40-64px reads as a rendering bug.

import { useState } from "react";
import ArticleFallbackImage, { type FallbackCategory } from "./ArticleFallbackImage";

interface ArticleLike {
  id?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  category?: string | null;
  jurisdiction?: string | string[] | null;
  source_name?: string | null;
  title?: string | null;
}

const CATEGORY_MAP: Record<string, FallbackCategory> = {
  enforcement: "enforcement",
  legislation: "legislation",
  guidance: "guidance",
  opinion: "analysis",
  "ai-privacy": "analysis",
  "ai-regulation": "analysis",
  adtech: "analysis",
  "data-breach": "enforcement",
  "eu-uk": "legislation",
  "us-federal": "legislation",
  "us-states": "legislation",
  global: "analysis",
};

function toFallbackCategory(cat?: string | null): FallbackCategory {
  if (!cat) return "default";
  return CATEGORY_MAP[cat] ?? "default";
}

interface Props {
  item: ArticleLike;
  className?: string;
  /** Passed through to <img> alt; SVG uses aria-label. */
  alt?: string;
}

export default function ArticleThumb({ item, className, alt = "" }: Props) {
  const [errored, setErrored] = useState(false);
  const src = item.image_url;
  if (src && !errored) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={className}
        onError={() => setErrored(true)}
      />
    );
  }
  const seed = (item.id || item.source_url || "eup-article").toString();
  return (
    <ArticleFallbackImage
      seed={seed}
      category={toFallbackCategory(item.category)}
      className={className}
      alt={alt || item.title || undefined}
    />
  );
}
