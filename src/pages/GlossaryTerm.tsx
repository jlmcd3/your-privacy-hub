import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import glossaryData from "@/data/glossary.json";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const GlossaryTerm = () => {
  const { slug } = useParams<{ slug: string }>();
  const term = glossaryData.find((t) => t.slug === slug);

  if (!term) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Topbar />
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-2xl font-bold text-foreground mb-4">Term Not Found</h1>
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
        <title>{term.term} — Privacy Law Definition | EndUserPrivacy</title>
        <meta name="description" content={`What does "${term.term}" mean in privacy law? Plain-English definition, related regulations (${term.regulations.join(", ")}), and linked terms.`} />
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
          <Link to="/glossary" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors no-underline mb-4 inline-block">
            ← Back to Glossary
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">{term.term}</h1>
          <div className="flex gap-1.5 flex-wrap">
            {term.regulations.map((r) => (
              <span key={r} className="font-mono-code text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{r}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex-1">
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Definition</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{term.definition}</p>
          <p className="text-xs text-muted-foreground mt-4 italic">Source: {term.source}</p>
        </div>

        <AdBanner variant="inline" adSlot="eup-glossaryterm-mid" className="py-3" />

        {relatedTerms.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">Related Terms</h2>
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

        <div className="mt-12 bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-sm font-bold text-foreground mb-2">Get weekly updates on regulatory changes</p>
          <p className="text-xs text-muted-foreground mb-4">Stay informed on how these terms apply to emerging enforcement actions and guidance.</p>
          <Link to="/subscribe" className="inline-block px-5 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity no-underline">
            View Premium Plans →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GlossaryTerm;
