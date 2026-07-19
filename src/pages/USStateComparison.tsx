import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import comparisonData from "@/data/us_state_comparison.json";
import { STATUTES } from "@/data/statutes";
import { QUALIFIER_NOTES } from "@/data/statuteQualifiers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StateReviewPastDueBanner from "@/components/admin/StateReviewPastDueBanner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateOnlyLong, formatTimestampDateOnly } from "@/lib/dateOnly";
import {
  computeReviewRollup,
  REVIEW_CADENCE_DAYS,
  type ReviewLogRow,
} from "@/lib/stateReviewStatus";

/** Normalize provision cell to a canonical mark. */
type Mark = "yes" | "no" | "limited" | "conditional" | "text";
function classifyValue(v: unknown): { mark: Mark; text: string } {
  if (v === true) return { mark: "yes", text: "" };
  if (v === false) return { mark: "no", text: "" };
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "yes" || s === "true") return { mark: "yes", text: "" };
    if (s === "no" || s === "false") return { mark: "no", text: "" };
    if (s === "limited") return { mark: "limited", text: "Limited" };
    if (s === "conditional") return { mark: "conditional", text: "Conditional" };
    return { mark: "text", text: v };
  }
  return { mark: "text", text: String(v) };
}

const STATE_FLAGS: Record<string, string> = {
  CA: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_California.svg?width=32",
  CO: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Colorado.svg?width=32",
  CT: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Connecticut.svg?width=32",
  DE: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Delaware.svg?width=32",
  FL: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Florida.svg?width=32",
  IA: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Iowa.svg?width=32",
  IN: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Indiana.svg?width=32",
  KY: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Kentucky.svg?width=32",
  MD: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Maryland.svg?width=32",
  MN: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Minnesota.svg?width=32",
  MT: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Montana.svg?width=32",
  NE: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Nebraska.svg?width=32",
  NH: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_New_Hampshire.svg?width=32",
  NJ: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_New_Jersey.svg?width=32",
  OR: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Oregon.svg?width=32",
  RI: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Rhode_Island.svg?width=32",
  TN: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Tennessee.svg?width=32",
  TX: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Texas.svg?width=32",
  UT: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Utah.svg?width=32",
  VA: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Virginia.svg?width=32",
  VT: "https://commons.wikimedia.org/wiki/Special:FilePath/Flag_of_Vermont.svg?width=32",
};

const USStateComparison = () => {
  const states = comparisonData.states.filter((s) => s.status === "enacted");
  const [reviewRows, setReviewRows] = useState<ReviewLogRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("state_law_review_log")
        .select("state_slug, status, reviewed_at")
        .order("reviewed_at", { ascending: false });
      setReviewRows((data ?? []) as ReviewLogRow[]);
    })();
  }, []);
  const rollup = computeReviewRollup(reviewRows);
  const jsonLastReviewed = (comparisonData as any).lastReviewed as string;
  const jsonNextReviewDue = (comparisonData as any).nextReviewDue as string;

  // Item 10 — as-of date DERIVED from live freshness data (rollup), with
  // JSON fallback anchor for first-paint / offline states.
  const asOfDisplay = rollup.cycleCompletedAt
    ? formatTimestampDateOnly(rollup.cycleCompletedAt)
    : formatDateOnlyLong(jsonLastReviewed);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>US State Privacy Laws Comparison 2026 | End User Privacy</title>
        <meta name="description" content={`Compare all ${states.length} enacted US comprehensive state privacy laws side by side across 12 key provisions. CCPA, CPRA, Texas TDPSA, Virginia VCDPA, Colorado CPA and more. Free.`} />
        <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"Dataset","name":"US State Privacy Law Comparison","description":"Side-by-side comparison of ${states.length} enacted US state comprehensive privacy laws across 12 provisions. Inclusion criteria: enacted comprehensive consumer privacy statutes; excludes sectoral, biometric-only, and pending bills. Florida FDBR applies only to controllers meeting the >$1B global gross annual revenue threshold plus one enumerated adtech / sale / theme-park criterion (Fla. Stat. § 501.702(9)).","url":"https://enduserprivacy.com/compare/us-states","dateModified":"${(rollup.cycleCompletedAt ?? jsonLastReviewed) || ""}","publisher":{"@type":"Organization","name":"End User Privacy"}}`}</script>
      </Helmet>
      <Navbar />

      <header className="bg-[#1a4a6e] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            📊 Comparison Tool
          </span>
          <h1 className="font-serif text-white mb-3">U.S. State Privacy Law Comparison</h1>
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
            Side-by-side comparison of all {states.length} enacted US comprehensive state privacy laws across 12 standard provisions.
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Hover or focus any ✓ to see the statute citation. Press <kbd className="px-1 bg-white/10 rounded">Enter</kbd> or click to open the law in a new tab.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <StateReviewPastDueBanner />
        {/* Premium upsell — slim contextual banner */}
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-amber-900 leading-snug">
            Get up-to-date Intelligence every Monday, written for your industry, interests, and jurisdictions.
          </p>
          <Link
            to="/subscribe"
            className="flex-shrink-0 text-[12px] font-bold text-amber-900 bg-amber-400 hover:bg-amber-300 px-4 py-1.5 rounded-lg no-underline transition-colors whitespace-nowrap"
          >
            Get Intelligence →
          </Link>
        </div>


        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="cmp-table overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground sticky left-0 bg-muted z-10 min-w-[140px]">Provision</th>
                  {states.map((s) => {
                    const slug = s.name.toLowerCase().replace(/\s+/g, "-");
                    return (
                      <th key={s.abbr} id={s.abbr} className="px-2 py-3 text-center font-bold text-foreground min-w-[56px] scroll-mt-24">
                        <Link
                          to={`/jurisdiction/${slug}`}
                          aria-label={`View ${s.name} jurisdiction page`}
                          className="block no-underline group"
                        >
                          {STATE_FLAGS[s.abbr] && (
                            <img
                              src={STATE_FLAGS[s.abbr]}
                              alt={`${s.name} state flag`}
                              className="w-7 h-auto mx-auto mb-1 rounded-[2px] shadow-sm object-cover group-hover:scale-110 transition-transform"
                              loading="lazy"
                            />
                          )}
                          <div className="group-hover:text-accent transition-colors">{s.abbr}</div>
                          <div className="text-[11px] font-normal text-muted-foreground">{s.law}</div>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonData.provisions.map((provision, pi) => (
                  <tr key={provision} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2.5 font-medium text-foreground sticky left-0 bg-card z-10">{provision}</td>
                    {states.map((s) => {
                      const val = s.provisions[pi];
                      const key = `${s.abbr}:${pi}`;
                      const statute = STATUTES[key];
                      const qualifier = QUALIFIER_NOTES[key];
                      const { mark, text } = classifyValue(val);

                      // Body content for pill/checkmark, wrapped in cite anchor when a statute exists.
                      let body: JSX.Element;
                      if (mark === "yes") {
                        body = <Check className="w-4 h-4 text-accent mx-auto" />;
                      } else if (mark === "limited") {
                        body = (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold border border-amber-300">
                            Limited
                          </span>
                        );
                      } else if (mark === "conditional") {
                        body = (
                          <span className="inline-block px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-semibold border border-sky-300">
                            Conditional
                          </span>
                        );
                      } else if (mark === "no") {
                        body = <Minus className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
                      } else {
                        body = <span className="text-[11px] text-muted-foreground">{text}</span>;
                      }

                      const linkable = mark !== "no" && mark !== "text" && !!statute;

                      return (
                        <td key={s.abbr} className="px-2 py-2.5 text-center border-l border-border">
                          {linkable ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={statute!.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center hover:scale-110 transition-transform"
                                  aria-label={`${statute!.cite} — click to view statute`}
                                >
                                  {body}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs font-mono">
                                <p>{statute!.cite}</p>
                                {qualifier && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">{qualifier}</p>
                                )}
                                <p className="text-[11px] text-muted-foreground mt-0.5">Click to view statute ↗</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            body
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Hover any ✓ checkmark to see the applicable statutory citation. Click to open the full statute in a new tab.
        </p>

        <div className="mt-6 text-[11px] text-muted-foreground border-t border-border pt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            {(() => {
              if (rollup.materialChangeCount > 0) {
                return (
                  <p>
                    <span className="font-medium text-destructive">Comparison flagged for review:</span>{" "}
                    {rollup.materialChangeCount} state{rollup.materialChangeCount === 1 ? "" : "s"} with a
                    reported material change (newly enacted law, amendment, effective-date change, or repeal).
                    Fallback anchor: {formatDateOnlyLong(jsonLastReviewed)}.
                  </p>
                );
              }
              if (rollup.fullyReviewed && rollup.cycleCompletedAt) {
                return (
                  <p>
                    <span className="font-medium text-foreground">Fully reviewed as of:</span>{" "}
                    {formatTimestampDateOnly(rollup.cycleCompletedAt)}
                    {" · "}
                    <span className="font-medium text-foreground">Next review due:</span>{" "}
                    {formatDateOnlyLong(jsonNextReviewDue)}
                    {" · "}Reviewed every {REVIEW_CADENCE_DAYS} days.
                  </p>
                );
              }
              return (
                <p>
                  <span className="font-medium text-foreground">Partially reviewed as of:</span>{" "}
                  {formatDateOnlyLong(jsonLastReviewed)} — {rollup.reviewedInCycleCount} of{" "}
                  {rollup.totalEnacted} states verified within the current {REVIEW_CADENCE_DAYS}-day cycle.
                </p>
              );
            })()}
          </div>
          <p className="italic">
            Spot an outdated entry? <Link to="/contact" className="underline hover:text-accent">Let us know</Link>.
          </p>
        </div>



      </div>

      <Footer />
    </div>
  );
};

export default USStateComparison;
