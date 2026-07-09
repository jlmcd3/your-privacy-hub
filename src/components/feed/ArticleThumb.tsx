// Thin composition helper: renders <img> when the article has a real
// image_url (and it loads), otherwise renders the deterministic branded
// SVG tile from ArticleFallbackImage. Keeps the render sites (ArticleCard,
// AnonymousUpdatesCard, HomepageSpotlight, HomepageFeedPanel, CategoryPage,
// TopicHub) tidy — one component, one place to update fallback behavior.
//
// See FEEDART-1 spec: seed = stable article id/url; label = jurisdiction
// or short regulator; eyebrow = category label; category tints accent.

import { useState } from "react";
import ArticleFallbackImage, { type FallbackCategory } from "./ArticleFallbackImage";
import { categoryLabel } from "@/config/categories";

interface ArticleLike {
  id?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  category?: string | null;
  jurisdiction?: string | string[] | null;
  source_name?: string | null;
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

function deriveLabel(item: ArticleLike): string | undefined {
  const jur = Array.isArray(item.jurisdiction)
    ? (item.jurisdiction[0] ?? "")
    : (item.jurisdiction ?? "");
  const j = (jur || "").toString().trim();
  if (j && j.length <= 18) return j;
  const src = (item.source_name || "").trim();
  if (src && src.length <= 18) return src;
  return undefined;
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
  const eyebrow = item.category ? categoryLabel(item.category) : undefined;
  return (
    <ArticleFallbackImage
      seed={seed}
      label={deriveLabel(item)}
      eyebrow={eyebrow || undefined}
      category={toFallbackCategory(item.category)}
      className={className}
    />
  );
}
