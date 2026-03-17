import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { Link, useNavigate } from "react-router-dom";
import MapLegend, { STATUS_CONFIG } from "./MapLegend";

// Key = ISO numeric country code (matches topojson world-atlas)
const JURISDICTIONS: Record<string, any> = {
  "840":{ name:"United States",  flag:"🇺🇸", status:"sector",        law:"Sector laws (HIPAA, COPPA, GLBA) + 19 state laws", regulator:"FTC + State AGs",                year:null, region:"Americas",             slug:"united-states",  rights:["Sector/state rights vary","CCPA/CPRA in California","19 states now comprehensive"], fines:["Meta: $1.3B (FTC, 2023)","Honda: $632K (CA AG, 2024)"] },
  "124":{ name:"Canada",         flag:"🇨🇦", status:"comprehensive",  law:"PIPEDA + Quebec Law 25",                          regulator:"OPC + Quebec CAI",              year:2000, region:"Americas",             slug:"canada",         rights:["Access & correction","Consent withdrawal","Breach notification"], fines:["Meta: CAD 9M (OPC, 2024)"] },
  "76": { name:"Brazil",         flag:"🇧🇷", status:"comprehensive",  law:"LGPD",                                            regulator:"ANPD",                          year:2020, region:"Americas",             slug:"brazil",         rights:["Access, correction, deletion","Data portability","Opt-out of processing"], fines:["Telemarketing co: R$14.4M (2024)"] },
  "484":{ name:"Mexico",         flag:"🇲🇽", status:"sector",         law:"LFPDPPP (private sector only)",                   regulator:"INAI",                          year:2010, region:"Americas",             slug:"mexico",         rights:["ARCO rights (Access, Rectification, Cancellation, Opposition)"], fines:[] },
  "32": { name:"Argentina",      flag:"🇦🇷", status:"comprehensive",  law:"PDPA Law 25,326 (reform pending)",                regulator:"AAIP",                          year:2000, region:"Americas",             slug:"argentina",      rights:["Access, correction, deletion","Habeas data"], fines:[] },
  "152":{ name:"Chile",          flag:"🇨🇱", status:"proposed",       law:"New Data Protection Bill (in reform)",            regulator:"New DPA (pending)",             year:null, region:"Americas",             slug:"chile",          rights:["Comprehensive bill under congressional review"], fines:[] },
  "170":{ name:"Colombia",       flag:"🇨🇴", status:"partial",        law:"Law 1581 of 2012",                                regulator:"SIC",                           year:2012, region:"Americas",             slug:"colombia",       rights:["Access, correction, deletion, opposition"], fines:[] },
  "858":{ name:"Uruguay",        flag:"🇺🇾", status:"comprehensive",  law:"PDPA 18.331",                                     regulator:"URCDP",                         year:2008, region:"Americas",             slug:"uruguay",        rights:["Access, correction, deletion","Habeas data"], fines:[] },
  "826":{ name:"United Kingdom", flag:"🇬🇧", status:"comprehensive",  law:"UK GDPR + Data (Use & Access) Act 2025",          regulator:"ICO",                           year:2018, region:"Europe",              slug:"united-kingdom", rights:["Access, rectification, erasure","Data portability","Object to processing"], fines:["LastPass: £1.2M (ICO, 2025)","Clearview AI: £7.5M (2023)"] },
  "276":{ name:"Germany",        flag:"🇩🇪", status:"comprehensive",  law:"GDPR + BDSG",                                     regulator:"BfDI + 16 State DPAs",         year:2018, region:"Europe",              slug:"germany",        rights:["Full GDPR rights","Right to erasure","Data portability"], fines:["Meta: €1.2B (DPC/EDPB, 2023)"] },
  "250":{ name:"France",         flag:"🇫🇷", status:"comprehensive",  law:"GDPR + French Data Protection Act",               regulator:"CNIL",                          year:2018, region:"Europe",              slug:"france",         rights:["Full GDPR rights","Right to know","Right to object"], fines:["Clearview AI: €20M (CNIL, 2026)","Google: €150M (2022)"] },
  "380":{ name:"Italy",          flag:"🇮🇹", status:"comprehensive",  law:"GDPR + Codice Privacy",                           regulator:"Garante",                       year:2018, region:"Europe",              slug:"italy",          rights:["Full GDPR rights"], fines:["OpenAI: €15M (Garante, 2024)","Meta: €390M (2023)"] },
  "724":{ name:"Spain",          flag:"🇪🇸", status:"comprehensive",  law:"GDPR + LOPDGDD",                                  regulator:"AEPD",                          year:2018, region:"Europe",              slug:"spain",          rights:["Full GDPR rights"], fines:["CaixaBank: €6.2M (AEPD, 2026)"] },
  "528":{ name:"Netherlands",    flag:"🇳🇱", status:"comprehensive",  law:"GDPR + UAVG",                                     regulator:"Autoriteit Persoonsgegevens",   year:2018, region:"Europe",              slug:"netherlands",    rights:["Full GDPR rights"], fines:["Uber: €290M (AP, 2023)"] },
  "372":{ name:"Ireland",        flag:"🇮🇪", status:"comprehensive",  law:"GDPR + Data Protection Act 2018",                 regulator:"DPC",                           year:2018, region:"Europe",              slug:"ireland",        rights:["Full GDPR rights"], fines:["Meta: €1.2B (2023)","WhatsApp: €225M (2021)"] },
  "752":{ name:"Sweden",         flag:"🇸🇪", status:"comprehensive",  law:"GDPR + Swedish DPA Act",                          regulator:"IMY",                           year:2018, region:"Europe",              slug:"sweden",         rights:["Full GDPR rights"], fines:["Spotify: SEK 58M (IMY, 2023)"] },
  "578":{ name:"Norway",         flag:"🇳🇴", status:"comprehensive",  law:"GDPR (EEA) + Personal Data Act",                  regulator:"Datatilsynet",                  year:2018, region:"Europe",              slug:"norway",         rights:["Full GDPR rights"], fines:["Grindr: NOK 65M (2022)"] },
  "756":{ name:"Switzerland",    flag:"🇨🇭", status:"comprehensive",  law:"nFADP (Revised Federal Act on Data Protection)",  regulator:"FDPIC",                         year:2023, region:"Europe",              slug:"switzerland",    rights:["Right of access","Erasure","Data portability"], fines:[] },
  "616":{ name:"Poland",         flag:"🇵🇱", status:"comprehensive",  law:"GDPR + Polish Data Protection Act",               regulator:"UODO",                          year:2018, region:"Europe",              slug:"poland",         rights:["Full GDPR rights"], fines:[] },
  "56": { name:"Belgium",        flag:"🇧🇪", status:"comprehensive",  law:"GDPR + Belgian DPA Act",                          regulator:"GBA / APD",                     year:2018, region:"Europe",              slug:"belgium",        rights:["Full GDPR rights"], fines:["IAB Europe: €250K (2022)"] },
  "792":{ name:"Turkey",         flag:"🇹🇷", status:"comprehensive",  law:"KVKK (Law No. 6698)",                             regulator:"KVKK Board",                    year:2016, region:"Europe",              slug:"turkey",         rights:["Access, correction, deletion","Object to processing","Automated decision opt-out"], fines:[] },
  "643":{ name:"Russia",         flag:"🇷🇺", status:"partial",        law:"Federal Law No. 152-FZ",                          regulator:"Roskomnadzor",                  year:2006, region:"Europe",              slug:"russia",         rights:["Access & correction","Deletion","Data localization required"], fines:[] },
  "36": { name:"Australia",      flag:"🇦🇺", status:"comprehensive",  law:"Privacy Act 1988 (reformed 2024)",                regulator:"OAIC",                          year:1988, region:"Asia-Pacific",        slug:"australia",      rights:["Access & correction","Complaint rights","Marketing opt-out"], fines:["Aust. Clinical Labs: AUD 5.8M (2025)"] },
  "554":{ name:"New Zealand",    flag:"🇳🇿", status:"comprehensive",  law:"Privacy Act 2020",                                regulator:"OPC NZ",                        year:2020, region:"Asia-Pacific",        slug:"new-zealand",    rights:["Access & correction","Breach notification","Cross-border rules"], fines:[] },
  "392":{ name:"Japan",          flag:"🇯🇵", status:"comprehensive",  law:"APPI",                                            regulator:"PPC",                           year:2003, region:"Asia-Pacific",        slug:"japan",          rights:["Access & correction","Opt-out of third-party disclosure","Use limitation"], fines:[] },
  "410":{ name:"South Korea",    flag:"🇰🇷", status:"comprehensive",  law:"PIPA",                                            regulator:"PIPC",                          year:2011, region:"Asia-Pacific",        slug:"south-korea",    rights:["Access, correction, deletion","Opt-out","Automated decision rights"], fines:["Google: KRW 69.2B (2022)","Meta: KRW 67.8B (2022)"] },
  "356":{ name:"India",          flag:"🇮🇳", status:"proposed",       law:"DPDP Act 2023 (rules pending)",                   regulator:"Data Protection Board (pending)",year:2023,region:"Asia-Pacific",       slug:"india",          rights:["Access & correction (once enacted)","Erasure","Grievance redressal"], fines:[] },
  "156":{ name:"China",          flag:"🇨🇳", status:"comprehensive",  law:"PIPL + DSL + Cybersecurity Law",                  regulator:"CAC / MPS / SAMR",              year:2021, region:"Asia-Pacific",        slug:"china",          rights:["Access, correction, deletion","Portability (limited)","Automated decision opt-out"], fines:["DiDi: CNY 8.026B (CAC, 2022)"] },
  "702":{ name:"Singapore",      flag:"🇸🇬", status:"comprehensive",  law:"PDPA 2012",                                       regulator:"PDPC",                          year:2012, region:"Asia-Pacific",        slug:"singapore",      rights:["Access & correction","Consent withdrawal","Data portability"], fines:["RedMart/Lazada: SGD 74K (2021)"] },
  "764":{ name:"Thailand",       flag:"🇹🇭", status:"partial",        law:"PDPA 2019",                                       regulator:"PDPC Thailand",                 year:2019, region:"Asia-Pacific",        slug:"thailand",       rights:["Access, correction, deletion","Object","Portability"], fines:[] },
  "360":{ name:"Indonesia",      flag:"🇮🇩", status:"partial",        law:"PDP Law 2022",                                    regulator:"Ministry of Comms + BSSN",      year:2022, region:"Asia-Pacific",        slug:"indonesia",      rights:["Access & correction","Deletion","Portability"], fines:[] },
  "458":{ name:"Malaysia",       flag:"🇲🇾", status:"partial",        law:"PDPA 2010 (reform pending)",                      regulator:"PDP Commissioner",              year:2010, region:"Asia-Pacific",        slug:"malaysia",       rights:["Access & correction","Opt-out of direct marketing"], fines:[] },
  "710":{ name:"South Africa",   flag:"🇿🇦", status:"comprehensive",  law:"POPIA",                                           regulator:"Information Regulator",         year:2020, region:"Africa & Middle East", slug:"south-africa",   rights:["Access & correction","Objection","Breach notification"], fines:["TransUnion: ZAR 1M (2024)"] },
  "566":{ name:"Nigeria",        flag:"🇳🇬", status:"partial",        law:"Nigeria Data Protection Act 2023",                regulator:"NDPC",                          year:2023, region:"Africa & Middle East", slug:"nigeria",        rights:["Access, correction, erasure","Object to processing"], fines:[] },
  "404":{ name:"Kenya",          flag:"🇰🇪", status:"partial",        law:"Data Protection Act 2019",                        regulator:"ODPC",                          year:2019, region:"Africa & Middle East", slug:"kenya",          rights:["Access, correction, deletion","Object"], fines:[] },
  "784":{ name:"UAE",            flag:"🇦🇪", status:"partial",        law:"Federal PDPL + DIFC + ADGM",                      regulator:"UAE Data Office",               year:2021, region:"Africa & Middle East", slug:"uae",            rights:["Access & correction","Erasure","Objection"], fines:[] },
  "682":{ name:"Saudi Arabia",   flag:"🇸🇦", status:"partial",        law:"PDPL",                                            regulator:"SDAIA / NCA",                   year:2021, region:"Africa & Middle East", slug:"saudi-arabia",   rights:["Access, correction, deletion","Consent withdrawal"], fines:[] },
  "376":{ name:"Israel",         flag:"🇮🇱", status:"comprehensive",  law:"Protection of Privacy Law (amended 2023)",        regulator:"Privacy Protection Authority",  year:1981, region:"Africa & Middle East", slug:"israel",         rights:["Access & correction","Deletion from databases"], fines:[] },
};

export { JURISDICTIONS };

const REGIONS = ["All Regions", "Americas", "Europe", "Asia-Pacific", "Africa & Middle East"];

export default function GlobalPrivacyMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [worldData, setWorldData] = useState<any>(null);
  const [topoReady, setTopoReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<any>(null);
  const [region, setRegion] = useState("All Regions");
  const [view, setView] = useState<"map" | "grid">("map");
  const [dims, setDims] = useState({ w: 860, h: 440 });

  // Load topojson
  useEffect(() => {
    if ((window as any).topojson) { setTopoReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js";
    s.onload = () => setTopoReady(true);
    document.head.appendChild(s);
  }, []);

  // Fetch world atlas
  useEffect(() => {
    if (!topoReady) return;
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(d => { setWorldData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topoReady]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setDims({ w, h: Math.round(w * 0.49) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Draw SVG map — FIX 1: region added to deps, opacity filtering, direct navigation
  useEffect(() => {
    if (!worldData || !topoReady || !svgRef.current) return;
    const topo = (window as any).topojson;
    const { w, h } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const proj = d3.geoNaturalEarth1().scale(w / 6.2).translate([w / 2, h / 2]);
    const path = d3.geoPath().projection(proj);
    const countries = topo.feature(worldData, worldData.objects.countries);
    const mesh = topo.mesh(worldData, worldData.objects.countries, (a: any, b: any) => a !== b);

    svg.append("path")
      .datum({ type: "Sphere" })
      .attr("d", path as any)
      .attr("fill", "#deeef8")
      .attr("stroke", "none");

    svg.append("g")
      .selectAll("path")
      .data((countries as any).features)
      .join("path")
      .attr("d", path as any)
      .attr("fill", (d: any) => {
        const jur = JURISDICTIONS[String(d.id)];
        return STATUS_CONFIG[(jur?.status ?? "none") as keyof typeof STATUS_CONFIG]?.color ?? "#c8d8e8";
      })
      .attr("opacity", (d: any) => {
        if (region === "All Regions") return 1;
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur) return 0.15;
        return jur.region === region ? 1 : 0.12;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4)
      .style("cursor", (d: any) => JURISDICTIONS[String(d.id)] ? "pointer" : "default")
      .on("mouseenter", function (event: MouseEvent, d: any) {
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur) return;
        if (region !== "All Regions" && jur.region !== region) return;
        d3.select(this).attr("stroke", "#f59e0b").attr("stroke-width", 1.5).raise();
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip({ x: mx, y: my, jur });
      })
      .on("mousemove", function (event: MouseEvent) {
        const [mx, my] = d3.pointer(event, svgRef.current);
        setTooltip((t: any) => t ? { ...t, x: mx, y: my } : null);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 0.4);
        setTooltip(null);
      })
      .on("click", (_: any, d: any) => {
        const jur = JURISDICTIONS[String(d.id)];
        if (!jur) return;
        if (region !== "All Regions" && jur.region !== region) return;
        navigate(`/jurisdiction/${jur.slug}`);
      });

    svg.append("path")
      .datum(mesh)
      .attr("d", path as any)
      .attr("fill", "none")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4);

  }, [worldData, topoReady, dims, region, navigate]);

  const gridItems = Object.values(JURISDICTIONS)
    .filter((j: any) => region === "All Regions" || j.region === region)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <div>
      {/* View toggle + region chips */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                region === r
                  ? "bg-blue/10 text-blue border-blue/30"
                  : "bg-white text-slate border-fog hover:border-blue/20"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["map", "grid"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer capitalize ${
                view === v
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-slate border-fog hover:border-navy/20"
              }`}
            >
              {v === "map" ? "🗺 Map" : "⊞ Grid"}
            </button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div ref={containerRef} className="min-w-0">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center bg-fog rounded-2xl text-slate text-sm animate-pulse">
              Loading map data…
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-eup-md border border-fog">
              <svg ref={svgRef} width={dims.w} height={dims.h} style={{ display: "block" }} />

              {tooltip && (
                <div
                  className="absolute pointer-events-none z-50 bg-navy text-white px-4 py-3 rounded-xl shadow-eup-md text-xs"
                  style={{
                    left: Math.min(tooltip.x + 16, dims.w - 200),
                    top: Math.max(tooltip.y - 70, 8),
                    minWidth: 180,
                  }}
                >
                  <div className="font-bold text-[14px] mb-0.5">
                    <span className="flag-emoji">{tooltip.jur.flag}</span> {tooltip.jur.name}
                  </div>
                  <div className="text-blue-200 text-[10px] font-semibold uppercase tracking-wide mb-1">
                    {STATUS_CONFIG[tooltip.jur.status as keyof typeof STATUS_CONFIG]?.label}
                  </div>
                  <div className="text-blue-300 text-[11px] leading-snug">{tooltip.jur.law}</div>
                  <div className="text-blue-400 text-[10px] mt-1.5">Click to explore →</div>
                </div>
              )}

              <MapLegend />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {gridItems.map((j: any) => (
            <Link
              key={j.slug}
              to={`/jurisdiction/${j.slug}`}
              className="bg-white rounded-xl border border-fog p-4 text-left hover:shadow-eup-sm hover:-translate-y-0.5 transition-all cursor-pointer no-underline"
              style={{ borderLeftWidth: 3, borderLeftColor: STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color }}
            >
              <div className="text-2xl mb-1.5 flag-emoji">{j.flag}</div>
              <div className="font-bold text-navy text-[13px] leading-tight">{j.name}</div>
              <div className="text-[10px] text-slate mt-0.5">{j.region}</div>
              <div
                className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: `${STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color}15`,
                  color: STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.color,
                }}
              >
                {STATUS_CONFIG[j.status as keyof typeof STATUS_CONFIG]?.label}
              </div>
              {j.fines?.length > 0 && (
                <div className="text-[10px] text-orange-500 font-semibold mt-1.5">
                  ⚖️ {j.fines.length} fine{j.fines.length > 1 ? "s" : ""}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
