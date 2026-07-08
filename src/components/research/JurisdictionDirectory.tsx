import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import authoritiesData from "@/data/global_privacy_authorities.json";

type Status = "comprehensive" | "sectoral" | "none" | "pending";
type Adequacy = "adequate" | "partial" | "not_adequate" | "n/a";

interface Entry {
  id: string;
  country: string;
  slug: string;
  authority_name: string;
  authority_abbreviation: string;
  primary_legislation: string;
  legislation_abbreviation: string;
  website: string;
  complaint_portal: string | null;
  notes: string | null;
}

interface RegionGroup {
  region: string;
  entries: Entry[];
}

// Display regions consolidate the raw data regions.
const REGION_MAP: Record<string, string> = {
  "European Union": "Europe & UK",
  "United Kingdom": "Europe & UK",
  "Canada": "Americas",
  "Latin America": "Americas",
  "Other Notable Jurisdictions": "Americas", // mostly US-adjacent / hybrid; refined per-entry below
  "Asia-Pacific": "Asia-Pacific",
  "Middle East & Africa": "Middle East & Africa",
};

const REGION_ORDER = ["Americas", "Europe & UK", "Asia-Pacific", "Middle East & Africa"];

// Per-country overrides where the raw "Other Notable Jurisdictions" bucket
// doesn't fit cleanly into Americas.
const COUNTRY_REGION_OVERRIDE: Record<string, string> = {
  Switzerland: "Europe & UK",
  Russia: "Europe & UK",
  Turkey: "Europe & UK",
};

// Curated metadata overlay. Anything not listed here falls back to sensible
// defaults (comprehensive law, n/a adequacy, no effective date shown).
const META: Record<string, { status?: Status; adequacy?: Adequacy; effective?: string }> = {
  // Europe (all EU + UK + EEA-equivalent)
  "European Union": { status: "comprehensive", adequacy: "adequate", effective: "May 25, 2018" },
  "United Kingdom": { status: "comprehensive", adequacy: "adequate", effective: "Jan 1, 2021" },
  Switzerland: { status: "comprehensive", adequacy: "adequate", effective: "Sep 1, 2023" },
  Norway: { status: "comprehensive", adequacy: "adequate", effective: "Jul 20, 2018" },
  Iceland: { status: "comprehensive", adequacy: "adequate", effective: "Jul 15, 2018" },
  Turkey: { status: "comprehensive", adequacy: "not_adequate", effective: "Apr 7, 2016" },
  Russia: { status: "comprehensive", adequacy: "not_adequate", effective: "Jan 27, 2007" },

  // Americas
  Canada: { status: "comprehensive", adequacy: "adequate", effective: "Jan 1, 2004" },
  Brazil: { status: "comprehensive", adequacy: "partial", effective: "Sep 18, 2020" },
  Argentina: { status: "comprehensive", adequacy: "adequate", effective: "Nov 2, 2000" },
  Mexico: { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 6, 2010" },
  Colombia: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 18, 2012" },
  Chile: { status: "comprehensive", adequacy: "not_adequate", effective: "Aug 28, 1999" },
  Peru: { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 3, 2011" },
  Uruguay: { status: "comprehensive", adequacy: "adequate", effective: "Aug 11, 2008" },

  // Asia-Pacific
  Australia: { status: "comprehensive", adequacy: "not_adequate", effective: "Jan 1, 1989" },
  "New Zealand": { status: "comprehensive", adequacy: "adequate", effective: "Dec 1, 2020" },
  Japan: { status: "comprehensive", adequacy: "adequate", effective: "Apr 1, 2022" },
  "South Korea": { status: "comprehensive", adequacy: "adequate", effective: "Sep 15, 2023" },
  China: { status: "comprehensive", adequacy: "not_adequate", effective: "Nov 1, 2021" },
  India: { status: "comprehensive", adequacy: "not_adequate", effective: "Aug 11, 2023" },
  Singapore: { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 2, 2014" },
  Thailand: { status: "comprehensive", adequacy: "not_adequate", effective: "Jun 1, 2022" },
  Indonesia: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 17, 2024" },
  Philippines: { status: "comprehensive", adequacy: "not_adequate", effective: "Sep 8, 2012" },
  Malaysia: { status: "comprehensive", adequacy: "not_adequate", effective: "Nov 15, 2013" },
  Vietnam: { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 1, 2023" },
  "Hong Kong": { status: "comprehensive", adequacy: "not_adequate", effective: "Dec 20, 1996" },
  Taiwan: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 1, 2012" },

  // Middle East & Africa
  "United Arab Emirates": { status: "comprehensive", adequacy: "not_adequate", effective: "Jan 2, 2022" },
  "Saudi Arabia": { status: "comprehensive", adequacy: "not_adequate", effective: "Sep 14, 2023" },
  Qatar: { status: "comprehensive", adequacy: "not_adequate", effective: "Dec 29, 2016" },
  Bahrain: { status: "comprehensive", adequacy: "not_adequate", effective: "Aug 1, 2019" },
  Israel: { status: "comprehensive", adequacy: "adequate", effective: "Jan 1, 1981" },
  "South Africa": { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 1, 2021" },
  Nigeria: { status: "comprehensive", adequacy: "not_adequate", effective: "Jun 12, 2023" },
  Kenya: { status: "comprehensive", adequacy: "not_adequate", effective: "Nov 25, 2019" },
  Egypt: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 14, 2020" },
  Ghana: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 16, 2012" },
  Morocco: { status: "comprehensive", adequacy: "not_adequate", effective: "Feb 18, 2009" },
  Rwanda: { status: "comprehensive", adequacy: "not_adequate", effective: "Oct 15, 2021" },
  Tunisia: { status: "comprehensive", adequacy: "not_adequate", effective: "Jul 27, 2004" },
};

const STATUS_FILTERS: { value: Status | "all"; label: string; dot: string }[] = [
  { value: "all", label: "All statuses", dot: "bg-slate-300" },
  { value: "comprehensive", label: "Comprehensive law", dot: "bg-emerald-600" },
  { value: "sectoral", label: "Sectoral only", dot: "bg-amber-600" },
  { value: "none", label: "No general law", dot: "bg-slate-400" },
  { value: "pending", label: "Pending legislation", dot: "bg-violet-600" },
];

const STATUS_STYLE: Record<Status, { label: string; pill: string; stripe: string }> = {
  comprehensive: { label: "Comprehensive", pill: "text-emerald-700 bg-emerald-600/10 border border-emerald-600/20", stripe: "bg-emerald-600" },
  sectoral:      { label: "Sectoral",      pill: "text-amber-700 bg-amber-600/10 border border-amber-600/20",       stripe: "bg-amber-600" },
  none:          { label: "No statute",    pill: "text-slate bg-slate-400/15 border border-slate-400/20",            stripe: "bg-slate-400" },
  pending:       { label: "Pending",       pill: "text-violet-700 bg-violet-600/10 border border-violet-600/20",     stripe: "bg-violet-600" },
};

const ADEQUACY_STYLE: Record<Adequacy, { label: string; pill: string }> = {
  adequate:     { label: "EU adequate",     pill: "text-emerald-700 bg-emerald-600/10 border border-emerald-600/20" },
  partial:      { label: "Partial adequacy", pill: "text-amber-700 bg-amber-600/10 border border-amber-600/20" },
  not_adequate: { label: "Not adequate",    pill: "text-rose-700 bg-rose-600/10 border border-rose-600/20" },
  "n/a":        { label: "Adequacy: n/a",   pill: "text-slate bg-slate-400/15 border border-slate-400/20" },
};

function regionFor(rawRegion: string, country: string): string {
  if (COUNTRY_REGION_OVERRIDE[country]) return COUNTRY_REGION_OVERRIDE[country];
  return REGION_MAP[rawRegion] ?? "Asia-Pacific";
}

function metaFor(entry: Entry): { status: Status; adequacy: Adequacy; effective: string | null } {
  // The EU bucket has 28 entries (EDPB + 27 member states). Treat them all as
  // GDPR-governed: comprehensive + adequate + 25 May 2018.
  const isEU =
    entry.legislation_abbreviation?.includes("GDPR") ||
    entry.country === "European Union";
  if (isEU) {
    return { status: "comprehensive", adequacy: "adequate", effective: "May 25, 2018" };
  }
  const m = META[entry.country];
  return {
    status: m?.status ?? "comprehensive",
    adequacy: m?.adequacy ?? "n/a",
    effective: m?.effective ?? null,
  };
}

export function JurisdictionDirectory() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>({
    Americas: true,
    "Europe & UK": true,
    "Asia-Pacific": true,
    "Middle East & Africa": true,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const out: Record<string, Entry[]> = {
      Americas: [],
      "Europe & UK": [],
      "Asia-Pacific": [],
      "Middle East & Africa": [],
    };
    for (const raw of authoritiesData as RegionGroup[]) {
      for (const entry of raw.entries) {
        const region = regionFor(raw.region, entry.country);
        out[region]?.push(entry);
      }
    }
    return out;
  }, []);

  const filteredCount = (entries: Entry[]) =>
    entries.filter((e) => filter === "all" || metaFor(e).status === filter).length;

  const totalShown = REGION_ORDER.reduce((sum, r) => sum + filteredCount(grouped[r] ?? []), 0);

  return (
    <div className="space-y-5">
      {/* Filter bar + legend */}
      <div className="rounded-xl border border-brand-cloud bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-meta font-semibold tracking-wider uppercase text-slate mr-1">
            Status:
          </span>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-full transition-all cursor-pointer ${
                filter === f.value
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-card text-slate border-brand-cloud hover:border-brand-navy/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${f.dot}`} aria-hidden />
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-meta text-slate">{totalShown} jurisdictions</span>
        </div>
        <div className="text-meta text-brand-mist">
          Adequacy refers to EU GDPR adequacy status. EU member states are inherently adequate; UK
          and Switzerland hold standalone adequacy decisions.
        </div>
      </div>

      {/* Regional groups */}
      {REGION_ORDER.map((region) => {
        const all = grouped[region] ?? [];
        const visible = all.filter((e) => filter === "all" || metaFor(e).status === filter);
        if (visible.length === 0) return null;
        const isOpen = openRegions[region] ?? true;
        return (
          <section key={region} className="rounded-xl border border-brand-cloud bg-card overflow-hidden">
            <button
              onClick={() =>
                setOpenRegions((s) => ({ ...s, [region]: !isOpen }))
              }
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-brand-navy text-white hover:bg-brand-ocean transition-colors"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-3">
                <span className="font-display text-base md:text-lg">{region}</span>
                <span className="text-meta font-semibold uppercase tracking-wider text-white/70">
                  {visible.length}
                  {visible.length !== all.length && ` / ${all.length}`} jurisdictions
                </span>
              </span>
              <span className={`text-white/80 text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                {visible.map((entry) => {
                  const m = metaFor(entry);
                  const sStyle = STATUS_STYLE[m.status];
                  const aStyle = ADEQUACY_STYLE[m.adequacy];
                  const key = entry.id;
                  const open = expanded[key];
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[4px_1fr] items-stretch bg-brand-cloud/40 rounded-lg border border-brand-cloud hover:border-brand-navy/30 transition overflow-hidden"
                    >
                      <div className={`${sStyle.stripe} self-stretch`} aria-hidden />
                      <div className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <Link
                            to={`/jurisdiction/${entry.slug}`}
                            className="font-display text-base md:text-[17px] leading-tight text-brand-navy no-underline hover:underline"
                          >
                            {entry.country}
                          </Link>
                          <div className="flex flex-wrap gap-1 justify-end shrink-0">
                            <span className={`text-eyebrow px-2 py-0.5 rounded ${sStyle.pill}`}>
                              {sStyle.label}
                            </span>
                            {m.adequacy !== "n/a" && (
                              <span className={`text-eyebrow px-2 py-0.5 rounded ${aStyle.pill}`}>
                                {aStyle.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Primary fields */}
                        <div className="space-y-1 text-meta">
                          <div>
                            <span className="text-brand-mist uppercase tracking-wider font-semibold mr-1.5">Law:</span>
                            <span className="text-brand-navy font-medium">{entry.primary_legislation}</span>
                          </div>
                          {m.effective && (
                            <div>
                              <span className="text-brand-mist uppercase tracking-wider font-semibold mr-1.5">Effective:</span>
                              <span className="text-brand-navy">{m.effective}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-brand-mist uppercase tracking-wider font-semibold mr-1.5">Authority:</span>
                            <span className="text-brand-navy">
                              {entry.authority_name}
                              {entry.authority_abbreviation && entry.authority_abbreviation !== entry.authority_name && (
                                <span className="text-brand-mist"> ({entry.authority_abbreviation})</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Expandable secondary detail */}
                        <button
                          onClick={() => setExpanded((s) => ({ ...s, [key]: !open }))}
                          className="mt-2 text-meta font-semibold text-brand-teal-text hover:underline"
                        >
                          {open ? "Hide detail ▲" : "Show detail ▼"}
                        </button>
                        {open && (
                          <div className="mt-2 pt-2 border-t border-brand-cloud space-y-1.5 text-meta text-slate leading-relaxed">
                            {entry.notes && <p>{entry.notes}</p>}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                              <a
                                href={entry.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-teal-text font-semibold no-underline hover:underline"
                              >
                                Authority site ↗
                              </a>
                              {entry.complaint_portal && (
                                <a
                                  href={entry.complaint_portal}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-teal-text font-semibold no-underline hover:underline"
                                >
                                  Complaint portal ↗
                                </a>
                              )}
                              <Link
                                to={`/jurisdiction/${entry.slug}`}
                                className="text-brand-teal-text font-semibold no-underline hover:underline"
                              >
                                Full jurisdiction page →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
