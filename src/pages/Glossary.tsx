import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import glossaryData from "@/data/glossary.json";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Glossary = () => {
  const [search, setSearch] = useState("");

  const sorted = [...glossaryData].sort((a, b) => a.term.localeCompare(b.term));
  const filtered = search
    ? sorted.filter((t) => t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase()))
    : sorted;

  const grouped = alphabet.reduce((acc, letter) => {
    const terms = filtered.filter((t) => t.term[0].toUpperCase() === letter);
    if (terms.length > 0) acc[letter] = terms;
    return acc;
  }, {} as Record<string, typeof glossaryData>);

  const groupedEntries = Object.entries(grouped);
  const midIndex = Math.ceil(groupedEntries.length / 2);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Privacy Law Glossary — {glossaryData.length}+ Terms Defined | EndUserPrivacy</title>
        <meta name="description" content="Plain-English definitions of GDPR, CCPA, PIPL, and global privacy law terms. Searchable A–Z glossary for DPOs, lawyers, and compliance professionals." />
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">📖 Reference</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">Privacy Law Glossary</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Plain-English definitions of key privacy and data protection terms sourced from regulation text. {glossaryData.length} terms and growing.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        <input
          type="text"
          placeholder="Search terms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary transition-colors mb-8"
        />

        {/* Alphabet nav */}
        <div className="flex flex-wrap gap-1 mb-8">
          {alphabet.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg no-underline transition-colors ${
                grouped[l] ? "text-primary hover:bg-primary/10" : "text-muted-foreground/30 pointer-events-none"
              }`}
            >
              {l}
            </a>
          ))}
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-glossary-top" className="py-3" />

        {groupedEntries.map(([letter, terms], idx) => (
          <div key={letter}>
            <div id={`letter-${letter}`} className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">{letter}</h2>
              <div className="space-y-3">
                {terms.map((t) => (
                  <Link
                    key={t.slug}
                    to={`/glossary/${t.slug}`}
                    className="block p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all no-underline"
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-1">{t.term}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{t.definition}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {t.regulations.map((r) => (
                        <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{r}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            {idx === midIndex - 1 && (
              <AdBanner variant="inline" adSlot="eup-glossary-mid" className="py-4" />
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No terms found matching "{search}"</p>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Glossary;
