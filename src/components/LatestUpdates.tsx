import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Update {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source_name: string | null;
  source_domain: string | null;
  image_url: string | null;
  category: string;
  regulator: string | null;
  published_at: string;
  is_premium: boolean;
}

const FALLBACK_UPDATES: Update[] = [
  {
    id: "1",
    title: "EDPB Adopts Binding Guidance on Personal Data Use in AI Model Training",
    summary: "EDPB Opinion 28/2026 establishes that training LLMs on scraped personal data without a valid legal basis constitutes a GDPR violation. Controllers must identify a legal basis under Article 6 for each phase.",
    url: "https://edpb.europa.eu",
    source_name: "EDPB",
    source_domain: "edpb.europa.eu",
    image_url: "https://picsum.photos/seed/european-union/400/200",
    category: "eu-uk",
    regulator: "European Data Protection Board",
    published_at: new Date("2026-03-10").toISOString(),
    is_premium: false,
  },
  {
    id: "2",
    title: "Texas AG Files First TDPSA Enforcement Action Against Data Broker",
    summary: "Texas AG filed suit against a national data broker for selling sensitive personal data without required consumer consent, citing failures to honor opt-out requests.",
    url: "https://texasattorneygeneral.gov",
    source_name: "Texas AG",
    source_domain: "texasattorneygeneral.gov",
    image_url: "https://picsum.photos/seed/legal-court/400/200",
    category: "enforcement",
    regulator: "Texas Attorney General",
    published_at: new Date("2026-03-09").toISOString(),
    is_premium: false,
  },
  {
    id: "3",
    title: "ICO Publishes Updated Guidance on Biometric Data in Workplace AI Systems",
    summary: "ICO guidance clarifies that biometric data processed by workplace AI systems is special category data requiring explicit consent or equivalent legal basis.",
    url: "https://ico.org.uk",
    source_name: "ICO",
    source_domain: "ico.org.uk",
    image_url: "https://picsum.photos/seed/artificial-intelligence/400/200",
    category: "ai-privacy",
    regulator: "UK Information Commissioner's Office",
    published_at: new Date("2026-03-08").toISOString(),
    is_premium: false,
  },
  {
    id: "4",
    title: "CPPA Approves Final Automated Decisionmaking Regulations",
    summary: "CPPA board approved final ADMT regulations requiring businesses to provide pre-use notices for automated decisionmaking affecting employment, housing, and credit decisions.",
    url: "https://cppa.ca.gov",
    source_name: "CPPA",
    source_domain: "cppa.ca.gov",
    image_url: "https://picsum.photos/seed/state-capitol/400/200",
    category: "us-states",
    regulator: "California Privacy Protection Agency",
    published_at: new Date("2026-03-07").toISOString(),
    is_premium: false,
  },
  {
    id: "5",
    title: "FTC Proposes Rule Expanding Children's Privacy Protections Under COPPA",
    summary: "FTC proposed rule would require verifiable parental consent for targeted advertising directed at children under 16, and expands the definition of personal information.",
    url: "https://ftc.gov",
    source_name: "FTC",
    source_domain: "ftc.gov",
    image_url: "https://picsum.photos/seed/federal-law/400/200",
    category: "us-federal",
    regulator: "Federal Trade Commission",
    published_at: new Date("2026-03-06").toISOString(),
    is_premium: false,
  },
  {
    id: "6",
    title: "ANPD Issues Guidance on International Data Transfers Under LGPD",
    summary: "ANPD published Resolution No. 19 establishing standard contractual clauses for cross-border data transfers, requiring records of all international transfers.",
    url: "https://gov.br/anpd",
    source_name: "ANPD",
    source_domain: "gov.br",
    image_url: "https://picsum.photos/seed/global-privacy/400/200",
    category: "global",
    regulator: "Brazil ANPD",
    published_at: new Date("2026-03-05").toISOString(),
    is_premium: false,
  },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "us-federal", label: "🇺🇸 U.S. Federal" },
  { key: "us-states", label: "🗺️ U.S. States" },
  { key: "eu-uk", label: "🇪🇺 EU & UK" },
  { key: "global", label: "🌐 Global" },
  { key: "enforcement", label: "⚖️ Enforcement" },
  { key: "ai-privacy", label: "🤖 AI & Privacy" },
];

const CATEGORY_TAG: Record<string, { label: string; classes: string }> = {
  "eu-uk":       { label: "🇪🇺 EU & UK",      classes: "bg-blue/10 text-blue" },
  "us-federal":  { label: "🇺🇸 U.S. Federal", classes: "bg-navy/10 text-navy" },
  "us-states":   { label: "🗺️ U.S. States",   classes: "bg-accent/10 text-accent" },
  "enforcement": { label: "⚖️ Enforcement",   classes: "bg-red-50 text-red-600" },
  "ai-privacy":  { label: "🤖 AI & Privacy",  classes: "bg-purple-50 text-purple-600" },
  "global":      { label: "🌐 Global",         classes: "bg-fog text-slate" },
};

const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal":  "https://picsum.photos/seed/federal-law/400/200",
  "us-states":   "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk":       "https://picsum.photos/seed/european-union/400/200",
  "global":      "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy":  "https://picsum.photos/seed/artificial-intelligence/400/200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SkeletonCard = () => (
  <div className="flex gap-4 p-4 bg-card border border-fog rounded-2xl animate-pulse">
    <div className="w-[100px] h-[68px] rounded-lg bg-muted flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-1/3 bg-muted rounded" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-3 w-2/3 bg-muted rounded" />
      <div className="h-3 w-1/2 bg-muted rounded" />
    </div>
  </div>
);

const LatestUpdates = () => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await (supabase as any)
          .from("updates")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          setUpdates(data as Update[]);
        } else {
          setUpdates(FALLBACK_UPDATES);
        }
      } catch {
        setUpdates(FALLBACK_UPDATES);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    activeFilter === "all"
      ? updates
      : updates.filter((u) => u.category === activeFilter);

  const displayed = filtered.slice(0, 6);
  const tag = (cat: string) => CATEGORY_TAG[cat] || CATEGORY_TAG["global"];

  return (
    <section className="py-10 md:py-16 px-4 md:px-8 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-8">
          <div>
            <h2 className="font-display text-[22px] md:text-[26px] tracking-tight text-navy">
              Latest Updates
            </h2>
            <p className="text-sm text-slate mt-1">
              Updated daily from 250+ monitored regulatory sources
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-7 p-3 md:p-4 bg-card rounded-xl border border-fog shadow-eup-sm items-center">
          {FILTERS.map((f) => (
            <span
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all cursor-pointer ${
                activeFilter === f.key
                  ? "bg-navy/10 text-navy border-navy/25 font-semibold"
                  : "bg-card text-slate border-fog hover:border-silver hover:text-navy"
              }`}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {loading
            ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
            : displayed.map((u) => (
                <a
                  key={u.id}
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-4 p-4 bg-card border border-fog rounded-2xl hover:border-silver hover:shadow-eup-sm hover:-translate-y-px transition-all no-underline cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="w-[100px] h-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={u.image_url || FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          FALLBACK_IMAGES[u.category] || FALLBACK_IMAGES["global"];
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate uppercase tracking-wide">
                        {u.source_domain || u.source_name}
                      </span>
                      <span className="text-silver text-[10px]">·</span>
                      <span className="text-[11px] text-slate/70">
                        {formatDate(u.published_at)}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${tag(u.category).classes}`}>
                        {tag(u.category).label}
                      </span>
                    </div>

                    <h3 className="font-display text-[14px] leading-snug text-navy group-hover:text-blue transition-colors mb-1.5 line-clamp-2">
                      {u.title}
                    </h3>

                    {u.summary && (
                      <p className="text-[12px] text-slate leading-relaxed line-clamp-2">
                        {u.summary}
                      </p>
                    )}
                  </div>

                  {/* Link icon */}
                  <div className="flex-shrink-0 pt-1">
                    <ExternalLink size={13} className="text-slate/40 group-hover:text-blue transition-colors" />
                  </div>
                </a>
              ))}
        </div>

        {/* Empty state */}
        {!loading && displayed.length === 0 && (
          <p className="text-center text-sm text-slate py-8">
            No updates found for this filter.
          </p>
        )}

        {/* View all */}
        {!loading && (
          <div className="text-center mt-8">
            <a href="#" className="inline-flex items-center gap-2 text-[13px] font-medium text-blue hover:text-navy transition-colors no-underline">
              View all updates →
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestUpdates;
