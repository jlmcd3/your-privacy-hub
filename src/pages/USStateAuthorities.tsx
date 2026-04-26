import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { slugify } from "@/lib/utils";
import usStates from "@/data/us_state_privacy_authorities.json";

const statusClass = (s: string | null) => {
  if (!s) return "status-none";
  if (s === "Enacted") return "status-enacted";
  if (s === "Pending") return "status-pending";
  return "status-none";
};

const USStateAuthorities = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>U.S. State Privacy Authorities Directory | Your Privacy Hub</title>
        <meta name="description" content="Complete directory of privacy regulatory authorities across all 50 U.S. states. Statute names, enforcement status, websites, and complaint portals." />
      </Helmet>
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-12 px-8">
        <div className="max-w-[1280px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            🏛️ Authority Directory
          </div>
          <h1 className="font-display text-[36px] text-white mb-3">U.S. State Privacy Authorities</h1>
          <p className="text-base text-slate-light max-w-[700px]">
            Comprehensive directory of privacy regulatory authorities across all 50 U.S. states and Washington, D.C. Includes statute names, enforcement status, official websites, and complaint portals.
          </p>
        </div>
      </div>

      <AdBanner variant="leaderboard" className="py-5" />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filters */}
        <div className="flex gap-3 items-center mb-8 p-4 bg-card rounded-xl border border-fog shadow-eup-sm">
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-light w-4 h-4" />
            <input
              className="w-full py-2 pl-10 pr-4 text-sm border border-silver rounded-lg bg-paper text-navy outline-none focus:border-blue transition-colors"
              placeholder="Search states, authorities, or statutes…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate">Status:</span>
          {statusFilters.map((f) => (
            <span
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 text-[12.5px] font-medium border rounded-full cursor-pointer transition-all ${
                statusFilter === f
                  ? "bg-navy text-white border-navy"
                  : "bg-card text-slate border-silver hover:bg-navy hover:text-white hover:border-navy"
              }`}
            >
              {f}
            </span>
          ))}
          <span className="ml-auto text-[12px] text-slate-light">{filtered.length} results</span>
        </div>

        {/* Table */}
        <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-fog">
                <tr>
                  {["State", "Authority", "Statute", "Status", "Effective Date", "Links"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold tracking-wider uppercase text-slate text-left border-b border-silver">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((state: any) => (
                  <tr key={state.id} className="hover:bg-paper transition-colors">
                    <td className="px-4 py-3 text-[13px] text-navy font-medium border-b border-fog whitespace-nowrap">
                      <Link
                        to={`/jurisdiction/${slugify(state.state)}`}
                        className="text-primary hover:underline font-medium no-underline"
                      >
                        {state.state}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">
                      <div className="font-medium">{state.authority_name}</div>
                      <div className="text-[11px] text-slate mt-0.5">{state.authority_type}</div>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog">
                      {state.statute_name || <span className="text-slate-light italic">None</span>}
                    </td>
                    <td className="px-4 py-3 border-b border-fog">
                      <span className={`text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${statusClass(state.statute_status)}`}>
                        {state.statute_status || "None"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-navy border-b border-fog whitespace-nowrap">
                      {state.effective_date || "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] border-b border-fog">
                      <div className="flex gap-2">
                        <a href={state.website} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline no-underline text-[12px]">Website ↗</a>
                        {state.complaint_portal && (
                          <a href={state.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline no-underline text-[12px]">Complaints ↗</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AdBanner variant="leaderboard" className="py-6" />
      </div>
      <Footer />
    </div>
  );
};

export default USStateAuthorities;
