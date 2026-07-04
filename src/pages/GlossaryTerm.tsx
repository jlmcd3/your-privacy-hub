import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import glossaryData from "@/data/glossary.json";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SourceMethodology from "@/components/research/SourceMethodology";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const GlossaryTerm = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isPremium } = usePremiumStatus();
  const term = glossaryData.find((t) => t.slug === slug);

  if (!term) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-foreground mb-4">Term Not Found</h1>
          <Link to="/glossary" className="text-primary hover:underline">Back to Glossary →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedTerms = term.related
    .map((slug) => glossaryData.find((t) => t.slug === slug))
    .filter(Boolean) as typeof glossaryData;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{term.term} — Privacy Law Definition | End User Privacy</title>
        <meta name="description" content={`What does "${term.term}" mean in privacy law? Plain-English definition, related regulations (${term.regulations.join(", ")}), and linked terms.`} />
      </Helmet>
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <Link to="/glossary" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors no-underline mb-4 inline-block">
            ← Back to Glossary
          </Link>
          <h1 className="text-foreground mb-3">{term.term}</h1>
          <div className="flex gap-1.5 flex-wrap">
            {term.regulations.map((r) => (
              <span key={r} className="font-mono-code text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{r}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-foreground mb-3">Definition</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{term.definition}</p>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Source:{" "}
            {(() => {
              const t = term as typeof term & {
                sourceUrl?: string;
                sources?: Array<{ label: string; url: string | null }>;
              };
              const linkClass = "text-primary no-underline hover:underline";
              if (Array.isArray(t.sources) && t.sources.length > 0) {
                return t.sources.map((item, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {item.label}
                      </a>
                    ) : (
                      item.label
                    )}
                  </span>
                ));
              }
              if (typeof t.sourceUrl === "string" && t.sourceUrl) {
                return (
                  <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {term.source}
                  </a>
                );
              }
              return term.source;
            })()}
          </p>
          {(() => {
            const t = term as typeof term & {
              additionalLinks?: Array<{ label: string; url: string }>;
            };
            if (!Array.isArray(t.additionalLinks) || t.additionalLinks.length === 0) return null;
            return (
              <div className="mt-2 space-y-1">
                {t.additionalLinks.map((link, i) => (
                  <p key={i} className="text-xs text-muted-foreground italic">
                    {link.label}:{" "}
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary no-underline hover:underline"
                    >
                      {link.url}
                    </a>
                  </p>
                ))}
              </div>
            );
          })()}
        </div>

        {(() => {
          const t = term as typeof term & {
            definitionsByRegime?: Array<{ regime: string; citation: string; text: string; url?: string }>;
          };
          if (!Array.isArray(t.definitionsByRegime) || t.definitionsByRegime.length === 0) return null;
          return (
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <h2 className="text-foreground mb-1">Definitions across regimes</h2>
              <p className="text-xs text-muted-foreground mb-4">How this term is defined in each major privacy regime. Definitions vary — read the source text before relying on any one summary.</p>
              <div className="space-y-4">
                {t.definitionsByRegime.map((d, i) => (
                  <div key={i} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-foreground">{d.regime}</p>
                      <span className="font-mono-code text-[11px] text-muted-foreground">{d.citation}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.text}</p>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-primary underline underline-offset-2 hover:text-primary/80 mt-2 inline-block"
                      >
                        View source ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}


        {relatedTerms.length > 0 && (
          <div>
            <h2 className="text-foreground mb-3">Related Terms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedTerms.map((rt) => (
                <Link
                  key={rt.slug}
                  to={`/glossary/${rt.slug}`}
                  className="p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all no-underline"
                >
                  <p className="text-sm font-medium text-foreground">{rt.term}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{rt.definition}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!isPremium && (
          <div className="mt-12 bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-sm font-bold text-foreground mb-2">Get weekly updates on regulatory changes</p>
            <p className="text-xs text-muted-foreground mb-4">Stay informed on how these terms apply to emerging enforcement actions and guidance.</p>
            <Link to="/subscribe" className="inline-block px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity no-underline">
              View Intelligence Plans →
            </Link>
          </div>
        )}
        <div className="mt-10">
          <SourceMethodology />
        </div>
      </div>


      <Footer />
    </div>
  );
};

export default GlossaryTerm;
