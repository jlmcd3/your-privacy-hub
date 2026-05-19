import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import glossaryData from "@/data/glossary.json";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Glossary = () => {
  const sorted = [...glossaryData].sort((a, b) => a.term.localeCompare(b.term));
  const filtered = sorted;

  const grouped = alphabet.reduce((acc, letter) => {
    const terms = filtered.filter((t) => t.term[0].toUpperCase() === letter);
    if (terms.length > 0) acc[letter] = terms;
    return acc;
  }, {} as Record<string, typeof glossaryData>);

  const groupedEntries = Object.entries(grouped);
  const midIndex = Math.ceil(groupedEntries.length / 2);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Helmet>
        <title>Privacy Law Glossary 2026 — GDPR, CCPA &amp; Data Protection Terms | End User Privacy</title>
        <meta name="description" content="Plain-English definitions of key privacy and data protection terms. GDPR, CCPA, AI Act, biometric data, data subject rights, and 80+ more terms with legal citations." />
      </Helmet>
      <Navbar />

      <div className="border-b border-fog bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <p className="text-sm font-medium text-slate mb-2">📖 Reference</p>
          <h1 className="text-navy mb-3">Privacy Law Glossary</h1>
          <p className="text-slate max-w-2xl leading-relaxed">
            Plain-English definitions of key privacy and data protection terms sourced from regulation text. {glossaryData.length} terms and growing.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Alphabet nav */}
        <div className="flex flex-wrap gap-1 mb-8">
          {alphabet.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg no-underline transition-colors ${
                grouped[l] ? "text-blue hover:bg-blue/10" : "text-slate/30 pointer-events-none"
              }`}
            >
              {l}
            </a>
          ))}
        </div>

        <AdBanner variant="leaderboard" className="my-4" />

        {groupedEntries.map(([letter, terms], idx) => (
          <div key={letter}>
            <div id={`letter-${letter}`} className="mb-8">
              <h2 className="text-navy mb-4 border-b border-fog pb-2">{letter}</h2>
              <div className="space-y-3">
                {terms.map((t) => (
                  <Link
                    key={t.slug}
                    to={`/glossary/${t.slug}`}
                    className="block p-4 bg-card border border-fog rounded-xl hover:border-blue/30 hover:shadow-eup-sm transition-all no-underline"
                  >
                    <h3 className="text-navy mb-1">{t.term}</h3>
                    <p className="text-xs text-slate line-clamp-2 leading-relaxed">{t.definition}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {t.regulations.map((r) => (
                        <span key={r} className="font-mono-code text-meta px-1.5 py-0.5 rounded-full bg-blue/10 text-blue font-medium">{r}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </div>
  );
};

export default Glossary;
