import { Fragment, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { supabase } from "@/integrations/supabase/client";
import { ResearchPageHeader } from "@/components/research/ResearchPageHeader";
import { ResearchSynthesisBlock } from "@/components/research/ResearchSynthesisBlock";

type Stage = "enacted" | "passed" | "committee" | "introduced" | "proposed" | "withdrawn";

interface Bill {
  id: string;
  jurisdiction: string;
  iso2: string | null;
  jurisdiction_slug: string | null;
  region: string | null;
  bill_name: string;
  bill_number: string | null;
  stage: Stage;
  summary: string | null;
  source_url: string | null;
  source_name: string | null;
  source_last_action_at: string | null;
  last_seen_at: string;
  status: string;
}

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; order: number }> = {
  enacted:    { label: "Enacted",      color: "#16a34a", bg: "#f0fdf4", order: 1 },
  passed:     { label: "Passed",       color: "#2563eb", bg: "#eff6ff", order: 2 },
  committee:  { label: "In Committee", color: "#d97706", bg: "#fffbeb", order: 3 },
  introduced: { label: "Introduced",   color: "#7c3aed", bg: "#f5f3ff", order: 4 },
  proposed:   { label: "Proposed",     color: "#94a3b8", bg: "#f8fafc", order: 5 },
  withdrawn:  { label: "Withdrawn",    color: "#dc2626", bg: "#fef2f2", order: 6 },
};

const FLAG_BY_ISO: Record<string, string> = {
  US: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_the_United_States.svg?width=40",
  GB: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_the_United_Kingdom.svg?width=40",
  EU: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Europe.svg?width=40",
  CA: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Canada.svg?width=40",
  AU: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Australia.svg?width=40",
  BR: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Brazil.svg?width=40",
  IN: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_India.svg?width=40",
};

const REGIONS = ["All Regions", "Americas", "Europe", "Asia-Pacific"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysSince = (iso: string | null): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY_MS);
};

// Map a bill to its "what to do now" compliance tool. Returned only for
// high-likelihood bills.
function nextActionFor(bill: Bill): { label: string; href: string } | null {
  const j = (bill.jurisdiction || "").toLowerCase();
  const iso = bill.iso2 || "";
  if (j.includes("california")) {
    return { label: "Run CPPA Risk Assessment", href: "/cppa-risk-assessment" };
  }
  if (iso === "EU" || iso === "GB" || j.includes("united kingdom") || j.includes("european")) {
    return { label: "Generate a DPIA", href: "/dpia-framework" };
  }
  if (iso === "US" || bill.region === "Americas") {
    return { label: "Generate a U.S. Privacy Notice", href: "/us-notice-builder" };
  }
  return { label: "Run Governance Assessment", href: "/governance-assessment" };
}

// Pick the most relevant date for a bill. We don't have an explicit
// "expected/effective date" column, so we surface source_last_action_at as
// the most informative timestamp and colour by stage urgency.
function urgencyFor(bill: Bill): { tone: "red" | "amber" | "slate"; label: string } {
  if (bill.stage === "passed") return { tone: "red", label: "Awaiting signature / promulgation" };
  if (bill.stage === "committee") return { tone: "amber", label: "In committee" };
  if (bill.stage === "enacted") return { tone: "slate", label: "Enacted" };
  return { tone: "slate", label: "Early stage" };
}
function BillCard({
  bill,
  variant,
}: {
  bill: Bill;
  variant: "imminent" | "default" | "enacted";
}) {
  const cfg = STAGE_CONFIG[bill.stage] ?? STAGE_CONFIG.introduced;
  const flagUrl = bill.iso2 ? FLAG_BY_ISO[bill.iso2] : undefined;
  const isStale = bill.status === "stale";
  const action = variant === "imminent" ? nextActionFor(bill) : null;
  const urg = urgencyFor(bill);
  const dateTone =
    variant === "enacted"
      ? "text-emerald-700"
      : urg.tone === "red"
      ? "text-red-600"
      : urg.tone === "amber"
      ? "text-amber-600"
      : "text-slate";
  const dateLabel =
    variant === "enacted" ? "Effective" : urg.tone === "red" ? "Awaiting signature" : "Last action";

  return (
    <div
      className={`bg-white rounded-2xl border p-5 transition-all hover:shadow-eup-sm ${
        variant === "imminent" ? "border-red-500/40" : "border-fog"
      }`}
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {flagUrl && (
              <img
                src={flagUrl}
                alt={`${bill.jurisdiction} flag`}
                loading="lazy"
                className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm flex-shrink-0"
              />
            )}
            <span className="text-xs font-bold text-slate uppercase tracking-wider">
              {bill.jurisdiction}
            </span>
            {bill.bill_number && (
              <span className="font-mono text-[11px] text-slate-light">{bill.bill_number}</span>
            )}
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
            >
              {cfg.label}
            </span>
            {isStale && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                Stale
              </span>
            )}
          </div>
          <h3 className="text-navy text-[15px] mb-2">{bill.bill_name}</h3>
          {bill.summary && (
            <p className="text-slate text-sm leading-relaxed mb-3 line-clamp-3">{bill.summary}</p>
          )}

          {action && (
            <div className="mb-3 rounded-lg border-l-4 border-accent bg-accent/5 px-3 py-2">
              <div className="text-[11px] font-bold tracking-wider uppercase text-accent mb-0.5">
                What to do now
              </div>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-navy leading-snug m-0">
                  Prepare ahead of enactment — assess your exposure with the recommended tool.
                </p>
                <Link
                  to={action.href}
                  className="text-sm font-semibold text-accent no-underline hover:underline whitespace-nowrap"
                >
                  {action.label} →
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-light">
            {bill.source_url ? (
              <a
                href={bill.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue hover:underline font-medium"
              >
                View at {bill.source_name ?? "source"} →
              </a>
            ) : bill.source_name ? (
              <span>Source: {bill.source_name}</span>
            ) : null}
            <span>· Verified {formatDate(bill.last_seen_at)}</span>
            {bill.jurisdiction_slug && (
              <Link
                to={`/jurisdiction/${bill.jurisdiction_slug}`}
                className="text-blue hover:underline font-medium"
              >
                · Jurisdiction page →
              </Link>
            )}
          </div>
        </div>

        {/* Prominent date */}
        <div className="md:text-right md:border-l md:border-fog md:pl-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-light mb-1">
            {dateLabel}
          </div>
          <div className={`font-display text-xl md:text-2xl leading-tight ${dateTone}`}>
            {formatDate(bill.source_last_action_at)}
          </div>
          <div className="text-[11px] text-slate mt-1">{urg.label}</div>
        </div>
      </div>
    </div>
  );
}


export default function LegislationTracker() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("All Regions");
  const [stage, setStage] = useState("All Stages");
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("legislation_bills")
        .select("id, jurisdiction, iso2, jurisdiction_slug, region, bill_name, bill_number, stage, summary, source_url, source_name, source_last_action_at, last_seen_at, status")
        .in("status", ["active", "stale"])
        .order("last_seen_at", { ascending: false })
        .limit(500);
      setBills((data ?? []) as Bill[]);
      if (data?.length) {
        const newest = data.reduce((acc: string, b: any) => (b.last_seen_at > acc ? b.last_seen_at : acc), data[0].last_seen_at);
        setLastVerified(newest);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = bills
    .filter((b) => region === "All Regions" || b.region === region)
    .filter((b) => stage === "All Stages" || b.stage === stage);

  // Track groupings (default priority sort)
  const recentlyEnacted = filtered
    .filter((b) => b.stage === "enacted" && (daysSince(b.source_last_action_at) ?? 999) <= 90)
    .sort((a, b) => (b.source_last_action_at ?? "").localeCompare(a.source_last_action_at ?? ""));

  const inProgress = filtered.filter((b) => b.stage !== "enacted" && b.stage !== "withdrawn");

  const tracks: { id: string; label: string; sub: string; tone: string; bills: Bill[] }[] = [
    {
      id: "high",
      label: "High likelihood — imminent",
      sub: "Passed at least one chamber; awaiting signature or promulgation.",
      tone: "border-red-500 bg-red-50 text-red-700",
      bills: inProgress
        .filter((b) => b.stage === "passed")
        .sort((a, b) => (b.source_last_action_at ?? "").localeCompare(a.source_last_action_at ?? "")),
    },
    {
      id: "active",
      label: "Active — committee stage",
      sub: "Moving through committee; outcome uncertain but on the agenda.",
      tone: "border-amber-500 bg-amber-50 text-amber-700",
      bills: inProgress
        .filter((b) => b.stage === "committee")
        .sort((a, b) => (b.source_last_action_at ?? "").localeCompare(a.source_last_action_at ?? "")),
    },
    {
      id: "early",
      label: "Introduced — early stage",
      sub: "Recently introduced or proposed; long road to enactment.",
      tone: "border-violet-500 bg-violet-50 text-violet-700",
      bills: inProgress
        .filter((b) => b.stage === "introduced" || b.stage === "proposed")
        .sort((a, b) => (b.source_last_action_at ?? "").localeCompare(a.source_last_action_at ?? "")),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Global Privacy Legislation Tracker — Bills &amp; Laws Worldwide | End User Privacy</title>
        <meta name="description" content="Track privacy bills worldwide from introduction through enactment. US, UK, EU, Canada, Australia, Brazil — refreshed daily from official government sources." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <ResearchPageHeader
          eyebrow="Research · Privacy Legislation"
          title="Privacy Legislation Tracker"
          description="Privacy and data-protection bills tracked across major jurisdictions. Refreshed daily from official government sources (Congress.gov, UK Parliament, LEGISinfo, Câmara dos Deputados, EUR-Lex, and Parliament of Australia)."
          lastUpdated={lastVerified ? formatDate(lastVerified) : undefined}
          feedCategory="legislation"
        />
        <AdBanner variant="leaderboard" className="mt-4" />
        <main className="flex-1 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="mb-8">
            <ResearchSynthesisBlock sectionKey="legislation__page" promoteHeading />
          </div>

          <div className="text-[11px] text-slate-light mb-6">
            Bills not seen in their source for 60+ days are marked <span className="font-semibold">stale</span>. Updated daily at 06:00 UTC.
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${region === r ? "bg-navy text-white border-navy" : "bg-white text-slate border-fog hover:border-navy/20"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["All Stages", ...Object.keys(STAGE_CONFIG)] as string[]).map((s) => {
                const cfg = s !== "All Stages" ? STAGE_CONFIG[s as Stage] : null;
                return (
                  <button
                    key={s}
                    onClick={() => setStage(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${stage === s ? "bg-navy text-white border-navy" : "bg-white text-slate border-fog hover:border-navy/20"}`}
                    style={cfg && stage === s ? { background: cfg.color, borderColor: cfg.color } : {}}
                  >
                    {s === "All Stages" ? s : STAGE_CONFIG[s as Stage].label}
                  </button>
                );
              })}
            </div>
          </div>


          {loading && <p className="text-slate text-sm py-12 text-center">Loading bills…</p>}

          {!loading && (
            <>
              {/* ── Recently enacted (last 90 days) ── */}
              {recentlyEnacted.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h2 className="font-display text-navy leading-tight">Recently enacted</h2>
                    <span className="text-meta uppercase tracking-wider font-semibold text-emerald-700">
                      Last 90 days · {recentlyEnacted.length}
                    </span>
                  </div>
                  <p className="text-sm text-slate mb-4">
                    Bills that crossed the finish line recently — what returning practitioners may
                    have missed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentlyEnacted.map((bill) => (
                      <BillCard key={bill.id} bill={bill} variant="enacted" />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Priority tracks ── */}
              {tracks.map((track) => (
                <section key={track.id} className="mb-10">
                  <div className={`flex items-center gap-3 mb-1 pl-3 border-l-4 ${track.tone.split(" ")[0]}`}>
                    <h2 className="font-display text-navy leading-tight">{track.label}</h2>
                    <span className={`text-meta uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${track.tone}`}>
                      {track.bills.length}
                    </span>
                  </div>
                  <p className="text-sm text-slate mb-4 pl-4">{track.sub}</p>
                  {track.bills.length === 0 ? (
                    <p className="text-meta text-slate-light pl-4">No bills in this track for the current filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {track.bills.map((bill) => (
                        <BillCard
                          key={bill.id}
                          bill={bill}
                          variant={track.id === "high" ? "imminent" : "default"}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {filtered.length === 0 && (
                <p className="text-center text-slate py-12 text-sm">No bills match your filters.</p>
              )}
            </>
          )}

          <div className="mt-14 pt-8 border-t border-fog space-y-10">
            <section id="us-federal" className="scroll-mt-24">
              <h2 className="font-display text-navy mb-4 leading-tight">U.S. Federal Privacy Legislation</h2>
              <ResearchSynthesisBlock sectionKey="legislation__us_federal" compact />
            </section>
            <section id="us-states" className="scroll-mt-24">
              <h2 className="font-display text-navy mb-4 leading-tight">U.S. State Privacy Legislation in Progress</h2>
              <ResearchSynthesisBlock sectionKey="legislation__us_states" compact />
            </section>
            <section id="eu-uk" className="scroll-mt-24">
              <h2 className="font-display text-navy mb-4 leading-tight">European Privacy and AI Legislation</h2>
              <ResearchSynthesisBlock sectionKey="legislation__eu_uk" compact />
            </section>
            <section id="global" className="scroll-mt-24">
              <h2 className="font-display text-navy mb-4 leading-tight">Global Privacy Legislation</h2>
              <ResearchSynthesisBlock sectionKey="legislation__global" compact />
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
