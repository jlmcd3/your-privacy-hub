import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import usStates from "@/data/us_state_privacy_authorities.json";
import comparison from "@/data/us_state_comparison.json";
import { getProduct } from "@/lib/productRegistry";

type Stage = "enacted" | "passed" | "committee" | "introduced" | "proposed" | "withdrawn";

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string }> = {
  enacted: { label: "Enacted", color: "#16a34a", bg: "#f0fdf4" },
  passed: { label: "Passed", color: "#2563eb", bg: "#eff6ff" },
  committee: { label: "In Committee", color: "#d97706", bg: "#fffbeb" },
  introduced: { label: "Introduced", color: "#7c3aed", bg: "#f5f3ff" },
  proposed: { label: "Proposed", color: "#94a3b8", bg: "#f8fafc" },
  withdrawn: { label: "Withdrawn", color: "#dc2626", bg: "#fef2f2" },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface ActiveBill {
  id: string;
  bill_name: string;
  bill_number: string | null;
  stage: Stage;
  source_url: string | null;
  source_last_action_at: string | null;
}

export default function USStateLawPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = (usStates as any[]).find((s) => s.slug === slug);
  const compEntry = state
    ? (comparison as any).states?.find((c: any) => c.name === state.state)
    : null;

  const [bills, setBills] = useState<ActiveBill[]>([]);

  useEffect(() => {
    if (!state) return;
    (supabase as any)
      .from("legislation_bills")
      .select("id, bill_name, bill_number, stage, source_url, source_last_action_at")
      .eq("jurisdiction", state.state)
      .eq("status", "active")
      .order("source_last_action_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => setBills(data || []));
  }, [state]);

  if (!state) {
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-brand-navy mb-4">State Not Found</h1>
          <p className="text-slate mb-6">No U.S. state matches this slug.</p>
          <Link to="/us-privacy-laws" className="text-brand-teal-text hover:underline">
            Browse all U.S. state privacy laws →
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isCA = state.slug === "california";
  const topToolProduct = isCA
    ? getProduct("cppa-risk-assessment")
    : getProduct("us-notice");
  const topToolCta = {
    label: isCA ? `Run ${topToolProduct.name}` : `Generate a ${topToolProduct.name}`,
    href: topToolProduct.route,
  };

  const metaDescription = state.statute_name
    ? `${state.state} privacy law (${state.statute_name}) — statute, regulator (${state.authority_name}), and currently active privacy bills.`
    : `${state.state} privacy regulation — primary regulator ${state.authority_name}, statute status, and currently active privacy bills.`;

  const canonical = `https://enduserprivacy.com/us-privacy-laws/${state.slug}`;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{state.state} Privacy Law — Statute, Regulator & Active Bills | End User Privacy</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={`${state.state} Privacy Law — Statute, Regulator & Active Bills`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${state.state} Privacy Law — Statute, Regulator & Active Bills`,
          description: metaDescription,
          publisher: { "@type": "Organization", name: "End User Privacy" },
          mainEntityOfPage: canonical,
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://enduserprivacy.com/" },
            { "@type": "ListItem", position: 2, name: "US Privacy Laws", item: "https://enduserprivacy.com/us-privacy-laws" },
            { "@type": "ListItem", position: 3, name: `${state.state} Privacy Law`, item: canonical },
          ],
        })}</script>
      </Helmet>
      <Navbar />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-sm text-slate"
      >
        <Link to="/" className="text-brand-teal-text hover:underline no-underline">Home</Link>
        <span className="mx-2 text-brand-mist">›</span>
        <span className="text-slate">Research</span>
        <span className="mx-2 text-brand-mist">›</span>
        <Link to="/us-privacy-laws" className="text-brand-teal-text hover:underline no-underline">
          U.S. Privacy Laws
        </Link>
        <span className="mx-2 text-brand-mist">›</span>
        <span className="text-brand-navy">{state.state}</span>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-ocean to-brand-slate-teal py-8 md:py-10 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-1.5 text-meta font-semibold tracking-widest uppercase text-brand-mist mb-3">
            Research · U.S. State Privacy Law
          </div>
          <h1 className="font-display text-white mb-2">{state.state} Privacy Law</h1>
          {state.statute_name && (
            <p className="text-lg text-brand-mist font-display">{state.statute_name}</p>
          )}
          <div className="text-sm text-brand-mist mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {state.statute_status && <span>Status: {state.statute_status}</span>}
            {state.effective_date && <span>Effective: {fmtDate(state.effective_date)}</span>}
          </div>
          <div className="mt-4">
            <Link
              to={topToolCta.href}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal-deep text-white text-sm font-semibold rounded-lg no-underline hover:opacity-90 transition"
            >
              {topToolCta.label} →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* The law */}
        <section className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-7 shadow-eup-sm">
          <h2 className="font-display text-brand-navy mb-3">The law</h2>
          <dl className="text-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Statute</dt>
              <dd className="text-brand-navy">
                {state.statute_name ? (
                  state.statute_url ? (
                    <a
                      href={state.statute_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal-text hover:underline no-underline"
                    >
                      {state.statute_name} ↗
                    </a>
                  ) : (
                    state.statute_name
                  )
                ) : (
                  <span className="text-brand-mist italic">No comprehensive privacy statute enacted</span>
                )}
              </dd>
            </div>
            {state.statute_status && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Status</dt>
                <dd className="text-brand-navy">{state.statute_status}</dd>
              </div>
            )}
            {state.effective_date && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Effective date</dt>
                <dd className="text-brand-navy">{fmtDate(state.effective_date)}</dd>
              </div>
            )}
            {state.notes && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Notes</dt>
                <dd className="text-slate leading-relaxed">{state.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Regulator & enforcement */}
        <section className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-7 shadow-eup-sm">
          <h2 className="font-display text-brand-navy mb-3">Regulator & enforcement</h2>
          <dl className="text-sm space-y-2">
            <div className="flex flex-col sm:flex-row sm:gap-3">
              <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Authority</dt>
              <dd className="text-brand-navy font-medium">{state.authority_name}</dd>
            </div>
            {state.authority_type && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Type</dt>
                <dd className="text-slate">{state.authority_type}</dd>
              </div>
            )}
            {state.website && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Website</dt>
                <dd>
                  <a
                    href={state.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-teal-text hover:underline no-underline"
                  >
                    {state.website} ↗
                  </a>
                </dd>
              </div>
            )}
            {state.complaint_portal && (
              <div className="flex flex-col sm:flex-row sm:gap-3">
                <dt className="text-meta uppercase tracking-wider text-slate sm:w-40 shrink-0">Complaint portal</dt>
                <dd>
                  <a
                    href={state.complaint_portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-teal-text hover:underline no-underline"
                  >
                    File a complaint ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Comparison highlights */}
        {compEntry && (
          <section className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-7 shadow-eup-sm">
            <h2 className="font-display text-brand-navy mb-3">Comparison highlights</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {(comparison as any).provisions?.map((label: string, i: number) => {
                const value = compEntry.provisions?.[i];
                if (value === undefined) return null;
                let display: string;
                if (value === true) display = "✓";
                else if (value === false) display = "—";
                else display = String(value);
                return (
                  <div key={label} className="flex justify-between gap-3 border-b border-brand-cloud/60 py-1">
                    <dt className="text-slate">{label}</dt>
                    <dd className="text-brand-navy font-medium">{display}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* Active bills */}
        <section className="bg-card border border-brand-cloud rounded-2xl p-5 md:p-7 shadow-eup-sm">
          <h2 className="font-display text-brand-navy mb-3">Active bills in {state.state}</h2>
          {bills.length === 0 ? (
            <p className="text-sm text-slate italic">
              No active privacy bills currently tracked for {state.state}.
            </p>
          ) : (
            <ul className="space-y-3">
              {bills.map((b) => {
                const cfg = STAGE_CONFIG[b.stage] ?? STAGE_CONFIG.introduced;
                return (
                  <li
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-brand-cloud/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {b.bill_number && (
                          <span className="text-meta font-mono text-slate">{b.bill_number}</span>
                        )}
                        <span
                          className="text-meta font-semibold px-2 py-0.5 rounded-full"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      {b.source_url ? (
                        <a
                          href={b.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-brand-navy hover:text-brand-teal-text no-underline"
                        >
                          {b.bill_name}
                        </a>
                      ) : (
                        <span className="text-sm font-medium text-brand-navy">{b.bill_name}</span>
                      )}
                    </div>
                    <div className="text-meta text-slate sm:text-right shrink-0">
                      Last action: {fmtDate(b.source_last_action_at)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Footer />
    </div>
  );
}
