import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export interface LegalSection {
  id: string;
  label: string;
}

interface LegalPageLayoutProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  lastUpdated: string;
  ariaLabel: string;
  sections: LegalSection[];
  /** Summary body content — omit to render the awaiting-Legal placeholder marker. */
  summary?: ReactNode;
  children: ReactNode;
}

/**
 * Shared shell for long-form legal reference pages (Terms, Privacy Policy).
 * Provides:
 *   - Navbar + Footer chrome
 *   - Page H1 + last-updated metadata slot
 *   - Labelled summary-box slot (label pre-approved; text supplied later by Legal)
 *   - Pure-HTML anchor navigation to intra-page sections
 *
 * Body prose typography (font-serif-text text-fluid-base text-ink) is applied
 * by the child prose container in each consuming page, not by this shell —
 * this shell is layout-only and never restyles the summary or anchor-nav chrome.
 */
export default function LegalPageLayout({
  title,
  metaTitle,
  metaDescription,
  lastUpdated,
  ariaLabel,
  sections,
  summary,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
      </Helmet>
      <Navbar />
      <main
        id="main-content"
        aria-label={ariaLabel}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20"
      >
        <h1 className="font-display text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        {summary && (
          <aside
            aria-label="Summary"
            className="mb-8 rounded-lg border border-border bg-muted/40 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Summary (not a substitute for the full terms below)
            </p>
            {summary}
          </aside>
        )}

        <nav
          aria-label="Section navigation"
          className="mb-10 rounded-lg border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            On this page
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-primary hover:underline no-underline"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {children}
      </main>
      <Footer />
    </div>
  );
}
