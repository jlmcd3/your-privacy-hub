import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { slugify } from "@/lib/utils";
import usStatesRaw from "@/data/us_state_privacy_authorities.json";
import { useStateLawOverrides, applyOverride } from "@/hooks/useStateLawOverrides";

const STATUS_STYLE: Record<string, { stripe: string; pill: string; subtitle: (d: string | null) => string }> = {
  Enacted: {
    stripe: "bg-emerald-600",
    pill: "text-emerald-700 bg-emerald-600/10",
    subtitle: (d) => (d ? `Effective ${d}` : "Enacted"),
  },
  Pending: {
    stripe: "bg-amber-600",
    pill: "text-amber-700 bg-amber-600/10",
    subtitle: (d) => (d ? `Effective ${d}` : "Pending legislation"),
  },
  None: {
    stripe: "bg-slate-400",
    pill: "text-slate bg-slate-400/15",
    subtitle: () => "No statute",
  },
};

const getStatusStyle = (s: string | null) => STATUS_STYLE[s || "None"] || STATUS_STYLE.None;

const USStateAuthorities = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const overrides = useStateLawOverrides();
  const usStates = (usStatesRaw as any[]).map((s) => applyOverride(s, overrides));

  const filtered = usStates.filter((state: any) => {
    const matchesSearch = !searchTerm || 
      state.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.authority_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (state.statute_name && state.statute_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "All" || state.statute_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusFilters = ["All", "Enacted", "Pending", "None"];

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>U.S. State Privacy Authorities Directory | End User Privacy</title>
        <meta name="description" content="Complete directory of privacy regulatory authorities across all 50 U.S. states. Statute names, enforcement status, websites, and complaint portals." />
      </Helmet>
      <Navbar />
      <div className="bg-gradient-to-br from-brand-ocean to-brand-slate-teal py-12 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-brand-mist mb-4 bg-brand-mist/10 px-3 py-1.5 rounded-full border border-brand-mist/20">
            🏛️ Authority Directory
          </div>
          <h1 className="font-display text-white mb-3">U.S. State Privacy Authorities</h1>
          <p className="text-base text-brand-mist max-w-[700px]">
            Comprehensive directory of privacy regulatory authorities across all 50 U.S. states and Washington, D.C. Includes statute names, enforcement status, official websites, and complaint portals.
          </p>
        </div>
      </div>


      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex gap-3 items-center mb-8 p-4 bg-card rounded-xl border border-brand-cloud shadow-eup-sm">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-mist w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-10 text-sm border border-silver rounded-lg bg-brand-cloud text-brand-navy outline-none focus:border-brand-teal transition-colors"
              placeholder="Search states, authorities, or statutes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-brand-mist hover:text-brand-navy hover:bg-card transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate">Status:</span>
          {statusFilters.map((f) => (
            <span
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 text-xs font-medium border rounded-full cursor-pointer transition-all ${
                statusFilter === f
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-card text-slate border-silver hover:bg-brand-navy hover:text-white hover:border-brand-navy"
              }`}
            >
              {f}
            </span>
          ))}
          <span className="ml-auto text-[12px] text-brand-mist">{filtered.length} results</span>
        </div>

        {/* Compare CTA */}
        <div className="mb-4">
          <Link
            to="/compare/us-states"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-brand-teal border border-brand-teal/30 rounded-lg hover:bg-brand-teal hover:text-white hover:border-brand-teal transition-colors no-underline"
          >
            Compare enacted state laws side by side →
          </Link>
        </div>

        {/* Authority list */}
        <div className="flex flex-col gap-2">
          {filtered.map((state: any) => {
            const status = state.statute_status || "None";
            const style = getStatusStyle(state.statute_status);
            const showView = status === "Enacted" || status === "Pending";
            const slug = slugify(state.state);
            return (
              <div
                key={state.id}
                className="grid grid-cols-[4px_minmax(170px,200px)_1fr_minmax(180px,260px)_100px_140px] items-stretch bg-card rounded-lg border border-brand-cloud hover:border-brand-navy/30 hover:shadow-eup-sm transition overflow-hidden"
              >
                <div className={`${style.stripe} self-stretch`} aria-hidden="true" />

                <div className="px-5 py-4">
                  <Link
                    to={`/jurisdiction/${slug}`}
                    className="font-display text-[20px] leading-tight text-brand-navy no-underline hover:underline"
                  >
                    {state.state}
                  </Link>
                  <div className="text-[11px] uppercase tracking-wider text-brand-mist mt-0.5">
                    {style.subtitle(state.effective_date)}
                  </div>
                </div>

                <div className="py-4 pr-4">
                  <div className="text-sm font-semibold text-brand-navy leading-snug">
                    {state.authority_name}
                  </div>
                  <div className="text-xs text-slate mt-0.5">{state.authority_type}</div>
                </div>

                <div className="py-4 pr-4 text-sm leading-snug">
                  {state.statute_name && state.statute_url ? (
                    <a
                      href={state.statute_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="italic text-brand-teal hover:text-brand-navy no-underline"
                    >
                      {state.statute_name} ↗
                    </a>
                  ) : state.statute_name ? (
                    <span className="italic text-brand-navy/80">{state.statute_name}</span>
                  ) : (
                    <span className="italic text-brand-mist">No statute enacted</span>
                  )}
                </div>

                <div className="py-4 flex items-center">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded ${style.pill}`}>
                    {status}
                  </span>
                </div>

                <div className="py-4 pr-4 flex items-center gap-3 text-[12px] font-medium">
                  {showView && (
                    <Link
                      to={`/jurisdiction/${slug}`}
                      className="text-brand-teal hover:text-brand-navy no-underline font-semibold"
                    >
                      View →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default USStateAuthorities;
