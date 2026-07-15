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

const ROUTE_TITLES: Record<string, string> = {
  "/": "Global Privacy Law, Tracked Daily | End User Privacy",
  "/about": "About | End User Privacy",
  "/contact": "Contact | End User Privacy",
  "/faq": "FAQ | End User Privacy",
  "/privacy-policy": "Privacy Policy | End User Privacy",
  "/terms": "Terms of Service | End User Privacy",
  "/ropa-builder": "RoPA Builder | End User Privacy",
  "/registration-manager": "Privacy Registration Manager | End User Privacy",
  "/legitimate-interest-tracker": "Legitimate Interest Tracker | End User Privacy",
  "/li-assessment": "Legitimate Interest Assessment | End User Privacy",
  "/breach-notification": "Breach Notification Requirements | End User Privacy",
  "/cross-border-transfers": "Cross-Border Data Transfers | End User Privacy",
  "/cppa-scope-checker": "CPPA Scope Checker | End User Privacy",
  "/us-privacy-laws": "U.S. Privacy Laws Guide | End User Privacy",
};

export default function CanonicalTag() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    currentUrl.protocol = "https:";
    currentUrl.host = new URL(SITE_ORIGIN).host;
    currentUrl.search = "";
    currentUrl.hash = "";
    const href = currentUrl.toString();
    const title = ROUTE_TITLES[pathname];

    const syncHead = () => {
      const canonicals = Array.from(
        document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
      );
      const link = canonicals[0] ?? document.createElement("link");

      if (!link.parentNode) {
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }

      if (link.getAttribute("href") !== href) {
        link.setAttribute("href", href);
      }
      if (link.getAttribute("data-canonical-tag") !== "route") {
        link.setAttribute("data-canonical-tag", "route");
      }
      canonicals.slice(1).forEach((el) => el.remove());

      if (title && document.title !== title) {
        document.title = title;
      }
    };

    syncHead();
    const raf = window.requestAnimationFrame(syncHead);
    const timeout = window.setTimeout(syncHead, 0);
    const finalTimeout = window.setTimeout(syncHead, 250);
    const observer = new MutationObserver(syncHead);
    observer.observe(document.head, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      window.clearTimeout(finalTimeout);
      observer.disconnect();
    };
  }, [pathname, search]);

  return null;
}
