import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import comparisonData from "@/data/us_state_comparison.json";
import { STATUTES } from "@/data/statutes";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

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
};

const USStateComparison = () => {
  const [showAll, setShowAll] = useState(false);
  const states = comparisonData.states.filter((s) => showAll || s.status === "enacted");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>US State Privacy Laws Comparison 2026 — CCPA, TDPSA, VCDPA vs 17 More | EndUserPrivacy</title>
        <meta name="description" content="Compare all 20 enacted US comprehensive state privacy laws side by side across 12 key provisions. CCPA, CPRA, Texas TDPSA, Virginia VCDPA, Colorado CPA and more. Free." />
        <script type="application/ld+json">{`{"@context":"https://schema.org","@type":"Dataset","name":"US State Privacy Law Comparison","description":"Side-by-side comparison of all 20 enacted US state comprehensive privacy laws across 12 provisions","url":"https://enduserprivacy.com/compare/us-states","publisher":{"@type":"Organization","name":"EndUserPrivacy"}}`}</script>
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <p className="text-sm font-medium text-muted-foreground mb-2">📊 Comparison Tool</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">U.S. State Privacy Law Comparison</h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Side-by-side comparison of all {states.length} enacted US comprehensive state privacy laws across 12 standard provisions.
            <br />
            <span className="text-sm text-muted-foreground/80">
              Hover any ✓ to see the statute citation. Click to open the law.
            </span>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="rounded"
            />
            Include pending laws
          </label>
        </div>

        <AdBanner variant="leaderboard" adSlot="eup-comparison-top" className="py-3" />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-3 text-left font-semibold text-muted-foreground sticky left-0 bg-muted z-10 min-w-[140px]">Provision</th>
                  {states.map((s) => (
                    <th key={s.abbr} className="px-2 py-3 text-center font-bold text-foreground min-w-[56px]">
                      {STATE_FLAGS[s.abbr] && (
                        <img
                          src={STATE_FLAGS[s.abbr]}
                          alt={`${s.name} state flag`}
                          className="w-7 h-auto mx-auto mb-1 rounded-[2px] shadow-sm object-cover"
                          loading="lazy"
                        />
                      )}
                      <div>{s.abbr}</div>
                      <div className="text-[9px] font-normal text-muted-foreground">{s.law}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.provisions.map((provision, pi) => (
                  <tr key={provision} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2.5 font-medium text-foreground sticky left-0 bg-card z-10">{provision}</td>
                    {states.map((s) => {
                      const val = s.provisions[pi];
                      const statute = STATUTES[`${s.abbr}:${pi}`];
                      return (
                        <td key={s.abbr} className="px-2 py-2.5 text-center border-l border-border">
                          {val === true ? (
                            statute ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={statute.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center hover:scale-110 transition-transform"
                                    aria-label={`${statute.cite} — click to view statute`}
                                  >
                                    <Check className="w-4 h-4 text-accent mx-auto" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs font-mono">
                                  <p>{statute.cite}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Click to view statute ↗</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Check className="w-4 h-4 text-accent mx-auto" />
                            )
                          ) : val === false ? (
                            <Minus className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{String(val)}</span>
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

        <AdBanner variant="inline" adSlot="eup-comparison-bottom" className="py-3" />
      </div>

      <Footer />
    </div>
  );
};

export default USStateComparison;
