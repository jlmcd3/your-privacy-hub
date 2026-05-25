import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import glossaryData from "@/data/glossary.json";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

type Term = (typeof glossaryData)[number];

// Theme groupings by slug
const THEMES: { id: string; label: string; description: string; slugs: string[] }[] = [
  {
    id: "foundational",
    label: "Foundational concepts",
    description: "Core building blocks every privacy program references.",
    slugs: [
      "data-controller", "data-processor", "joint-controller", "data-subject", "personal-data",
      "special-category-data", "sensitive-data", "biometric-data", "inferred-data",
      "lawful-basis", "legitimate-interest", "consent", "purpose-limitation",
      "data-minimisation", "storage-limitation", "privacy-by-design",
    ],
  },
  {
    id: "compliance",
    label: "Compliance obligations",
    description: "What organisations must produce, document, or notify.",
    slugs: [
      "dpia", "ropa", "data-breach-notification", "dpo", "dpa",
      "supervisory-authority", "lead-supervisory-authority", "one-stop-shop", "edpb",
      "profiling", "automated-decision-making", "dark-patterns",
    ],
  },
  {
    id: "rights",
    label: "Individual rights",
    description: "Rights granted to data subjects and consumers.",
    slugs: [
      "dsar", "right-to-erasure", "right-to-portability",
      "opt-out-right", "universal-opt-out",
    ],
  },
  {
    id: "transfers",
    label: "Transfers & adequacy",
    description: "Cross-border movement of personal data.",
    slugs: [
      "standard-contractual-clauses", "adequacy-decision", "data-transfers",
      "binding-corporate-rules", "data-localization",
    ],
  },
];

// "See in practice" — slug → tool route + label
const TOOL_LINKS: Record<string, { href: string; label: string }> = {
  "legitimate-interest": { href: "/lia-tool", label: "Run a Legitimate Interest Assessment" },
  dpia: { href: "/dpia-framework", label: "Open the DPIA Builder" },
  dpa: { href: "/dpa-generator", label: "Generate a Data Processing Agreement" },
  ropa: { href: "/ropa-builder", label: "Build your Record of Processing" },
  consent: { href: "/cookie-consent", label: "Configure a consent banner" },
  "data-breach-notification": { href: "/breach-notification", label: "Breach notification workflow" },
  dsar: { href: "/dsar-handler", label: "Open the DSAR handler" },
  "privacy-by-design": { href: "/governance", label: "See Governance framework" },
  "standard-contractual-clauses": { href: "/dpa-generator", label: "Add SCCs via DPA Generator" },
  "data-transfers": { href: "/transfer-impact-assessment", label: "Run a Transfer Impact Assessment" },
  profiling: { href: "/cppa-risk-assessment", label: "CPPA ADMT Risk Assessment" },
  "automated-decision-making": { href: "/cppa-risk-assessment", label: "CPPA ADMT Risk Assessment" },
};

const THEMED_SLUGS = new Set(THEMES.flatMap((t) => t.slugs));

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-brand-navy rounded-sm px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

const TermCard = ({ t, q }: { t: Term; q: string }) => {
  const tool = TOOL_LINKS[t.slug];
  return (
    <div className="block p-4 bg-card border border-brand-cloud rounded-xl hover:border-brand-teal/30 hover:shadow-eup-sm transition-all">
      <Link to={`/glossary/${t.slug}`} className="no-underline">
        <h3 className="text-brand-navy mb-1">{highlight(t.term, q)}</h3>
        <p className="text-xs text-slate line-clamp-2 leading-relaxed">{t.definition}</p>
      </Link>
      <div className="flex gap-1.5 mt-2 flex-wrap items-center">
        {t.regulations && t.regulations.length > 0 && (
          <span className="text-meta text-brand-mist uppercase tracking-wider font-semibold mr-0.5">
            Regulated in:
          </span>
        )}
        {(t.regulations || []).map((r) => (
          <span
            key={r}
            className="font-mono-code text-meta px-1.5 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal font-medium"
          >
            {r}
          </span>
        ))}
      </div>
      {tool && (
        <div className="mt-3 pt-3 border-t border-brand-cloud">
          <Link to={tool.href} className="text-xs font-semibold text-accent hover:underline no-underline">
            See in practice → {tool.label}
          </Link>
        </div>
      )}
    </div>
  );
};

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const Glossary = () => {
  const [query, setQuery] = useState("");
  const [openThemes, setOpenThemes] = useState<Record<string, boolean>>({
    foundational: true,
    compliance: true,
    rights: true,
    transfers: true,
  });

  const q = query.trim().toLowerCase();

  const matches = (t: Term) =>
    !q ||
    t.term.toLowerCase().includes(q) ||
    t.definition.toLowerCase().includes(q) ||
    (t.regulations || []).some((r) => r.toLowerCase().includes(q));

  const bySlug = useMemo(
    () => Object.fromEntries((glossaryData as Term[]).map((t) => [t.slug, t])),
    []
  );

  const themedGroups = THEMES.map((theme) => {
    const items = theme.slugs.map((s) => bySlug[s]).filter(Boolean).filter(matches);
    return { ...theme, items };
  });

  const otherTerms = (glossaryData as Term[]).filter((t) => !THEMED_SLUGS.has(t.slug)).filter(matches);
  const sortedOther = [...otherTerms].sort((a, b) => a.term.localeCompare(b.term));

  const groupedAZ = alphabet.reduce((acc, letter) => {
    const terms = sortedOther.filter((t) => t.term[0].toUpperCase() === letter);
    if (terms.length > 0) acc[letter] = terms;
    return acc;
  }, {} as Record<string, Term[]>);

  const totalMatches =
    themedGroups.reduce((n, g) => n + g.items.length, 0) + sortedOther.length;

  const toggleTheme = (id: string) => setOpenThemes((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="min-h-screen flex flex-col bg-brand-cloud">
      <Helmet>
        <title>Privacy Law Glossary 2026 — GDPR, CCPA &amp; Data Protection Terms | End User Privacy</title>
        <meta
          name="description"
          content="Plain-English definitions of key privacy and data protection terms, grouped by theme with links to compliance tools. GDPR, CCPA, AI Act and more."
        />
      </Helmet>
      <Navbar />

      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            📖 Reference
          </span>
          <h1 className="font-serif text-white mb-3">Privacy Law Glossary</h1>
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
            Plain-English definitions of key privacy and data protection terms sourced from regulation text,
            grouped by theme. {glossaryData.length} terms and growing.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Search */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-brand-cloud/95 backdrop-blur border-b border-brand-cloud mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mist w-4 h-4" />
            <input
              type="search"
              placeholder="Search terms, definitions, or regulations (e.g. consent, GDPR, DPIA)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 text-sm border border-silver rounded-lg bg-card text-brand-navy outline-none focus:border-brand-teal transition-colors"
            />
          </div>
          {q && (
            <p className="text-xs text-slate mt-2">
              {totalMatches} {totalMatches === 1 ? "match" : "matches"} for "{query}"
            </p>
          )}
        </div>

        {/* Theme jump nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          {THEMES.map((t) => (
            <a
              key={t.id}
              href={`#theme-${t.id}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-card border border-silver text-brand-navy hover:border-accent no-underline"
            >
              {t.label}
            </a>
          ))}
          <a
            href="#az"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-card border border-silver text-brand-navy hover:border-accent no-underline"
          >
            A–Z index
          </a>
        </div>

        <AdBanner variant="leaderboard" className="my-4" />

        {/* Themed groups */}
        <div className="space-y-4 mb-10">
          {themedGroups.map((theme) => {
            const isOpen = openThemes[theme.id] || !!q;
            if (q && theme.items.length === 0) return null;
            return (
              <section
                key={theme.id}
                id={`theme-${theme.id}`}
                className="border border-brand-cloud rounded-xl bg-card overflow-hidden scroll-mt-24"
              >
                <button
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-brand-cloud transition-colors"
                >
                  <div>
                    <h2 className="text-brand-navy text-lg mb-0.5 flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      {theme.label}
                      <span className="text-xs font-normal text-brand-mist">({theme.items.length})</span>
                    </h2>
                    <p className="text-xs text-slate ml-6">{theme.description}</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 grid gap-3 sm:grid-cols-2">
                    {theme.items.map((t) => (
                      <TermCard key={t.slug} t={t} q={q} />
                    ))}
                    {theme.items.length === 0 && (
                      <p className="text-xs text-slate col-span-full">No terms in this theme.</p>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* A–Z for everything else */}
        <div id="az" className="scroll-mt-24">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-brand-navy">A–Z index</h2>
            <span className="text-xs text-slate">{sortedOther.length} additional terms</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-6">
            {alphabet.map((l) => (
              <a
                key={l}
                href={`#letter-${l}`}
                className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg no-underline transition-colors ${
                  groupedAZ[l] ? "text-brand-teal hover:bg-brand-teal/10" : "text-slate/30 pointer-events-none"
                }`}
              >
                {l}
              </a>
            ))}
          </div>

          {Object.entries(groupedAZ).map(([letter, terms]) => (
            <div key={letter} id={`letter-${letter}`} className="mb-8 scroll-mt-24">
              <h3 className="text-brand-navy mb-4 border-b border-brand-cloud pb-2">{letter}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {terms.map((t) => (
                  <TermCard key={t.slug} t={t} q={q} />
                ))}
              </div>
            </div>
          ))}

          {sortedOther.length === 0 && q && (
            <p className="text-sm text-slate">No additional matches in the A–Z index.</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Glossary;
