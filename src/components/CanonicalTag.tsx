import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sets a single <link rel="canonical"> tag in the document head based on the
 * current pathname. Mounted once inside <BrowserRouter> in App.tsx so every
 * route — including ones whose page components do not set their own canonical —
 * gets a canonical URL for SEO.
 *
 * If a route component sets its own canonical via Helmet, this component
 * still ensures exactly one canonical exists (the most recently written one
 * wins per pathname change).
 */
const SITE_ORIGIN = "https://enduserprivacy.com";

export default function CanonicalTag() {
  const { pathname } = useLocation();

  useEffect(() => {
    const href = `${SITE_ORIGIN}${pathname}`;
    // Remove any pre-existing canonical link(s) we previously injected.
    const existing = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="canonical"][data-canonical-tag="auto"]',
    );
    existing.forEach((el) => el.remove());

    // If a page-level Helmet already set a canonical, leave it alone.
    const pageCanonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]:not([data-canonical-tag="auto"])',
    );
    if (pageCanonical) return;

    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", href);
    link.setAttribute("data-canonical-tag", "auto");
    document.head.appendChild(link);
  }, [pathname]);

  return null;
}
